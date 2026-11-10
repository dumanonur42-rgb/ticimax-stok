import json
import sys
from pathlib import Path
from urllib.parse import quote
from playwright.sync_api import sync_playwright
from bs4 import BeautifulSoup

root = Path(__file__).resolve().parent
with sync_playwright() as p:
    browser = p.chromium.launch(executable_path='/home/ubuntu/.local/bin/google-chrome', headless=True, args=['--no-sandbox'])
    if '--all' in sys.argv or '--types' in sys.argv:
        rows = json.loads((root / 'urunler_parsed.json').read_text())
        type_queries = {
            'chain3': 'triplex roller chain photo',
            'sschain1': 'stainless steel roller chain simplex',
            'sschain2': 'stainless steel roller chain duplex',
            'hpchain': '08B hollow pin chain',
            'sshpchain': 'stainless hollow pin roller chain',
            'double': 'C2052 conveyor chain large roller',
            'hpdoublelarge': 'C2052 hollow pin roller chain',
            'hpdoublesmall': 'C2042 hollow pin roller chain',
            'offset2': 'duplex roller chain offset link',
            'offset3': 'triplex roller chain offset link',
            'ssoffset1': 'stainless roller chain offset link',
            'ssoffset2': 'stainless duplex roller chain offset link',
            'clip2': 'duplex roller chain connecting link spring clip',
            'clip3': 'triplex roller chain connecting link spring clip',
            'ssclip1': 'stainless roller chain connecting link spring clip',
            'ssclip2': 'stainless duplex roller chain connecting link spring clip',
            'hpclip': 'hollow pin roller chain connecting link',
            'sshpclip': 'stainless hollow pin roller chain connecting link',
            '415h': '415H connecting link',
            'sprocket9': '16B-2 9 teeth sprocket',
        }
        if '--types' in sys.argv:
            rows = [{'kod': k, 'query': v} for k, v in type_queries.items()]
        destination = root / ('gorsel_tip_arama.json' if '--types' in sys.argv else 'gorsel_arama.json')
        records = json.loads(destination.read_text()) if destination.exists() else {}
        cached = {r['query']: r for r in records.values() if r.get('candidates')}
        for row in rows:
            if records.get(row['kod'], {}).get('candidates'):
                continue
            if 'query' in row:
                query = row['query']
            else:
                brand = row['gosterilecek_marka']
                brand = 'Orka Orkapt' if brand == 'Yamansa' else brand
                kind = {'zincir': 'roller chain', 'bakla': 'offset link', 'kilit': 'connecting link', 'disli': '9 teeth sprocket'}[row['tip']]
                query = brand + ' ' + row['iso_kod'] + ' ' + ('stainless ' if row['paslanmaz'] else '') + ('hollow pin ' if row['pim_delikli'] else '') + kind
            if query in cached:
                records[row['kod']] = dict(cached[query], shared_query=True)
                continue
            context = browser.new_context()
            page = context.new_page()
            record = {'query': query, 'search_url': 'https://yandex.com/images/search?text=' + quote(query)}
            try:
                page.goto(record['search_url'], wait_until='domcontentloaded', timeout=30000)
                page.wait_for_function('document.querySelectorAll("[data-state]").length>1', timeout=12000)
                soup = BeautifulSoup(page.content(), 'html.parser')
                states = [json.loads(s['data-state']) for s in soup.select('[data-state]')]
                state = next(s['initialState'] for s in states if 'initialState' in s)
                items = state['serpList']['items']
                record['candidates'] = [{'title': items['entities'][k]['alt'], 'image': items['entities'][k].get('origUrl'), 'page': items['entities'][k].get('snippet', {}).get('url')} for k in items['keys'][:20]]
                cached[query] = record
            except Exception as error:
                record['error'] = str(error).splitlines()[0]
                record['title'] = page.title()
            finally:
                context.close()
            records[row['kod']] = record
            destination.write_text(json.dumps(records, ensure_ascii=False, indent=2) + '\n')
        destination.write_text(json.dumps(records, ensure_ascii=False, indent=2) + '\n')
        print('Yandex research:', len(records), 'stock codes;', sum(bool(r.get('candidates')) for r in records.values()), 'with candidates;', sum(bool(r.get('error')) for r in records.values()), 'errors')
        browser.close()
        sys.exit(0)
    page = browser.new_page()
    page.goto('https://yandex.com/images/search?text=' + quote('TMP 16B-4 roller chain'), wait_until='domcontentloaded')
    page.wait_for_function('Array.from(document.images).filter(i=>i.src.startsWith("http")).length>5', timeout=15000)
    html = page.content()
    (root / 'gorsel_kaynak/yandex-tmp-16b4.html').write_text(html)
    data = page.locator('[data-bem]').evaluate_all('(nodes)=>nodes.slice(0,8).map(n=>n.getAttribute("data-bem"))')
    print('Yandex:', page.title(), 'data-bem:', str(data)[:1800])
    print('Images:', page.locator('img').evaluate_all('(nodes)=>nodes.slice(0,8).map(n=>({alt:n.alt,src:n.src}))'))
    browser.close()
