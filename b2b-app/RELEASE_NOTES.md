# Sürüm notları

Her sürüm `## <sürüm>` başlığı altında, kullanıcıya yönelik Türkçe maddeler halinde yazılır.
Bu bölüm CI tarafından GitHub Release açıklamasına kopyalanır; uygulama içinde gösterilmez. Yalnızca yöneticiyi ilgilendiren maddeler
`[yönetici]` ile başlar; bayilere gösterilmez. Bayiyi ilgilendiren madde yoksa bölüm boş kalır.

## 1.0.28

- Ürün listesi yüklendikten sonra ürün araması kullanılabilir.
- Excel fiyatlarındaki €/$/TL işaretlerinden para birimi otomatik algılanır; seçilen para birimi hatırlanır ve yükleme öncesinde açıkça gösterilir.

## 1.0.27

- Üst menü dar pencerelerde ve büyük yazı boyutlarında simgelerle gösterilir; tüm sayfalara erişim korunur.
- İnternet kesildiğinde listeler boş görünmek yerine tekrar deneme seçeneği sunar.
- Yeniden bağlantı kurulduğunda açık listeler kendiliğinden yenilenir.
- Sipariş verirken internet bağlantısı yoksa sipariş gönderilemeyeceği açıkça belirtilir.
- Şifre alanlarında Caps Lock açık olduğunda uyarı gösterilir.
- Bayi kullanıcısının girişinden sonra ana sayfa açılır.
- Son 7 günlük trafik grafiğinde eksik günler sıfır olarak gösterilir.
- “Fiyat sorunuz” etiketi kesilmez; büyük yazıda raf bilgileri için daha çok yer ayrılır.
- Sipariş araması Türkçe karakterleri doğru değerlendirir; sipariş numarası ve tarihi tam görünür.
- Koyu temada yazılar, rozetler ve seçili satırlar daha belirgin.
- [yönetici] Stok Aktar'da hatalı dosyalar için anlaşılır uyarılar ve yükleme geçmişi için yeniden deneme bulunur.
- [yönetici] Stok Aktar'da eşleme ve deneme ilerlemesi görünür; Yardım araması sayfayı bulur.

## 1.0.26

- Sipariş listesinde sipariş numarası ve tarih artık tam görünür.
- Fiyatı girilmemiş ürünlerde kredi kartı fiyatı da gösterilmez.
- [yönetici] Stok Aktar'da Excel ya da CSV olmayan dosya seçilince "Dosya okunamadı" uyarısı çıkar.

## 1.0.25

- Sipariş tutarı artık sunucuda ürünün kendi fiyatından hesaplanır.
- Fiyatı girilmemiş ürünlerde "Fiyat sorunuz" yazar; bu ürünler sepete eklenmez, "Fiyat için lütfen bizi arayın" uyarısı çıkar.
- Bayi yalnızca "beklemede" olan siparişini iptal edebilir; iptalden önce onay sorulur ve stok doğru miktarda geri eklenir.
- İnternet yokken sipariş gönderilemeyeceği hemen açıkça yazılır.
- "SKF 6205", "6205 SKF" ve "NU 1052" gibi aramalarda doğru ürünler üstte çıkar.
- Çıkış yapınca bilgisayardaki şifreli ürün kopyası tamamen silinir; gönderilmemiş kayıt varsa çıkış yapılmaz ve uyarı verilir.
- Fiyat ve raf görme yetkisi olmayan kullanıcıların bilgisayarına bu bilgiler hiç indirilmez.
- Sipariş listesinde tarih ve sipariş numarası artık kesilmez; raf sütunu genişledi.
- Ürün güncellemeleri artık atlanmaz.
- Güncelleme hataları Türkçe ve anlaşılır yazılır.
- [yönetici] Stok Aktar'da boş ya da geçersiz dosya açıkça reddedilir; "Vazgeç"ten sonra eski uyarılar temizlenir.
- [yönetici] Hareketler grafiğinde ziyaret olmayan günler de 0 olarak gösterilir.
- [yönetici] Pencereler kapanınca klavye açan düğmeye geri döner.

