import json
import subprocess
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
from bs4 import BeautifulSoup
from urllib.parse import urljoin

ROOT = Path(__file__).resolve().parent


def fetch_page(item):
    key, url = item
    path = ROOT / 'gorsel_kaynak' / (key + '.html')
    subprocess.run(['curl', '-sL', '--max-time', '35', url, '-o', str(path)], check=True)
    soup = BeautifulSoup(path.read_text(), 'html.parser')
    images = []
    for tag in soup.find_all('img'):
        src = tag.get('src') or tag.get('data-src')
        if src:
            images.append({'alt': tag.get('alt'), 'url': urljoin(url, src)})
    for tag in soup.select('meta[property="og:image"]'):
        images.append({'alt': 'og:image', 'url': urljoin(url, tag['content'])})
    result = {'page': url, 'images': images}
    (ROOT / 'gorsel_kaynak' / (key + '-images.json')).write_text(json.dumps(result, ensure_ascii=False, indent=2))
    print(key, [(i['alt'], i['url']) for i in images if not any(v in i['url'].lower() for v in ['logo', 'icon', 'banner', 'flag', 'menu', 'brand'])][:12])
    return result


if __name__ == '__main__':
    pages = {
        'ayzin': 'https://ayzinzincir.com.tr/standartzincir',
        'nitro-triplex': 'https://www.nitrochain.com/08b-3-triple-metric-roller-chain',
        'usa-quad': 'https://usarollerchain.com/products/16b-4-roller-chain',
        'usa-offset3': 'https://usarollerchain.com/products/08b-3-offset-link',
        'usa-clip3': 'https://usarollerchain.com/products/08b-3-connecting-link',
        'usa-ss2': 'https://usarollerchain.com/products/08b-2-stainless-steel-roller-chain',
        'usa-ss-offset': 'https://usarollerchain.com/products/08b-1-stainless-steel-offset-link',
        'usa-ss-offset2': 'https://usarollerchain.com/products/08b-2-stainless-steel-offset-link',
        'usa-ss-clip': 'https://usarollerchain.com/products/08b-1-stainless-steel-connecting-link',
        'usa-ss-clip2': 'https://usarollerchain.com/products/08b-2-stainless-steel-connecting-link',
    }
    with ThreadPoolExecutor(max_workers=5) as pool:
        list(pool.map(fetch_page, pages.items()))
