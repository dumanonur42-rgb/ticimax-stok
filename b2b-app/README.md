# Yamansa Rulman B2B – Masaüstü Uygulaması

Bayilerin stok görüp sipariş verdiği, kurulumlu (Windows `.exe`) rulman B2B uygulaması.
Ürünler, stoklar, bayiler, kullanıcılar, siparişler ve iş ayarları **tek bir ortak bulut veritabanında** (Supabase Postgres,
Frankfurt) tutulur; yöneticiler yönetir, her kurulum aynı veriyi görür. Bilgisayarda yalnızca hızlı arama için ürünlerin
bir kopyası (SQLite + FTS5) saklanır ve bulutla otomatik eşitlenir (Realtime + periyodik).

- **10.000+ ürün** – SQLite + FTS5 trigram arama, sanal liste (virtualized). Aramalar 12.000 üründe ~3–6 ms.
- **Stok listesi içe aktarma** – Excel/CSV, Türkçe başlıklar otomatik eşlenir (Stok Kodu, Ürün Adı, Marka, İç Çap, Dış Çap, Genişlik, Stok, Peşin Fiyat, Kredi Kartı Fiyatı…).
  Modlar: güncelle/ekle, sadece stok-fiyat, tümünü değiştir.
- **Rulman odaklı arama** – stok kodu / muadil / barkod; boşluk, tire ve Türkçe karakter duyarsız; d × D × B ölçü filtreleri.
- **Sepet & sipariş** – bayi iskontosu, KDV, stok düşümü, iptal ile geri alma, Excel ve yazdırma.
- **Roller** – Yönetici ve Bayi. Ürün ekleme/düzenleme, stok aktarma, Excel indirme, bayi ve kullanıcı yönetimi yalnızca yöneticide (arayüzde gizli + IPC + sunucu tarafında RLS/RPC yetki kontrolü). Bayi yalnızca kendi cari kartını ve kendi siparişlerini görür; raf bilgisi bayiye gitmez.
- **Kayıt & onay** – Giriş ekranındaki "Kayıt ol" bayi rolüyle *onay bekleyen* hesap ve cari kart açar; yönetici Ayarlar → Kullanıcılar'dan onaylar, rol değiştirir, yeni kullanıcı/yönetici ekler. Onaylanan bayi Ayarlar → Firma bilgilerim'den ünvan/vergi/adres bilgilerini tamamlar.
- **Oturum hatırlama** – Supabase oturumu (refresh token) `userData` içinde saklanır; uygulama açılışta otomatik girer, yalnızca "Çıkış" ile silinir.
- **Yönetici bildirimleri** – Ayarlar → Görünüm'deki seçenek açıkken pencere kapatılsa da uygulama tepside çalışır, Windows açılışında başlar ve yeni sipariş gelince Windows bildirimi gösterir (Realtime + 60 sn yoklama, tekrar bildirim yok).
- **Erişilebilirlik** – klavye ile tam kullanım (Ctrl+K, F2, Alt+1..8, ok tuşları, `+`), ARIA grid, ekran okuyucu bildirimleri,
  açık/koyu/yüksek kontrast tema, yazı boyutu, azaltılmış hareket, sıkışık görünüm.
- **Bulut & Veri** – Ayarlar'da bağlantı durumu, son eşitleme, "Ürünleri yeniden eşitle"; Örnek veri (12.000 ürün) ortak veritabanına yüklenir.

Hesaplar Supabase Auth'ta tutulur (kullanıcı adı → sabit sentetik e-posta). Bulutta ilk açılan hesap yönetici olur; yönetici `Yamansa`, bayi `Onur` tanımlıdır.

## Geliştirme

```bash
cd b2b-app
npm install
npm run dev          # canlı geliştirme
npm run typecheck
npm run selfcheck    # başsız: yerel önbelleğe 12.000 örnek ürün yükler, arama sürelerini ölçer
# Bulut denetimi: B2B_CHECK_USER/B2B_CHECK_PASS (giriş, ürün çekme, sipariş/kullanıcı listesi);
# B2B_CHECK_WRITE=1 (+ B2B_CHECK_DEALER_USER/PASS): boşsa örnek katalog yükler, stok değişikliğini artımlı çekişle
# doğrular, bayinin sipariş verebildiğini ama ürün/başka sipariş göremediğini, iptalde stokun geri geldiğini kontrol eder.
```

## Bulut şeması

`supabase/schema.sql` tabloları (customers, profiles, products, orders, order_items, settings, import_logs), RLS
politikalarını, RPC'leri (`create_order`, `set_order_status`, `update_my_company`, `admin_*`, `dashboard_orders`…) ve
Realtime yayınını tanımlar; tekrar çalıştırılabilir (idempotent). Yeni kullanıcı `auth.users` tetikleyicisiyle profil ve
cari kart alır. Uygulama yalnızca *publishable (anon)* anahtarı taşır; tüm yetki sunucuda RLS/RPC ile uygulanır.
Eski tek-bilgisayar sürümlerinden kalan yerel tablolar (ürün, cari, sipariş) yönetici ilk kez giriş yapınca buluta
yüklenir, sonra yerelden kaldırılır (`src/main/cloud/migrate.ts`).

## Windows kurulum dosyası (.exe)

Windows makinede:

