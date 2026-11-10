import json
from collections import Counter, defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent


def main():
    records = [json.loads(line) for line in (ROOT / 'urunler.jsonl').read_text().splitlines()]
    images = Counter(r['resim_seviye'] for r in records)
    missing = [r['kod'] for r in records if 'eksik' in r['bayraklar']]
    names = defaultdict(list)
    for record in records:
        names[record['URUNADI']].append(record['kod'])
    collisions = [codes for codes in names.values() if len(codes) > 1]
    conflicts = [r for r in records if 'marka_celiskisi' in r['bayraklar']]
    no_brand_source = [r['kod'] for r in records if 'marka_kaynagi_yok' in r['bayraklar']]
    no_unit = [r['kod'] for r in records if 'birim_yok' in r['bayraklar']]
    duplicates = [r['kod'] for r in records if 'olasi_kopya' in r['bayraklar']]
    sources = set()

    def collect(value):
        if isinstance(value, dict):
            for key, item in value.items():
                if key == 'kaynak' and isinstance(item, str) and item.startswith('http'):
                    sources.add(item)
                collect(item)
        elif isinstance(value, list):
            for item in value:
                collect(item)

    collect(json.loads((ROOT / 'work/teknik.json').read_text()))
    (ROOT / 'work/kaynaklar/kaynak-url-listesi.json').write_text(json.dumps(sorted(sources), ensure_ascii=False, indent=2) + '\n')
    lines = ['# Zincir ürünleri teslim raporu', '',
             f"Toplam: {len(records)} ürün. Görseller: birebir {images['birebir']}, aynı tip {images['ayni_tip']}, görselsiz 0. 212 farklı 500×500 JPG, 24 fotoğraf varyantı.",
             'Ticimax paneline girilmedi, yükleme yapılmadı. Ürünler yayınlanmadı.', '',
             '## Teknik ve çizim durumu',
             f'Eksik teknik: {len(missing)} ürün. Ölçü tahmini yapılmadı; eksik alanlar yazılmadı.',
             ', '.join(missing),
             'Pim delikli 23 ürün ile 415H için tam ölçü yok. 415H iç genişliği yazılmadı; 1/8 ile KMC 4,7 mm uyuşmazlığı olcu_celiskisi olarak işaretlendi.',
             'ORK ZD 1209 için mil/göbek ölçüleri eksik; 9 dişli birebir fotoğraf yerine çift sıralı seri fotoğrafı kullanıldı ve bayraklandı.',
             'Tarayıcıda açıklama listesinden ctx.specs: 206 çizim üretildi; 24 çizim null ve tamamı eksik bayraklı. Dişli mevcut zincir_disli modülüyle çizilir.',
             'Yeni modül: draw/zincir, commit 6f028c19548106b2a9fb32447d82122d3a856bfa. Henüz build/jsDelivr içinde değil; site-assets entegrasyonu ve yeniden build gerekiyor.', '',
             '## Kategori ve satış birimi',
             'Yeni kategori önerisi: ZİNCİR - ZİNCİR DİŞLİSİ>ZİNCİR KİLİTLERİ VE BAKLALARI (123 ürün, kullanıcı onayı bekler). Ek kategori: mevcut ZİNCİRLER.',
             '106 zincir mevcut ZİNCİRLER, 1 dişli mevcut ÇİFT SIRA ZİNCİR DİŞLİLERİ kategorisinde.',
             '70 ambalajlı üründe satış birimi Adet; ambalaj miktarı yalnız teknik listededir. Adlarda ve paragraflarda paket/koli satış ifadesi yok. Fiyat ve minimum sipariş ayarlanmadı.',
             f'Satış birimi boş {len(no_unit)} ürün: birim_yok bayrağı var, satış birimi yazılmadı.', '',
             '## Marka ve veri kararları',
             f'Marka çelişkisi bulunan {len(conflicts)} kod: ' + ', '.join(r['kod'] for r in conflicts),
             'Natural adlılar Natural, CSE ZİN 06B2 CSE olarak korundu. ARASHİ/TYCO/REXBO müşteri metnine yazılmadı. Boş ham markalı ORK ZK P415H20 Yamansa; ham_marka_bos bayrağı korundu.',
             'AYZ ZİN 16B2 çift sıra; sira_celiskisi bayrağı var. ORK ZK P415H20 ambalaj adedi ham addaki 100 olarak korundu; kod20/ad100 çelişkisi bayraklı.',
             f'Resmi marka kaynağı bulunmayan {len(no_brand_source)} gerçek markalı üründe marka_kaynagi_yok var. Aynı standart kodda ISO 606 geometrisi kullanıldı; markaya özgü performans iddiası yok.',
             'iwis ECOPLUS için 2 resmi ürün profili kullanıldı. Sedis 4 üründe resmi katalog geometrisi kullanıldı; seri belirtilmediğinden seri_belirsiz bayrağı var. Paslanmaz ve bağlantı elemanlarında kopma yükü yazılmadı.', '',
             '## Aynı adlar ve olası kopyalar',
             f'{len(collisions)} aynı-ad grubu, 18 ek kayıt vardır (16 çift ve bir üçlü grup). Her kayıt diğer tüm kodlara ayni_ad bayrağıyla bağlıdır; aynı adlar değiştirilmedi.']
    lines += ['- ' + ' / '.join(codes) for codes in collisions]
    lines += ['17 mevcut zincir sayfasının DIN ISO kodları karşılaştırıldı. Olası kopyalar: ' + ', '.join(duplicates) + '. Kaynak: work/existing_zincir_sayfalar.json.', '',
              '## Kaynaklar ve denetim',
              'Ölçülerin alan bazlı URL/sayfa kayıtları: work/teknik.json. URL listesi: work/kaynaklar/kaynak-url-listesi.json.',
              'Ana kaynaklar: iwis ECOPLUS, Sedis BS, Donghua çift hatve, aynı kodlu THC tablosu, KMC 415H. HP için eşleşmeyen başka marka ölçüleri aktarılmadı.',
              'Fotoğraf URL ve kırpma kayıtları: work/gorsel_kaynaklar.json; stok bazlı araştırma: work/gorsel_arama.json. Büyük PDF indirmelerinin toplamı 5 MB üstünde olduğu için PDF dosyaları commit dışında; URL ve metin kayıtları korunur.',
              'Denetim: python3 work/check_icerik.py ve python3 work/check_images.py. Çıktılar: work/icerik_kontrol.log, work/gorsel_kontrol.log; stok bazlı çizim sonuçları: work/cizim_kontrol.json.',
              'Her açıklama görünür metinde en az 1800 karakterdir. 120 karakterden uzun tekrar eden paragraf yoktur. SEO, anahtar kelime, kaynak ölçü, görsel ve izinli iç bağlantılar denetlenir.',
              'İçerik revizyonu: tam ad yalnız h2 ve ilk cümlede; sonraki paragraflarda ölçü, sıra düzeni, bağlantı seçimi ve 10 adım üzerinden ölçüm anlatılır. Tam ürün adı en çok 2 kez, ölçü kodu başlık ve girişten sonra en çok 2 kez geçer. SEO açıklamaları ad kopyası değil, sayısal ölçülü cümlelerdir.',
              'Üretici kodları ham adlarla karşılaştırıldı: Natural ASA 60-1 (12A-1) yazımı ve HP A2052 / HP C20xx önekleri korundu. Değişen 7 adın görsel dosyaları ve stok eşlemeleri birlikte yeniden adlandırıldı; fotoğraf içerikleri değişmedi.',
              'Üç ürün ön izlemesi: work/onizleme/*.html ve *.png. Temas panoları: work/gorsel_onizleme/.',
              'Bu girdi branch’inde paket düzeyi lint/typecheck/test aşaması yoktur; Python sözdizimi ve içerik/tarayıcı denetimleri kullanılır.']
    (ROOT / 'rapor.md').write_text('\n\n'.join(lines) + '\n')
    print('Report:', ROOT / 'rapor.md')


if __name__ == '__main__':
    main()
