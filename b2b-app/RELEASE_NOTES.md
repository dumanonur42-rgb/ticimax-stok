# Sürüm notları

Her sürüm `## <sürüm>` başlığı altında, kullanıcıya yönelik Türkçe maddeler halinde yazılır.
Bu bölüm CI tarafından GitHub Release açıklamasına kopyalanır ve uygulamadaki güncelleme
penceresinde "Yenilikler" olarak gösterilir. Yalnızca yöneticiyi ilgilendiren maddeler
`[yönetici]` ile başlar; bayilere gösterilmez. Bayiyi ilgilendiren madde yoksa bölüm boş kalır.

## 1.0.9

- [yönetici] Güncelleme penceresindeki "Yenilikler" artık sürüm notlarını gösterir; yalnızca yöneticiyi ilgilendiren maddeler bayilere gösterilmez.

## 1.0.8

- [yönetici] Hızlı giriş: aynı kod farklı marka için uyarı kaldırıldı; aynı kod ve marka başka kutu durumuyla kayıtlıysa küçük bir bilgi notu gösterilir.
- [yönetici] Hızlı giriş: daha önce silinmiş bir ürün aynı kod, marka ve kutu durumuyla yeniden girildiğinde "kaydedilemedi" hatası düzeltildi.
- [yönetici] "Yeni bayi" formundan bayiye giriş bilgileri (kullanıcı adı ve şifre) verilebiliyor.
- Ürünler artık ürün kodu + marka + kutu durumu ile ayrıştırılıyor; aynı kodun farklı markası veya kutulu/kutusuz hali ayrı ürün.
