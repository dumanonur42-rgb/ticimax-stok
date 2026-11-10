"""Aile 1: yerel ham veriden içerik, görsel ve çizim bağlamı üretimi."""
import json
import re
from html import escape
from pathlib import Path

from PIL import Image, ImageChops
from hazirla import ascii_text, tr_lower

ROOT = Path(__file__).resolve().parents[1]
CAR_LINK = 'https://www.yamansarulman.com/lineer-arabalar'
RAIL_LINK = 'https://www.yamansarulman.com/lineer-raylar-125'


def slug(text):
    return re.sub(r'[^a-z0-9]+', '-', ascii_text(text)).strip('-')


def identity(raw):
    model, size = raw['model'], raw['nominal']
    if model.startswith('HGR'):
        return f'HGR {size} Lineer Ray {size} mm - 4 Metre', f'HGR {size}', 'profil ray'
    if model.startswith(('HGH', 'HGW')):
        code = model[:3] + ' ' + model[3:]
    else:
        code = f"PMI {raw['seri']} {size} {raw['govde']} {raw['conta']} FCN"
    shape = 'GENİŞ' if raw['genis'] else 'Dar'
    if raw['uzun']:
        shape += ' Uzun'
    if raw.get('seri') == 'MSB':
        shape += ' Alçak'
    return f'{code} {shape} Lineer Araba {size} mm', code, tr_lower(shape)


def table(specs):
    return '<table><tbody>' + ''.join('<tr><td><strong>' + escape(k) + '</strong> ' + escape(v) + '</td></tr>' for k, v in specs) + '</tbody></table>'


