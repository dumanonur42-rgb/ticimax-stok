# Ticimax Kargo Barkodu → Brother QL-550 Etiketi

Ticimax'ın **Kargo Gönderim Toplu Barkod** PDF'ini (A5 boyutlu, çok büyük barkod)
Brother QL-550 etiket yazıcısında basılabilecek **62 × 100 mm** (DK-11202) etiketlere
dönüştürür. Barkod (Code128) PDF'deki değerden yeniden ve vektörel olarak üretilir,
bu yüzden küçük boyutta da net okunur.

## Kurulum (Windows)

1. GitHub → **Releases** → `KargoEtiket_QL550.exe` dosyasını indirin
   (veya Actions sekmesindeki son derlemenin *KargoEtiket_QL550* artifact'ını).
2. Masaüstüne koyun. Kurulum gerekmez.

## Kullanım

- **Sürükle-bırak:** Ticimax'tan indirdiğiniz PDF'i `KargoEtiket_QL550.exe` simgesinin
  üzerine bırakın. Aynı klasörde `<dosya>_QL550.pdf` oluşur ve otomatik açılır.
- **Pencere:** exe'ye çift tıklayın → *PDF Seç ve Dönüştür*. Buradan yazıcı seçip
  "otomatik yazdır" işaretleyebilirsiniz.
- **Komut satırı:**
  ```
  KargoEtiket_QL550.exe KargoGonderimTopluBarkod.pdf --yazici "Brother QL-550"
  KargoEtiket_QL550.exe dosya.pdf --boyut 62surekli     (DK-22205 sürekli rulo)
  ```

Her sayfa/sipariş ayrı bir etiket sayfası olur.

## Brother'da yazdırma

Çıktı PDF'inin sayfa boyutu **tam 62 × 100 mm**'dir; bu yüzden ek ölçekleme gerekmez.

**Yol 1 – Otomatik (önerilen):** [SumatraPDF](https://www.sumatrapdfreader.org/) kurulu ise
uygulama etiketi doğrudan seçilen yazıcıya **ölçeklemeden** gönderir (`--yazici` veya
penceredeki "otomatik yazdır"). SumatraPDF yoksa Windows'un varsayılan PDF
uygulamasının yazdırma penceresi açılır.

**Yol 2 – Elle:** PDF'i açın → Yazdır → Yazıcı: *Brother QL-550* → Yazıcı özelliklerinde
kağıt boyutu **62mm x 100mm** → ölçek **Gerçek boyut / %100** (Sayfaya sığdır **kapalı**).

Brother sürücüsünde bir kez yaptığınız kağıt ayarı varsayılan olarak kaydedilir; sonraki
yazdırmalarda tekrar ayar gerekmez.

## Geliştirme

```bash
pip install -r requirements.txt
python kargo_etiket.py ornek.pdf --acma
python test/make_ornek.py        # uydurma verili test PDF'i üretir
```

EXE, `.github/workflows/kargo-etiket-exe.yml` ile Windows'ta PyInstaller kullanılarak
otomatik derlenir.
