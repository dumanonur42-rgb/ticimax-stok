"""Rulman Etiket — ana pencere.

Solda etiket bilgileri ve baskı ayarları, ortada canlı önizleme, sağda son
kullanılan kodlar. Kod yazılıp Enter'a basılınca etiket yazıcıya gider.
"""
from __future__ import annotations

import base64
import os
import re
import struct
import subprocess
import sys
import threading
import tkinter as tk
import tkinter.font as tkfont
from pathlib import Path
from tkinter import filedialog, ttk
from typing import ClassVar

try:
    from . import etiket_cizim as ec
    from . import yazdirma as yz
except ImportError:
    import etiket_cizim as ec
    import yazdirma as yz

# ---------------------------------------------------------------- görünüm

BG = "#F3F4F6"
KART = "#FFFFFF"
KOYU = "#15171C"
KOYU_UST = "#2A2D35"
YAZI = "#1F2328"
SOLUK = "#6B7280"
CIZGI = "#D9DCE1"
KIRMIZI = "#E63946"
YESIL = "#15803D"
SARI = "#B45309"
YAZI_TIPI = "Segoe UI" if sys.platform == "win32" else "DejaVu Sans"

_OLCEK = 1.0  # ekran ölçeği (100% = 1.0, 150% = 1.5)


def px(n: float) -> int:
    return int(round(n * _OLCEK))


def _f(boy: int, kalin: bool = False) -> tuple:
    return (YAZI_TIPI, boy, "bold") if kalin else (YAZI_TIPI, boy)


BOYUT_ADLARI = {
    "62x100": ("62 × 100 mm", "Kesik etiket · DK-11202"),
    "62surekli": ("62 mm sürekli", "Sürekli rulo · DK-22205"),
}

_HARF = str.maketrans({"i": "I", "ı": "I", "İ": "I"})


def buyuk_harf(metin: str) -> str:
    """Rulman kodu için büyük harf: Türkçe i/ı/İ her zaman Latin I olur."""
    metin = metin.translate(_HARF)
    return "".join(c.upper() if len(c.upper()) == 1 else c for c in metin)


def _kisalt(metin: str, font: tkfont.Font, genislik: int) -> str:
    if font.measure(metin) <= genislik:
        return metin
    while metin and font.measure(metin + "…") > genislik:
        metin = metin[:-1]
    return metin + "…"


def _dosya_adi(metin: str) -> str:
    ad = re.sub(r'[\\/:*?"<>|]+', "-", metin).strip(" .")
    return ad or "etiket"


def _ac(yol: Path) -> None:
    try:
        if sys.platform == "win32":
            os.startfile(str(yol))  # noqa: S606
        elif sys.platform == "darwin":
            subprocess.Popen(["open", str(yol)])
        else:
            subprocess.Popen(["xdg-open", str(yol)])
    except OSError:
        pass


# ---------------------------------------------------------------- parçalar

class Buton(tk.Frame):
    """Düz renkli düğme. tur: 'ana' (koyu, büyük), 'ikincil' (çerçeveli), 'kucuk'."""

    def __init__(self, master, metin: str, komut, tur: str = "ikincil", ipucu: str = ""):
        self.tur = tur
        self.komut = komut
        self.acik = True
        if tur == "ana":
            self.renk = (KOYU, "white", KOYU_UST, "#9CA3AF")
            font, py, pxx = _f(13, True), 10, 18
        elif tur == "kucuk":
            self.renk = (KART, KOYU, KOYU, "#9CA3AF")
            font, py, pxx = _f(8, True), 3, 10
        else:
            self.renk = (KART, KOYU, KOYU, "#9CA3AF")
            font, py, pxx = _f(10, True), 8, 14
        super().__init__(master, bg=self.renk[0], cursor="hand2", highlightthickness=1,
                         highlightbackground=KOYU, highlightcolor=KOYU, padx=px(pxx),
                         pady=px(py))
        self.columnconfigure(0, weight=1)
        self.rowconfigure(0, weight=1)
        self.yazi = tk.Label(self, text=metin, font=font, bg=self.renk[0], fg=self.renk[1])
        self.yazi.grid(row=0, column=0)
        self.ipucu = None
        if ipucu:
            self.ipucu = tk.Label(self, text=ipucu, font=_f(8), bg=self.renk[0],
                                  fg="#AEB4BD")
            self.ipucu.place(relx=1.0, rely=0.5, anchor="e")
        for w in (self, self.yazi, *( [self.ipucu] if self.ipucu else [])):
            w.bind("<Button-1>", lambda _e: self._tikla())
            w.bind("<Enter>", lambda _e: self._boya(True))
            w.bind("<Leave>", lambda _e: self._boya(False))

    def _tikla(self):
        if self.acik:
            self.komut()

    def _boya(self, uzerinde: bool):
        zemin, yazi, ust, _pasif = self.renk
        if not self.acik:
            return
        if uzerinde:
            bg, fg = ust, "white"
        else:
            bg, fg = zemin, yazi
        for w in (self, self.yazi, *([self.ipucu] if self.ipucu else [])):
            w.config(bg=bg)
        self.yazi.config(fg=fg)

    def durum(self, acik: bool):
        self.acik = acik
        zemin, yazi, _ust, pasif = self.renk
        self.config(cursor="hand2" if acik else "arrow")
        for w in (self, self.yazi, *([self.ipucu] if self.ipucu else [])):
            w.config(bg=zemin if acik or self.tur != "ana" else pasif)
        self.yazi.config(fg=yazi if acik else ("white" if self.tur == "ana" else pasif))


class Bolmeli(tk.Frame):
    """Tek seçimli bölmeli düğme grubu."""

    def __init__(self, master, degisken: tk.StringVar, secenekler: list[tuple[str, str, str]],
                 dikey: bool = False):
        super().__init__(master, bg=KOYU, padx=1, pady=1)
        self.var = degisken
        self.hucreler: dict[str, tuple[tk.Frame, tk.Label, tk.Label]] = {}
        for i, (anahtar, baslik, alt) in enumerate(secenekler):
            hucre = tk.Frame(self, bg=KART, cursor="hand2", padx=px(10), pady=px(6))
            if dikey:
                hucre.grid(row=i, column=0, sticky="nsew", pady=(0 if i == 0 else 1, 0))
                self.columnconfigure(0, weight=1)
            else:
                hucre.grid(row=0, column=i, sticky="nsew", padx=(0 if i == 0 else 1, 0))
                self.columnconfigure(i, weight=1, uniform="bolme")
            b = tk.Label(hucre, text=baslik, font=_f(10, True), bg=KART, anchor="w")
            b.pack(fill="x")
            a = tk.Label(hucre, text=alt, font=_f(8), bg=KART, anchor="w")
            a.pack(fill="x")
            for w in (hucre, b, a):
                w.bind("<Button-1>", lambda _e, k=anahtar: self.var.set(k))
            self.hucreler[anahtar] = (hucre, b, a)
        self.var.trace_add("write", lambda *_: self._boya())
        self._boya()

    def _boya(self):
        secili = self.var.get()
        for anahtar, (hucre, b, a) in self.hucreler.items():
            on = anahtar == secili
            bg = KOYU if on else KART
            hucre.config(bg=bg)
            b.config(bg=bg, fg="white" if on else YAZI)
            a.config(bg=bg, fg="#C9CDD3" if on else SOLUK)