def car_sections(raw, code, shape, index):
    d = {k: v['deger'] for k, v in raw['degerler'].items()}
    W, H, L = (d[k] for k in ['Genişlik (W)', 'Yükseklik (H)', 'Uzunluk (L)'])
    B, C, L1, size = d['B'], d['C'], d['L1'], raw['nominal']
    M = d.get('Vida (M x l)', d.get('Vida (M)'))
    rail = f"{d['Ray Genişliği (WR)']} genişlik ve {d['Ray Yüksekliği (HR)']} yükseklik"
    intro = [
        f'{code}, {size} mm nominal ray boyutu için {shape} gövdeli bir lineer arabadır. Taşıyıcı tablanın doğrusal hareketini yönlendiren bu modelde blok genişliği {W}, rayla birlikte toplam yükseklik {H} değerindedir. Nominal ray boyutu ile araba genişliği aynı ölçü değildir. Yeni bir tabla tasarlarken ya da mevcut arabayı değiştirirken gövdenin yanlardaki yer ihtiyacı ve montaj yüksekliği ayrı ayrı ele alınmalıdır.',
        f'Tablaya ayrılan enine alanı değerlendirirken {code} için önce {W} gövde genişliğine bakılır. {size} mm nominal boydaki bu {shape} lineer arabanın montaj yüksekliği {H}, toplam uzunluğu {L} değerindedir. Bilyalı kızak yapısı, tabla ile profil ray arasındaki hareketi taşır; tek başına blok boyutu ise tüm eksenin taşıma kapasitesini belirlemez. Arabanın formu, plakanın bağlantı düzeniyle birlikte değerlendirilmelidir.',
        f'{code} seçimi, aynı nominal boydaki farklı gövde biçimlerini ayırt etmeyi gerektirir. Bu ürün {size} mm ray boyutunda {shape} lineer araba olarak sunulur; dış yerleşimi belirleyen genişlik {W}, toplam yükseklik {H} ve uzunluk {L} değerleridir. Profil ray boyunca hareket eden taşıyıcı plakanın çalışma alanı hesaplanırken yalnız rayın boyuna değil, bloğun kapladığı hacme ve uçlarda bırakılacak boşluğa da bakılır.',
        f'{size} mm nominal boydaki {code}, {shape} gövdesiyle hareketli tabla ile ray arasındaki taşıyıcı elemanı oluşturur. {H} montaj yüksekliği ve {W} blok genişliği, bağlantı plakasının konumunu doğrudan etkiler. Toplam {L} uzunluk ise strok sonlarında bırakılacak boşluk için önemlidir. Yenileme işlerinde sadece eski arabanın nominal ölçüsünü okumak yerine bağlantı yüzeyi ve dış ölçüler birlikte karşılaştırılmalıdır.'
    ][index % 4]
    mounting = f'{code} bağlantısında enine delik merkezleri B = {B}, boyuna merkezler C = {C} aralığındadır. Gövdenin L1 uzunluğu {L1}, toplam L ölçüsü {L} değerindedir. '
    if raw.get('seri') and raw['genis']:
        mounting += f"{raw['govde']} kodlu flanşlı yapı " + ('üstten montaj içindir; A tipi diş derinliği E tipiyle karıştırılmamalıdır. ' if raw['govde'].endswith('A') else 'üstten veya alttan bağlantıya izin verir; iki yöndeki cıvata düzeni aynı şekilde kurulmaz. ')
    else:
        mounting += 'Geniş flanş iki yana uzanan montaj yüzeyi sunar. ' if raw['genis'] else 'Dar blok üstten bağlantıya yönelik yerleşim sunar. '
    mounting += f'Bağlantı dişi {M} olarak belirtilir. Plaka kalınlığı, dişe girme boyu ve cıvata başının oturacağı yüzey montajdan önce kontrol edilmelidir.'
    if raw.get('seri'):
        seal = 'iki yönlü uç keçeleri ve alt keçe' if raw['conta'] == 'SS' else 'SS düzenindeki uç keçeleri ve alt keçeye ek metal sıyırıcı'
        protection = f"{code} üzerindeki {raw['conta']} eki, {seal} anlamına gelir. FC hafif ön yükü, N normal hassasiyet sınıfını belirtir; FCN tek başına bir gövde tipi değildir. "
        protection += (f"ZZ sıyırıcılı {raw['model']} için {L} toplam uzunluk, standart gövdeye göre {str(raw['ZZ_boy_farki_mm']).replace('.', ',')} mm uzama içerir. Metal sıyırıcı, büyük parçacıkların uç keçesine ulaşmasını azaltmaya yardımcı olur; düzenli temizliğin yerini tutmaz." if raw['conta'] == 'ZZ' else f"{raw['model']} için verilen {L} uzunluk SS düzenine aittir. Farklı conta seçenekleri uç boşluğunu değiştirebileceğinden, koruyucu kapak ile hareket sonu arasındaki mesafe ayrıca gözden geçirilmelidir.")
        capacity = f"{code} için temel dinamik yük kapasitesi {d['Dinamik Yük Kapasitesi']}, temel statik yük kapasitesi {d['Statik Yük Kapasitesi']} değerindedir. Dinamik değer 50 km nominal ömür esasına dayanır; bunlar doğrudan makinenin güvenli çalışma yükü değildir. "
        capacity += (f"Araba ağırlığı {d['Araba Ağırlığı']} olarak verilir. " if 'Araba Ağırlığı' in d else 'Metal sıyırıcılı varyantın ayrı ağırlığı belirtilmediği için bu ürün için ağırlık verilmemiştir. ')
        capacity += 'Yükün uygulama noktası, ivme, darbe, araba sayısı ve raylar arası mesafe birlikte hesaplanmalıdır.'
        distinction = (f"{code}, MSB serisinin alçak/kompakt kesitli {raw['govde']} gövdesidir. E ve S modelleri, aynı serinin TE ve TS orta yük gövdelerinden daha uzundur. " if raw['seri'] == 'MSB' else f"{code} içindeki {raw['govde']} eki " + ('uzatılmış gövdeyi ayırt eder. ' if raw['uzun'] else 'standart boy gövdeyi ayırt eder. '))
        distinction += f'L1 = {L1} ve C = {C} bu seçimin önemli ölçüleridir. Ray tarafında {rail} kesiti aranır. Başka bir serinin yalnız nominal numarasının aynı olması, ön yük ve yuvarlanma yolu eşleşmesini garanti etmez.'
    else:
        protection = f'{code}, HIWIN HG serisi ile birebir ölçü uyumlu blok geometrisine sahiptir. Bu ifade ölçüsel eşleşmeyi anlatır; başka markanın yük kapasitesinin veya ömür değerinin Yamansa ürününe aktarıldığı anlamına gelmez. Ray tarafında {rail} esas alınır. Mevcut rayın yuvarlanma yolları, aşınma durumu, ön yükü ve çalışma boşluğu ayrıca kontrol edilmelidir; yalnız dış ölçüler üzerinden çalışma garantisi çıkarılmamalıdır.'
        capacity = f'Yamansa {code} için dinamik/statik yük kapasitesi ve gerçek araba ağırlığı belirtilmemiştir. Eksen hesabında bu değerleri başka markanın tablosundan doğrudan almak yerine uygulamaya uygun ürün bilgisini edinmek gerekir. {W} genişlik ve {L} uzunluk yerleşim ölçüleridir; tek başlarına güvenli taşıma yükünü ifade etmez. Moment yükleri, ani duruşlar ve yükün raydan uzaklığı birlikte değerlendirilmelidir.'
        distinction = f'{code} modelinde ' + ('uzun gövde, kısa tip yerine daha fazla boyuna alan gerektirir. ' if raw['uzun'] else 'standart gövde, uzun tip ile aynı dış uzunluğa sahip değildir. ') + f'B = {B} ve C = {C} aralıkları eski bağlantı plakasının yeniden kullanılıp kullanılamayacağını belirler. L1 = {L1} ile L = {L} aynı ölçü değildir; uç kapak ve gresörlük çevresinde bakım için erişim alanı bırakılmalıdır.'
    applications = [
        f'{code}; otomasyon kızakları, konumlandırma tablaları ve parça taşıma düzeneklerinde değerlendirilebilir. {W} genişliğindeki {shape} gövde, tablanın ray üzerine oturduğu alanı belirler. CNC yardımcı eksenlerinde veya tekrarlı besleme düzeneklerinde seçilecek araba sayısı yük dağılımına bağlıdır. Yağlama noktasına erişim ve hareketli kabloların izlediği yol da eksen yerleşimine dahil edilmelidir.',
        f'Paketleme makinelerinin besleme tablaları, ölçüm kızakları ve montaj istasyonları {code} için değerlendirilebilecek uygulamalardır. {H} montaj yüksekliği çevredeki parçaların konumuyla birlikte düşünülmelidir. {shape} blok biçimi, raylar arası mesafe ve plaka rijitliği ile uyumlu seçilir. Talaşlı ortamlarda koruyucu düzenek, temiz ortamlarda ise yağlayıcının süreçle uyumu ayrıca önem taşır.',
        f'{code}, doğrusal taşıma, takım yardımcı hareketi ve endüstriyel konumlandırma uygulamalarında kullanılmak üzere değerlendirilebilir. {L} toplam uzunluk, çalışma strokunu arabanın kendi boyundan ayırarak hesaplamayı gerektirir. {size} mm nominal boy seçilirken taşıma yükünün yanı sıra yön değiştirme sıklığı, çalışma hızı ve eksene etkiyen momentler dikkate alınmalıdır. Gövde biçimi tek başına uygulamaya yeterlilik göstergesi değildir.'
    ][index % 3]
    care = f'{code} montajından önce ray ve plaka yüzeyleri temizlenmeli, çapak ve talaş kalmadığı görülmelidir. Araba raya geçirilirken bilyaları tutan taşıma aparatı, rayla kesintisiz aktarım sağlayacak şekilde korunur. Bağlantılar tamamlandıktan sonra eksen tüm strok boyunca kontrol edilir; sıkışma varsa daha fazla kuvvet uygulamak yerine paralellik ve yüzey hataları araştırılır. {size} mm boydaki bu modelin yağlama sıklığı ortam kirliliği ve çalışma süresine göre planlanmalıdır.'
    selection = f'{code} siparişinde kodu, {M} bağlantıyı ve {B} x {C} delik düzenini birlikte karşılaştırın. Farklı gövdeleri <a href="{CAR_LINK}">lineer arabalar</a> bölümünde, eşleşecek profilleri <a href="{RAIL_LINK}">lineer raylar</a> kategorisinde inceleyebilirsiniz. Bu kayıt tek lineer araba içindir; fotoğrafta görülebilen ray veya diğer montaj parçaları ürün kapsamına dahil değildir. Mevcut rayın durumu ve çalışma boşluğu eşleştirmeden önce değerlendirilmelidir.'
    return list(zip(['Gövde ve Yerleşim', 'Bağlantı Ölçüleri', 'Seri ve Model Farkı', 'Kod ve Koruma Düzeni', 'Yük ve Eksen Seçimi', 'Kullanım Alanları', 'Montaj ve Bakım', 'Doğru Modeli Seçerken'], [intro, mounting, distinction, protection, capacity, applications, care, selection]))


