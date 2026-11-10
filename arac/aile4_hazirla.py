"""Kaynağı eksik varyantlarda ölçü üretmeden ürün içeriği hazırlar."""
from html import escape
import re

from aile_hazirla import slug, table
from hazirla import ascii_text, tr_lower

CATEGORIES = {'BMT': 'BİLYALI MASAÜSTÜ TAŞIYICILAR', 'PM': 'RULMAN>MAFSAL RULMANLARI', 'GKT': 'KAYNAK SARF MALZEMELERİ>GAZALTI KAYNAK TELLERİ', 'YKKM': 'KAPI OTOMASYONU>YANA KAYAR KAPI MOTORLARI', 'KK': 'KONİK KİLİTLER>S TİPİ (250 TİPİ) KONİK KİLİTLER'}


def identity(raw):
    model, family = raw['model'], raw['aile']
    v = {k: x['deger'] for k, x in raw['degerler'].items()}
    if family == 'BMT':
        prefix = 'Paslanmaz Bilyalı' if model.endswith('C') else 'Plastik Bilyalı' if model.endswith('P') else 'Bilyalı'
        kind = prefix + ' Masaüstü Taşıyıcı'
        if model == 'NL8H':
            model, kind = 'NL-8H', 'Komple Plastik Bilyalı Masaüstü Taşıyıcı'
        elif model in ['SP12AFL', 'SP15AFL']:
            kind = 'Cıvatalı Bilyalı Masaüstü Taşıyıcı'
        elif model == 'SP12BF':
            kind = 'Flanşlı Bilyalı Masaüstü Taşıyıcı'
        elif model == 'SP15A':
            kind = 'Ağır Seri Bilyalı Masaüstü Taşıyıcı'
        return f'{model} {kind} {v.get("Ana Bilya Çapı (Dw)", "")}'.strip()
    if family == 'PM':
        return f'{model} ' + ('İç Dişli' if model.startswith('SSPHS') else 'Dış Dişli') + ' Paslanmaz Rot Başı Mafsal'
    if family == 'GKT':
        return f'SG2 {model} Gazaltı Kaynak Teli {v["Tel Çapı (d)"]}'
    if family == 'YKKM':
        return f'Yana Kayar Kapı Motoru {model} kg'
    if family == 'KK':
        return 'S060 S Tipi 250 Konik Kilit 60×90 mm'
    raise ValueError('Bilinmeyen aile: ' + family)


