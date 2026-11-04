# -*- coding: utf-8 -*-
"""icerik_verisi.POSTS -> 02_icerik_takvimi.md + icerik_takvimi.csv

Kullanım:  python3 takvim_uret.py
"""
import csv
from pathlib import Path

from icerik_verisi import (ADRES, AKSAM, HASHTAG_SETS, POSTS, SABAH, SABAH_LINK, SITE, STORY_LINK, TEL,
                           sabah_alt_text, sabah_ig)

HERE = Path(__file__).parent
MD = HERE / "02_icerik_takvimi.md"
CSV = HERE / "icerik_takvimi.csv"

SAAT = {"IG": "12:30", "FB": "12:30", "LI": "09:00"}
SABAH_SAAT, STORY_SAAT = "09:00", "18:30"
SABAH_BY_GUN = {s["gun"]: s for s in SABAH}
AKSAM_BY_GUN = {a["gun"]: a for a in AKSAM}
SABAH_TIP = {"kod": "Günün kodu", "terim": "Günün terimi", "ipucu": "Bakım ipucu", "soru": "Doğru mu, yanlış mı?"}


def story_talimat(a):
    if a["soru"]:
        return (f"Anket etiketi ekle → soru: “{a['soru']}”, seçenekler: “{a['a']}” / “{a['b']}” "
                f"(etiketi görseldeki iki butonun üzerine yerleştir). Link etiketi: {STORY_LINK} (alt sağdaki yamansarulman.com kutusunun üzerine).")
    return f"Anket yok; yalnız link etiketi: {STORY_LINK}. İstenirse “Soru sor” etiketi eklenebilir."


