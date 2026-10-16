"""Günün IG + FB paylaşımlarını yapar (mevcut Chrome oturumu, CDP 9229).

  python3 gunluk_paylas.py --gun 2 --slot sabah --platform fb,ig [go]
  python3 gunluk_paylas.py --gun auto --slot ana go      # gün = bugün - BASLANGIC + 1

Slotlar: sabah (09:00 kart) · ana (12:30 gönderi) · story (18:30, 9:16)
`go` verilmezse deneme: her şey doldurulur, paylaş tuşuna basılmaz.
Her çağrı yeni sekme açar ve sonunda kapatır; açık sekmelere dokunmaz.
"""
import argparse
import datetime as dt
import json
import sys
from pathlib import Path

from playwright.sync_api import sync_playwright

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
import gunluk_metin as M  # noqa: E402

GONDERI = HERE.parent / "gonderiler"
LOG = HERE / "gunluk_log.json"
SHOTS = HERE / "shots"
BASLANGIC = dt.date(2026, 9, 15)  # Gün 1
CDP = "http://localhost:29229"
FB_PAGE = "https://www.facebook.com/yamansarulman/"
UA_MOBIL = ("Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 "
            "(KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1")


def now():
    return dt.datetime.now().strftime("%Y-%m-%d %H:%M:%S")


def log(**kw):
    d = json.loads(LOG.read_text()) if LOG.exists() else []
    d.append(dict(zaman=now(), **kw))
    LOG.write_text(json.dumps(d, ensure_ascii=False, indent=1))
    print(f"[{now()}]", kw)


def gun_no(arg):
    if arg == "auto":
        return (dt.date.today() - BASLANGIC).days + 1
    return int(arg)


# ---------------------------------------------------------------- Facebook
FBID_JS = "els=>[...new Set(els.map(e=>e.href.split('&')[0]))]"


def fb_post(ctx, img, text, go, shot):
    page = ctx.new_page()
    try:
        page.goto(FB_PAGE, wait_until="domcontentloaded")
        page.wait_for_timeout(6000)
        page.keyboard.press("Escape")
        onceki = set(page.locator("a[href*='/photo/?fbid=']").evaluate_all(FBID_JS))
        page.get_by_text("Ne düşünüyorsun?").first.click()
        page.wait_for_timeout(3000)
        with page.expect_file_chooser(timeout=10000) as fc:
            btn = page.get_by_label("Fotoğraf/video ekle")
            (btn.first if btn.count() else page.locator("form [aria-label='Fotoğraf/video']").first).click()
        fc.value.set_files(str(img))
        page.wait_for_timeout(6000)
        box = page.locator("form div[contenteditable='true']:not([aria-label*='yorum'])").last
        box.click()
        page.keyboard.insert_text(text)
        page.wait_for_timeout(3000)
        nxt = page.get_by_label("İleri", exact=True)
        if nxt.count():
            nxt.first.click()
            page.wait_for_timeout(4000)
        page.screenshot(path=str(shot))
        if not go:
            return "DRY", ""
        page.get_by_label("Paylaş", exact=True).first.click()
        try:
            page.locator("div[role='dialog'] form").first.wait_for(state="detached", timeout=90000)
        except Exception:
            print("composer 90 sn içinde kapanmadı")
        page.wait_for_timeout(8000)
        page.goto(FB_PAGE, wait_until="domcontentloaded")
        page.wait_for_timeout(7000)
        yeni = [h for h in page.locator("a[href*='/photo/?fbid=']").evaluate_all(FBID_JS) if h not in onceki]
        return ("OK" if yeni else "FAIL"), (yeni[0] if yeni else "feedde yeni gönderi yok")
    finally:
        page.close()


def fb_story(ctx, img, link, alt, go, shot):
    page = ctx.new_page()
    try:
        page.goto("https://www.facebook.com/stories/create/", wait_until="domcontentloaded")
        page.wait_for_timeout(7000)
        with page.expect_file_chooser(timeout=10000) as fc:
            page.get_by_label("Bir fotoğraf veya video hikayesi oluştur").click()
        fc.value.set_files(str(img))
        page.wait_for_timeout(8000)
        try:
            page.locator("input[value='web link']").click(force=True, timeout=5000)
            page.wait_for_timeout(2500)
            page.locator("input[type='text']").last.fill(link)
            page.wait_for_timeout(1500)
        except Exception as e:  # link düğmesi Sayfa hikayesinde her zaman çıkmıyor
            print("story link atlandı:", str(e)[:80])
        try:
            page.get_by_text("Alternatif metin", exact=True).click(timeout=4000)
            page.wait_for_timeout(1200)
            page.locator("textarea").last.fill(alt)
        except Exception as e:
            print("story alt atlandı:", str(e)[:80])
        page.screenshot(path=str(shot))
        if not go:
            return "DRY", ""
        btn = page.get_by_label("Hikayede Paylaş")
        (btn if btn.count() else page.get_by_label("Hikayende paylaş")).first.click()
        page.wait_for_timeout(10000)
        return "OK", page.url
    finally:
        page.close()


