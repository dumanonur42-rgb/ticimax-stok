# Burçlu V kasnak çizim modülü

Güncel çizim/PNG commit: `8b9e4e7d8162b9649d89b0786315f76eeae90e6c`.
İlk çizim/fixture commit: `e2dc2151be6ee666a606e0f629290bc01d8d784d`.
Dal: `draw/burclu_kasnak`; taban: `origin/site-assets`; worktree: `/home/ubuntu/work/draw_wt`.
Ana checkout `orkapt/burclu_kasnak` üzerinde ve değişmeden kaldı. Ticimax paneli/yükleme ve PR işlemi yapılmadı.

## Veri kararları

- `/home/ubuntu/work/veri.py` ve `veri.jsonl` güncellendi; 519 benzersiz ürün.
- `KYS BK SPB1803`: MARKA=KYS. Kaynak: https://www.kys.com.tr/tr/urunler/burclu-v-kasnaklar?tablo=spb-3 ; resmi SPB 180-3 / 2517 satırı: P=180, O=187, tip=2, F=63, J=137, L=45, M=18. Resmi satırda bulunmayan maksimum mil, E, K, N null; katalogdan doldurulmadı.
- Orka satırı bulunan ürünlerde Orka esas. Katalog farkları `/home/ubuntu/work/veri_kontrol.json` içinde korunuyor.
- 11 eksik ürünün tipi null; gövde grubu yok. Bunlar zorunlu ölçüler eksik olduğu için çizilmiyor.
- Teknik kaynaktan ayrı çizim verisi/tahmini ölçü deposu eklenmedi. Gösterilen ölçülerin tamamı ctx verisi; sabit oranlar yalnız şekil içindir.
- HTK SPA-4-100 satırındaki K=70, tip 2 için F=L+M ilişkisinin parçası değildir (65=38+27). Kaynak değer korunur, eksenel taşma/girinti mesafesi gibi çizilmez; yönlendirme etiketi kullanılır. K'nin HTK kaynağındaki fiziksel tanımı bağımsız doğrulanmadı.

## Geometri ve kontroller

Tip 1: L=F+M; tip 2: F=L+M; tip 3/5/6: F=K+L+M; tip 4/7: L=F+K+M; tip 8/9: F=K+L.
Eksik K/M varsa yalnız şekil yerleşimi türetilir, yeni sayı/keys üretilmez. Çelişen eksenel ölçüler null.
Tip 9 olukları kanallı K kısmında; tip 4/5 kollu, tip 6/7 E kalınlıklı diskli. Mil etiketi maksimum mil kapasitesidir, gerçek işlenmiş delik çapı iddiası değildir.

Çalıştırılan kontroller:

```text
PASS: 519 benzersiz ürün; KYS resmi değerleri ve MARKA=KYS; 11 eksik ürünün gövde tipi null
PASS 40/40 fixtures; 14 SVG, 26 null; ES5, ids, keys, optional omissions
PASS 14 SVG geometry: hatched section halves, axis symmetry, channel-count V grooves at 38 degrees, front keyways, no white arm overlays
PASS 28 headless Chrome PNG; text boxes: no overlaps at 460/360px
```

Node: `node /home/ubuntu/work/burclu_check.js`; render: `python3 /home/ubuntu/work/burclu_render.py`.
Kontrol yardımcıları worktree dışında, `/home/ubuntu/work/` altında. Önizleme dosyası kendi fixturelarını içerir; `?f=0&w=360` ile tek örnek açılır.
Headless Chrome CDP hedefi `type=page` olarak seçildi; SVG yüklenmesi ve gerçek ölçü metni sayısı doğrulandı.
İlk yakalama yanlışlıkla Chrome toolbar hedefini seçmişti; o PNG'ler geçersiz sayılıp tamamı yeniden üretildi.
Gerçek renderde bulunan Tip/F yazı çakışması ve önizleme kaydırma çubuğu/kırpılması giderildi.

## Görsel kalite revizyonu

- Tip 4/5 kesitindeki beyaz kol maskesi kaldırıldı. J çapında iç kenarlı taranmış jant, N çapında/L uzunluğunda taranmış göbek ve aradaki dar taranmış kol bağlantısı tek kapalı kesit sınırıyla çiziliyor. Diskli tiplerde aynı sınır E kalınlıklı ağı içeriyor.
- Konik burç yuvası taramasız ve eksene simetrik. Çok küçük gerçek radyal oranlarda okunurluk için şematik minimum göbek/jant et kalınlığı kullanılır; ölçü değerleri değişmez. K/M eksenel yerleşimleri gerçek F/L ilişkisini korur.
- Her kanal tek sivri V oluğu; iki yanak arasındaki açı 38 derece. Oluk aralığı F/kanal, tip 9'da kanallı K/kanal üzerinden hesaplanır. Oluk derinliği jantın içinde sınırlanır.
- Küçük K/M mesafelerinde dışarıdan oklar; kısa uzatma çizgileri ve kesit yanındaki etiketler kullanılır. L alt sırada, Burç ve Tip açıklamaları ortak y=250 taban çizgisindedir.
- Ön görünüşte kanal halkaları, N göbeği, kama çentikli burç deliği ve J'ye kadar uzanan kollar bulunur. Kama ölçüsü tahmin edilip yazılmaz.

Tüm 28 PNG yeniden üretildi. 460 ve 360 genişliklerinin tamamı montaj halinde gözle incelendi: metin çakışması, kesik footer veya taranmamış kollu jant görülmedi; K/M taşma/girinti yönleri kontrol edildi.
Geometri kontrolü her SVG için iki taranmış yarıyı, eksen simetrisini, kanal adedi kadar simetrik 38 derecelik V oluğu ve kama işaretini ayrıca doğruladı.
Şekiller üretim resmi değil, şematik teknik görseldir.

