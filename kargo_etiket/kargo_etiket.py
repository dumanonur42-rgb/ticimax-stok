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

import pymupdf
from barcode import Code128

try:
    import tkinter as tk
    from tkinter import filedialog, messagebox, ttk
except ImportError:  # tkinter olmayan sunucu kurulumları (yalnızca komut satırı)
    tk = None

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
    yoksa Windows'un varsayılan PDF uygulamasıyla yazdırır."""
    if sys.platform != "win32":
        raise RuntimeError("Yazdırma yalnızca Windows'ta desteklenir.")
    sumatra = _sumatra()
    if sumatra:
        cmd = [sumatra]
        cmd += ["-print-to", printer] if printer else ["-print-to-default"]
        cmd += ["-print-settings", "noscale", "-silent", "-exit-when-done", str(pdf)]
        subprocess.run(cmd, check=False, timeout=120)
        return
    try:
        os.startfile(str(pdf), "print")  # type: ignore[attr-defined]
    except OSError as ex:
        raise RuntimeError(
            "Windows'ta PDF yazdıracak bir uygulama bulunamadı. Etiket oluşturuldu:\n"
            f"{pdf}\nBu dosyayı Edge/Acrobat ile açıp Brother QL-550'ye 62x100 mm, "
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

class App(tk.Tk if tk else object):
    def __init__(self):
        super().__init__()
        self.title("Ticimax → Brother QL-550 Kargo Etiketi")
        self.resizable(False, False)
        pad = {"padx": 10, "pady": 5}

        frm = ttk.Frame(self, padding=12)
        frm.grid()

        ttk.Label(frm, text="Ticimax 'Kargo Gönderim Toplu Barkod' PDF'ini seçin.\n"
                            "Çıktı aynı klasöre  <ad>_QL550.pdf  olarak kaydedilir.",
                  justify="left").grid(column=0, row=0, columnspan=2, sticky="w", **pad)

        ttk.Label(frm, text="Etiket boyutu:").grid(column=0, row=1, sticky="w", **pad)
        self.size_var = tk.StringVar(value=DEFAULT_SIZE)
        ttk.Combobox(frm, textvariable=self.size_var, state="readonly", width=28,
                     values=list(LABEL_SIZES)).grid(column=1, row=1, sticky="w", **pad)

        ttk.Label(frm, text="Yazıcı:").grid(column=0, row=2, sticky="w", **pad)
        self.printer_var = tk.StringVar()
        printers = list_printers()
        brother = next((p for p in printers if "QL" in p.upper() or "BROTHER" in p.upper()), "")
        self.printer_var.set(brother or (printers[0] if printers else ""))
        ttk.Combobox(frm, textvariable=self.printer_var, width=28,
                     values=printers).grid(column=1, row=2, sticky="w", **pad)

        self.print_var = tk.BooleanVar(value=bool(brother))
        ttk.Checkbutton(frm, text="Dönüştürdükten sonra otomatik yazdır",
                        variable=self.print_var).grid(column=0, row=3, columnspan=2,
                                                       sticky="w", **pad)
        self.open_var = tk.BooleanVar(value=True)
        ttk.Checkbutton(frm, text="Çıktı PDF'ini aç",
                        variable=self.open_var).grid(column=0, row=4, columnspan=2,
                                                      sticky="w", **pad)

        ttk.Button(frm, text="PDF Seç ve Dönüştür", command=self.pick).grid(
            column=0, row=5, columnspan=2, sticky="ew", **pad)
        self.status = ttk.Label(frm, text="", foreground="#555")
        self.status.grid(column=0, row=6, columnspan=2, sticky="w", **pad)

    def pick(self):
        paths = filedialog.askopenfilenames(
            title="Ticimax kargo barkod PDF", filetypes=[("PDF", "*.pdf")])
        for p in paths:
            self.process(Path(p))

    def process(self, src: Path):
        try:
            dst = convert(src, size_key=self.size_var.get())
        except Exception as ex:  # noqa: BLE001
            messagebox.showerror("Hata", f"{src.name}\n\n{ex}")
            return
        self.status.config(text=f"Oluşturuldu: {dst.name}")
        warn = _after_convert(dst, self.print_var.get(), self.printer_var.get() or None,
                              self.open_var.get())
        if warn:
            messagebox.showwarning("Etiket oluşturuldu", warn)


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