# --------------------------------------------------------------- Instagram
def ig_post(ctx, img, text, alt, go, shot):
    page = ctx.new_page()
    try:
        page.goto("https://www.instagram.com/", wait_until="domcontentloaded")
        page.wait_for_timeout(7000)
        for name in ("New post", "Create", "Oluştur", "Yeni gönderi"):
            loc = page.get_by_role("link", name=name)
            if loc.count() == 0:
                loc = page.locator(f"[aria-label='{name}']")
            if loc.count():
                loc.first.click()
                break
        page.wait_for_timeout(2500)
        for name in ("Post", "Gönderi"):
            l = page.get_by_text(name, exact=True)
            if l.count():
                l.first.click()
                page.wait_for_timeout(2000)
                break
        with page.expect_file_chooser(timeout=10000) as fc:
            page.get_by_text("Select", exact=False).first.click()
        fc.value.set_files(str(img))
        page.wait_for_timeout(5000)
        for _ in range(2):
            page.get_by_role("button", name="Next").first.click()
            page.wait_for_timeout(3000)
        box = page.locator("div[role='dialog'] div[contenteditable='true'], div[role='dialog'] textarea").first
        box.click()
        page.keyboard.insert_text(text)
        page.wait_for_timeout(2000)
        page.get_by_text("Create new post", exact=True).first.click()
        page.wait_for_timeout(1000)
        try:
            loc = page.get_by_placeholder("Add location")
            loc.click()
            loc.fill("İkitelli OSB")
            page.wait_for_timeout(3500)
            page.locator("div[role='dialog'] button").filter(has_text="İkitelli OSB").filter(
                has_not_text="Cadde").first.click(timeout=4000)
            page.wait_for_timeout(1000)
        except Exception as e:
            print("konum atlandı", str(e)[:80])
        try:
            page.get_by_text("Accessibility", exact=True).first.click()
            page.wait_for_timeout(1000)
            page.get_by_placeholder("Write alt text...").fill(alt)
        except Exception as e:
            print("alt atlandı", str(e)[:80])
        page.screenshot(path=str(shot))
        if not go:
            return "DRY", ""
        page.get_by_role("button", name="Share").first.click()
        page.wait_for_timeout(15000)
        body = page.inner_text("div[role='dialog']")[:200] if page.locator("div[role='dialog']").count() else ""
        ok = "shared" in body.lower() or "paylaşıldı" in body.lower()
        page.goto("https://www.instagram.com/yamansarulman/", wait_until="domcontentloaded")
        page.wait_for_timeout(6000)
        a = page.locator("article a[href*='/p/'], main a[href*='/p/']").first
        url = a.get_attribute("href") if a.count() else ""
        return ("OK" if ok or url else "FAIL"), ("https://www.instagram.com" + url if url else body)
    finally:
        page.close()


def ig_story(ctx, img, go, shot):
    """9:16 mobil emülasyonla yükleme – web'in ekran oranına göre kırpmasını önler."""
    page = ctx.new_page()
    cdp = ctx.new_cdp_session(page)
    try:
        cdp.send("Emulation.setUserAgentOverride", {"userAgent": UA_MOBIL, "platform": "iPhone"})
        cdp.send("Emulation.setDeviceMetricsOverride", {
            "width": 360, "height": 640, "deviceScaleFactor": 3, "mobile": True,
            "screenWidth": 360, "screenHeight": 640,
            "screenOrientation": {"type": "portraitPrimary", "angle": 0}})
        page.goto("https://www.instagram.com/", wait_until="domcontentloaded")
        page.wait_for_timeout(8000)
        for _ in range(3):
            for t in ("OK", "Not now", "Not Now"):
                b = page.get_by_role("button", name=t)
                if b.count():
                    b.first.click(force=True, timeout=3000)
                    page.wait_for_timeout(1200)
            c = page.get_by_label("Close")
            if c.count():
                c.first.click(force=True, timeout=3000)
                page.wait_for_timeout(1200)
        with page.expect_file_chooser(timeout=10000) as fc:
            page.get_by_text("Your story", exact=True).click()
        fc.value.set_files(str(img))
        page.wait_for_timeout(8000)
        page.screenshot(path=str(shot))
        if not go:
            return "DRY", ""
        page.get_by_text("Add to your story", exact=True).click()
        page.wait_for_timeout(15000)
        return "OK", "https://www.instagram.com/stories/yamansarulman/"
    finally:
        page.close()


# -------------------------------------------------------------------- main
def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--gun", default="auto")
    ap.add_argument("--slot", required=True, choices=["sabah", "ana", "story"])
    ap.add_argument("--platform", default="fb,ig")
    ap.add_argument("go", nargs="?")
    a = ap.parse_args()
    go = a.go == "go"
    gun = gun_no(a.gun)
    plats = a.platform.split(",")
    SHOTS.mkdir(exist_ok=True)

    with sync_playwright() as p:
        ctx = p.chromium.connect_over_cdp(CDP).contexts[0]
        if a.slot == "story":
            d = M.story(gun)
            img = GONDERI / d["img"]
            if "fb" in plats:
                durum, url = fb_story(ctx, img, d["link"], d["alt"], go, SHOTS / f"g{gun:02d}_story_fb.png")
                log(gun=gun, slot="story", platform="fb", durum=durum, url=url)
            if "ig" in plats:
                durum, url = ig_story(ctx, img, go, SHOTS / f"g{gun:02d}_story_ig.png")
                log(gun=gun, slot="story", platform="ig", durum=durum, url=url)
            return
        d = M.sabah(gun) if a.slot == "sabah" else M.ana(gun)
        img = GONDERI / d["img"]
        assert img.exists(), img
        if "fb" in plats:
            durum, url = fb_post(ctx, img, d["fb"], go, SHOTS / f"g{gun:02d}_{a.slot}_fb.png")
            log(gun=gun, slot=a.slot, platform="fb", durum=durum, url=url)
        if "ig" in plats:
            durum, url = ig_post(ctx, img, d["ig"], d["alt"], go, SHOTS / f"g{gun:02d}_{a.slot}_ig.png")
            log(gun=gun, slot=a.slot, platform="ig", durum=durum, url=url)


if __name__ == "__main__":
    main()
