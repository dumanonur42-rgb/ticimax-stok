#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Facebook kapak alternatifleri (1640x624). Kullanım: python3 kapak_varyant.py"""
from playwright.sync_api import sync_playwright

from gorsel_uret import CHROME, FOTO, LOGO_ICON, OUT, b64, page_html

HERO = b64(FOTO / "hero_rulman_navy.png")
W, H = 1640, 624
MARKALAR = ["SKF", "FAG", "ORS", "NMB", "TPI"]


def brand_row(color="rgba(255,255,255,.85)", border="rgba(255,255,255,.28)", size=17):
    return "".join(
        f'<span style="font-family:Montserrat;font-weight:800;font-size:{size}px;letter-spacing:.14em;'
        f'padding:9px 16px;border:1.5px solid {border};border-radius:4px;color:{color}">{m}</span>'
        for m in MARKALAR
    )


def kapak_a():
    """Koyu lacivert stüdyo: sağda hero foto, solda logo + başlık + marka şeridi."""
    return f"""
    <div class="canvas" style="background:#050d2a">
      <div class="photo" style="background-image:url('{HERO}');background-position:right center"></div>
      <div style="position:absolute;inset:0;background:linear-gradient(90deg,#040b24 0%,#040b24 30%,rgba(4,11,36,.85) 44%,rgba(4,11,36,0) 62%)"></div>
      <div style="position:absolute;left:0;right:0;top:0;height:6px;background:linear-gradient(90deg,var(--orange),rgba(255,106,0,0))"></div>
      <div style="position:absolute;left:0;right:0;bottom:0;height:120px;background:linear-gradient(180deg,rgba(4,11,36,0),rgba(4,11,36,.85))"></div>
      <div style="position:absolute;left:300px;top:50%;transform:translateY(-50%);width:760px">
        <div class="brand" style="margin-bottom:30px"><img src="{LOGO_ICON}" style="height:64px"><div class="sep" style="height:46px"></div><span style="font-size:36px">YAMANSA</span><span style="font-family:Montserrat;font-weight:600;font-size:18px;letter-spacing:.32em;opacity:.7;margin-left:6px;margin-top:6px">RULMAN</span></div>
        <h1 style="font-size:66px;line-height:1.02">Rulman İthalat &amp;<br>Distribütörlük</h1>
        <div style="display:flex;align-items:center;gap:18px;margin:26px 0 24px"><div style="width:64px;height:5px;background:var(--orange)"></div><span style="font-family:Montserrat;font-weight:700;font-size:19px;letter-spacing:.18em;color:rgba(255,255,255,.8)">1986'DAN BERİ · İSTANBUL</span></div>
        <div style="display:flex;gap:10px;flex-wrap:wrap">{brand_row()}</div>
      </div>
      <div style="position:absolute;left:300px;right:72px;bottom:34px;display:flex;justify-content:flex-end;align-items:center;gap:28px;font-size:21px;font-weight:600;letter-spacing:.03em;color:rgba(255,255,255,.9)">
        <span>Stoktan aynı gün kargo</span><span style="width:1px;height:22px;background:rgba(255,255,255,.35)"></span><span>0552 610 93 63</span><span style="width:1px;height:22px;background:rgba(255,255,255,.35)"></span><span style="font-family:Montserrat;font-weight:800">yamansarulman.com</span>
      </div>
    </div>"""


def kapak_b():
    """Tam kadraj foto, sinematik; büyük tek mesaj, minimal metin."""
    return f"""
    <div class="canvas" style="background:#050d2a">
      <div class="photo" style="background-image:url('{HERO}');background-position:right center"></div>
      <div style="position:absolute;inset:0;background:linear-gradient(90deg,rgba(4,11,36,.97) 0%,rgba(4,11,36,.92) 36%,rgba(4,11,36,.35) 58%,rgba(4,11,36,0) 72%)"></div>
      <div style="position:absolute;left:300px;top:96px;display:flex;align-items:center;gap:14px"><img src="{LOGO_ICON}" style="height:56px"><span style="font-family:Montserrat;font-weight:800;font-size:30px;letter-spacing:.02em">YAMANSA</span><span style="font-family:Montserrat;font-weight:600;font-size:15px;letter-spacing:.32em;opacity:.65;margin-top:6px">RULMAN</span></div>
      <div style="position:absolute;left:300px;top:186px;width:820px">
        <h1 style="font-size:84px;line-height:.98">Doğru rulman.<br><span style="color:var(--orange)">Aynı gün</span> kargo.</h1>
        <p style="margin-top:26px;font-size:24px;line-height:1.45;color:rgba(255,255,255,.85);max-width:720px">SKF · FAG · ORS · NMB · TPI yetkili distribütörü. Motosiklet, scooter ve sanayi rulmanları 1986'dan beri stoktan.</p>
      </div>
      <div style="position:absolute;right:72px;bottom:36px;display:flex;align-items:center;gap:14px;background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.22);border-radius:999px;padding:14px 28px;backdrop-filter:blur(6px)">
        <span style="font-size:20px;font-weight:600">0552 610 93 63</span><span style="width:1px;height:20px;background:rgba(255,255,255,.35)"></span><span style="font-family:Montserrat;font-weight:800;font-size:20px">yamansarulman.com</span>
      </div>
    </div>"""


