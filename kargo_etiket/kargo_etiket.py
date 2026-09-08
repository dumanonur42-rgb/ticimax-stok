"""Ticimax "Kargo Gönderim Toplu Barkod" PDF'ini Brother QL-550 etiketine dönüştürür.

Kullanım:
    kargo_etiket.exe                       -> pencere açılır, PDF seçilir
    kargo_etiket.exe dosya.pdf             -> dosya.pdf yanına dosya_QL550.pdf üretir ve açar
    kargo_etiket.exe dosya.pdf --yazdir    -> üretir ve varsayılan yazıcıya gönderir
    kargo_etiket.exe dosya.pdf --yazici "Brother QL-550"
    kargo_etiket.exe dosya.pdf --boyut 62x100 | 62surekli

PDF'i .exe simgesinin üzerine sürükleyip bırakmak da yeterlidir.
"""

from __future__ import annotations

import argparse
import os
import shutil
import subprocess
import sys
from dataclasses import dataclass, field
from pathlib import Path
from typing import ClassVar

import pymupdf
from barcode import Code128

try:
    import tkinter as tk
    from tkinter import filedialog, messagebox, ttk
except ImportError:  # tkinter olmayan sunucu kurulumları (yalnızca komut satırı)
    tk = None

try:  # pencereye sürükle-bırak (opsiyonel)
    from tkinterdnd2 import DND_FILES, TkinterDnD
    _TkBase = TkinterDnD.Tk
except ImportError:
    DND_FILES = None
    _TkBase = tk.Tk if tk else object

MM = 72 / 25.4

# Brother QL-550: rulo genişliği 62 mm. Yazdırılabilir alan ~58 mm.
LABEL_SIZES = {
    "62x100": (62 * MM, 100 * MM),   # DK-11202 kesik gönderi etiketi
    "62surekli": (62 * MM, None),    # DK-22205 sürekli rulo, uzunluk otomatik
}
DEFAULT_SIZE = "62x100"
MARGIN_X = 3 * MM
MARGIN_Y = 2.5 * MM


def resource_path(name: str) -> Path:
    base = Path(getattr(sys, "_MEIPASS", Path(__file__).resolve().parent))
    return base / name


FONT_REGULAR = resource_path("fonts/DejaVuSans.ttf")
FONT_BOLD = resource_path("fonts/DejaVuSans-Bold.ttf")


@dataclass
class Etiket:
    gonderici: dict[str, str] = field(default_factory=dict)
    alici: dict[str, str] = field(default_factory=dict)
    kargo: dict[str, str] = field(default_factory=dict)
    barkod: str = ""


SECTION_MAP = {
    "Gönderici Bilgileri": "gonderici",
    "Alıcı Bilgileri": "alici",
    "Kargo Bilgileri": "kargo",
}


def _spans(page: pymupdf.Page):
    for block in page.get_text("dict")["blocks"]:
        for line in block.get("lines", []):
            for span in line["spans"]:
                text = span["text"].strip()
                if text:
                    yield span["bbox"], span["size"], text


def parse_pdf(path: Path) -> list[Etiket]:
    """Sayfa üzerindeki anahtar/değer tablosunu okur. Her 'Gönderici Bilgileri'
    başlığı yeni bir etiket başlatır."""
    etiketler: list[Etiket] = []
    doc = pymupdf.open(path)
    for page in doc:
        spans = sorted(_spans(page), key=lambda s: (round(s[0][1]), s[0][0]))
        if not spans:
            continue
        key_x = min(s[0][0] for s in spans if s[1] < 12)
        current: Etiket | None = None
        section = ""
        key = ""
        for (x0, y0, x1, y1), size, text in spans:
            if text in SECTION_MAP:
                if text == "Gönderici Bilgileri" or current is None:
                    current = Etiket()
                    etiketler.append(current)
                section = SECTION_MAP[text]
                key = ""
                continue
            if current is None:
                continue
            if size >= 12 and section != "":
                # Barkod altındaki insan okunur metin
                current.barkod = text
                section = ""
                continue
            if abs(x0 - key_x) < 3 * MM:
                key = text
                continue
            if section:
                d = getattr(current, section)
                d[key] = (d[key] + " " + text).strip() if key in d else text
    doc.close()
    return [e for e in etiketler if e.barkod or e.alici]


def _barcode_modules(value: str) -> str:
    return Code128(value).build()[0]


def _telefon(t: str) -> str:
    d = "".join(ch for ch in t if ch.isdigit())
    if d.startswith("90") and len(d) == 12:
        d = d[2:]
    if len(d) == 10:
        return f"0{d[:3]} {d[3:6]} {d[6:8]} {d[8:]}"
    return t


_FONTS: dict[str, pymupdf.Font] = {}


def _font(key: str) -> pymupdf.Font:
    if key not in _FONTS:
        _FONTS[key] = pymupdf.Font(fontfile=str(FONT_BOLD if key == "b" else FONT_REGULAR))
    return _FONTS[key]


def _wrap(text: str, size: float, font: str, max_w: float, max_lines: int) -> list[str]:
    f = _font(font)
    lines, cur = [], ""
    for w in text.split():
        cand = (cur + " " + w).strip()
        if f.text_length(cand, fontsize=size) <= max_w or not cur:
            cur = cand
        else:
            lines.append(cur)
            cur = w
    if cur:
        lines.append(cur)
    if len(lines) > max_lines:
        lines = lines[:max_lines]
        lines[-1] = lines[-1][:-1] + "…"
    return lines


LEADING = 1.2  # satır yüksekliği / punto
BLACK = (0, 0, 0)
WHITE = (1, 1, 1)


