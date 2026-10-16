"""Zamanlanmış otomasyonun tek giriş noktası: saate göre doğru işi çalıştırır.

  python3 slot_calistir.py            # Türkiye saatine göre en yakın slotu seçer
  python3 slot_calistir.py --slot ana # slotu elle seç

Slotlar (Europe/Istanbul):
  09:00 sabah  -> gunluk_paylas.py --slot sabah  (IG + FB)
  09:30 grup   -> fb_grup_dagit.py --tur auto go (55 grup, 2 dk ara)
  12:30 ana    -> gunluk_paylas.py --slot ana
  18:30 story  -> gunluk_paylas.py --slot story
  20:00 grup   -> fb_grup_dagit.py --tur auto go
Çıktı: son satır tek satırlık özet (otomasyon mesajı için). Hata varsa exit 1.
"""
import argparse
import datetime as dt
import json
import shutil
import subprocess
import sys
from pathlib import Path
from zoneinfo import ZoneInfo

HERE = Path(__file__).resolve().parent
GRUP = HERE.parent / "grup_paylasim"
ESKI_GRUP_LOG = Path("/home/ubuntu/grup_paylasim/paylasim_log.json")  # ilk turun repo dışında tutulan logu
TZ = ZoneInfo("Europe/Istanbul")
SLOTLAR = {"sabah": (9, 0), "grup_sabah": (9, 30), "ana": (12, 30), "story": (18, 30), "grup_aksam": (20, 0)}
SON_GUN = 60


def en_yakin_slot(simdi):
    dk = simdi.hour * 60 + simdi.minute
    return min(SLOTLAR, key=lambda s: abs(SLOTLAR[s][0] * 60 + SLOTLAR[s][1] - dk))


def gun_no():
    sys.path.insert(0, str(HERE))
    import gunluk_paylas as G
    return G.gun_no("auto")


def calistir(cmd, cwd):
    print("$", " ".join(cmd), flush=True)
    r = subprocess.run(cmd, cwd=cwd, text=True, capture_output=True)
    print(r.stdout[-3000:], r.stderr[-1500:], flush=True)
    return r.returncode


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--slot", choices=list(SLOTLAR))
    a = ap.parse_args()
    simdi = dt.datetime.now(TZ)
    slot = a.slot or en_yakin_slot(simdi)
    print(f"[{simdi:%Y-%m-%d %H:%M} TR] slot={slot}", flush=True)

    if slot.startswith("grup"):
        # BLOK varsa (hesap engeli) yeni tur açma
        if subprocess.run(["pgrep", "-f", "fb_grup_dagit.py"], capture_output=True).returncode == 0:
            print("OZET: grup turu ATLANDI – önceki tur hâlâ çalışıyor")
            return 1
        log = GRUP / "paylasim_log.json"
        if not log.exists() and ESKI_GRUP_LOG.exists():
            shutil.copy(ESKI_GRUP_LOG, log)
        if log.exists():
            d = json.loads(log.read_text())
            son = d[max(d, key=int)] if d else {}
            if any(v["durum"] == "BLOK" for v in son.values()):
                print("OZET: grup turu ATLANDI – önceki turda Facebook engeli (BLOK) var, kullanıcıya bildir")
                return 1
        rc = calistir([sys.executable, "fb_grup_dagit.py", "--tur", "auto", "--ara", "120", "go"], GRUP)
        d = json.loads(log.read_text())
        son = d[max(d, key=int)]
        say = {k: sum(1 for v in son.values() if v["durum"] == k) for k in ("OK", "PENDING", "FAIL", "BLOK")}
        print(f"OZET: grup turu {max(d, key=int)} · {say}")
        return 1 if rc or say["BLOK"] else 0

    gun = gun_no()
    if gun > SON_GUN:
        print(f"OZET: Gün {gun} > {SON_GUN} – içerik bitti, kullanıcıdan yeni içerik iste")
        return 1
    rc = calistir([sys.executable, "gunluk_paylas.py", "--gun", str(gun), "--slot", slot, "go"], HERE)
    log = json.loads((HERE / "gunluk_log.json").read_text())
    bugun = [x for x in log if x["gun"] == gun and x["slot"] == slot]
    print(f"OZET: Gün {gun} {slot} · " + " · ".join(f"{x['platform']}={x['durum']}" for x in bugun))
    return 1 if rc or any(x["durum"] != "OK" for x in bugun) else 0


if __name__ == "__main__":
    sys.exit(main())