class Anahtar(tk.Frame):
    """Açma/kapama anahtarı ve açıklaması."""

    def __init__(self, master, degisken: tk.BooleanVar, metin: str, alt: str = ""):
        super().__init__(master, bg=KART, cursor="hand2")
        self.var = degisken
        self.w, self.h = px(40), px(22)
        self.sw = tk.Canvas(self, width=self.w, height=self.h, bg=KART, highlightthickness=0)
        self.sw.grid(row=0, column=0, rowspan=2, padx=(0, px(12)))
        tk.Label(self, text=metin, font=_f(10), fg=YAZI, bg=KART,
                 anchor="w").grid(row=0, column=1, sticky="w")
        if alt:
            tk.Label(self, text=alt, font=_f(8), fg=SOLUK, bg=KART,
                     anchor="w").grid(row=1, column=1, sticky="w")
        for w in (self, *self.winfo_children()):
            w.bind("<Button-1>", lambda _e: self.var.set(not self.var.get()))
        self.var.trace_add("write", lambda *_: self._boya())
        self._boya()

    def _boya(self):
        on = self.var.get()
        c, w, h = self.sw, self.w, self.h
        c.delete("all")
        renk = KOYU if on else "#CBD0D6"
        c.create_oval(0, 0, h, h, fill=renk, outline="")
        c.create_oval(w - h, 0, w, h, fill=renk, outline="")
        c.create_rectangle(h / 2, 0, w - h / 2, h, fill=renk, outline="")
        b = px(3)
        x = w - h + b if on else b
        c.create_oval(x, b, x + h - 2 * b, h - b, fill="white", outline="")


def _giris(master, font=None, **kw) -> tk.Entry:
    return tk.Entry(master, font=font or _f(11), relief="flat", bg=KART, fg=YAZI, width=1,
                    highlightthickness=1, highlightbackground=CIZGI, highlightcolor=KOYU,
                    insertbackground=KOYU, **kw)


class Sayac(tk.Frame):
    """Sadece rakam alan sayı kutusu, iki yanında − ve + düğmesi."""

    def __init__(self, master, degisken: tk.StringVar, en_az: int, en_cok: int):
        super().__init__(master, bg=KART, highlightthickness=1, highlightbackground=CIZGI,
                         highlightcolor=CIZGI)
        self.var, self.en_az, self.en_cok = degisken, en_az, en_cok
        hane = len(str(en_cok))
        dogrula = (self.register(lambda P: P == "" or (P.isdigit() and len(P) <= hane)), "%P")
        self.columnconfigure(1, weight=1)
        self.giris = tk.Entry(self, textvariable=degisken, font=_f(11, True), relief="flat",
                              bg=KART, fg=YAZI, width=1, justify="center",
                              highlightthickness=0, insertbackground=KOYU,
                              validate="key", validatecommand=dogrula)
        self.giris.grid(row=0, column=1, sticky="nsew", ipady=px(5))
        for sutun, isaret, adim in ((0, "−", -1), (2, "+", 1)):
            b = tk.Label(self, text=isaret, font=_f(12, True), fg=KOYU, bg="#F7F8F9",
                         cursor="hand2", width=2)
            b.grid(row=0, column=sutun, sticky="ns")
            b.bind("<Button-1>", lambda _e, a=adim: self.arttir(a))
            b.bind("<Enter>", lambda _e, w=b: w.config(bg="#E5E7EB"))
            b.bind("<Leave>", lambda _e, w=b: w.config(bg="#F7F8F9"))
        self.giris.bind("<FocusIn>", lambda _e: self.config(highlightbackground=KOYU))
        self.giris.bind("<FocusOut>", lambda _e: (self.config(highlightbackground=CIZGI),
                                                  self.duzelt()))
        self.giris.bind("<MouseWheel>", lambda e: self.arttir(1 if e.delta > 0 else -1))
        self.giris.bind("<Button-4>", lambda _e: self.arttir(1))
        self.giris.bind("<Button-5>", lambda _e: self.arttir(-1))
        self.giris.bind("<Up>", lambda _e: self.arttir(1))
        self.giris.bind("<Down>", lambda _e: self.arttir(-1))

    def deger(self) -> int:
        try:
            return int(self.var.get())
        except ValueError:
            return 0

    def arttir(self, adim: int):
        self.var.set(str(min(self.en_cok, max(self.en_az, (self.deger() or self.en_az) + adim))))

    def duzelt(self):
        self.var.set(str(min(self.en_cok, max(self.en_az, self.deger()))))


def _alan(master, baslik: str, widget, satir: int, sutun: int = 0, yayilim: int = 1,
          ust: int = 8, ipady: int = 4) -> tk.Label:
    etiket = tk.Label(master, text=baslik, font=_f(8), fg=SOLUK, bg=KART, anchor="w")
    etiket.grid(row=satir, column=sutun, columnspan=yayilim, sticky="w",
                padx=(0 if sutun == 0 else px(10), 0), pady=(px(ust), px(3)))
    widget.grid(row=satir + 1, column=sutun, columnspan=yayilim, sticky="ew",
                padx=(0 if sutun == 0 else px(10), 0), ipady=px(ipady))
    return etiket


def _kart(master, baslik: str = "", **kw) -> tk.Frame:
    k = tk.Frame(master, bg=KART, highlightbackground=CIZGI, highlightcolor=CIZGI,
                 highlightthickness=1, padx=px(18), pady=px(12), **kw)
    k.columnconfigure(0, weight=1)
    if baslik:
        tk.Label(k, text=baslik, font=_f(8, True), fg=SOLUK, bg=KART,
                 anchor="w").grid(row=0, column=0, columnspan=4, sticky="w")
    return k