def story_alt_text(a, p):
    return f"Dikey story: {clean(p['baslik'])} başlığı, günün gönderi fotoğrafı ve " + (f"anket: {a['soru']}" if a["soru"] else f"mesaj: {a['a']}")


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
    out.append("## Günlük 3 paylaşım düzeni\n")
    out.append("| Saat | Slot | Kanal | Format | Görsel | İçerik |\n|---|---|---|---|---|---|\n"
               "| 09:00 | Sabah kartı | IG + FB (LinkedIn günlerinde LI ana gönderi de 09:00) | Kare 1080×1080 | `gunXX_sabah.png` | Günün kodu (ölçü + kullanım) / günün terimi / bakım ipucu / doğru-yanlış |\n"
               "| 12:30 | Ana gönderi | IG + FB (+ LI) | Kare 1080×1080, LI 1200×627 | `gunXX_kare.png`, `gunXX_linkedin.png` | Uzun metin, SEO anahtar kelimeleri, UTM link, blog önerisi |\n"
               "| 18:30 | Story | IG + FB story | Dikey 1080×1920 | `gunXX_story.png` | Günün konusuna bağlı anket + link etiketi; 24 saat görünür, ilgili olanlar Highlight'a eklenir |\n")
    out.append("Toplam: 60 gün × 3 slot = 180 paylaşım (+ LinkedIn günlerinde ayrıca LI gönderisi).\n")
    out.append("## Paylaşım kuralları\n")
    out.append("- Sabah kartı 09:00, ana gönderi 12:30 (öğle arası), story 18:30 (iş çıkışı). LinkedIn: 09:00 (iş günü başlangıcı). Hafta sonu sadece IG/FB.\n"
               "- Sabah kartı metni kısa tutulur (kod/terim + 2–3 cümle); hashtag seti ana gönderiyle aynı kurala uyar. Link: UTM `utm_campaign=sabah`.\n"
               "- Story'de anket etiketi görseldeki iki butonun, link etiketi alt sağdaki `yamansarulman.com` kutusunun üzerine yerleştirilir. Üst/alt 250 px Instagram arayüzü için boş bırakılmıştır.\n"
               "- Her ana gönderi `gonderiler/gunXX_kare.png` (IG/FB) ve varsa `gonderiler/gunXX_linkedin.png` (LI) görselini kullanır.\n"
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
    out.append("| Gün | Tarih | Platform | 09:00 Sabah kartı | 12:30 Ana gönderi (tema) | SEO anahtar kelimeler | 18:30 Story anketi |\n|---|---|---|---|---|---|---|")
    for p in POSTS:
        s, a = SABAH_BY_GUN[p["gun"]], AKSAM_BY_GUN[p["gun"]]
        out.append(f"| {p['gun']} | {p['tarih']} | {p['platform']} | {SABAH_TIP[s['tip']]}: {s['baslik']} | {clean(p['baslik'])} ({p['pillar']}) | {p['kw']} | {a['soru'] or a['a']} |")
    out.append("")

    out.append("## Gönderi detayları\n")
    for p in POSTS:
        g = f"gun{p['gun']:02d}"
        s, a = SABAH_BY_GUN[p["gun"]], AKSAM_BY_GUN[p["gun"]]
        out.append(f"### Gün {p['gun']} · {p['tarih']} · {p['platform']} · {p['pillar']}\n")

        out.append(f"#### 09:00 · Sabah kartı · {SABAH_TIP[s['tip']]} · IG + FB\n")
        out.append(f"**Görsel:** `gonderiler/{g}_sabah.png`  \n**SEO anahtar kelimeler:** {s['kw']}  \n**Link (UTM):** {SABAH_LINK}  \n**Alt metin:** {sabah_alt_text(s)}\n")
        out.append("```\n" + sabah_ig(s) + "\n\n" + HASHTAG_SETS[s["hashtags"]] + "\n```\n")

        out.append(f"#### 12:30 · Ana gönderi · {p['platform']}\n")
        out.append(f"**Görsel:** `gonderiler/{g}_kare.png`" + (f" · `gonderiler/{g}_linkedin.png`" if "LI" in p["platform"] else "") + f"  \n**Başlık:** {clean(p['baslik'])}  \n**SEO anahtar kelimeler:** {p['kw']}  \n**Link (UTM):** {p['link']}  \n**Alt metin:** {p['alt_text']}  \n**Eşlik eden blog/site sayfası:** {p['blog']}\n")
        out.append("**Instagram / Facebook metni:**\n")
        out.append("```\n" + p["ig"] + "\n\n" + HASHTAG_SETS[p["hashtags"]] + "\n```\n")
        if "LI" in p["platform"] and p.get("li"):
            out.append("**LinkedIn metni (09:00):**\n")
            out.append("```\n" + p["li"] + "\n\n" + p["link"] + "\n\n" + li_hashtags(p) + "\n```\n")

        out.append("#### 18:30 · Story · IG + FB\n")
        out.append(f"**Görsel:** `gonderiler/{g}_story.png` (1080×1920)  \n**Etiketler:** {story_talimat(a)}  \n**Alt metin:** {story_alt_text(a, p)}\n")
    MD.write_text("\n".join(out), encoding="utf-8")


def write_csv():
    with CSV.open("w", newline="", encoding="utf-8-sig") as f:
        w = csv.writer(f, delimiter=";")
        w.writerow(["gun", "tarih", "saat", "slot", "platform", "tema", "baslik", "metin", "hashtagler", "link", "gorsel", "alt_metin", "seo_anahtar_kelimeler", "blog_onerisi"])
        for p in POSTS:
            g = f"gun{p['gun']:02d}"
            s, a = SABAH_BY_GUN[p["gun"]], AKSAM_BY_GUN[p["gun"]]
            for pl in ("IG", "FB"):
                w.writerow([p["gun"], p["tarih"], SABAH_SAAT, "sabah", pl, SABAH_TIP[s["tip"]], s["baslik"], sabah_ig(s),
                            HASHTAG_SETS[s["hashtags"]], SABAH_LINK, f"gonderiler/{g}_sabah.png", sabah_alt_text(s), s["kw"], ""])
            for pl in platforms(p):
                if pl == "LI":
                    text, tags, vis = p.get("li") or p["ig"], li_hashtags(p), f"gonderiler/{g}_linkedin.png"
                else:
                    text, tags, vis = p["ig"], HASHTAG_SETS[p["hashtags"]], f"gonderiler/{g}_kare.png"
                w.writerow([p["gun"], p["tarih"], SAAT[pl], "ana", pl, p["pillar"], clean(p["baslik"]), text, tags,
                            p["link"], vis, p["alt_text"], p["kw"], p["blog"]])
            for pl in ("IG", "FB"):
                w.writerow([p["gun"], p["tarih"], STORY_SAAT, "story", pl, "Story / anket", clean(p["baslik"]), story_talimat(a),
                            "", STORY_LINK, f"gonderiler/{g}_story.png", story_alt_text(a, p), p["kw"], ""])


if __name__ == "__main__":
    write_md()
    write_csv()
    print("ok", MD.name, CSV.name)
