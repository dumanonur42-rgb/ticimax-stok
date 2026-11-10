"""Tek ürün pilotu; ağ erişimi ve yükleme yapmaz."""
import json
from pathlib import Path
from html import escape
from PIL import Image, ImageChops

ROOT = Path(__file__).resolve().parents[1]
PDF = 'https://hiwin.com/wp-content/uploads/2026/08/HIWIN-Linear-Guideway-Catalog-1.pdf'
PHOTO = 'https://www.fonlinearguide.com/Uploads/products/2021-03-10/en-HGH20HA--5-.jpg'


def tr_lower(text):
    return text.translate(str.maketrans('Iİ', 'ıi')).lower()


def ascii_text(text):
    return tr_lower(text).translate(str.maketrans('çğıöşü', 'cgiosu'))


def main():
    specs = [('Genişlik (W)', '44 mm'), ('Yükseklik (H)', '30 mm'),
             ('H1', '4,6 mm'), ('N', '12 mm'), ('B', '32 mm'), ('B1', '6 mm'),
             ('C', '50 mm'), ('L1', '65,2 mm'), ('Uzunluk (L)', '92,2 mm'),
             ('K1', '12,6 mm'), ('K2', '6 mm'), ('G', '12 mm'),
             ('Vida (M x l)', 'M5 x 6'), ('T', '8 mm'), ('H2', '6 mm'),
             ('H3', '6 mm'), ('Ray Genişliği (WR)', '20 mm'),
             ('Ray Yüksekliği (HR)', '17,5 mm')]
    reference = [('Dinamik yük', '32,7 kN'), ('Statik yük', '47,96 kN'), ('Ağırlık', '0,39 kg')]
    raw = {'kod': 'ORK LA HGH20HA', 'model': 'HGH20HA', 'kaynak': PDF,
           'pdf_sayfa': 41, 'basili_sayfa': 38,
           'degerler': {k: {'deger': v, 'kaynak': PDF, 'kapsam': 'eşdeğer HGH20HA katalog geometrisi'} for k, v in specs},
           'referans_degerler': {k: {'deger': v, 'kaynak': PDF, 'kapsam': 'yalnız resmi katalog markasının referans değeri; Yamansa kapasitesi değildir'} for k, v in reference},
           'tutarlilik': {'url': 'https://www.yamansarulman.com/hgh-20-ca-lineer-araba-18295',
                         'ortak': {'W': '44 mm', 'H': '30 mm', 'H1': '4,6 mm', 'N': '12 mm', 'B': '32 mm'},
                         'CA_farklari': {'C': '36 mm', 'L1': '50,5 mm', 'L': '77,5 mm'},
                         'not': 'CA sayfası CDP ile okundu. Yük değerleri eski seri tablosundan farklı; HA için CA kapasitesi aktarılmadı.'}}
    (ROOT / 'veri/lineer.json').write_text(json.dumps([raw], ensure_ascii=False, indent=2) + '\n')
    title = 'HGH 20HA Dar Uzun Lineer Araba 20 mm'
    opening = [('Marka', 'Yamansa')] + [specs[i] for i in [0, 1, 8, 6, 7, 12, 16]]
    onyazi = '<table><tbody>' + ''.join('<tr><td><strong>' + escape(k) + '</strong> ' + escape(v) + '</td></tr>' for k, v in opening) + '</tbody></table>'
    sections = [
        ('Dar Uzun Gövde ile Doğrusal Hareket', 'HGH 20HA, 20 mm nominal ray boyutu için dar ve uzun gövdeli lineer araba seçeneğidir. Yamansa markalı bu ekonomik model, taşıyıcı tablanın ray boyunca hareket ettiği düzeneklerde kullanılır. Üstten bağlantılı dar blok yapısı, geniş flanşlı arabalardan farklı bir montaj düzeni sunar. 44 mm gövde genişliği ve ray ile birlikte 30 mm toplam yüksekliği, yerleşim tasarımında dikkate alınması gereken iki temel ölçüdür.'),
        ('HGH 20HA ile CA Arasındaki Fark', 'HGH 20HA modelinde bağlantı deliklerinin boyuna merkez aralığı C = 50 mm, enine merkez aralığı B = 32 mm değerindedir. L1 gövde uzunluğu 65,2 mm, toplam L uzunluğu ise 92,2 mm olarak alınır. HGH 20CA kısa gövde yerine seçim yapılırken yalnız ray boyutunun aynı olması yeterli değildir: bağlantı plakasının delikleri ve arabanın hareket sonundaki boşluğu da uzun gövdeye uygun olmalıdır. HA eki, burada uzun gövdeyi ayırt eder; tek başına hassasiyet sınıfı belirtmez.'),
        ('Ray ve Bağlantı Düzeni', 'HGH 20HA, HIWIN HG serisi ile birebir ölçü uyumlu dar uzun blok geometrisindedir. Ray genişliği WR = 20 mm, ray yüksekliği HR = 17,5 mm olan profil esas alınır. Dört üst bağlantı noktası M5 x 6 diş ölçüsündedir. Vida seçerken bağlantı plakasının kalınlığı ile dişe giren boy ayrı değerlendirilmelidir; fazla uzun vida kullanılmamalıdır. Mevcut rayla eşleştirmede profil, ön yük ve çalışma boşluğu ayrıca kontrol edilmelidir; yalnız dış ölçü benzerliği sorunsuz çalışma garantisi vermez.'),
        ('Kullanım Alanları', 'Dar uzun HGH 20HA; otomasyon kızakları, CNC yardımcı eksenleri, konumlandırma tablaları ve parça taşıma düzenekleri için değerlendirilebilir. Özellikle taşıyıcı plakanın enine yerinin sınırlı, boyuna alanının daha serbest olduğu tasarımlarda gövde biçimi önem kazanır. Kesme kuvveti, ivmelenme ve yükün raydan uzaklığı birlikte ele alınmalıdır. Araba sayısı veya eksen taşıma kapasitesi yalnız ürün boyutuna bakılarak belirlenmemelidir.'),
        ('Montaj ve Bakım', 'Montajdan önce ray yüzeyindeki talaş ve kir temizlenmeli, bağlantı yüzeylerinin düzlüğü kontrol edilmelidir. Araba raya aktarılırken bilyaların dağılmasını önleyen taşıma aparatı korunmalıdır. Rayın paralelliği ayarlandıktan sonra eksen tüm strok boyunca elle kontrol edilerek sıkışma olup olmadığı gözlenir. Yağlayıcı seçimi ve bakım aralığı; hız, ortam kirliliği ve çalışma süresine göre belirlenir. Gresörlüğe erişim için yer bırakmak bakım sırasında arabanın sökülmesini önleyebilir.'),
        ('Doğru Modeli Seçerken', 'Bu ürün tek lineer arabadır; ray veya bağlantı plakası içermez. Nominal 20 mm ifadesi blok genişliği değil, eşleştirilecek ray boyutunu anlatır. Alternatif gövdeleri <a href="https://www.yamansarulman.com/lineer-arabalar">lineer arabalar</a> kategorisinde, eksen için gereken profilleri <a href="https://www.yamansarulman.com/lineer-raylar-125">lineer raylar</a> bölümünde inceleyebilirsiniz. Siparişte mevcut araba üzerindeki HGH 20HA kodunu, montaj deliklerini ve toplam uzunluğu birlikte karşılaştırın.')]
    desc = '<div class="urunTabAlt"><div class="ydsc"><div class="ym"><h2>' + title + '</h2>'
    desc += ''.join('<div class="ysc"><h3>' + h + '</h3><p>' + p + '</p></div>' for h, p in sections)
    desc += '<h3>Teknik Özellikler</h3><ul>' + ''.join('<li><strong>' + escape(k) + ':</strong> ' + escape(v) + '</li>' for k, v in specs) + '</ul></div></div><div class="teknikDetay"></div></div>'
    words = 'HGH20HA, HGH 20HA, HGH 20 HA, HGH-20HA, HGH-20-HA, hgh20, hgh 20 ha, hgh-20ha, lineer araba, dar uzun lineer araba, lineer kızak arabası, lineer kizak arabasi, linear guide block, 20 mm lineer araba, 20mm lineer araba, 44x30x92,2 mm, 44 x 30 x 92,2 mm, M5x6, M5 x 6, 32x50 mm, 32 x 50 mm, Yamansa HGH20HA'
    item = dict(kod='ORK LA HGH20HA', URUNADI=title, MARKA='Yamansa', KATEGORI='LİNEER>LİNEER ARABALAR', EK_KATEGORILER=[], yeni_kategori=False, ONYAZI=onyazi, ACIKLAMA=desc, ANAHTARKELIME=words, SEO_SAYFABASLIK=title, SEO_SAYFAACIKLAMA='HGH 20HA dar uzun lineer araba: 20 mm ray boyutu, 44 mm genişlik, 92,2 mm uzunluk ve M5 x 6 bağlantı. Yamansa ekonomik model.', SEO_ANAHTARKELIME=words, resim='gorseller/hgh-20ha-dar-uzun-lineer-araba-20-mm.jpg', resim_seviye='ayni_tip', resim_kaynak=PHOTO, teknik_kaynak=[PDF], bayraklar=['eksik: Yamansa dinamik/statik yük kapasitesi ve gerçek ağırlığı için üretici verisi yok; eşdeğer markanın değerleri satış metnine aktarılmadı'])
    (ROOT / 'urunler.jsonl').write_text(json.dumps(item, ensure_ascii=False) + '\n')
    im = Image.open(ROOT / 'veri/fon9.jpg').convert('RGB')
    mask = ImageChops.difference(im, Image.new('RGB', im.size, 'white')).convert('L').point(lambda p: 255 if p > 22 else 0)
    im = im.crop(mask.getbbox())
    im.thumbnail((440, 230), Image.Resampling.LANCZOS)
    template = Image.open(ROOT / 'sablon.png').convert('RGB')
    canvas = Image.new('RGB', (500, 500), 'white')
    canvas.paste(template.crop((0, 0, 500, 100)), (0, 0))
    canvas.paste(template.crop((0, 350, 500, 500)), (0, 350))
    canvas.paste(im, ((500 - im.width) // 2, 100 + (250 - im.height) // 2))
    canvas.save(ROOT / item['resim'], quality=95, subsampling=0)
    ctx = dict(title=title, path='/hgh-20ha-dar-uzun-lineer-araba-20-mm', crumbs=['Anasayfa', 'LİNEER', 'LİNEER ARABALAR'], specs=[dict(l=k, v=v) for k, v in specs], onyazi=[dict(l=k, v=v) for k, v in opening])
    (ROOT / 'veri/lineer-ctx.json').write_text(json.dumps(ctx, ensure_ascii=False, indent=2) + '\n')


if __name__ == '__main__':
    main()
