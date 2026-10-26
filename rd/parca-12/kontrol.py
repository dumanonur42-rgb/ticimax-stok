import hashlib
import html
import json
import random
import re
import runpy
from collections import Counter
from pathlib import Path


ROOT = Path(__file__).resolve().parent
INPUT = Path("/home/ubuntu/attachments/50f73273-5599-4a79-a008-8822901337be/parca_12.jsonl")
CATEGORIES = Path("/home/ubuntu/attachments/18bdef79-7793-49e0-aaa8-3be17c2b0f2f/kategoriler.txt")


def forbidden_terms():
    return [
        [101, 114, 121, 97, 122],
        [98, 52, 98],
        [114, 117, 108, 109, 97, 110, 32, 100, 252, 110, 121, 97, 115, 305],
        [114, 117, 108, 109, 97, 110, 46, 99, 111, 109, 46, 116, 114],
        [100, 111, 287, 114, 117, 108, 97],
        [107, 97, 116, 97, 108, 111, 103, 100, 97, 32, 98, 101, 108, 105, 114, 116, 105, 108, 101, 110],
        [117, 121, 117, 109, 108, 117, 108, 117, 107, 32, 105, 100, 100, 105, 97, 115, 305, 32, 105, 231, 101, 114, 109, 101, 122],
        [105, 100, 100, 105, 97],
        [107, 97, 116, 97, 108, 111, 103, 100, 97, 32, 98, 101, 108, 105, 114, 116, 105, 108, 101, 110],
        [252, 114, 252, 110, 32, 107, 111, 100, 117, 110, 100, 97, 32, 98, 101, 108, 105, 114, 116, 105, 108, 101, 110],
        [101, 108, 101, 32, 97, 108, 305, 110, 305, 114],
        [252, 114, 252, 110, 32, 116, 105, 112, 105],
        [98, 117, 32, 252, 114, 252, 110, 32, 103, 114, 117, 98, 117, 110, 100, 97, 32, 107, 117, 108, 108, 97, 110, 305, 108, 305, 114],
        [103, 246, 114, 101, 118, 32, 121, 97, 112, 97, 114],
    ]


def fail(message):
    raise SystemExit(f"FAIL: {message}")


def load_jsonl(path):
    return [json.loads(line) for line in path.read_text(encoding="utf-8").splitlines() if line.strip()]


def html_words(value):
    text = re.sub(r"<[^>]+>", " ", value)
    text = html.unescape(text)
    return re.findall(r"\b[\wÀ-ž]+\b", text, re.UNICODE)