class Canvas:
    """Sayfaya siyah-beyaz metin/şekil çizen yardımcı. Tüm ölçüler pt."""

    def __init__(self, page: pymupdf.Page):
        self.page = page
        self.w = page.rect.width
        self.tw_black = pymupdf.TextWriter(page.rect)
        self.tw_white = pymupdf.TextWriter(page.rect)

    def text(self, x: float, y: float, s: str, size: float, font: str = "r",
             align: str = "left", white: bool = False, box_w: float | None = None) -> None:
        """y: satır taban çizgisi. align: left|center|right (box_w ile birlikte)."""
        f = _font(font)
        tl = f.text_length(s, fontsize=size)
        if align == "center":
            x = x + ((box_w if box_w is not None else self.w - 2 * x) - tl) / 2
        elif align == "right":
            x = x + (box_w if box_w is not None else self.w - 2 * x) - tl
        (self.tw_white if white else self.tw_black).append((x, y), s, font=f, fontsize=size)

    def lines(self, x: float, y: float, lines: list[str], size: float, font: str = "r",
              align: str = "left", box_w: float | None = None) -> float:
        for ln in lines:
            y += size
            self.text(x, y, ln, size, font, align, box_w=box_w)
            y += size * (LEADING - 1)
        return y

    def band(self, rect: pymupdf.Rect, radius: float = 0) -> None:
        sh = self.page.new_shape()
        if radius:
            sh.draw_rect(rect, radius=radius / min(rect.width, rect.height))
        else:
            sh.draw_rect(rect)
        sh.finish(color=None, fill=BLACK)
        sh.commit()

    def frame(self, rect: pymupdf.Rect, width: float = 0.8, radius: float = 0) -> None:
        sh = self.page.new_shape()
        if radius:
            sh.draw_rect(rect, radius=radius / min(rect.width, rect.height))
        else:
            sh.draw_rect(rect)
        sh.finish(color=BLACK, width=width, fill=None)
        sh.commit()

    def vline(self, x: float, y0: float, y1: float, width: float = 0.8) -> None:
        self.page.draw_line((x, y0), (x, y1), color=BLACK, width=width)

    def barcode(self, value: str, x: float, y: float, w: float, h: float) -> None:
        modules = _barcode_modules(value)
        mod_w = w / (len(modules) + 20)  # her yanda 10 modül sessiz bölge
        x0 = x + 10 * mod_w
        sh = self.page.new_shape()
        i = 0
        while i < len(modules):
            if modules[i] == "1":
                j = i
                while j < len(modules) and modules[j] == "1":
                    j += 1
                sh.draw_rect(pymupdf.Rect(x0 + i * mod_w, y, x0 + j * mod_w, y + h))
                i = j
            else:
                i += 1
        sh.finish(color=None, fill=BLACK)
        sh.commit()

    def finish(self) -> None:
        self.tw_black.write_text(self.page, color=BLACK)
        self.tw_white.write_text(self.page, color=WHITE)


@dataclass
class Layout:
    """Bir etiketin ölçekli metrikleri. `s` yazı ölçeği."""
    s: float
    name: list[str]
    addr: list[str]
    firma: list[str]
    g_addr: list[str]

    header_h: float = 0
    alici_h: float = 0
    kargo_h: float = 0
    gond_h: float = 0
    barkod_text: float = 0

    def __post_init__(self):
        s = self.s
        self.header_h = 7 * MM
        pad = 2 * MM
        self.alici_h = (pad + len(self.name) * 14 * s * LEADING + 11 * s * LEADING + 1.2 * MM
                        + len(self.addr) * 8.5 * s * LEADING + pad)
        self.kargo_h = 8.5 * MM
        self.gond_h = (1.5 * MM + len(self.firma) * 7 * s * LEADING
                       + len(self.g_addr) * 6.5 * s * LEADING + 0.5 * MM)
        self.barkod_text = 11 * s * LEADING

    def fixed_total(self, gap: float) -> float:
        return (self.header_h + self.alici_h + self.kargo_h + self.gond_h
                + self.barkod_text + 5 * gap)


def _layout(e: Etiket, inner_w: float, s: float) -> Layout:
    pad = 2 * MM
    a, g = e.alici, e.gonderici
    return Layout(
        s=s,
        name=_wrap(a.get("İsim", ""), 14 * s, "b", inner_w - 2 * pad, 2),
        addr=_wrap(a.get("Adres", ""), 8.5 * s, "r", inner_w - 2 * pad, 5),
        firma=_wrap(g.get("Firma", ""), 7 * s, "b", inner_w, 2),
        g_addr=_wrap(" · ".join(filter(None, [_telefon(g.get("Telefon", "")),
                                                g.get("Adres", "")])),
                     6.5 * s, "r", inner_w, 3),
    )