def sections(raw):
    model, family = raw['model'], raw['aile']
    v = {k: x['deger'] for k, x in raw['degerler'].items()}
    if family == 'BMT':
        detail = '; '.join(k + ': ' + val for k, val in v.items())
        return [
            ('Çok Yönlü Masaüstü Hareket', f'{model}, bir çalışma yüzeyi üzerinde yükün yön değiştirmesine yardımcı olan bilyalı masaüstü taşıyıcıdır. Üstteki ana bilyanın dönmesiyle parça, yalnız tek bir doğrultuya bağlı kalmadan başka bir istasyona yönlendirilebilir. Bu eleman bir zemin tekerleği değildir; masa veya taşıma tablası içine yerleştirilir. {model} için bağlantı tipi ve bilya malzemesi seçilirken yalnız modelin ilk rakamlarına değil, kodun tamamına ve aşağıdaki teknik listeye bakılmalıdır.'),
            ('Gövde ve Yerleşim', f'{model} için belirtilen bilgiler şöyledir: {detail}. Bilya çapı ile gövde çapı aynı ölçü değildir. Flanşlı bir taşıyıcı, flanşsız yuvaya veya saplama bağlantısına doğrudan alternatif sayılmamalıdır. Tablanın kesiti, montaj deliği ve alt taraftaki boşluk, seçilen gövdenin gerçek şekline göre hazırlanır. Listelenmeyen bir yüksekliği kod içindeki sayılardan çıkarmak, bilyanın komşu taşıyıcılarla farklı seviyede kalmasına yol açabilir.'),
            ('Yükün Dağıtılması', f'{model} kullanılan bir tablaya yerleştirilen yükün ağırlığı, her zaman bütün taşıyıcılara eşit dağılmaz. Parçanın alt yüzeyi, ağırlık merkezi, taşıyıcı aralıkları ve yüzeydeki seviye farkları temas eden bilya sayısını değiştirir. Bu nedenle tek bir elemanın değerini toplam adetle çarparak masa kapasitesi belirlenmemelidir. {model} teknik listesinde yük değeri yoksa bu kayıt için sayısal taşıma kapasitesi kabul edilmez; uygulamanın yük ve darbe koşulları ayrıca değerlendirilir.'),
            ('Kullanım Alanları', f'{model}; elle yönlendirme yapılan montaj masaları, ayırma istasyonları ve konveyörler arasındaki geçiş tablaları için değerlendirilebilir. Yükün alt yüzeyinin bilya üzerinde iz yapmaması, gövdeye sürtmemesi ve bağlantı noktalarının yük altında oynamaması kontrol edilir. Plastik bilyalı veya paslanmaz bilyalı bir seçenek, yalnız dış görünüşüne bakılarak bütün gövdenin aynı malzemeden olduğu şeklinde yorumlanmamalıdır. {model} için gıda teması, kimyasal dayanım veya belirli bir sıcaklık sınıfı bu bilgilerden çıkarılamaz.'),
            ('Montaj Sonrası Kontrol', f'{model} takıldıktan sonra bilyanın serbest dönmesi ve taşıma yüzeyinin komşu elemanlarla aynı seviyede olması gözlenir. Montaj sırasında gövdeyi zorlayan bir sıkma uygulanmamalı; bağlantı düzeni kullanım yönüne uygun olmalıdır. Toz ve talaşın bilya çevresine dolması hareketi etkileyebileceğinden çalışma alanının temizliği önem taşır. {model} bakımında kullanılacak temizleyici veya yağlayıcı için malzeme uyumu kontrol edilir; bütün çeşitlere tek bir bakım maddesi önerilmez.')]
    if family == 'PM':
        gender = v['Diş Tipi']
        return [
            ('Paslanmaz Rot Başı Yapısı', f'{model}, {tr_lower(gender)} bağlantılı paslanmaz bir mafsal rot başıdır. Bağlantı çubuğu ile pim arasında açısal hareket gereken düzeneklerde değerlendirilir. Gövdeye açılan veya gövdeden çıkan dişli bölüm, karşı bağlantının biçimini belirler; iç ve dış dişli tipler aynı bağlantıya doğrudan takılmaz. {model} kodundaki R eki sipariş kimliğinin parçasıdır. Parantez içinde geçen başka bir varyant adı bu kodun yerine kullanılmamalıdır.'),
            ('Diş ve Pim Bağlantısı', f'{model} seçilirken diş çapı, adımı ve yönü karşı parçadan kontrol edilir. Dişin elle zorlanmadan başlaması, doğru eşleşmenin ilk kontrolüdür; zorlayarak çevirme uygun olmayan dişleri birbiriyle uyumlu hale getirmez. Pim bağlantısında delik çapı, iç bilezik genişliği ve dayama yüzeyleri ayrı ayrı incelenmelidir. {model} için bu listede sayısal karşılığı olmayan bir ölçü, benzer görünümlü başka bir rot başından kopyalanarak montaj ölçüsü kabul edilmemelidir.'),
            ('Açısal Hareket ve Yerleşim', f'{model} içindeki küresel bağlantı, mekanizmanın konumuna bağlı açısal hareketi karşılamak için kullanılır. Bu, her yönde sınırsız dönme veya belirli bir açıda aynı yük kapasitesi anlamına gelmez. Çubuğun uç konumlarında gövdeye temas etmemesi, pim ve pul düzeninin mafsalı sıkıştırmaması kontrol edilmelidir. {model} çevresinde bırakılacak hareket boşluğu, parçanın yalnız hareketsiz konumdaki zarfına göre değil, bütün çalışma hareketine göre belirlenir.'),
            ('Kullanım Alanları', f'{model}; kontrol kolları, ayar çubukları, mekanik bağlantılar ve açısal hizalama gereken makine düzeneklerinde değerlendirilebilir. Paslanmaz tanımı tek başına belirli bir alaşım numarası, gıda teması onayı veya bütün kimyasallara dayanıklılık garantisi vermez. {model} için statik ve dinamik yükler bu teknik listede bulunmadığından uygulama kapasitesi sayısallaştırılmamıştır. Çekme, basma ve darbe etkileri bağlantının tamamı üzerinden ayrıca incelenmelidir.'),
            ('Sipariş Öncesi Karşılaştırma', f'{model} değiştirilirken eski parçanın dişli bölümünü, pim yatağını ve merkezler arası yerleşimini birlikte karşılaştırın. Yalnız paslanmaz olması veya kodunun benzemesi yeterli değildir. Diş yönü karşı bağlantıyla netleştirilmeden montaja başlanmamalıdır. {model} için sızdırmazlık, yağlama gereksinimi ve bakım aralığı da çalışma ortamına göre belirlenir; ölçü ve malzeme teyidi gerektiren bir bağlantıda görsel benzerlik teknik uyumun yerine geçmez.')]
    if family == 'GKT':
        diameter = v['Tel Çapı (d)']
        return [
            ('SG2 Gazaltı Kaynak Teli', f'{model}, {diameter} çapında SG2 / MG2 gazaltı kaynak telidir. Tel çapı; torç sarf parçaları, tel sürme yolu ve kaynak işleminin kurulumu açısından seçimin temel bilgisidir. SG2 sınıfı için EN ISO 14341-A G3Si1 ve AWS ER70S-6 eşdeğer adlandırmaları kullanılır. Bu sınıf bilgisi, {model} için belirli bir koruyucu gazla hazırlanmış kaynak prosedürünün veya bir partiye ait deney sonucunun yerine geçmez.'),
            ('Tel Sürme Düzeni', f'{model} takılmadan önce {diameter} tel ile kullanılan sürme makarası kanalı, spiral ve kontak meme kontrol edilmelidir. Farklı bir tel çapı için hazırlanmış aşınmış sarf parçaları kararlı tel beslemeyi zorlaştırabilir. Makaranın serbest fakat kontrolsüz boşalmayacak şekilde çalışması, telin sürme yolunda kıvrılmaması önemlidir. {model} üzerindeki tel yüzeyi temiz tutulmalı; kaynak hattına yağ, toz ve nem taşınmasını önleyen bir saklama düzeni kullanılmalıdır.'),
            ('Parametre ve Malzeme Seçimi', f'{model} için kaynak akımı, gerilim ve ilerleme hızı yalnız {diameter} çapına bakılarak sabitlenmez. Ana malzemenin türü ve kalınlığı, birleşim şekli, kaynak pozisyonu, gaz ve istenen dikiş özelliği birlikte değerlendirilir. Hazır bir ayarın farklı bir parçaya doğrudan taşınması uygun değildir. {model} ile çalışılacak işte geçerli kaynak prosedürü esas alınmalı, deneme parçasında tel besleme ve dikiş görünümü kontrol edilerek kurulum tamamlanmalıdır.'),
            ('Kullanım Alanları', f'{model}; SG2 sınıfı telin uygun olduğu çelik imalat işleri, makine atölyeleri ve konstrüksiyon uygulamalarında değerlendirilebilir. Her çelik türünün aynı sarf malzemesiyle kaynaklanabileceği varsayılmamalıdır. {diameter} çapında tel seçilirken ana malzemenin kaynaklanabilirliği ve işin kalite gereksinimleri dikkate alınır. {model} için burada kimyasal bileşim, çekme dayanımı veya darbe değeri verilmediğinden bu özellikler ürünün parti belgesi olmadan sayısallaştırılmamalıdır.'),
            ('Satış Birimi ve İş Güvenliği', f'{model} için satış birimi Adet olarak düzenlenmiştir; ambalaj miktarı teknik listede ayrı tutulur. Tel çapının {diameter} olması iş güvenliği önlemlerini değiştirmez. Kaynak işlemi uygun koruyucu ekipman, havalandırma ve eğitimli personelle yürütülmelidir. {model} kullanılmadan önce makaranın fiziksel durumu ve telin yüzeyi incelenir. Telde pas, kir veya sürmeyi etkileyen bozulma varsa işlem kurulumu tamamlanmadan neden giderilmelidir.')]
    if family == 'YKKM':
        return [
            ('Yana Kayar Kapı Tahriki', f'{model} kg kapı kapasitesiyle adlandırılan bu yana kayar kapı motoru, ray üzerinde yatay hareket eden kapı sistemlerinin tahrikinde değerlendirilir. Kapı ağırlığı kapasitesi tek başına bütün kapı düzenekleri için çalışma uygunluğu anlamına gelmez. {model} kg sınıfında bir motor seçilirken kapının hareket direnci, ray durumu, eğim ve günlük kullanım yoğunluğu birlikte incelenmelidir. Kapı elle hareket ettirildiğinde sıkışıyorsa motor seçimi bu mekanik sorunu ortadan kaldırmaz.'),
            ('Mekanik Bağlantının İncelenmesi', f'{model} kg seçeneğinin montajında taban yerleşimi, kapıdaki tahrik elemanı ve motor çıkışı birlikte karşılaştırılır. Kremayerli bir düzen kullanılacaksa modül ve diş geometrisi motorun gerçek çıkışıyla eşleşmelidir. Bu kayıt {model} kg kapasitesini verir; pinyon diş sayısı veya modül değeri içermez. Bu nedenle mevcut bir kremayerin aynı motorla çalışacağı yalnız görsele bakılarak kabul edilmemeli, karşılıklı dişli ölçüleri montajdan önce netleştirilmelidir.'),
            ('Elektrik ve Kontrol Donanımı', f'{model} kg kapı motoru için besleme gerilimi, motor gücü, bağlantı şeması ve kumanda özellikleri bu teknik listede belirtilmemiştir. Elektrik tesisatı ve kontrol donanımı seçimi ürünün kendi etiketi ve montaj talimatıyla yapılmalıdır. {model} kg sınıfı, belirli bir voltaj veya kumanda setinin ürüne dahil olduğunu göstermez. Fotosel, limit algılama, acil durdurma ve elle serbest bırakma düzenleri projeye uygun biçimde yetkili montaj personeli tarafından değerlendirilmelidir.'),
            ('Kullanım Alanları', f'{model} kg seçeneği; konut, işletme veya tesis girişindeki yana kayar kapı projelerinde mekanik ve elektrik uygunlukları incelenerek değerlendirilebilir. Kapının kullanım sıklığı, açık kalma düzeni ve çevresel koşullar motorun görev çevrimi gereksinimini etkiler. {model} kg bilgisi bir hız, açılma süresi ya da kesintisiz çalışma garantisi değildir. Günlük yoğunluğu yüksek bir uygulamada yalnız ağırlık sınıfı üzerinden karar verilmemelidir.'),
            ('Montaj ve Devreye Alma', f'{model} kg motorla çalışacak kapı, hareket yolu boyunca engellere ve raydan çıkma riskine karşı kontrol edilir. Mekanik durdurucular ve kapı taşıyıcıları motor bağlantısından bağımsız olarak sağlam olmalıdır. Devreye alma sırasında güvenlik elemanlarının çalışması ve kapının uç konumları sınanır. {model} kg seçeneği için teknik ayrıntılar netleşmeden enerji verilmemeli; şebeke bağlantısı, topraklama ve koruma düzeni ilgili kurallara uygun olarak uzman personelce tamamlanmalıdır.')]
    if family == 'KK':
        return [
            ('60×90 mm Mil ve Göbek Bağlantısı', f'{model}, S tipi 250 grubunda bir konik kilittir. 60×90 mm ölçüsü iç çap ile dış çapı ifade eder: iç çap d 60 mm, dış çap D 90 mm olarak ayrılır. 90 mm değeri parçanın eksenel boyu değildir. {model} seçimi yapılırken milin 60 mm bağlantı çapı ve göbeğin 90 mm yuvası birlikte incelenir. Eksenel yerleşim alanı bu iki çaptan hesaplanamaz; göbek derinliği ve parçanın gerçek boyu ayrıca karşılaştırılmalıdır.'),
            ('Konik Sıkma Prensibi', f'{model} gibi konik kilitler, mil ile göbek arasında sıkma bağlantısı oluşturmak için kullanılır. Konik yüzeylerin birbirine göre hareketi bağlantı yüzeylerinde basınç oluşturur. Bu prensip tek başına her uygulamada aynı tork veya eksenel yükün aktarılacağı anlamına gelmez. {model} için kapasite hesabında yüzey durumu, mil ve göbek malzemeleri, bağlantı geometrisi ve montaj koşulları dikkate alınmalıdır; bu listede bir aktarılabilir tork değeri verilmemiştir.'),
            ('Montaj Yüzeylerinin Hazırlanması', f'{model} takılmadan önce 60 mm mil yüzeyi ile 90 mm göbek yuvası çapak, kir ve yüzey hasarı bakımından incelenir. Yüzeylerin temizliği ve yağlama durumu uygulanacak montaj talimatına göre düzenlenir. Başka bir konik kilit tipinin cıvata torku veya sürtünme koşulu bu ürüne doğrudan taşınmamalıdır. {model} için uygun sıkma sırası ve bağlantı elemanları netleştirilmeden cıvatalar gelişigüzel sıkılmamalıdır.'),
            ('Kullanım Alanları', f'{model}; kasnak, dişli, kaplin veya tambur göbeğinin mile bağlanacağı makine düzeneklerinde boyut ve yük uygunluğu incelenerek değerlendirilebilir. 60×90 mm bağlantı ölçüsünün yerleşime uygun olması gerekli fakat tek başına yeterli değildir. Göbek et kalınlığı, malzeme ve değişken yükler de bağlantının tasarımına etki eder. {model} için belirli bir tahrikte kullanılabilirlik, yalnız mil çapına bakılarak kararlaştırılmamalıdır.'),
            ('Kontrol ve Söküm Planı', f'{model} çevresinde montaj aletinin ve gerektiğinde söküm işleminin erişebileceği alan bırakılır. Mil ve göbek eksenlerinin hizası, çalışma sırasında çevredeki parçalara temas olmaması ve bağlantının güvenli biçimde kapatılması kontrol edilir. {model} bakımında gevşetme veya sökme işlemi makine güvenli duruma alındıktan sonra yapılmalıdır. Cıvata sayısı, sıkma momenti ve eksenel boy bu teknik listede verilmediği için benzer bir ürünün bilgileriyle tamamlanmamalıdır.')]
    raise ValueError('Bilinmeyen aile: ' + family)


