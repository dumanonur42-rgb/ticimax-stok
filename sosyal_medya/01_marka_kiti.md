# Yamansa Rulman – Sosyal Medya Marka Kiti

## Kimlik
- **Marka:** Yamansa Rulman (YAMANSA RULMAN İTHALAT SAN. VE DIŞ TİC. LTD. ŞTİ.)
- **Kuruluş:** 1986 – 40 yıla yakın rulman ithalat ve distribütörlük tecrübesi
- **Konum:** İkitelli OSB, Heskop San. Sit. M4 Blok No:47, Başakşehir / İstanbul
- **Telefon:** 0212 670 02 05
- **Web:** https://www.yamansarulman.com
- **Konumlandırma:** "Rulmanda doğru ölçü, doğru marka, doğru fiyat – stoktan aynı gün kargo."
- **Ürün odağı:** Sabit bilyalı rulmanlar (ZZ / 2RS), motosiklet & scooter rulmanları, SKF – FAG – ORS – NMB – TPI ve Yamansa markalı setler, sanayi tipi rulmanlar (silindirik/konik makaralı, oynak bilyalı, geniş kesitli).

## Ton & Dil
- Teknik ama anlaşılır. "Usta"ya da mühendise de hitap eder.
- Kısa cümleler, rakamlar, ölçüler. Abartı yok, güven var.
- Her gönderi bir **fayda** + bir **çağrı (CTA)** içerir: "Ölçünü yaz, stoktan gönderelim", "Kataloğa göz at", "Fiyat için DM".
- Emoji: en fazla 1–2, sadece Instagram/Facebook'ta. LinkedIn'de emoji yok.

## Renk Paleti (logodan türetildi)
| Kullanım | Renk | HEX |
|---|---|---|
| Ana (lacivert – logo yazısı) | Yamansa Navy | `#011B54` |
| Derin zemin | Midnight | `#070F2B` |
| Vurgu mavi (logo küre) | Globe Blue | `#1E5BD6` |
| Metal / çelik | Steel | `#B8C0CC` |
| Açık zemin | Mist | `#F2F4F8` |
| Enerji vurgusu (az kullan) | Signal Orange | `#FF6A00` |
| Metin koyu | Ink | `#0B1220` |

## Tipografi
- **Başlık:** Montserrat 800/900 (büyük harf, sıkı satır aralığı, -0.02em letter-spacing)
- **Metin / alt bilgi:** Inter 400–600
- Rakamlar ve ölçüler (6204, 25x52x15) her zaman tabular ve kalın.

## Görsel Dil (tasarımcı dokusu, "yapay zeka" görünümü YOK)
- Gerçek ürün ve sanayi fotoğrafları (Pexels lisanslı, ticari kullanım serbest) + tipografik düzen.
- Sert grid, büyük başlık, ince çizgi ayraçlar, köşe etiketleri ("SERİ 6200", "ZZ / 2RS").
- Fotoğrafın üzerine lacivert → şeffaf gradyan; metin her zaman okunur.
- Her görselde sol üstte logo, sağ altta `yamansarulman.com`.
- Sabit şablonlar: **Hero**, **Split (yarı foto / yarı metin)**, **Ürün Kartı**, **İstatistik / Bilgi**, **Alıntı**, **Karşılaştırma (ZZ vs 2RS)**, **Marka Vitrini**.

## Formatlar
| Platform | Gönderi | Ölçü |
|---|---|---|
| Instagram & Facebook | Kare | 1080×1080 |
| Instagram Story / Reels kapak | Dikey | 1080×1920 |
| LinkedIn | Yatay | 1200×627 |
| Profil fotoğrafı (tümü) | Kare | 1080×1080 (küre + YAMANSA) |
| Facebook kapak | | 1640×624 |
| LinkedIn kapak | | 1128×191 (×2 = 2256×382) |
| YouTube Shorts / TikTok / Reels video | Dikey | 1080×1920, 30 fps, H.264 |

## Logo Dosyaları
- `logo_yamansa.png` – küre + YAMANSA yazısı, 1482×433 şeffaf (kaynak: yamansarulman.com resmi logo)
- `logo_icon.png` – yalnız küre, 488×421 şeffaf

## Dosya Yapısı
```
sosyal_medya/
├── 01_marka_kiti.md            bu dosya
├── 02_icerik_takvimi.md        30 günlük plan – metinler, hashtag, link, alt metin
├── 03_hesap_kurulum_rehberi.md bio/hakkında metinleri, kullanıcı adları, SEO adımları
├── icerik_takvimi.csv          aynı plan, planlama araçlarına (Meta Business Suite, Buffer…) import için
├── icerik_verisi.py            planın tek kaynağı (görsel + takvim buradan üretilir)
├── gorsel_uret.py              HTML/CSS -> PNG (Playwright + Chrome)
├── takvim_uret.py              icerik_verisi -> MD + CSV
├── video_uret.py               9:16 örnek tanıtım videosu (Playwright + ffmpeg)
├── pexels_ara.py               stok fotoğraf arama yardımcısı
├── fotolar/                    Pexels fotoğrafları (ticari kullanım serbest)
├── gonderiler/                 gunXX_kare.png (IG/FB), gunXX_linkedin.png (LI)
│   └── marka/                  profil, kapak ve highlight görselleri
└── video/                      yamansa_tanitim_9x16.mp4
```

## Yeniden üretme
```bash
pip install playwright pillow && sudo apt install ffmpeg
cd sosyal_medya
python3 gorsel_uret.py --marka   # tüm görseller
python3 takvim_uret.py           # takvim MD + CSV
python3 video_uret.py            # örnek video
```
