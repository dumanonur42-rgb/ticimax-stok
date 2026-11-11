"""Fail-closed delivery validation, including the real ES5 drawing module."""
import collections
import html
from html.parser import HTMLParser
import json
from pathlib import Path
import re
import subprocess
import sys
import unicodedata
from urllib.parse import urlparse

from PIL import Image
from assemble import FIELDS, ROOT

DRAW = ROOT.parent / 'draw/site/draw/triger.js'
FACING = ['URUNADI', 'ONYAZI', 'ACIKLAMA', 'ANAHTARKELIME',
          'SEO_SAYFABASLIK', 'SEO_SAYFAACIKLAMA', 'SEO_ANAHTARKELIME']


class Content(HTMLParser):
    def __init__(self, source):
        super().__init__(convert_charrefs=True)
        self.text, self.links, self.paragraphs, self.specs = [], [], [], []
        self.li, self.strong, self.paragraph = None, False, None
        self.label, self.value = [], []
        self.feed(source)

    def handle_starttag(self, tag, attrs):
        if tag == 'a':
            self.links.append(dict(attrs).get('href', ''))
        if tag == 'p':
            self.paragraph = []
        if tag == 'li':
            self.li, self.label, self.value = True, [], []
        if tag == 'strong':
            self.strong = True

    def handle_endtag(self, tag):
        if tag == 'p' and self.paragraph is not None:
            self.paragraphs.append(' '.join(''.join(self.paragraph).split()))
            self.paragraph = None
        if tag == 'li' and self.li:
            self.specs.append({'l': ''.join(self.label).strip().rstrip(':'),
                               'v': ''.join(self.value).strip()})
            self.li = None
        if tag == 'strong':
            self.strong = False
        if tag in ('p', 'div', 'li', 'h2', 'h3', 'td'):
            self.text.append('\n')

    def handle_data(self, data):
        self.text.append(data)
        if self.paragraph is not None:
            self.paragraph.append(data)
        if self.li:
            (self.label if self.strong else self.value).append(data)


def contexts(records):
    return [{'title': record['URUNADI'], 'specs': Content(record['ACIKLAMA']).specs,
             'crumbs': record['KATEGORI'].split('>'), 'onyazi': []} for record in records]


def drawings(records):
    javascript = r'''
var fs=require('fs'), vm=require('vm'), box={window:{}};
vm.runInNewContext(fs.readFileSync(process.argv[1],'utf8'),box);
var module=box.window.YDRAW.triger;
var contexts=JSON.parse(fs.readFileSync(0,'utf8'));
console.log(JSON.stringify(contexts.map(function(c,i){
 var result=module.draw(c,{id:'p'+i,dim:'#0a2350'}), reason=null;
 if(!result){var values={};c.specs.forEach(function(s){values[s.l]=s.v});
 if(!values['Diş Profili'])reason='Diş Profili eksik';
 else if(!values['Diş Sayısı'])reason='Diş Sayısı eksik';
 else if(!values['Dış Çap (De)']&&!values['Bölüm Çapı (Dp)'])reason='De ve Dp eksik (kaynak tablosu yok)';
 else reason='eşleşme veya geçersiz zorunlu değer';}
 return {svg:result?result.svg:null,reason:reason};
})));'''
    result = subprocess.run(['node', '-e', javascript, str(DRAW)],
                            input=json.dumps(contexts(records)), text=True,
                            capture_output=True, check=True)
    return json.loads(result.stdout)


def sentences(source):
    for block in ''.join(Content(source).text).splitlines():
        for sentence in re.split(r'(?<=[.!?])', block):
            sentence = ' '.join(sentence.split())
            if len(sentence) >= 40:
                yield sentence


def exempt_fact(sentence):
    return sentence in ('Koddaki F harfi kasnağın flanşlı olduğunu belirtir.',
                        'F harfi kasnağın flanşlı olduğunu belirtir.',
                        'AL eki alüminyum gövdeyi ifade eder.')


def sentence_counts(records):
    counts = collections.Counter()
    for record in records:
        counts.update(sorted(set(sentences(record.get('ACIKLAMA') or ''))))
    return counts


def repetition_errors(counts, total):
    return [f'sentence repeated in {count}/{total} products ({100 * count / total:.2f}%): {sentence}'
            for sentence, count in counts.items()
            if total and count * 10 > total * 3 and not exempt_fact(sentence)]


