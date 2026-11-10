"""Aday araması; bulunan görseller onaylanmadan ürünlerde kullanılmaz."""
import concurrent.futures
import html
import json
import re
import sys
from pathlib import Path
from urllib.parse import quote

import requests
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]


def search(query):
    page = requests.get('https://yandex.com/images/search?text=' + quote(query), timeout=45)
    page.raise_for_status()
    text = html.unescape(page.text)
    urls = list(dict.fromkeys(re.findall(r'"origUrl":"(.*?)"', text)))[:16]
    records = []
    for index, url in enumerate(urls):
        path = ROOT / 'veri' / ('arama-' + query.replace(' ', '-') + f'-{index}.jpg')
        try:
            result = requests.get(url, timeout=20)
            result.raise_for_status()
            path.write_bytes(result.content)
            with Image.open(path) as im:
                im.verify()
            records.append({'dosya': str(path.relative_to(ROOT)), 'url': url})
        except (requests.RequestException, OSError, ValueError):
            if path.exists():
                path.unlink()
    (ROOT / 'veri' / ('arama-' + query.replace(' ', '-') + '.json')).write_text(
        json.dumps(records, ensure_ascii=False, indent=2) + '\n')
    return query, len(records)


if __name__ == '__main__':
    with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool:
        for query, count in pool.map(search, sys.argv[1:]):
            print(query, count)
