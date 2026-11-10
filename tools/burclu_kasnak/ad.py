"""Burçlu V kasnak ürün adları ve ASCII dosya adları."""
import re
import unicodedata


def _sayi(value):
    number = float(value)
    if number <= 0 or number != number or number == float('inf'):
        raise ValueError('Pozitif, sonlu ölçü gerekli')
    return format(number, '.12g').replace('.', ',')


def urun_adi(urun):
    profil = str(urun.get('profil', '')).upper()
    if profil not in ('SPZ', 'SPA', 'SPB', 'SPC'):
        raise ValueError('Profil eksik veya geçersiz')
    cap = _sayi(urun['P'])
    kanal = urun['kanal_sayisi']
    if isinstance(kanal, bool) or int(kanal) != kanal or kanal <= 0:
        raise ValueError('Kanal sayısı pozitif tam sayı olmalı')
    kanal = str(int(kanal))
    marka = 'KYS ' if urun.get('MARKA') == 'KYS' else ''
    burc = '' if urun.get('burc_kodu') is None else _sayi(urun['burc_kodu']) + ' Burç '
    return f'{marka}{profil} {cap}x{kanal} Burçlu V Kasnak {kanal} Kanallı {burc}Ø{cap} mm'


def slug(ad):
    if not isinstance(ad, str) or not ad.strip():
        raise ValueError('Ürün adı boş olamaz')
    text = ad.translate(str.maketrans({'ı': 'i', 'İ': 'I', 'Ø': '', 'ø': ''}))
    text = unicodedata.normalize('NFKD', text).encode('ascii', 'ignore').decode().lower()
    result = re.sub(r'[^a-z0-9]+', '-', text).strip('-')
    if not result:
        raise ValueError('ASCII slug üretilemedi')
    return result


def urun_slug(urun):
    return slug(urun_adi(urun))