def audit(records):
    errors, paragraphs = [], collections.Counter()
    if not records:
        errors.append('empty dataset')
    known_links = set((ROOT / 'katurl.txt').read_text().splitlines())
    categories = {line.split('\t', 1)[-1].strip()
                  for line in (ROOT / 'site_kategoriler.txt').read_text().splitlines()}
    codes, images = set(), set()
    for index, record in enumerate(records):
        def fail(message):
            errors.append(f"{index + 1} {record.get('kod', '?')}: {message}")
        incomplete = False
        for field in FIELDS:
            value = record.get(field)
            if field not in record or value is None or value == '' or (isinstance(value, list) and not value and field != 'bayraklar'):
                fail('missing/empty required field ' + field)
                incomplete = True
        if incomplete:
            continue
        for field, maximum in [('SEO_SAYFABASLIK', 60), ('SEO_SAYFAACIKLAMA', 155),
                               ('ANAHTARKELIME', 250), ('SEO_ANAHTARKELIME', 950)]:
            if len(record[field]) > maximum:
                fail(f'{field} length {len(record[field])}>{maximum}')
        for field in FACING:
            if re.search(r'ORKA|ORKAPT|\bORK\b', html.unescape(record[field]), re.I):
                fail('forbidden supplier name in ' + field)
        raw = html.unescape(json.dumps(record, ensure_ascii=False))
        if any(unicodedata.category(c).startswith('M') for c in raw) or re.search('Ã|Ä±|Å', raw):
            fail('combining mark / mojibake')
        parsed = Content(record['ACIKLAMA'])
        for value in [record['URUNADI']] + parsed.paragraphs:
            if re.search(r'koli|paket|\bPKT\b|\d+\s*AD\b', value, re.I):
                fail('package wording in name/description paragraph')
        if {'l': 'Satış Birimi', 'v': 'Adet'} not in parsed.specs:
            fail('Satış Birimi: Adet missing from technical list')
        length = len(' '.join(''.join(parsed.text).split()))
        if length < 1800:
            fail(f'ACIKLAMA stripped length {length}<1800')
        for field in ('ONYAZI', 'ACIKLAMA'):
            if re.search('[—–]', html.unescape(record[field])):
                fail('dash placeholder in ' + field)
        links = Content(record['ONYAZI']).links + parsed.links
        internal = [u for u in links if not urlparse(u).netloc or urlparse(u).netloc in ('yamansarulman.com', 'www.yamansarulman.com')]
        if not 2 <= len(internal) <= 4:
            fail(f'internal link count {len(internal)} outside 2..4')
        for link in internal:
            absolute = 'https://www.yamansarulman.com/' + link.lstrip('/') if not urlparse(link).netloc else link
            if absolute not in known_links:
                fail('unknown internal link ' + link)
        if record['kod'] in codes:
            fail('duplicate kod')
        codes.add(record['kod'])
        if record['resim'] in images:
            fail('duplicate resim path')
        images.add(record['resim'])
        try:
            with Image.open(ROOT / record['resim']) as photo:
                if photo.format != 'JPEG' or photo.size != (500, 500):
                    fail('image must be 500x500 JPEG')
                photo.verify()
        except (OSError, ValueError) as error:
            fail('missing/broken image: ' + str(error))
        if record['MARKA'] != 'Yamansa':
            fail('MARKA != Yamansa')
        if record['KATEGORI'] not in categories and record['yeni_kategori'] is not True:
            fail('unknown KATEGORI requires yeni_kategori=true')
        paragraphs.update(sorted(set(parsed.paragraphs)))
    counts = sentence_counts(records)
    errors.extend(repetition_errors(counts, len(records)))
    drawn = drawings(records)
    reasons = collections.Counter(r['reason'] for r in drawn if not r['svg'])
    print(f'RECORDS: {len(records)}; unique kod: {len(codes)}; unique resim: {len(images)}')
    print(f'DRAW: {sum(bool(r["svg"]) for r in drawn)}/{len(records)}; NULL: {sum(reasons.values())}')
    for reason, count in reasons.items():
        print(f'NULL REASON: {reason}: {count}')
    print('SHARED PARAGRAPHS (informational; top 5 product counts):')
    for paragraph, count in paragraphs.most_common(5):
        if count > 1:
            print(f'  {count}: {paragraph[:160]}')
    print('SENTENCES (non-exempt, >=40 characters; top 5 product counts and percentages):')
    non_exempt = collections.Counter({sentence: count for sentence, count in counts.items()
                                     if not exempt_fact(sentence)})
    for sentence, count in non_exempt.most_common(5):
        print(f'  {count}/{len(records)} ({100 * count / len(records):.2f}%): {sentence}')
    for sentence, count in counts.items():
        if exempt_fact(sentence):
            print(f'EXEMPT CODE FACT: {count}/{len(records)} ({100 * count / len(records):.2f}%): {sentence}')
    for error in errors:
        print('FAIL: ' + error, file=sys.stderr)
    print(f'{"FAIL" if errors else "PASS"}: {len(errors)} validation errors')
    return not errors


if __name__ == '__main__':
    records = [json.loads(line) for line in (ROOT / 'urunler.jsonl').read_text().splitlines()]
    if not records:
        sys.exit('FAIL: empty urunler.jsonl')
    sys.exit(0 if audit(records) else 1)
