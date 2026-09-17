# Yamansa Rulman B2B – Masaüstü Uygulaması

Bayilerin stok görüp sipariş verdiği, kurulumlu (Windows `.exe`) rulman B2B uygulaması.
Veriler bilgisayarda yerel SQLite dosyasında tutulur; internet gerekmez.

- **10.000+ ürün** – SQLite + FTS5 trigram arama, sanal liste (virtualized). Aramalar 12.000 üründe ~3–6 ms.
- **Stok listesi içe aktarma** – Excel/CSV, Türkçe başlıklar otomatik eşlenir (Stok Kodu, Ürün Adı, Marka, İç Çap, Dış Çap, Genişlik, Stok, Fiyat…).
  Modlar: güncelle/ekle, sadece stok-fiyat, tümünü değiştir.
- **Rulman odaklı arama** – stok kodu / muadil / barkod; boşluk, tire ve Türkçe karakter duyarsız; d × D × B ölçü filtreleri.
- **Sepet & sipariş** – bayi iskontosu, KDV, stok düşümü, iptal ile geri alma, Excel ve yazdırma.
- **Roller** – Yönetici, Satış, Bayi (bayi yalnızca kendi siparişlerini görür).
- **Erişilebilirlik** – klavye ile tam kullanım (Ctrl+K, F2, Alt+1..8, ok tuşları, `+`), ARIA grid, ekran okuyucu bildirimleri,
  açık/koyu/yüksek kontrast tema, yazı boyutu, azaltılmış hareket, sıkışık görünüm.
- **Yedekleme** – tek dosya yedek al / geri yükle.

Varsayılan giriş: `admin` / `admin` (ilk girişten sonra Ayarlar → Şifre'den değiştirin).

## Geliştirme

```bash
cd b2b-app
npm install
npm run dev          # canlı geliştirme
npm run typecheck
npm run selfcheck    # başsız: 12.000 örnek ürün yükler, arama sürelerini ölçer
```

## Windows kurulum dosyası (.exe)

Windows makinede:

```bash
npm install
npm run dist:win     # dist/Yamansa Rulman B2B-Kurulum-<sürüm>-x64.exe
```

Ya da GitHub Actions: `b2b-app/` altındaki her değişiklikte **B2B App – Windows Installer** iş akışı çalışır ve
kurulum dosyasını "Artifacts" olarak yükler. `b2b-v1.0.0` gibi bir etiket atılırsa kurulum dosyası Release'e eklenir.

> Linux üzerinden çapraz derleme desteklenmez (yerel `better-sqlite3` modülü Windows için derlenmez); Windows CI kullanın.

## Veri konumu

`%APPDATA%\yamansa-rulman-b2b\data\yamansa-b2b.sqlite` (Windows). Yedek/geri yükleme Ayarlar → Yedekleme'den yapılır.