def draw_label(doc: pymupdf.Document, e: Etiket, size_key: str):
    w, h = LABEL_SIZES[size_key]
    inner_w = w - 2 * MARGIN_X
    gap = 2.2 * MM
    min_bar, max_bar = 14 * MM, 26 * MM

    if h is None:  # sürekli rulo: içerik kadar uzunluk
        lay = _layout(e, inner_w, 1.0)
        bar_h = 20 * MM
        h_page = lay.fixed_total(gap) + bar_h + 2 * MARGIN_Y
    else:
        s = 1.1
        while True:
            lay = _layout(e, inner_w, s)
            bar_h = h - 2 * MARGIN_Y - lay.fixed_total(gap)
            if bar_h >= min_bar or s <= 0.7:
                break
            s -= 0.05
        bar_h = max(min_bar, min(max_bar, bar_h))
        h_page = h
    page = doc.new_page(width=w, height=h_page)
    c = Canvas(page)
    s = lay.s
    x = MARGIN_X
    y = MARGIN_Y

    # 1) Üst şerit: siyah zemin, beyaz yazı — ALICI | Kargo Firması
    band = pymupdf.Rect(x, y, x + inner_w, y + lay.header_h)
    c.band(band, radius=1.2 * MM)
    base = y + lay.header_h / 2 + 9 * s * 0.36
    c.text(x + 2 * MM, base, "ALICI", 9 * s, "b", white=True)
    c.text(x, base, e.kargo.get("Kargo Firması", ""), 9 * s, "b",
           align="right", white=True, box_w=inner_w - 2 * MM)
    y = band.y1 + gap

    # 2) Alıcı kutusu
    box = pymupdf.Rect(x, y, x + inner_w, y + lay.alici_h)
    c.frame(box, width=0.9, radius=1.2 * MM)
    pad = 2 * MM
    yy = y + pad
    yy = c.lines(x + pad, yy, lay.name, 14 * s, "b")
    yy = c.lines(x + pad, yy, [_telefon(e.alici.get("Telefon", ""))], 11 * s, "r")
    yy += 1.2 * MM
    c.lines(x + pad, yy, lay.addr, 8.5 * s, "r")
    y = box.y1 + gap

    # 3) Barkod (kalan alanı doldurur) + değeri
    c.barcode(e.barkod, x, y, inner_w, bar_h)
    y += bar_h
    y = c.lines(x, y, [e.barkod], 11 * s, "b", align="center", box_w=inner_w)
    y += gap

    # 4) Kargo bilgisi: 3 hücreli çerçeve — ÖDEME | PAKET | DESİ
    k = e.kargo
    cells = [("ÖDEME", k.get("Ödeme Türü", "-")), ("PAKET", k.get("Paket Sayısı", "-")),
             ("DESİ", k.get("Desi", "-"))]
    widths = [inner_w * 0.56, inner_w * 0.22, inner_w * 0.22]
    tbl = pymupdf.Rect(x, y, x + inner_w, y + lay.kargo_h)
    c.frame(tbl, width=0.9)
    cx = x
    for i, ((lab, val), cw) in enumerate(zip(cells, widths)):
        if i:
            c.vline(cx, tbl.y0, tbl.y1, 0.9)
        c.text(cx, tbl.y0 + 1 * MM + 5.5 * s, lab, 5.5 * s, "r", align="center", box_w=cw)
        vs = 8 * s
        while vs > 5 and _font("b").text_length(val, fontsize=vs) > cw - 2 * MM:
            vs -= 0.25  # hücreye sığacak en büyük punto
        c.text(cx, tbl.y1 - 1.3 * MM, val, vs, "b", align="center", box_w=cw)
        cx += cw
    y = tbl.y1 + gap

    # 5) Gönderici: üstte ince çizgi + küçük siyah etiket
    c.page.draw_line((x, y), (x + inner_w, y), color=BLACK, width=0.6)
    tag_w = _font("b").text_length("GÖNDERİCİ", fontsize=5.5 * s) + 3 * MM
    tag = pymupdf.Rect(x, y, x + tag_w, y + 3.2 * MM)
    c.band(tag)
    c.text(x, y + 3.2 * MM - 0.9 * MM, "GÖNDERİCİ", 5.5 * s, "b", align="center",
           white=True, box_w=tag_w)
    yy = y + 3.2 * MM + 0.8 * MM
    yy = c.lines(x, yy, lay.firma, 7 * s, "b")
    c.lines(x, yy, lay.g_addr, 6.5 * s, "r")

    c.finish()


def convert(src: Path, dst: Path | None = None, size_key: str = DEFAULT_SIZE) -> Path:
    etiketler = parse_pdf(src)
    if not etiketler:
        raise ValueError("PDF içinde Ticimax kargo etiketi bulunamadı.")
    dst = dst or src.with_name(src.stem + "_QL550.pdf")
    out = pymupdf.open()
    for e in etiketler:
        draw_label(out, e, size_key)
    out.save(dst, garbage=3, deflate=True)
    out.close()
    return dst


# ---------------------------------------------------------------- Yazdırma

def _sumatra() -> str | None:
    """Exe içine gömülü SumatraPDF (öncelikli) ya da sistemde kurulu olan."""
    for c in (
        str(resource_path("SumatraPDF.exe")),
        shutil.which("SumatraPDF"),
        os.path.expandvars(r"%LOCALAPPDATA%\SumatraPDF\SumatraPDF.exe"),
        os.path.expandvars(r"%ProgramFiles%\SumatraPDF\SumatraPDF.exe"),
        os.path.expandvars(r"%ProgramFiles(x86)%\SumatraPDF\SumatraPDF.exe"),
    ):
        if c and os.path.isfile(c):
            return c
    return None


def list_printers() -> list[str]:
    if sys.platform != "win32":
        return []
    try:
        out = subprocess.run(
            ["powershell", "-NoProfile", "-Command",
             "Get-CimInstance Win32_Printer | Select-Object -ExpandProperty Name"],
            capture_output=True, text=True, timeout=15, check=False,
            creationflags=0x08000000,
        ).stdout
        return [ln.strip() for ln in out.splitlines() if ln.strip()]
    except (OSError, subprocess.SubprocessError):
        return []


