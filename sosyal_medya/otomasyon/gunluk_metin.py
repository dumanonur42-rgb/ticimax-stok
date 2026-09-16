"""Gün N için IG/FB paylaşım metinleri – icerik_verisi'nden üretilir.

Kullanım:  python3 gunluk_metin.py 2   -> Gün 2'nin 4 metnini yazdırır.
"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
import icerik_verisi as V  # noqa: E402

WA = "https://wa.me/905526109363"
TEL_INT = "+90 552 610 93 63"
SITE = "https://www.yamansarulman.com"

KATEGORI_LINK = {
    "moto": "motosiklet-rulmanlari",
    "scooter": "scooter-rulmanlari",
    "bisiklet": "bisiklet-rulmanlari",
    "sanayi": "sabit-bilyali-rulmanlar",
    "beyazesya": "sabit-bilyali-rulmanlar",
    "kaykay": "kaykay-paten-rulmanlari",
}


def u(path, camp, src):
    return f"{SITE}/{path}?utm_source={src}&utm_medium=social&utm_campaign={camp}"


def _fb_alt(camp):
    return (
        f"💬 WhatsApp sipariş: {WA}\n"
        f"📞 Hemen ara: {TEL_INT}\n"
        f"📍 İkitelli OSB, Başakşehir / İstanbul · 1986'dan beri\n"
        f"🚚 16:00'a kadar sipariş aynı gün kargoda · Faturalı · %100 orijinal"
    )


def _ig_alt():
    return (
        "🌐 Katalog: yamansarulman.com (link profilde ⬆️)\n"
        f"💬 WhatsApp / Ara: {V.TEL}\n"
        "📍 İkitelli OSB, İstanbul\n"
        "🚚 16:00'a kadar sipariş aynı gün kargoda · Faturalı · %100 orijinal"
    )


def _tags(key):
    return V.HASHTAG_SETS.get(key, V.HASHTAG_SETS["genel"])


def sabah(gun):
    s = next(x for x in V.SABAH if x["gun"] == gun)
    govde = V.sabah_ig(s).replace("Stokta. Kodu yaz, aynı gün kargolayalım: yamansarulman.com", "Stokta, orijinal ve faturalı ✅")
    tags = _tags(s.get("hashtags", "genel"))
    fb = (
        f"🔩 {govde}\n\n"
        f"🔎 Ölçüye göre rulman ara: {u('rulman-olculeri-arama', 'sabah', 'facebook')}\n"
        f"{_fb_alt('sabah')}\n\n{tags}"
    )
    ig = f"🔩 {govde}\n\n{_ig_alt()}\n\n{tags}"
    alt = V.sabah_alt_text(s) + f". Yamansa Rulman, yamansarulman.com, {V.TEL}."
    return dict(fb=fb, ig=ig, alt=alt, img=f"gun{gun:02d}_sabah.png")


def ana(gun):
    p = V.POST_BY_GUN[gun]
    govde = p["ig"].replace("Fiyat ve stok için DM veya yamansarulman.com", "Fiyat ve stok için WhatsApp'tan yazın 👇")
    tags = _tags(p.get("hashtags", "genel"))
    camp = p["link"].split("utm_campaign=")[-1]
    kat = KATEGORI_LINK.get(p.get("hashtags", "genel"), "")
    fb = (
        f"{govde}\n\n"
        f"🛒 Ürünler: {u(kat, camp, 'facebook')}\n"
        f"{_fb_alt(camp)}\n\n{tags}"
    )
    ig = f"{govde}\n\n{_ig_alt()}\n\n{tags}"
    alt = p["alt_text"] + f". Yamansa Rulman, yamansarulman.com, {V.TEL}."
    return dict(fb=fb, ig=ig, alt=alt, img=f"gun{gun:02d}_kare.png")


def story(gun):
    a = next(x for x in V.AKSAM if x["gun"] == gun)
    p = V.POST_BY_GUN[gun]
    alt = f"Yamansa Rulman story: {p['baslik'].replace('<br>', ' ')}. Anket: {a['soru']} ({a['a']} / {a['b']}). yamansarulman.com, {V.TEL}"
    return dict(
        link=f"{SITE}/?utm_source=facebook&utm_medium=story&utm_campaign=story",
        alt=alt,
        img=f"gun{gun:02d}_story.png",
    )


if __name__ == "__main__":
    g = int(sys.argv[1]) if len(sys.argv) > 1 else 2
    for ad, d in (("SABAH", sabah(g)), ("ANA", ana(g))):
        print(f"===== {ad} FB\n{d['fb']}\n\n===== {ad} IG\n{d['ig']}\n\n===== {ad} ALT\n{d['alt']}\n")
    print("===== STORY", story(g))
