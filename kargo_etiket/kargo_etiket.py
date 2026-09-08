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


LEADING = 1.22  # satır yüksekliği / punto


@dataclass
class Line:
    text: str
    size: float
    font: str = "r"
    center: bool = False
    gray: bool = False
    space_after: float = 0.0

    @property
    def height(self) -> float:
        return self.size * LEADING + self.space_after


@dataclass
class Barcode:
    value: str
    height: float

    @property
    def total(self) -> float:
        return self.height + 1 * MM + 11 * LEADING


Item = Line | Barcode


def _block_height(items: list[Item]) -> float:
    return sum(i.height if isinstance(i, Line) else i.total for i in items)


def _draw_items(page: pymupdf.Page, items: list[Item], y: float) -> float:
    w = page.rect.width
    tw_black = pymupdf.TextWriter(page.rect)
    tw_gray = pymupdf.TextWriter(page.rect)
    for it in items:
        if isinstance(it, Barcode):
            modules = _barcode_modules(it.value)
            avail = w - 2 * MARGIN_X
            mod_w = avail / (len(modules) + 20)  # 10 modül sessiz bölge
            x = MARGIN_X + 10 * mod_w
            shape = page.new_shape()
            i = 0
            while i < len(modules):
                if modules[i] == "1":
                    j = i
                    while j < len(modules) and modules[j] == "1":
                        j += 1
                    shape.draw_rect(pymupdf.Rect(x + i * mod_w, y, x + j * mod_w, y + it.height))
                    i = j
                else:
                    i += 1
            shape.finish(color=None, fill=(0, 0, 0))
            shape.commit()
            y += it.height + 1 * MM
            f = _font("b")
            y += 11
            tw_black.append(((w - f.text_length(it.value, fontsize=11)) / 2, y), it.value,
                            font=f, fontsize=11)
            y += 11 * (LEADING - 1)
            continue
        f = _font(it.font)
        y += it.size
        px = MARGIN_X
        if it.center:
            px = (w - f.text_length(it.text, fontsize=it.size)) / 2
        (tw_gray if it.gray else tw_black).append((px, y), it.text, font=f, fontsize=it.size)
        y += it.size * (LEADING - 1) + it.space_after
    tw_black.write_text(page)
    tw_gray.write_text(page, color=(0.35, 0.35, 0.35))
    return y


def _rule(page: pymupdf.Page, y: float):
    page.draw_line((MARGIN_X, y), (page.rect.width - MARGIN_X, y), width=0.4,
                   color=(0.6, 0.6, 0.6))


def _kargo_satirlari(k: dict[str, str]) -> list[str]:
    ust = " · ".join(p for p in (k.get("Kargo Firması", ""), k.get("Ödeme Türü", "")) if p)
    alt = []
    if k.get("Paket Sayısı"):
        alt.append(f"Paket {k['Paket Sayısı']}")
    if k.get("Desi"):
        alt.append(f"{k['Desi']} Desi")
    return [ln for ln in (ust, " · ".join(alt)) if ln]


def _blocks(e: Etiket, max_w: float, scale: float) -> list[list[Item]]:
    """Etiket içeriğini bölümlere ayırır. `scale` yazı boyutlarını büyütür/küçültür."""
    s = scale
    a, g = e.alici, e.gonderici

    alici: list[Item] = [Line("ALICI", 6.5 * s, gray=True, space_after=1 * MM)]
    alici += [Line(t, 14 * s, "b") for t in _wrap(a.get("İsim", ""), 14 * s, "b", max_w, 2)]
    alici.append(Line(_telefon(a.get("Telefon", "")), 11 * s, space_after=1.5 * MM))
    alici += [Line(t, 9 * s) for t in _wrap(a.get("Adres", ""), 9 * s, "r", max_w, 5)]

    barkod: list[Item] = [Barcode(e.barkod, 22 * MM)]

    kargo: list[Item] = []
    for i, ln in enumerate(_kargo_satirlari(e.kargo)):
        for t in _wrap(ln, (8.5 if i == 0 else 8) * s, "b" if i == 0 else "r", max_w, 2):
            kargo.append(Line(t, (8.5 if i == 0 else 8) * s, "b" if i == 0 else "r", center=True))

    gond: list[Item] = [Line("GÖNDERİCİ", 6 * s, gray=True, space_after=0.6 * MM)]
    gond += [Line(t, 7.5 * s, "b") for t in _wrap(g.get("Firma", ""), 7.5 * s, "b", max_w, 2)]
    gond.append(Line(_telefon(g.get("Telefon", "")), 7 * s))
    gond += [Line(t, 6.5 * s, gray=True)
             for t in _wrap(g.get("Adres", ""), 6.5 * s, "r", max_w, 3)]
    return [alici, barkod, kargo, gond]