def print_pdf(pdf: Path, printer: str | None = None):
    """SumatraPDF varsa sessiz yazdırır (sayfa boyutu etikete birebir uyar);
    yoksa Windows'un varsayılan PDF uygulamasıyla yazdırır. Sorunlarda Türkçe
    açıklamalı RuntimeError fırlatır."""
    if sys.platform != "win32":
        raise RuntimeError("Yazdırma yalnızca Windows'ta desteklenir.")
    printers = list_printers()
    if printer and printers and printer not in printers:
        raise RuntimeError(
            f"'{printer}' adlı yazıcı sistemde bulunamadı.\n"
            "Yazıcının açık ve bağlı olduğundan emin olup listeyi yenileyin (↻).")
    if not printer and not printers:
        raise RuntimeError(
            "Sistemde tanımlı yazıcı bulunamadı.\n"
            "Brother QL-550 sürücüsünün kurulu ve yazıcının bağlı olduğundan emin olun.")
    sumatra = _sumatra()
    if sumatra:
        cmd = [sumatra]
        cmd += ["-print-to", printer] if printer else ["-print-to-default"]
        cmd += ["-print-settings", "noscale", "-silent", "-exit-when-done", str(pdf)]
        try:
            rc = subprocess.run(cmd, check=False, timeout=120, capture_output=True,
                                creationflags=0x08000000).returncode
        except subprocess.TimeoutExpired as ex:
            raise RuntimeError(
                "Yazıcı zaman aşımına uğradı; yazıcı yanıt vermiyor.\n"
                "Yazıcının açık, bağlı ve kâğıt takılı olduğunu kontrol edin.") from ex
        if rc != 0:
            raise RuntimeError(
                f"Yazıcı gönderiyi kabul etmedi (hata kodu {rc}).\n"
                "Yazıcının açık ve bağlı olduğunu, Windows'ta duraklatılmadığını "
                "kontrol edin.")
        return
    try:
        os.startfile(str(pdf), "print")  # type: ignore[attr-defined]
    except OSError as ex:
        raise RuntimeError(
            "PDF yazdıracak bir uygulama bulunamadı. Etiket oluşturuldu:\n"
            f"{pdf}\nBu dosyayı açıp Brother QL-550'ye 62x100 mm, "
            "%100 ölçek ile yazdırın.") from ex


def _edge() -> str | None:
    for c in (
        os.path.expandvars(r"%ProgramFiles(x86)%\Microsoft\Edge\Application\msedge.exe"),
        os.path.expandvars(r"%ProgramFiles%\Microsoft\Edge\Application\msedge.exe"),
    ):
        if os.path.isfile(c):
            return c
    return None


def open_file(path: Path):
    """Çıktıyı gösterir. Windows'ta gömülü SumatraPDF ile açar; yoksa .pdf ile
    ilişkili uygulama, Edge, en son dosyanın klasörü denenir."""
    if sys.platform == "win32":
        sumatra = _sumatra()
        if sumatra:
            subprocess.Popen([sumatra, str(path)])
            return
        try:
            os.startfile(str(path))  # type: ignore[attr-defined]
            return
        except OSError:
            pass
        edge = _edge()
        if edge:
            subprocess.Popen([edge, path.resolve().as_uri()])
            return
        subprocess.Popen(["explorer.exe", "/select,", str(path.resolve())])
    elif sys.platform == "darwin":
        subprocess.Popen(["open", str(path)])
    else:
        subprocess.Popen(["xdg-open", str(path)])


# ---------------------------------------------------------------- Arayüz

UI_BG = "#F3F4F6"
UI_CARD = "#FFFFFF"
UI_DARK = "#15171C"
UI_DARK_HOVER = "#2A2D35"
UI_TEXT = "#1F2328"
UI_MUTED = "#6B7280"
UI_BORDER = "#D9DCE1"
UI_ACCENT = "#E63946"
UI_OK = "#15803D"
UI_FONT = "Segoe UI" if sys.platform == "win32" else "DejaVu Sans"


def _f(size: int, bold: bool = False) -> tuple:
    return (UI_FONT, size, "bold") if bold else (UI_FONT, size)


class DropZone(tk.Canvas if tk else object):
    """Kesikli çerçeveli, tıklanabilir ve (tkinterdnd2 varsa) dosya bırakılabilir alan."""

    W, H = 500, 150

    def __init__(self, master, on_files):
        super().__init__(master, width=self.W, height=self.H, bg=UI_BG,
                         highlightthickness=0, cursor="hand2")
        self.on_files = on_files
        self.active = False
        self._draw()
        self.bind("<Button-1>", lambda _e: self.on_files(None))
        self.bind("<Enter>", lambda _e: self._set_active(True))
        self.bind("<Leave>", lambda _e: self._set_active(False))
        if DND_FILES:
            self.drop_target_register(DND_FILES)
            self.dnd_bind("<<DropEnter>>", lambda _e: self._set_active(True))
            self.dnd_bind("<<DropLeave>>", lambda _e: self._set_active(False))
            self.dnd_bind("<<Drop>>", self._drop)

    def _set_active(self, on: bool):
        self.active = on
        self._draw()

    def _drop(self, event):
        self._set_active(False)
        paths = [Path(p) for p in self.tk.splitlist(event.data)]
        self.on_files([p for p in paths if p.suffix.lower() == ".pdf"])

    def _draw(self):
        self.delete("all")
        color = UI_DARK if self.active else "#B5BAC3"
        fill = "#FAFAFB" if self.active else UI_CARD
        r, x0, y0, x1, y1 = 14, 2, 2, self.W - 2, self.H - 2
        # yuvarlatılmış dikdörtgen (kesikli)
        pts = [x0 + r, y0, x1 - r, y0, x1, y0, x1, y0 + r, x1, y1 - r, x1, y1, x1 - r, y1,
               x0 + r, y1, x0, y1, x0, y1 - r, x0, y0 + r, x0, y0]
        self.create_polygon(pts, smooth=True, fill=fill, outline=color, width=2,
                            dash=(6, 4))
        # belge simgesi
        cx, top = self.W / 2, 26
        self.create_rectangle(cx - 16, top, cx + 16, top + 40, outline=UI_DARK, width=2,
                              fill=UI_CARD)
        self.create_polygon(cx + 6, top, cx + 16, top + 10, cx + 6, top + 10,
                            fill=UI_DARK, outline=UI_DARK)
        for i, w in enumerate((18, 14, 10)):
            y = top + 18 + i * 7
            self.create_line(cx - 10, y, cx - 10 + w, y, fill=UI_DARK, width=2)
        self.create_text(cx, top + 62, text="Ticimax PDF'ini buraya sürükleyip bırakın",
                         font=_f(12, True), fill=UI_TEXT)
        tip = "veya seçmek için tıklayın" if DND_FILES else "Seçmek için tıklayın"
        self.create_text(cx, top + 84, text=tip, font=_f(10), fill=UI_MUTED)
        self.create_text(cx, top + 106,
                         text="Çıktı aynı klasöre  <ad>_QL550.pdf  olarak kaydedilir",
                         font=_f(9), fill=UI_MUTED)