## 1.0.24

- Türkçe harfli aramalar düzeltildi: "ÇİN" ya da "çin" yazınca ilgili ürünler bulunur, marka filtresiyle birlikte de çalışır.
- "6205 ZZ" gibi kısa ekli aramalar artık yalnızca uyan ürünleri gösterir.
- Ürün detayı kapanınca klavye listede kaldığı yerden devam eder.
- [yönetici] Kullanıcı silindikten sonra düzenleme penceresi kapanır.
- [yönetici] Stok Aktar'da ayar ya da kolon eşleşmesi değişince eski deneme sonucu temizlenir.
- [yönetici] Geçmiş yüklemelerde silinen listeler "Silinen liste" olarak işaretlenir, tüm ürün listesini silme işlemi de geçmişe yazılır.

## 1.0.23

- Çıkış yapmak artık yalnızca bu cihazı etkiler; diğer cihazlardaki oturumlar kapanmaz.
- Oturum sona ererse giriş ekranında yeniden giriş yapmanız gerektiği açıkça bildirilir.
- Yardım'daki yöneticiye özel bölümleri yalnızca yöneticiler görür.
- Ana Sayfa ve Yardım'daki “Bize ulaşın” kartı yenilendi.
- Koyu temada düğmeler artık daha kolay okunuyor.
- Site hareketlerinde şehir, şirket ağı ve ziyaretçi takma adı da gösterilir.

## 1.0.22

- Bilgisayardaki ürün kopyası artık şifreli tutulur; dosya kopyalansa bile başka bir yerde açılamaz. Çıkış yapınca ya da hesap kapatılınca bu kopya silinir.
- Ayarlar ve Yardım ekranları yenilendi: daha düzenli bölümler, Yardım'da arama, sık sorulan sorular ve gruplanmış klavye kısayolları.

## 1.0.21

- Yeni sürüm kurulduğunda oturum kapanmaz; tekrar giriş yapmanız gerekmez.
- [yönetici] Hareketler sayfasına Genel, Yamansa Rulman Uygulama, Yamansa Rulman Web, Rulman Sitesi Web ve Teknik Kesici Web sekmeleri eklendi. En çok aranan, en çok bakılan ve sepete en çok eklenen ürünler seçilen döneme göre görülebilir.
- [yönetici] Hareket kayıtlarının saatleri düzeltildi, çift arama ve çift görüntüleme kayıtları giderildi; tarih başlıkları, filtreler ve kişi özeti eklendi.

## 1.0.20

- [yönetici] Hareketler sayfasında kullanıcı girişleri, aramaları, ürün görüntülemeleri, sepete eklemeleri ve stok değişiklikleri filtrelenip incelenebilir.
- [yönetici] Seçilen kullanıcı için son giriş, sık baktığı ürünler ve arama terimleri görüntülenebilir.
- [yönetici] Ayarlar › Kullanıcılar'da yöneticinin belirlediği şifreler göz simgesiyle görülüp kopyalanabilir.
- Mobil ve Windows'taki ürün aramaları, görüntülemeler ve sepet hareketleri yöneticiye raporlanır.

## 1.0.19

- Uygulama artık kendini sessizce günceller: yeni sürüm arka planda iner, kapanışta veya bilgisayar boştayken kurulur; güncelleme penceresi çıkmaz.
- Ürün listesi arka planda sessizce eşitlenir; "indiriliyor / eşitleniyor" göstergeleri kaldırıldı.
- Ayarlar'daki "Güncellemeleri denetle" düğmesi kaldırıldı.
- Giriş ekranındaki logonun basık görünmesi düzeltildi; dar pencerelerde de görünür.

## 1.0.18

