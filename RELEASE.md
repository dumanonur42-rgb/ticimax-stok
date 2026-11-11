# Sürüm yayımlama

Önce ilgili uygulamanın sürümünü yükseltin; etiket oluşturmak bu çalışmanın parçası değildir.

## Masaüstü

`b2b-app/package.json` sürümünü değiştirip `b2b-app` içinde `npm run typecheck && npm run build` çalıştırın. Windows EXE/GitHub sürümü için `b2b-windows-v<version>`, Microsoft Store paketi için `b2b-windows-store-v<version>` etiketini kullanın. Store paketi Microsoft tarafından imzalanıp incelenir.

## Android

`b2b-mobile` içinde `npm run version:set <x.y.z>` çalıştırın; bu işlem package.json, Android `versionName`/`versionCode` ve iOS `MARKETING_VERSION`/`CURRENT_PROJECT_VERSION` değerlerini birlikte artırır. APK/GitHub ve Google Play sürümü için `b2b-android-v<version>` etiketini kullanın. Play Console’da gerçek sürüm yayımlandıktan sonra mağaza içi güncelleme doğrulanabilir.

## iOS

`npm run version:set <x.y.z>` ile iOS sürümünü de artırın; macOS’ta arşivleyip App Store Connect üzerinden TestFlight veya App Store’a gönderin. `b2b-ios-v<version>` etiketini sürüm kaydı için kullanın. İmzalama ve mağaza güncellemesi yalnızca Apple hesabıyla gerçek dağıtımda sınanabilir.

## Canlı web güncellemesi

Mobil web içeriğini `b2b-mobile-web-v<version>` etiketiyle derleyip ZIP olarak GitHub Release’e ekleyin. SHA-256 değerini alın; ardından `b2b-mobile/live-update.json` dosyasını `main` dalında yeni sürüm, ZIP adresi, checksum ve `minNative` değeriyle güncelleyin. Bu yolla yalnızca HTML, JavaScript, CSS ve görseller dağıtılır; yerel Android/iOS kodu değişmez.

## Minimum sürüm

İsteğe bağlı `min_version_android`, `min_version_ios` ve `min_version_windows` ayarları eski uygulama sürümlerini engeller. Değer, örneğin `1.0.2` biçiminde bir metindir. Uygulama bu anahtarları yalnızca okur; ayarlar tablosuna yazmaz.

```sql
insert into settings(key,value) values('min_version_android', to_jsonb('1.0.2'::text)) on conflict (key) do update set value=excluded.value;
```

```sql
insert into settings(key,value) values('min_version_ios', to_jsonb('1.0.2'::text)) on conflict (key) do update set value=excluded.value;
insert into settings(key,value) values('min_version_windows', to_jsonb('1.0.2'::text)) on conflict (key) do update set value=excluded.value;
```

Windows EXE sessizce güncellenir. Microsoft Store (AppX) paket güncellemesini kendisi yönetir; uygulama zorunlu sürümde Store’un İndirmeler ve güncellemeler sayfasını açar. Windows Store güncellemesinin durumu bir WinRT eklentisi olmadan uygulama içinden sorgulanamaz.