def rail_sections(raw, code):
    d = {k: v['deger'] for k, v in raw['degerler'].items()}
    size = raw['nominal']
    WR, HR, P = d['Ray Genişliği (WR)'], d['Ray Yüksekliği (HR)'], d['P']
    return [
        ('4 Metre Profil Ray', f'{code}, {size} mm nominal boyutlu lineer kızak sistemleri için 4 metre uzunluğunda profil raydır. Fiziksel kesit genişliği WR = {WR}, yüksekliği HR = {HR} değerindedir. Nominal model numarası ile gerçek ray genişliği her boyutta aynı değildir. Boy bilgisi tek parça ray uzunluğunu ifade eder; tabla stroku ise arabanın boyu, uç durdurucular ve güvenlik boşlukları çıkarılarak ayrıca belirlenir.'),
        ('Delik ve Bağlantı Düzeni', f'{code} üstten bağlantılı havşalı delik düzeninde P = {P} delik adımı kullanır. Delik üst çapı D = {d["D"]}, havşa derinliği h = {d["h"]}, geçiş çapı d = {d["d"]} değerindedir. Bu ray, alttan dişli delikle bağlanan T tipi rayla karıştırılmamalıdır. Montaj cıvatası seçilirken geçiş çapının yanında havşa derinliği ve cıvata başının oturma biçimi de kontrol edilir; baş yüzeyi rayın çalışma alanına taşmamalıdır.'),
        ('Uç Mesafesi ve Boy Planlaması', f'{code} için standart E uç mesafesi {d["E"]} olarak belirtilir. Bu değer, 4 metre boyun iki ucunda aynı mesafenin kesin uygulanacağı anlamına gelmez. Kesilmiş rayın başlangıç ve bitiş delik mesafeleri, gerçek delik sayısı ve kesim konumu birlikte kontrol edilmelidir. P = {P} adım üzerinden tasarım yapılırken son deliğin bittiği yer ile ray ucunda bırakılan pay ayrı ölçüler olarak ele alınır.'),
        ('Araba ile Ölçü Uyumu', f'{code}, HIWIN HG serisi ile birebir ölçü uyumlu ray geometrisine sahiptir. WR = {WR} ve HR = {HR} kesit ölçülerinin eşleşmesi ilk kontroldür; arabanın yuvarlanma yolları, toleransı, ön yükü ve rayın aşınma durumu ayrıca değerlendirilir. Parçaların sadece nominal {size} numarasına bakılarak birleştirilmesi doğru değildir. Montaj öncesi araba ray boyunca kontrollü gezdirilmeli; sıkışma veya düzensiz boşluk varsa eşleşme yeniden incelenmelidir.'),
        ('Kullanım Alanları', f'4 metre boydaki {code}; uzun besleme eksenleri, otomasyon hatları, parça taşıma sistemleri ve konumlandırma düzeneklerinde değerlendirilebilir. {WR} genişliğindeki profil için düzgün işlenmiş ve yeterli rijitlikte bir bağlama yüzeyi hazırlanmalıdır. Rayın tek veya çift kullanılması, araba sayısı ve raylar arası mesafe yük dağılımına göre belirlenir. Uzun eksenlerde temel gövdenin sehim ve sıcaklık davranışı da hareket kalitesini etkiler.'),
        ('Montaj ve Bakım', f'{code} monte edilmeden önce oturma yüzeyi temizlenmeli; çapak, kir ve lokal yükseklik kalmadığı kontrol edilmelidir. {HR} kesit yüksekliğiyle uyumlu omuz ve bağlantı alanı bırakılır. Cıvatalar kademeli sıkılırken paralellik korunmalı, araba tüm çalışma aralığında kontrol edilmelidir. Delik kapakları ve koruyucu örtüler kir girişini azaltır. Yağlama planı yalnız ray boyuna değil, hız, çalışma süresi ve ortamın kir yüküne göre kurulmalıdır.'),
        ('Ürün Kapsamı ve Seçim', f'{code} kaydı 4 metre ray içindir; araba ve bağlantı aksesuarları dahil değildir. Yamansa ürününe ait kg/m ağırlık belirtilmediğinden eşdeğer markanın ağırlığı gerçek ürün ağırlığı olarak sunulmaz. Uygun bloğu <a href="{CAR_LINK}">lineer arabalar</a> kategorisinde, diğer kesitleri <a href="{RAIL_LINK}">lineer raylar</a> bölümünde inceleyebilirsiniz. Siparişte nominal {size} boyunu, kesit ölçülerini, P delik adımını ve 4 metre uzunluğu birlikte belirtin.')]


