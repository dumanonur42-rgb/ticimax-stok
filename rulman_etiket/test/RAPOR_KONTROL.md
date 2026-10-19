# Rulman Etiket — Kalite Kontrol Raporu (PC5)

İncelenen commit: **`874a223`** (dal `devin/rulman-etiket-ql550`) — **AŞAMA B, tam kontrol**.
Dalda olanlar: `etiket_cizim.py`, `TASARIM.md`, `yazdirma.py`, `rulman_etiket.py`, `arayuz.py`, `README.md`, `assets/`, `.github/workflows/rulman-etiket-exe.yml`.

Test aracı: `python rulman_etiket/test/kalite_kontrol.py --cikti <klasör>` (çıkış kodu 0/1, PNG + PDF + `sonuc.json`).
Son çalıştırma (874a223): **48 kontrol, 2 hatalı** — ikisi de aynı bulgu (ÖNEMLİ 1: bilgi satırı "…" ile kesiliyor), biri API, biri `rulman_etiket.py --pdf` üzerinden.
18 etiket örneği hem API hem CLI ile üretildi (iki boyut, adet 1/10/1000/99999, alt tekrar açık/kapalı, Türkçe bilgi, kısa/orta/uzun kod).
**Bütün Code128 ve DataMatrix okumaları birebir doğru** (±1 nokta termal yayılma/incelme benzetiminde de).
Ekran (arayuz.py) Xvfb altında açıldı: bozuk `ayarlar.json` ile sorunsuz açılıyor, küçük harf otomatik büyüyor, Türkçe harfli kodda anlaşılır uyarı çıkıyor.

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
1. **Referans fotoğraf (FAG deseni, Schaeffler EAN `4047643293488`, lot `0254X0511/...`) herkese açık repoda.**
   `rulman_etiket/test/onizleme/referans.jpg` ve onu içeren `test/onizleme/karsilastirma.png` (PC1, commit 619faee) — repo `public`.
   Etiketin kendisinde marka izi yok (logo/desen/EAN/lot yok, bilgi satırları varsayılan boş, exe'ye girmiyor), ama kural "hiçbir yerde örnek olarak geçmeyecek" diyor ve fotoğraf başka firmanın ürün görseli.
   Öneri: iki dosyayı daldan silin, `onizleme_uret.py` karşılaştırmayı sadece yerelde üretsin (dosya repoya girmesin, `.gitignore`). Dal main'e birleşmeden önce temizlenirse main geçmişine de girmez.

### ÖNEMLİ
1. **Uzun bilgi satırları etikette "…" ile kesiliyor, uyarı yok.** `etiket_cizim.py:349-354` — barkod tam genişliğe geçince (`genis`/`karekod`) kare kod bilgi satırlarının sağına iniyor,
   bilgi alanı ~38 mm'ye daralıyor ve `_tek_satir_sigdir` metni kesiyor. Örnek 15 (`NUP2315-E-XL-M1 C4` + 52 harflik bilgi): "Sipariş no: 2026/1458 - Müşteri: Örn…", "Teslim: Ostim OSB 1234. Cadde No:…".
   Ahmet'in yazdığı bilgi sessizce eksik basılıyor. Öneri: bu durumda kare kodu bilgi satırlarının altına (ya da alt tekrar ile arasına) koyup bilgiye tam genişlik verin; yine sığmazsa `uyarilar()` "Bilgi satırı kısaltıldı" desin.
2. **Kağıt ayarı değiştirilemezse baskı tamamen duruyor; kağıt kodları doğrulanmamış.** `yazdirma.py:311-365` — `PaperSize` 275 (62x100) ve 256 (sürekli) sabit sayılar; Brother sürücüsünde bu numaralar doğrulanmadı.
   Herhangi bir adım hata verirse `YazdirmaHatasi` atılıyor ve hiç basılmıyor. Ayrıca program ayar değişikliği sırasında kapanırsa yazıcının varsayılan kağıdı değişik kalıyor.
   Öneri: kağıt numarasını `win32print.DeviceCapabilities(..., DC_PAPERNAMES/DC_PAPERS)` ile adından bulun ("62mm x 100mm", "62mm"), bulunamazsa ayar değiştirmeden basmaya devam edin; PC4 gerçek yazıcıda iki boyutu da denesin.
3. **Referans kod (6308-C-2HRS C3) barkodu 2 noktalık çizgiyle (0,169 mm) basılıyor.** `etiket_cizim.py:281-284` — kare kod sağdayken 14+ karakter 3 noktaya sığmıyor (189 modül x 3 = 567 nokta > 516).
   Ekranda ve ±1 nokta benzetiminde okunuyor, ama termal baskıda alt sınırda. Öneri: PC4 gerçek etiketi el okuyucusuyla okutsun; okunmazsa 14+ karakterde barkodu tam genişliğe (3 nokta) alın.

### KÜÇÜK
1. Kısa kodlarda kod küçük kalıyor: `etiket_cizim.py:101` `kod_pt=20` sabit; "608" genişliğin ~%20'si, ortada ~50 mm boşluk. Öneri: kısa kodda puntoyu genişliğe göre 28-32'ye büyütün.
2. Kod alanının altındaki hata yazısı kesik görünüyor ("…(Türkçe harf kı"): `arayuz.py:718` — `kod_ipucu` tek satır. Öneri: `wraplength` verin ya da kısa metin gösterin.
3. Kod yazılı ama hatalıyken önizleme "Rulman kodunu yazınca etiket burada görünür" diyor (`arayuz.py:363-370`); kod zaten yazılı. Öneri: "Kodda hata var, aşağıdaki uyarıya bakın".
4. Bilgi satırları ayarlara kaydedilip sonraki açılışta dolu geliyor (`arayuz.py:589-590`, `:913-914`): eski kutunun bilgisi yeni kutuya yanlışlıkla basılabilir. Öneri: kalsın ama alanın yanında "önceki bilgi" diye belirgin gösterin ya da "Temizle" düğmesi ekleyin.
5. Enter her alanda yazdırıyor (`arayuz.py:640`) — bilgi satırı yazarken Enter'a basılırsa etiket çıkar. Tasarım gereği olabilir; README'de belirtin.
6. `cikti_klasoru()` klasör açılamazsa ham `OSError` fırlatıyor (`yazdirma.py:138-141`, `pdf_kaydet` `:262-263` try dışında). CLI'de Türkçe mesaj yerine hata dökümü çıkar. Öneri: `try` içine alıp `YazdirmaHatasi` verin.
7. Yazıcı listesi PowerShell çıktısından okunuyor (`yazdirma.py:33-52`): Türkçe harfli yazıcı adları bozuk gelebilir (konsol kod sayfası) ve her baskıda yeniden çağrılıyor (`:388`, 1-3 sn). `win32print` artık pakette; `EnumPrinters` kullanın.
8. Workflow test sürümü etiketi `rulman-etiket-test` (`rulman-etiket-exe.yml:99`) var olan etiketi yeni commit'e taşımıyor; exe güncellenir ama etiket eski commit'i gösterir. Öneri: yayından önce etiketi silip yeniden oluşturun.
9. Workflow exe ile PDF üretiyor ama barkodu okumuyor. Öneri: derlemeden sonra `python test/kalite_kontrol.py --cli-yok` adımı ekleyin.
10. `TASARIM.md` "her kenarda ~2 mm basılamaz" diyor; Brother'a göre yan 1,5 mm, uç 3 mm. Kenar 3,05 mm olduğundan sorun yok, belge düzeltilmeli.
11. Hiçbir `subprocess` çağrısı kabuk kullanmıyor, kullanıcı metni hep argüman listesiyle gidiyor (`yazdirma.py`, `arayuz.py`) — **komut enjeksiyonu yok**. Paketleme: font, zxing-cpp, win32print ve GDI modülleri exe'ye giriyor; `--kontrol` yazdırma modülünü denetliyor.

### Kullanılabilirlik (Xvfb ekranı)
İlk açılışta ne yapılacağı belli: başlıkta "Kodu yazın, Enter'a basın", imleç kod alanında, önizleme canlı, yazıcı yoksa altta "Brother QL-550'yi açıp USB kablosunu takın, sonra Yenile'ye basın."
Düğme ve alan adları sade Türkçe ("Yazdır", "PDF olarak kaydet", "Altta tekrar yazsın", "Son kullanılanlar"). Hata pencereleri anlaşılır.

## 3. Ölçüm özeti (kalite_kontrol.py)
- Sayfa: 62x100 → 62,0 x 100,0 mm; 62surekli → alt tekrar açıkken 80 mm, kapalıyken 30 mm (25-1000 mm sınırı içinde).
- Kenar boşlukları (sol/üst/sağ/alt): en az 3,0 / 3,0 / 3,1 / 3,3 mm → 1,5 mm (yan) ve 3,0 mm (uç) sınırının içinde.
- Üst üste binme, kesik harf, sayfa dışına taşma: yok.
- Alt tekrar açık/kapalı doğru çalışıyor; adet 1/10/1000/99999 doğru yazılıyor ve DataMatrix'te doğru.
- Garip giriş (satır sonu, sekme, emoji, Türkçe harfli kod, 60+ karakter bilgi, 15+ karakter ek) çökme olmadan Türkçe hata ile reddediliyor.

## 4. Windows'ta (PC4) mutlaka denenecekler
- 6308-C-2HRS C3 ve 22320-E1-XL-K-T41A C3 barkodunu gerçek etiketten el okuyucusuyla okutmak (ÖNEMLİ 3).
- 62x100 ve 62 sürekli seçimlerinde yazıcı kağıt ayarının doğru değişip geri döndüğü (ÖNEMLİ 2).
- Belgeler klasörü OneDrive'a taşınmış ve kullanıcı adında Türkçe harf/boşluk olan hesapta PDF kaydetme.
