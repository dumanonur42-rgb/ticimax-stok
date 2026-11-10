# Orkapt rulman yeni ürünler — rapor

Kaynak: `parca/rulman.jsonl.gz` (orkapt-girdi). Ticimax'e hiçbir şey yüklenmedi.

## Sayılar
- Toplam ürün: **214** (mükerrer kod: yok)
- Görsel: birebir **116**, aynı tip **98**, görselsiz **0**
- Eksik ana ölçü (d/D/B ya da L/T): **0**
- Yük/devir verisi olmayan (resmi marka kaynağında birebir sonek bulunamadı, yazılmadı): **92** — bayrak `eksik_yuk_devir`
- Yeni kategori önerisi: **0** (hepsi mevcut kategorilere girdi)
- Markalar: SKF 121, Yamansa 32, URB 18, ETERNO 12, RBE 6, ARASHİ 5, ECO 5, ORB 4, BETE 3, JPN 3, ZKL 2, DYZV 1, KBC 1, KG 1
- Kategoriler: RULMAN>SABİT BİLYALI RULMANLAR>TEK SIRALI SABİT BİLYALI RULMANLAR (136); RULMAN>OYNAK MAKARALI RULMANLAR (75); RULMAN>KONİK MAKARALI RULMANLAR>30000 SERİSİ KONİK MAKARALI RULMANLAR (2); LİNEER>LİNEER RULMANLAR (1)

## Teknik veri kaynakları
- SKF (121): skf.com resmi ürün sayfaları (ölçü, C, C0, referans/limit devir, ağırlık).
- Diğer markalar ve Yamansa: aynı baz kodun ISO 15 / ISO 355 sınır ölçüleri (Schaeffler resmi kataloğu); konik 32215/32220 B ve C ölçüsü URB resmi kataloğu; 6917 NTN resmi katalog; KH1630PP = INA KH16-PP resmi kayıt (eşdeğerlik ABF). Başka markanın yük/devir değeri kopyalanmadı.
- Ayrıntı: `work/teknik.json`, `work/teknik_log.md`.

## Görseller
- SKF: ürünün kendi kodlu satış fotoğrafı (bearing-king.co.uk). 7 SKF üründe kodlu foto yok → aynı kapak tipinde SKF fotoğrafı (`gorsel_ayni_tip_skf`).
- Diğer: logo/filigran/kutu olmayan aynı görünüşlü fotoğraflar (kapak ZZ / conta 2RS, çelik kafes / pirinç kafes, silindirik / konik delik ayrı). Reddedilenler: filigranlı (simply, bearingrevolution), logolu (INA), kutulu (nbc).
- Hepsi `sablon.png` logolu bandına oturtuldu, 500x500 JPG, arka plan silindi.

## Teknik çizim
- 214/214 ürün site çizim modülüyle çiziliyor (ACIKLAMA teknik listesi ile ctx test edildi): bilyali 136, makarali 75, konik 2, lineer_kh 1.
- KH için yeni modül `site/draw/lineer_kh.js` — branch `draw/rulman` (fixtures, preview png, rapor dahil; PR açılmadı).
- Not: makarali.js başlıkta "KONİK" görünce çizmiyor; bu yüzden konik delikli oynak rulmanların adına "Konik Delik" yazılmadı (K eki kodda, açıklamada var).

## Dikkat edilecekler (bayraklar)
- `kafes_belirsiz` (6): JPN 22206, URB 22215, URB 23044, URB 23048, URB 23218, URB 24026 — kodda/adda kafes yok; görsel çelik kafes, açıklamada not var.
- `kod_ad_celiski`: SKF 62012RS1 — SKF 62012RS1: kod C3'süz, Orkapt adı ile çelişki; C3'süz 6201-2RS1 olarak hazırlandı.
- `skf_varyant_belirsiz`: SKF 62102RS — SKF'de 2RSH ve 2RS1 ikisi de var; 2RSH esas alındı.
- `gorsel_ayni_tip_skf`: SKF 6313ZZC3, SKF 63142RSC3, SKF 6314ZZC3, SKF 63152RSC3, SKF 63162RSC3, SKF 6318ZZC3, SKF 6314ZZ
- URB 22217 MB33C3 kodu girdideki gibi bırakıldı (muhtemelen MBW33C3).
- Paket/koli ifadesi yok; teknik listede "Satış Birimi: Adet".

## Otomatik denetim (qa.py) — HATA YOK
Alanlar dolu, SEO başlık ≤60, açıklama ≤155, anahtar kelime ≤950, ACIKLAMA ≥1800 karakter (düz metin), Kullanım Alanları + teknik liste var, 2-4 iç link (hepsi katurl.txt'de), kategori site_kategoriler.txt'de, ORKA/ORKAPT geçmiyor, U+0307 yok, "—" yok, görsel var ve 500x500 JPEG, ASCII dosya adı, teknik kaynak URL var, ürünler arası birebir tekrar eden paragraf 0.