class Onizleme(tk.Frame):
    """Etiketin gerçek oranında, gölgeli kâğıt görünümünde önizlemesi."""

    BOS_METIN = "Rulman kodunu yazınca\netiket burada görünür"

    def __init__(self, master):
        super().__init__(master, bg=KART, highlightbackground=CIZGI, highlightcolor=CIZGI,
                         highlightthickness=1, padx=px(16), pady=px(12))
        self.columnconfigure(0, weight=1)
        self.rowconfigure(1, weight=1)
        ust = tk.Frame(self, bg=KART)
        ust.grid(row=0, column=0, sticky="ew")
        ust.columnconfigure(0, weight=1)
        tk.Label(ust, text="ÖNİZLEME", font=_f(8, True), fg=SOLUK, bg=KART).grid(
            row=0, column=0, sticky="w")
        self.olcu = tk.Label(ust, text="", font=_f(8), fg=SOLUK, bg=KART)
        self.olcu.grid(row=0, column=1, sticky="e")
        self.tuval = tk.Canvas(self, width=px(250), height=px(330), bg=BG,
                               highlightthickness=0)
        self.tuval.grid(row=1, column=0, sticky="nsew", pady=(px(8), 0))
        self.uyari = tk.Label(self, text="", font=_f(9), fg=SARI, bg="#FEF3C7", anchor="w",
                              justify="left", padx=px(10), pady=px(6))
        self.uyari.bind("<Configure>",
                        lambda e: self.uyari.config(wraplength=max(px(80), e.width - px(22))))
        self._resim = None
        self._son: tuple | None = None
        self.tuval.bind("<Configure>", lambda _e: self.yenile())
        self._uretici = None

    def uyari_goster(self, metinler: list[str]):
        """Basmaya engel olmayan notları önizlemenin altında sarı kutuda gösterir."""
        metin = "\n".join(f"!  {m}" for m in metinler if m)
        if metin:
            if self.uyari.cget("text") != metin:
                self.uyari.config(text=metin)
            self.uyari.grid(row=2, column=0, sticky="ew", pady=(px(8), 0))
        else:
            self.uyari.config(text="")
            self.uyari.grid_remove()

    def baglan(self, uretici):
        """uretici() -> (veri, boyut) ya da None (gösterilecek etiket yok)."""
        self._uretici = uretici

    def yenile(self, zorla: bool = False):
        c = self.tuval
        cw, ch = c.winfo_width(), c.winfo_height()
        if cw < 20 or ch < 20 or not self._uretici:
            return
        istek = self._uretici()
        anahtar = (cw, ch, repr(istek))
        if anahtar == self._son and not zorla:
            return
        self._son = anahtar
        bosluk = px(18)
        gw, gh = cw - 2 * bosluk, ch - 2 * bosluk
        png = None
        if istek:
            veri, boyut = istek
            try:
                dpi = gw / (62 / 25.4)
                png = ec.onizleme_png(veri, boyut, dpi=max(20, int(dpi)))
                w, h = struct.unpack(">II", png[16:24])
                if h > gh:
                    dpi = dpi * gh / h
                    png = ec.onizleme_png(veri, boyut, dpi=max(20, int(dpi)))
                    w, h = struct.unpack(">II", png[16:24])
                yuk_mm = round(h / int(dpi) * 25.4)
                self.olcu.config(text=f"62 × {yuk_mm} mm")
            except Exception:  # noqa: BLE001 - önizleme hatası programı durdurmasın
                png = None
        c.delete("all")
        if png is None:
            self._resim = None
            w, h = int(gh * 0.62), gh
            w = min(w, gw)
            x0, y0 = (cw - w) // 2, (ch - h) // 2
            self._golge(x0, y0, w, h)
            c.create_rectangle(x0, y0, x0 + w, y0 + h, fill=KART, outline=CIZGI)
            c.create_text(cw / 2, ch / 2, text=self.BOS_METIN, font=_f(9), fill="#9CA3AF",
                          justify="center")
            if not istek:
                self.olcu.config(text="")
            return
        self._resim = tk.PhotoImage(data=base64.b64encode(png).decode("ascii"))
        x0, y0 = (cw - w) // 2, (ch - h) // 2
        self._golge(x0, y0, w, h)
        c.create_image(x0, y0, image=self._resim, anchor="nw")
        c.create_rectangle(x0, y0, x0 + w, y0 + h, outline="#E2E4E8")

    def _golge(self, x0, y0, w, h):
        c = self.tuval
        for i, renk in enumerate(("#E4E6EA", "#DADDE2", "#CFD3D9")):
            k = px(5 - i * 1.5)
            c.create_rectangle(x0 - k + px(2), y0 - k + px(4), x0 + w + k + px(2),
                               y0 + h + k + px(4), fill=renk, outline="")


