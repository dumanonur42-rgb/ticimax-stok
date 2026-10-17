# Rulman Etiket — Kalite Kontrol Raporu (PC5)

İncelenen commit: `74fe0c4` (dal `devin/rulman-etiket-ql550`) — **AŞAMA A, ara rapor**.
Dalda şu an sadece `etiket_cizim.py`, `fonts/`, `requirements.txt` var. `yazdirma.py`, `arayuz.py`,
`rulman_etiket.py`, `README.md` ve workflow henüz gelmedi; tam kontrol (AŞAMA B) onlar gelince yapılacak.

Test aracı: `python rulman_etiket/test/kalite_kontrol.py --cikti <klasör>` (çıkış kodu 0/1, PNG + PDF + `sonuc.json`).
Son çalıştırma: **30 kontrol, 0 hatalı** (18 etiket örneği + doğrulama/sınır/kopya testleri; CLI atlandı çünkü `rulman_etiket.py` yok).

## 1. Brother QL-550 teknik sınırları (resmi kaynak)

| Konu | Değer | Kaynak |
|---|---|---|
| Baskı yöntemi / çözünürlük | Doğrudan termal, 300 dpi (1 nokta = 0,0847 mm) | Brother QL-550 teknik özellikleri [1] |
| Baskı kafası | 720 nokta (61 mm civarı) | [1], [2] |
| 62 mm rulo | 732 noktalık alan, **696 nokta basılabilir** (58,9 mm), her yanda 12 nokta (≈1,5 mm) basılamaz | Raster komut kılavuzu [2] |
| DK-11202 62 x 100 mm | Basılabilir 58,9 x 93,9 mm; yan boşluk 1,5 mm, uç (üst/alt) boşluk 3,0 mm | [2] |
| Sürekli rulo (DK-22205) | En kısa 25 mm, en uzun 1000 mm (QL-550) | [2], [3] |
| Tek işte etiket | QL-550 bir işte en fazla 500 etiket basabiliyor (SSS) | [4] |
| Barkod en ince çizgi | Brother ayrı bir değer vermiyor. 300 dpi'de çizgi tam nokta katı olmalı; 1 nokta (0,085 mm) termalde okunmaz, **2 nokta (0,169 mm) alt sınır**, 3 nokta (0,254 mm) rahat okunur. | [2] + genel barkod kuralı (GS1/ISO 15417: X ≥ 0,19 mm önerilir) |

Kaynaklar:
1. https://support.brother.com/g/b/spec.aspx?c=us&lang=en&prod=lpql550eus
2. https://download.brother.com/welcome/docp000678/cv_qlseries_eng_raster_600.pdf
3. https://help.brother-usa.com/app/answers/detail/a_id/154510
4. https://support.brother.com/g/b/faqend.aspx?c=us&faqid=faqp00100409_000&lang=en&prod=lpql550eus

Barkod çözünürlük hesabı: uygulama tasarımı doğrudan 300 dpi nokta ızgarasında yapıyor (`etiket_cizim.py` `NOKTA`, `CUBUK_MODUL = (3, 2)`).
Ölçülen modül genişlikleri: 3 nokta = 0,254 mm (600 dpi'de 6 nokta) ve 2 nokta = 0,169 mm (600 dpi'de 4 nokta) — ikisi de **tam nokta katı**,
yarım nokta kayması yok. İçerik genişliği 660 nokta (sol/sağ 36 nokta) → 696 basılabilir noktanın içinde, 720'lik kafa sınırına hiç yaklaşmıyor.

## 2. Bulgular

### KRİTİK
- (şimdilik yok) Marka kuralı ihlali bulunmadı: logo/desen/X-life yok, EAN/GTIN veya `4047643...` yok, örnek lot numarası yok, bilgi satırları varsayılan boş.
  Tüm örneklerde Code128 ve DataMatrix zxing-cpp ile birebir doğru çözüldü (±1 nokta termal yayılma/incelme benzetiminde de).

