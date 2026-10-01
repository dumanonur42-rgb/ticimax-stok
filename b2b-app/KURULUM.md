# Yamansa Rulman B2B — Kurulum rehberi

En son kurulum dosyası: <https://github.com/dumanonur42-rgb/ticimax-stok/releases/latest>
(`Yamansa-Rulman-B2B-Kurulum-<sürüm>.exe`). Sonraki sürümler uygulama içinden otomatik güncellenir.

Kurulum sihirbazının ilk adımında **"Bu bilgisayarı kullanan herkes için"** seçili gelir (Program Files'a kurar,
bir kez yönetici onayı ister). Bu seçeneği değiştirmeyin: şirket bilgisayarlarındaki uygulama denetim ilkeleri
(AppLocker) varsayılan olarak yalnızca Program Files altındaki programların çalışmasına izin verir; "Yalnızca benim
için" seçilirse uygulama kullanıcı klasörüne kurulur ve bu ilkelerce engellenebilir.

## Windows "Bilgisayarınız korundu" uyarısı

Kurulum dosyası henüz dijital imzalı olmadığı için Windows SmartScreen ilk çalıştırmada mavi bir uyarı gösterebilir.
Bu, dosyanın zararlı olduğu anlamına gelmez; Windows yalnızca yayıncıyı tanımadığını söyler.

1. Uyarı penceresinde **Daha fazla bilgi** (More info) bağlantısına tıklayın.
2. Görünen **Yine de çalıştır** (Run anyway) düğmesine basın.
3. Kurulum sihirbazı açılır; **İleri → Kur** ile tamamlayın.

Dosya bilgilerini görmek için exe'ye sağ tık → **Özellikler → Ayrıntılar**: Şirket **Yamansa Rulman**, ürün
**Yamansa Rulman B2B**, sürüm numarası ve telif satırı yazmalıdır.

## "Uygulama denetim ilkesi tarafından engellendi" hatası

Bu, SmartScreen'den farklıdır: Windows'un uygulama denetim mekanizması imzasız programı hiç çalıştırmıyor demektir.
İki farklı kaynağı olabilir:

**A) Kişisel Windows 11 bilgisayar — Akıllı Uygulama Denetimi (Smart App Control)**

1. **Windows Güvenliği → Uygulama ve tarayıcı denetimi → Akıllı Uygulama Denetimi ayarları**'nı açın.
2. "Açık" veya "Değerlendirme" ise Windows imzasız hiçbir kurulum dosyasına izin vermez. Bu özellik yalnızca
   **Kapalı** konuma alınabilir (Windows bir kez kapatılan özelliği yeniden açmayı yalnızca temiz kurulumla sağlar);
   karar bilgisayar sahibine aittir. Defender ve SmartScreen bundan etkilenmez, çalışmaya devam eder.
3. Kapatmak istemiyorsanız alternatif: uygulamanın Microsoft Store sürümü (hazırlanıyor; Store paketini Microsoft
   imzalar ve bu denetimden geçer).

**B) Şirket / etki alanı bilgisayarı — AppLocker veya WDAC ilkesi**

1. Kurulumu **"Bu bilgisayarı kullanan herkes için"** seçeneğiyle, yönetici hesabıyla onaylayıp **Program Files**'a
   kurun. AppLocker'ın varsayılan kuralları Program Files altındaki programlara izin verir; çoğu durumda bu yeter.
2. Yine engelleniyorsa ilke daha sıkıdır (yalnızca imzalı yayıncılar/hash listesi). Bu durumda BT yöneticisinin
   `C:\Program Files\Yamansa Rulman B2B\` yolu için bir **yol kuralı** ya da `YamansaRulmanB2B.exe` için **dosya
   özeti (hash) kuralı** tanımlaması gerekir. Hash için aşağıdaki SHA-256 bölümündeki değerleri iletebilirsiniz.
3. Olay kaydından hangisi olduğu görülebilir: **Olay Görüntüleyicisi → Uygulama ve Hizmet Günlükleri → Microsoft →
   Windows → AppLocker** (AppLocker) veya **CodeIntegrity** (WDAC / Akıllı Uygulama Denetimi).

Uygulama kendisi bu ilkeleri devre dışı bırakmaz ve bırakmaya çalışmaz; kalıcı çözüm dijital imza ya da Store
dağıtımıdır.

## Tarayıcı indirmeyi engellediyse

- **Edge / Chrome**: indirmeler listesinde dosyanın yanındaki **⋯ → Sakla / Yine de sakla** seçeneğini kullanın.
- Dosya indirilemiyorsa yukarıdaki Releases sayfasından tekrar deneyin; bağlantı doğrudan GitHub'dandır.

## Windows Güvenliği (Defender) dosyayı sildiyse

1. **Windows Güvenliği → Virüs ve tehdit koruması → Koruma geçmişi**'ni açın.
2. İlgili kaydı seçip **Eylemler → İzin ver** deyin, ardından dosyayı yeniden indirin.

Yanlış alarm olduğunu Microsoft'a bildirmek için (yalnızca yönetici): <https://www.microsoft.com/wdsi/filesubmission>
adresine kurulum dosyasını "Yanlışlıkla algılandı" (incorrectly detected) seçeneğiyle gönderin; genellikle 1–3 gün
içinde imza güncellemesiyle uyarı kalkar.

## Dosyanın değişmediğini doğrulama (isteğe bağlı)

Her sürümün Release açıklamasında ve `SHA256SUMS.txt` dosyasında kurulum dosyasının SHA-256 özeti yazar.
PowerShell'de:

```powershell
Get-FileHash .\Yamansa-Rulman-B2B-Kurulum-*.exe -Algorithm SHA256
```

Çıkan değer Release sayfasındaki değerle aynı olmalıdır; farklıysa dosyayı kullanmayın ve yeniden indirin.

Kurulu uygulamanın özeti (AppLocker hash kuralı için):

```powershell
Get-FileHash "C:\Program Files\Yamansa Rulman B2B\YamansaRulmanB2B.exe" -Algorithm SHA256
```

## Kurumsal ağlar ve güvenlik duvarı

Uygulamanın çalışması için aşağıdaki adreslere HTTPS (443) erişimi gerekir:

| Adres | Ne için |
| --- | --- |
| `wxcbajukvxmerdjaikuw.supabase.co` | Ortak veritabanı (giriş, ürün, stok, sipariş) — HTTPS ve WebSocket |
| `github.com`, `objects.githubusercontent.com`, `release-assets.githubusercontent.com` | Otomatik güncelleme indirmeleri |

Erişim engelliyse uygulama "Çevrimdışı" gösterir; bilgisayardaki ürün kopyasıyla arama yapılabilir, kayıtlar bağlantı
gelince gönderilir.

## Uygulama güvenliği (özet)

- Uygulama yalnızca kendi arayüz dosyalarını çalıştırır; dış sayfa açmaz, eklenti/kamera/mikrofon gibi izin istemez.
- Veritabanı anahtarı yalnızca *herkese açık (anon)* anahtardır; kimin neyi görebileceği sunucuda (satır düzeyi
  güvenlik) uygulanır — bayi yalnızca kendi verisini görür.
- Şifreler sunucuda güvenli özetle saklanır; bilgisayarda yalnızca oturum bilgisi ve ürün arama kopyası tutulur.
- Güncellemeler yalnızca bu deponun GitHub Releases sayfasından alınır ve siz onaylamadan kurulmaz.
- Kaynak kod açıktır; her kurulum dosyası GitHub Actions üzerinde bu depodan otomatik derlenir (derleme kayıtları
  Actions sekmesinde görülebilir).