class SonListe(tk.Frame):
    """Son yazdırılan kodlar; tıklanınca form dolar."""

    def __init__(self, master, secildi):
        super().__init__(master, bg=KART, highlightbackground=CIZGI, highlightcolor=CIZGI,
                         highlightthickness=1, padx=px(6), pady=px(12))
        self.secildi = secildi
        self.kayitlar: list[dict] = []
        self.columnconfigure(0, weight=1)
        self.rowconfigure(1, weight=1)
        tk.Label(self, text="SON KULLANILANLAR", font=_f(8, True), fg=SOLUK, bg=KART,
                 anchor="w").grid(row=0, column=0, columnspan=2, sticky="w",
                                  padx=px(12), pady=(0, px(6)))
        self.tuval = tk.Canvas(self, bg=KART, highlightthickness=0, width=px(200),
                               height=px(56))
        self.tuval.grid(row=1, column=0, sticky="nsew")
        self.kaydirma = ttk.Scrollbar(self, orient="vertical", command=self.tuval.yview)
        self.tuval.configure(yscrollcommand=self.kaydirma.set)
        self.ic = tk.Frame(self.tuval, bg=KART)
        self.ic.columnconfigure(0, weight=1)
        self.pencere = self.tuval.create_window(0, 0, window=self.ic, anchor="nw")
        self.kod_font = tkfont.Font(font=_f(10, True))
        self.alt_font = tkfont.Font(font=_f(8))
        self._genislik = 0
        self.tuval.bind("<Configure>", self._boyut)
        self.ic.bind("<Configure>", lambda _e: self._kaydirma_ayarla())
        for w in (self.tuval, self.ic):
            w.bind("<Enter>", lambda _e: self._tekerlek(True))
            w.bind("<Leave>", lambda _e: self._tekerlek(False))

    def _tekerlek(self, bagla: bool):
        if bagla:
            self.bind_all("<MouseWheel>", lambda e: self._kaydir(-1 if e.delta > 0 else 1))
            self.bind_all("<Button-4>", lambda _e: self._kaydir(-1))
            self.bind_all("<Button-5>", lambda _e: self._kaydir(1))
        else:
            for olay in ("<MouseWheel>", "<Button-4>", "<Button-5>"):
                self.unbind_all(olay)

    def _kaydir(self, yon: int):
        if self.ic.winfo_reqheight() > self.tuval.winfo_height():
            self.tuval.yview_scroll(yon, "units")

    def _boyut(self, e):
        self.tuval.itemconfigure(self.pencere, width=e.width)
        if e.width != self._genislik:
            self._genislik = e.width
            self._ciz()
        self._kaydirma_ayarla()

    def _kaydirma_ayarla(self):
        self.tuval.configure(scrollregion=(0, 0, self.ic.winfo_reqwidth(),
                                           self.ic.winfo_reqheight()))
        if self.ic.winfo_reqheight() > self.tuval.winfo_height() > 1:
            self.kaydirma.grid(row=1, column=1, sticky="ns")
        else:
            self.kaydirma.grid_remove()
            self.tuval.yview_moveto(0)

    def doldur(self, kayitlar: list[dict]):
        self.kayitlar = kayitlar
        self._ciz()

    def _ciz(self):
        for w in self.ic.winfo_children():
            w.destroy()
        genislik = max(px(80), (self._genislik or px(200)) - px(24))
        if not self.kayitlar:
            tk.Label(self.ic, text="Yazdırdığınız kodlar\nburada listelenir.", font=_f(9),
                     fg="#9CA3AF", bg=KART, justify="left", anchor="w").grid(
                row=0, column=0, sticky="w", padx=px(12), pady=px(4))
            return
        for i, k in enumerate(self.kayitlar):
            satir = tk.Frame(self.ic, bg=KART, cursor="hand2", padx=px(12), pady=px(6))
            satir.grid(row=i, column=0, sticky="ew")
            kod = str(k.get("kod", ""))
            alt = []
            if k.get("ek"):
                alt.append(str(k["ek"]))
            alt.append(f"{k.get('adet', 1)} adet")
            if k.get("bilgi1"):
                alt.append(str(k["bilgi1"]))
            a = tk.Label(satir, text=_kisalt(kod, self.kod_font, genislik), font=self.kod_font,
                         fg=YAZI, bg=KART, anchor="w")
            a.pack(fill="x")
            b = tk.Label(satir, text=_kisalt("  ·  ".join(alt), self.alt_font, genislik),
                         font=self.alt_font, fg=SOLUK, bg=KART, anchor="w")
            b.pack(fill="x")
            parcalar = (satir, a, b)
            for w in parcalar:
                w.bind("<Button-1>", lambda _e, kayit=k: self.secildi(kayit))
                w.bind("<Enter>", lambda _e, p=parcalar: [x.config(bg="#F3F4F6") for x in p])
                w.bind("<Leave>", lambda _e, p=parcalar: [x.config(bg=KART) for x in p])
                w.bind("<MouseWheel>", lambda e: self._kaydir(-1 if e.delta > 0 else 1))


class DurumCubugu(tk.Frame):
    """Alt şerit: durum rozeti, iki satır metin, sağda düğmeler."""

    RENK: ClassVar[dict[str, str]] = {"hazir": "#9CA3AF", "mesgul": KOYU, "tamam": YESIL,
                                      "hata": KIRMIZI}
    ISARET: ClassVar[dict[str, str]] = {"hazir": "", "mesgul": "…", "tamam": "✓", "hata": "!"}

    def __init__(self, master, dugmeler: list[tuple[str, object]]):
        super().__init__(master, bg=KART, highlightbackground=CIZGI, highlightcolor=CIZGI,
                         highlightthickness=1, padx=px(22), pady=px(7))
        self.columnconfigure(1, weight=1)
        self.rozet = tk.Canvas(self, width=px(26), height=px(26), bg=KART,
                               highlightthickness=0)
        self.rozet.grid(row=0, column=0, rowspan=2, padx=(0, px(12)))
        self.baslik = tk.Label(self, text="", font=_f(10, True), fg=YAZI, bg=KART,
                               anchor="w", width=1)
        self.baslik.grid(row=0, column=1, sticky="ew")
        self.ayrinti = tk.Label(self, text="", font=_f(8), fg=SOLUK, bg=KART, anchor="w",
                                width=1)
        self.ayrinti.grid(row=1, column=1, sticky="ew")
        self.kutu = tk.Frame(self, bg=KART)
        for i, (metin, komut) in enumerate(dugmeler):
            Buton(self.kutu, metin, komut, tur="kucuk").grid(row=0, column=i, padx=(px(8), 0))

    def yaz(self, durum: str, baslik: str, ayrinti: str = "", dugmeler: bool = False):
        c, r = self.rozet, px(26)
        c.delete("all")
        c.create_oval(px(2), px(2), r - px(2), r - px(2), fill=self.RENK[durum], outline="")
        c.create_text(r / 2, r / 2, text=self.ISARET[durum], font=_f(11, True), fill="white")
        self.baslik.config(text=baslik, fg=SOLUK if durum == "hazir" else YAZI)
        self.ayrinti.config(text=ayrinti)
        if dugmeler:
            self.kutu.grid(row=0, column=2, rowspan=2, sticky="e")
        else:
            self.kutu.grid_remove()