### ÖNEMLİ
1. **Referans kod (6308-C-2HRS C3) barkodu 2 noktalık modülle basılıyor (0,169 mm).** `etiket_cizim.py:281-283` — kare kod sağda kalınca 14 karakterlik
   metin 3 noktaya sığmıyor (189 modül x 3 = 567 nokta > 516). Ekranda çözülüyor ama gerçek QL-550 baskısında el okuyucusuyla denenmeli (PC4).
   Öneri: PC4 testinde 6308-C-2HRS C3 ve 22320-E1-XL-K-T41A C3 etiketlerini okuyucuyla okut; okunmazsa uzun kodlarda "genis" düzene (barkod tam genişlik, 3 nokta) geç.
2. **Kod uzunluğu sınırı sözleşmeyle uyuşmuyor.** `etiket_cizim.py:124` `MAX_KOD = 40`, fakat ölçümde ek=C3 ile en uzun kabul edilen kod **24 karakter**;
   25-40 karakter "Kod barkoda sığmıyor; daha kısa yazın." ile reddediliyor (`:288`). Çökme yok, ama ekrandaki "en fazla 40" bilgisi yanıltır.
   Öneri: arayüzde/README'de gerçek sınırı yazın ya da hata metnine "en fazla 24 karakter civarı" ekleyin.
3. **Uzun bilgi satırları kare koda sessizce eklenmiyor.** `etiket_cizim.py:273-276` — sözleşme "DataMatrix = metin + adet + bilgi satırları" diyor;
   iki bilgi satırı uzunsa (örnek 15) bilgi kare koddan çıkarılıyor, sadece `uyarilar()` ile bildiriliyor. Öneri: arayüz (PC3) bu uyarıyı mutlaka göstermeli; gösterilmezse kritik say.

### KÜÇÜK
1. **Kısa kodlarda kod çok küçük kalıyor.** `etiket_cizim.py:101` `kod_pt=20` sabit. "608" etiketin %20'sini kaplıyor, referansta kod genişliğin büyük kısmını dolduruyor;
   62x100'de ortada ~50 mm boşluk kalıyor. Öneri: kısa kodlarda puntoyu genişliğe göre 28-32'ye kadar büyüt.
2. `ciz()` hata durumunda `EtiketHatasi` (ValueError) fırlatıyor (`:482`); sözleşmede yok. Arayüz/CLI bunu yakalamalı (AŞAMA B'de kontrol edilecek).
3. Barkod altı yazının sol başlangıcı en az `KENAR*0.5` = 18 nokta (1,52 mm) (`:445`) — 1,5 mm sınırının tam üstünde; ölçümlerde sorun çıkmadı.
4. `TASARIM.md` dalda yok.

## 3. Ölçüm özeti (kalite_kontrol.py)
- Sayfa: 62x100 → 62,0 x 100,0 mm; 62surekli → alt tekrar açıkken 80 mm, kapalıyken 30 mm (25-1000 mm sınırı içinde).
- Kenar boşlukları (sol/üst/sağ/alt): en az 3,0 / 3,0 / 3,1 / 3,3 mm → 1,5 mm (yan) ve 3,0 mm (uç) sınırının içinde.
- Üst üste binme, kesik harf, sayfa dışına taşma: yok.
- Alt tekrar açık/kapalı doğru çalışıyor; adet 1/10/1000/99999 doğru yazılıyor ve DataMatrix'te doğru.
- Garip giriş (satır sonu, sekme, emoji, Türkçe harfli kod, 60+ karakter bilgi, 15+ karakter ek) çökme olmadan Türkçe hata ile reddediliyor.

## 4. AŞAMA B'de bakılacaklar
yazdirma.py (SumatraPDF argüman listesi, OneDrive Belgeler, bozuk ayarlar.json, yazıcı listesi hatası), arayuz.py (Xvfb ekran görüntüsü, sade Türkçe),
rulman_etiket.py `--pdf` / `--kontrol`, PyInstaller paketleme (font, zxing-cpp DLL, SumatraPDF), workflow.