def product(raw, photo, index):
    title, code, shape = identity(raw)
    rail = raw['model'].startswith('HGR')
    brand = 'PMI' if raw.get('seri') else 'Yamansa'
    specs = [(k, v['deger']) for k, v in raw['degerler'].items()]
    if raw.get('seri'):
        specs += [('Conta Tipi', raw['conta'] + (': iki yönlü uç keçesi + alt keçe' if raw['conta'] == 'SS' else ': SS + metal sıyırıcı')), ('Ön Yük', raw['on_yuk']), ('Hassasiyet', raw['hassasiyet'])]
    opening_keys = ['Ray Genişliği (WR)', 'Ray Yüksekliği (HR)', 'P', 'D', 'h', 'd', 'Boy'] if rail else ['Genişlik (W)', 'Yükseklik (H)', 'Uzunluk (L)', 'B', 'C', 'Vida (M x l)', 'Vida (M)']
    opening = [('Marka', brand)] + [(k, v) for k, v in specs if k in opening_keys]
    sections = rail_sections(raw, code) if rail else car_sections(raw, code, shape, index)
    desc = '<div class="urunTabAlt"><div class="ydsc"><div class="ym"><h2>' + escape(title) + '</h2>'
    desc += ''.join('<div class="ysc"><h3>' + escape(h) + '</h3><p>' + p + '</p></div>' for h, p in sections)
    desc += '<h3>Teknik Özellikler</h3><ul>' + ''.join('<li><strong>' + escape(k) + ':</strong> ' + escape(v) + '</li>' for k, v in specs) + '</ul></div></div><div class="teknikDetay"></div></div>'
    size, model = raw['nominal'], raw['model']
    family_forms = re.sub(r'(\D+)(\d+)(.*)', r'\1 \2 \3', model).strip()
    words = ', '.join(dict.fromkeys([model, family_forms, family_forms.replace(' ', '-'), code, tr_lower(code), ascii_text(code), title, ascii_text(title), f'{size} mm', f'{size}mm', 'lineer ray' if rail else 'lineer araba', 'profil ray, linear guide rail, 4 metre, 4000 mm' if rail else 'lineer kızak arabası, lineer kizak arabasi, linear guide block', brand + ' ' + model]))
    brief = f'{code} ' + ('4 metre lineer ray: ' if rail else shape + ' lineer araba: ')
    brief += (f"{raw['degerler']['Ray Genişliği (WR)']['deger']} genişlik, {raw['degerler']['Ray Yüksekliği (HR)']['deger']} yükseklik, {raw['degerler']['P']['deger']} delik adımı." if rail else f"{size} mm nominal ray boyutu, {raw['degerler']['Genişlik (W)']['deger']} genişlik ve {raw['degerler']['Uzunluk (L)']['deger']} uzunluk.")
    item = dict(kod=raw['kod'], URUNADI=title, MARKA=brand, KATEGORI='LİNEER>' + ('LİNEER RAYLAR' if rail else 'LİNEER ARABALAR'), EK_KATEGORILER=[], yeni_kategori=False, ONYAZI=table(opening), ACIKLAMA=desc, ANAHTARKELIME=words, SEO_SAYFABASLIK=title, SEO_SAYFAACIKLAMA=brief, SEO_ANAHTARKELIME=words, resim='gorseller/' + slug(title) + '.jpg', resim_seviye=photo['seviye'], resim_kaynak=photo['url'], teknik_kaynak=[raw['kaynak']], bayraklar=raw['bayraklar'])
    ctx = dict(kod=raw['kod'], title=title, path='/' + slug(title), productId=index + 1, crumbs=['Anasayfa', 'LİNEER', 'LİNEER RAYLAR' if rail else 'LİNEER ARABALAR'], specs=[dict(l=k, v=v) for k, v in specs], onyazi=[dict(l=k, v=v) for k, v in opening])
    return item, ctx


