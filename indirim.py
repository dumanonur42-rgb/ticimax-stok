# Piyasa arastirmasina gore kategori bazli indirim oranlari.
# 200 TL (KDV haric) altindaki urunlerde indirim uygulanmaz.
# Oranlar toplam indirimdir (tavan %25; %30 yalnizca onayli kategorilerde).

MIN_INDIRIM_FIYAT_TRY = 200.0

_ORANLAR = {
    # Piyasaya gore pahali kaldigimiz gruplar -> %25
    "Dijital Yükseklik Mihengirleri": 0.25,
    # Piyasaya gore zaten uygun fiyatli gruplar -> dusuk oran
    "Mekanik Kumpaslar": 0.15,
    "Punta Matkapları": 0.15,
    "Konik Saplı Matkap Uçları": 0.15,
    "Erkek Vida Mastarları": 0.15,
    "Dişi Vida Mastarları": 0.15,
    "Radius Mastarları": 0.15,
    "Diş Tarakları": 0.15,
    "Şerit Sentiller": 0.15,
    "Kıl Gönyeler": 0.15,
    "Şapkalı Gönyeler": 0.15,
    "Şapkasız Gönyeler": 0.15,
    "Salgı Komparatör Saatleri": 0.15,
    "Dijital Komparatör Saatleri": 0.15,
    "Komparatör Saatleri": 0.10,
    "Çelik Cetveller": 0.10,
}

_VARSAYILAN_ORAN = 0.20


def indirim_orani(category_path, price_try):
    """Kategori ve TL fiyata gore indirim orani (0.0 = indirimsiz)."""
    try:
        p = float(price_try)
    except (TypeError, ValueError):
        return 0.0
    if p < MIN_INDIRIM_FIYAT_TRY:
        return 0.0
    leaf = (category_path or "").split(">")[-1]
    return _ORANLAR.get(leaf, _VARSAYILAN_ORAN)
