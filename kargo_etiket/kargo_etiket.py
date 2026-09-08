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


class Drawer:
    def __init__(self, page: pymupdf.Page):
        self.page = page
        self.width = page.rect.width
        self.y = MARGIN_Y
        self.fonts = {"r": pymupdf.Font(fontfile=str(FONT_REGULAR)),
                      "b": pymupdf.Font(fontfile=str(FONT_BOLD))}
        self.writer = pymupdf.TextWriter(page.rect)

    def _wrap(self, text: str, size: float, font: str, max_w: float) -> list[str]:
        f = self.fonts[font]
        words = text.split()
        lines, cur = [], ""
        for w in words:
            cand = (cur + " " + w).strip()
            if f.text_length(cand, fontsize=size) <= max_w or not cur:
                cur = cand
            else:
                lines.append(cur)
                cur = w
        if cur:
            lines.append(cur)
        return lines

    def text(self, text: str, size: float, font: str = "r", max_lines: int | None = None,
             center: bool = False, x: float | None = None, max_w: float | None = None):
        max_w = max_w or (self.width - 2 * MARGIN_X)
        x = MARGIN_X if x is None else x
        lines = self._wrap(text, size, font, max_w)
        if max_lines and len(lines) > max_lines:
            lines = lines[:max_lines]
            lines[-1] = lines[-1][: max(0, len(lines[-1]) - 1)] + "…"
        f = self.fonts[font]
        for ln in lines:
            self.y += size
            px = x
            if center:
                px = (self.width - f.text_length(ln, fontsize=size)) / 2
            self.writer.append((px, self.y), ln, font=f, fontsize=size)
            self.y += size * 0.18

    def gap(self, h: float):
        self.y += h

    def rule(self):
        self.y += 1.2 * MM
        self.page.draw_line((MARGIN_X, self.y), (self.width - MARGIN_X, self.y), width=0.6)
        self.y += 0.8 * MM

    def barcode(self, value: str, height: float):
        modules = _barcode_modules(value)
        avail = self.width - 2 * MARGIN_X
        # Quiet zone: her iki yanda 10 modül
        mod_w = avail / (len(modules) + 20)
        x = MARGIN_X + 10 * mod_w
        top = self.y
        shape = self.page.new_shape()
        i = 0
        while i < len(modules):
            if modules[i] == "1":
                j = i
                while j < len(modules) and modules[j] == "1":
                    j += 1
                shape.draw_rect(pymupdf.Rect(x + i * mod_w, top, x + j * mod_w, top + height))
                i = j
            else:
                i += 1
        shape.finish(color=None, fill=(0, 0, 0))
        shape.commit()
        self.y = top + height + 0.5 * MM
        self.text(value, 9, "b", center=True)

    def finish(self):
        self.writer.write_text(self.page)


def _kargo_satiri(k: dict[str, str]) -> str:
    parts = [k.get("Kargo Firması", ""), k.get("Ödeme Türü", "")]
    if k.get("Paket Sayısı"):
        parts.append(f"Paket {k['Paket Sayısı']}")
    if k.get("Desi"):
        parts.append(f"Desi {k['Desi']}")
    return "  •  ".join(p for p in parts if p)


def draw_label(doc: pymupdf.Document, e: Etiket, size_key: str):
    w, h = LABEL_SIZES[size_key]
    # Sürekli rulo için önce uzun bir sayfaya çiz, sonra kırp.
    page = doc.new_page(width=w, height=h or 300 * MM)
    d = Drawer(page)

    d.text(_kargo_satiri(e.kargo), 7, "b", max_lines=2)
    d.rule()

    d.text("ALICI", 6, "r")
    d.text(e.alici.get("İsim", ""), 11, "b", max_lines=2)
    d.text(e.alici.get("Telefon", ""), 9, "r", max_lines=1)
    d.text(e.alici.get("Adres", ""), 8, "r", max_lines=5)
    d.rule()

    barkod_h = 18 * MM if h else 16 * MM
    d.gap(0.5 * MM)
    d.barcode(e.barkod, barkod_h)
    d.rule()

    g = e.gonderici
    d.text("GÖNDERİCİ: " + g.get("Firma", ""), 6.5, "b", max_lines=2)
    d.text(" ".join(filter(None, [g.get("Telefon", ""), g.get("Adres", "")])), 6, "r",
           max_lines=4)
    d.finish()

    if h is None:
        # set_mediabox PDF koordinatı (alt-sol orijin) alır: üstteki içeriği koru
        full = page.rect.height
        page.set_mediabox(pymupdf.Rect(0, full - (d.y + MARGIN_Y), w, full))


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