- "Özet" sekmesinin adı "Ana Sayfa" oldu.
- Ürünler listesinde birden fazla ürün seçilip Excel ve WhatsApp'a uygun tablo olarak kopyalanabilir; seçim arama ve filtre değiştirince korunur.
- Ürün, stok, sepet ve sipariş tablolarında dar pencerelerde taşma ve üst üste binmeler düzeltildi.
- Uygulama simgesi ve logolardaki görüntü hatası düzeltildi.
- Ana sayfadaki uzun aktarım dosya adlarının dar ekranda taşması önlendi.
- Ana sayfadaki tablolar dar pencerede alt alta gösteriliyor.
- Excel aktarımında aynı markanın farklı yazımları (ör. INA / İNA) tek marka olarak kaydediliyor.
- Dar pencerede simgeye dönüşen menü düğmelerine erişilebilir adlar eklendi.

## 1.0.17

- [yönetici] Stok Aktar'da "Eski listeyi sil, dosyadakileri yükle" modu: buluttaki eski ürün listesi kalıcı olarak silinir, dosyadaki ürünler yeni liste olur ve tüm bilgisayarlardaki listeler otomatik yenilenir (sipariş geçmişi korunur). Seçildiğinde ne olacağı ekranda açıkça yazılır.

## 1.0.16

- Yan menü üst çubuğa taşındı; sayfalar artık ekranın üstündeki sekmelerden açılır, içerik tam genişlikte.
- Ürünler sayfasında Filtreler paneli her açılışta açık gelir.
- Filtreler paneli yenilendi: açılır/kapanır bölümler, "Sadece stoktakiler" anahtarı, ölçü aralıkları (mm), marka arama kutusu, seçili markalar üstte, "Tümünü göster", etkin filtre sayacı ve Temizle, altta sonuç sayısı.
- Dar pencerede üst menü simgelere dönüşür; yatay kaydırma çıkmaz.
- [yönetici] Stok Aktar, mağazanın "STOK VE FİYAT" listesini doğrudan okur: çok sayfalı dosyada ürün tablosu olan sayfa seçilir, "KOD / AMBALAJ / FİYAT (€)" başlıkları ve "16,00 €" yazımı tanınır, başlıktaki para birimi otomatik seçilir, "EK BİLGİ" sütunu açıklamaya eklenir.
- [yönetici] Stok Aktar'da boş fiyat hücresi mevcut fiyatı korur (artık sıfırlanmaz); kutu durumu olmayan kayıtlı ürün, dosyadaki tek Kutulu/Kutusuz satırıyla eşleşir ve kopya oluşmaz; adet hücresinde yazı varsa uyarı listelenir.
- [yönetici] Stok Aktar'da "Önce dene" düğmesi: hiçbir şey yazmadan kaç ürünün ekleneceğini/güncelleneceğini ve uyarıları gösterir.
- Kutu durumu yazımları birleştirildi: "1KUTULU 1KUTUSUZ" → "1 Kutulu 1 Kutusuz", "KUTUSZ/KUTUUSZ" → Kutusuz, "ORJ POŞET" → "Orjinal Poşet".

## 1.0.15

- Ürün listesinde Kutu durumu ve Açıklama sütunları artık herkese gösterilir.
- Stok göstergesindeki "az" etiketi kaldırıldı; seviye yalnızca renkle belirtilir.
- Ürün listesinden Kredi Kartı Fiyatı sütunu kaldırıldı.
- "Peşin Fiyat" başlığı her yerde "Fiyat" oldu.
- Uzun kutu durumu yazıları kesilmek yerine iki satıra sığdırılıyor.
- [yönetici] Yeni "Ara kullanıcı" rolü: bayi ile aynı, ek olarak raf konumunu görür. Kullanıcılar sayfasından kişiye özel ek özellikler (fiyatları görme, tüm siparişler, Excel aktarımı) verilebilir.

## 1.0.14