def draw_label(doc: pymupdf.Document, e: Etiket, size_key: str):
    w, h = LABEL_SIZES[size_key]
    max_w = w - 2 * MARGIN_X
    min_gap = 2.5 * MM

    if h is None:  # sürekli rulo: içerik kadar uzunluk
        blocks = _blocks(e, max_w, 1.0)
        total = sum(_block_height(b) for b in blocks) + min_gap * (len(blocks) - 1)
        page = doc.new_page(width=w, height=total + 2 * MARGIN_Y)
        gap = min_gap
    else:
        page = doc.new_page(width=w, height=h)
        avail = h - 2 * MARGIN_Y
        # Yazıyı, etiket yüksekliğine sığan en büyük ölçekte bas.
        scale = 1.15
        while True:
            blocks = _blocks(e, max_w, scale)
            total = sum(_block_height(b) for b in blocks)
            if total + min_gap * (len(blocks) - 1) <= avail or scale <= 0.7:
                break
            scale -= 0.05
        gap = max(min_gap, (avail - total) / (len(blocks) - 1))

    y = MARGIN_Y
    for i, b in enumerate(blocks):
        y = _draw_items(page, b, y)
        if i < len(blocks) - 1:
            y += gap / 2
            if i != 0:  # barkodun üstüne çizgi koyma
                _rule(page, y)
            y += gap / 2


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
    for c in (
        shutil.which("SumatraPDF"),
        os.path.expandvars(r"%LOCALAPPDATA%\SumatraPDF\SumatraPDF.exe"),
        os.path.expandvars(r"%ProgramFiles%\SumatraPDF\SumatraPDF.exe"),
        os.path.expandvars(r"%ProgramFiles(x86)%\SumatraPDF\SumatraPDF.exe"),
        str(resource_path("SumatraPDF.exe")),
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
    else:
        os.startfile(str(pdf), "print")  # type: ignore[attr-defined]


def open_file(path: Path):
    if sys.platform == "win32":
        os.startfile(str(path))  # type: ignore[attr-defined]
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

        self.print_var = tk.BooleanVar(value=False)
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
            self.status.config(text=f"Oluşturuldu: {dst.name}")
            if self.print_var.get():
                print_pdf(dst, self.printer_var.get() or None)
            if self.open_var.get():
                open_file(dst)
        except Exception as ex:  # noqa: BLE001
            messagebox.showerror("Hata", f"{src.name}\n\n{ex}")


def main(argv: list[str] | None = None) -> int:
    ap = argparse.ArgumentParser(description=__doc__,
                                 formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("pdf", nargs="*", help="Ticimax kargo barkod PDF dosyaları")
    ap.add_argument("--boyut", choices=list(LABEL_SIZES), default=DEFAULT_SIZE)
    ap.add_argument("--yazdir", action="store_true", help="varsayılan yazıcıya gönder")
    ap.add_argument("--yazici", help="yazıcı adı (örn. \"Brother QL-550\")")
    ap.add_argument("--acma", action="store_true", help="çıktıyı açma")
    args = ap.parse_args(argv)

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
            print(f"OK  {src} -> {dst}")
            if args.yazdir or args.yazici:
                print_pdf(dst, args.yazici)
            elif not args.acma:
                open_file(dst)
        except Exception as ex:  # noqa: BLE001
            rc = 1
            print(f"HATA {src}: {ex}", file=sys.stderr)
            if tk and sys.platform == "win32" and not sys.stdout.isatty():
                root = tk.Tk(); root.withdraw()
                messagebox.showerror("Hata", f"{src.name}\n\n{ex}")
    return rc


if __name__ == "__main__":
    sys.exit(main())
