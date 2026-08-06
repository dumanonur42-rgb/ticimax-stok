# Talha Teknik B2B → Ticimax Ürün/Stok Senkronizasyonu

Bu yazılım, `talhateknik.diaeticaret.com/b2b` bayi sitesindeki **matkap** ürünlerini
çekip Ticimax'a aktarılabilir dosyalar üretir ve stokları günlük takip eder.

## Ne üretir?

Her çalıştırmada `output/` klasörüne:

| Dosya | Açıklama |
|---|---|
| `ticimax_urunler.xml` | Ticimax **XML ile ürün aktarımı** için ürün listesi (ad, stok kodu, stok adedi, fiyat, KDV, kategori yolu, görsel) |
| `urunler.csv` | Excel ile açılabilir kontrol listesi (noktalı virgülle ayrılmış) |
| `stok_degisimleri.csv` | Bir önceki çalıştırmaya göre stoğu değişen ürünler |

Kategori yapısı: ana kategori **MATKAP VE FREZE**, altında B2B sitesindeki
yapıya uygun alt kategoriler (HSS MATKAP UÇLARI, KARBÜR MATKAP UÇLARI,
HSS PUNTA MATKAP UÇLARI, KADEMELİ SAÇ MATKAPLARI, BOHRCRAFT MATKAP UÇLARI, ...).
`sync.py` içindeki `CATEGORIES` listesinden kategori ekleyip çıkarabilirsiniz.

## Kurulum

```bash
pip install requests
```

`.env` dosyası oluşturun (bu klasörde):

```
TALHA_B2B_USER=bayi-kodunuz
TALHA_B2B_PASS=şifreniz
```

## Çalıştırma

```bash
python3 sync.py
```

## Günlük otomatik çalıştırma (Linux cron)

```bash
crontab -e
# her gün sabah 07:00'de:
0 7 * * * /bin/bash /tam/yol/talha-ticimax-sync/gunluk_calistir.sh >> /tam/yol/talha-ticimax-sync/sync.log 2>&1
```

Windows'ta "Görev Zamanlayıcı" ile `python sync.py` günlük çalıştırılabilir.

## Ticimax'a aktarma

1. Ticimax yönetim paneli → **Ürünler → XML ile Ürün Aktarımı** (Entegrasyon → XML İçe Aktarım).
2. `output/ticimax_urunler.xml` dosyasını yükleyin veya bu dosyayı bir web adresinde
   yayınlayıp URL'yi tanımlayın (URL tanımlarsanız Ticimax her gün otomatik çeker —
   stok güncellemesi için önerilen yöntem budur).
3. Alan eşleştirmesinde: `UrunAdi`, `StokKodu`, `StokAdedi`, `SatisFiyati`,
   `KdvOrani`, `ParaBirimi`, `KategoriYolu` (ayraç `>`), `Resim` alanlarını seçin.
4. Fiyatlar B2B liste fiyatıdır (çoğunlukla EUR, KDV hariç). TL karşılığı
   `FiyatTL` alanında günün kuru ile hesaplanmıştır; satış fiyatınızı kâr
   marjınıza göre Ticimax tarafında çarpanla belirleyebilirsiniz.

## Notlar

- Stok adedi B2B panelde bayiye gösterilen `b2b_stock_qty` değeridir.
- Ürünler ID bazında tekilleştirilir; aynı ürün iki kategoride ise ilk kategori kullanılır.
- Site istek limiti koyarsa script otomatik bekleyip yeniden dener.