```bash
npm install
npm run dist:win     # dist/Yamansa-Rulman-B2B-Kurulum-<sürüm>.exe
```

Ya da GitHub Actions: `b2b-app/` altındaki her değişiklikte **B2B App – Windows Installer** iş akışı çalışır ve
kurulum dosyasını "Artifacts" olarak yükler. `b2b-v1.0.0` gibi bir etiket atılırsa kurulum dosyası Release'e eklenir.

> Linux üzerinden çapraz derleme desteklenmez (yerel `better-sqlite3` modülü Windows için derlenmez); Windows CI kullanın.

## Otomatik güncelleme

Kurulu uygulama, GitHub Releases'teki en son sürümü açılışta (ve 4 saatte bir) denetler; yeni sürüm varsa
arka planda indirir ve kullanıcı "Yeniden başlat ve güncelle" dediğinde ya da uygulama kapanırken kurar.

Yeni sürüm yayınlamak için:

1. `b2b-app/package.json` içindeki `version` değerini artırın (örn. `1.0.3`).
2. `b2b-v1.0.3` etiketi atıp gönderin: `git tag b2b-v1.0.3 && git push origin b2b-v1.0.3`
3. İş akışı Release'e `.exe`, `.blockmap` ve `latest.yml` dosyalarını ekler; kurulu uygulamalar bunu görüp güncellenir.

> Kod imzalama sertifikası olmadan Windows ilk kurulumda "bilinmeyen yayıncı" uyarısı gösterir; dosya bilgilerinde
> şirket adı Yamansa Rulman olur, ancak uyarının kalkması için Yamansa adına alınmış bir kod imzalama sertifikası gerekir.
> Kullanıcıya verilecek adımlar ve doğrulama için [KURULUM.md](KURULUM.md).

## Kod imzalama (isteğe bağlı)

İş akışı, aşağıdaki GitHub Secrets tanımlıysa kurulum dosyasını otomatik imzalar; tanımlı değilse imzasız üretir.

| Yöntem | Secrets |
| --- | --- |
| Azure Trusted Signing (aylık ücret, SmartScreen güveni hemen) | `AZURE_TENANT_ID`, `AZURE_CLIENT_ID`, `AZURE_CLIENT_SECRET`, `TRUSTED_SIGNING_ENDPOINT` (örn. `https://weu.codesigning.azure.net`), `TRUSTED_SIGNING_ACCOUNT`, `TRUSTED_SIGNING_PROFILE` |
| OV/EV sertifika (.pfx) | `WIN_CSC_LINK` (pfx dosyasının base64'ü), `WIN_CSC_KEY_PASSWORD` |

Sertifikanın konu adı (CN) **Yamansa Rulman** olmalıdır; `electron-updater` sonraki güncellemeleri bu ada göre doğrular.
Ücretsiz seçenek: kod açık kaynak olduğu için [SignPath Foundation](https://signpath.org/apply) OSS programına
başvurulabilir; kabul edilirse imzalama GitHub Actions'tan SignPath'e devredilir.

Her sürümle birlikte `SHA256SUMS.txt` yayımlanır; Release açıklamasında da özet yazar.

## Microsoft Store (imzasız exe'ye ücretsiz alternatif)

Store'dan yüklenen paketi Microsoft imzalar; SmartScreen / Akıllı Uygulama Denetimi engeli kalkar ve güncellemeler Store
üzerinden gelir (uygulama `process.windowsStore` altında kendi güncelleyicisini kapatır). `.github/workflows/b2b-app-windows.yml`
içindeki `store` işi her `b2b-v*` etiketinde AppX paketini derleyip Partner Center'a gönderir; aşağıdaki GitHub Secrets
tanımlı değilse iş atlanır.

1. [Partner Center](https://partner.center.microsoft.com/tr-tr/dashboard/registration) → **Bireysel** hesap açın,
   **Yeni uygulama** ile adı rezerve edin.
2. Ürün yönetimi → **Ürün kimliği** sayfasındaki değerleri secret olarak girin:

   | Secret | Partner Center alanı |
   | --- | --- |
   | `STORE_PRODUCT_ID` | Store ID (örn. `9NBLGGH4R315`) |
   | `STORE_IDENTITY_NAME` | Package/Identity/Name |
   | `STORE_PUBLISHER` | Package/Identity/Publisher (`CN=...`) |

3. Hesap ayarları → **Kullanıcı yönetimi → Azure AD uygulamaları** ile bir uygulama ekleyip anahtar oluşturun:
   `STORE_TENANT_ID`, `STORE_SELLER_ID`, `STORE_CLIENT_ID`, `STORE_CLIENT_SECRET`
   ([msstore reconfigure](https://learn.microsoft.com/windows/apps/publish/msstore-dev-cli/reconfigure-command)).
4. Bir sonraki `b2b-v*` etiketinde paket otomatik gönderilir; Microsoft incelemesi (genellikle 1–3 gün) bitince Store
sürümü güncellenir. Store logoları `build/appx/` altındadır.

## Veri konumu

Arama önbelleği: `%APPDATA%\yamansa-rulman-b2b\data\yamansa-b2b.sqlite` (Windows) — silinirse bir sonraki açılışta
buluttan yeniden dolar. Asıl veri buluttadır; yedekleme Supabase projesi üzerinden yapılır.
