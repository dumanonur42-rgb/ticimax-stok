#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""YouTube Shorts / TikTok / Reels için 9:16 örnek tanıtım videosu.

Her sahne iki katmandan oluşur: arka plan (fotoğraf + gradyan, yavaş zoom) ve
ön plan (şeffaf PNG: logo/metin, aşağıdan kayarak belirir). Katmanlar Playwright ile
HTML/CSS'ten render edilir, ffmpeg ile hareketlendirilip xfade ile birleştirilir.

Kullanım:  python3 video_uret.py            -> video/yamansa_tanitim_9x16.mp4
"""
import subprocess
from pathlib import Path

from playwright.sync_api import sync_playwright

from gorsel_uret import CHROME, CSS, FOTO, LOGO_ICON, b64
from icerik_verisi import SITE, TEL

HERE = Path(__file__).resolve().parent
OUT = HERE / "video"
TMP = OUT / "_katman"
W, H = 1080, 1920
FPS = 30
SCENE = 3.4        # sahne süresi (sn)
XF = 0.6           # geçiş süresi (sn)

SCENES = [
    dict(foto="19911427.jpg", tag="1986'DAN BERİ", h1="RULMANDA<br>DOĞRU<br>ADRES.",
         sub="Rulman ithalat & distribütörlük • İkitelli OSB, İstanbul", intro=True),
    dict(foto="18171624.jpg", tag="MOTOSİKLET", h1="TEKERLEK<br>RULMANI<br>SETLERİ",
         sub="Honda · Yamaha · Bajaj · KTM · CFMOTO · Mondial · RKS · Kuba"),
    dict(foto="38292508.jpg", tag="E-SCOOTER", h1="SCOOTER<br>RULMANLARI<br>STOKTA",
         sub="Xiaomi · Segway Ninebot · Dualtron · Navee · Citymate"),
    dict(foto="35568191.jpg", tag="TEKNİK BİLGİ", h1="ZZ Mİ,<br>2RS Mİ?",
         sub="Tekerlekse 2RS, motorsa ZZ. Emin değilsen ölçünü yaz.", cards=True),
    dict(foto="2760241.jpg", tag="SANAYİ", h1="KONİK.<br>SİLİNDİRİK.<br>OYNAK.",
         sub="SKF · FAG · ORS · NMB · TPI – orijinal, faturalı"),
    dict(foto="36398150.jpg", tag="LOJİSTİK", h1="STOKTAN,<br>AYNI GÜN<br>KARGO.",
         sub="15:00'e kadar verilen siparişler aynı gün yolda."),
    dict(foto="19911421.jpg", tag="KATALOG", h1="ÖLÇÜNÜ YAZ,<br>DOĞRU RULMANI<br>BULALIM.",
         sub=f"{SITE.replace('https://www.', '')}  •  {TEL}", outro=True),
]

VIDEO_CSS = CSS + """
:root{--pad:72px}
html,body{background:transparent}
.canvas{width:1080px;height:1920px}
.vtag{font-family:'Montserrat';font-weight:700;font-size:26px;letter-spacing:.22em;text-transform:uppercase;color:#fff;background:var(--orange);padding:14px 22px;display:inline-block;border-radius:4px}
.vh1{font-family:'Montserrat';font-weight:900;font-size:136px;line-height:.96;letter-spacing:-.03em;color:#fff;margin-top:36px}
.vsub{font-size:34px;line-height:1.35;color:#fff;opacity:.92;margin-top:34px;max-width:900px}
.vbar{width:120px;height:10px;background:var(--orange);margin-top:40px}
.vcard{flex:1;background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.18);border-top:8px solid var(--steel);border-radius:8px;padding:34px 30px;backdrop-filter:blur(6px)}
.vcard.o{border-top-color:var(--orange)}
.vcard b{font-family:'Montserrat';font-weight:900;font-size:64px;color:#fff;display:block}
.vcard small{display:block;font-size:20px;letter-spacing:.14em;text-transform:uppercase;color:var(--steel);margin:6px 0 18px}
.vcard span{display:block;font-size:26px;color:#fff;padding:9px 0;border-top:1px solid rgba(255,255,255,.14)}
"""


def doc(body, css=VIDEO_CSS):
    return f"""<!doctype html><html lang="tr"><head><meta charset="utf-8"><style>{css}
    html,body{{width:{W}px;height:{H}px;margin:0}}</style></head><body>{body}</body></html>"""


def bg_html(s):
    return doc(f"""
    <div class="canvas" style="position:relative;overflow:hidden;background:var(--mid)">
      <div class="photo" style="background-image:url('{b64(FOTO / s['foto'])}');filter:saturate(.55)"></div>
      <div style="position:absolute;inset:0;background:linear-gradient(180deg,{'rgba(1,27,84,.62) 0%,rgba(1,27,84,.66) 40%,rgba(7,15,43,.9) 75%' if s.get('intro') else 'rgba(1,27,84,.35) 0%,rgba(1,27,84,.25) 35%,rgba(7,15,43,.92) 70%'},rgba(7,15,43,1) 100%)"></div>
      <div class="grid"></div>
    </div>""")


def fg_html(s):
    if s.get("intro"):
        main = f"""
        <div style="position:absolute;left:0;right:0;top:50%;transform:translateY(-58%);text-align:center">
          <img src="{LOGO_ICON}" style="width:340px;filter:drop-shadow(0 20px 40px rgba(0,0,0,.45))">
          <div style="font-family:Montserrat;font-weight:900;font-size:120px;letter-spacing:.02em;color:#fff;margin-top:10px">YAMANSA</div>
          <div style="font-family:Montserrat;font-weight:700;font-size:34px;letter-spacing:.42em;color:var(--steel);margin-top:4px">RULMAN</div>
          <div class="vbar" style="margin:44px auto 0"></div>
          <div class="vsub" style="margin:36px auto 0;font-size:30px">{s['sub']}</div>
        </div>"""
    else:
        cards = ""
        if s.get("cards"):
            cards = """
            <div style="display:flex;gap:22px;margin-top:44px">
              <div class="vcard"><b>ZZ</b><small>Metal kapak</small><span>Yüksek devir</span><span>Düşük sürtünme</span><span>Kuru ortam</span></div>
              <div class="vcard o"><b>2RS</b><small>Kauçuk keçe</small><span>Su & çamur koruması</span><span>Gres içinde kalır</span><span>Tekerlek / dış ortam</span></div>
            </div>"""
        h1_size = 136 if not s.get("outro") else 108
        main = f"""
        <div style="position:absolute;left:var(--pad);right:var(--pad);bottom:280px">
          <span class="vtag">{s['tag']}</span>
          <h1 class="vh1" style="font-size:{h1_size}px">{s['h1']}</h1>
          {cards}
          <div class="vbar"></div>
          <p class="vsub">{s['sub']}</p>
        </div>"""
    head = "" if s.get("intro") else f"""
        <div style="position:absolute;top:var(--pad);left:var(--pad);right:var(--pad);display:flex;justify-content:space-between;align-items:center;color:#fff">
          <div class="brand"><img src="{LOGO_ICON}" style="height:64px"><div class="sep"></div><span style="font-size:36px">YAMANSA</span></div>
          <div style="font-weight:600;font-size:24px;letter-spacing:.06em;opacity:.85">yamansa.com.tr</div>
        </div>"""
    return doc(f"""<div class="canvas" style="position:relative">{head}{main}
      <div style="position:absolute;left:var(--pad);right:var(--pad);bottom:var(--pad);display:flex;justify-content:space-between;align-items:center;color:#fff;font-weight:600;font-size:26px;letter-spacing:.04em">
        <span>{SITE.replace('https://www.', '')}</span><div class="line" style="flex:1;height:1px;background:#fff;opacity:.35;margin:0 28px"></div><span>{TEL}</span>
      </div></div>""")


def render_layers():
    TMP.mkdir(parents=True, exist_ok=True)
    with sync_playwright() as pw:
        browser = pw.chromium.launch(executable_path=CHROME, headless=True)
        page = browser.new_context(device_scale_factor=1, viewport={"width": W, "height": H}).new_page()

        def shot(html, path, transparent):
            page.set_content(html, wait_until="load")
            page.wait_for_function("document.fonts.ready.then(()=>document.fonts.status==='loaded')")
            page.wait_for_timeout(120)
            page.screenshot(path=str(path), omit_background=transparent, clip={"x": 0, "y": 0, "width": W, "height": H})

        for i, s in enumerate(SCENES):
            shot(bg_html(s), TMP / f"bg{i}.png", False)
            shot(fg_html(s), TMP / f"fg{i}.png", True)
            print("ok sahne", i + 1)
        browser.close()


def build_video(out=OUT / "yamansa_tanitim_9x16.mp4"):
    n = len(SCENES)
    frames = int(SCENE * FPS)
    inputs, fc = [], []
    for i in range(n):
        inputs += ["-loop", "1", "-framerate", str(FPS), "-t", f"{SCENE}", "-i", str(TMP / f"bg{i}.png")]
        inputs += ["-loop", "1", "-framerate", str(FPS), "-t", f"{SCENE}", "-i", str(TMP / f"fg{i}.png")]
        zoom_dir = "1.10-0.10*on/%d" % frames if i % 2 else "1+0.10*on/%d" % frames
        fc.append(
            f"[{2*i}:v]scale={W*1.25:.0f}:{H*1.25:.0f},zoompan=z='{zoom_dir}':d={frames}:"
            f"x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':s={W}x{H}:fps={FPS},setsar=1[b{i}];"
            f"[{2*i+1}:v]format=rgba,fade=t=in:st=0.15:d=0.7:alpha=1,setpts=PTS-STARTPTS[f{i}];"
            f"[b{i}][f{i}]overlay=x=0:y='70*pow(max(0,1-(t-0.15)/0.9),2)':shortest=1,format=yuv420p[s{i}]"
        )
    # xfade zinciri
    prev = "s0"
    for i in range(1, n):
        offset = i * (SCENE - XF)
        label = f"x{i}" if i < n - 1 else "vout"
        fc.append(f"[{prev}][s{i}]xfade=transition={'fade' if i % 2 else 'smoothup'}:duration={XF}:offset={offset:.3f}[{label}]")
        prev = label
    total = n * SCENE - (n - 1) * XF
    # ambient ses (tek başına yayınlanmaz; TikTok/Reels'te üstüne trend müzik eklenir)
    audio = (f"aevalsrc='0.10*sin(2*PI*110*t)+0.06*sin(2*PI*164.8*t)+0.05*sin(2*PI*220*t)*(0.5+0.5*sin(2*PI*0.2*t))"
             f"+0.02*sin(2*PI*330*t)*(0.5+0.5*sin(2*PI*0.13*t+1))':s=48000:d={total:.2f},"
             f"lowpass=f=900,afade=t=in:d=1.2,afade=t=out:st={total-1.5:.2f}:d=1.5,volume=0.7[aout]")
    fc.append(audio)
    cmd = ["ffmpeg", "-y", *inputs, "-filter_complex", ";".join(fc), "-map", "[vout]", "-map", "[aout]",
           "-c:v", "libx264", "-preset", "medium", "-crf", "18", "-r", str(FPS), "-pix_fmt", "yuv420p",
           "-c:a", "aac", "-b:a", "128k", "-movflags", "+faststart", "-t", f"{total:.2f}", str(out)]
    subprocess.run(cmd, check=True)
    print("ok", out, f"{total:.1f}s")


if __name__ == "__main__":
    render_layers()
    build_video()
