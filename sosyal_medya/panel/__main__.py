"""Yamansa Sosyal Medya Paneli.

  python -m panel            -> masaüstü panel
  python -m panel --ajan     -> arka plan ajanı (zamanlayıcı)
  python -m panel --ajan-tek -> vadesi gelen işleri bir kez çalıştır ve çık
  python -m panel --dogrula  -> paket bütünlük kontrolü (CI); sonucu dogrula.txt'ye yazar
"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import yollar  # noqa: E402,F401  (sys.path'e sosyal_medya/, otomasyon/, grup_paylasim/ ekler)


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

    yaz("BITTI")
    rapor.close()
    return 2 if hata else 0


def main(argv=None):
    argv = sys.argv[1:] if argv is None else argv
    if "--dogrula" in argv:
        return dogrula()
    if "--ajan" in argv:
        import ajan
        return ajan.dongu()
    if "--ajan-tek" in argv:
        import ajan
        return ajan.tek_sefer()
    import arayuz
    arayuz.calistir()
    return 0


if __name__ == "__main__":
    sys.exit(main())