- Uygulama açılır açılmaz klavye çalışır; yazmaya başlamak için önce boşluğa tıklamak gerekmez.
- Stok göstergesi yenilendi: sayı belirgin, "adet" küçük; renk stok seviyesine göre (yok / kritik / az / var).
- Marka yazım farkları tek marka sayılır: INA / İNA / ina, İKO / IKO, NACHİ / NACHI gibi ayrımlar birleştirildi; marka filtresi ve listeler tek adı gösterir. Yeni girişlerde yazım nasıl olsa (küçük harf, ı/İ, fazla boşluk) kayıtlı marka adı kullanılır.
- [yönetici] Stok Aktar'da kutu durumu hücresi artık ürünlere bölünmez: "3 KUTULU 1 ORJ KAĞIT 1 KUTUSUZ" olduğu gibi tek ürünün kutu durumu olur; ADET sütunu ürünün stoğudur.
- [yönetici] Ürün listesinde Kutu durumu sütunu okunaklı etiket olarak gösterilir (Kutulu dolgulu, Kutusuz kesikli çerçeve).
- [yönetici] Mükerrerler: aynı kod ve marka olup yalnızca kutu durumu farklı olan ürünler (Kutulu / Kutusuz / birleşik) de gruplanır; "Tümü / Aynı kutu / Kutulu-Kutusuz" filtresi ile ayrılır ve istenirse tek ürüne birleştirilir. Not: hızlı girişte aynı kod+marka+kutu ikinci kez girildiğinde yeni kayıt açılmaz, mevcut ürüne stok eklenir; bu yüzden mükerrer listesinde görünmez.
- [yönetici] Hızlı giriş: kutu durumu "Kutulu" yazıldığında aynı kod+markanın kayıtlı kutu durumu "4 Kutulu 2 Kutusuz" gibi birleşik bir ifadeyse satırda uyarı çıkar ve tek tıkla o kayda stok eklenir; ayrı ürün açılmaz.

## 1.0.13

- Kurulum sihirbazında "Bu bilgisayarı kullanan herkes için" (Program Files) seçeneği varsayılan geldi; şirket bilgisayarlarındaki uygulama denetim ilkelerinin (AppLocker) engeline takılmamak için bu seçeneği bırakın. Windows uyarısı çıkarsa: Daha fazla bilgi → Yine de çalıştır.
- Güvenlik sıkılaştırması: uygulama penceresi tam yalıtımlı (sandbox) çalışır, dış web sayfası açmaz, kamera/mikrofon/konum gibi izin istemez; yalnızca WhatsApp, telefon ve resmî GitHub bağlantıları tarayıcıda açılır.
- Yardım sayfasına "Güvenlik ve kurulum" bölümü eklendi: Windows uyarıları, "uygulama denetim ilkesi" hatası ve dosya doğrulama adımları.
- [yönetici] Her sürümle SHA-256 doğrulama dosyası (SHA256SUMS.txt) yayımlanır; ayrıntılı kurulum rehberi b2b-app/KURULUM.md.
- [yönetici] Microsoft Store dağıtımı için paketleme hazır (hesap açılınca devreye alınır); Store sürümü güncellemelerini Store'dan alır.

## 1.0.12

- Ürün listesi pencere genişliğine göre kendini sığdırır: dar pencerede sütunlar daralır, en az önemli sütunlar (ölçü, K. kartı fiyatı vb.) gizlenir; yatay kaydırma çubuğu çıkmaz.
- [yönetici] Stok Aktar ve hızlı girişte kutu durumu her türlü ambalajı ayırt eder: "3 KUTULU 1 ORJ KAĞIT 1 KUTUSUZ" hücresi Kutulu (3), Orjinal Kağıt (1) ve Kutusuz (1) olarak üç ayrı ürüne bölünür; "Poşet", "10'lu Paket" gibi ifadeler de ayrı ürün olur. Farklı yazımlar tek yazıma çevrilir (orj kağıt / orijinal kağıt → Orjinal Kağıt). Kutu durumundaki adetlerin toplamı ADET sütunuyla uyuşmazsa içe aktarma sonucunda satır numarasıyla uyarı verilir.