def compose(photo, target):
    im = Image.open(ROOT / photo['dosya']).convert('RGBA')
    if photo.get('kutu'):
        im = im.crop(photo['kutu'])
    if im.getextrema()[3][0] < 255:
        im = im.crop(im.getchannel('A').point(lambda p: 255 if p > 20 else 0).getbbox())
        white = Image.new('RGBA', im.size, 'white')
        white.alpha_composite(im)
        im = white.convert('RGB')
    else:
        im = im.convert('RGB')
        mask = ImageChops.difference(im, Image.new('RGB', im.size, 'white')).convert('L').point(lambda p: 255 if p > 22 else 0)
        box = mask.getbbox()
        if not box:
            raise ValueError('Boş ürün görseli')
        im = im.crop(box)
    scale = min(440 / im.width, 240 / im.height)
    im = im.resize((round(im.width * scale), round(im.height * scale)), Image.Resampling.LANCZOS)
    template = Image.open(ROOT / 'sablon.png').convert('RGB')
    canvas = Image.new('RGB', (500, 500), 'white')
    canvas.paste(template.crop((0, 0, 500, 100)), (0, 0))
    canvas.paste(im, ((500 - im.width) // 2, 100 + (250 - im.height) // 2))
    canvas.save(ROOT / target, quality=95, subsampling=0)


def main():
    raw = [r for family in ['hg', 'hgr', 'pmi'] for r in json.loads((ROOT / f'veri/{family}.json').read_text())]
    photos = json.loads((ROOT / 'veri/gorsel-secimleri.json').read_text())
    items, contexts = [], []
    for index, record in enumerate(raw):
        photo = photos[record['model']]
        item, ctx = product(record, photo, index)
        compose(photo, item['resim'])
        items.append(item)
        contexts.append(ctx)
    if (ROOT / 'veri/aile2.json').exists():
        from aile2_hazirla import product as family2_product
        extra = json.loads((ROOT / 'veri/aile2.json').read_text())
        extra_photos = json.loads((ROOT / 'veri/aile2-gorsel-secimleri.json').read_text())
        for record in extra:
            photo = extra_photos[record['kod']]
            item, ctx = family2_product(record, photo, len(items))
            compose(photo, item['resim'])
            items.append(item)
            contexts.append(ctx)
    if (ROOT / 'veri/aile3.json').exists():
        from aile3_hazirla import product as family3_product
        extra = json.loads((ROOT / 'veri/aile3.json').read_text())
        extra_photos = json.loads((ROOT / 'veri/aile3-gorsel-secimleri.json').read_text())
        for record in extra:
            photo = extra_photos[record['kod']]
            item, ctx = family3_product(record, photo, len(items))
            compose(photo, item['resim'])
            items.append(item)
            contexts.append(ctx)
    (ROOT / 'urunler.jsonl').write_text(''.join(json.dumps(r, ensure_ascii=False) + '\n' for r in items))
    (ROOT / 'veri/lineer-ctx.json').write_text(json.dumps(contexts, ensure_ascii=False, indent=2) + '\n')
    print(f'Üretilen ürün: {len(items)}')


if __name__ == '__main__':
    main()