def product(raw, photo, index):
    title, family, model = identity(raw), raw['aile'], raw['model']
    specs = [(k, v['deger']) for k, v in raw['degerler'].items()] + [('Marka', 'Yamansa')]
    desc = '<div class="urunAciklama"><div class="teknikDetay"><h2>' + escape(title) + '</h2>'
    for heading, text in sections(raw):
        desc += '<h3>' + heading + '</h3><p>' + escape(text) + '</p>'
    links = {'BMT': [('tekerlekler-723', 'tekerlek çözümleri'), ('yatakli-rulman', 'yataklı rulmanlar')], 'PM': [('mafsal-rulmanlari-741', 'mafsal rulmanları'), ('dana-gozlu-mafsallar', 'dana gözlü mafsallar')], 'GKT': [('olcu-aletleri', 'ölçü aletleri'), ('kumpaslar', 'kumpaslar')], 'YKKM': [('duz-kremayerler', 'düz kremayerler'), ('duz-pinyonlar', 'düz pinyonlar')], 'KK': [('s-tipi-250-tipi-konik-kilitler', 'S tipi konik kilitler'), ('konik-kilitler', 'konik kilitler')]}[family]
    desc += '<h3>İlgili Ürün Grupları</h3><p>' + escape(title) + ' ile ilgili atölye ve bağlantı seçenekleri için '
    desc += ' ve '.join('<a href="https://www.yamansarulman.com/' + url + '">' + label + '</a>' for url, label in links)
    desc += ' gruplarını inceleyebilirsiniz. Bu bağlantılar tek başına mekanik uyum veya birlikte teslim bilgisi vermez.</p>'
    desc += '<h3>Teknik Özellikler</h3><ul>' + ''.join('<li><strong>' + escape(k) + ':</strong> ' + escape(v) + '</li>' for k, v in specs) + '</ul></div></div>'
    spaced = re.sub(r'([A-Z]+)(\d+)([A-Z]*)', r'\1 \2 \3', model).strip()
    terms = [model, spaced, spaced.replace(' ', '-'), title, tr_lower(title), ascii_text(tr_lower(title))]
    terms += {'BMT': ['ball transfer unit', 'bilyalı taşıyıcı', 'bilyali tasiyici', 'bilyalı masaüstü', 'bilyali masaustu'], 'PM': ['rod end', 'rot başı', 'rot basi', 'paslanmaz mafsal', 'stainless rod end'], 'GKT': ['SG2', 'SG 2', 'SG-2', 'gazaltı kaynak teli', 'gazalti kaynak teli', 'mig mag welding wire'], 'YKKM': ['yana kayar kapı motoru', 'yana kayar kapi motoru', 'sliding gate motor', model + ' kg', model + 'kg'], 'KK': ['konik kilit', 'locking assembly', '60x90', '60 x 90', '60-90', 'S 060', 'S-060', '250 S tipi']}[family]
    words = ', '.join(dict.fromkeys(terms))
    item = dict(kod=raw['kod'], URUNADI=title, MARKA='Yamansa', KATEGORI=CATEGORIES[family], EK_KATEGORILER=[], yeni_kategori=family in ['BMT', 'GKT', 'YKKM'], ONYAZI=table(specs), ACIKLAMA=desc, ANAHTARKELIME=words, SEO_SAYFABASLIK=title, SEO_SAYFAACIKLAMA=title + '. Teknik bilgileri ve montaj seçiminde dikkat edilecek noktaları inceleyin.', SEO_ANAHTARKELIME=words, resim='gorseller/' + slug(title) + '.jpg', resim_seviye=photo['seviye'], resim_kaynak=photo['url'], teknik_kaynak=list(dict.fromkeys(v['kaynak'] for v in raw['degerler'].values())), bayraklar=raw['bayraklar'])
    ctx = dict(kod=raw['kod'], title=title, path='/' + slug(title), productId=index + 1, crumbs=['Anasayfa'] + CATEGORIES[family].split('>'), specs=[dict(l=k, v=v) for k, v in specs], onyazi=[dict(l=k, v=v) for k, v in specs], cizim_modulu=None)
    return item, ctx
