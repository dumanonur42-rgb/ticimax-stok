# Sürüm notları

Her sürüm `## <sürüm>` başlığı altında, kullanıcıya yönelik Türkçe maddeler halinde yazılır.
Bu bölüm CI tarafından GitHub Release açıklamasına kopyalanır ve uygulamadaki güncelleme
penceresinde "Yenilikler" olarak gösterilir. Yalnızca yöneticiyi ilgilendiren maddeler
`[yönetici]` ile başlar; bayilere gösterilmez. Bayiyi ilgilendiren madde yoksa bölüm boş kalır.

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
