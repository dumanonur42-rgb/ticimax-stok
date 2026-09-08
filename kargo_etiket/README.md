# Ticimax Kargo Barkodu → Brother QL-550 Etiketi

Ticimax'ın **Kargo Gönderim Toplu Barkod** PDF'ini (A5 boyutlu, çok büyük barkod)
Brother QL-550 etiket yazıcısında basılabilecek **62 × 100 mm** (DK-11202) etiketlere
dönüştürür. Barkod (Code128) PDF'deki değerden yeniden ve vektörel olarak üretilir,
bu yüzden küçük boyutta da net okunur.

## Kurulum (Windows)

1. GitHub → **Releases** → `Kargo Etiket.exe` dosyasını indirin
   (veya Actions sekmesindeki son derlemenin *Kargo Etiket* artifact'ını).
2. Masaüstüne koyun. Kurulum gerekmez.

## Kullanım

- **Sürükle-bırak:** Ticimax'tan indirdiğiniz PDF'i `Kargo Etiket.exe` simgesinin
  üzerine bırakın. Aynı klasörde `<dosya>_QL550.pdf` oluşur ve otomatik açılır.
- **Pencere:** exe'ye çift tıklayın → *PDF Seç ve Dönüştür*. Buradan yazıcı seçip
  "otomatik yazdır" işaretleyebilirsiniz.
- **Komut satırı:**
  ```
  "Kargo Etiket.exe" KargoGonderimTopluBarkod.pdf --yazici "Brother QL-550"
  "Kargo Etiket.exe" dosya.pdf --boyut 62surekli     (DK-22205 sürekli rulo)
  ```

Her sayfa/sipariş ayrı bir etiket sayfası olur.

## Brother'da yazdırma

Çıktı PDF'inin sayfa boyutu **tam 62 × 100 mm**'dir; bu yüzden ek ölçekleme gerekmez.

**Yol 1 – Otomatik (önerilen):** Exe'nin içinde gömülü bir PDF görüntüleyici/yazdırıcı
([SumatraPDF](https://www.sumatrapdfreader.org/), GPLv3) bulunur; dışarıdan hiçbir program
gerekmez. Uygulama etiketi doğrudan seçilen yazıcıya **ölçeklemeden** gönderir (`--yazici`
veya penceredeki "otomatik yazdır"; Brother/QL yazıcı algılanırsa varsayılan işaretlidir).
"Çıktı PDF'ini aç" da aynı gömülü görüntüleyiciyi kullanır (Windows'ta .pdf ile ilişkili
uygulama olmasa bile çalışır).

**Yol 2 – Elle:** PDF'i açın → Yazdır → Yazıcı: *Brother QL-550* → Yazıcı özelliklerinde
kağıt boyutu **62mm x 100mm** → ölçek **Gerçek boyut / %100** (Sayfaya sığdır **kapalı**).

Brother sürücüsünde bir kez yaptığınız kağıt ayarı varsayılan olarak kaydedilir; sonraki
yazdırmalarda tekrar ayar gerekmez.

## Geliştirme

```bash
pip install -r requirements.txt
python kargo_etiket.py ornek.pdf --acma
python test/make_ornek.py        # uydurma verili test PDF'i üretir
python assets/make_icon.py       # uygulama simgesini (icon.ico/png) yeniden üretir
```

Pencereye sürükle-bırak `tkinterdnd2` ile sağlanır; paket yoksa uygulama yine çalışır,
yalnızca "tıklayıp seç" kalır.

EXE, `.github/workflows/kargo-etiket-exe.yml` ile Windows'ta PyInstaller kullanılarak
otomatik derlenir.
