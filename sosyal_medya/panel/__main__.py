"""Yamansa Sosyal Medya Paneli.

  python -m panel            -> masaüstü panel
  python -m panel --ajan     -> arka plan ajanı (zamanlayıcı)
  python -m panel --ajan-tek -> vadesi gelen işleri bir kez çalıştır ve çık
  python -m panel --uyandir  -> Görev Zamanlayıcı uyandırma görevi: ajanı başlat/PC'yi iş bitene dek uyanık tut
  python -m panel --dogrula  -> paket bütünlük kontrolü (CI); sonucu dogrula.txt'ye yazar
  python -m panel --durdur   -> kurulum güncellemesi öncesi: çalışan ajanı kapat (görevler kalır)
  python -m panel --kaldir   -> kaldırıcı kancası: ajanı durdur, zamanlanmış görevleri sil
"""
import os
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import yollar  # noqa: E402,F401  (sys.path'e sosyal_medya/, otomasyon/, grup_paylasim/ ekler)

for _akis in (sys.stdout, sys.stderr):  # konsol kod sayfası Türkçe karakteri yazamasa da log satırı düşmesin
    if _akis is not None and hasattr(_akis, "reconfigure"):
        _akis.reconfigure(errors="replace")


def dogrula():
    """İçerik/görsel/sürücü çözümlemesini test eder; pencereli exe'de stdout olmadığı için dosyaya yazar."""
    import traceback
    rapor = open("dogrula.txt", "w", encoding="utf-8")
    hata = False

    def yaz(s):
        rapor.write(s + "\n")
        rapor.flush()

    def kontrol(ad, fn):
        nonlocal hata
        yaz(f"...  {ad}")
        try:
            yaz(f"OK   {ad}: {fn()}")
        except Exception:  # noqa: BLE001
            hata = True
            yaz(f"HATA {ad}:\n{traceback.format_exc()}")

    yaz(f"frozen={getattr(sys, 'frozen', False)} kok={yollar.KOK} veri={yollar.VERI}")

    def _kodlama():
        import locale
        # Windows ANSI kod sayfaları (ör. Türkçe cp1254) UTF-8 içeriği çözemez; paket UTF-8 modunda çalışmalı.
        if getattr(sys, "frozen", False):
            assert sys.flags.utf8_mode == 1, "UTF-8 modu kapalı"
            p = yollar.GRUP / "gruplar.json"
            with open(p, newline="") as f:  # newline="": CRLF dönüşümü karşılaştırmayı bozmasın
                assert f.read() == p.read_bytes().decode("utf-8"), "open() varsayılanı UTF-8 değil"
        return f"utf8_mode={sys.flags.utf8_mode} tercih={locale.getpreferredencoding(False)} fs={sys.getfilesystemencoding()}"
    kontrol("kodlama (UTF-8)", _kodlama)
    try:
        import icerik
        import ayarlar
    except Exception:  # noqa: BLE001
        yaz("HATA import:\n" + traceback.format_exc())
        rapor.close()
        return 2
    kontrol("ayarlar", lambda: sorted(ayarlar.ayar_oku()["slotlar"]))
    for slot in ("sabah", "ana", "story"):
        def _slot(s=slot):
            ic = icerik.slot_icerik(1, s)
            assert Path(ic["img"]).is_file(), ic["img"]
            assert s == "story" or (ic["fb"] and ic["ig"]), "metin boş"
            return Path(ic["img"]).name
        kontrol(f"slot {slot}", _slot)
    kontrol("gruplar", lambda: len(icerik.gruplar(ayarlar.ayar_oku())))

    def _varyant():
        key, img, metin = icerik.varyant("beyaz", 1)
        assert Path(img).is_file() and metin, img
        return f"{key} {img.name}"
    kontrol("grup varyantı", _varyant)

    def _surucu():
        from playwright._impl._driver import compute_driver_executable
        yol = compute_driver_executable()
        yol = yol[0] if isinstance(yol, tuple) else yol
        assert Path(yol).is_file(), yol
        return yol
    kontrol("playwright sürücüsü", _surucu)
    kontrol("modüller", lambda: [__import__(m).__name__ for m in ("ajan", "paylas", "tarayici", "gorev", "arayuz")])

    def _tarayici():
        import tarayici
        if not tarayici.tarayici_kurulu():
            assert not getattr(sys, "frozen", False), f"pakette Chromium yok: {tarayici.GOMULU}"
            return "kurulu değil (geliştirme ortamı)"
        with tarayici.ac(gizli=True) as ctx:
            page = ctx.new_page()
            page.goto("about:blank")
            surum = ctx.browser.version if ctx.browser else "?"
        return f"{'gömülü' if tarayici.gomulu() else 'indirilmiş'} Chromium {surum} @ {tarayici.tarayici_dizini()}"
    kontrol("tarayıcı (Chromium açılıyor)", _tarayici)

    if os.name == "nt":
        def _gorev():
            import gorev
            a = ayarlar.ayar_oku()
            a["grup"]["aktif"] = True  # tur saatleri de tetikleyiciye girsin
            ok, msg = gorev.kur(a, calistir=False)
            try:
                assert ok, msg
                assert gorev.kurulu(), "YamansaAjan sorgulanamadı"
                ok2, q = gorev._schtasks("/Query", "/TN", gorev.GOREV_UYANDIR, "/XML")
                assert ok2 and "<WakeToRun>true</WakeToRun>" in q, q[:300]
                return f"{gorev.GOREV} + {gorev.GOREV_UYANDIR} {gorev.uyandirma_saatleri(a)}"
            finally:
                gorev.kaldir()
        kontrol("görev zamanlayıcı", _gorev)

    yaz("BITTI")
    rapor.close()
    return 2 if hata else 0


