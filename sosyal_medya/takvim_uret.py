# -*- coding: utf-8 -*-
"""icerik_verisi.POSTS -> 02_icerik_takvimi.md + icerik_takvimi.csv

Kullanım:  python3 takvim_uret.py
"""
import csv
from pathlib import Path

from icerik_verisi import ADRES, HASHTAG_SETS, POSTS, SITE, TEL

HERE = Path(__file__).parent
MD = HERE / "02_icerik_takvimi.md"
CSV = HERE / "icerik_takvimi.csv"

SAAT = {"IG": "12:30", "FB": "12:30", "LI": "09:00"}


def clean(s):
    return s.replace("<br>", " ")


def platforms(p):
    return [x.strip() for x in p["platform"].split(",")]


def li_hashtags(p):
    tags = HASHTAG_SETS[p["hashtags"]].split()
    return " ".join(tags[:4])


def write_md():
    out = []
    out.append("# Yamansa Rulman – 60 Günlük (2 Ay) Sosyal Medya İçerik Takvimi\n")
    out.append("**Dönem:** 1. ay 21 Eylül – 20 Ekim 2026 (Gün 1–30) · 2. ay 21 Ekim – 19 Kasım 2026 (Gün 31–60)  \n"
               "**Kanallar:** Instagram (IG), Facebook (FB), LinkedIn (LI)  \n"
               f"**Site:** {SITE} · **Tel:** {TEL} · **Adres:** {ADRES}\n")
    out.append("## Paylaşım kuralları\n")
    out.append("- IG/FB: 12:30 (öğle arası), LinkedIn: 09:00 (iş günü başlangıcı). Hafta sonu sadece IG/FB.\n"
               "- Her gönderi `gonderiler/gunXX_kare.png` (IG/FB) ve varsa `gonderiler/gunXX_linkedin.png` (LI) görselini kullanır.\n"
               "- Instagram'da link biyografide (yamansarulman.com); metindeki UTM linki Facebook ve LinkedIn'de doğrudan paylaşılır.\n"
               "- Alt metin (erişilebilirlik) alanı her platformda doldurulur; SEO için görsel açıklaması olarak da işe yarar.\n"
               "- Her gönderiye eşlik eden **blog / site sayfası** önerisi, gönderi tarihinden önce siteye eklenirse link otoritesi için en iyi sonucu verir.\n")
    out.append("## Haftalık içerik dağılımı\n")
    out.append("| Hafta | Günler | Ana temalar |\n|---|---|---|\n"
               "| 1 | 1–7 | Lansman, 6200 serisi, ZZ/2RS, motosiklet setleri, markalar, kod okuma |\n"
               "| 2 | 8–14 | Scooter, 6300 serisi, C3 boşluk, arıza teşhisi, lojistik, ölçü rehberi, gres |\n"
               "| 3 | 15–21 | Bisiklet, 6000 serisi, B2B/bayi, montaj hataları, Yamansa marka, motor modelleri |\n"
               "| 4 | 22–30 | Sanayi rulmanları, ince kesit, stok görünürlüğü, kumpas, 6204/6304, teknik destek, katalog CTA |\n"
               "| 5 | 31–37 | Kapak kodları (Z/ZZ/RS/2RZ), 6206–6211, çamaşır makinesi rulmanı, 608, arıza analizi, konik 30200 |\n"
               "| 6 | 38–44 | Kritik yedek listesi, 29 Ekim, bilyalı/makaralı, direksiyon & salıncak, NU/NJ/NUP, ek harfler |\n"
               "| 7 | 45–51 | Kurumsal tedarik, sökme, scooter filoları, rulman tarihi, oynak bilyalı 1200, 10 Kasım |\n"
               "| 8 | 52–60 | Açık/kapaklı, sahte rulman, 6306–6311, elektrik motoru, yıl sonu duruşu, gres seçimi, yataklı rulman, SSS CTA |\n")

    out.append("## Özet tablo\n")
    out.append("| Gün | Tarih | Platform | Tema | Başlık | SEO anahtar kelimeler | Görsel |\n|---|---|---|---|---|---|---|")
    for p in POSTS:
        g = f"gun{p['gun']:02d}"
        vis = f"{g}_kare.png" + (f", {g}_linkedin.png" if "LI" in p["platform"] else "")
        out.append(f"| {p['gun']} | {p['tarih']} | {p['platform']} | {p['pillar']} | {clean(p['baslik'])} | {p['kw']} | {vis} |")
    out.append("")

    out.append("## Gönderi detayları\n")
    for p in POSTS:
        g = f"gun{p['gun']:02d}"
        out.append(f"### Gün {p['gun']} · {p['tarih']} · {p['platform']} · {p['pillar']}\n")
        out.append(f"**Görsel:** `gonderiler/{g}_kare.png`" + (f" · `gonderiler/{g}_linkedin.png`" if "LI" in p["platform"] else "") + f"  \n**Başlık:** {clean(p['baslik'])}  \n**SEO anahtar kelimeler:** {p['kw']}  \n**Link (UTM):** {p['link']}  \n**Alt metin:** {p['alt_text']}  \n**Eşlik eden blog/site sayfası:** {p['blog']}\n")
        out.append("**Instagram / Facebook metni:**\n")
        out.append("```\n" + p["ig"] + "\n\n" + HASHTAG_SETS[p["hashtags"]] + "\n```\n")
        if "LI" in p["platform"] and p.get("li"):
            out.append("**LinkedIn metni:**\n")
            out.append("```\n" + p["li"] + "\n\n" + p["link"] + "\n\n" + li_hashtags(p) + "\n```\n")
    MD.write_text("\n".join(out), encoding="utf-8")


def write_csv():
    with CSV.open("w", newline="", encoding="utf-8-sig") as f:
        w = csv.writer(f, delimiter=";")
        w.writerow(["gun", "tarih", "saat", "platform", "tema", "baslik", "metin", "hashtagler", "link", "gorsel", "alt_metin", "seo_anahtar_kelimeler", "blog_onerisi"])
        for p in POSTS:
            g = f"gun{p['gun']:02d}"
            for pl in platforms(p):
                if pl == "LI":
                    text, tags, vis = p.get("li") or p["ig"], li_hashtags(p), f"gonderiler/{g}_linkedin.png"
                else:
                    text, tags, vis = p["ig"], HASHTAG_SETS[p["hashtags"]], f"gonderiler/{g}_kare.png"
                w.writerow([p["gun"], p["tarih"], SAAT[pl], pl, p["pillar"], clean(p["baslik"]), text, tags,
                            p["link"], vis, p["alt_text"], p["kw"], p["blog"]])


if __name__ == "__main__":
    write_md()
    write_csv()
    print("ok", MD.name, CSV.name)
