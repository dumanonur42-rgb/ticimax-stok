#!/usr/bin/env python3
import json
import re
from pathlib import Path, PurePosixPath


PACKAGE = Path(__file__).resolve().parent
INPUT_PATH = Path(
    "/home/ubuntu/attachments/0f31a35b-b85f-4225-909d-7401dc73ef25/parca_02.jsonl"
)
MATCH_PATH = Path("/home/ubuntu/work/match.json")
CATEGORY_PATH = Path(
    "/home/ubuntu/attachments/57a61216-4d45-45b3-ae92-a19e2f0dae19/kategoriler.txt"
)
EXPECTED_COUNT = 2906
EXPECTED_FIELDS = [
    "id",
    "stok_kodu",
    "urun_adi",
    "marka",
    "kategoriler",
    "teknik",
    "teknik_kaynak",
    "aciklama_html",
    "seo_baslik",
    "seo_aciklama",
    "seo_kelimeler",
    "url",
    "gorsel",
    "gorsel_tur",
    "gorsel_kaynak",
    "bayraklar",
]
OWNER_CATEGORIES = {
    "TEKERLEKLER",
    "TEKERLEKLER>HAFİF SANAYİ TİPİ TEKERLEKLER",
    "TEKERLEKLER>ORTA SANAYİ TİPİ TEKERLEKLER",
    "TEKERLEKLER>AĞIR SANAYİ TİPİ TEKERLEKLER",
    "TEKERLEKLER>EKSTRA AĞIR SANAYİ TİPİ TEKERLEKLER",
    "TEKERLEKLER>SERVİS VE MOBİLYA TEKERLEKLERİ",
    "TEKERLEKLER>DÖNER TEKERLEKLER",
    "TEKERLEKLER>SABİT TEKERLEKLER",
    "TEKERLEKLER>FRENLİ TEKERLEKLER",
    "TEKERLEKLER>PASLANMAZ (INOX) TEKERLEKLER",
    "TEKERLEKLER>YEDEK TEKERLER",
    "TEKERLEKLER>TEKER MAŞALARI",
    "TEKERLEKLER>ŞİŞME TEKERLER VE LASTİKLER",
    "TEKERLEKLER>TEKER YEDEK PARÇALARI VE AKSESUARLARI",
}
FORBIDDEN = (
    "doğrulanmış",
    "doğrulanmıştır",
    "katalog kaynağı",
    "rulman dünyası",
    "rulman.com.tr",
    "eryaz",
    "b4b",
    "fiyat",
    "ücret",
    "stok",
    "stokta",
    "teslim",
    "kargo",
    "sevkiyat",
    "gönderim",
    "gönderi",
    "ücretsiz",
    "aynı gün",
    "24 saat",
)
URL_PATTERN = re.compile(r"[a-z0-9]+(?:-[a-z0-9]+)*\Z")


def fail(message):
    raise SystemExit(f"FAIL: {message}")


def read_jsonl(path):
    try:
        return [json.loads(line) for line in path.read_text(encoding="utf-8").splitlines()]
    except Exception as error:
        fail(f"cannot read {path}: {error}")


def allowed_categories():
    result = set()
    for raw in CATEGORY_PATH.read_text(encoding="utf-8").splitlines():
        line = raw.strip()
        if not line or line.startswith("#"):
            continue
        line = re.sub(
            r"^(?:MEVCUT|YENI)\s*(?:[:|-]\s*)?",
            "",
            line,
            flags=re.IGNORECASE,
        )
        line = re.sub(r"\s*\[(?:MEVCUT|YENI)\]\s*$", "", line, flags=re.IGNORECASE)
        if line:
            result.add(line)
    return result | OWNER_CATEGORIES


def iter_strings(value):
    if isinstance(value, str):
        yield value
    elif isinstance(value, dict):
        for child in value.values():
            yield from iter_strings(child)
    elif isinstance(value, (list, tuple)):
        for child in value:
            yield from iter_strings(child)


