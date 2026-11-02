# Yamansa Rulman B2B — Android

Mobil bayi uygulaması; ürün kataloğunu, ayarları ve siparişleri masaüstü uygulamasıyla aynı Supabase projesinden okur.

## Geliştirme

```sh
npm ci
npm run typecheck
npm run check:login-email
npm run build
npx cap sync android
```

Android Studio'dan `android/` klasörünü açabilir veya `android/gradlew assembleRelease` komutuyla APK oluşturabilirsiniz. Capacitor için kaynak ikon ve açılış görseli `resources/` altındadır.

GitHub Actions PR'larda APK'yı test için debug anahtarıyla imzalar. `b2b-android-v*` etiketi yayımlanırken dört `ANDROID_KEY*` deposu sırrı zorunludur.
