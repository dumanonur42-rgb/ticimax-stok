"""Yamansa Sosyal Medya Paneli – masaüstü arayüz (CustomTkinter)."""
import datetime as dt
import os
import subprocess
import sys
import threading
import tkinter as tk
import webbrowser
from tkinter import messagebox, ttk

import customtkinter as ctk
from PIL import Image

import ajan
import gorev
import icerik
import tarayici
from ayarlar import ayar_oku, ayar_yaz, durum_oku, durum_yaz, log_oku
from yollar import KOK, SHOTS, VERI

ctk.set_appearance_mode("dark")
NAVY, MID, MAVI, TURUNCU, MIST, STEEL = "#011B54", "#070F2B", "#1E5BD6", "#FF6A00", "#F2F4F8", "#B8C0CC"
KART = "#0F1A3D"
DURUM_RENK = {"OK": "#2ECC71", "PENDING": "#F1C40F", "FAIL": "#E74C3C", "BLOK": "#FF3B3B", "DRY": STEEL}
SLOT_AD = {"sabah": "Sabah kartı 09:00", "ana": "Ana gönderi 12:30", "story": "Story 18:30"}
GUNLER = ["Pzt", "Sal", "Çar", "Per", "Cum", "Cmt", "Paz"]


def ac_dosya(p):
    p = str(p)
    if os.name == "nt":
        os.startfile(p)  # noqa
    elif sys.platform == "darwin":
        subprocess.Popen(["open", p])
    else:
        subprocess.Popen(["xdg-open", p])


def kucult(path, w):
    try:
        im = Image.open(path)
        h = int(im.height * w / im.width)
        return ctk.CTkImage(light_image=im, dark_image=im, size=(w, h))
    except Exception:
        return None