class Uyari(tk.Toplevel):
    """Programın görünümüne uygun Türkçe uyarı penceresi."""

    def __init__(self, master, baslik: str, metin: str, tur: str = "hata"):
        super().__init__(master, bg=KART)
        self.withdraw()
        self.title(baslik)
        self.resizable(False, False)
        self.transient(master)
        renk = KIRMIZI if tur == "hata" else SARI
        tk.Frame(self, bg=renk, height=px(4)).pack(fill="x")
        govde = tk.Frame(self, bg=KART, padx=px(22), pady=px(18))
        govde.pack(fill="both", expand=True)
        r = px(36)
        rozet = tk.Canvas(govde, width=r, height=r, bg=KART, highlightthickness=0)
        rozet.create_oval(px(2), px(2), r - px(2), r - px(2), fill=renk, outline="")
        rozet.create_text(r / 2, r / 2, text="!", font=_f(16, True), fill="white")
        rozet.grid(row=0, column=0, rowspan=2, padx=(0, px(16)), sticky="n")
        tk.Label(govde, text=baslik, font=_f(12, True), fg=YAZI, bg=KART,
                 anchor="w").grid(row=0, column=1, sticky="w")
        tk.Label(govde, text=metin, font=_f(10), fg=SOLUK, bg=KART, justify="left",
                 anchor="w", wraplength=px(380)).grid(row=1, column=1, sticky="w",
                                                     pady=(px(4), 0))
        tamam = Buton(govde, "Tamam", self.kapat, tur="ikincil")
        tamam.grid(row=2, column=1, sticky="e", pady=(px(16), 0))
        self.bind("<Return>", lambda _e: self.kapat())
        self.bind("<KP_Enter>", lambda _e: self.kapat())
        self.bind("<Escape>", lambda _e: self.kapat())
        self.protocol("WM_DELETE_WINDOW", self.kapat)
        self.update_idletasks()
        mx, my = master.winfo_rootx(), master.winfo_rooty()
        mw, mh = master.winfo_width(), master.winfo_height()
        w, h = self.winfo_reqwidth(), self.winfo_reqheight()
        self.geometry(f"+{mx + (mw - w) // 2}+{my + (mh - h) // 3}")
        self.deiconify()
        self.grab_set()
        self.focus_set()
        self._geri = master

    def kapat(self):
        self.grab_release()
        self.destroy()
        odak = getattr(self._geri, "kod_odakla", None)
        if odak:
            odak()


# ---------------------------------------------------------------- ana pencere