class Preview(tk.Frame if tk else object):
    """Üretilen etiket PDF'inin sayfa sayfa küçük önizlemesi."""

    W, H = 250, 400  # görüntü alanı (62x100 mm oranı)

    def __init__(self, master, on_print):
        super().__init__(master, bg=UI_CARD, highlightbackground=UI_BORDER,
                         highlightthickness=1, padx=14, pady=12)
        self.on_print = on_print
        self.pages: list[bytes] = []
        self.idx = 0
        self._img = None

        top = tk.Frame(self, bg=UI_CARD)
        top.grid(row=0, column=0, sticky="ew")
        top.columnconfigure(0, weight=1)
        tk.Label(top, text="ÖNİZLEME", font=_f(8, True), fg=UI_MUTED,
                 bg=UI_CARD).grid(row=0, column=0, sticky="w")
        self.counter = tk.Label(top, text="", font=_f(8), fg=UI_MUTED, bg=UI_CARD)
        self.counter.grid(row=0, column=1, sticky="e")

        self.canvas = tk.Canvas(self, width=self.W, height=self.H, bg=UI_BG,
                                highlightthickness=0)
        self.canvas.grid(row=1, column=0, pady=(8, 8))

        nav = tk.Frame(self, bg=UI_CARD)
        nav.grid(row=2, column=0, sticky="ew")
        nav.columnconfigure(1, weight=1)
        self.prev_btn = self._nav(nav, "‹", lambda: self.show(self.idx - 1), 0)
        self.print_btn = tk.Button(nav, text="Yazdır", command=lambda: self.on_print(),
                                   font=_f(10, True), bg=UI_DARK, fg="white", bd=0,
                                   activebackground=UI_DARK_HOVER, activeforeground="white",
                                   cursor="hand2", padx=18, pady=5)
        self.print_btn.grid(row=0, column=1)
        self.next_btn = self._nav(nav, "›", lambda: self.show(self.idx + 1), 2)
        self.clear()

    def _nav(self, master, text, cmd, col):
        b = tk.Button(master, text=text, command=cmd, font=_f(14), bd=0, relief="flat",
                      highlightthickness=0, bg=UI_CARD, activebackground=UI_BG,
                      fg=UI_DARK, disabledforeground=UI_BORDER, cursor="hand2", width=2)
        b.grid(row=0, column=col)
        return b

    def clear(self):
        self.pages, self.idx, self._img = [], 0, None
        c = self.canvas
        c.delete("all")
        cx, cy = self.W / 2, self.H / 2
        c.create_rectangle(cx - 78, cy - 126, cx + 78, cy + 126, outline="#C4C8CF",
                           dash=(5, 4), width=1.5)
        c.create_text(cx, cy - 6, text="Etiket önizlemesi", font=_f(10, True),
                      fill="#9CA3AF")
        c.create_text(cx, cy + 16, text="PDF eklendiğinde\nburada görünür", font=_f(8),
                      fill="#B0B5BD", justify="center")
        self.counter.config(text="")
        for b in (self.prev_btn, self.next_btn, self.print_btn):
            b.config(state="disabled")
        self.print_btn.config(bg=UI_BORDER)

    def load(self, pdf: Path):
        """PDF sayfalarını PNG olarak belleğe alır ve ilkini gösterir."""
        doc = pymupdf.open(pdf)
        pages = []
        for page in doc:
            zoom = min((self.W - 24) / page.rect.width, (self.H - 24) / page.rect.height)
            pages.append(page.get_pixmap(matrix=pymupdf.Matrix(zoom, zoom)).tobytes("png"))
        doc.close()
        self.pages = pages
        self.print_btn.config(state="normal", bg=UI_DARK)
        self.show(0)

    def show(self, i: int):
        if not self.pages:
            return
        self.idx = max(0, min(i, len(self.pages) - 1))
        self._img = tk.PhotoImage(data=self.pages[self.idx])
        c = self.canvas
        c.delete("all")
        cx, cy = self.W / 2, self.H / 2
        w, h = self._img.width(), self._img.height()
        # yumuşak gölge + beyaz etiket
        for k, a in ((6, "#E3E5E9"), (3, "#D4D7DC")):
            c.create_rectangle(cx - w / 2 + k, cy - h / 2 + k, cx + w / 2 + k,
                               cy + h / 2 + k, fill=a, outline="")
        c.create_rectangle(cx - w / 2 - 1, cy - h / 2 - 1, cx + w / 2 + 1, cy + h / 2 + 1,
                           fill="white", outline=UI_BORDER)
        c.create_image(cx, cy, image=self._img)
        n = len(self.pages)
        self.counter.config(text=f"{self.idx + 1} / {n}  etiket" if n > 1 else "1 etiket")
        self.prev_btn.config(state="normal" if self.idx > 0 else "disabled")
        self.next_btn.config(state="normal" if self.idx < n - 1 else "disabled")