class Uygulama(ctk.CTk):
    def __init__(self):
        super().__init__()
        self.title("Yamansa Rulman · Sosyal Medya Paneli")
        self.geometry("1380x860")
        self.minsize(1150, 720)
        self.configure(fg_color=MID)
        self.ayar = ayar_oku()
        self._img_cache = {}
        self._sayfalar = {}
        self._aktif = None
        self.font_b = ctk.CTkFont("Segoe UI", 20, "bold")
        self.font_m = ctk.CTkFont("Segoe UI", 13)
        self.font_k = ctk.CTkFont("Segoe UI", 11)
        self._ttk_stil()
        self._kenar()
        self._govde()
        self._durum_cubugu()
        g = durum_oku().get("giris", {})
        self.sayfa("pano" if g.get("fb") and g.get("ig") else "hesap")
        self.after(1000, self._yenile)

    # ------------------------------------------------------------ iskelet
    def _ttk_stil(self):
        s = ttk.Style(self)
        s.theme_use("clam")
        s.configure("Treeview", background=KART, fieldbackground=KART, foreground=MIST, rowheight=26, borderwidth=0,
                    font=("Segoe UI", 10))
        s.configure("Treeview.Heading", background=NAVY, foreground=MIST, font=("Segoe UI", 10, "bold"), relief="flat")
        s.map("Treeview", background=[("selected", MAVI)])

    def _kenar(self):
        k = ctk.CTkFrame(self, width=210, corner_radius=0, fg_color=NAVY)
        k.pack(side="left", fill="y")
        logo = kucult(KOK / "logo_yamansa.png", 160)
        ctk.CTkLabel(k, image=logo, text="" if logo else "YAMANSA", font=self.font_b).pack(pady=(24, 4))
        ctk.CTkLabel(k, text="Sosyal Medya Paneli", font=self.font_k, text_color=STEEL).pack(pady=(0, 18))
        self._menu = {}
        for key, ad in [("pano", "◉  Pano"), ("takvim", "▦  Takvim & İçerik"), ("gruplar", "♟  Facebook Grupları"),
                        ("zaman", "◷  Zamanlayıcı"), ("log", "≡  Loglar & Kanıt"), ("hesap", "⚿  Hesaplar"),
                        ("ayar", "⚙  Ayarlar")]:
            b = ctk.CTkButton(k, text=ad, anchor="w", height=40, corner_radius=8, fg_color="transparent",
                              hover_color=KART, font=self.font_m, command=lambda kk=key: self.sayfa(kk))
            b.pack(fill="x", padx=12, pady=3)
            self._menu[key] = b
        ctk.CTkLabel(k, text=f"Veri: {VERI}", font=("Segoe UI", 9), text_color=STEEL, wraplength=180,
                     justify="left").pack(side="bottom", pady=12, padx=12)

    def _govde(self):
        self._icerik = ctk.CTkFrame(self, fg_color="transparent")
        self._icerik.pack(side="top", fill="both", expand=True, padx=16, pady=(14, 0))

    def _durum_cubugu(self):
        c = ctk.CTkFrame(self, height=34, corner_radius=0, fg_color=NAVY)
        c.pack(side="bottom", fill="x")
        self._sb_ajan = ctk.CTkLabel(c, text="", font=self.font_k)
        self._sb_ajan.pack(side="left", padx=14)
        self._sb_sonraki = ctk.CTkLabel(c, text="", font=self.font_k, text_color=STEEL)
        self._sb_sonraki.pack(side="left", padx=14)
        self._sb_saat = ctk.CTkLabel(c, text="", font=self.font_k, text_color=STEEL)
        self._sb_saat.pack(side="right", padx=14)

    def sayfa(self, key):
        for f in self._sayfalar.values():
            f.pack_forget()
        for kk, b in self._menu.items():
            b.configure(fg_color=KART if kk == key else "transparent")
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
                                    text_color="#2ECC71" if canli else "#E74C3C")
            s = ajan.sonraki_isler(self.ayar, d, adet=1)
            self._sb_sonraki.configure(text=f"Sıradaki: {s[0][0]:%d.%m %H:%M} · {s[0][1]}" if s else "Sıradaki iş yok")
            self._sb_saat.configure(text=dt.datetime.now().strftime("%d.%m.%Y %H:%M"))
            if self._aktif in ("pano", "log", "gruplar"):
                getattr(self, f"_y_{self._aktif}")()
        except Exception as e:
            print("yenile:", e)
        self.after(5000, self._yenile)

    # ------------------------------------------------------------ yardımcılar
    def kart(self, parent, baslik=None, **kw):
        f = ctk.CTkFrame(parent, fg_color=KART, corner_radius=12, **kw)
        if baslik:
            ctk.CTkLabel(f, text=baslik, font=ctk.CTkFont("Segoe UI", 14, "bold"), anchor="w").pack(fill="x", padx=14, pady=(10, 4))
        return f

    def img(self, path, w):
        k = (str(path), w)
        if k not in self._img_cache:
            self._img_cache[k] = kucult(path, w)
        return self._img_cache[k]

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
        ad = SLOT_AD[slot]
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

    # ============================================================ PANO
    def _s_pano(self):
        f = ctk.CTkScrollableFrame(self._icerik, fg_color="transparent")
        self._pano_ust = ctk.CTkFrame(f, fg_color="transparent")
        self._pano_ust.pack(fill="x")
        self._pano_blok = ctk.CTkLabel(f, text="", font=ctk.CTkFont("Segoe UI", 13, "bold"), text_color="white",
                                       fg_color="#B3261E", corner_radius=8, height=36)
        satir = ctk.CTkFrame(f, fg_color="transparent")
        satir.pack(fill="x", pady=(10, 0))
        self._pano_slotlar = ctk.CTkFrame(satir, fg_color="transparent")
        self._pano_slotlar.pack(side="left", fill="both", expand=True)
        sag = ctk.CTkFrame(satir, fg_color="transparent", width=360)
        sag.pack(side="left", fill="y", padx=(12, 0))
        # ajan kartı
        ak = self.kart(sag, "Arka plan ajanı")
        ak.pack(fill="x", pady=(0, 10))
        self._pano_ajan = ctk.CTkLabel(ak, text="", font=self.font_m, justify="left", anchor="w", wraplength=320)
        self._pano_ajan.pack(fill="x", padx=14)
        bs = ctk.CTkFrame(ak, fg_color="transparent")
        bs.pack(fill="x", padx=10, pady=8)
        ctk.CTkButton(bs, text="Otomatik başlatmayı kur", fg_color=TURUNCU, hover_color="#d95a00", width=170,
                      command=self._ajan_kur).pack(side="left", padx=4)
        ctk.CTkButton(bs, text="Şimdi başlat", width=100, command=self._ajan_baslat).pack(side="left", padx=4)
        ctk.CTkButton(bs, text="Durdur", width=70, fg_color="#5a2020", hover_color="#7a2a2a", command=self._ajan_durdur).pack(side="left", padx=4)
        # yaklaşan
        yk = self.kart(sag, "Yaklaşan işler")
        yk.pack(fill="x", pady=(0, 10))
        self._pano_yaklasan = ctk.CTkLabel(yk, text="", font=self.font_k, justify="left", anchor="w")
        self._pano_yaklasan.pack(fill="x", padx=14, pady=(0, 10))
        # grup turu
        gk = self.kart(sag, "Grup turu")
        gk.pack(fill="x")
        self._pano_grup = ctk.CTkLabel(gk, text="", font=self.font_k, justify="left", anchor="w", wraplength=320)
        self._pano_grup.pack(fill="x", padx=14)
        self._pano_grup_bar = ctk.CTkProgressBar(gk, progress_color=TURUNCU)
        self._pano_grup_bar.pack(fill="x", padx=14, pady=(4, 10))
        self._pano_grup_bar.set(0)
        # son loglar
        lk = self.kart(f, "Son paylaşımlar")
        lk.pack(fill="x", pady=(12, 0))
        self._pano_log = ctk.CTkLabel(lk, text="", font=("Consolas", 11), justify="left", anchor="w")
        self._pano_log.pack(fill="x", padx=14, pady=(0, 10))
        self._pano_slot_widgets = None
        return f

    def _y_pano(self):
        d = durum_oku()
        gun = icerik.gun_no(self.ayar)
        bugun = dt.date.today()
        for w in self._pano_ust.winfo_children():
            w.destroy()
        ctk.CTkLabel(self._pano_ust, text=f"Bugün · {bugun:%d.%m.%Y} {GUNLER[bugun.weekday()]} · İçerik günü {gun}/{icerik.SON_GUN}",
                     font=self.font_b, anchor="w").pack(side="left")
        blok = d.get("blok")
        if blok:
            self._pano_blok.configure(text=f"⚠  Facebook engeli görüldü ({blok['zaman']}): {blok['neden']}  – grup turları kapatıldı. Engeli sıfırlamak için Gruplar sayfasına bakın.")
            self._pano_blok.pack(fill="x", pady=(8, 0), before=self._pano_slotlar.master)
        else:
            self._pano_blok.pack_forget()
        # slot kartları (günde 1 kez kur)
        if self._pano_slot_widgets != gun:
            self._pano_slot_widgets = gun
            for w in self._pano_slotlar.winfo_children():
                w.destroy()
            for slot in ("sabah", "ana", "story"):
                self._slot_karti(self._pano_slotlar, gun, slot).pack(side="left", fill="both", expand=True, padx=(0, 10))
        yapildi = d.get("yapildi", {}).get(bugun.isoformat(), {})
        for slot, lbl in self._slot_durum_lbl.items():
            kayit = [x for x in log_oku() if x.get("tip") == "slot" and x.get("gun") == gun and x.get("slot") == slot and x["zaman"][:10] == bugun.isoformat()]
            if kayit:
                lbl.configure(text="  ".join(f"{x['platform'].upper()}: {x['durum']}" for x in kayit[-2:]),
                              text_color=DURUM_RENK.get(kayit[-1]["durum"], MIST))
            elif slot in yapildi:
                lbl.configure(text="İşlendi (log yok)", text_color=STEEL)
            else:
                s = self.ayar["slotlar"][slot]
                lbl.configure(text=f"Planlı {s['saat']}" if s["aktif"] else "Zamanlayıcı kapalı", text_color=STEEL)
        # ajan
        canli = ajan.ajan_canli()
        a = d.get("ajan", {})
        self._pano_ajan.configure(
            text=(f"Durum: {'ÇALIŞIYOR' if canli else 'KAPALI'}\nİş: {a.get('is_', '-')}\nSon sinyal: {a.get('son_nabiz', '-')}\n"
                  f"Otomatik başlatma (Windows): {'kurulu · uykudan uyandırma ' + ', '.join(gorev.uyandirma_saatleri(self.ayar)) if gorev.kurulu() else 'kurulu değil'}"),
            text_color="#2ECC71" if canli else "#E74C3C")
        s = ajan.sonraki_isler(self.ayar, d)
        self._pano_yaklasan.configure(text="\n".join(f"{z:%d.%m %H:%M}  {ad}" for z, ad in s) or "Planlı iş yok (Zamanlayıcı sayfasından açın)")
        gt = d.get("grup_turu", {})
        if gt.get("aktif"):
            self._pano_grup.configure(text=f"Tur {gt['tur_no']} sürüyor: {gt['islenen']}/{gt['toplam']}\nSon: {gt.get('son', '')}")
            self._pano_grup_bar.set(gt["islenen"] / max(1, gt["toplam"]))
        else:
            self._pano_grup.configure(text=(f"Son tur {gt.get('tur_no')}: {gt.get('ozet', {})} · {gt.get('bitis', '')}" if gt else "Henüz tur yapılmadı")
                                      + f"\nGrup turları: {'AÇIK' if self.ayar['grup']['aktif'] else 'KAPALI'}")
            self._pano_grup_bar.set(0)
        son = log_oku()[-8:][::-1]
        self._pano_log.configure(text="\n".join(
            f"{x['zaman'][5:16]}  {x['durum']:7}  " + (f"{x['slot']:6} g{x['gun']:02d} {x['platform'].upper():2}  {x.get('url', '')[:60]}" if x.get("tip") == "slot"
                                                    else f"GRUP {x.get('grup', '')[:40]}  {x.get('notu', '')}") for x in son) or "Kayıt yok")

    def _slot_karti(self, parent, gun, slot):
        k = self.kart(parent, SLOT_AD[slot])
        try:
            d = icerik.slot_icerik(gun, slot)
            im = self.img(d["img"], 150 if slot == "story" else 230)
            ctk.CTkLabel(k, image=im, text="").pack(pady=4)
            ctk.CTkLabel(k, text=d["baslik"][:60], font=self.font_k, wraplength=230).pack()
        except Exception as e:
            ctk.CTkLabel(k, text=f"İçerik yok: {e}", text_color="#E74C3C", wraplength=230).pack(pady=20)
        if not hasattr(self, "_slot_durum_lbl"):
            self._slot_durum_lbl = {}
        self._slot_durum_lbl[slot] = ctk.CTkLabel(k, text="", font=ctk.CTkFont("Segoe UI", 12, "bold"))
        self._slot_durum_lbl[slot].pack(pady=(4, 2))
        alt = ctk.CTkFrame(k, fg_color="transparent")
        alt.pack(pady=(2, 10))
        fb = ctk.BooleanVar(value=True)
        ig = ctk.BooleanVar(value=True)
        ctk.CTkCheckBox(alt, text="FB", variable=fb, width=50).pack(side="left", padx=4)
        ctk.CTkCheckBox(alt, text="IG", variable=ig, width=50).pack(side="left", padx=4)
        ctk.CTkButton(alt, text="Şimdi paylaş", width=110, fg_color=TURUNCU, hover_color="#d95a00",
                      command=lambda: self.paylas_simdi(gun, slot, [p for p, v in (("fb", fb), ("ig", ig)) if v.get()])).pack(side="left", padx=4)
        return k

    def _ajan_kur(self):
        ok, msg = gorev.kur(self.ayar)
        if ok:
            saatler = ", ".join(gorev.uyandirma_saatleri(self.ayar))
            messagebox.showinfo("Kuruldu", "Ajan Windows Görev Zamanlayıcı'ya eklendi: oturum açılışında otomatik başlar, kapanırsa 15 dk içinde yeniden başlatılır.\n"
                                f"PC uyku modundaysa {saatler} saatlerinde kendisi uyanır, paylaşır ve tekrar uyur (tamamen kapalı PC uyandırılamaz).\n\n{msg}")
        else:
            messagebox.showwarning("Kurulamadı", msg)
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
        f = ctk.CTkFrame(self._icerik, fg_color="transparent")
        sol = self.kart(f, "60 günlük plan", width=330)
        sol.pack(side="left", fill="y", padx=(0, 12))
        sol.pack_propagate(False)
        self._takvim_liste = ctk.CTkScrollableFrame(sol, fg_color="transparent")
        self._takvim_liste.pack(fill="both", expand=True, padx=6, pady=6)
        self._takvim_btn = {}
        bas = dt.date.fromisoformat(self.ayar["baslangic"])
        bugun_g = icerik.gun_no(self.ayar)
        for g in range(1, icerik.SON_GUN + 1):
            t = bas + dt.timedelta(days=g - 1)
            try:
                baslik = icerik.slot_icerik(g, "ana")["baslik"]
            except Exception:
                baslik = "-"
            b = ctk.CTkButton(self._takvim_liste, anchor="w", height=34, corner_radius=6,
                              fg_color=MAVI if g == bugun_g else "transparent", hover_color=NAVY, font=self.font_k,
                              text=f"Gün {g:02d} · {t:%d.%m} {GUNLER[t.weekday()]} · {baslik[:26]}",
                              command=lambda gg=g: self._takvim_sec(gg))
            b.pack(fill="x", pady=1)
            self._takvim_btn[g] = b
        self._takvim_sag = ctk.CTkScrollableFrame(f, fg_color="transparent")
        self._takvim_sag.pack(side="left", fill="both", expand=True)
        self._takvim_sec(bugun_g if 1 <= bugun_g <= icerik.SON_GUN else 1)
        return f

    def _takvim_sec(self, gun):
        for w in self._takvim_sag.winfo_children():
            w.destroy()
        bas = dt.date.fromisoformat(self.ayar["baslangic"])
        t = bas + dt.timedelta(days=gun - 1)
        ctk.CTkLabel(self._takvim_sag, text=f"Gün {gun} · {t:%d %B %Y}", font=self.font_b, anchor="w").pack(fill="x")
        for slot in ("sabah", "ana", "story"):
            k = self.kart(self._takvim_sag, SLOT_AD[slot])
            k.pack(fill="x", pady=(8, 0))
            ic = ctk.CTkFrame(k, fg_color="transparent")
            ic.pack(fill="x", padx=10, pady=(0, 10))
            try:
                d = icerik.slot_icerik(gun, slot)
            except Exception as e:
                ctk.CTkLabel(ic, text=str(e), text_color="#E74C3C").pack()
                continue
            im = self.img(d["img"], 160 if slot == "story" else 260)
            solk = ctk.CTkFrame(ic, fg_color="transparent")
            solk.pack(side="left", padx=(0, 12))
            ctk.CTkLabel(solk, image=im, text="").pack()
            ctk.CTkButton(solk, text="Görseli aç", width=110, fg_color="transparent", border_width=1, border_color=STEEL,
                          command=lambda p=d["img"]: ac_dosya(p)).pack(pady=4)
            sagk = ctk.CTkFrame(ic, fg_color="transparent")
            sagk.pack(side="left", fill="both", expand=True)
            if slot != "story":
                tabs = ctk.CTkTabview(sagk, height=230, fg_color=MID, segmented_button_selected_color=MAVI)
                tabs.pack(fill="both", expand=True)
                for ad, metin in (("Facebook", d["fb"]), ("Instagram", d["ig"]), ("Alt metin", d["alt"])):
                    tabs.add(ad)
                    tb = ctk.CTkTextbox(tabs.tab(ad), font=self.font_k, fg_color=MID, wrap="word")
                    tb.pack(fill="both", expand=True)
                    tb.insert("1.0", metin)
                    tb.configure(state="disabled")
            else:
                ctk.CTkLabel(sagk, text=f"{d['baslik']}\n\nFB story linki: {d['link']}\nAlt: {d['alt']}", font=self.font_k,
                             justify="left", anchor="w", wraplength=560).pack(fill="x", pady=8)
            alt = ctk.CTkFrame(sagk, fg_color="transparent")
            alt.pack(fill="x", pady=(6, 0))
            fb, ig = ctk.BooleanVar(value=True), ctk.BooleanVar(value=True)
            ctk.CTkCheckBox(alt, text="Facebook", variable=fb, width=90).pack(side="left", padx=4)
            ctk.CTkCheckBox(alt, text="Instagram", variable=ig, width=90).pack(side="left", padx=4)
            sec = lambda: [p for p, v in (("fb", fb), ("ig", ig)) if v.get()]  # noqa: E731
            ctk.CTkButton(alt, text="Şimdi paylaş", width=120, fg_color=TURUNCU, hover_color="#d95a00",
                          command=lambda s=slot, sc=sec: self.paylas_simdi(gun, s, sc())).pack(side="left", padx=4)
            ctk.CTkButton(alt, text="Deneme (paylaşmadan)", width=150, fg_color="transparent", border_width=1, border_color=STEEL,
                          command=lambda s=slot, sc=sec: self.paylas_simdi(gun, s, sc(), go=False)).pack(side="left", padx=4)

    # ============================================================ GRUPLAR
    def _s_gruplar(self):
        f = ctk.CTkFrame(self._icerik, fg_color="transparent")
        ust = self.kart(f)
        ust.pack(fill="x")
        s1 = ctk.CTkFrame(ust, fg_color="transparent")
        s1.pack(fill="x", padx=12, pady=8)
        g = self.ayar["grup"]
        self._g_aktif = ctk.BooleanVar(value=g["aktif"])
        self._g_switch = ctk.CTkSwitch(s1, text=self._g_switch_metin(g["aktif"]), variable=self._g_aktif, progress_color=TURUNCU,
                                       font=ctk.CTkFont("Segoe UI", 13, "bold"), command=self._grup_ayar_kaydet)
        self._g_switch.pack(side="left", padx=(0, 20))
        self._g_tur_vars = []
        for i, t in enumerate(g["turlar"]):
            v = ctk.BooleanVar(value=t["aktif"])
            e = ctk.CTkEntry(s1, width=60, font=self.font_k)
            e.insert(0, t["saat"])
            ctk.CTkCheckBox(s1, text=f"Tur {i + 1}", variable=v, width=70, command=self._grup_ayar_kaydet).pack(side="left")
            e.pack(side="left", padx=(0, 14))
            e.bind("<FocusOut>", lambda _e: self._grup_ayar_kaydet())
            self._g_tur_vars.append((v, e))
        ctk.CTkLabel(s1, text="Gruplar arası (sn)", font=self.font_k).pack(side="left")
        self._g_ara = ctk.CTkEntry(s1, width=60, font=self.font_k)
        self._g_ara.insert(0, str(g["ara_sn"]))
        self._g_ara.pack(side="left", padx=(4, 14))
        self._g_ara.bind("<FocusOut>", lambda _e: self._grup_ayar_kaydet())
        ctk.CTkLabel(s1, text="Tur başına en fazla", font=self.font_k).pack(side="left")
        self._g_limit = ctk.CTkEntry(s1, width=50, font=self.font_k)
        self._g_limit.insert(0, str(g["gunluk_limit"]))
        self._g_limit.pack(side="left", padx=(4, 14))
        self._g_limit.bind("<FocusOut>", lambda _e: self._grup_ayar_kaydet())
        ctk.CTkLabel(s1, text="Varyant", font=self.font_k).pack(side="left")
        self._g_var = ctk.CTkOptionMenu(s1, values=["auto", "1", "2", "3"], width=80, fg_color=NAVY, command=lambda _v: self._grup_ayar_kaydet())
        self._g_var.set(g["varyant"])
        self._g_var.pack(side="left", padx=4)
        s2 = ctk.CTkFrame(ust, fg_color="transparent")
        s2.pack(fill="x", padx=12, pady=(0, 10))
        ctk.CTkButton(s2, text="▶ Seçili gruplara tur başlat", fg_color=TURUNCU, hover_color="#d95a00", command=self._grup_tur_baslat).pack(side="left", padx=(0, 6))
        ctk.CTkButton(s2, text="▶ Deneme turu (paylaşmaz)", fg_color="transparent", border_width=1, border_color=STEEL,
                      command=lambda: self._grup_tur_baslat(go=False)).pack(side="left", padx=6)
        ctk.CTkButton(s2, text="■ Turu durdur", fg_color="#5a2020", hover_color="#7a2a2a", command=self._grup_dur).pack(side="left", padx=6)
        ctk.CTkButton(s2, text="+ Grup ekle", command=self._grup_ekle).pack(side="left", padx=6)
        ctk.CTkButton(s2, text="Segment görselini aç", command=self._grup_gorsel_ac).pack(side="left", padx=6)
        ctk.CTkButton(s2, text="Tümünü aç", width=90, command=lambda: self._grup_hepsi(True)).pack(side="left", padx=6)
        ctk.CTkButton(s2, text="Tümünü kapat", width=100, command=lambda: self._grup_hepsi(False)).pack(side="left", padx=6)
        s3 = ctk.CTkFrame(ust, fg_color="transparent")
        s3.pack(fill="x", padx=14, pady=(0, 8))
        self._g_bilgi = ctk.CTkLabel(s3, text="", font=self.font_k, text_color=STEEL, anchor="w")
        self._g_bilgi.pack(side="left", fill="x", expand=True)
        ctk.CTkButton(s3, text="Engel kaydını sıfırla", width=150, height=24, font=self.font_k, fg_color="transparent",
                      border_width=1, border_color=STEEL, command=self._blok_sifirla).pack(side="right")
        # tablo
        tk_ = self.kart(f)
        tk_.pack(fill="both", expand=True, pady=(10, 0))
        cols = ("acik", "ad", "segment", "uye", "son", "notu")
        self._g_tree = ttk.Treeview(tk_, columns=cols, show="headings", selectmode="extended")
        for c, ad, w in (("acik", "Açık", 50), ("ad", "Grup", 420), ("segment", "Segment", 170), ("uye", "Üye", 70),
                         ("son", "Son durum", 180), ("notu", "Not", 300)):
            self._g_tree.heading(c, text=ad)
            self._g_tree.column(c, width=w, anchor="w" if c in ("ad", "notu") else "center")
        sb = ttk.Scrollbar(tk_, orient="vertical", command=self._g_tree.yview)
        self._g_tree.configure(yscrollcommand=sb.set)
        self._g_tree.pack(side="left", fill="both", expand=True, padx=(8, 0), pady=8)
        sb.pack(side="left", fill="y", pady=8)
        self._g_tree.bind("<Double-1>", self._grup_cift_tik)
        self._g_tree.bind("<Button-3>", self._grup_sag_tik)
        self._g_menu = tk.Menu(self, tearoff=0, bg=KART, fg=MIST)
        self._g_menu.add_command(label="Aç / kapat", command=self._grup_ac_kapat)
        seg_menu = tk.Menu(self._g_menu, tearoff=0, bg=KART, fg=MIST)
        for s in icerik.segmentler():
            seg_menu.add_command(label=icerik.SEGMENT_AD.get(s, s), command=lambda ss=s: self._grup_segment(ss))
        self._g_menu.add_cascade(label="Segment değiştir", menu=seg_menu)
        self._g_menu.add_command(label="Grubu tarayıcıda aç", command=lambda: [webbrowser.open(u) for u in self._grup_secili()])
        self._g_menu.add_command(label="Listeden sil (eklenen)", command=self._grup_sil)
        ctk.CTkLabel(f, text="Çift tık: aç/kapat · Sağ tık: segment değiştir, tarayıcıda aç · Segment → hangi satış görseli/metni kullanılacağını belirler.",
                     font=self.font_k, text_color=STEEL, anchor="w").pack(fill="x", pady=(4, 0))
        self._g_son_imza = None
        return f

    def _y_gruplar(self):
        gs = icerik.gruplar(self.ayar)
        son = {}
        for x in log_oku():
            if x.get("tip") == "grup":
                son[x["url"]] = x
        imza = (len(gs), tuple(self.ayar["grup"]["kapali"]), tuple((u, x["zaman"]) for u, x in son.items()),
                tuple(g["segment"] for g in gs))
        if imza == self._g_son_imza:
            return
        self._g_son_imza = imza
        secili = set(self._g_tree.selection())
        self._g_tree.delete(*self._g_tree.get_children())
        for g in gs:
            s = son.get(g["url"])
            iid = self._g_tree.insert("", "end", iid=g["url"], values=(
                "✔" if g["acik"] else "—", g["name"], g["segment_ad"], g.get("uye", ""),
                f"{s['durum']} · {s['zaman'][5:16]}" if s else "-", (s or {}).get("notu", "")),
                tags=(s["durum"] if s else "yok", "kapali" if not g["acik"] else "acik"))
            if iid in secili:
                self._g_tree.selection_add(iid)
        for durum, renk in DURUM_RENK.items():
            self._g_tree.tag_configure(durum, foreground=renk)
        self._g_tree.tag_configure("kapali", foreground="#6c7383")
        acik = sum(g["acik"] for g in gs)
        seg = {}
        for g in gs:
            if g["acik"]:
                seg[g["segment_ad"]] = seg.get(g["segment_ad"], 0) + 1
        self._g_bilgi.configure(text=f"{len(gs)} grup · {acik} açık · " + " · ".join(f"{k} {v}" for k, v in sorted(seg.items(), key=lambda kv: -kv[1])))

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
        pencere = ctk.CTkToplevel(self)
        pencere.title(f"Metin · {key}")
        pencere.geometry("620x520")
        tb = ctk.CTkTextbox(pencere, wrap="word", font=self.font_m)
        tb.pack(fill="both", expand=True, padx=10, pady=10)
        tb.insert("1.0", text)

    def _grup_tur_baslat(self, go=True):
        sec = self._grup_secili()
        gs = [g for g in icerik.gruplar(self.ayar) if g["acik"] and (not sec or g["url"] in sec)]
        if not gs:
            return messagebox.showinfo("Grup yok", "Açık (✔) grup yok. Çift tıkla açın veya grup seçin.")
        if durum_oku().get("blok"):
            return messagebox.showwarning("Engel", "Facebook engeli kayıtlı. Önce 'Engel kaydını sıfırla' (engelin kalktığından eminseniz).")
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
        ctk.CTkLabel(f, text="Günlük paylaşım slotları (Instagram + Facebook)", font=self.font_b, anchor="w").pack(fill="x")
        ctk.CTkLabel(f, text="Ajan bu saatlerde otomatik paylaşır; PC uykudaysa Görev Zamanlayıcı uyandırır, kapalıysa açıldığında tolerans süresi içinde telafi eder.",
                     font=self.font_k, text_color=STEEL, anchor="w").pack(fill="x", pady=(0, 8))
        self._z = {}
        for slot, s in self.ayar["slotlar"].items():
            k = self.kart(f)
            k.pack(fill="x", pady=4)
            r = ctk.CTkFrame(k, fg_color="transparent")
            r.pack(fill="x", padx=12, pady=10)
            akt = ctk.BooleanVar(value=s["aktif"])
            ctk.CTkSwitch(r, text=s["ad"], variable=akt, progress_color=TURUNCU, font=ctk.CTkFont("Segoe UI", 13, "bold"), width=200).pack(side="left")
            ctk.CTkLabel(r, text="Saat", font=self.font_k).pack(side="left", padx=(20, 4))
            saat = ctk.CTkEntry(r, width=70, font=self.font_m)
            saat.insert(0, s["saat"])
            saat.pack(side="left")
            fb = ctk.BooleanVar(value="fb" in s["platformlar"])
            ig = ctk.BooleanVar(value="ig" in s["platformlar"])
            ctk.CTkCheckBox(r, text="Facebook", variable=fb).pack(side="left", padx=(24, 8))
            ctk.CTkCheckBox(r, text="Instagram", variable=ig).pack(side="left")
            self._z[slot] = (akt, saat, fb, ig)
        k = self.kart(f, "Genel")
        k.pack(fill="x", pady=(12, 4))
        r = ctk.CTkFrame(k, fg_color="transparent")
        r.pack(fill="x", padx=12, pady=(0, 10))
        ctk.CTkLabel(r, text="Gün 1 tarihi", font=self.font_k).pack(side="left")
        self._z_bas = ctk.CTkEntry(r, width=110, font=self.font_m)
        self._z_bas.insert(0, self.ayar["baslangic"])
        self._z_bas.pack(side="left", padx=(6, 20))
        self._z_dongu = ctk.BooleanVar(value=self.ayar["dongu"])
        ctk.CTkCheckBox(r, text="60 gün bitince başa dön", variable=self._z_dongu).pack(side="left", padx=(0, 20))
        ctk.CTkLabel(r, text="Gecikme toleransı (dk)", font=self.font_k).pack(side="left")
        self._z_tol = ctk.CTkEntry(r, width=60, font=self.font_m)
        self._z_tol.insert(0, str(self.ayar["gecikme_toleransi_dk"]))
        self._z_tol.pack(side="left", padx=6)
        self._z_gizli = ctk.BooleanVar(value=self.ayar["gizli_pencere"])
        ctk.CTkCheckBox(r, text="Paylaşırken tarayıcı penceresini gizle", variable=self._z_gizli).pack(side="left", padx=(20, 0))
        ctk.CTkButton(f, text="Kaydet", fg_color=TURUNCU, hover_color="#d95a00", width=160, height=38, command=self._zaman_kaydet).pack(anchor="w", pady=12)
        self._z_onizleme = ctk.CTkLabel(f, text="", font=("Consolas", 11), justify="left", anchor="w", text_color=STEEL)
        self._z_onizleme.pack(fill="x")
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
        messagebox.showinfo("Kaydedildi", "Zamanlayıcı ayarları kaydedildi; ajan 20 sn içinde yeni ayarları kullanır.")

    def _zaman_onizle(self):
        s = ajan.sonraki_isler(self.ayar, durum_oku(), adet=9)
        self._z_onizleme.configure(text="Önümüzdeki işler:\n" + "\n".join(f"  {z:%a %d.%m %H:%M}  {ad}" for z, ad in s))

    # ============================================================ LOGLAR
    def _s_log(self):
        f = ctk.CTkFrame(self._icerik, fg_color="transparent")
        ust = ctk.CTkFrame(f, fg_color="transparent")
        ust.pack(fill="x", pady=(0, 8))
        ctk.CTkLabel(ust, text="Paylaşım kayıtları", font=self.font_b).pack(side="left")
        self._l_filtre = ctk.CTkSegmentedButton(ust, values=["Hepsi", "Sosyal", "Grup", "Sorunlu"], selected_color=MAVI, command=lambda _v: self._y_log(True))
        self._l_filtre.set("Hepsi")
        self._l_filtre.pack(side="left", padx=20)
        ctk.CTkButton(ust, text="Ekran görüntüsünü aç", command=self._log_ekran).pack(side="right", padx=4)
        ctk.CTkButton(ust, text="Gönderiyi aç", command=self._log_url).pack(side="right", padx=4)
        ctk.CTkButton(ust, text="Ekran klasörü", fg_color="transparent", border_width=1, border_color=STEEL, command=lambda: ac_dosya(SHOTS)).pack(side="right", padx=4)
        ctk.CTkButton(ust, text="Ajan günlüğü", fg_color="transparent", border_width=1, border_color=STEEL, command=lambda: ac_dosya(VERI / "ajan.log")).pack(side="right", padx=4)
        k = self.kart(f)
        k.pack(fill="both", expand=True)
        cols = ("zaman", "tip", "hedef", "durum", "notu")
        self._l_tree = ttk.Treeview(k, columns=cols, show="headings")
        for c, ad, w in (("zaman", "Zaman", 140), ("tip", "Tür", 110), ("hedef", "Hedef", 380), ("durum", "Durum", 90), ("notu", "Link / Not", 480)):
            self._l_tree.heading(c, text=ad)
            self._l_tree.column(c, width=w, anchor="w")
        sb = ttk.Scrollbar(k, orient="vertical", command=self._l_tree.yview)
        self._l_tree.configure(yscrollcommand=sb.set)
        self._l_tree.pack(side="left", fill="both", expand=True, padx=(8, 0), pady=8)
        sb.pack(side="left", fill="y", pady=8)
        self._l_tree.bind("<Double-1>", lambda _e: self._log_url())
        for durum, renk in DURUM_RENK.items():
            self._l_tree.tag_configure(durum, foreground=renk)
        self._l_kayit = {}
        self._l_son = None
        return f

    def _y_log(self, zorla=False):
        d = log_oku()
        imza = (len(d), self._l_filtre.get())
        if imza == self._l_son and not zorla:
            return
        self._l_son = imza
        flt = self._l_filtre.get()
        self._l_tree.delete(*self._l_tree.get_children())
        self._l_kayit = {}
        for i, x in enumerate(reversed(d[-1500:])):
            grup = x.get("tip") == "grup"
            if flt == "Sosyal" and grup or flt == "Grup" and not grup or flt == "Sorunlu" and x["durum"] not in ("FAIL", "BLOK", "PENDING"):
                continue
            hedef = x.get("grup", "")[:60] if grup else f"Gün {x.get('gun', '?'):02d} · {x.get('slot', '')} · {x.get('platform', '').upper()}"
            tip = f"Grup · {icerik.SEGMENT_AD.get(x.get('segment'), '')}" if grup else "Sosyal"
            iid = self._l_tree.insert("", "end", iid=str(i), values=(x["zaman"], tip, hedef, x["durum"], x.get("url") or x.get("notu", "")), tags=(x["durum"],))
            self._l_kayit[iid] = x

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
        ctk.CTkLabel(f, text="Hesaplar ve kurulum", font=self.font_b, anchor="w").pack(fill="x")
        ctk.CTkLabel(f, text="Chrome, Opera vb. kurmanız GEREKMEZ: uygulama kendi tarayıcısıyla gelir. Facebook ve Instagram'a bir kez kendiniz giriş yaparsınız; oturum bu PC'de saklanır.",
                     font=self.font_k, text_color=STEEL, anchor="w", wraplength=900, justify="left").pack(fill="x", pady=(0, 10))
        k0 = self.kart(f, "Hızlı kurulum (tek tık)")
        k0.pack(fill="x", pady=4)
        r0 = ctk.CTkFrame(k0, fg_color="transparent")
        r0.pack(fill="x", padx=12, pady=(0, 10))
        ctk.CTkLabel(r0, text="Facebook + Instagram sekmeleri açılır → ikisine de giriş yapın → pencereyi kapatın.\nGirişler doğrulanır ve otomatik başlatma (panel kapalıyken paylaşım, uykudan uyandırma) kendiliğinden kurulur.",
                     font=self.font_m, justify="left", anchor="w").pack(side="left")
        ctk.CTkButton(r0, text="KURULUMU BAŞLAT", fg_color=TURUNCU, hover_color="#d95a00", height=44, width=190,
                      font=ctk.CTkFont("Segoe UI", 14, "bold"), command=self._hizli_kurulum).pack(side="right", padx=4)
        k = self.kart(f, "Tarayıcı")
        k.pack(fill="x", pady=4)
        r = ctk.CTkFrame(k, fg_color="transparent")
        r.pack(fill="x", padx=12, pady=(0, 10))
        self._h_tar = ctk.CTkLabel(r, text="", font=self.font_m, justify="left", anchor="w")
        self._h_tar.pack(side="left")
        self._h_tar_btn = ctk.CTkButton(r, text="Tarayıcıyı indir", fg_color=TURUNCU, hover_color="#d95a00", command=self._tarayici_kur)
        self._h_cikti = ctk.CTkTextbox(k, height=90, font=("Consolas", 10), fg_color=MID)
        k2 = self.kart(f, "Giriş (tek tek)")
        k2.pack(fill="x", pady=4)
        r2 = ctk.CTkFrame(k2, fg_color="transparent")
        r2.pack(fill="x", padx=12, pady=(0, 10))
        self._h_giris = ctk.CTkLabel(r2, text="", font=self.font_m, justify="left", anchor="w")
        self._h_giris.pack(side="left")
        ctk.CTkButton(r2, text="Facebook'a giriş yap", command=lambda: self._giris("fb")).pack(side="right", padx=4)
        ctk.CTkButton(r2, text="Instagram'a giriş yap", command=lambda: self._giris("ig")).pack(side="right", padx=4)
        ctk.CTkButton(r2, text="Durumu kontrol et", fg_color="transparent", border_width=1, border_color=STEEL, command=self._giris_kontrol).pack(side="right", padx=4)
        ctk.CTkLabel(k2, text="Giriş penceresi açılır → kullanıcı adı/şifre ile girin (gerekirse SMS/2FA) → pencereyi kapatın. Facebook'ta Yamansa Rulman Sayfası'nı yöneten hesapla girin.",
                     font=self.font_k, text_color=STEEL, anchor="w", wraplength=900, justify="left").pack(fill="x", padx=14, pady=(0, 10))
        k3 = self.kart(f, "Hesap bilgileri")
        k3.pack(fill="x", pady=4)
        ctk.CTkLabel(k3, text="Facebook Sayfası: https://www.facebook.com/yamansarulman/\nInstagram: @yamansarulman\nWhatsApp: 0552 610 93 63 · Web: yamansarulman.com · E-posta: info@yamansa.com.tr",
                     font=self.font_k, anchor="w", justify="left").pack(fill="x", padx=14, pady=(0, 10))
        self._y_hesap()
        return f

    def _y_hesap(self):
        if tarayici.gomulu():
            self._h_tar.configure(text="Hazır ✔  (uygulamayla birlikte geldi, kurulum gerekmez)", text_color="#2ECC71")
            self._h_tar_btn.pack_forget()
            self._h_cikti.pack_forget()
        elif tarayici.tarayici_kurulu():
            self._h_tar.configure(text=f"Hazır ✔  ({tarayici.TARAYICILAR})", text_color="#2ECC71")
            self._h_tar_btn.pack_forget()
            self._h_cikti.pack_forget()
        else:
            self._h_tar.configure(text="Tarayıcı bulunamadı – 'Tarayıcıyı indir' deyin (bir kez, internet gerekir)", text_color="#E74C3C")
            self._h_tar_btn.pack(side="right")
            self._h_cikti.pack(fill="x", padx=12, pady=(0, 10))
        g = durum_oku().get("giris")
        if g:
            self._h_giris.configure(text=f"Facebook: {'giriş yapılmış ✔' if g.get('fb') else 'giriş yok ✖'}    Instagram: {'giriş yapılmış ✔' if g.get('ig') else 'giriş yok ✖'}    (kontrol: {g.get('zaman', '')})")
        else:
            self._h_giris.configure(text="Henüz kontrol edilmedi")

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
        ctk.CTkLabel(f, text="Ayarlar", font=self.font_b, anchor="w").pack(fill="x")
        k = self.kart(f, "Güvenlik")
        k.pack(fill="x", pady=6)
        self._a_blok = ctk.BooleanVar(value=self.ayar["bildirim"]["blokta_dur"])
        ctk.CTkCheckBox(k, text="Facebook engeli görülürse grup turlarını otomatik kapat (önerilir)", variable=self._a_blok,
                        command=lambda: (self.ayar["bildirim"].__setitem__("blokta_dur", self._a_blok.get()), self.kaydet())).pack(anchor="w", padx=14, pady=(0, 10))
        k2 = self.kart(f, "Otomatik başlatma (Windows Görev Zamanlayıcı)")
        k2.pack(fill="x", pady=6)
        r = ctk.CTkFrame(k2, fg_color="transparent")
        r.pack(fill="x", padx=12, pady=(0, 10))
        ctk.CTkButton(r, text="Kur", fg_color=TURUNCU, hover_color="#d95a00", command=self._ajan_kur).pack(side="left", padx=4)
        ctk.CTkButton(r, text="Kaldır", fg_color="#5a2020", hover_color="#7a2a2a", command=lambda: (gorev.kaldir(), messagebox.showinfo("Kaldırıldı", "Otomatik başlatma kaldırıldı."))).pack(side="left", padx=4)
        ctk.CTkLabel(r, text=f"Komut: {gorev.ajan_komutu()}", font=("Consolas", 10), text_color=STEEL).pack(side="left", padx=12)
        k3 = self.kart(f, "Veri ve yedek")
        k3.pack(fill="x", pady=6)
        r3 = ctk.CTkFrame(k3, fg_color="transparent")
        r3.pack(fill="x", padx=12, pady=(0, 10))
        ctk.CTkButton(r3, text="Veri klasörünü aç", command=lambda: ac_dosya(VERI)).pack(side="left", padx=4)
        ctk.CTkButton(r3, text="Bugünün 'yapıldı' işaretlerini sıfırla", fg_color="transparent", border_width=1, border_color=STEEL, command=self._yapildi_sifirla).pack(side="left", padx=4)
        ctk.CTkLabel(k3, text="'Yapıldı' sıfırlanırsa ajan bugünün slotlarını (saati geçmiş ve tolerans içindeyse) yeniden atar – çift paylaşım riski!",
                     font=self.font_k, text_color=STEEL, anchor="w").pack(fill="x", padx=14, pady=(0, 10))
        k4 = self.kart(f, "Hakkında")
        k4.pack(fill="x", pady=6)
        ctk.CTkLabel(k4, text="Yamansa Rulman Sosyal Medya Paneli · 60 günlük içerik (sabah kartı, ana gönderi, story) + 9 segment × 3 varyant grup ilanı.\n"
                              "Paylaşımlar kendi PC'nizden, kendi hesabınızla yapılır; hiçbir şifre uygulamada saklanmaz (tarayıcı profili dışında).",
                     font=self.font_k, anchor="w", justify="left", wraplength=900).pack(fill="x", padx=14, pady=(0, 10))
        return f

    def _yapildi_sifirla(self):
        if messagebox.askyesno("Sıfırla", "Bugünün 'yapıldı' işaretleri silinsin mi?"):
            d = durum_oku()
            d.get("yapildi", {}).pop(dt.date.today().isoformat(), None)
            durum_yaz(d)


def calistir():
    app = Uygulama()
    app.mainloop()
