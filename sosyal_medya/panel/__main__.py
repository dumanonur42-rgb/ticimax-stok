"""Yamansa Sosyal Medya Paneli.

  python -m panel            -> masaüstü panel
  python -m panel --ajan     -> arka plan ajanı (zamanlayıcı)
  python -m panel --ajan-tek -> vadesi gelen işleri bir kez çalıştır ve çık
"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import yollar  # noqa: E402,F401  (sys.path'e sosyal_medya/, otomasyon/, grup_paylasim/ ekler)


def main(argv=None):
    argv = sys.argv[1:] if argv is None else argv
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