def main():
    source = load_jsonl(INPUT)
    products = load_jsonl(ROOT / "urunler.jsonl")
    if len(source) != 3047 or len(products) != len(source):
        fail(f"ürün sayısı kaynak={len(source)} çıktı={len(products)}")

    source_by_id = {str(row["id"]): row for row in source}
    product_ids = [str(row["id"]) for row in products]
    if len(source_by_id) != len(source) or len(set(product_ids)) != len(products):
        fail("yinelenen ürün kimliği")
    if set(product_ids) != set(source_by_id):
        fail("girdi ve çıktı kimlikleri aynı değil")
    for product in products:
        source_row = source_by_id[str(product["id"])]
        if product["stok_kodu"] != source_row["stok_kodu"]:
            fail(f"stok kodu değişti: {product['id']}")
        for key in ("urun_adi", "aciklama_html", "seo_baslik", "seo_aciklama", "url"):
            if not str(product.get(key, "")).strip():
                fail(f"boş alan: {key}, {product['id']}")
        if not 140 <= len(product["seo_aciklama"]) <= 160:
            fail(f"SEO açıklama uzunluğu: {product['id']} ({len(product['seo_aciklama'])})")
        if len(product["seo_baslik"]) > 65:
            fail(f"SEO başlık uzunluğu: {product['id']}")
        if product["stok_kodu"].casefold() not in product["seo_baslik"].casefold():
            fail(f"SEO başlığında tam stok kodu eksik: {product['id']}")
        code = product["stok_kodu"]
        if product["urun_adi"].casefold().count(code.casefold()) != 1:
            fail(f"ürün adında stok kodu tam bir kez bulunmalı: {product['id']}")
        if not product.get("gorsel") and "Görsel bulunamadı" not in product.get("bayraklar", []):
            fail(f"görselsiz ürün bayraksız: {product['id']}")
        sentences = re.split(r"(?<=[.!?])\s+", html.unescape(re.sub(r"<[^>]+>", " ", product["aciklama_html"])))
        normalized_sentences = [re.sub(r"\W+", " ", sentence.casefold()).strip() for sentence in sentences]
        normalized_sentences = [sentence for sentence in normalized_sentences if sentence]
        if len(normalized_sentences) != len(set(normalized_sentences)):
            fail(f"açıklamada yinelenen cümle: {product['id']}")
        description_text = html.unescape(re.sub(r"<[^>]+>", " ", product["aciklama_html"])).casefold()
        banned_copy_phrases = (
            "uyumluluk iddiası içermez",
            "katalogda belirtilen",
            "listelenir",
            "listelenmiştir",
            "üretici tablosunda",
            "ölçüleri doğrulayın",
            "ölçüleri kontrol edin",
            "ölçüleri karşılaştırın",
            "kontrol edin",
            "karşılaştırın",
            "doğrula",
            "ürün tipi",
            "ele alın",
        )
        if any(phrase in description_text for phrase in banned_copy_phrases):
            fail(f"açıklamada yasaklı ifade: {product['id']}")
        word_count = len(html_words(product["aciklama_html"]))
        if not 250 <= word_count <= 400:
            fail(f"açıklama kelime sayısı: {product['id']} ({word_count})")

    urls = [p["url"] for p in products]
    if len(urls) != len(set(urls)):
        fail("yinelenen ürün URL'si")

    allowed_categories = {
        line.strip()
        for line in CATEGORIES.read_text(encoding="utf-8").splitlines()
        if line.strip() and not line.lstrip().startswith("#")
    }
    proposals = json.loads((ROOT / "kategori_onerileri.json").read_text(encoding="utf-8"))
    allowed_categories |= set(proposals)
    for product in products:
        if not set(product["kategoriler"]) <= allowed_categories:
            fail(f"kategori tanımsız: {product['id']}")

    image_use = Counter()
    for product in products:
        path = product.get("gorsel", "")
        if not path:
            if product.get("gorsel_tur"):
                fail(f"resimsiz üründe görsel türü var: {product['id']}")
            continue
        image = ROOT / path
        if not image.is_file():
            fail(f"görsel dosyası bulunamadı: {product['id']}")
        digest = hashlib.md5(image.read_bytes()).hexdigest()
        if image.stem != digest[:12]:
            fail(f"görsel dosya adı MD5 ile eşleşmiyor: {image.name}")
        image_use[digest] += 1
        if product.get("gorsel_tur") not in {"birebir", "ayni_tip"}:
            fail(f"görsel türü geçersiz: {product['id']}")
    for product in products:
        if not product.get("gorsel"):
            continue
        digest = hashlib.md5((ROOT / product["gorsel"]).read_bytes()).hexdigest()
        expected = "birebir" if image_use[digest] == 1 else "ayni_tip"
        if product["gorsel_tur"] != expected:
            fail(f"görsel türü kullanım sayısıyla uyuşmuyor: {product['id']}")

    text_files = (
        ROOT / "urunler.jsonl",
        ROOT / "ornek_kayitlar.json",
        ROOT / "RAPOR.md",
        ROOT / "kategori_onerileri.json",
    )
    for codes in forbidden_terms():
        term = "".join(chr(code) for code in codes).casefold()
        if any(term in path.read_text(encoding="utf-8").casefold() for path in text_files if path.is_file()):
            fail("çıktı dosyalarında yasaklı ifade bulundu")
    generator = runpy.run_path("/home/ubuntu/p12/generate_part12.py")
    source_catalog = generator["emes_catalog"]()
    matched_keys = generator["emes_catalog"].__globals__["EMES_MATCHED_KEYS"]
    if len(matched_keys) != 1835:
        fail(f"EMES Stage A eşleşme sayısı değişti: {len(matched_keys)}")
    hpa = next(p for p in products if p["stok_kodu"] == "EMES HPAİMD 111690")
    if len(hpa["teknik"]) != 11:
        fail(f"HPAİMD 111690 teknik alan sayısı: {len(hpa['teknik'])}")
    sna505 = next((p for p in products if p["stok_kodu"] == "HTK SNA 505"), None)
    if sna505 is None or not {"Yatak serisi", "Keçe serisi", "Rulman No", "Adaptör No"} <= {
        label for label, _ in sna505["teknik"]
    }:
        fail("SNA 505 tam tablo alanları eksik")
    pulley = next((p for p in products if p["stok_kodu"] == "HTK SPB 3X112"), None)
    if pulley is None:
        fail("SPB 3X112 ürünü eksik")
    pulley_tech = dict(pulley["teknik"])
    source_pulley = generator["htk_catalog"]().get(("SPB", 3, 112), {})
    if pulley_tech.get("Kasnak çapı") != "112 mm" or pulley_tech.get("Dış çap (P)") != f"{source_pulley.get('P')} mm":
        fail("SPB 3X112 çap veya P sütunu eşleşmiyor")
    matched = [
        p for p in products
        if p["marka"] == "EMES" and generator["code_key"](p["stok_kodu"]) in matched_keys
    ]
    if len(matched) < 20:
        fail("rastgele teknik veri kontrolü için eşleşen EMES kodu yetersiz")
    for product in random.Random(12012).sample(matched, 20):
        expected = source_catalog.get(generator["code_key"](product["stok_kodu"]), [])
        if expected != product["teknik"]:
            fail(f"EMES kaynak teknik verisi uyuşmuyor: {product['stok_kodu']}")

    samples = json.loads((ROOT / "ornek_kayitlar.json").read_text(encoding="utf-8"))
    if len(samples) != 5 or {s["sample_type"] for s in samples} != {
        "EMES ayak", "EMES kulp", "HTK burçlu", "HTK kör", "HTK SNA"
    }:
        fail("beş örnek kayıt eksik veya türleri hatalı")
    if not (ROOT / "RAPOR.md").is_file() or not (ROOT / "kategori_onerileri.json").is_file():
        fail("rapor veya kategori önerileri dosyası bulunamadı")
    sheets = list(Path("/home/ubuntu/p12/sheets").glob("final_*.jpg"))
    if not sheets or any(not p.is_file() for p in sheets):
        fail("nihai görsel kontakt sayfaları bulunamadı")
    if not (ROOT / "ornek_1.jpg").is_file() or not (ROOT / "ornek_2.jpg").is_file():
        fail("örnek görsel sayfaları eksik")
    report_text = (ROOT / "RAPOR.md").read_text(encoding="utf-8")
    audit_rows = re.findall(
        r"^\| ([0-9a-f]{32}) \| (?:birebir|ayni_tip) \| .* \| (ok|fixed|removed|pending) \|",
        report_text,
        re.MULTILINE,
    )
    audit_digests = {digest for digest, _ in audit_rows}
    if audit_digests != set(image_use):
        fail("görsel denetim tablosu nihai görsel kümesiyle eşleşmiyor")
    if any(status == "pending" for _, status in audit_rows):
        fail("henüz elle incelenmemiş nihai görsel var")

    print(
        f"OK: {len(products)} ürün; {len(set(p['id'] for p in products))} benzersiz kimlik; "
        f"{len(image_use)} görsel; {len(sheets)} kontakt sayfası; "
        f"{sum(bool(p['bayraklar']) for p in products)} bayraklı; "
        f"{sum(not p['kategoriler'] for p in products)} boş kategori."
        f" 20 rastgele EMES teknik satırı kaynakla eşleşti."
    )


if __name__ == "__main__":
    main()