class StatusBar(tk.Frame if tk else object):
    """Alt durum çubuğu: renkli durum rozeti, iki satır metin, sağda eylem düğmeleri."""

    COLORS: ClassVar[dict[str, str]] = {"idle": "#9CA3AF", "busy": UI_DARK, "ok": UI_OK,
                                        "error": UI_ACCENT}
    MARKS: ClassVar[dict[str, str]] = {"idle": "", "busy": "…", "ok": "✓", "error": "!"}

    def __init__(self, master, actions: list[tuple[str, object, bool]]):
        super().__init__(master, bg=UI_CARD, highlightbackground=UI_BORDER,
                         highlightthickness=1, padx=22, pady=10)
        self.columnconfigure(1, weight=1)
        self.badge = tk.Canvas(self, width=26, height=26, bg=UI_CARD, highlightthickness=0)
        self.badge.grid(row=0, column=0, rowspan=2, padx=(0, 12))
        self.title = tk.Label(self, text="", font=_f(10, True), fg=UI_TEXT, bg=UI_CARD,
                              anchor="w")
        self.title.grid(row=0, column=1, sticky="w")
        self.detail = tk.Label(self, text="", font=_f(8), fg=UI_MUTED, bg=UI_CARD,
                               anchor="w")
        self.detail.grid(row=1, column=1, sticky="w")
        self.buttons = tk.Frame(self, bg=UI_CARD)
        for i, (text, cmd, primary) in enumerate(actions):
            self._pill(self.buttons, text, cmd, primary).grid(row=0, column=i, padx=(8, 0))
        self.set("idle", "Hazır", "Bir Ticimax PDF'i ekleyin; etiket burada raporlanır.")

    @staticmethod
    def _pill(master, text, cmd, primary: bool = False):
        fg, bg = ("white", UI_DARK) if primary else (UI_DARK, UI_CARD)
        hover = "#333333" if primary else UI_DARK
        b = tk.Label(master, text=text, font=_f(9, True), fg=fg, bg=bg, cursor="hand2",
                     padx=12, pady=4, highlightbackground=UI_DARK, highlightthickness=1)
        b.bind("<Button-1>", lambda _e: cmd())
        b.bind("<Enter>", lambda _e: b.config(bg=hover, fg="white"))
        b.bind("<Leave>", lambda _e: b.config(bg=bg, fg=fg))
        return b

    def set(self, state: str, title: str, detail: str = "", show_actions: bool = False):
        c = self.badge
        c.delete("all")
        color = self.COLORS[state]
        c.create_oval(2, 2, 24, 24, fill=color, outline="")
        c.create_text(13, 13, text=self.MARKS[state], font=_f(11, True), fill="white")
        self.title.config(text=title, fg=UI_TEXT if state != "idle" else UI_MUTED)
        self.detail.config(text=detail)
        if show_actions:
            self.buttons.grid(row=0, column=2, rowspan=2, sticky="e")
        else:
            self.buttons.grid_forget()


class Dialog(tk.Toplevel if tk else object):
    """Uygulama tasarımına uygun Türkçe hata/uyarı penceresi."""

    def __init__(self, master, title: str, text: str, kind: str = "error"):
        super().__init__(master, bg=UI_CARD)
        self.title(title)
        self.resizable(False, False)
        self.transient(master)
        self.configure(highlightbackground=UI_BORDER, highlightthickness=1)
        color = UI_ACCENT if kind == "error" else "#B45309"
        tk.Frame(self, bg=color, height=4).pack(fill="x")
        body = tk.Frame(self, bg=UI_CARD, padx=22, pady=18)
        body.pack(fill="both", expand=True)
        badge = tk.Canvas(body, width=36, height=36, bg=UI_CARD, highlightthickness=0)
        badge.create_oval(2, 2, 34, 34, fill=color, outline="")
        badge.create_text(18, 18, text="!", font=_f(16, True), fill="white")
        badge.grid(row=0, column=0, rowspan=2, padx=(0, 16), sticky="n")
        tk.Label(body, text=title, font=_f(12, True), fg=UI_TEXT, bg=UI_CARD,
                 anchor="w").grid(row=0, column=1, sticky="w")
        tk.Label(body, text=text, font=_f(10), fg=UI_MUTED, bg=UI_CARD, justify="left",
                 anchor="w", wraplength=380).grid(row=1, column=1, sticky="w", pady=(4, 0))
        btn = tk.Label(body, text="Tamam", font=_f(10, True), fg="white", bg=UI_DARK,
                       cursor="hand2", padx=22, pady=6)
        btn.grid(row=2, column=1, sticky="e", pady=(16, 0))
        btn.bind("<Button-1>", lambda _e: self.destroy())
        btn.bind("<Enter>", lambda _e: btn.config(bg=UI_DARK_HOVER))
        btn.bind("<Leave>", lambda _e: btn.config(bg=UI_DARK))
        self.bind("<Return>", lambda _e: self.destroy())
        self.bind("<Escape>", lambda _e: self.destroy())
        self.update_idletasks()
        mx, my = master.winfo_rootx(), master.winfo_rooty()
        mw, mh = master.winfo_width(), master.winfo_height()
        w, h = self.winfo_reqwidth(), self.winfo_reqheight()
        self.geometry(f"+{mx + (mw - w) // 2}+{my + (mh - h) // 2}")
        self.grab_set()
        self.focus_set()


