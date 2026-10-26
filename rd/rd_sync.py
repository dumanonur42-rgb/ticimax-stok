"""Rulman Dunyasi B2B'den gunluk fiyat/stok/min adet cekme.

Sadece okuma yapar (urun arama). Sepet/siparis/cikis fonksiyonlarina dokunmaz.
Cikti: rd/rd_fiyat_stok.json  {stok_kodu: {net, satis, stok, rd_min, min}}
Giris: RD_CUSTOMER / RD_USER / RD_PASS (GitHub secrets) ya da RD_COOKIE.
"""
import json
import os
import re
import sys
import time
from pathlib import Path

import requests

BASE = "https://b4b.rulman.com.tr"
UA = "Mozilla/5.0 (X11; Linux x86_64; rv:128.0) Gecko/20100101 Firefox/128.0"
KAR = 1.50
OUT = Path(__file__).parent / "rd_fiyat_stok.json"
ARAMA = {"manufacturer": None, "vehicleBrand": None, "vehicleModel": None,
         "productGroup1": None, "productGroup2": None, "productGroup3": None,
         "t9Text": "", "campaign": False, "newArrival": False, "newProduct": False,
         "comparsionProduct": False, "onQuantity": False, "onWay": False, "image": False}


def oturum():
    s = requests.Session()
    s.headers.update({"User-Agent": UA})
    cookie = os.environ.get("RD_COOKIE")
    if cookie:
        s.headers["Cookie"] = cookie
        return s
    r = s.get(BASE + "/", timeout=60)
    token = re.search(r'name="__RequestVerificationToken"[^>]*value="([^"]+)"', r.text).group(1)
    s.post(BASE + "/", data={"__RequestVerificationToken": token,
                             "CustomerCode": os.environ["RD_CUSTOMER"],
                             "UserCode": os.environ["RD_USER"],
                             "Password": os.environ["RD_PASS"]}, timeout=60)
    return s


def post(s, path, data):
    for t in range(5):
        try:
            r = s.post(BASE + path, json=data, timeout=90,
                       headers={"X-Requested-With": "XMLHttpRequest", "Referer": BASE + "/Search"})
            r.raise_for_status()
            return r.json()
        except Exception as e:  # noqa: BLE001
            print("tekrar", path, data.get("manufacturer"), data.get("dataCount"), e, flush=True)
            time.sleep(10 * (t + 1))
    raise RuntimeError(f"{path} cevap vermedi")


def min_adet(satis, net, rd_min):
    """Musterinin odedigi tutar, RD'ye odedigimiz min sepeti gectigi ilk adet."""
    q = 1
    while q * satis <= rd_min * net:
        q += 1
    return q


def urunleri_cek(s):
    markalar = post(s, "/Search/GetManufaturerList", {})
    if not isinstance(markalar, list) or len(markalar) < 2:
        raise RuntimeError("Giris basarisiz ya da marka listesi bos")
    urunler = {}
    for m in markalar[1:]:
        n = 0
        while True:
            d = post(s, "/Search/SearchProduct", dict(ARAMA, manufacturer=m["Name"], dataCount=n))
            if not d:
                break
            for x in d:
                urunler[x["Id"]] = x
            n += len(d)
            time.sleep(0.3)
        print(m["Name"], m["RecordCount"], n, flush=True)
    return urunler


def hesapla(urunler):
    sonuc = {}
    for x in urunler.values():
        net = (x.get("PriceNetCustomer") or {}).get("ValueFinal") or 0
        if net <= 0:
            continue
        satis = round(net * KAR, 2)
        rd_min = max(1, int(x.get("MinOrder") or 1))
        sonuc[x["Code"]] = {"net": round(net, 4), "satis": satis,
                            "stok": max(0, int(x.get("TotalQuantity") or 0)),
                            "rd_min": rd_min, "min": min_adet(satis, net, rd_min)}
    return sonuc


def main():
    s = oturum()
    urunler = urunleri_cek(s)
    sonuc = hesapla(urunler)
    if len(sonuc) < 40000:
        sys.exit(f"Cok az urun geldi ({len(sonuc)}), dosya guncellenmedi")
    OUT.write_text(json.dumps(sonuc, ensure_ascii=False, sort_keys=True, indent=0), encoding="utf-8")
    print("Urun:", len(urunler), "fiyatli:", len(sonuc))


if __name__ == "__main__":
    main()
