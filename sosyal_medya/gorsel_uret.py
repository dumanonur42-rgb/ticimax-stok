#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""icerik_verisi.POSTS -> HTML/CSS şablon -> PNG (Playwright + Chrome).

Kullanım:
  python3 gorsel_uret.py            # tüm gönderiler (kare + LinkedIn yatay)
  python3 gorsel_uret.py 3 7        # yalnız 3. ve 7. gün
  python3 gorsel_uret.py --marka    # profil + kapak görselleri
"""
import base64
import sys
from pathlib import Path

from playwright.sync_api import sync_playwright

from icerik_verisi import POSTS, SITE, TEL

HERE = Path(__file__).resolve().parent
FOTO = HERE / "fotolar"
OUT = HERE / "gonderiler"
CHROME = "/home/ubuntu/.local/bin/google-chrome"

FORMATS = {"kare": (1080, 1080), "linkedin": (1200, 627), "story": (1080, 1920)}


def b64(path: Path) -> str:
    ext = path.suffix.lstrip(".").lower().replace("jpg", "jpeg")
    return f"data:image/{ext};base64," + base64.b64encode(path.read_bytes()).decode()


LOGO_ICON = b64(HERE / "logo_icon.png")

CSS = """
@import url('https://fonts.googleapis.com/css2?family=Montserrat:ital,wght@0,500;0,700;0,800;0,900;1,500&family=Inter:wght@400;500;600;700&display=swap');
:root{
  --navy:#011B54; --mid:#070F2B; --blue:#1E5BD6; --steel:#B8C0CC; --mist:#F2F4F8; --orange:#FF6A00; --ink:#0B1220;
  --pad:64px;
}
*{box-sizing:border-box;margin:0;padding:0}
html,body{width:100%;height:100%;overflow:hidden}
body{font-family:'Inter',sans-serif;color:#fff;background:var(--mid);-webkit-font-smoothing:antialiased}
.canvas{position:relative;width:100%;height:100%;overflow:hidden}
.photo{position:absolute;inset:0;background-size:cover;background-position:center}
.photo.dim{filter:saturate(.55)}
.photo.dim::after{content:"";position:absolute;inset:0;background:linear-gradient(200deg,rgba(1,27,84,.05) 0%,rgba(1,27,84,.55) 50%,rgba(7,15,43,.96) 100%)}
.photo.mono{filter:grayscale(1) contrast(1.05)}
.photo.tint::after{content:"";position:absolute;inset:0;background:rgba(1,27,84,.78);mix-blend-mode:multiply}
.grid{position:absolute;inset:0;background-image:linear-gradient(rgba(255,255,255,.05) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.05) 1px,transparent 1px);background-size:120px 120px;pointer-events:none}
/* header / footer */
.head{position:absolute;top:var(--pad);left:var(--pad);right:var(--pad);display:flex;justify-content:space-between;align-items:center;z-index:5}
.brand{display:flex;align-items:center;gap:14px}
.brand img{height:54px;width:auto}
.brand span{font-family:'Montserrat';font-weight:800;font-size:30px;letter-spacing:.02em}
.brand .sep{width:2px;height:40px;background:currentColor;opacity:.6}
.tag{font-family:'Montserrat';font-weight:700;font-size:16px;letter-spacing:.18em;text-transform:uppercase;padding:12px 18px;border:2px solid currentColor;border-radius:4px}
.tag.fill{background:var(--orange);border-color:var(--orange);color:#fff}
.foot{position:absolute;bottom:var(--pad);left:var(--pad);right:var(--pad);display:flex;justify-content:space-between;align-items:center;font-weight:600;font-size:20px;letter-spacing:.04em;z-index:5}
.foot .line{flex:1;height:1px;background:currentColor;opacity:.35;margin:0 28px}
/* typography */
h1{font-family:'Montserrat';font-weight:900;text-transform:none;line-height:.98;letter-spacing:-.025em}
.sub{font-size:26px;line-height:1.4;font-weight:400;opacity:.92;max-width:760px}
.bar{width:96px;height:8px;background:var(--orange);margin:28px 0}
.dark{color:var(--ink)}
.dark .tag{border-color:var(--navy);color:var(--navy)}
.dark .brand{color:var(--navy)}
.head.light .brand,.foot.light{color:#fff}
.head.light .tag{border-color:#fff;color:#fff}
.num{font-family:'Montserrat';font-weight:800;font-variant-numeric:tabular-nums}
"""


def head(color_class="", tag="", fill=False):
    return f"""
    <div class="head {color_class}">
      <div class="brand"><img src="{LOGO_ICON}"><div class="sep"></div><span>YAMANSA</span></div>
      <div class="tag {'fill' if fill else ''}">{tag}</div>
    </div>"""


def foot(color_class=""):
    return f"""
    <div class="foot {color_class}"><span>{SITE.replace('https://www.', '')}</span><div class="line"></div><span>{TEL}</span></div>"""


# ------------------------------------------------------------------ şablonlar

def t_hero(p, W, H):
    wide = W > H
    h1 = 118 if not wide else 86
    sub = 27 if not wide else 22
    return f"""
    <div class="canvas">
      <div class="photo dim" style="background-image:url('{b64(FOTO / p['foto'])}')"></div>
      <div class="grid"></div>
      {head('', p['etiket'])}
      <div style="position:absolute;left:var(--pad);right:var(--pad);bottom:{150 if not wide else 120}px;z-index:4">
        <h1 style="font-size:{h1}px;max-width:{'100%' if not wide else '760px'}">{p['baslik']}</h1>
        <div class="bar"></div>
        <p class="sub" style="font-size:{sub}px;max-width:{'820px' if not wide else '680px'}">{p['alt']}</p>
      </div>
      {foot()}
    </div>"""


def t_split(p, W, H):
    wide = W > H
    if wide:
        return f"""
        <div class="canvas" style="background:var(--navy)">
          <div class="photo" style="left:56%;background-image:url('{b64(FOTO / p['foto'])}')"></div>
          <div style="position:absolute;left:56%;top:0;bottom:0;width:120px;background:linear-gradient(90deg,var(--navy),transparent)"></div>
          <div style="position:absolute;left:0;top:0;bottom:0;width:56%">
          {head('', p['etiket'])}
          <div style="position:absolute;left:var(--pad);top:50%;transform:translateY(-46%);right:40px;z-index:4">
            <h1 style="font-size:74px">{p['baslik']}</h1>
            <div class="bar"></div>
            <p class="sub" style="font-size:21px;max-width:560px">{p['alt']}</p>
          </div>
          {foot()}
          </div>
        </div>"""
    return f"""
    <div class="canvas" style="background:var(--navy)">
      <div class="photo" style="top:0;height:52%;background-image:url('{b64(FOTO / p['foto'])}')"></div>
      <div style="position:absolute;top:44%;height:10%;left:0;right:0;background:linear-gradient(180deg,transparent,var(--navy))"></div>
      {head('', p['etiket'], fill=True)}
      <div style="position:absolute;left:var(--pad);right:var(--pad);top:52%;z-index:4">
        <h1 style="font-size:96px">{p['baslik']}</h1>
        <div class="bar"></div>
        <p class="sub" style="font-size:25px">{p['alt']}</p>
      </div>
      {foot()}
    </div>"""


def t_urun(p, W, H):
    wide = W > H
    rows = "".join(
        f"""<div style="display:flex;justify-content:space-between;align-items:baseline;padding:{'18px 0' if not wide else '11px 0'};border-bottom:2px solid rgba(1,27,84,.12)">
              <span class="num" style="font-size:{44 if not wide else 30}px;color:var(--navy)">{k}</span>
              <span class="num" style="font-size:{34 if not wide else 24}px;color:var(--ink);font-weight:600">{v}<span style="font-size:{18 if not wide else 14}px;opacity:.55;margin-left:8px">mm</span></span>
            </div>"""
        for k, v in p["tablo"])
    photo = f"""<div style="position:absolute;{'right:var(--pad);top:220px;width:400px;height:400px' if not wide else 'right:var(--pad);top:150px;width:330px;height:330px'};border-radius:50%;overflow:hidden;box-shadow:0 30px 60px rgba(1,27,84,.25)">
                  <div class="photo" style="background-image:url('{b64(FOTO / p['foto'])}');filter:grayscale(1) contrast(1.1) brightness(1.02)"></div>
                </div>"""
    return f"""
    <div class="canvas dark" style="background:var(--mist)">
      <div style="position:absolute;right:-180px;top:-180px;width:640px;height:640px;border-radius:50%;background:var(--navy);opacity:.06"></div>
      {head('dark', p['etiket'])}
      {photo}
      <div style="position:absolute;left:var(--pad);top:{190 if not wide else 140}px;width:{'520px' if not wide else '640px'};z-index:4">
        <h1 style="font-size:{76 if not wide else 56}px;color:var(--navy)">{p['baslik']}</h1>
        <div class="bar"></div>
        <p class="sub" style="font-size:{22 if not wide else 18}px;color:var(--ink);opacity:.8;max-width:{'480px' if not wide else '600px'}">{p['alt']}</p>
      </div>
      <div style="position:absolute;left:var(--pad);right:{'var(--pad)' if not wide else '460px'};bottom:{150 if not wide else 96}px;{'columns:2;column-gap:56px' if not wide else 'columns:2;column-gap:40px'};z-index:4">{rows}</div>
      {foot('dark')}
    </div>"""


def t_karsilastirma(p, W, H):
    wide = W > H
    def card(side, accent):
        kod, ad, items = side
        lis = "".join(f'<li style="padding:{"12px 0" if not wide else "7px 0"};border-top:1px solid rgba(255,255,255,.15);font-size:{23 if not wide else 18}px">{i}</li>' for i in items)
        return f"""<div style="flex:1;background:rgba(255,255,255,.07);backdrop-filter:blur(6px);border:1px solid rgba(255,255,255,.18);border-top:8px solid {accent};border-radius:10px;padding:{'36px' if not wide else '24px 28px'}">
            <div class="num" style="font-size:{72 if not wide else 52}px;line-height:1">{kod}</div>
            <div style="font-family:'Montserrat';font-weight:700;letter-spacing:.14em;text-transform:uppercase;font-size:{16 if not wide else 13}px;opacity:.7;margin:10px 0 {24 if not wide else 14}px">{ad}</div>
            <ul style="list-style:none">{lis}</ul></div>"""
    return f"""
    <div class="canvas">
      <div class="photo dim mono" style="background-image:url('{b64(FOTO / p['foto'])}')"></div>
      <div style="position:absolute;inset:0;background:rgba(1,27,84,.55)"></div>
      {head('', p['etiket'])}
      {'<div style="position:absolute;left:var(--pad);right:var(--pad);top:190px;z-index:4"><h1 style="font-size:92px">' + p['baslik'] + '</h1><p class="sub" style="font-size:24px;margin-top:18px">' + p['alt'] + '</p></div>' if not wide else
       '<div style="position:absolute;left:var(--pad);width:340px;top:50%;transform:translateY(-50%);z-index:4"><h1 style="font-size:64px">' + p['baslik'] + '</h1><div class="bar"></div><p class="sub" style="font-size:19px">' + p['alt'] + '</p></div>'}
      <div style="position:absolute;{'left:var(--pad);right:var(--pad);bottom:150px' if not wide else 'left:440px;right:var(--pad);top:150px;bottom:120px'};display:flex;gap:{28 if not wide else 20}px;z-index:4">
        {card(p['sol'], 'var(--steel)')}{card(p['sag'], 'var(--orange)')}
      </div>
      {foot()}
    </div>"""


def t_markalar(p, W, H):
    wide = W > H
    chips = "".join(
        f'<div style="font-family:Montserrat;font-weight:800;font-size:{30 if len(p["markalar"]) <= 6 else 24}px;letter-spacing:.06em;padding:{"26px 10px" if not wide else "16px 8px"};text-align:center;border:1px solid rgba(255,255,255,.25);background:rgba(255,255,255,.08);border-radius:6px">{m}</div>'
        for m in p["markalar"])
    cols = 3 if len(p["markalar"]) <= 6 else (4 if not wide else 6)
    return f"""
    <div class="canvas">
      <div class="photo dim" style="background-image:url('{b64(FOTO / p['foto'])}')"></div>
      {head('', p['etiket'])}
      <div style="position:absolute;left:var(--pad);right:var(--pad);top:{200 if not wide else 130}px;z-index:4">
        <h1 style="font-size:{96 if not wide else 62}px">{p['baslik']}</h1>
        <p class="sub" style="font-size:{24 if not wide else 19}px;margin-top:20px">{p['alt']}</p>
      </div>
      <div style="position:absolute;left:var(--pad);right:var(--pad);bottom:{150 if not wide else 92}px;display:grid;grid-template-columns:repeat({cols},1fr);gap:14px;z-index:4">{chips}</div>
      {foot()}
    </div>"""


def t_kod(p, W, H):
    wide = W > H
    colors = ["var(--navy)", "var(--blue)", "var(--orange)", "#6B7A90"]
    # 62 04 -2RS  C3  -> ayraçlar
    k = p["kod"]
    fs = 126 if not wide else 92
    code_html = (f'<span class="num" style="color:{colors[0]};font-size:{fs}px">{k[0][0]}</span>'
                 f'<span class="num" style="color:{colors[1]};font-size:{fs}px">{k[1][0]}</span>'
                 f'<span class="num" style="color:{colors[2]};font-size:{fs}px">-{k[2][0]}</span>'
                 f'<span class="num" style="color:{colors[3]};font-size:{fs}px;margin-left:.18em">{k[3][0]}</span>')
    expl = "".join(
        f"""<div style="display:flex;gap:18px;align-items:flex-start;padding:{'16px 0' if not wide else '10px 0'};border-top:2px solid rgba(1,27,84,.1)">
              <span class="num" style="min-width:{110 if not wide else 84}px;font-size:{34 if not wide else 26}px;color:{colors[i]}">{kk}</span>
              <span style="font-size:{25 if not wide else 19}px;color:var(--ink);line-height:1.3;padding-top:4px">{v}</span></div>"""
        for i, (kk, v) in enumerate(k))
    return f"""
    <div class="canvas dark" style="background:var(--mist)">
      <div class="photo" style="left:{'0' if not wide else '62%'};top:{'0' if not wide else '0'};height:{'34%' if not wide else '100%'};background-image:url('{b64(FOTO / p['foto'])}');filter:grayscale(.6)"></div>
      <div style="position:absolute;{'top:0;height:34%;left:0;right:0;background:linear-gradient(180deg,rgba(1,27,84,.55),rgba(1,27,84,.8))' if not wide else 'left:62%;top:0;bottom:0;right:0;background:rgba(1,27,84,.75)'}"></div>
      {head('light', p['etiket']) if not wide else head('dark', p['etiket'])}
      <div style="position:absolute;left:var(--pad);{'top:190px;color:#fff' if not wide else 'top:130px;color:var(--navy)'};z-index:4">
        <h1 style="font-size:{72 if not wide else 54}px">{p['baslik']}</h1>
      </div>
      <div style="position:absolute;left:var(--pad);top:{'39%' if not wide else '250px'};z-index:4;line-height:1;white-space:nowrap;letter-spacing:-.02em">{code_html}</div>
      <div style="position:absolute;left:var(--pad);{'right:var(--pad);bottom:150px' if not wide else 'width:600px;bottom:92px'};z-index:4">{expl}</div>
      {foot('dark')}
    </div>"""


def t_alinti(p, W, H):
    wide = W > H
    return f"""
    <div class="canvas">
      <div class="photo mono" style="background-image:url('{b64(FOTO / p['foto'])}')"></div>
      <div style="position:absolute;inset:0;background:linear-gradient(180deg,rgba(7,15,43,.75),rgba(1,27,84,.85))"></div>
      {head('', p['etiket'])}
      <div style="position:absolute;left:var(--pad);right:var(--pad);top:50%;transform:translateY(-50%);z-index:4;text-align:left">
        <div style="width:8px;height:{200 if not wide else 140}px;background:var(--orange);position:absolute;left:0;top:8px"></div>
        <div style="padding-left:48px">
          <h1 style="font-family:Montserrat;font-weight:500;font-style:italic;font-size:{78 if not wide else 58}px;line-height:1.12;letter-spacing:-.01em;text-transform:none">{p['baslik']}</h1>
          <p class="sub" style="margin-top:32px;font-size:{24 if not wide else 20}px;opacity:.8">{p['alt']}</p>
        </div>
      </div>
      {foot()}
    </div>"""


def t_bilgi(p, W, H):
    wide = W > H
    items = "".join(
        f"""<li style="display:flex;gap:{24 if not wide else 16}px;align-items:flex-start;padding:{'16px 0' if not wide else '9px 0'};border-top:1px solid rgba(255,255,255,.18)">
              <span class="num" style="font-size:{40 if not wide else 28}px;color:var(--orange);min-width:{56 if not wide else 40}px;line-height:1.1">{i+1:02d}</span>
              <span style="font-size:{27 if not wide else 19}px;line-height:1.3;padding-top:6px">{t}</span></li>"""
        for i, t in enumerate(p["liste"]))
    if wide:
        return f"""
        <div class="canvas" style="background:var(--navy)">
          <div class="photo" style="left:0;width:44%;background-image:url('{b64(FOTO / p['foto'])}')"></div>
          <div style="position:absolute;left:36%;width:8%;top:0;bottom:0;background:linear-gradient(90deg,transparent,var(--navy))"></div>
          <div style="position:absolute;left:46%;right:0;top:0;bottom:0">
          {head('', p['etiket'])}
          <div style="position:absolute;left:var(--pad);right:var(--pad);top:120px;z-index:4">
            <h1 style="font-size:52px">{p['baslik']}</h1>
            <ul style="list-style:none;margin-top:18px">{items}</ul>
          </div>
          {foot()}
          </div>
        </div>"""
    return f"""
    <div class="canvas" style="background:var(--navy)">
      <div class="photo" style="top:0;height:42%;background-image:url('{b64(FOTO / p['foto'])}')"></div>
      <div style="position:absolute;top:30%;height:12%;left:0;right:0;background:linear-gradient(180deg,transparent,var(--navy))"></div>
      {head('', p['etiket'], fill=True)}
      <div style="position:absolute;left:var(--pad);right:var(--pad);top:36%;z-index:4">
        <h1 style="font-size:82px">{p['baslik']}</h1>
        <p class="sub" style="font-size:22px;margin:14px 0 10px;opacity:.75">{p['alt']}</p>
        <ul style="list-style:none">{items}</ul>
      </div>
      {foot()}
    </div>"""


def bearing_svg(size):
    """Ölçü çizgili rulman kesiti (d / D / B) – vektör."""
    return f"""
    <svg width="{size}" height="{size}" viewBox="0 0 400 400" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="m" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#E9EDF2"/><stop offset=".5" stop-color="#A9B3C1"/><stop offset="1" stop-color="#6E7A8A"/></linearGradient>
        <linearGradient id="m2" x1="1" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#F4F6F9"/><stop offset="1" stop-color="#98A3B3"/></linearGradient>
      </defs>
      <circle cx="200" cy="200" r="150" fill="url(#m)"/>
      <circle cx="200" cy="200" r="122" fill="#1A2540"/>
      <circle cx="200" cy="200" r="118" fill="none" stroke="#2A3656" stroke-width="2"/>
      {"".join(f'<circle cx="{200+104*__import__("math").cos(a*3.14159/180):.1f}" cy="{200+104*__import__("math").sin(a*3.14159/180):.1f}" r="14" fill="url(#m2)"/>' for a in range(0,360,30))}
      <circle cx="200" cy="200" r="86" fill="url(#m)"/>
      <circle cx="200" cy="200" r="62" fill="#F2F4F8"/>
      <!-- D -->
      <line x1="50" y1="372" x2="350" y2="372" stroke="#FF6A00" stroke-width="3"/>
      <line x1="50" y1="360" x2="50" y2="384" stroke="#FF6A00" stroke-width="3"/><line x1="350" y1="360" x2="350" y2="384" stroke="#FF6A00" stroke-width="3"/>
      <text x="200" y="398" text-anchor="middle" font-family="Montserrat" font-weight="800" font-size="22" fill="#FF6A00">D  DIŞ ÇAP</text>
      <!-- d -->
      <line x1="138" y1="200" x2="262" y2="200" stroke="#1E5BD6" stroke-width="3"/>
      <line x1="138" y1="188" x2="138" y2="212" stroke="#1E5BD6" stroke-width="3"/><line x1="262" y1="188" x2="262" y2="212" stroke="#1E5BD6" stroke-width="3"/>
      <text x="200" y="192" text-anchor="middle" font-family="Montserrat" font-weight="800" font-size="20" fill="#1E5BD6">d  İÇ ÇAP</text>
    </svg>"""


def t_olcu(p, W, H):
    wide = W > H
    size = 520 if not wide else 380
    return f"""
    <div class="canvas dark" style="background:var(--mist)">
      <div class="grid" style="background-image:linear-gradient(rgba(1,27,84,.06) 1px,transparent 1px),linear-gradient(90deg,rgba(1,27,84,.06) 1px,transparent 1px)"></div>
      {head('dark', p['etiket'])}
      <div style="position:absolute;left:var(--pad);top:{190 if not wide else 140}px;width:{'100%' if not wide else '52%'};z-index:4">
        <h1 style="font-size:{82 if not wide else 58}px;color:var(--navy)">{p['baslik']}</h1>
        <div class="bar"></div>
        <p class="sub" style="font-size:{24 if not wide else 19}px;color:var(--ink);opacity:.8;max-width:{'560px' if not wide else '520px'}">{p['alt']}</p>
        <div style="margin-top:{36 if not wide else 24}px;display:flex;gap:14px">
          {"".join(f'<div style="border:2px solid var(--navy);border-radius:6px;padding:12px 18px;font-family:Montserrat;font-weight:800;font-size:{22 if not wide else 17}px;color:var(--navy)">{x}</div>' for x in ["d = İÇ ÇAP", "D = DIŞ ÇAP", "B = KALINLIK"])}
        </div>
      </div>
      <div style="position:absolute;right:var(--pad);bottom:{130 if not wide else 80}px;z-index:4">{bearing_svg(size)}</div>
      <div style="position:absolute;left:var(--pad);bottom:{150 if not wide else 92}px;z-index:4;{'display:none' if wide else ''}">
        <div class="num" style="font-size:62px;color:var(--navy);line-height:1">20 × 47 × 14</div>
        <div style="font-family:Montserrat;font-weight:700;letter-spacing:.16em;font-size:16px;color:var(--orange);margin-top:8px">= 6204</div>
      </div>
      {foot('dark')}
    </div>"""


def t_istatistik(p, W, H):
    wide = W > H
    cells = "".join(
        f"""<div style="border-left:6px solid var(--orange);padding:{'8px 0 8px 26px' if not wide else '4px 0 4px 20px'}">
              <div class="num" style="font-size:{96 if not wide else 62}px;line-height:1;letter-spacing:-.03em">{n}</div>
              <div style="font-size:{22 if not wide else 17}px;opacity:.85;margin-top:8px;line-height:1.3">{t}</div></div>"""
        for n, t in p["sayilar"])
    return f"""
    <div class="canvas">
      <div class="photo dim" style="background-image:url('{b64(FOTO / p['foto'])}')"></div>
      <div style="position:absolute;inset:0;background:rgba(1,27,84,.45)"></div>
      {head('', p['etiket'])}
      <div style="position:absolute;left:var(--pad);right:var(--pad);top:{190 if not wide else 130}px;z-index:4">
        <h1 style="font-size:{92 if not wide else 60}px">{p['baslik']}</h1>
        <p class="sub" style="font-size:{24 if not wide else 19}px;margin-top:18px">{p['alt']}</p>
      </div>
      <div style="position:absolute;left:var(--pad);right:var(--pad);bottom:{150 if not wide else 92}px;display:grid;grid-template-columns:repeat({2 if not wide else 4},1fr);gap:{40 if not wide else 24}px;z-index:4">{cells}</div>
      {foot()}
    </div>"""


TEMPLATES = dict(hero=t_hero, split=t_split, urun=t_urun, karsilastirma=t_karsilastirma, markalar=t_markalar,
                 kod=t_kod, alinti=t_alinti, bilgi=t_bilgi, olcu=t_olcu, istatistik=t_istatistik)


def page_html(body, W, H):
    return f"""<!doctype html><html lang="tr"><head><meta charset="utf-8"><style>{CSS}
    html,body{{width:{W}px;height:{H}px}}</style></head><body>{body}</body></html>"""


# ------------------------------------------------------------------ marka görselleri (profil / kapak)

def brand_assets():
    items = []
    # Profil fotoğrafı 1080x1080: lacivert zemin, küre + YAMANSA
    items.append(("profil_1080.png", 1080, 1080, f"""
    <div class="canvas" style="background:radial-gradient(circle at 50% 40%,#0B2A7A 0%,var(--navy) 55%,var(--mid) 100%);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:34px">
      <img src="{LOGO_ICON}" style="height:380px;filter:drop-shadow(0 30px 50px rgba(0,0,0,.45))">
      <div style="font-family:Montserrat;font-weight:900;font-size:150px;letter-spacing:.02em;line-height:1">YAMANSA</div>
      <div style="font-family:Montserrat;font-weight:700;font-size:40px;letter-spacing:.42em;opacity:.8;margin-top:-10px">RULMAN</div>
    </div>"""))
    # Profil – açık versiyon
    items.append(("profil_acik_1080.png", 1080, 1080, f"""
    <div class="canvas" style="background:#fff;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:34px;color:var(--navy)">
      <img src="{LOGO_ICON}" style="height:380px">
      <div style="font-family:Montserrat;font-weight:900;font-size:150px;letter-spacing:.02em;line-height:1">YAMANSA</div>
      <div style="font-family:Montserrat;font-weight:700;font-size:40px;letter-spacing:.42em;opacity:.7;margin-top:-10px">RULMAN</div>
    </div>"""))
    # Facebook kapak 1640x624
    items.append(("facebook_kapak_1640x624.png", 1640, 624, f"""
    <div class="canvas" style="background:var(--navy)">
      <div class="photo" style="left:50%;background-image:url('{b64(FOTO / '19911427.jpg')}')"></div>
      <div style="position:absolute;left:50%;top:0;bottom:0;width:260px;background:linear-gradient(90deg,var(--navy),transparent)"></div>
      <div style="position:absolute;left:72px;top:50%;transform:translateY(-50%);width:50%">
        <div class="brand" style="margin-bottom:34px"><img src="{LOGO_ICON}" style="height:70px"><div class="sep" style="height:50px"></div><span style="font-size:40px">YAMANSA</span></div>
        <h1 style="font-size:70px">RULMANDA<br>DOĞRU ADRES.</h1>
        <div class="bar"></div>
        <p class="sub" style="font-size:22px;max-width:620px">1986'dan beri • SKF · FAG · ORS · NMB · TPI • Motosiklet, scooter ve sanayi rulmanları • Stoktan aynı gün kargo</p>
      </div>
      <div style="position:absolute;right:56px;bottom:40px;font-weight:600;font-size:22px;letter-spacing:.04em">yamansarulman.com</div>
    </div>"""))
    # LinkedIn kapak 2256x382 (1128x191 @2x)
    items.append(("linkedin_kapak_2256x382.png", 2256, 382, f"""
    <div class="canvas" style="background:var(--navy)">
      <div class="photo" style="left:64%;background-image:url('{b64(FOTO / '19911427.jpg')}');filter:saturate(.6)"></div>
      <div style="position:absolute;left:64%;top:0;bottom:0;width:320px;background:linear-gradient(90deg,var(--navy),transparent)"></div>
      <div style="position:absolute;left:560px;top:50%;transform:translateY(-50%)">
        <h1 style="font-size:60px">RULMAN İTHALAT & DİSTRİBÜTÖRLÜK</h1>
        <p class="sub" style="font-size:24px;margin-top:16px;max-width:1000px;white-space:nowrap">1986 • İkitelli OSB, İstanbul • SKF · FAG · ORS · NMB · TPI • Stoktan aynı gün sevkiyat</p>
      </div>
      <div style="position:absolute;right:56px;bottom:28px;font-weight:600;font-size:22px;letter-spacing:.04em">yamansarulman.com</div>
    </div>"""))
    # Instagram highlight kapakları
    for name, label in [("hl_urunler", "ÜRÜNLER"), ("hl_teknik", "TEKNİK"), ("hl_motosiklet", "MOTOSİKLET"), ("hl_scooter", "SCOOTER"), ("hl_sanayi", "SANAYİ")]:
        items.append((f"{name}_1080.png", 1080, 1080, f"""
        <div class="canvas" style="background:var(--navy);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:40px">
          <div style="width:520px;height:520px;border-radius:50%;border:10px solid var(--orange);display:flex;align-items:center;justify-content:center">
            <img src="{LOGO_ICON}" style="height:300px">
          </div>
          <div style="font-family:Montserrat;font-weight:800;font-size:72px;letter-spacing:.14em">{label}</div>
        </div>"""))
    return items


def render_all(days=None, brand=False):
    OUT.mkdir(exist_ok=True)
    with sync_playwright() as pw:
        browser = pw.chromium.launch(executable_path=CHROME, headless=True)
        ctx = browser.new_context(device_scale_factor=1)
        page = ctx.new_page()

        def shot(html, W, H, path):
            page.set_viewport_size({"width": W, "height": H})
            page.set_content(html, wait_until="load")
            page.wait_for_function("document.fonts.ready.then(()=>document.fonts.status==='loaded')")
            page.wait_for_timeout(150)
            page.screenshot(path=str(path), clip={"x": 0, "y": 0, "width": W, "height": H})

        if brand:
            (OUT / "marka").mkdir(exist_ok=True)
            for name, W, H, body in brand_assets():
                shot(page_html(body, W, H), W, H, OUT / "marka" / name)
                print("ok", name)
        for p in POSTS:
            if days and p["gun"] not in days:
                continue
            fn = TEMPLATES[p["sablon"]]
            for fmt in ("kare", "linkedin"):
                if fmt == "linkedin" and "LI" not in p["platform"]:
                    continue
                W, H = FORMATS[fmt]
                out = OUT / f"gun{p['gun']:02d}_{fmt}.png"
                shot(page_html(fn(p, W, H), W, H), W, H, out)
                print("ok", out.name)
        browser.close()


if __name__ == "__main__":
    args = [a for a in sys.argv[1:] if not a.startswith("--")]
    render_all(days={int(a) for a in args} or None, brand="--marka" in sys.argv)