class App(_TkBase):
    def __init__(self):
        super().__init__()
        self.title("Kargo Etiket · Brother QL-550")
        self.configure(bg=UI_BG)
        self.resizable(False, False)
        self.last_dst: Path | None = None
        self._icons()
        self._styles()

        # Başlık şeridi
        head = tk.Frame(self, bg=UI_DARK, padx=22, pady=16)
        head.grid(row=0, column=0, sticky="ew")
        if self.logo:
            tk.Label(head, image=self.logo, bg=UI_DARK).grid(row=0, column=0, rowspan=2,
                                                            padx=(0, 14))
        tk.Label(head, text="Kargo Etiket", font=_f(18, True), fg="white",
                 bg=UI_DARK).grid(row=0, column=1, sticky="w")
        tk.Label(head, text="Ticimax barkod PDF  →  Brother QL-550 etiketi",
                 font=_f(10), fg="#C9CDD3", bg=UI_DARK).grid(row=1, column=1, sticky="w")
        tk.Frame(self, bg=UI_ACCENT, height=3).grid(row=1, column=0, sticky="ew")

        outer = tk.Frame(self, bg=UI_BG, padx=22, pady=18)
        outer.grid(row=2, column=0)
        body = tk.Frame(outer, bg=UI_BG)
        body.grid(row=0, column=0, sticky="ns")
        body.rowconfigure(2, weight=1)
        self.preview = Preview(outer, self.print_current)
        self.preview.grid(row=0, column=1, sticky="ns", padx=(18, 0))

        self.drop = DropZone(body, self.on_files)
        self.drop.grid(row=0, column=0, pady=(0, 16))

        # Ayarlar kartı
        card = tk.Frame(body, bg=UI_CARD, highlightbackground=UI_BORDER,
                        highlightthickness=1, padx=16, pady=12)
        card.grid(row=1, column=0, sticky="ew")
        card.columnconfigure(2, weight=1)
        tk.Label(card, text="AYARLAR", font=_f(8, True), fg=UI_MUTED,
                 bg=UI_CARD).grid(row=0, column=0, columnspan=3, sticky="w", pady=(0, 6))

        tk.Label(card, text="Etiket boyutu", font=_f(10), bg=UI_CARD,
                 fg=UI_TEXT).grid(row=1, column=0, sticky="w", pady=4)
        self.size_var = tk.StringVar(value=DEFAULT_SIZE)
        ttk.Combobox(card, textvariable=self.size_var, state="readonly", width=30,
                     values=list(LABEL_SIZES), font=_f(10)).grid(
            row=1, column=1, sticky="w", padx=(14, 0), pady=4)
        tk.Label(card, text="62x100 = DK-11202 kesik etiket · 62surekli = DK-22205 rulo",
                 font=_f(8), fg=UI_MUTED, bg=UI_CARD).grid(
            row=2, column=1, sticky="w", padx=(14, 0))

        tk.Label(card, text="Yazıcı", font=_f(10), bg=UI_CARD,
                 fg=UI_TEXT).grid(row=3, column=0, sticky="w", pady=4)
        self.printer_var = tk.StringVar()
        self.printer_box = ttk.Combobox(card, textvariable=self.printer_var, width=30,
                                        font=_f(10))
        self.printer_box.grid(row=3, column=1, sticky="w", padx=(14, 0), pady=4)
        tk.Button(card, text="↻", command=self.refresh_printers, font=_f(11), bd=0,
                  relief="flat", highlightthickness=0, bg=UI_CARD, activebackground=UI_BG,
                  fg=UI_MUTED, cursor="hand2", width=2).grid(row=3, column=2, sticky="w",
                                                            padx=(4, 0))

        self.print_var = tk.BooleanVar(value=False)
        self.open_var = tk.BooleanVar(value=False)
        ttk.Checkbutton(card, text="Dönüştürdükten sonra yazıcıya gönder (62×100 mm, ölçeksiz)",
                        variable=self.print_var, style="Card.TCheckbutton").grid(
            row=4, column=0, columnspan=3, sticky="w", pady=(10, 2))
        ttk.Checkbutton(card, text="Ayrıca PDF görüntüleyicide aç",
                        variable=self.open_var, style="Card.TCheckbutton").grid(
            row=5, column=0, columnspan=3, sticky="w", pady=2)
        self.refresh_printers()

        # Ana buton
        self.btn = tk.Button(body, text="PDF Seç ve Dönüştür", command=self.on_files,
                             font=_f(11, True), bg=UI_DARK, fg="white", bd=0,
                             activebackground=UI_DARK_HOVER, activeforeground="white",
                             cursor="hand2", pady=11)
        self.btn.grid(row=2, column=0, sticky="sew", pady=(16, 0))
        self.btn.bind("<Enter>", lambda _e: self.btn.config(bg=UI_DARK_HOVER))
        self.btn.bind("<Leave>", lambda _e: self.btn.config(bg=UI_DARK))

        # Durum çubuğu
        self.bar = StatusBar(self, [("Klasörü aç", self.open_folder, False),
                                    ("PDF'i aç", self.open_pdf, False),
                                    ("Tekrar yazdır", self.print_current, True)])
        self.bar.grid(row=3, column=0, sticky="ew")

        self.update_idletasks()
        self._center()

    # -- yardımcılar
    def _icons(self):
        self.logo = None
        try:
            self.logo = tk.PhotoImage(file=str(resource_path("assets/icon_48.png")))
            self.iconphoto(True, tk.PhotoImage(file=str(resource_path("assets/icon_256.png"))))
            if sys.platform == "win32":
                self.iconbitmap(str(resource_path("assets/icon.ico")))
        except tk.TclError:
            pass

    def _styles(self):
        st = ttk.Style(self)
        if "clam" in st.theme_names():
            st.theme_use("clam")
        st.configure("Card.TCheckbutton", background=UI_CARD, foreground=UI_TEXT,
                     font=_f(10))
        st.map("Card.TCheckbutton", background=[("active", UI_CARD)])
        st.configure("TCombobox", fieldbackground=UI_CARD, background=UI_CARD,
                     bordercolor=UI_BORDER, arrowcolor=UI_DARK, padding=4)
        st.map("TCombobox", fieldbackground=[("readonly", UI_CARD)],
               selectbackground=[("readonly", UI_CARD)],
               selectforeground=[("readonly", UI_TEXT)])
        self.option_add("*TCombobox*Listbox.font", _f(10))

    def _center(self):
        w, h = self.winfo_width(), self.winfo_height()
        x = (self.winfo_screenwidth() - w) // 2
        y = (self.winfo_screenheight() - h) // 3
        self.geometry(f"+{x}+{y}")

    def refresh_printers(self):
        printers = list_printers()
        brother = next((p for p in printers if "QL" in p.upper() or "BROTHER" in p.upper()), "")
        self.printer_box["values"] = printers
        self.printer_var.set(brother or (printers[0] if printers else ""))
        self.print_var.set(bool(brother))

    def _report(self, state: str, title: str):
        d = self.last_dst
        n = len(self.preview.pages)
        detail = f"{d.name}  ·  {n} etiket  ·  {d.resolve().parent}" if d else ""
        self.bar.set(state, title, detail, show_actions=bool(d))

    def open_pdf(self):
        if self.last_dst:
            open_file(self.last_dst)

    def open_folder(self):
        if not self.last_dst:
            return
        if sys.platform == "win32":
            subprocess.Popen(["explorer.exe", "/select,", str(self.last_dst.resolve())])
        else:
            open_file(self.last_dst.parent)

    def print_current(self):
        if not self.last_dst:
            return
        self._print(self.last_dst, "Yazıcıya gönderildi")

    def _print(self, dst: Path, ok_title: str):
        printer = self.printer_var.get() or None
        self.bar.set("busy", "Yazıcıya gönderiliyor…", printer or "varsayılan yazıcı")
        self.update_idletasks()
        try:
            print_pdf(dst, printer)
        except (OSError, RuntimeError, subprocess.SubprocessError) as ex:
            self._report("error", "Yazıcıya gönderilemedi")
            Dialog(self, "Yazıcıya gönderilemedi", str(ex))
            return
        self._report("ok", f"{ok_title}  ·  {printer or 'varsayılan yazıcı'}")

    # -- akış
    def on_files(self, paths: list[Path] | None = None):
        if paths is None:
            paths = [Path(p) for p in filedialog.askopenfilenames(
                title="Ticimax kargo barkod PDF", filetypes=[("PDF", "*.pdf")])]
        for p in paths:
            self.process(p)

    def process(self, src: Path):
        self.bar.set("busy", "Dönüştürülüyor…", src.name)
        self.update_idletasks()
        try:
            dst = convert(src, size_key=self.size_var.get())
        except Exception as ex:  # noqa: BLE001
            self.bar.set("error", "Dönüştürülemedi", f"{src.name}  ·  {ex}")
            Dialog(self, "Etiket oluşturulamadı", f"{src.name}\n\n{ex}")
            return
        self.last_dst = dst
        self.preview.load(dst)
        self._report("ok", "Etiket oluşturuldu")
        if self.print_var.get():
            self._print(dst, "Etiket oluşturuldu ve yazıcıya gönderildi")
        if self.open_var.get():
            try:
                open_file(dst)
            except OSError as ex:
                Dialog(self, "PDF açılamadı", f"{ex}\n\nDosya burada: {dst}", kind="warning")