## 1.0.11

- Özet sayfasında "Bize ulaşın" kartı: Ahmet Yaman (+90 552 610 93 63) ve Arif Yaman (+90 533 474 87 40) için ayrı WhatsApp ve Ara düğmeleri; tıklayınca WhatsApp veya telefon uygulaması açılır.
- Kayıt ol formunda alanların ve hata mesajının kartın dışına taşması düzeltildi; kullanıcı adında boşluk kullanılabilir (örn. "Onur Teknik").
- [yönetici] Stok Aktar, Excel dosyanızın düzenini doğrudan tanır: RAF | ÜRÜN ADI | MARKA | ADET | KUTU DURUMU | FİYAT | AÇIKLAMA. Boş hücreler sorun olmaz; boş raf hücresi bir üst satırdaki rafı alır; yalnızca raf adı yazan ara satırlar atlanır; aynı ürün birden fazla satırda geçiyorsa adetler toplanır; "33 KUTULU – 1 KUTUSUZ" gibi hücreler kutulu ve kutusuz olarak ayrı ürünlere bölünür; aynı başlığa sahip diğer sayfalar da okunur.
- [yönetici] Hızlı giriş: Kutu durumu veya Açıklama hücresinde arka arkaya iki kez Enter, yeni satırın Ürün kodu hücresine geçer.
- [yönetici] Ürün listesinde Stok'tan sonra "Kutu durumu" ve "Açıklama" sütunları eklendi (bayilerde görünmez).
- [yönetici] Örnek (demo) veri yükleme düğmeleri kaldırıldı; şablon dosyası Excel düzeninizle aynı sütunlarla iner.

## 1.0.10

- Üst çubukta bağlantı göstergesi: "Çevrimiçi", "Çevrimdışı" veya "Gönderiliyor"; bekleyen kayıt sayısı yanında yazar, tıklayınca bağlantı yeniden denenir.
- Uygulama internet yokken de açılır (son oturum hatırlanır); ürün listesi bilgisayardaki kopyadan aranır.
- [yönetici] Çevrimdışı kayıt: internet yokken yapılan hızlı giriş, ürün düzenleme ve silme işlemleri cihazda sırayla bekler; bağlantı gelince her biri sunucuya yalnızca bir kez gönderilir, aynı kayıt asla tekrar işlenmez (bağlantı ortada kopsa bile).
- [yönetici] "Ürün listesini sil" hatası düzeltildi; silme tüm bilgisayarlardaki kopyaları da temizler, sipariş geçmişi korunur.
- [yönetici] Eski (bulut öncesi) kurulumlardan kalan yerel ürün ve kayıtlar artık gösterilmez; liste yalnızca buluttaki ürünleri içerir.

## 1.0.9

- [yönetici] Güncelleme penceresindeki "Yenilikler" artık sürüm notlarını gösterir; yalnızca yöneticiyi ilgilendiren maddeler bayilere gösterilmez.

## 1.0.8

- [yönetici] Hızlı giriş: aynı kod farklı marka için uyarı kaldırıldı; aynı kod ve marka başka kutu durumuyla kayıtlıysa küçük bir bilgi notu gösterilir.
- [yönetici] Hızlı giriş: daha önce silinmiş bir ürün aynı kod, marka ve kutu durumuyla yeniden girildiğinde "kaydedilemedi" hatası düzeltildi.
- [yönetici] "Yeni bayi" formundan bayiye giriş bilgileri (kullanıcı adı ve şifre) verilebiliyor.
- Ürünler artık ürün kodu + marka + kutu durumu ile ayrıştırılıyor; aynı kodun farklı markası veya kutulu/kutusuz hali ayrı ürün.