def kapak_c():
    """Kurumsal iki panel: sol lacivert bilgi paneli (kesik köşe), sağ foto; alt ince bilgi bandı."""
    return f"""
    <div class="canvas" style="background:#050d2a">
      <div class="photo" style="left:38%;background-image:url('{HERO}');background-position:60% center"></div>
      <div style="position:absolute;left:0;top:0;bottom:0;width:60%;background:linear-gradient(90deg,var(--navy) 0%,var(--navy) 72%,rgba(1,27,84,0) 100%);clip-path:polygon(0 0,100% 0,88% 100%,0 100%)"></div>
      <div style="position:absolute;left:0;top:0;bottom:0;width:10px;background:var(--orange)"></div>
      <div style="position:absolute;left:300px;top:50%;transform:translateY(-50%);width:640px">
        <div style="display:flex;align-items:center;gap:16px;margin-bottom:28px"><img src="{LOGO_ICON}" style="height:72px"><div><div style="font-family:Montserrat;font-weight:900;font-size:40px;letter-spacing:.02em;line-height:1">YAMANSA</div><div style="font-family:Montserrat;font-weight:600;font-size:15px;letter-spacing:.36em;opacity:.7;margin-top:6px">RULMAN İTHALAT</div></div></div>
        <h1 style="font-size:58px;line-height:1.04">Türkiye'nin rulman<br>tedarik noktası.</h1>
        <p style="margin-top:20px;font-size:21px;line-height:1.45;color:rgba(255,255,255,.82)">1986'dan beri İkitelli OSB'den tüm Türkiye'ye — motosiklet, scooter ve sanayi rulmanları.</p>
        <div style="display:flex;gap:10px;margin-top:24px">{brand_row(size=16)}</div>
      </div>
      <div style="position:absolute;left:0;right:0;bottom:0;height:56px;background:rgba(2,8,30,.88);display:flex;align-items:center;justify-content:flex-end;gap:36px;padding-right:72px;font-size:19px;font-weight:600;letter-spacing:.03em;color:rgba(255,255,255,.9)">
        <span>Stoktan aynı gün kargo</span><span>İkitelli OSB · İstanbul</span><span>0552 610 93 63</span><span style="font-family:Montserrat;font-weight:800;color:#fff">yamansarulman.com</span>
      </div>
    </div>"""


HERO_W = b64(FOTO / "hero_rulman_wide.png")
HERO_L = b64(FOTO / "hero_rulman_light.png")
ALT_BILGI = ("0552 610 93 63", "İkitelli OSB · İstanbul", "yamansarulman.com")


def stat(num, label, color="#fff"):
    return (f'<div><div style="font-family:Montserrat;font-weight:900;font-size:40px;line-height:1;color:{color}">{num}</div>'
            f'<div style="font-size:16px;letter-spacing:.06em;opacity:.75;margin-top:8px">{label}</div></div>')


