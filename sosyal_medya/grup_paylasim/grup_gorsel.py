# -*- coding: utf-8 -*-
"""Segment bazlı satış ilanı görselleri (1080×1080) -> grup_paylasim/gorseller/<segment>.png"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
sys.path.insert(0, str(Path(__file__).resolve().parent))
from playwright.sync_api import sync_playwright
from gorsel_uret import CSS, CHROME, FOTO, LOGO_ICON, b64, page_html  # noqa: E402
from segmentler import TEL  # noqa: E402
from varyantlar import HEPSI  # noqa: E402

OUT = Path(__file__).resolve().parent / "gorseller"
WA_SVG = """<svg viewBox="0 0 24 24" width="54" height="54" fill="#fff"><path d="M17.5 14.4c-.3-.1-1.8-.9-2-1-.3-.1-.5-.1-.7.1-.2.3-.8 1-.9 1.2-.2.2-.3.2-.6.1-.3-.1-1.3-.5-2.4-1.5-.9-.8-1.5-1.8-1.7-2.1-.2-.3 0-.5.1-.6l.5-.6c.2-.2.2-.4.3-.6.1-.2 0-.4 0-.5-.1-.1-.7-1.6-.9-2.2-.2-.6-.5-.5-.7-.5h-.6c-.2 0-.5.1-.8.4-.3.3-1 1-1 2.5s1.1 2.9 1.2 3.1c.1.2 2.1 3.2 5.1 4.5.7.3 1.3.5 1.7.6.7.2 1.4.2 1.9.1.6-.1 1.8-.7 2-1.4.2-.7.2-1.3.2-1.4-.1-.2-.3-.2-.6-.4zM12 21.8c-1.8 0-3.5-.5-5-1.4l-.4-.2-3.7 1 1-3.6-.2-.4A9.8 9.8 0 1 1 12 21.8zm8.4-18.2A11.8 11.8 0 0 0 12 .2C5.5.2.2 5.5.2 12c0 2.1.5 4.1 1.6 5.9L0 24l6.3-1.7c1.7.9 3.7 1.4 5.7 1.4 6.5 0 11.8-5.3 11.8-11.8 0-3.1-1.2-6.1-3.4-8.3z"/></svg>"""
CHECK = '<span style="display:inline-block;width:26px;height:26px;border-radius:50%;background:#22C55E;color:#fff;font-weight:900;font-size:17px;text-align:center;line-height:26px;margin-right:12px;flex:none">✓</span>'


def t_ilan(s):
    foto = b64(FOTO / s["foto"])
    n = len(s["kodlar"])
    cols = 2 if n > 4 else 1
    chips = "".join(
        f'<div style="display:flex;align-items:center;background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.18);border-radius:10px;padding:14px 18px;font-family:Montserrat;font-weight:700;font-size:23px;white-space:nowrap">{CHECK}{k}</div>'
        for k in s["kodlar"])
    lines = s["baslik"].count("<br>") + 1
    longest = max(len(x) for x in s["baslik"].split("<br>"))
    h1 = 64 if longest <= 16 else 56 if longest <= 20 else 48 if longest <= 25 else 42
    return f"""
    <div class="canvas" style="background:var(--navy)">
      <div class="photo" style="left:560px;background-image:url('{foto}');filter:saturate(.85)"></div>
      <div style="position:absolute;left:560px;top:0;bottom:0;width:220px;background:linear-gradient(90deg,var(--navy) 0%,rgba(1,27,84,.6) 55%,transparent 100%)"></div>
      <div style="position:absolute;right:0;top:0;bottom:0;left:560px;background:linear-gradient(180deg,rgba(1,27,84,.25) 0%,transparent 35%,transparent 60%,var(--navy) 100%)"></div>
      <div class="grid"></div>

      <!-- üst: marka + etiket -->
      <div style="position:absolute;left:var(--pad);top:56px;display:flex;align-items:center;gap:14px;z-index:5">
        <img src="{LOGO_ICON}" style="height:50px"><div style="width:2px;height:38px;background:#fff;opacity:.6"></div>
        <span style="font-family:Montserrat;font-weight:800;font-size:28px;letter-spacing:.02em">YAMANSA RULMAN</span>
        <span style="font-size:18px;opacity:.7;margin-left:6px">· ithalatçı · 1986</span>
      </div>
      <div style="position:absolute;right:var(--pad);top:56px;z-index:5;background:var(--orange);color:#fff;font-family:Montserrat;font-weight:800;font-size:17px;letter-spacing:.16em;padding:12px 20px;border-radius:4px;box-shadow:0 10px 30px rgba(0,0,0,.35)">{s['etiket']}</div>

      <!-- başlık -->
      <div style="position:absolute;left:var(--pad);top:170px;width:700px;z-index:5">
        <div style="font-family:Montserrat;font-weight:700;letter-spacing:.2em;font-size:16px;color:var(--orange);margin-bottom:14px">STOKTA · AYNI GÜN KARGO</div>
        <h1 style="font-size:{h1}px;line-height:1.02;white-space:nowrap">{s['baslik']}</h1>
        <div class="bar" style="margin:22px 0 18px"></div>
        <p style="font-size:22px;line-height:1.4;opacity:.9;max-width:600px">{s['alt']}</p>
      </div>

      <!-- kodlar -->
      <div style="position:absolute;left:var(--pad);top:{560 if lines > 1 else 520}px;width:{640 if cols == 2 else 460}px;display:grid;grid-template-columns:repeat({cols},max-content);gap:12px 14px;z-index:5">{chips}</div>

      <!-- markalar -->
      <div style="position:absolute;left:var(--pad);top:{560 if lines > 1 else 520}px;transform:translateY({(n + cols - 1) // cols * 66 + 14}px);z-index:5;font-family:Montserrat;font-weight:800;font-size:20px;letter-spacing:.14em;color:var(--steel)">{s['markalar']}</div>

      <!-- alt CTA bandı -->
      <div style="position:absolute;left:0;right:0;bottom:0;height:150px;background:var(--orange);z-index:6;display:flex;align-items:center;padding:0 var(--pad);gap:26px;box-shadow:0 -20px 60px rgba(0,0,0,.35)">
        <div style="width:96px;height:96px;border-radius:50%;background:#25D366;display:flex;align-items:center;justify-content:center;flex:none;box-shadow:0 10px 30px rgba(0,0,0,.25)">{WA_SVG}</div>
        <div style="flex:1">
          <div style="font-family:Montserrat;font-weight:700;font-size:18px;letter-spacing:.14em;opacity:.9">FİYAT & STOK İÇİN WHATSAPP</div>
          <div class="num" style="font-size:66px;line-height:1;margin-top:4px;letter-spacing:-.01em">{TEL}</div>
        </div>
        <div style="text-align:right;font-family:Montserrat;font-weight:800;font-size:22px;line-height:1.35">
          <div>yamansarulman.com</div>
          <div style="font-weight:600;font-size:18px;opacity:.9">İkitelli OSB · İstanbul</div>
        </div>
      </div>
    </div>"""


def render(keys=None):
    OUT.mkdir(exist_ok=True)
    with sync_playwright() as pw:
        browser = pw.chromium.launch(executable_path=CHROME, headless=True)
        page = browser.new_context(device_scale_factor=1).new_page()
        for k, (s, _t) in HEPSI.items():
            if keys and k not in keys and k.split("_")[0] not in keys:
                continue
            page.set_viewport_size({"width": 1080, "height": 1080})
            page.set_content(page_html(t_ilan(s), 1080, 1080), wait_until="load")
            page.wait_for_function("document.fonts.ready.then(()=>document.fonts.status==='loaded')")
            page.wait_for_timeout(150)
            page.screenshot(path=str(OUT / f"{k}.png"), clip={"x": 0, "y": 0, "width": 1080, "height": 1080})
            print("ok", k)
        browser.close()


if __name__ == "__main__":
    render(set(sys.argv[1:]) or None)