## Dört örnek (farklı kanal sayıları)

| Tip | Ürün | Kanal | 460px PNG | 360px PNG |
|---|---|---:|---|---|
| 1 | ORK BK SPZ0631 | 1 | ../preview/burclu_kasnak/00-460.png | ../preview/burclu_kasnak/00-360.png |
| 4 | ORK BK SPB8005 | 5 | ../preview/burclu_kasnak/03-460.png | ../preview/burclu_kasnak/03-360.png |
| 6 | ORK BK SPA1802 | 2 | ../preview/burclu_kasnak/05-460.png | ../preview/burclu_kasnak/05-360.png |
| 8 | ORK BK SPA0713 | 3 | ../preview/burclu_kasnak/07-460.png | ../preview/burclu_kasnak/07-360.png |

SPC 1000×10: `../preview/burclu_kasnak/09-460.png` ve `09-360.png`.
Her tip 1–9 ile üç HTK örneğinin iki genişlikte PNG'si var.

## Fixture sonuçları

26 null: 11 eksik gerçek ürün, 5 aile dışı ürün, 7 zorunlu alanı eksiltilmiş örnek, 2 geçersiz/çelişkili örnek ve 1 boş ctx.

| Kod | Tip | Match | Sonuç | Null nedeni |
|---|---|---|---|---|
| ORK BK SPZ0631 | Tip 1 | true | svg | — |
| ORK BK SPA1003 | Tip 2 | true | svg | — |
| ORK BK SPB1254 | Tip 3 | true | svg | — |
| ORK BK SPB8005 | Tip 4 | true | svg | — |
| ORK BK SPA3554 | Tip 5 | true | svg | — |
| ORK BK SPA1802 | Tip 6 | true | svg | — |
| ORK BK SPA1801 | Tip 7 | true | svg | — |
| ORK BK SPA0713 | Tip 8 | true | svg | — |
| ORK BK SPZ0561 | Tip 9 | true | svg | — |
| ORK BK SPC100010 | Tip 5 | true | svg | — |
| KYS BK SPB1803 | Tip 2 | true | svg | — |
| ORK BK SPC1403 | — | true | null | Zorunlu O, F, L ve tip eksik; gövde grubu atanmadı |
| ORK BK SPC1404 | — | true | null | Zorunlu O, F, L ve tip eksik; gövde grubu atanmadı |
| ORK BK SPC1503 | — | true | null | Zorunlu O, F, L ve tip eksik; gövde grubu atanmadı |
| ORK BK SPC1504 | — | true | null | Zorunlu O, F, L ve tip eksik; gövde grubu atanmadı |
| ORK BK SPC1603 | — | true | null | Zorunlu O, F, L ve tip eksik; gövde grubu atanmadı |
| ORK BK SPC1604 | — | true | null | Zorunlu O, F, L ve tip eksik; gövde grubu atanmadı |
| ORK BK SPC1703 | — | true | null | Zorunlu O, F, L ve tip eksik; gövde grubu atanmadı |
| ORK BK SPC1704 | — | true | null | Zorunlu O, F, L ve tip eksik; gövde grubu atanmadı |
| ORK BK SPC1803 | — | true | null | Zorunlu O, F, L ve tip eksik; gövde grubu atanmadı |
| ORK BK SPZ2361 | — | true | null | Zorunlu O, F, L ve tip eksik; gövde grubu atanmadı |
| ORK BK SPZ2362 | — | true | null | Zorunlu O, F, L ve tip eksik; gövde grubu atanmadı |
| HTK SPA-4-100 |  2 | true | svg | — |
| HTK SPA-1-75 |  1 | true | svg | — |
| HTK SPB-1-125 |  1 | true | svg | — |
| Burçlu Triger Kasnak | Tip 1 | false | null | Ürün ailesi dışında |
| Kör V Kasnak | Tip 1 | false | null | Ürün ailesi dışında |
| 6307 ZZ C3 Rulman | Tip 1 | false | null | Ürün ailesi dışında |
| Burçlu Zaman Kasnak | Tip 1 | false | null | Ürün ailesi dışında |
| Dolu-delikli Burçlu Kasnak | Tip 1 | false | null | Ürün ailesi dışında |
| Eksik: Profil | Tip 1 | true | null | Zorunlu alan eksik: Profil |
| Eksik: Kanal Sayısı | Tip 1 | true | null | Zorunlu alan eksik: Kanal Sayısı |
| Eksik: Anma Çapı (P) | Tip 1 | true | null | Zorunlu alan eksik: Anma Çapı (P) |
| Eksik: Dış Çap (O) | Tip 1 | true | null | Zorunlu alan eksik: Dış Çap (O) |
| Eksik: Kasnak Genişliği (F) | Tip 1 | true | null | Zorunlu alan eksik: Kasnak Genişliği (F) |
| Eksik: Göbek Uzunluğu (L) | Tip 1 | true | null | Zorunlu alan eksik: Göbek Uzunluğu (L) |
| Eksik: Gövde Tipi | — | true | null | Zorunlu alan eksik: Gövde Tipi |
| Çelişen F | Tip 1 | true | null | Çelişen/geçersiz teknik veri |
| Geçersiz kanal | Tip 1 | true | null | Çelişen/geçersiz teknik veri |
| Boş ctx | — | false | null | Boş veri |