def kapak_d():
    """Premium tam kadraj stüdyo foto (yeni), sol temiz alan: logo, tek güçlü başlık, marka çipleri, ince iletişim satırı. Bant yok."""
    return f"""
    <div class="canvas" style="background:#03081c">
      <div class="photo" style="background-image:url('{HERO_W}');background-size:auto 108%;background-position:right 55%"></div>
      <div style="position:absolute;inset:0;background:linear-gradient(90deg,#03081c 0%,#03081c 26%,rgba(3,8,28,.9) 40%,rgba(3,8,28,.35) 56%,rgba(3,8,28,0) 70%)"></div>
      <div style="position:absolute;left:0;right:0;top:0;height:5px;background:linear-gradient(90deg,var(--orange) 0%,var(--orange) 45%,rgba(255,106,0,0) 100%)"></div>
      <div style="position:absolute;left:300px;top:78px;display:flex;align-items:center;gap:16px">
        <img src="{LOGO_ICON}" style="height:66px">
        <div><div style="font-family:Montserrat;font-weight:900;font-size:38px;letter-spacing:.02em;line-height:1">YAMANSA</div>
        <div style="font-family:Montserrat;font-weight:600;font-size:14px;letter-spacing:.38em;opacity:.7;margin-top:6px">RULMAN İTHALAT · 1986</div></div>
      </div>
      <div style="position:absolute;left:300px;top:184px;width:800px">
        <h1 style="font-size:58px;line-height:1.04">40 yıldır Türkiye'nin<br><span style="color:var(--orange)">rulman</span> tedarikçisi.</h1>
        <p style="margin-top:18px;font-size:21px;line-height:1.45;color:rgba(255,255,255,.85);max-width:640px">Motosiklet, scooter ve sanayi rulmanları — orijinal, faturalı, stoktan aynı gün kargo.</p>
        <div style="display:flex;gap:10px;margin-top:22px">{brand_row(size=15)}</div>
      </div>
      <div style="position:absolute;left:300px;bottom:34px;display:flex;align-items:center;gap:22px;font-size:18px;font-weight:600;letter-spacing:.03em;color:rgba(255,255,255,.85)">
        <span style="display:flex;align-items:center;gap:10px"><span style="width:10px;height:10px;border-radius:50%;background:#25D366;display:inline-block"></span>{ALT_BILGI[0]}</span>
        <span style="width:1px;height:20px;background:rgba(255,255,255,.3)"></span><span>{ALT_BILGI[1]}</span>
        <span style="width:1px;height:20px;background:rgba(255,255,255,.3)"></span><span style="font-family:Montserrat;font-weight:800;color:#fff">{ALT_BILGI[2]}</span>
      </div>
    </div>"""


def kapak_e():
    """Açık kurumsal: beyaz stüdyo foto, lacivert tipografi, turuncu vurgu; katalog/kurumsal broşür havası."""
    return f"""
    <div class="canvas" style="background:#F2F4F8;color:var(--navy)">
      <div class="photo" style="background-image:url('{HERO_L}');background-size:auto 108%;background-position:right 60%"></div>
      <div style="position:absolute;inset:0;background:linear-gradient(90deg,#F2F4F8 0%,#F2F4F8 30%,rgba(242,244,248,.92) 44%,rgba(242,244,248,.3) 60%,rgba(242,244,248,0) 72%)"></div>
      <div style="position:absolute;left:0;top:0;bottom:0;width:12px;background:var(--navy)"></div>
      <div style="position:absolute;left:0;top:0;bottom:0;width:12px;height:36%;background:var(--orange)"></div>
      <div style="position:absolute;left:300px;top:78px;display:flex;align-items:center;gap:16px">
        <img src="{LOGO_ICON}" style="height:66px">
        <div><div style="font-family:Montserrat;font-weight:900;font-size:38px;letter-spacing:.02em;line-height:1;color:var(--navy)">YAMANSA</div>
        <div style="font-family:Montserrat;font-weight:600;font-size:14px;letter-spacing:.38em;opacity:.65;margin-top:6px">RULMAN İTHALAT SAN. VE DIŞ TİC.</div></div>
      </div>
      <div style="position:absolute;left:300px;top:184px;width:820px">
        <h1 style="font-size:58px;line-height:1.04;color:var(--navy)">Doğru rulman. Doğru fiyat.<br><span style="color:var(--orange)">Aynı gün</span> kargo.</h1>
        <p style="margin-top:18px;font-size:20px;line-height:1.45;color:#3A4660;max-width:640px">SKF · FAG · ORS · NMB · TPI yetkili distribütörü. 1986'dan beri İkitelli OSB'den tüm Türkiye'ye.</p>
        <div style="display:flex;gap:10px;margin-top:20px">{brand_row(color="var(--navy)", border="rgba(1,27,84,.35)", size=15)}</div>
      </div>
      <div style="position:absolute;left:300px;bottom:32px;display:flex;align-items:center;gap:0;background:var(--navy);color:#fff;border-radius:6px;overflow:hidden;font-size:17px;font-weight:600;letter-spacing:.03em">
        <span style="padding:12px 20px;background:var(--orange);font-family:Montserrat;font-weight:800">Sipariş / WhatsApp</span>
        <span style="padding:12px 20px">{ALT_BILGI[0]}</span>
        <span style="padding:12px 20px;border-left:1px solid rgba(255,255,255,.2);font-family:Montserrat;font-weight:800">{ALT_BILGI[2]}</span>
      </div>
    </div>"""