def main():
    source = read_jsonl(INPUT_PATH)
    matches = json.loads(MATCH_PATH.read_text(encoding="utf-8"))
    output = read_jsonl(PACKAGE / "urunler.jsonl")
    if len(source) != EXPECTED_COUNT or len(matches) != EXPECTED_COUNT:
        fail(
            f"expected {EXPECTED_COUNT} input/match rows; "
            f"got {len(source)}/{len(matches)}"
        )
    if len(output) != EXPECTED_COUNT:
        fail(f"expected {EXPECTED_COUNT} output rows; got {len(output)}")

    ids = []
    urls = set()
    allowed = allowed_categories()
    image_count = 0
    empty_category_count = 0
    for index, (original, match, record) in enumerate(zip(source, matches, output), 1):
        if list(record) != EXPECTED_FIELDS:
            fail(f"line {index}: fields/order differ from required schema")
        product_id = str(original.get("id"))
        if str(match.get("id")) != product_id or str(record.get("id")) != product_id:
            fail(f"line {index}: id/order differs")
        if str(record.get("stok_kodu")) != str(original.get("stok_kodu")):
            fail(f"line {index}: stok_kodu differs")
        ids.append(product_id)

        for key in (
            "urun_adi",
            "aciklama_html",
            "seo_baslik",
            "seo_aciklama",
            "url",
        ):
            if not isinstance(record.get(key), str) or not record[key].strip():
                fail(f"line {index}: {key} is empty")
        if len(record["seo_baslik"]) > 65:
            fail(f"line {index}: seo_baslik exceeds 65 characters")
        if not 140 <= len(record["seo_aciklama"]) <= 160:
            fail(f"line {index}: seo_aciklama length is {len(record['seo_aciklama'])}")
        keywords = record.get("seo_kelimeler")
        if not isinstance(keywords, str):
            fail(f"line {index}: seo_kelimeler must be a comma-separated string")
        else:
            keyword_items = [word.strip() for word in keywords.split(",")]
            if not 5 <= len(keyword_items) <= 10:
                fail(f"line {index}: seo_kelimeler must contain 5-10 comma-separated items")
            if not all(keyword_items):
                fail(f"line {index}: seo_kelimeler contains an empty item")

        url = record["url"]
        if not url.isascii() or url != url.lower() or not URL_PATTERN.fullmatch(url):
            fail(f"line {index}: url is not lowercase ASCII with hyphens: {url!r}")
        if url in urls:
            fail(f"line {index}: duplicate url {url!r}")
        urls.add(url)

        categories = record.get("kategoriler")
        if not isinstance(categories, list):
            fail(f"line {index}: kategoriler is not a list")
        if not categories:
            empty_category_count += 1
        for category in categories:
            if category not in allowed:
                fail(f"line {index}: category is outside the allowed set: {category!r}")

        image = record.get("gorsel", "")
        image_type = record.get("gorsel_tur", "")
        if image_type not in {"birebir", "ayni_tip", ""}:
            fail(f"line {index}: invalid gorsel_tur {image_type!r}")
        if match.get("tur") == "" and image:
            fail(f"line {index}: resimsiz match unexpectedly has gorsel")
        if image:
            if image_type != match.get("tur"):
                fail(f"line {index}: gorsel_tur does not match match.json")
            rel = PurePosixPath(image)
            if rel.is_absolute() or ".." in rel.parts:
                fail(f"line {index}: unsafe gorsel path {image!r}")
            image_path = (PACKAGE / Path(*rel.parts)).resolve()
            if PACKAGE.resolve() not in image_path.parents or not image_path.is_file():
                fail(f"line {index}: gorsel file missing or outside package: {image!r}")
            image_count += 1
        elif image_type:
            fail(f"line {index}: empty gorsel has non-empty gorsel_tur")

        for field, value in record.items():
            for text in iter_strings(value):
                if field == "gorsel":
                    text = re.sub(r"(?i)(?<=/)[0-9a-f]{12}\.jpg$", "", text)
                lowered = text.casefold()
                for word in FORBIDDEN:
                    if word.casefold() in lowered:
                        fail(f"line {index}: forbidden text {word!r} in {text!r}")
        for field in (
            "urun_adi",
            "marka",
            "kategoriler",
            "teknik",
            "aciklama_html",
            "seo_baslik",
            "seo_aciklama",
            "seo_kelimeler",
            "url",
            "bayraklar",
        ):
            for text in iter_strings(record.get(field)):
                if "http" in text.casefold():
                    fail(f"line {index}: URL appears in customer field {field}")
        if "cdn.eryaz" in str(record.get("gorsel_kaynak", "")).casefold():
            fail(f"line {index}: forbidden image source host")

    if len(set(ids)) != EXPECTED_COUNT:
        fail("ids are not unique")
    if empty_category_count:
        fail(f"{empty_category_count} products have no categories")
    print(
        f"PASS: {EXPECTED_COUNT} ordered records; ids and stock codes match; "
        f"{image_count} image references exist; {len(allowed)} allowed categories; "
        f"URLs, SEO lengths, keywords, and text checks passed."
    )


if __name__ == "__main__":
    main()