def _after_convert(dst: Path, do_print: bool, printer: str | None, do_open: bool) -> str:
    """Yazdırma/açma adımları; dönüştürme başarılı olduğu için hata yerine uyarı
    metni döndürür (boş = sorun yok)."""
    msgs = []
    if do_print:
        try:
            print_pdf(dst, printer)
        except (OSError, RuntimeError, subprocess.SubprocessError) as ex:
            msgs.append(f"Yazdırılamadı: {ex}")
    if do_open:
        try:
            open_file(dst)
        except OSError as ex:
            msgs.append(f"Açılamadı: {ex}\nDosya burada: {dst}")
    return "\n\n".join(msgs)


def main(argv: list[str] | None = None) -> int:
    ap = argparse.ArgumentParser(description=__doc__,
                                 formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("pdf", nargs="*", help="Ticimax kargo barkod PDF dosyaları")
    ap.add_argument("--boyut", choices=list(LABEL_SIZES), default=DEFAULT_SIZE)
    ap.add_argument("--yazdir", action="store_true", help="varsayılan yazıcıya gönder")
    ap.add_argument("--yazici", help="yazıcı adı (örn. \"Brother QL-550\")")
    ap.add_argument("--acma", action="store_true", help="çıktıyı açma")
    ap.add_argument("--kontrol", action="store_true",
                    help="gömülü PDF yazdırıcının bulunduğunu doğrula ve çık")
    args = ap.parse_args(argv)

    if args.kontrol:
        s = _sumatra()
        print(f"SumatraPDF: {s or 'YOK'}")
        return 0 if s else 2

    if not args.pdf:
        if tk is None:
            ap.error("tkinter bulunamadı; PDF dosya yolunu parametre olarak verin.")
        App().mainloop()
        return 0

    rc = 0
    for p in args.pdf:
        src = Path(p)
        try:
            dst = convert(src, size_key=args.boyut)
        except Exception as ex:  # noqa: BLE001
            rc = 1
            print(f"HATA {src}: {ex}", file=sys.stderr)
            _popup("error", "Hata", f"{src.name}\n\n{ex}")
            continue
        print(f"OK  {src} -> {dst}")
        do_print = bool(args.yazdir or args.yazici)
        warn = _after_convert(dst, do_print, args.yazici, not do_print and not args.acma)
        if warn:
            print(warn, file=sys.stderr)
            _popup("warning", "Etiket oluşturuldu", warn)
    return rc


def _popup(kind: str, title: str, text: str):
    """Sürükle-bırak ile (konsolsuz) çalıştırıldığında mesaj kutusu gösterir."""
    if tk and sys.platform == "win32" and not sys.stdout.isatty():
        root = tk.Tk()
        root.withdraw()
        fn = messagebox.showerror if kind == "error" else messagebox.showwarning
        fn(title, text)
        root.destroy()


if __name__ == "__main__":
    sys.exit(main())
