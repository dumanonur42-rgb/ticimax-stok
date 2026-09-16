"""Yamansa Sosyal Medya Paneli – masaüstü arayüz (CustomTkinter).

Tasarım sistemi: koyu kurumsal tema, Yamansa lacivert/turuncu paleti, kart + rozet + istatistik bileşenleri.
"""
import datetime as dt
import os
import subprocess
import sys
import threading
import tkinter as tk
import webbrowser
from tkinter import messagebox, ttk

import customtkinter as ctk
from PIL import Image, ImageDraw

import ajan
import gorev
import icerik
import tarayici
from ayarlar import ayar_oku, ayar_yaz, durum_oku, durum_yaz, log_oku
from yollar import KOK, SHOTS, VERI

ctk.set_appearance_mode("dark")

# ---------------------------------------------------------------- tasarım belirteçleri
BG = "#060A18"          # pencere zemini
YAN = "#0A1128"         # kenar menü
KART = "#0E1733"        # kart yüzeyi
KART2 = "#141F45"       # iç yüzey / hover
CIZGI = "#1D2B58"       # kenarlık
METIN = "#F3F6FC"
METIN2 = "#97A3C4"
METIN3 = "#5E6C92"
TURUNCU, TURUNCU_H = "#FF6A00", "#E35E00"
MAVI, MAVI_H = "#3D7BFF", "#2F63D6"
YESIL, SARI, KIRMIZI, MOR = "#22C55E", "#F5B301", "#EF4444", "#A78BFA"
NAVY, MID, MIST, STEEL = "#011B54", BG, METIN, METIN2  # geriye dönük adlar

DURUM_RENK = {"OK": YESIL, "PENDING": SARI, "FAIL": KIRMIZI, "BLOK": "#FF3B3B", "DRY": METIN2}
DURUM_AD = {"OK": "Yayında", "PENDING": "Onay bekliyor", "FAIL": "Başarısız", "BLOK": "Engel", "DRY": "Deneme"}
SLOT_AD = {"sabah": "Sabah kartı", "ana": "Ana gönderi", "story": "Story"}
SLOT_RENK = {"sabah": SARI, "ana": MAVI, "story": MOR}
SLOT_IKON = {"sabah": "☀", "ana": "◆", "story": "◑"}
GUNLER = ["Pzt", "Sal", "Çar", "Per", "Cum", "Cmt", "Paz"]
GUNLER_UZUN = ["Pazartesi", "Salı", "Çarşamba", "Perşembe", "Cuma", "Cumartesi", "Pazar"]
AYLAR = ["Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran", "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık"]
MENU = [("pano", "◉", "Pano"), ("takvim", "▦", "Takvim & İçerik"), ("gruplar", "♟", "Facebook Grupları"),
        ("zaman", "◷", "Zamanlayıcı"), ("log", "≣", "Loglar & Kanıt"), ("hesap", "⚿", "Hesaplar"), ("ayar", "⚙", "Ayarlar")]
SURUM = "v2.0"


def ton(renk, oran=0.16, zemin=KART):
    """Renk ile zemini karıştırır (rozet arka planı gibi yumuşak tonlar için)."""
    r1, g1, b1 = (int(renk[i:i + 2], 16) for i in (1, 3, 5))
    r2, g2, b2 = (int(zemin[i:i + 2], 16) for i in (1, 3, 5))
    k = lambda a, b: int(a * oran + b * (1 - oran))  # noqa: E731
    return f"#{k(r1, r2):02x}{k(g1, g2):02x}{k(b1, b2):02x}"


def tarih_uzun(t):
    return f"{GUNLER_UZUN[t.weekday()]}, {t.day} {AYLAR[t.month - 1]} {t.year}"


def ac_dosya(p):
    p = str(p)
    if os.name == "nt":
        os.startfile(p)  # noqa
    elif sys.platform == "darwin":
        subprocess.Popen(["open", p])
    else:
        subprocess.Popen(["xdg-open", p])


def kucult(path, w, radius=0, zemin=KART):
    """Görseli genişliğe göre küçültür; radius verilirse köşeleri yuvarlatıp kart zeminine oturtur."""
    try:
        im = Image.open(path).convert("RGBA")
        h = int(im.height * w / im.width)
        im = im.resize((w, h), Image.LANCZOS)
        if radius:
            mask = Image.new("L", (w, h), 0)
            ImageDraw.Draw(mask).rounded_rectangle((0, 0, w - 1, h - 1), radius, fill=255)
            im = Image.composite(im, Image.new("RGBA", (w, h), zemin), mask)
        return ctk.CTkImage(light_image=im, dark_image=im, size=(w, h))
    except Exception:
        return None


