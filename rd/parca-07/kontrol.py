#!/usr/bin/env python3
import collections
import json
import re
import sys
from pathlib import Path


ROOT = Path("/home/ubuntu/repos/ticimax-stok/rd/parca-07")
INPUT = Path("/home/ubuntu/attachments/8d7e0712-7b7b-413b-825a-d0b33e5d8beb/parca_07.jsonl")
CATEGORY_FILE = Path(
    "/home/ubuntu/attachments/77484315-77fe-4cc2-9aff-bc4490516d0d/kategoriler.txt"
)
BAD_TERMS = (
    "rulman " + "dünyası",
    "rulman " + "dunyasi",
    "rulman.com" + ".tr",
    "b" + "4b",
    "er" + "yaz",
    "doğrulan" + "mış",
    "katalog " + "kaynağı",
)
ASCII_TRANSLATION = str.maketrans(
    {"ı": "i", "ğ": "g", "ü": "u", "ş": "s", "ö": "o", "ç": "c", "İ": "i", "I": "i"}
)


def fail(message):
    print(f"KONTROL HATASI: {message}", file=sys.stderr)
    raise SystemExit(1)


def slug(value):
    value = value.translate(ASCII_TRANSLATION).lower()
    value = re.sub(r"[^a-z0-9]+", "-", value)
    return re.sub(r"-+", "-", value).strip("-")


def load_input():
    with INPUT.open(encoding="utf-8") as handle:
        return [json.loads(line) for line in handle if line.strip()]


def read_output_products():
    path = ROOT / "urunler.jsonl"
    if not path.is_file():
        fail("urunler.jsonl bulunamadı")
    products = []
    with path.open(encoding="utf-8") as handle:
        for line_number, line in enumerate(handle, 1):
            try:
                products.append(json.loads(line))
            except json.JSONDecodeError as error:
                fail(f"urunler.jsonl satır {line_number} geçersiz JSON: {error}")
    return products


def existing_categories():
    categories = set()
    new_section = False
    for line in CATEGORY_FILE.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if line.startswith("# YENI ACILACAK"):
            new_section = True
            continue
        if line and not line.startswith("#") and not new_section:
            categories.add(line)
    return categories


def validate():
    original = load_input()
    products = read_output_products()
    if len(products) != len(original):
        fail(f"ürün satırı sayısı {len(products)}; girişte {len(original)}")

    input_ids = [entry["id"] for entry in original]
    output_ids = [str(product.get("id", "")) for product in products]
    duplicate_ids = [key for key, count in collections.Counter(output_ids).items() if count != 1]
    if duplicate_ids:
        fail(f"ürün kimlikleri tekrarlı/eksik: {duplicate_ids[:10]}")
    if output_ids != input_ids:
        fail("ürün kimlikleri girişle aynı sırada değil")
    for source, product in zip(original, products):
        if product.get("stok_kodu") != source["stok_kodu"]:
            fail(f"stok_kodu değişmiş: {source['id']}")
        for field in (
            "urun_adi",
            "aciklama_html",
            "seo_baslik",
            "seo_aciklama",
            "seo_kelimeler",
            "url",
        ):
            if not product.get(field):
                fail(f"{field} boş: {source['id']}")
        if len(product["seo_baslik"]) > 65:
            fail(f"seo_baslik 65 karakteri aşıyor: {source['id']}")
        if not 140 <= len(product["seo_aciklama"]) <= 160:
            fail(f"seo_aciklama uzunluğu 140-160 dışında: {source['id']} ({len(product['seo_aciklama'])})")
        keywords = product["seo_kelimeler"]
        if isinstance(keywords, str):
            keywords = [word.strip() for word in keywords.split(",") if word.strip()]
        if not 5 <= len(keywords) <= 10:
            fail(f"anahtar kelime sayısı 5-10 dışında: {source['id']} ({len(keywords)})")
        if not re.fullmatch(r"[a-z0-9-]+", product["url"]):
            fail(f"url biçimi geçersiz: {source['id']}")
        code = source["stok_kodu"].split(" ", 1)[-1]
        if slug(code) not in product["url"]:
            fail(f"url stok kodu slug'ını içermiyor: {source['id']}")

    with (ROOT / "yeni_kategori_onerileri.json").open(encoding="utf-8") as handle:
        proposals = json.load(handle)
    proposal_paths = {entry["path"] for entry in proposals}
    valid_categories = existing_categories() | proposal_paths
    for product in products:
        for category in product.get("kategoriler", []):
            if category not in valid_categories:
                fail(f"tanımsız kategori: {category}")

    allowed_image_types = {"birebir", "ayni_tip", ""}
    for product in products:
        image_type = product.get("gorsel_tur")
        if image_type not in allowed_image_types:
            fail(f"geçersiz gorsel_tur: {product.get('id')}")
        image = product.get("gorsel", "")
        if image:
            path = ROOT / "gorseller" / Path(image).name
            if not path.is_file():
                fail(f"görsel dosyası bulunamadı: {image}")
        elif image_type:
            fail(f"görselsiz kayıtta gorsel_tur boş değil: {product.get('id')}")

    paths = [path for path in ROOT.rglob("*") if path.is_file()]
    for path in paths:
        name = path.relative_to(ROOT).as_posix().lower()
        if any(term in name for term in BAD_TERMS):
            fail(f"yasak ifade dosya adında: {path.relative_to(ROOT)}")
        if path.suffix.lower() in {".jpg", ".jpeg", ".png", ".webp"}:
            continue
        try:
            text = path.read_text(encoding="utf-8").lower()
        except UnicodeDecodeError:
            continue
        for term in BAD_TERMS:
            if term in text:
                fail(f"yasak ifade metin çıktısında: {path.relative_to(ROOT)}")

    print(
        "Kontrol başarılı: "
        f"{len(products)} ürün, kimlikler ve sıra birebir, "
        f"{len(proposal_paths)} kategori önerisi, "
        f"{sum(bool(product.get('gorsel')) for product in products)} görsel dosyası mevcut; "
        "SEO, kategori, görsel türü ve yasak ifade kontrolleri geçti."
    )


if __name__ == "__main__":
    validate()