def _hata_yakala(tur, deger, iz, pencere=False):
    """Beklenmedik hata: hata.log'a yaz; panelde anlaşılır bir pencere göster (ajan modlarında sessiz)."""
    import datetime
    import traceback
    metin = "".join(traceback.format_exception(tur, deger, iz))
    try:
        with (yollar.VERI / "hata.log").open("a", encoding="utf-8") as f:
            f.write(f"\n===== {datetime.datetime.now():%Y-%m-%d %H:%M:%S} =====\n{metin}")
    except Exception:  # noqa: BLE001
        pass
    if not pencere:
        return sys.__excepthook__(tur, deger, iz)
    try:
        import tkinter as tk
        from tkinter import messagebox
        kok = tk.Tk()
        kok.withdraw()
        messagebox.showerror(
            "Yamansa Paneli – beklenmedik hata",
            f"{tur.__name__}: {deger}\n\nAyrıntı: {yollar.VERI / 'hata.log'}\n"
            "Bu dosyayı destek için gönderebilirsiniz.",
        )
        kok.destroy()
    except Exception:  # noqa: BLE001
        pass
    sys.__excepthook__(tur, deger, iz)


def main(argv=None):
    argv = sys.argv[1:] if argv is None else argv
    if "--dogrula" in argv:
        return dogrula()
    sys.excepthook = _hata_yakala
    if "--ajan" in argv:
        import ajan
        import tepsi
        return tepsi.calistir(ajan.dongu)
    if "--durdur" in argv:
        import gorev
        gorev.durdur()
        return 0
    if "--kaldir" in argv:
        import gorev
        gorev.tamamen_kaldir()
        return 0
    if "--ajan-tek" in argv:
        import ajan
        return ajan.tek_sefer()
    if "--uyandir" in argv:
        import ajan
        return ajan.uyandir()
    sys.excepthook = lambda *h: _hata_yakala(*h, pencere=True)
    import arayuz
    arayuz.calistir()
    return 0


if __name__ == "__main__":
    sys.exit(main())