def kapak_f():
    """Koyu premium + rakamlar: yeni foto, sol panel, başlık ve 3 güven rakamı (1986 · 5 marka · aynı gün)."""
    return f"""
    <div class="canvas" style="background:#03081c">
      <div class="photo" style="background-image:url('{HERO_W}');background-size:auto 108%;background-position:right 55%"></div>
      <div style="position:absolute;inset:0;background:linear-gradient(90deg,#03081c 0%,#03081c 28%,rgba(3,8,28,.92) 42%,rgba(3,8,28,.3) 58%,rgba(3,8,28,0) 70%)"></div>
      <div style="position:absolute;left:300px;top:70px;display:flex;align-items:center;gap:16px">
        <img src="{LOGO_ICON}" style="height:60px">
        <div style="font-family:Montserrat;font-weight:900;font-size:34px;letter-spacing:.02em;line-height:1">YAMANSA <span style="font-weight:600;font-size:15px;letter-spacing:.36em;opacity:.7;margin-left:8px">RULMAN</span></div>
      </div>
      <div style="position:absolute;left:300px;top:168px;width:720px">
        <h1 style="font-size:60px;line-height:1.02">Rulman ithalatında<br>güvenilir adres.</h1>
        <div style="display:flex;align-items:center;gap:16px;margin-top:20px"><div style="width:56px;height:5px;background:var(--orange)"></div><span style="font-family:Montserrat;font-weight:700;font-size:17px;letter-spacing:.2em;color:rgba(255,255,255,.8)">MOTOSİKLET · SCOOTER · SANAYİ</span></div>
      </div>
      <div style="position:absolute;left:300px;top:360px;display:flex;gap:40px">
        {stat("1986", "KURULUŞ · İSTANBUL")}
        <div style="width:1px;background:rgba(255,255,255,.2)"></div>
        {stat("5", "DÜNYA MARKASI")}
        <div style="width:1px;background:rgba(255,255,255,.2)"></div>
        {stat("Aynı gün", "STOKTAN KARGO", "var(--orange)")}
      </div>
      <div style="position:absolute;left:300px;bottom:40px;display:flex;align-items:center;gap:22px;font-size:19px;font-weight:600;letter-spacing:.03em;color:rgba(255,255,255,.85)">
        <span>{ALT_BILGI[0]}</span><span style="width:1px;height:20px;background:rgba(255,255,255,.3)"></span><span>{ALT_BILGI[1]}</span>
        <span style="width:1px;height:20px;background:rgba(255,255,255,.3)"></span><span style="font-family:Montserrat;font-weight:800;color:#fff">{ALT_BILGI[2]}</span>
      </div>
    </div>"""


VARYANTLAR = {"A": kapak_a, "B": kapak_b, "C": kapak_c, "D": kapak_d, "E": kapak_e, "F": kapak_f}

if __name__ == "__main__":
    (OUT / "marka").mkdir(parents=True, exist_ok=True)
    with sync_playwright() as pw:
        browser = pw.chromium.launch(executable_path=CHROME, headless=True)
        page = browser.new_context(device_scale_factor=1).new_page()
        page.set_viewport_size({"width": W, "height": H})
        for k, fn in VARYANTLAR.items():
            page.set_content(page_html(fn(), W, H), wait_until="load")
            page.wait_for_function("document.fonts.ready.then(()=>document.fonts.status==='loaded')")
            page.wait_for_timeout(200)
            out = OUT / "marka" / f"facebook_kapak_{k}_1640x624.png"
            page.screenshot(path=str(out), clip={"x": 0, "y": 0, "width": W, "height": H})
            print("ok", out.name)
        browser.close()