class Uygulama(tk.Tk):
    def __init__(self):
        super().__init__()
        self.withdraw()
        self._olcek_ayarla()
        self.title("Rulman Etiket")
        self.configure(bg=BG)
        self.ayar = self._ayar_oku()
        self.mesgul = False
        self.son_pdf: Path | None = None
        self._kayit_zamani = None
        self._onizleme_zamani = None
        self._normallesiyor = False
        self._simge()
        self._stil()

        self.kod_var = tk.StringVar()
        self.ek_var = tk.StringVar()
        self.adet_var = tk.StringVar(value="1")
        self.bilgi1_var = tk.StringVar(value=str(self.ayar.get("bilgi1", "")))
        self.bilgi2_var = tk.StringVar(value=str(self.ayar.get("bilgi2", "")))
        self.alt_var = tk.BooleanVar(value=bool(self.ayar.get("alt_tekrar", True)))
        boyutlar = list(ec.BOYUTLAR)
        boyut = self.ayar.get("boyut")
        self.boyut_var = tk.StringVar(value=boyut if boyut in ec.BOYUTLAR else boyutlar[0])
        self.kopya_var = tk.StringVar(value="1")
        self.yazici_var = tk.StringVar()

        self.columnconfigure(0, weight=1)
        self.rowconfigure(2, weight=1)
        self._baslik_seridi()
        govde = tk.Frame(self, bg=BG, padx=px(20), pady=px(12))
        govde.grid(row=2, column=0, sticky="nsew")
        govde.columnconfigure(1, weight=1)
        govde.rowconfigure(0, weight=1)

        sol = tk.Frame(govde, bg=BG, width=px(400))
        sol.grid(row=0, column=0, sticky="ns")
        sol.columnconfigure(0, weight=1, minsize=px(400))
        sol.rowconfigure(0, weight=1)
        self._form(sol)

        self.onizleme = Onizleme(govde)
        self.onizleme.grid(row=0, column=1, sticky="nsew", padx=(px(14), 0))
        self.onizleme.baglan(self._onizleme_istegi)

        sag = tk.Frame(govde, bg=BG)
        sag.grid(row=0, column=2, sticky="ns", padx=(px(14), 0))
        sag.columnconfigure(0, weight=1, minsize=px(250))
        sag.rowconfigure(1, weight=1)
        self._baski(sag)
        self.son = SonListe(sag, self.son_secildi)
        self.son.grid(row=1, column=0, sticky="nsew", pady=(px(12), 0))
        self.son.doldur(self._son_kodlar())

        self.durum = DurumCubugu(self, [("Klasörü aç", self.klasoru_ac),
                                        ("PDF'i aç", self.pdf_ac)])
        self.durum.grid(row=3, column=0, sticky="ew")

        self.yazicilari_yenile(ilk=True)
        for v in (self.kod_var, self.ek_var, self.adet_var, self.bilgi1_var, self.bilgi2_var,
                  self.alt_var, self.boyut_var, self.kopya_var):
            v.trace_add("write", lambda *_: self._degisti())
        for v in (self.bilgi1_var, self.bilgi2_var, self.alt_var, self.boyut_var,
                  self.yazici_var):
            v.trace_add("write", lambda *_: self._ayar_kaydet_sonra())
        self.kod_var.trace_add("write", lambda *_: self._normallestir(self.kod_var, self.kod))
        self.ek_var.trace_add("write", lambda *_: self._normallestir(self.ek_var, self.ek))
        self.kod_var.trace_add("write", lambda *_: self._kod_yazi_boyu())

        self.bind("<Return>", lambda _e: self.yazdir())
        self.bind("<KP_Enter>", lambda _e: self.yazdir())
        self.protocol("WM_DELETE_WINDOW", self.kapat)
        self._pencere_yerlestir()
        self.deiconify()
        self.after(50, self.kod_odakla)
        self.after(80, lambda: self.onizleme.yenile(True))

    # -- kurulum
    def _olcek_ayarla(self):
        global _OLCEK
        dpi = 0.0
        if sys.platform == "win32":
            try:
                import ctypes
                dpi = float(ctypes.windll.user32.GetDpiForSystem())
            except (AttributeError, OSError):
                dpi = 0.0
        if not dpi:
            dpi = float(self.winfo_fpixels("1i"))
        dpi = min(max(dpi, 96.0), 288.0)
        _OLCEK = dpi / 96.0
        self.tk.call("tk", "scaling", dpi / 72.0)

    def _simge(self):
        try:
            self._ikon = tk.PhotoImage(file=str(yz.resource_path("assets/icon_256.png")))
            self.iconphoto(True, self._ikon)
        except (tk.TclError, OSError):
            pass
        if sys.platform == "win32":
            try:
                self.iconbitmap(str(yz.resource_path("assets/icon.ico")))
            except (tk.TclError, OSError):
                pass

    def _stil(self):
        st = ttk.Style(self)
        if "clam" in st.theme_names():
            st.theme_use("clam")
        st.configure("TCombobox", fieldbackground=KART, background=KART, bordercolor=CIZGI,
                     lightcolor=KART, darkcolor=KART, arrowcolor=KOYU, padding=px(5),
                     arrowsize=px(13))
        st.map("TCombobox", fieldbackground=[("readonly", KART)],
               selectbackground=[("readonly", KART)],
               selectforeground=[("readonly", YAZI)],
               bordercolor=[("focus", KOYU)])
        st.configure("Vertical.TScrollbar", background="#E5E7EB", troughcolor=KART,
                     bordercolor=KART, arrowcolor=SOLUK, lightcolor="#E5E7EB",
                     darkcolor="#E5E7EB", arrowsize=px(11))
        self.option_add("*TCombobox*Listbox.font", _f(10))
        self.option_add("*TCombobox*Listbox.selectBackground", KOYU)

    def _baslik_seridi(self):
        serit = tk.Frame(self, bg=KOYU, padx=px(20), pady=px(10))
        serit.grid(row=0, column=0, sticky="ew")
        serit.columnconfigure(2, weight=1)
        try:
            self._logo = tk.PhotoImage(
                file=str(yz.resource_path("assets/icon_48.png"))).zoom(2).subsample(3)
            tk.Label(serit, image=self._logo, bg=KOYU).grid(row=0, column=0, padx=(0, px(10)))
        except (tk.TclError, OSError):
            pass
        tk.Label(serit, text="Rulman Etiket", font=_f(15, True), fg="white",
                 bg=KOYU).grid(row=0, column=1, sticky="w")
        tk.Label(serit, text="Kodu yazın, Enter'a basın: etiket yazıcıdan çıkar.",
                 font=_f(9), fg="#C9CDD3", bg=KOYU, anchor="w", width=1).grid(
            row=0, column=2, sticky="ew", padx=(px(16), 0))
        tk.Frame(self, bg=KIRMIZI, height=px(3)).grid(row=1, column=0, sticky="ew")

    def _form(self, sol: tk.Frame):
        kart = _kart(sol, "ETİKET BİLGİLERİ")
        kart.grid(row=0, column=0, sticky="nsew")
        kart.rowconfigure(20, weight=1)

        self.kod_font = tkfont.Font(font=_f(22, True))
        self.kod = _giris(kart, font=self.kod_font, textvariable=self.kod_var)
        _alan(kart, "Rulman kodu", self.kod, 1, ust=6)
        self.kod_ipucu = tk.Label(kart, text="", font=_f(8), fg=SOLUK, bg=KART, anchor="w",
                                  width=1)
        self.kod_ipucu.grid(row=3, column=0, sticky="ew", pady=(px(3), 0))
        self.kod.bind("<FocusOut>", lambda _e: self._kirp(self.kod_var))

        satir = tk.Frame(kart, bg=KART)
        satir.grid(row=4, column=0, sticky="ew")
        satir.columnconfigure(0, weight=3, uniform="ea")
        satir.columnconfigure(1, weight=2, uniform="ea")
        self.ek = _giris(satir, font=_f(12, True), textvariable=self.ek_var)
        _alan(satir, "Ek (ör. C3)", self.ek, 0)
        self.ek.bind("<FocusOut>", lambda _e: self._kirp(self.ek_var))
        self.adet = Sayac(satir, self.adet_var, 1, 99999)
        _alan(satir, "Adet", self.adet, 0, sutun=1, ipady=0)

        tk.Label(kart, text="Bilgi satırları (isteğe bağlı)", font=_f(8), fg=SOLUK, bg=KART,
                 anchor="w").grid(row=5, column=0, sticky="w", pady=(px(8), px(3)))
        self.bilgi1 = _giris(kart, font=_f(10), textvariable=self.bilgi1_var)
        self.bilgi1.grid(row=6, column=0, sticky="ew", ipady=px(3))
        self.bilgi2 = _giris(kart, font=_f(10), textvariable=self.bilgi2_var)
        self.bilgi2.grid(row=7, column=0, sticky="ew", ipady=px(3), pady=(px(5), 0))
        Anahtar(kart, self.alt_var, "Altta tekrar yazsın").grid(row=8, column=0, sticky="w",
                                                                pady=(px(10), 0))

        dugmeler = tk.Frame(kart, bg=KART)
        dugmeler.grid(row=21, column=0, sticky="sew", pady=(px(16), px(2)))
        dugmeler.columnconfigure(0, weight=1)
        self.yazdir_btn = Buton(dugmeler, "Yazdır", self.yazdir, tur="ana", ipucu="Enter")
        self.yazdir_btn.grid(row=0, column=0, sticky="ew")
        self.pdf_btn = Buton(dugmeler, "PDF olarak kaydet", self.pdf_kaydet)
        self.pdf_btn.grid(row=0, column=1, sticky="nsew", padx=(px(10), 0))

    def _baski(self, sag: tk.Frame):
        kart = _kart(sag, "BASKI")
        kart.grid(row=0, column=0, sticky="ew")
        secenekler = [(k, *BOYUT_ADLARI.get(k, (k, v))) for k, v in ec.BOYUTLAR.items()]
        tk.Label(kart, text="Etiket boyutu", font=_f(8), fg=SOLUK, bg=KART,
                 anchor="w").grid(row=1, column=0, sticky="w", pady=(px(6), px(3)))
        Bolmeli(kart, self.boyut_var, secenekler, dikey=True).grid(row=2, column=0,
                                                                   sticky="ew")
        satir = tk.Frame(kart, bg=KART)
        satir.grid(row=3, column=0, sticky="ew")
        satir.columnconfigure(0, weight=1)
        self.yazici_kutu = ttk.Combobox(satir, textvariable=self.yazici_var, state="readonly",
                                        font=_f(10), width=1)
        _alan(satir, "Yazıcı", self.yazici_kutu, 0, ipady=0)
        Buton(satir, "Yenile", lambda: self.yazicilari_yenile(), tur="kucuk").grid(
            row=1, column=1, sticky="ns", padx=(px(8), 0))
        satir2 = tk.Frame(kart, bg=KART)
        satir2.grid(row=4, column=0, sticky="w")
        self.kopya = Sayac(satir2, self.kopya_var, 1, 999)
        satir2.columnconfigure(0, minsize=px(120))
        _alan(satir2, "Kopya", self.kopya, 0, ipady=0)

    def _pencere_yerlestir(self):
        self.update_idletasks()
        en_az_w, en_az_h = self.winfo_reqwidth(), self.winfo_reqheight()
        self.minsize(en_az_w, en_az_h)
        sx, sy, sw, sh = self._calisma_alani()
        ust_bar = px(32)
        w = en_az_w + px(40)
        h = min(en_az_h + px(120), sh - ust_bar)
        h = max(h, en_az_h)
        w = max(min(w, sw), en_az_w)
        x = sx + (sw - w) // 2
        y = sy + max(0, (sh - ust_bar - h) // 2)
        m = re.fullmatch(r"(\d+)x(\d+)\+(-?\d+)\+(-?\d+)", str(self.ayar.get("pencere", "")))
        if m:
            kw, kh, kx, ky = (int(g) for g in m.groups())
            w = max(en_az_w, min(kw, sw))
            h = max(en_az_h, min(kh, sh - ust_bar))
            x = min(max(kx, sx), max(sx, sx + sw - w))
            y = min(max(ky, sy), max(sy, sy + sh - ust_bar - h))
        self.geometry(f"{w}x{h}+{x}+{y}")

    def _calisma_alani(self) -> tuple[int, int, int, int]:
        if sys.platform == "win32":
            try:
                import ctypes
                from ctypes import wintypes
                r = wintypes.RECT()
                if ctypes.windll.user32.SystemParametersInfoW(0x30, 0, ctypes.byref(r), 0):
                    return r.left, r.top, r.right - r.left, r.bottom - r.top
            except (AttributeError, OSError):
                pass
        return 0, 0, self.winfo_screenwidth(), self.winfo_screenheight() - px(40)

    # -- yardımcılar
    def _ayar_oku(self) -> dict:
        try:
            a = yz.ayar_oku()
        except Exception:  # noqa: BLE001
            a = {}
        return a if isinstance(a, dict) else {}

    def _son_kodlar(self) -> list[dict]:
        try:
            return [k for k in yz.son_kodlar() if isinstance(k, dict) and k.get("kod")]
        except Exception:  # noqa: BLE001
            return []

    def _normallestir(self, var: tk.StringVar, giris: tk.Entry):
        if self._normallesiyor:
            return
        eski = var.get()
        yeni = buyuk_harf(eski)
        if yeni != eski:
            self._normallesiyor = True
            try:
                imlec = giris.index("insert")
                var.set(yeni)
                giris.icursor(imlec)
            finally:
                self._normallesiyor = False

    def _kirp(self, var: tk.StringVar):
        if var.get() != var.get().strip():
            var.set(var.get().strip())

    def _kod_yazi_boyu(self):
        """Uzun kodlar kutuya sığsın diye yazı küçülür (22 → 12 punto)."""
        metin = self.kod_var.get() or "W"
        genislik = self.kod.winfo_width() - px(16)
        if genislik < 50:
            return
        boy = 22
        olcu = tkfont.Font(font=_f(boy, True))
        while boy > 12 and olcu.measure(metin) > genislik:
            boy -= 1
            olcu.configure(size=boy)
        if self.kod_font.cget("size") != boy:
            self.kod_font.configure(size=boy)

    def _sayi(self, var: tk.StringVar) -> int:
        try:
            return int(var.get())
        except ValueError:
            return 0

    def veri(self) -> ec.EtiketVerisi:
        return ec.EtiketVerisi(
            kod=buyuk_harf(self.kod_var.get()).strip(),
            ek=buyuk_harf(self.ek_var.get()).strip(),
            adet=self._sayi(self.adet_var),
            bilgi1=self.bilgi1_var.get().strip(),
            bilgi2=self.bilgi2_var.get().strip(),
            alt_tekrar=bool(self.alt_var.get()),
        )

    def _onizleme_istegi(self):
        v = self.veri()
        if not v.kod:
            return None
        if v.adet < 1:
            v.adet = 1
        return v, self.boyut_var.get()

    def _degisti(self):
        if self._onizleme_zamani:
            self.after_cancel(self._onizleme_zamani)
        self._onizleme_zamani = self.after(200, self._onizleme_guncelle)

    def _onizleme_guncelle(self):
        self._onizleme_zamani = None
        self.onizleme.yenile()
        v = self.veri()
        hatalar = []
        if v.kod:
            try:
                hatalar = ec.dogrula(v)
            except Exception:  # noqa: BLE001
                hatalar = []
        notlar = []
        if v.kod and not hatalar and hasattr(ec, "uyarilar"):
            try:
                notlar = list(ec.uyarilar(v, self.boyut_var.get()))
            except Exception:  # noqa: BLE001
                notlar = []
        self.onizleme.uyari_goster(notlar)
        if hatalar:
            self.kod_ipucu.config(text=hatalar[0], fg=KIRMIZI)
        else:
            self.kod_ipucu.config(text="Örnek: 6205-2RS  ·  harfler otomatik büyür",
                                  fg=SOLUK)

    def _ayar_kaydet_sonra(self):
        if self._kayit_zamani:
            self.after_cancel(self._kayit_zamani)
        self._kayit_zamani = self.after(600, self._ayar_kaydet)

    def _ayar_kaydet(self, pencere: bool = False):
        self._kayit_zamani = None
        a = self._ayar_oku()
        a.update({"boyut": self.boyut_var.get(), "yazici": self.yazici_var.get(),
                  "alt_tekrar": bool(self.alt_var.get()),
                  "bilgi1": self.bilgi1_var.get().strip(),
                  "bilgi2": self.bilgi2_var.get().strip()})
        if pencere and self.state() == "normal":
            a["pencere"] = self.geometry()
        try:
            yz.ayar_kaydet(a)
        except Exception:  # noqa: BLE001 - ayar yazılamazsa program yine çalışsın
            pass

    def kod_odakla(self):
        self.kod.focus_set()
        self.kod.select_range(0, "end")
        self.kod.icursor("end")

    def _hazir_yaz(self):
        yazici = self.yazici_var.get()
        if yazici:
            self.durum.yaz("hazir", "Hazır", f"Yazıcı: {yazici}")
        else:
            self.durum.yaz("hazir", "Yazıcı bulunamadı",
                           "Brother QL-550'yi açıp USB kablosunu takın, sonra Yenile'ye basın.")

    def yazicilari_yenile(self, ilk: bool = False):
        try:
            liste = list(yz.yazicilari_listele())
        except Exception:  # noqa: BLE001
            liste = []
        self.yazici_kutu["values"] = liste
        secili = self.yazici_var.get() if not ilk else str(self.ayar.get("yazici", ""))
        if secili not in liste:
            try:
                secili = yz.varsayilan_yazici(liste) or ""
            except Exception:  # noqa: BLE001
                secili = liste[0] if liste else ""
        self.yazici_var.set(secili)
        if not self.mesgul:
            self._hazir_yaz()

    def _kontrol(self) -> ec.EtiketVerisi | None:
        self.adet.duzelt() if self.adet_var.get() == "" else None
        v = self.veri()
        try:
            hatalar = ec.dogrula(v)
        except Exception:  # noqa: BLE001
            hatalar = ["Etiket bilgileri okunamadı. Alanları kontrol edin."]
        if hatalar:
            Uyari(self, "Etiket hazır değil", "\n".join(f"•  {h}" for h in hatalar),
                  tur="uyari")
            return None
        return v

    def _kopya(self) -> int:
        self.kopya.duzelt()
        return self.kopya.deger()

    def _etiket_adi(self, v: ec.EtiketVerisi) -> str:
        return f"{v.kod} {v.ek}".strip()

    # -- eylemler
    def yazdir(self):
        if self.mesgul:
            return "break"
        v = self._kontrol()
        if v is None:
            return "break"
        yazici = self.yazici_var.get()
        if not yazici:
            Uyari(self, "Yazıcı seçilmedi",
                  "Brother QL-550 bulunamadı. Yazıcıyı açıp USB kablosunu takın, sonra "
                  "Yazıcı kutusunun yanındaki Yenile'ye basın.")
            return "break"
        boyut, kopya = self.boyut_var.get(), self._kopya()
        self._mesgul(True)
        self.durum.yaz("mesgul", "Yazdırılıyor…",
                       f"{self._etiket_adi(v)}  ·  {kopya} kopya  ·  {yazici}")
        sonuc: dict = {}

        def is_():
            try:
                sonuc["yol"] = yz.yazdir(v, boyut, kopya, yazici)
            except yz.YazdirmaHatasi as e:
                sonuc["hata"] = str(e) or "Etiket yazıcıya gönderilemedi."
            except Exception:  # noqa: BLE001
                sonuc["hata"] = ("Etiket yazıcıya gönderilemedi. Yazıcının açık olduğunu "
                                 "kontrol edip tekrar deneyin.")

        t = threading.Thread(target=is_, daemon=True)
        t.start()

        def bekle():
            if t.is_alive():
                self.after(80, bekle)
                return
            self._mesgul(False)
            if "hata" in sonuc:
                self.durum.yaz("hata", "Yazdırılamadı", sonuc["hata"])
                Uyari(self, "Yazdırılamadı", sonuc["hata"])
                return
            self.son_pdf = Path(sonuc["yol"]) if sonuc.get("yol") else None
            self._son_ekle(v)
            self.durum.yaz("tamam", f"Yazdırıldı: {self._etiket_adi(v)}",
                           f"{kopya} kopya  ·  {yazici}", dugmeler=bool(self.son_pdf))
            self.kod_odakla()

        self.after(80, bekle)
        return "break"

    def pdf_kaydet(self):
        if self.mesgul:
            return
        v = self._kontrol()
        if v is None:
            return
        try:
            klasor = str(yz.cikti_klasoru())
        except Exception:  # noqa: BLE001
            klasor = str(Path.home())
        yol = filedialog.asksaveasfilename(
            parent=self, title="PDF olarak kaydet", initialdir=klasor,
            initialfile=f"{_dosya_adi(self._etiket_adi(v))}.pdf", defaultextension=".pdf",
            filetypes=[("PDF dosyası", "*.pdf")])
        if not yol:
            self.kod_odakla()
            return
        try:
            cikti = yz.pdf_kaydet(v, self.boyut_var.get(), self._kopya(), Path(yol))
        except yz.YazdirmaHatasi as e:
            Uyari(self, "PDF kaydedilemedi", str(e))
            return
        except Exception:  # noqa: BLE001
            Uyari(self, "PDF kaydedilemedi",
                  "Dosya kaydedilemedi. Aynı adlı dosya açıksa kapatıp tekrar deneyin.")
            return
        self.son_pdf = Path(cikti)
        self._son_ekle(v)
        self.durum.yaz("tamam", f"PDF kaydedildi: {self.son_pdf.name}",
                       str(self.son_pdf.parent), dugmeler=True)
        self.kod_odakla()

    def _son_ekle(self, v: ec.EtiketVerisi):
        try:
            yz.son_kod_ekle(v)
        except Exception:  # noqa: BLE001
            return
        self.son.doldur(self._son_kodlar())

    def son_secildi(self, k: dict):
        self.kod_var.set(str(k.get("kod", "")))
        self.ek_var.set(str(k.get("ek", "")))
        try:
            adet = int(k.get("adet", 1))
        except (TypeError, ValueError):
            adet = 1
        self.adet_var.set(str(min(99999, max(1, adet))))
        self.bilgi1_var.set(str(k.get("bilgi1", "")))
        self.bilgi2_var.set(str(k.get("bilgi2", "")))
        self.alt_var.set(bool(k.get("alt_tekrar", True)))
        self.kod_odakla()

    def _mesgul(self, mesgul: bool):
        self.mesgul = mesgul
        self.yazdir_btn.durum(not mesgul)
        self.pdf_btn.durum(not mesgul)
        self.config(cursor="watch" if mesgul else "")

    def pdf_ac(self):
        if self.son_pdf and self.son_pdf.exists():
            _ac(self.son_pdf)

    def klasoru_ac(self):
        if not self.son_pdf:
            return
        if sys.platform == "win32" and self.son_pdf.exists():
            subprocess.Popen(["explorer.exe", "/select,", str(self.son_pdf.resolve())])
        else:
            _ac(self.son_pdf.parent)

    def kapat(self):
        if self._kayit_zamani:
            self.after_cancel(self._kayit_zamani)
        self._ayar_kaydet(pencere=True)
        self.destroy()


def _dpi_farkindaligi():
    if sys.platform != "win32":
        return
    try:
        import ctypes
        ctypes.windll.shcore.SetProcessDpiAwareness(1)
    except (AttributeError, OSError):
        try:
            import ctypes
            ctypes.windll.user32.SetProcessDPIAware()
        except (AttributeError, OSError):
            pass


def baslat() -> None:
    """Ana pencereyi açar."""
    _dpi_farkindaligi()
    Uygulama().mainloop()


if __name__ == "__main__":
    baslat()