class Uygulama(ctk.CTk):
    def __init__(self):
        super().__init__()
        self.title("Yamansa Rulman · Sosyal Medya Paneli")
        self._pencere_boyutu()
        self.configure(fg_color=BG)
        try:
            self.iconbitmap(str(KOK / "panel" / "yamansa.ico"))
        except Exception:
            pass
        self.ayar = ayar_oku()
        self._img_cache = {}
        self._font_cache = {}
        self._sayfalar = {}
        self._aktif = None
        self.font_b = self.F(20, "bold")
        self.font_m = self.F(13)
        self.font_k = self.F(11)
        self._ttk_stil()
        self._kenar()
        self._durum_cubugu()
        self._govde()
        g = durum_oku().get("giris", {})
        self.sayfa("pano" if g.get("fb") and g.get("ig") else "hesap")
        self.after(1000, self._yenile)

    def _pencere_boyutu(self):
        ew, eh = self.winfo_screenwidth(), self.winfo_screenheight()
        w, h = min(1440, ew - 60), min(900, eh - 120)
        self.geometry(f"{w}x{h}+{max(0, (ew - w) // 2)}+{max(0, (eh - h) // 2 - 30)}")
        self.minsize(1280, 760)
        if ew < 1500 or eh < 960:
            self.after(50, self._buyut)

    def _buyut(self):
        try:
            self.state("zoomed")
        except tk.TclError:
            try:
                self.attributes("-zoomed", True)
            except tk.TclError:
                pass

    # ------------------------------------------------------------ tasarım sistemi
    def F(self, boyut, agirlik="normal"):
        k = (boyut, agirlik)
        if k not in self._font_cache:
            self._font_cache[k] = ctk.CTkFont("Segoe UI", boyut, agirlik)
        return self._font_cache[k]

    def _ttk_stil(self):
        s = ttk.Style(self)
        s.theme_use("clam")
        s.configure("Treeview", background=KART, fieldbackground=KART, foreground=METIN, rowheight=30, borderwidth=0,
                    relief="flat", font=("Segoe UI", 10))
        s.configure("Treeview.Heading", background=KART2, foreground=METIN2, font=("Segoe UI", 10, "bold"), relief="flat",
                    borderwidth=0, padding=(8, 8))
        s.map("Treeview.Heading", background=[("active", KART2)])
        s.map("Treeview", background=[("selected", ton(MAVI, 0.45))], foreground=[("selected", METIN)])
        s.layout("Treeview", [("Treeview.treearea", {"sticky": "nswe"})])
        s.configure("Vertical.TScrollbar", background=KART2, troughcolor=KART, bordercolor=KART, arrowcolor=METIN2,
                    lightcolor=KART2, darkcolor=KART2, relief="flat", gripcount=0)
        s.map("Vertical.TScrollbar", background=[("active", CIZGI)])

    def kart(self, parent, baslik=None, alt=None, **kw):
        kw.setdefault("fg_color", KART)
        kw.setdefault("corner_radius", 16)
        kw.setdefault("border_width", 1)
        kw.setdefault("border_color", CIZGI)
        f = ctk.CTkFrame(parent, **kw)
        f.ust = None
        if baslik:
            ust = ctk.CTkFrame(f, fg_color="transparent", width=1, height=1)
            ust.pack(fill="x", padx=18, pady=(14, 6))
            ctk.CTkLabel(ust, text=baslik, font=self.F(14, "bold"), anchor="w").pack(side="left")
            if alt:
                ctk.CTkLabel(ust, text=alt, font=self.F(11), text_color=METIN3, anchor="w").pack(side="left", padx=(10, 0), pady=(2, 0))
            f.ust = ust
        return f

    def rozet(self, parent, text, renk, **kw):
        kw.setdefault("font", self.F(10, "bold"))
        return ctk.CTkLabel(parent, text=f"  {text}  ", text_color=renk, fg_color=ton(renk, 0.18), corner_radius=999, height=22, **kw)

    def rozet_ayarla(self, r, text, renk):
        r.configure(text=f"  {text}  ", text_color=renk, fg_color=ton(renk, 0.18))

    def btn(self, parent, text, cmd=None, tur="birincil", **kw):
        stil = {
            "birincil": dict(fg_color=TURUNCU, hover_color=TURUNCU_H, text_color="white"),
            "mavi": dict(fg_color=MAVI, hover_color=MAVI_H, text_color="white"),
            "ikincil": dict(fg_color=KART2, hover_color=CIZGI, text_color=METIN, border_width=1, border_color=CIZGI),
            "hayalet": dict(fg_color="transparent", hover_color=KART2, text_color=METIN2),
            "tehlike": dict(fg_color="#3A1420", hover_color="#571E30", text_color="#FCA5A5", border_width=1, border_color="#571E30"),
        }[tur]
        kw = {**dict(height=36, corner_radius=10, font=self.F(12, "bold")), **stil, **kw}
        return ctk.CTkButton(parent, text=text, command=cmd, **kw)

    def sayfa_basligi(self, parent, baslik, alt=None):
        u = ctk.CTkFrame(parent, fg_color="transparent", width=1, height=1)
        u.pack(fill="x", pady=(2, 16))
        sol = ctk.CTkFrame(u, fg_color="transparent", width=1, height=1)
        sol.pack(side="left")
        b = ctk.CTkLabel(sol, text=baslik, font=self.F(24, "bold"), anchor="w")
        b.pack(anchor="w")
        a = None
        if alt is not None:
            a = ctk.CTkLabel(sol, text=alt, font=self.F(12), text_color=METIN2, anchor="w", justify="left", wraplength=900)
            a.pack(anchor="w", pady=(2, 0))
        sag = ctk.CTkFrame(u, fg_color="transparent", width=1, height=1)
        sag.pack(side="right", pady=(6, 0))
        sag.baslik, sag.alt = b, a
        return sag

    def istatistik(self, parent, etiket, renk):
        k = ctk.CTkFrame(parent, fg_color=KART, corner_radius=16, border_width=1, border_color=CIZGI)
        ctk.CTkFrame(k, width=4, height=10, fg_color=renk, corner_radius=2).pack(side="left", fill="y", padx=(16, 0), pady=18)
        ic = ctk.CTkFrame(k, fg_color="transparent", width=1, height=1)
        ic.pack(side="left", fill="both", expand=True, padx=14, pady=14)
        ctk.CTkLabel(ic, text=etiket.upper(), font=self.F(10, "bold"), text_color=METIN3, anchor="w").pack(fill="x")
        deger = ctk.CTkLabel(ic, text="—", font=self.F(26, "bold"), anchor="w")
        deger.pack(fill="x", pady=(2, 0))
        alt = ctk.CTkLabel(ic, text="", font=self.F(11), text_color=METIN2, anchor="w")
        alt.pack(fill="x")
        return k, deger, alt

    def durum_satiri(self, parent, ad):
        r = ctk.CTkFrame(parent, fg_color="transparent", width=1, height=1)
        r.pack(fill="x", padx=18, pady=3)
        nokta = ctk.CTkLabel(r, text="●", font=self.F(12), text_color=METIN3, width=14)
        nokta.pack(side="left")
        ctk.CTkLabel(r, text=ad, font=self.F(12), text_color=METIN2, anchor="w").pack(side="left", padx=(8, 0))
        deger = ctk.CTkLabel(r, text="—", font=self.F(12, "bold"), anchor="e", text_color=METIN)
        deger.pack(side="right")
        return nokta, deger

    def durum_ayarla(self, satir, metin, renk):
        nokta, deger = satir
        nokta.configure(text_color=renk)
        deger.configure(text=metin, text_color=renk)

    def ayrac(self, parent, padx=18, pady=8, side="top"):
        ctk.CTkFrame(parent, height=1, fg_color=CIZGI).pack(fill="x", padx=padx, pady=pady, side=side)

    def alan(self, parent, etiket, genislik=80, deger=""):
        """Etiket + giriş kutusu (dikey), satır içi kullanım."""
        f = ctk.CTkFrame(parent, fg_color="transparent", width=1, height=1)
        ctk.CTkLabel(f, text=etiket.upper(), font=self.F(9, "bold"), text_color=METIN3, anchor="w").pack(anchor="w")
        e = ctk.CTkEntry(f, width=genislik, height=34, font=self.F(12), fg_color=KART2, border_color=CIZGI, corner_radius=8)
        e.insert(0, str(deger))
        e.pack(anchor="w", pady=(2, 0))
        return f, e

    def onay(self, parent, text, var, **kw):
        kw = {**dict(font=self.F(12), checkbox_width=20, checkbox_height=20, corner_radius=6, fg_color=MAVI,
                     hover_color=MAVI_H, border_color=METIN3, border_width=2), **kw}
        return ctk.CTkCheckBox(parent, text=text, variable=var, **kw)

    def anahtar(self, parent, text, var, cmd=None, **kw):
        kw = {**dict(font=self.F(13, "bold"), progress_color=TURUNCU, button_color=METIN, button_hover_color=MIST,
                     fg_color=KART2), **kw}
        return ctk.CTkSwitch(parent, text=text, variable=var, command=cmd, **kw)

    # ------------------------------------------------------------ iskelet
    def _kenar(self):
        k = ctk.CTkFrame(self, width=240, corner_radius=0, fg_color=YAN, border_width=0)
        k.pack(side="left", fill="y")
        k.pack_propagate(False)
        ctk.CTkFrame(self, width=1, corner_radius=0, fg_color=CIZGI).pack(side="left", fill="y")
        marka = ctk.CTkFrame(k, fg_color="transparent", width=1, height=1)
        marka.pack(fill="x", padx=20, pady=(26, 10))
        logo = kucult(KOK / "logo_yamansa.png", 168, zemin=YAN)
        ctk.CTkLabel(marka, image=logo, text="" if logo else "YAMANSA", font=self.F(22, "bold")).pack(anchor="w")
        ctk.CTkLabel(marka, text="SOSYAL MEDYA KOMUTA MERKEZİ", font=self.F(9, "bold"), text_color=METIN3).pack(anchor="w", pady=(8, 0))
        self.ayrac(k, padx=20, pady=(10, 14))
        ctk.CTkLabel(k, text="MENÜ", font=self.F(9, "bold"), text_color=METIN3, anchor="w").pack(fill="x", padx=26, pady=(0, 6))
        self._menu = {}
        for key, ikon, ad in MENU:
            satir = ctk.CTkFrame(k, fg_color="transparent", height=42)
            satir.pack(fill="x", padx=(0, 14), pady=2)
            gost = ctk.CTkFrame(satir, width=3, height=10, fg_color="transparent", corner_radius=2)
            gost.pack(side="left", fill="y", pady=9)
            b = ctk.CTkButton(satir, text=f"{ikon}    {ad}", anchor="w", height=42, corner_radius=10, fg_color="transparent",
                              hover_color=KART2, text_color=METIN2, font=self.F(13), command=lambda kk=key: self.sayfa(kk))
            b.pack(side="left", fill="both", expand=True, padx=(11, 0))
            self._menu[key] = (b, gost)
        # alt sistem kartı
        ctk.CTkLabel(k, text=f"Yamansa Rulman · {SURUM}", font=self.F(9), text_color=METIN3).pack(side="bottom", pady=(0, 10))
        alt = ctk.CTkFrame(k, fg_color=KART, corner_radius=14, border_width=1, border_color=CIZGI)
        alt.pack(side="bottom", fill="x", padx=14, pady=(14, 8))
        ctk.CTkLabel(alt, text="SİSTEM", font=self.F(9, "bold"), text_color=METIN3, anchor="w").pack(fill="x", padx=14, pady=(12, 4))
        r = ctk.CTkFrame(alt, fg_color="transparent", width=1, height=1)
        r.pack(fill="x", padx=14)
        self._yan_nokta = ctk.CTkLabel(r, text="●", font=self.F(12), text_color=METIN3, width=14)
        self._yan_nokta.pack(side="left")
        self._yan_ajan = ctk.CTkLabel(r, text="Ajan", font=self.F(12, "bold"), anchor="w")
        self._yan_ajan.pack(side="left", padx=(6, 0))
        self._yan_gun = ctk.CTkLabel(alt, text="", font=self.F(11), text_color=METIN2, anchor="w")
        self._yan_gun.pack(fill="x", padx=14, pady=(8, 2))
        self._yan_bar = ctk.CTkProgressBar(alt, height=6, progress_color=TURUNCU, fg_color=KART2, corner_radius=3)
        self._yan_bar.pack(fill="x", padx=14, pady=(0, 12))
        self._yan_bar.set(0)

    def _govde(self):
        self._icerik = ctk.CTkFrame(self, fg_color="transparent", width=1, height=1)
        self._icerik.pack(side="top", fill="both", expand=True, padx=24, pady=(20, 0))

    def _durum_cubugu(self):
        ctk.CTkFrame(self, height=1, corner_radius=0, fg_color=CIZGI).pack(side="bottom", fill="x")
        c = ctk.CTkFrame(self, height=34, corner_radius=0, fg_color=YAN)
        c.pack(side="bottom", fill="x")
        self._sb_ajan = ctk.CTkLabel(c, text="", font=self.F(11, "bold"))
        self._sb_ajan.pack(side="left", padx=(18, 14))
        self._sb_sonraki = ctk.CTkLabel(c, text="", font=self.F(11), text_color=METIN2)
        self._sb_sonraki.pack(side="left", padx=14)
        self._sb_saat = ctk.CTkLabel(c, text="", font=self.F(11), text_color=METIN2)
        self._sb_saat.pack(side="right", padx=18)
        ctk.CTkLabel(c, text=f"Veri: {VERI}", font=self.F(9), text_color=METIN3).pack(side="right", padx=14)

    def sayfa(self, key):
        for f in self._sayfalar.values():
            f.pack_forget()
        for kk, (b, gost) in self._menu.items():
            aktif = kk == key
            b.configure(fg_color=KART2 if aktif else "transparent", text_color=METIN if aktif else METIN2,
                        font=self.F(13, "bold" if aktif else "normal"))
            gost.configure(fg_color=TURUNCU if aktif else "transparent")
        if key not in self._sayfalar:
            self._sayfalar[key] = getattr(self, f"_s_{key}")()
        self._sayfalar[key].pack(fill="both", expand=True)
        self._aktif = key
        yenile = getattr(self, f"_y_{key}", None)
        if yenile:
            yenile()

    def _yenile(self):
        try:
            d = durum_oku()
            canli = ajan.ajan_canli()
            a = d.get("ajan", {})
            self._sb_ajan.configure(text=("●  Ajan çalışıyor · " + a.get("is_", "")) if canli else "○  Ajan kapalı – zamanlanmış paylaşımlar atılmaz",
                                    text_color=YESIL if canli else KIRMIZI)
            self._yan_nokta.configure(text_color=YESIL if canli else KIRMIZI)
            self._yan_ajan.configure(text="Ajan çalışıyor" if canli else "Ajan kapalı", text_color=YESIL if canli else KIRMIZI)
            gun = icerik.gun_no(self.ayar)
            self._yan_gun.configure(text=f"İçerik günü {gun} / {icerik.SON_GUN}")
            self._yan_bar.set(min(1, max(0, gun / icerik.SON_GUN)))
            s = ajan.sonraki_isler(self.ayar, d, adet=1)
            self._sb_sonraki.configure(text=f"Sıradaki: {s[0][0]:%d.%m %H:%M} · {s[0][1]}" if s else "Sıradaki iş yok")
            self._sb_saat.configure(text=dt.datetime.now().strftime("%d.%m.%Y  %H:%M"))
            if self._aktif in ("pano", "log", "gruplar"):
                getattr(self, f"_y_{self._aktif}")()
        except Exception as e:
            print("yenile:", e)
        self.after(5000, self._yenile)

    # ------------------------------------------------------------ yardımcılar
    def img(self, path, w, radius=12, zemin=KART):
        k = (str(path), w, radius, zemin)
        if k not in self._img_cache:
            self._img_cache[k] = kucult(path, w, radius, zemin)
        return self._img_cache[k]

    def kopyala(self, metin):
        self.clipboard_clear()
        self.clipboard_append(metin)

    def arka_planda(self, fn, bitince=None, mesgul=False):
        """Uzun işi thread'de çalıştırır; panel tarayıcıyı kullanıyorsa ajana 'meşgul' bayrağı bırakır."""
        def run():
            if mesgul:
                ajan.MESGUL_BAYRAK.write_text("1")
            try:
                r = fn()
                if bitince:
                    self.after(0, lambda: bitince(r))
            except Exception as e:
                hata = str(e)
                self.after(0, lambda: messagebox.showerror("Hata", hata))
            finally:
                if mesgul:
                    ajan.MESGUL_BAYRAK.unlink(missing_ok=True)
        threading.Thread(target=run, daemon=True).start()

    def paylas_simdi(self, gun, slot, platformlar, go=True):
        if not platformlar:
            return messagebox.showwarning("Platform", "En az bir platform seçin (Facebook / Instagram).")
        ad = f"{SLOT_AD[slot]} {self.ayar['slotlar'][slot]['saat']}"
        ne = "PAYLAŞILACAK" if go else "deneme (paylaş tuşuna basılmaz)"
        if not messagebox.askyesno("Onay", f"Gün {gun} · {ad}\n{' + '.join(p.upper() for p in platformlar)}\n\n{ne}. Devam?"):
            return
        if ajan.ajan_canli():
            ajan.komut_gonder(tip="slot", gun=gun, slot=slot, platformlar=platformlar, go=go)
            messagebox.showinfo("Gönderildi", "Komut ajana iletildi; 1-3 dk içinde Loglar sayfasında görünür.")
        else:
            if not tarayici.tarayici_kurulu():
                return messagebox.showwarning("Tarayıcı", "Tarayıcı bulunamadı; Hesaplar sayfasından 'Tarayıcıyı indir' deyin.")

            def isle():
                with tarayici.ac(gizli=self.ayar["gizli_pencere"]) as ctx:
                    return ajan.slot_isi(ctx, self.ayar, gun, slot, platformlar, go)
            self.arka_planda(isle, lambda r: messagebox.showinfo("Bitti", "\n".join(f"{x['platform'].upper()}: {x['durum']} {x['url']}" for x in r)), mesgul=True)

    def kaydet(self):
        ayar_yaz(self.ayar)
        self.ayar = ayar_oku()
        gorev.uyandirma_guncelle(self.ayar)  # slot/tur saatleri değişince uyandırma tetikleyicileri yenilenir

    def _log_tablosu(self, parent, yukseklik=None):
        """Ortak log tablosu (Pano + Loglar)."""
        cols = ("zaman", "tip", "hedef", "durum", "notu")
        tree = ttk.Treeview(parent, columns=cols, show="headings", **({"height": yukseklik} if yukseklik else {}))
        for c, ad, w, st in (("zaman", "Zaman", 130, False), ("tip", "Tür", 150, False), ("hedef", "Hedef", 300, True),
                             ("durum", "Durum", 110, False), ("notu", "Link / Not", 420, True)):
            tree.heading(c, text=ad, anchor="w")
            tree.column(c, width=w, anchor="w", stretch=st)
        for durum, renk in DURUM_RENK.items():
            tree.tag_configure(durum, foreground=renk)
        tree.tag_configure("serit", background="#111B3B")
        return tree

    def _log_satiri(self, x):
        grup = x.get("tip") == "grup"
        hedef = x.get("grup", "")[:70] if grup else f"Gün {x.get('gun', '?'):02d} · {SLOT_AD.get(x.get('slot'), x.get('slot', ''))} · {x.get('platform', '').upper()}"
        tip = f"Grup · {icerik.SEGMENT_AD.get(x.get('segment'), '')}" if grup else "Sosyal medya"
        notu = (x.get("url") or x.get("notu") or "").strip().splitlines()
        return (x["zaman"][:16], tip, hedef, DURUM_AD.get(x["durum"], x["durum"]), notu[0][:120] if notu else "")

    # ============================================================ PANO
    def _s_pano(self):
        f = ctk.CTkScrollableFrame(self._icerik, fg_color="transparent")
        sag = self.sayfa_basligi(f, "Pano", "")
        self._pano_baslik = (sag.baslik, sag.alt)
        self._pano_rozet_ajan = self.rozet(sag, "AJAN", METIN2)
        self._pano_rozet_ajan.pack(side="left", padx=4)
        self._pano_rozet_grup = self.rozet(sag, "GRUP TURLARI", METIN2)
        self._pano_rozet_grup.pack(side="left", padx=4)
        self._pano_rozet_oto = self.rozet(sag, "OTOMATİK BAŞLATMA", METIN2)
        self._pano_rozet_oto.pack(side="left", padx=4)
        self._pano_blok = ctk.CTkLabel(f, text="", font=self.F(12, "bold"), text_color="#FECACA", fg_color="#4C1D2B",
                                       corner_radius=12, height=40, anchor="w", padx=16)
        # KPI şeridi
        kpi = ctk.CTkFrame(f, fg_color="transparent", width=1, height=1)
        kpi.pack(fill="x", pady=(0, 14))
        self._kpi = {}
        for i, (key, etiket, renk) in enumerate((("bugun", "Bugünkü paylaşımlar", TURUNCU), ("basari", "7 günlük başarı", YESIL),
                                                  ("toplam", "Toplam yayın", MAVI), ("grup", "Facebook grupları", MOR))):
            k, deger, alt = self.istatistik(kpi, etiket, renk)
            k.grid(row=0, column=i, sticky="nsew", padx=(0 if i == 0 else 7, 0 if i == 3 else 7))
            kpi.grid_columnconfigure(i, weight=1, uniform="kpi")
            self._kpi[key] = (deger, alt)
        # ana satır
        satir = ctk.CTkFrame(f, fg_color="transparent", width=1, height=1)
        satir.pack(fill="x")
        satir.grid_columnconfigure(0, weight=1)
        satir.grid_columnconfigure(1, weight=0, minsize=340)
        sag = ctk.CTkFrame(satir, fg_color="transparent", width=1, height=1)
        sag.grid(row=0, column=1, sticky="new", padx=(2, 0))
        sol = ctk.CTkFrame(satir, fg_color="transparent", width=1, height=1)
        sol.grid(row=0, column=0, sticky="nsew")
        self._pano_slotlar = ctk.CTkFrame(sol, fg_color="transparent", width=1, height=1)
        self._pano_slotlar.pack(fill="both", expand=True)
        yk = self.kart(sol, "Yaklaşan işler", "otomatik")
        yk.pack(fill="x", pady=(12, 0), padx=(0, 12))
        self._pano_yaklasan = ctk.CTkFrame(yk, fg_color="transparent", width=1, height=1)
        self._pano_yaklasan.pack(fill="x", padx=18, pady=(0, 12))
        self._pano_yaklasan_imza = None
        # sistem durumu
        sk = self.kart(sag, "Sistem durumu", "canlı")
        sk.pack(fill="x", pady=(0, 12))
        self._pano_sd = {ad: self.durum_satiri(sk, etiket) for ad, etiket in (
            ("ajan", "Arka plan ajanı"), ("oto", "Otomatik başlatma"), ("tarayici", "Tarayıcı"),
            ("fb", "Facebook oturumu"), ("ig", "Instagram oturumu"))}
        self._pano_ajan_is = ctk.CTkLabel(sk, text="", font=self.F(11), text_color=METIN3, anchor="w", wraplength=290, justify="left")
        self._pano_ajan_is.pack(fill="x", padx=18, pady=(6, 0))
        bs = ctk.CTkFrame(sk, fg_color="transparent", width=1, height=1)
        bs.pack(fill="x", padx=14, pady=(10, 14))
        self.btn(bs, "Otomatik başlatmayı kur", self._ajan_kur, height=36).pack(fill="x", padx=4, pady=(0, 6))
        bs2 = ctk.CTkFrame(bs, fg_color="transparent", width=1, height=1)
        bs2.pack(fill="x")
        self.btn(bs2, "Ajanı başlat", self._ajan_baslat, "ikincil", height=32).pack(side="left", padx=4, fill="x", expand=True)
        self.btn(bs2, "Durdur", self._ajan_durdur, "tehlike", height=32).pack(side="left", padx=4, fill="x", expand=True)
        # grup turu
        gk = self.kart(sag, "Grup turu")
        gk.pack(fill="x")
        self._pano_grup_rozet = self.rozet(gk.ust, "KAPALI", METIN2)
        self._pano_grup_rozet.pack(side="right")
        self._pano_grup = ctk.CTkLabel(gk, text="", font=self.F(11), text_color=METIN2, justify="left", anchor="w", wraplength=290)
        self._pano_grup.pack(fill="x", padx=18)
        self._pano_grup_bar = ctk.CTkProgressBar(gk, height=6, progress_color=TURUNCU, fg_color=KART2, corner_radius=3)
        self._pano_grup_bar.pack(fill="x", padx=18, pady=(8, 14))
        self._pano_grup_bar.set(0)
        # son paylaşımlar
        lk = self.kart(f, "Son paylaşımlar", "son 8 kayıt")
        lk.pack(fill="x", pady=(14, 0))
        self.btn(lk.ust, "Tümünü gör  →", lambda: self.sayfa("log"), "hayalet", height=28, font=self.F(11, "bold")).pack(side="right")
        self._pano_tree = self._log_tablosu(lk, yukseklik=8)
        self._pano_tree.pack(fill="x", padx=12, pady=(4, 12))
        self._pano_tree_imza = None
        self._pano_slot_widgets = None
        return f

    def _y_pano(self):
        d = durum_oku()
        gun = icerik.gun_no(self.ayar)
        bugun = dt.date.today()
        saat = dt.datetime.now().hour
        selam = "Günaydın" if saat < 12 else "İyi günler" if saat < 18 else "İyi akşamlar"
        baslik, alt = self._pano_baslik[0], self._pano_baslik[1]
        baslik.configure(text=f"{selam}, Yamansa Rulman")
        alt.configure(text=f"{tarih_uzun(bugun)}  ·  İçerik günü {gun}/{icerik.SON_GUN}  ·  60 günlük planın %{int(gun / icerik.SON_GUN * 100)}'i")
        canli = ajan.ajan_canli()
        kurulu = gorev.kurulu()
        self.rozet_ayarla(self._pano_rozet_ajan, "AJAN ÇALIŞIYOR" if canli else "AJAN KAPALI", YESIL if canli else KIRMIZI)
        self.rozet_ayarla(self._pano_rozet_grup, "GRUP TURLARI " + ("AÇIK" if self.ayar["grup"]["aktif"] else "KAPALI"),
                          TURUNCU if self.ayar["grup"]["aktif"] else METIN2)
        self.rozet_ayarla(self._pano_rozet_oto, "OTOMATİK BAŞLATMA " + ("KURULU" if kurulu else "YOK"), YESIL if kurulu else SARI)
        blok = d.get("blok")
        if blok:
            self._pano_blok.configure(text=f"⚠  Facebook engeli görüldü ({blok['zaman']}): {blok['neden']}  – grup turları kapatıldı. Engeli sıfırlamak için Gruplar sayfasına bakın.")
            self._pano_blok.pack(fill="x", pady=(0, 12), before=self._kpi["bugun"][0].master)
        else:
            self._pano_blok.pack_forget()
        # KPI
        loglar = log_oku()
        slotlar = [x for x in loglar if x.get("tip") == "slot"]
        bugun_s = bugun.isoformat()
        bugun_l = [x for x in slotlar if x["zaman"][:10] == bugun_s]
        hedef = sum(len(s["platformlar"]) for s in self.ayar["slotlar"].values() if s["aktif"])
        ok_bugun = sum(x["durum"] == "OK" for x in bugun_l)
        self._kpi["bugun"][0].configure(text=f"{ok_bugun} / {hedef}")
        self._kpi["bugun"][1].configure(text=f"{sum(x['durum'] == 'FAIL' for x in bugun_l)} başarısız · {len(bugun_l)} deneme" if bugun_l else "Henüz paylaşım yok")
        hafta = [x for x in slotlar if x["zaman"][:10] >= (bugun - dt.timedelta(days=7)).isoformat() and x["durum"] in ("OK", "FAIL")]
        oran = round(100 * sum(x["durum"] == "OK" for x in hafta) / len(hafta)) if hafta else None
        self._kpi["basari"][0].configure(text=f"%{oran}" if oran is not None else "—",
                                         text_color=YESIL if (oran or 0) >= 80 else SARI if (oran or 0) >= 50 else METIN)
        self._kpi["basari"][1].configure(text=f"{len(hafta)} paylaşım denemesi" if hafta else "Son 7 günde veri yok")
        toplam_ok = sum(x["durum"] == "OK" for x in loglar)
        self._kpi["toplam"][0].configure(text=str(toplam_ok))
        self._kpi["toplam"][1].configure(text=f"{sum(x['durum'] == 'OK' for x in slotlar)} sosyal · {toplam_ok - sum(x['durum'] == 'OK' for x in slotlar)} grup")
        gs = icerik.gruplar(self.ayar)
        acik = sum(g["acik"] for g in gs)
        self._kpi["grup"][0].configure(text=f"{acik} / {len(gs)}")
        self._kpi["grup"][1].configure(text="açık grup · turlar " + ("AÇIK" if self.ayar["grup"]["aktif"] else "KAPALI"))
        # slot kartları (günde 1 kez kur)
        dar = self._dar_mi()
        if self._pano_slot_widgets != (gun, dar):
            self._pano_slot_widgets = (gun, dar)
            for w in self._pano_slotlar.winfo_children():
                w.destroy()
            for i, slot in enumerate(("sabah", "ana", "story")):
                self._slot_karti(self._pano_slotlar, gun, slot, dar).grid(row=0, column=i, sticky="nsew", padx=(0, 12))
                self._pano_slotlar.grid_columnconfigure(i, weight=1, uniform="slot")
            self._pano_slotlar.grid_rowconfigure(0, weight=1)
        yapildi = d.get("yapildi", {}).get(bugun_s, {})
        for slot, lbl in self._slot_durum_lbl.items():
            kayit = [x for x in slotlar if x.get("gun") == gun and x.get("slot") == slot and x["zaman"][:10] == bugun_s]
            if kayit:
                self.rozet_ayarla(lbl, "  ".join(f"{x['platform'].upper()} {DURUM_AD.get(x['durum'], x['durum'])}" for x in kayit[-2:]),
                                  DURUM_RENK.get(kayit[-1]["durum"], METIN))
            elif slot in yapildi:
                self.rozet_ayarla(lbl, "İŞLENDİ", METIN2)
            else:
                s = self.ayar["slotlar"][slot]
                self.rozet_ayarla(lbl, f"PLANLI {s['saat']}" if s["aktif"] else "ZAMANLAYICI KAPALI", MAVI if s["aktif"] else METIN3)
        # sistem durumu
        a = d.get("ajan", {})
        self.durum_ayarla(self._pano_sd["ajan"], "Çalışıyor" if canli else "Kapalı", YESIL if canli else KIRMIZI)
        self.durum_ayarla(self._pano_sd["oto"], "Kurulu" if kurulu else "Kurulu değil", YESIL if kurulu else SARI)
        tar = tarayici.tarayici_kurulu()
        self.durum_ayarla(self._pano_sd["tarayici"], ("Gömülü" if tarayici.gomulu() else "Hazır") if tar else "Yok", YESIL if tar else KIRMIZI)
        g = d.get("giris", {})
        for p in ("fb", "ig"):
            self.durum_ayarla(self._pano_sd[p], "Giriş yapılmış" if g.get(p) else "Giriş yok", YESIL if g.get(p) else KIRMIZI)
        self._pano_ajan_is.configure(text=(f"İş: {a.get('is_', '-')}  ·  Son sinyal: {a.get('son_nabiz', '-')}\n"
                                           + (f"Uykudan uyandırma: {', '.join(gorev.uyandirma_saatleri(self.ayar))}" if kurulu else
                                              "Panel kapalıyken paylaşım için otomatik başlatmayı kurun.")))
        # yaklaşan işler
        s = ajan.sonraki_isler(self.ayar, d)
        imza = tuple(s)
        if imza != self._pano_yaklasan_imza:
            self._pano_yaklasan_imza = imza
            for w in self._pano_yaklasan.winfo_children():
                w.destroy()
            if not s:
                ctk.CTkLabel(self._pano_yaklasan, text="Planlı iş yok — Zamanlayıcı sayfasından slot açın.", font=self.F(11),
                             text_color=METIN3, anchor="w").pack(fill="x")
            for i, (z, ad) in enumerate(s):
                r = ctk.CTkFrame(self._pano_yaklasan, fg_color="transparent", width=1, height=1)
                r.grid(row=i % 3, column=i // 3, sticky="ew", pady=2, padx=(0, 16))
                self._pano_yaklasan.grid_columnconfigure(i // 3, weight=1, uniform="yk")
                ctk.CTkLabel(r, text=f"{z:%H:%M}", font=self.F(12, "bold"), text_color=TURUNCU if i == 0 else METIN, width=44, anchor="w").pack(side="left")
                ctk.CTkLabel(r, text=f"{z:%d.%m}", font=self.F(10), text_color=METIN3, width=38, anchor="w").pack(side="left")
                ctk.CTkLabel(r, text=ad, font=self.F(11), text_color=METIN if i == 0 else METIN2, anchor="w").pack(side="left", fill="x", expand=True)
        # grup turu
        gt = d.get("grup_turu", {})
        if gt.get("aktif"):
            self.rozet_ayarla(self._pano_grup_rozet, "SÜRÜYOR", TURUNCU)
            self._pano_grup.configure(text=f"Tur {gt['tur_no']}: {gt['islenen']}/{gt['toplam']} grup işlendi\nSon: {gt.get('son', '')}")
            self._pano_grup_bar.set(gt["islenen"] / max(1, gt["toplam"]))
        else:
            self.rozet_ayarla(self._pano_grup_rozet, "AÇIK" if self.ayar["grup"]["aktif"] else "KAPALI",
                              TURUNCU if self.ayar["grup"]["aktif"] else METIN2)
            ozet = gt.get("ozet", {})
            self._pano_grup.configure(text=(f"Son tur {gt.get('tur_no')} · {gt.get('bitis', '')}\n" + " · ".join(f"{DURUM_AD.get(k, k)} {v}" for k, v in ozet.items())
                                            if gt else "Henüz tur yapılmadı. Turlar siz açmadan çalışmaz."))
            self._pano_grup_bar.set(0)
        # son loglar
        son = loglar[-8:][::-1]
        imza = tuple((x["zaman"], x["durum"]) for x in son)
        if imza != self._pano_tree_imza:
            self._pano_tree_imza = imza
            self._pano_tree.delete(*self._pano_tree.get_children())
            for i, x in enumerate(son):
                self._pano_tree.insert("", "end", values=self._log_satiri(x), tags=(x["durum"],) + (("serit",) if i % 2 else ()))
            if not son:
                self._pano_tree.insert("", "end", values=("", "", "Henüz kayıt yok", "", ""))

    def _dar_mi(self):
        w = self.winfo_width()
        return (w if w > 100 else 1440) < 1400

    def _slot_karti(self, parent, gun, slot, dar=False):
        renk = SLOT_RENK[slot]
        gorsel = (96 if slot == "story" else 168) if dar else (124 if slot == "story" else 220)
        sarma = 170 if dar else 230
        k = self.kart(parent)
        ust = ctk.CTkFrame(k, fg_color="transparent", width=1, height=1)
        ust.pack(fill="x", padx=16, pady=(14, 8))
        ctk.CTkLabel(ust, text=SLOT_IKON[slot], font=self.F(14, "bold"), text_color=renk, width=22).pack(side="left")
        ctk.CTkLabel(ust, text=SLOT_AD[slot], font=self.F(13 if dar else 14, "bold"), anchor="w").pack(side="left", padx=(4, 0))
        if not dar:
            self.rozet(ust, self.ayar["slotlar"][slot]["saat"], renk).pack(side="right")
        try:
            d = icerik.slot_icerik(gun, slot)
            im = self.img(d["img"], gorsel)
            ctk.CTkLabel(k, image=im, text="").pack(pady=(2, 8))
            ctk.CTkLabel(k, text=d["baslik"][:70], font=self.F(11 if dar else 12, "bold"), text_color=METIN, wraplength=sarma, justify="center").pack(padx=12)
        except Exception as e:
            ctk.CTkLabel(k, text=f"İçerik yok: {e}", text_color=KIRMIZI, wraplength=sarma).pack(pady=40)
        if not hasattr(self, "_slot_durum_lbl"):
            self._slot_durum_lbl = {}
        self._slot_durum_lbl[slot] = self.rozet(k, "", METIN2)
        self._slot_durum_lbl[slot].pack(pady=(8, 0))
        alt = ctk.CTkFrame(k, fg_color="transparent", width=1, height=1)
        alt.pack(side="bottom", fill="x", padx=16, pady=(0, 14))
        self.ayrac(k, padx=16, pady=(10, 8), side="bottom")
        fb = ctk.BooleanVar(value=True)
        ig = ctk.BooleanVar(value=True)
        self.btn(alt, "Paylaş" if dar else "Şimdi paylaş", lambda: self.paylas_simdi(gun, slot, [p for p, v in (("fb", fb), ("ig", ig)) if v.get()]),
                 height=34, width=76 if dar else 112).pack(side="right")
        self.onay(alt, "FB", fb, width=44).pack(side="left")
        self.onay(alt, "IG", ig, width=44).pack(side="left", padx=(2, 0))
        return k

    def _ajan_kur(self):
        ok, msg = gorev.kur(self.ayar)
        if ok:
            saatler = ", ".join(gorev.uyandirma_saatleri(self.ayar))
            messagebox.showinfo("Kuruldu", "Ajan Windows Görev Zamanlayıcı'ya eklendi: oturum açılışında otomatik başlar, kapanırsa 15 dk içinde yeniden başlatılır.\n"
                                f"PC uyku modundaysa {saatler} saatlerinde kendisi uyanır, paylaşır ve tekrar uyur (tamamen kapalı PC uyandırılamaz).\n\n{msg}")
        else:
            messagebox.showwarning("Kurulamadı", msg)
        if "pano" in self._sayfalar:
            self._y_pano()

    def _ajan_baslat(self):
        if ajan.ajan_canli():
            return messagebox.showinfo("Ajan", "Ajan zaten çalışıyor.")
        gorev.simdi_baslat()
        self.after(3000, self._y_pano)

    def _ajan_durdur(self):
        if messagebox.askyesno("Durdur", "Ajan durdurulsun mu? (Otomatik başlatma kuruluysa 15 dk içinde yeniden başlar; kalıcı kapatma için Ayarlar > Otomatik başlatmayı kaldır)"):
            gorev.durdur()
            self.after(2000, self._y_pano)

    # ============================================================ TAKVİM
    def _s_takvim(self):
        f = ctk.CTkFrame(self._icerik, fg_color="transparent", width=1, height=1)
        self.sayfa_basligi(f, "Takvim & İçerik", "60 günlük plan · her gün sabah kartı, ana gönderi ve story. Bir günü seçin, metinleri kopyalayın veya hemen paylaşın.")
        govde = ctk.CTkFrame(f, fg_color="transparent", width=1, height=1)
        govde.pack(fill="both", expand=True)
        sol = self.kart(govde, "60 günlük plan", width=300)
        sol.pack(side="left", fill="y", padx=(0, 14))
        sol.pack_propagate(False)
        self._takvim_liste = ctk.CTkScrollableFrame(sol, fg_color="transparent", scrollbar_button_color=KART2, scrollbar_button_hover_color=CIZGI)
        self._takvim_liste.pack(fill="both", expand=True, padx=8, pady=(0, 8))
        self._takvim_btn = {}
        bas = dt.date.fromisoformat(self.ayar["baslangic"])
        bugun_g = icerik.gun_no(self.ayar)
        self._takvim_bugun = bugun_g
        for g in range(1, icerik.SON_GUN + 1):
            t = bas + dt.timedelta(days=g - 1)
            try:
                baslik = icerik.slot_icerik(g, "ana")["baslik"]
            except Exception:
                baslik = "-"
            isaret = "●  " if g == bugun_g else "     "
            b = ctk.CTkButton(self._takvim_liste, anchor="w", height=38, corner_radius=8, fg_color="transparent", hover_color=KART2,
                              text_color=METIN if g >= bugun_g else METIN3, font=self.F(11),
                              text=f"{isaret}Gün {g:02d}   {t:%d.%m} {GUNLER[t.weekday()]}   {baslik[:18]}",
                              command=lambda gg=g: self._takvim_sec(gg))
            b.pack(fill="x", pady=1)
            self._takvim_btn[g] = b
        self._takvim_sag = ctk.CTkScrollableFrame(govde, fg_color="transparent")
        self._takvim_sag.pack(side="left", fill="both", expand=True)
        self._takvim_sec(bugun_g if 1 <= bugun_g <= icerik.SON_GUN else 1)
        return f

    def _takvim_sec(self, gun):
        for g, b in self._takvim_btn.items():
            b.configure(fg_color=ton(MAVI, 0.35) if g == gun else "transparent",
                        text_color=METIN if g == gun or g >= self._takvim_bugun else METIN3)
        for w in self._takvim_sag.winfo_children():
            w.destroy()
        bas = dt.date.fromisoformat(self.ayar["baslangic"])
        t = bas + dt.timedelta(days=gun - 1)
        ust = ctk.CTkFrame(self._takvim_sag, fg_color="transparent", width=1, height=1)
        ust.pack(fill="x", pady=(0, 6))
        ctk.CTkLabel(ust, text=f"Gün {gun}", font=self.F(22, "bold"), anchor="w").pack(side="left")
        ctk.CTkLabel(ust, text=tarih_uzun(t), font=self.F(13), text_color=METIN2, anchor="w").pack(side="left", padx=(12, 0), pady=(6, 0))
        if gun == self._takvim_bugun:
            self.rozet(ust, "BUGÜN", TURUNCU).pack(side="left", padx=12, pady=(6, 0))
        for slot in ("sabah", "ana", "story"):
            renk = SLOT_RENK[slot]
            k = self.kart(self._takvim_sag)
            k.pack(fill="x", pady=(8, 0))
            bas_s = ctk.CTkFrame(k, fg_color="transparent", width=1, height=1)
            bas_s.pack(fill="x", padx=18, pady=(14, 6))
            ctk.CTkLabel(bas_s, text=SLOT_IKON[slot], font=self.F(14, "bold"), text_color=renk, width=22).pack(side="left")
            ctk.CTkLabel(bas_s, text=SLOT_AD[slot], font=self.F(14, "bold"), anchor="w").pack(side="left", padx=(4, 0))
            self.rozet(bas_s, self.ayar["slotlar"][slot]["saat"], renk).pack(side="left", padx=10)
            ic = ctk.CTkFrame(k, fg_color="transparent", width=1, height=1)
            ic.pack(fill="x", padx=18, pady=(0, 14))
            try:
                d = icerik.slot_icerik(gun, slot)
            except Exception as e:
                ctk.CTkLabel(ic, text=str(e), text_color=KIRMIZI).pack()
                continue
            im = self.img(d["img"], 130 if slot == "story" else 220)
            solk = ctk.CTkFrame(ic, fg_color="transparent", width=1, height=1)
            solk.pack(side="left", padx=(0, 16))
            ctk.CTkLabel(solk, image=im, text="").pack()
            self.btn(solk, "Görseli aç", lambda p=d["img"]: ac_dosya(p), "ikincil", height=30, font=self.F(11, "bold")).pack(pady=(8, 0), fill="x")
            sagk = ctk.CTkFrame(ic, fg_color="transparent", width=1, height=1)
            sagk.pack(side="left", fill="both", expand=True)
            if slot != "story":
                tabs = ctk.CTkTabview(sagk, height=230, fg_color=KART2, corner_radius=12, border_width=0,
                                      segmented_button_fg_color=KART, segmented_button_selected_color=MAVI,
                                      segmented_button_selected_hover_color=MAVI_H, segmented_button_unselected_color=KART,
                                      segmented_button_unselected_hover_color=KART2, text_color=METIN)
                tabs.pack(fill="both", expand=True)
                metinler = (("Facebook", d["fb"]), ("Instagram", d["ig"]), ("Alt metin", d["alt"]))
                for ad, metin in metinler:
                    tabs.add(ad)
                    tb = ctk.CTkTextbox(tabs.tab(ad), font=self.F(12), fg_color=KART2, text_color=METIN, wrap="word",
                                        scrollbar_button_color=CIZGI)
                    tb.pack(fill="both", expand=True)
                    tb.insert("1.0", metin)
                    tb.configure(state="disabled")
                kopya = ctk.CTkFrame(sagk, fg_color="transparent", width=1, height=1)
                kopya.pack(fill="x", pady=(6, 0))
                for ad, metin in metinler:
                    self.btn(kopya, f"{ad} kopyala", lambda m=metin: self.kopyala(m), "hayalet", height=26, width=60,
                             font=self.F(10, "bold")).pack(side="left", padx=(0, 4), fill="x", expand=True)
            else:
                bilgi = ctk.CTkFrame(sagk, fg_color=KART2, corner_radius=12)
                bilgi.pack(fill="x")
                ctk.CTkLabel(bilgi, text=d["baslik"], font=self.F(13, "bold"), justify="left", anchor="w", wraplength=560).pack(fill="x", padx=14, pady=(12, 4))
                ctk.CTkLabel(bilgi, text=f"FB story linki: {d['link']}\nAlt metin: {d['alt']}", font=self.F(11), text_color=METIN2,
                             justify="left", anchor="w", wraplength=560).pack(fill="x", padx=14, pady=(0, 12))
            alt = ctk.CTkFrame(sagk, fg_color="transparent", width=1, height=1)
            alt.pack(fill="x", pady=(10, 0))
            fb, ig = ctk.BooleanVar(value=True), ctk.BooleanVar(value=True)
            sec = lambda: [p for p, v in (("fb", fb), ("ig", ig)) if v.get()]  # noqa: E731
            self.btn(alt, "Deneme", lambda s=slot, sc=sec: self.paylas_simdi(gun, s, sc(), go=False), "ikincil",
                     height=34, width=80).pack(side="right")
            self.btn(alt, "Şimdi paylaş", lambda s=slot, sc=sec: self.paylas_simdi(gun, s, sc()), height=34, width=110).pack(side="right", padx=(0, 8))
            self.onay(alt, "Facebook", fb, width=80).pack(side="left", padx=(0, 4))
            self.onay(alt, "Instagram", ig, width=80).pack(side="left", padx=4)

    # ============================================================ GRUPLAR
    def _s_gruplar(self):
        f = ctk.CTkFrame(self._icerik, fg_color="transparent", width=1, height=1)
        sag = self.sayfa_basligi(f, "Facebook Grupları", "Segment bazlı satış ilanları · turlar varsayılan KAPALI, siz açmadan hiçbir gruba paylaşım yapılmaz.")
        self._g_rozet = self.rozet(sag, "TURLAR KAPALI", METIN2)
        self._g_rozet.pack(side="left")
        g = self.ayar["grup"]
        ust = ctk.CTkFrame(f, fg_color="transparent", width=1, height=1)
        ust.pack(fill="x")
        # zamanlayıcı kartı
        zk = self.kart(ust, "Tur zamanlayıcısı", "ajan bu saatlerde tüm açık gruplara döner")
        zk.pack(side="left", fill="both", expand=True, padx=(0, 14))
        s1 = ctk.CTkFrame(zk, fg_color="transparent", width=1, height=1)
        s1.pack(fill="x", padx=18, pady=(4, 14))
        self._g_aktif = ctk.BooleanVar(value=g["aktif"])
        self._g_switch = self.anahtar(s1, self._g_switch_metin(g["aktif"]), self._g_aktif, self._grup_ayar_kaydet)
        self._g_switch.pack(anchor="w", pady=(0, 12))
        satir = ctk.CTkFrame(s1, fg_color="transparent", width=1, height=1)
        satir.pack(fill="x")
        self._g_tur_vars = []
        for i, t in enumerate(g["turlar"]):
            v = ctk.BooleanVar(value=t["aktif"])
            kutu, e = self.alan(satir, f"Tur {i + 1} saati", 74, t["saat"])
            kutu.pack(side="left", padx=(0, 10))
            self.onay(kutu, "Aktif", v, command=self._grup_ayar_kaydet, font=self.F(10)).pack(anchor="w", pady=(4, 0))
            e.bind("<FocusOut>", lambda _e: self._grup_ayar_kaydet())
            self._g_tur_vars.append((v, e))
        kutu, self._g_ara = self.alan(satir, "Gruplar arası (sn)", 90, g["ara_sn"])
        kutu.pack(side="left", padx=(0, 10))
        self._g_ara.bind("<FocusOut>", lambda _e: self._grup_ayar_kaydet())
        kutu, self._g_limit = self.alan(satir, "Tur başına en fazla", 90, g["gunluk_limit"])
        kutu.pack(side="left", padx=(0, 10))
        self._g_limit.bind("<FocusOut>", lambda _e: self._grup_ayar_kaydet())
        vk = ctk.CTkFrame(satir, fg_color="transparent", width=1, height=1)
        vk.pack(side="left")
        ctk.CTkLabel(vk, text="VARYANT", font=self.F(9, "bold"), text_color=METIN3, anchor="w").pack(anchor="w")
        self._g_var = ctk.CTkOptionMenu(vk, values=["auto", "1", "2", "3"], width=90, height=34, fg_color=KART2, button_color=CIZGI,
                                        button_hover_color=MAVI, dropdown_fg_color=KART2, font=self.F(12), command=lambda _v: self._grup_ayar_kaydet())
        self._g_var.set(g["varyant"])
        self._g_var.pack(anchor="w", pady=(2, 0))
        # işlem kartı
        ik = self.kart(ust, "Tur işlemleri", width=400)
        ik.pack(side="right", fill="y")
        ik.pack_propagate(False)
        zk.pack_forget()
        zk.pack(side="left", fill="both", expand=True, padx=(0, 14))
        s2 = ctk.CTkFrame(ik, fg_color="transparent", width=1, height=1)
        s2.pack(fill="x", padx=14, pady=(4, 14))
        self.btn(s2, "▶  Seçili gruplara tur başlat", self._grup_tur_baslat, height=36).pack(fill="x", pady=2)
        r = ctk.CTkFrame(s2, fg_color="transparent", width=1, height=1)
        r.pack(fill="x", pady=2)
        self.btn(r, "Deneme turu", lambda: self._grup_tur_baslat(go=False), "ikincil", height=34).pack(side="left", fill="x", expand=True, padx=(0, 3))
        self.btn(r, "■  Turu durdur", self._grup_dur, "tehlike", height=34).pack(side="left", fill="x", expand=True, padx=(3, 0))
        r2 = ctk.CTkFrame(s2, fg_color="transparent", width=1, height=1)
        r2.pack(fill="x", pady=2)
        self.btn(r2, "+ Grup ekle", self._grup_ekle, "ikincil", height=32, font=self.F(11, "bold")).pack(side="left", fill="x", expand=True, padx=(0, 3))
        self.btn(r2, "Segment görseli", self._grup_gorsel_ac, "ikincil", height=32, font=self.F(11, "bold")).pack(side="left", fill="x", expand=True, padx=(3, 0))
        r3 = ctk.CTkFrame(s2, fg_color="transparent", width=1, height=1)
        r3.pack(fill="x", pady=2)
        self.btn(r3, "Tümünü aç", lambda: self._grup_hepsi(True), "hayalet", height=30, width=90, font=self.F(11, "bold")).pack(side="left", fill="x", expand=True)
        self.btn(r3, "Tümünü kapat", lambda: self._grup_hepsi(False), "hayalet", height=30, width=90, font=self.F(11, "bold")).pack(side="left", fill="x", expand=True)
        self.btn(r3, "Engeli sıfırla", self._blok_sifirla, "hayalet", height=30, width=90, font=self.F(11, "bold"), text_color="#FCA5A5").pack(side="left", fill="x", expand=True)
        # tablo
        tk_ = self.kart(f, "Grup listesi")
        tk_.pack(fill="both", expand=True, pady=(14, 0))
        self._g_bilgi = ctk.CTkLabel(tk_.ust, text="", font=self.F(11), text_color=METIN2, anchor="e")
        self._g_bilgi.pack(side="right")
        self._g_segment_ozet = ctk.CTkLabel(tk_, text="", font=self.F(10), text_color=METIN3, anchor="w", justify="left", wraplength=1000)
        self._g_segment_ozet.pack(fill="x", padx=18, pady=(0, 6))
        cols = ("acik", "ad", "segment", "uye", "son", "notu")
        self._g_tree = ttk.Treeview(tk_, columns=cols, show="headings", selectmode="extended")
        for c, ad, w, st in (("acik", "Durum", 80, False), ("ad", "Grup", 400, True), ("segment", "Segment", 190, False), ("uye", "Üye", 80, False),
                             ("son", "Son paylaşım", 190, False), ("notu", "Not", 280, True)):
            self._g_tree.heading(c, text=ad, anchor="w")
            self._g_tree.column(c, width=w, anchor="w", stretch=st)
        sb = ttk.Scrollbar(tk_, orient="vertical", command=self._g_tree.yview)
        self._g_tree.configure(yscrollcommand=sb.set)
        self._g_tree.pack(side="left", fill="both", expand=True, padx=(12, 0), pady=(4, 12))
        sb.pack(side="left", fill="y", pady=(4, 12), padx=(0, 8))
        self._g_tree.bind("<Double-1>", self._grup_cift_tik)
        self._g_tree.bind("<Button-3>", self._grup_sag_tik)
        self._g_menu = tk.Menu(self, tearoff=0, bg=KART2, fg=METIN, activebackground=MAVI, activeforeground="white", bd=0)
        self._g_menu.add_command(label="Aç / kapat", command=self._grup_ac_kapat)
        seg_menu = tk.Menu(self._g_menu, tearoff=0, bg=KART2, fg=METIN, activebackground=MAVI, activeforeground="white", bd=0)
        for s in icerik.segmentler():
            seg_menu.add_command(label=icerik.SEGMENT_AD.get(s, s), command=lambda ss=s: self._grup_segment(ss))
        self._g_menu.add_cascade(label="Segment değiştir", menu=seg_menu)
        self._g_menu.add_command(label="Grubu tarayıcıda aç", command=lambda: [webbrowser.open(u) for u in self._grup_secili()])
        self._g_menu.add_command(label="Listeden sil (eklenen)", command=self._grup_sil)
        ctk.CTkLabel(f, text="Çift tık: aç/kapat  ·  Sağ tık: segment değiştir, tarayıcıda aç  ·  Segment, hangi satış görseli/metninin kullanılacağını belirler.",
                     font=self.F(10), text_color=METIN3, anchor="w").pack(fill="x", pady=(6, 0))
        self._g_son_imza = None
        return f

    def _y_gruplar(self):
        gs = icerik.gruplar(self.ayar)
        son = {}
        for x in log_oku():
            if x.get("tip") == "grup":
                son[x["url"]] = x
        imza = (len(gs), tuple(self.ayar["grup"]["kapali"]), tuple((u, x["zaman"]) for u, x in son.items()),
                tuple(g["segment"] for g in gs), self.ayar["grup"]["aktif"])
        if imza == self._g_son_imza:
            return
        self._g_son_imza = imza
        self.rozet_ayarla(self._g_rozet, "TURLAR " + ("AÇIK" if self.ayar["grup"]["aktif"] else "KAPALI"),
                          TURUNCU if self.ayar["grup"]["aktif"] else METIN2)
        secili = set(self._g_tree.selection())
        self._g_tree.delete(*self._g_tree.get_children())
        for i, g in enumerate(gs):
            s = son.get(g["url"])
            iid = self._g_tree.insert("", "end", iid=g["url"], values=(
                "●  Açık" if g["acik"] else "○  Kapalı", g["name"], g["segment_ad"], g.get("uye", ""),
                f"{DURUM_AD.get(s['durum'], s['durum'])} · {s['zaman'][5:16]}" if s else "—", (s or {}).get("notu", "")),
                tags=(s["durum"] if s else "yok", "kapali" if not g["acik"] else "acik") + (("serit",) if i % 2 else ()))
            if iid in secili:
                self._g_tree.selection_add(iid)
        for durum, renk in DURUM_RENK.items():
            self._g_tree.tag_configure(durum, foreground=renk)
        self._g_tree.tag_configure("serit", background="#111B3B")
        self._g_tree.tag_configure("kapali", foreground=METIN3)
        acik = sum(g["acik"] for g in gs)
        seg = {}
        for g in gs:
            if g["acik"]:
                seg[g["segment_ad"]] = seg.get(g["segment_ad"], 0) + 1
        self._g_bilgi.configure(text=f"{len(gs)} grup · {acik} açık")
        self._g_segment_ozet.configure(text="Segmentler:  " + "   ·   ".join(f"{k} {v}" for k, v in sorted(seg.items(), key=lambda kv: -kv[1])))

    @staticmethod
    def _g_switch_metin(aktif):
        return "Grup turları zamanlayıcıda: " + ("AÇIK" if aktif else "KAPALI")

    def _grup_ayar_kaydet(self):
        g = self.ayar["grup"]
        g["aktif"] = self._g_aktif.get()
        self._g_switch.configure(text=self._g_switch_metin(g["aktif"]))
        turlar = []
        for v, e in self._g_tur_vars:
            saat = e.get().strip()
            try:
                h, m = saat.split(":")
                saat = f"{int(h):02d}:{int(m):02d}"
            except Exception:
                saat = "09:30"
            turlar.append({"saat": saat, "aktif": v.get()})
        g["turlar"] = turlar
        try:
            g["ara_sn"] = max(60, int(self._g_ara.get()))
        except ValueError:
            pass
        try:
            g["gunluk_limit"] = max(1, int(self._g_limit.get()))
        except ValueError:
            pass
        g["varyant"] = self._g_var.get()
        self.kaydet()
        self._g_son_imza = None
        self._y_gruplar()
        if g["aktif"] and g["ara_sn"] < 120:
            messagebox.showwarning("Hız uyarısı", "Gruplar arası 120 sn'nin altı Facebook'un 'çok hızlı' engelini tetikleyebilir. 180 sn önerilir.")

    def _grup_secili(self):
        return list(self._g_tree.selection())

    def _grup_ac_kapat(self):
        kapali = set(self.ayar["grup"]["kapali"])
        for u in self._grup_secili():
            kapali.symmetric_difference_update({u})
        self.ayar["grup"]["kapali"] = sorted(kapali)
        self.kaydet()
        self._y_gruplar()

    def _grup_cift_tik(self, _e):
        self._grup_ac_kapat()

    def _grup_sag_tik(self, e):
        iid = self._g_tree.identify_row(e.y)
        if iid and iid not in self._g_tree.selection():
            self._g_tree.selection_set(iid)
        self._g_menu.tk_popup(e.x_root, e.y_root)

    def _grup_hepsi(self, ac):
        self.ayar["grup"]["kapali"] = [] if ac else [g["url"] for g in icerik.gruplar(self.ayar)]
        self.kaydet()
        self._y_gruplar()

    def _grup_segment(self, seg):
        gs = {g["url"]: g for g in icerik.gruplar(self.ayar)}
        for u in self._grup_secili():
            icerik.grup_ekle(u, gs[u]["name"], seg)
        self._y_gruplar()

    def _grup_sil(self):
        for u in self._grup_secili():
            icerik.grup_sil(u)
        self._y_gruplar()

    def _grup_ekle(self):
        url = ctk.CTkInputDialog(text="Grup URL'si (https://www.facebook.com/groups/...):", title="Grup ekle").get_input()
        if not url or "facebook.com/groups/" not in url:
            return
        ad = ctk.CTkInputDialog(text="Grup adı:", title="Grup ekle").get_input() or url
        seg = icerik.SEGMENT_AD
        secim = ctk.CTkInputDialog(text="Segment (" + ", ".join(seg) + "):", title="Grup ekle").get_input() or ""
        secim = secim.strip().lower()
        if secim not in seg:
            from segmentler import segment_of
            secim = segment_of(ad)
        icerik.grup_ekle(url, ad, secim)
        self._y_gruplar()

    def _grup_gorsel_ac(self):
        gs = {g["url"]: g for g in icerik.gruplar(self.ayar)}
        sec = self._grup_secili()
        if not sec:
            return messagebox.showinfo("Seçim", "Bir grup seçin.")
        d = durum_oku()
        key, img, text = icerik.varyant(gs[sec[0]]["segment"], d.get("tur_no", 0) + 1, self.ayar["grup"]["varyant"])
        ac_dosya(img)
        pencere = ctk.CTkToplevel(self, fg_color=BG)
        pencere.title(f"Metin · {key}")
        pencere.geometry("640x540")
        ctk.CTkLabel(pencere, text=f"Satış metni · {key}", font=self.F(15, "bold"), anchor="w").pack(fill="x", padx=16, pady=(14, 4))
        tb = ctk.CTkTextbox(pencere, wrap="word", font=self.F(12), fg_color=KART, text_color=METIN, corner_radius=12)
        tb.pack(fill="both", expand=True, padx=16, pady=(0, 8))
        tb.insert("1.0", text)
        self.btn(pencere, "Metni kopyala", lambda: self.kopyala(text), "ikincil", height=32).pack(anchor="e", padx=16, pady=(0, 14))

    def _grup_tur_baslat(self, go=True):
        sec = self._grup_secili()
        gs = [g for g in icerik.gruplar(self.ayar) if g["acik"] and (not sec or g["url"] in sec)]
        if not gs:
            return messagebox.showinfo("Grup yok", "Açık grup yok. Çift tıkla açın veya grup seçin.")
        if durum_oku().get("blok"):
            return messagebox.showwarning("Engel", "Facebook engeli kayıtlı. Önce 'Engeli sıfırla' (engelin kalktığından eminseniz).")
        sure = len(gs) * self.ayar["grup"]["ara_sn"] / 60
        if not messagebox.askyesno("Tur başlat", f"{len(gs)} gruba {'PAYLAŞIM' if go else 'DENEME (paylaşmaz)'}\n"
                                                 f"Aralık {self.ayar['grup']['ara_sn']} sn → yaklaşık {sure:.0f} dk.\n\nBaşlasın mı?"):
            return
        urls = [g["url"] for g in gs] if sec else None
        if ajan.ajan_canli():
            ajan.komut_gonder(tip="grup_turu", gruplar=urls, go=go)
            messagebox.showinfo("Gönderildi", "Tur ajana iletildi; ilerleme Pano'da görünür.")
        else:
            if not tarayici.tarayici_kurulu():
                return messagebox.showwarning("Tarayıcı", "Tarayıcı bulunamadı; Hesaplar sayfasından 'Tarayıcıyı indir' deyin.")

            def isle():
                with tarayici.ac(gizli=self.ayar["gizli_pencere"]) as ctx:
                    return ajan.grup_turu(ctx, self.ayar, urls, None, go)
            self.arka_planda(isle, lambda r: messagebox.showinfo("Tur bitti", str(r)), mesgul=True)
            messagebox.showinfo("Başladı", "Tur bu pencereden çalışıyor (ajan kapalı). Panel açık kalmalı; ilerleme Pano'da.")

    def _grup_dur(self):
        ajan.grup_turunu_durdur()
        messagebox.showinfo("Durduruluyor", "Süren grup turu bir sonraki grupta duracak.")

    def _blok_sifirla(self):
        if messagebox.askyesno("Engel", "Facebook engel kaydı silinsin mi? Yalnızca engelin gerçekten kalktığından eminseniz yapın."):
            d = durum_oku()
            d["blok"] = None
            durum_yaz(d)
            self._y_pano() if "pano" in self._sayfalar else None

    # ============================================================ ZAMANLAYICI
    def _s_zaman(self):
        f = ctk.CTkScrollableFrame(self._icerik, fg_color="transparent")
        self.sayfa_basligi(f, "Zamanlayıcı", "Ajan bu saatlerde otomatik paylaşır; PC uykudaysa Görev Zamanlayıcı uyandırır, kapalıysa açıldığında tolerans süresi içinde telafi eder.")
        govde = ctk.CTkFrame(f, fg_color="transparent", width=1, height=1)
        govde.pack(fill="x")
        govde.grid_columnconfigure(0, weight=1)
        govde.grid_columnconfigure(1, weight=0, minsize=360)
        sag = self.kart(govde, "Önümüzdeki işler", "ilk 9")
        sag.grid(row=0, column=1, sticky="nsew")
        sol = ctk.CTkFrame(govde, fg_color="transparent", width=1, height=1)
        sol.grid(row=0, column=0, sticky="nsew", padx=(0, 14))
        self._z = {}
        for slot, s in self.ayar["slotlar"].items():
            renk = SLOT_RENK.get(slot, MAVI)
            k = self.kart(sol)
            k.pack(fill="x", pady=(0, 10))
            r = ctk.CTkFrame(k, fg_color="transparent", width=1, height=1)
            r.pack(fill="x", padx=18, pady=14)
            ctk.CTkFrame(r, width=4, height=10, fg_color=renk, corner_radius=2).pack(side="left", fill="y", padx=(0, 14))
            akt = ctk.BooleanVar(value=s["aktif"])
            self.anahtar(r, "", akt, width=46).pack(side="right", padx=(12, 0))
            fb = ctk.BooleanVar(value="fb" in s["platformlar"])
            ig = ctk.BooleanVar(value="ig" in s["platformlar"])
            self.onay(r, "Instagram", ig, width=96).pack(side="right", padx=4)
            self.onay(r, "Facebook", fb, width=92).pack(side="right", padx=4)
            kutu, saat = self.alan(r, "Saat", 76, s["saat"])
            kutu.pack(side="right", padx=(0, 12))
            solk = ctk.CTkFrame(r, fg_color="transparent", width=1, height=1)
            solk.pack(side="left", fill="x", expand=True)
            ctk.CTkLabel(solk, text=f"{SLOT_IKON.get(slot, '◆')}  {s['ad']}", font=self.F(15, "bold"), anchor="w").pack(anchor="w")
            ctk.CTkLabel(solk, text="Instagram + Facebook · günde 1 kez", font=self.F(11), text_color=METIN3, anchor="w", wraplength=150, justify="left").pack(anchor="w")
            self._z[slot] = (akt, saat, fb, ig)
        k = self.kart(sol, "Genel")
        k.pack(fill="x", pady=(4, 10))
        r = ctk.CTkFrame(k, fg_color="transparent", width=1, height=1)
        r.pack(fill="x", padx=18, pady=(4, 14))
        kutu, self._z_bas = self.alan(r, "Gün 1 tarihi", 120, self.ayar["baslangic"])
        kutu.pack(side="left", padx=(0, 18))
        kutu, self._z_tol = self.alan(r, "Gecikme toleransı (dk)", 90, self.ayar["gecikme_toleransi_dk"])
        kutu.pack(side="left", padx=(0, 24))
        sec = ctk.CTkFrame(r, fg_color="transparent", width=1, height=1)
        sec.pack(side="left", pady=(4, 0))
        self._z_dongu = ctk.BooleanVar(value=self.ayar["dongu"])
        self.onay(sec, "60 gün bitince başa dön", self._z_dongu).pack(anchor="w", pady=(0, 6))
        self._z_gizli = ctk.BooleanVar(value=self.ayar["gizli_pencere"])
        self.onay(sec, "Paylaşırken tarayıcı penceresini gizle", self._z_gizli).pack(anchor="w")
        self.btn(sol, "Ayarları kaydet", self._zaman_kaydet, width=180, height=40, font=self.F(13, "bold")).pack(anchor="w", pady=(4, 12))
        self._z_onizleme = ctk.CTkFrame(sag, fg_color="transparent", width=1, height=1)
        self._z_onizleme.pack(fill="both", expand=True, padx=18, pady=(4, 14))
        self._zaman_onizle()
        return f

    def _zaman_kaydet(self):
        for slot, (akt, saat, fb, ig) in self._z.items():
            try:
                h, m = saat.get().strip().split(":")
                st = f"{int(h):02d}:{int(m):02d}"
            except Exception:
                return messagebox.showerror("Saat", f"{slot}: saat 'SS:DD' biçiminde olmalı")
            self.ayar["slotlar"][slot].update(aktif=akt.get(), saat=st, platformlar=[p for p, v in (("fb", fb), ("ig", ig)) if v.get()])
        try:
            dt.date.fromisoformat(self._z_bas.get().strip())
            self.ayar["baslangic"] = self._z_bas.get().strip()
            self.ayar["gecikme_toleransi_dk"] = max(5, int(self._z_tol.get()))
        except Exception as e:
            return messagebox.showerror("Değer", str(e))
        self.ayar["dongu"] = self._z_dongu.get()
        self.ayar["gizli_pencere"] = self._z_gizli.get()
        self.kaydet()
        self._zaman_onizle()
        self._sayfalar.pop("takvim", None)
        if "pano" in self._sayfalar:
            self._pano_slot_widgets = None
        messagebox.showinfo("Kaydedildi", "Zamanlayıcı ayarları kaydedildi; ajan 20 sn içinde yeni ayarları kullanır.")

    def _zaman_onizle(self):
        for w in self._z_onizleme.winfo_children():
            w.destroy()
        s = ajan.sonraki_isler(self.ayar, durum_oku(), adet=9)
        if not s:
            ctk.CTkLabel(self._z_onizleme, text="Planlı iş yok", font=self.F(11), text_color=METIN3, anchor="w").pack(fill="x")
        for i, (z, ad) in enumerate(s):
            r = ctk.CTkFrame(self._z_onizleme, fg_color="transparent", width=1, height=1)
            r.pack(fill="x", pady=3)
            ctk.CTkLabel(r, text=f"{z:%H:%M}", font=self.F(13, "bold"), text_color=TURUNCU if i == 0 else METIN, width=48, anchor="w").pack(side="left")
            ctk.CTkLabel(r, text=f"{GUNLER[z.weekday()]} {z:%d.%m}", font=self.F(10), text_color=METIN3, width=64, anchor="w").pack(side="left")
            ctk.CTkLabel(r, text=ad, font=self.F(11), text_color=METIN2, anchor="w", wraplength=190, justify="left").pack(side="left", fill="x", expand=True)

    # ============================================================ LOGLAR
    def _s_log(self):
        f = ctk.CTkFrame(self._icerik, fg_color="transparent", width=1, height=1)
        sag = self.sayfa_basligi(f, "Loglar & Kanıt", "Her paylaşımın zamanı, hedefi, sonucu ve gönderi linki / ekran görüntüsü.")
        self._l_rozet = {}
        for durum in ("OK", "PENDING", "FAIL"):
            r = self.rozet(sag, f"{DURUM_AD[durum]} 0", DURUM_RENK[durum])
            r.pack(side="left", padx=3)
            self._l_rozet[durum] = r
        ust = ctk.CTkFrame(f, fg_color="transparent", width=1, height=1)
        ust.pack(fill="x", pady=(0, 12))
        self._l_filtre = ctk.CTkSegmentedButton(ust, values=["Hepsi", "Sosyal", "Grup", "Sorunlu"], selected_color=MAVI, selected_hover_color=MAVI_H,
                                                unselected_color=KART, unselected_hover_color=KART2, fg_color=KART, font=self.F(12, "bold"),
                                                height=36, corner_radius=10, command=lambda _v: self._y_log(True))
        self._l_filtre.set("Hepsi")
        self._l_filtre.pack(side="left")
        self.btn(ust, "Ekran görüntüsünü aç", self._log_ekran, "ikincil").pack(side="right", padx=4)
        self.btn(ust, "Gönderiyi aç", self._log_url, "mavi").pack(side="right", padx=4)
        self.btn(ust, "Ekran klasörü", lambda: ac_dosya(SHOTS), "hayalet").pack(side="right", padx=4)
        self.btn(ust, "Ajan günlüğü", lambda: ac_dosya(VERI / "ajan.log"), "hayalet").pack(side="right", padx=4)
        k = self.kart(f)
        k.pack(fill="both", expand=True)
        self._l_tree = self._log_tablosu(k)
        sb = ttk.Scrollbar(k, orient="vertical", command=self._l_tree.yview)
        self._l_tree.configure(yscrollcommand=sb.set)
        self._l_tree.pack(side="left", fill="both", expand=True, padx=(12, 0), pady=12)
        sb.pack(side="left", fill="y", pady=12, padx=(0, 8))
        self._l_tree.bind("<Double-1>", lambda _e: self._log_url())
        self._l_kayit = {}
        self._l_son = None
        return f

    def _y_log(self, zorla=False):
        d = log_oku()
        imza = (len(d), self._l_filtre.get())
        if imza == self._l_son and not zorla:
            return
        self._l_son = imza
        for durum, r in self._l_rozet.items():
            self.rozet_ayarla(r, f"{DURUM_AD[durum]} {sum(x['durum'] == durum for x in d)}", DURUM_RENK[durum])
        flt = self._l_filtre.get()
        self._l_tree.delete(*self._l_tree.get_children())
        self._l_kayit = {}
        n = 0
        for i, x in enumerate(reversed(d[-1500:])):
            grup = x.get("tip") == "grup"
            if flt == "Sosyal" and grup or flt == "Grup" and not grup or flt == "Sorunlu" and x["durum"] not in ("FAIL", "BLOK", "PENDING"):
                continue
            iid = self._l_tree.insert("", "end", iid=str(i), values=self._log_satiri(x), tags=(x["durum"],) + (("serit",) if n % 2 else ()))
            self._l_kayit[iid] = x
            n += 1
        if not n:
            self._l_tree.insert("", "end", values=("", "", "Bu filtrede kayıt yok", "", ""))

    def _log_secili(self):
        s = self._l_tree.selection()
        return self._l_kayit.get(s[0]) if s else None

    def _log_url(self):
        x = self._log_secili()
        if not x:
            return
        u = x.get("url", "")
        if u.startswith("http"):
            webbrowser.open(u)
        else:
            self._log_ekran()

    def _log_ekran(self):
        x = self._log_secili()
        if x and x.get("ekran") and (SHOTS / x["ekran"]).exists():
            ac_dosya(SHOTS / x["ekran"])
        elif x:
            messagebox.showinfo("Ekran", "Bu kayıt için ekran görüntüsü yok.")

    # ============================================================ HESAPLAR
    def _s_hesap(self):
        f = ctk.CTkScrollableFrame(self._icerik, fg_color="transparent")
        self.sayfa_basligi(f, "Hesaplar & Kurulum", "Chrome, Opera vb. kurmanız GEREKMEZ: uygulama kendi tarayıcısıyla gelir. Facebook ve Instagram'a bir kez kendiniz giriş yaparsınız; oturum bu PC'de saklanır.")
        govde = ctk.CTkFrame(f, fg_color="transparent", width=1, height=1)
        govde.pack(fill="x")
        govde.grid_columnconfigure(0, weight=1)
        govde.grid_columnconfigure(1, weight=0, minsize=340)
        sag = ctk.CTkFrame(govde, fg_color="transparent", width=1, height=1)
        sag.grid(row=0, column=1, sticky="nsew")
        sol = ctk.CTkFrame(govde, fg_color="transparent", width=1, height=1)
        sol.grid(row=0, column=0, sticky="nsew", padx=(0, 14))
        # kahraman kart
        k0 = ctk.CTkFrame(sol, fg_color=NAVY, corner_radius=18, border_width=1, border_color="#1E3A8A")
        k0.pack(fill="x", pady=(0, 14))
        ic = ctk.CTkFrame(k0, fg_color="transparent", width=1, height=1)
        ic.pack(fill="x", padx=24, pady=22)
        self.rozet(ic, "TEK TIKLA KURULUM", TURUNCU).pack(anchor="w")
        ctk.CTkLabel(ic, text="3 adımda hazır", font=self.F(24, "bold"), anchor="w").pack(anchor="w", pady=(10, 4))
        for i, (b, a) in enumerate((("Facebook ve Instagram sekmeleri açılır", "kendi kullanıcı adı/şifrenizle giriş yapın (gerekirse SMS/2FA)"),
                                    ("Pencereyi kapatın", "girişler otomatik doğrulanır, oturum bu PC'de saklanır"),
                                    ("Otomatik başlatma kurulur", "panel kapalıyken de paylaşım, PC uykudaysa uyandırma")), 1):
            r = ctk.CTkFrame(ic, fg_color="transparent", width=1, height=1)
            r.pack(fill="x", pady=4)
            ctk.CTkLabel(r, text=str(i), font=self.F(12, "bold"), text_color="white", fg_color=TURUNCU, corner_radius=999, width=26, height=26).pack(side="left", anchor="n")
            m = ctk.CTkFrame(r, fg_color="transparent", width=1, height=1)
            m.pack(side="left", fill="x", expand=True, padx=(12, 0))
            ctk.CTkLabel(m, text=b, font=self.F(13, "bold"), anchor="w").pack(anchor="w")
            ctk.CTkLabel(m, text=a, font=self.F(12), text_color=METIN2, anchor="w", justify="left", wraplength=520).pack(anchor="w")
        self.btn(ic, "KURULUMU BAŞLAT", self._hizli_kurulum, height=50, width=240, font=self.F(15, "bold"), corner_radius=12).pack(anchor="w", pady=(18, 0))
        # tarayıcı + giriş
        k = self.kart(sol, "Tarayıcı")
        k.pack(fill="x", pady=(0, 14))
        r = ctk.CTkFrame(k, fg_color="transparent", width=1, height=1)
        r.pack(fill="x", padx=18, pady=(0, 14))
        self._h_tar = ctk.CTkLabel(r, text="", font=self.F(12), justify="left", anchor="w")
        self._h_tar.pack(side="left")
        self._h_tar_btn = self.btn(r, "Tarayıcıyı indir", self._tarayici_kur)
        self._h_cikti = ctk.CTkTextbox(k, height=90, font=("Consolas", 10), fg_color=KART2, corner_radius=10)
        k2 = self.kart(sol, "Giriş (tek tek)", "gerekirse hesapları ayrı ayrı bağlayın")
        k2.pack(fill="x", pady=(0, 14))
        r2 = ctk.CTkFrame(k2, fg_color="transparent", width=1, height=1)
        r2.pack(fill="x", padx=18, pady=(0, 10))
        self.btn(r2, "Facebook'a giriş yap", lambda: self._giris("fb"), "mavi").pack(side="left", padx=(0, 6))
        self.btn(r2, "Instagram'a giriş yap", lambda: self._giris("ig"), "mavi").pack(side="left", padx=6)
        self.btn(r2, "Durumu kontrol et", self._giris_kontrol, "ikincil").pack(side="left", padx=6)
        ctk.CTkLabel(k2, text="Giriş penceresi açılır → kullanıcı adı/şifre ile girin (gerekirse SMS/2FA) → pencereyi kapatın. Facebook'ta Yamansa Rulman Sayfası'nı yöneten hesapla girin.",
                     font=self.F(11), text_color=METIN3, anchor="w", wraplength=760, justify="left").pack(fill="x", padx=18, pady=(0, 14))
        # sağ sütun: durum + hesap bilgileri
        dk = self.kart(sag, "Kurulum durumu")
        dk.pack(fill="x", pady=(0, 14))
        self._h_sd = {ad: self.durum_satiri(dk, etiket) for ad, etiket in (
            ("tarayici", "Tarayıcı"), ("fb", "Facebook oturumu"), ("ig", "Instagram oturumu"), ("oto", "Otomatik başlatma"))}
        self._h_giris = ctk.CTkLabel(dk, text="", font=self.F(10), text_color=METIN3, anchor="w", wraplength=290, justify="left")
        self._h_giris.pack(fill="x", padx=18, pady=(8, 14))
        bk = self.kart(sag, "Hesap bilgileri")
        bk.pack(fill="x")
        for etiket, deger in (("Facebook Sayfası", "facebook.com/yamansarulman"), ("Instagram", "@yamansarulman"),
                              ("WhatsApp", "0552 610 93 63"), ("Web", "yamansarulman.com"), ("E-posta", "info@yamansa.com.tr")):
            r = ctk.CTkFrame(bk, fg_color="transparent", width=1, height=1)
            r.pack(fill="x", padx=18, pady=3)
            ctk.CTkLabel(r, text=etiket, font=self.F(11), text_color=METIN3, anchor="w").pack(side="left")
            ctk.CTkLabel(r, text=deger, font=self.F(11, "bold"), anchor="e").pack(side="right")
        ctk.CTkFrame(bk, fg_color="transparent", height=10).pack()
        self._y_hesap()
        return f

    def _y_hesap(self):
        if tarayici.gomulu():
            self._h_tar.configure(text="Hazır ✔  Uygulamayla birlikte geldi, kurulum gerekmez.", text_color=YESIL)
            self._h_tar_btn.pack_forget()
            self._h_cikti.pack_forget()
            self.durum_ayarla(self._h_sd["tarayici"], "Gömülü · hazır", YESIL)
        elif tarayici.tarayici_kurulu():
            self._h_tar.configure(text=f"Hazır ✔  ({tarayici.TARAYICILAR})", text_color=YESIL)
            self._h_tar_btn.pack_forget()
            self._h_cikti.pack_forget()
            self.durum_ayarla(self._h_sd["tarayici"], "Hazır", YESIL)
        else:
            self._h_tar.configure(text="Tarayıcı bulunamadı – 'Tarayıcıyı indir' deyin (bir kez, internet gerekir)", text_color=KIRMIZI)
            self._h_tar_btn.pack(side="right")
            self._h_cikti.pack(fill="x", padx=18, pady=(0, 14))
            self.durum_ayarla(self._h_sd["tarayici"], "Yok", KIRMIZI)
        g = durum_oku().get("giris")
        for p in ("fb", "ig"):
            var = bool(g and g.get(p))
            self.durum_ayarla(self._h_sd[p], "Giriş yapılmış" if var else ("Giriş yok" if g else "Kontrol edilmedi"), YESIL if var else (KIRMIZI if g else METIN3))
        kurulu = gorev.kurulu()
        self.durum_ayarla(self._h_sd["oto"], "Kurulu" if kurulu else "Kurulu değil", YESIL if kurulu else SARI)
        self._h_giris.configure(text=f"Son kontrol: {g.get('zaman', '')}" if g else "Girişler henüz kontrol edilmedi — KURULUMU BAŞLAT ile başlayın.")

    def _tarayici_kur(self):
        self._h_cikti.delete("1.0", "end")

        def yaz(s):
            self.after(0, lambda: (self._h_cikti.insert("end", s + "\n"), self._h_cikti.see("end")))
        self.arka_planda(lambda: tarayici.tarayici_kur(yaz), lambda ok: (yaz("Tamamlandı ✔" if ok else "HATA: indirme başarısız (internet/antivirüs?)"), self._y_hesap()))

    def _giris_hazir(self):
        if not tarayici.tarayici_kurulu():
            messagebox.showwarning("Tarayıcı", "Tarayıcı bulunamadı; bu sayfadaki 'Tarayıcıyı indir' düğmesine basın.")
            return False
        if ajan.ajan_canli() and "bekliyor" not in durum_oku().get("ajan", {}).get("is_", "bekliyor"):
            messagebox.showwarning("Ajan meşgul", "Ajan şu an paylaşım yapıyor; bitince tekrar deneyin.")
            return False
        return True

    def _giris(self, site):
        if not self._giris_hazir():
            return
        messagebox.showinfo("Giriş", "Tarayıcı penceresi açılıyor. Giriş yapın, sonra pencereyi KAPATIN; durum otomatik kontrol edilir.")
        self.arka_planda(lambda: (tarayici.giris_penceresi(site), self._giris_kontrol_ic())[1], lambda _r: self._y_hesap(), mesgul=True)

    def _hizli_kurulum(self):
        if not self._giris_hazir():
            return
        messagebox.showinfo("Hızlı kurulum", "Tarayıcı penceresi açılıyor: 1. sekme Facebook, 2. sekme Instagram.\n\n"
                            "İkisine de giriş yapın (gerekirse SMS/2FA), sonra pencereyi KAPATIN. Gerisi otomatik.")

        def isle():
            tarayici.giris_penceresi(("fb", "ig"))
            return self._giris_kontrol_ic()

        def bitti(g):
            self._y_hesap()
            eksik = [ad for k, ad in (("fb", "Facebook"), ("ig", "Instagram")) if not g.get(k)]
            if eksik:
                return messagebox.showwarning("Giriş eksik", f"{' ve '.join(eksik)} girişi görülmedi. 'KURULUMU BAŞLAT' ile tekrar deneyin "
                                              "(pencereyi giriş tamamlandıktan sonra kapatın).")
            ok, msg = gorev.kur(self.ayar)
            self._y_hesap()
            if "pano" in self._sayfalar:
                self._y_pano()
            if ok:
                saatler = ", ".join(gorev.uyandirma_saatleri(self.ayar))
                messagebox.showinfo("Kurulum tamamlandı ✔", "Facebook ve Instagram girişleri tamam, otomatik başlatma kuruldu.\n\n"
                                    f"Paylaşımlar panel kapalıyken de {saatler} saatlerinde atılır; PC uykudaysa uyandırılır. "
                                    "Artık paneli kapatabilirsiniz.")
            else:
                messagebox.showwarning("Girişler tamam, otomatik başlatma kurulamadı",
                                       f"{msg}\n\nPano sayfasından 'Otomatik başlatmayı kur' ile tekrar deneyin.")
        self.arka_planda(isle, bitti, mesgul=True)

    def _giris_kontrol_ic(self):
        with tarayici.ac(gizli=True) as ctx:
            g = tarayici.giris_kontrol(ctx)
        d = durum_oku()
        d["giris"] = dict(g, zaman=dt.datetime.now().strftime("%Y-%m-%d %H:%M:%S"))
        durum_yaz(d)
        return g

    def _giris_kontrol(self):
        if not self._giris_hazir():
            return
        self.arka_planda(self._giris_kontrol_ic, lambda _r: self._y_hesap(), mesgul=True)

    # ============================================================ AYARLAR
    def _s_ayar(self):
        f = ctk.CTkScrollableFrame(self._icerik, fg_color="transparent")
        self.sayfa_basligi(f, "Ayarlar", "Güvenlik, otomatik başlatma ve veri yönetimi.")
        k = self.kart(f, "Güvenlik")
        k.pack(fill="x", pady=(0, 12))
        self._a_blok = ctk.BooleanVar(value=self.ayar["bildirim"]["blokta_dur"])
        self.onay(k, "Facebook engeli görülürse grup turlarını otomatik kapat (önerilir)", self._a_blok,
                  command=lambda: (self.ayar["bildirim"].__setitem__("blokta_dur", self._a_blok.get()), self.kaydet())).pack(anchor="w", padx=18, pady=(0, 14))
        k2 = self.kart(f, "Otomatik başlatma", "Windows Görev Zamanlayıcı")
        k2.pack(fill="x", pady=(0, 12))
        r = ctk.CTkFrame(k2, fg_color="transparent", width=1, height=1)
        r.pack(fill="x", padx=18, pady=(0, 8))
        self.btn(r, "Kur", self._ajan_kur, width=110).pack(side="left", padx=(0, 6))
        self.btn(r, "Kaldır", lambda: (gorev.kaldir(), messagebox.showinfo("Kaldırıldı", "Otomatik başlatma kaldırıldı.")), "tehlike", width=110).pack(side="left", padx=6)
        ctk.CTkLabel(k2, text=f"Komut: {gorev.ajan_komutu()}", font=("Consolas", 10), text_color=METIN3, anchor="w", wraplength=900, justify="left").pack(fill="x", padx=18, pady=(0, 14))
        k3 = self.kart(f, "Veri ve yedek")
        k3.pack(fill="x", pady=(0, 12))
        r3 = ctk.CTkFrame(k3, fg_color="transparent", width=1, height=1)
        r3.pack(fill="x", padx=18, pady=(0, 8))
        self.btn(r3, "Veri klasörünü aç", lambda: ac_dosya(VERI), "ikincil").pack(side="left", padx=(0, 6))
        self.btn(r3, "Bugünün 'yapıldı' işaretlerini sıfırla", self._yapildi_sifirla, "hayalet").pack(side="left", padx=6)
        ctk.CTkLabel(k3, text="'Yapıldı' sıfırlanırsa ajan bugünün slotlarını (saati geçmiş ve tolerans içindeyse) yeniden atar – çift paylaşım riski!",
                     font=self.F(11), text_color=METIN3, anchor="w").pack(fill="x", padx=18, pady=(0, 14))
        k4 = self.kart(f, "Hakkında")
        k4.pack(fill="x", pady=(0, 12))
        ctk.CTkLabel(k4, text=f"Yamansa Rulman Sosyal Medya Paneli {SURUM} · 60 günlük içerik (sabah kartı, ana gönderi, story) + 9 segment × 3 varyant grup ilanı.\n"
                              "Paylaşımlar kendi PC'nizden, kendi hesabınızla yapılır; hiçbir şifre uygulamada saklanmaz (tarayıcı profili dışında).",
                     font=self.F(11), text_color=METIN2, anchor="w", justify="left", wraplength=900).pack(fill="x", padx=18, pady=(0, 14))
        return f

    def _yapildi_sifirla(self):
        if messagebox.askyesno("Sıfırla", "Bugünün 'yapıldı' işaretleri silinsin mi?"):
            d = durum_oku()
            d.get("yapildi", {}).pop(dt.date.today().isoformat(), None)
            durum_yaz(d)


def calistir():
    app = Uygulama()
    app.mainloop()
