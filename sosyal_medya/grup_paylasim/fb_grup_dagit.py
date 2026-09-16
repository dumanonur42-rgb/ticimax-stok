# -*- coding: utf-8 -*-
"""Tüm gruplara segment varyantıyla paylaşım turu.
Kullanım: python3 fb_grup_dagit.py --tur 1 --ara 180 [--limit N] [go]
  --tur   : tur numarası (varyant seçimi: (tur-1) % 3) ve log anahtarı
  --ara   : gruplar arası bekleme (sn)
  go      : gerçekten paylaş (yoksa dry-run: composer'a kadar gider, paylaşmaz)
Log: paylasim_log.json  {tur: {grup_url: {durum, varyant, zaman, not}}}
Engel mesajı görülürse tur anında durur (durum=BLOK)."""
import sys, re, json, time, argparse, datetime as dt
from pathlib import Path
from playwright.sync_api import sync_playwright

sys.path.insert(0, str(Path(__file__).resolve().parent))
from segmentler import gruplar  # noqa: E402
from varyantlar import HEPSI  # noqa: E402

HERE = Path(__file__).resolve().parent
LOG = HERE / "paylasim_log.json"
SHOTS = HERE / "shots"
SHOTS.mkdir(exist_ok=True)
BLOK = ("Geçici olarak engellendin", "You're Temporarily Blocked", "çok hızlı hareket",
        "Bu içerik şu anda kullanılamıyor", "bu özelliği kullanman engellendi", "hesabın kısıtlandı")


def now():
    return dt.datetime.now().strftime("%Y-%m-%d %H:%M:%S")


def load_log():
    return json.loads(LOG.read_text()) if LOG.exists() else {}


def save_log(d):
    LOG.write_text(json.dumps(d, ensure_ascii=False, indent=1))


def has_blok(body):
    b = body.lower()
    return next((x for x in BLOK if x.lower() in b), None)


def post(page, url, img, text, go, shot):
    """-> (durum, not). durum: OK | PENDING | FAIL | BLOK | DRY"""
    page.goto(url, wait_until="domcontentloaded")
    page.wait_for_timeout(6000)
    page.keyboard.press("Escape")
    body = page.inner_text("body")[:5000]
    b = has_blok(body)
    if b:
        page.screenshot(path=shot)
        return "BLOK", b
    opener = page.locator("[role='button']").filter(has_text=re.compile(r"(Bir şeyler yaz|Write something|bir şeyler yaz)")).first
    if opener.count() == 0:
        page.screenshot(path=shot)
        return "FAIL", "composer yok (onay/izin)"
    opener.click()
    page.wait_for_timeout(3000)
    dlg = page.locator("form").filter(has=page.locator("[contenteditable='true']")).last
    if dlg.count() == 0:
        page.screenshot(path=shot)
        return "FAIL", "form açılmadı"
    try:
        with page.expect_file_chooser(timeout=8000) as fc:
            dlg.locator("[aria-label='Fotoğraf/video ekle'], [aria-label='Fotoğraf/video'], [aria-label='Photo/video']").first.click()
        fc.value.set_files(img)
    except Exception as e:
        page.screenshot(path=shot)
        return "FAIL", "foto: " + str(e)[:60]
    page.wait_for_timeout(5000)
    box = dlg.locator("div[contenteditable='true']:not([aria-label*='yorum'])").first
    box.click()
    page.keyboard.insert_text(text)
    page.wait_for_timeout(2500)
    ileri = dlg.locator("[aria-label='İleri'], [aria-label='Next']").first
    if ileri.count() and ileri.is_visible():
        ileri.click()
        page.wait_for_timeout(2500)
    share = dlg.locator("[aria-label='Paylaş'], [aria-label='Gönder'], [aria-label='Post']").first
    if share.count() == 0:
        page.screenshot(path=shot)
        return "FAIL", "Paylaş yok"
    if not go:
        page.screenshot(path=shot)
        page.keyboard.press("Escape")
        return "DRY", ""
    share.click()
    for _ in range(40):
        page.wait_for_timeout(1000)
        if page.locator("form").filter(has=page.locator("[contenteditable='true']")).count() == 0:
            break
    page.wait_for_timeout(4000)
    body = page.inner_text("body")[:8000]
    page.screenshot(path=shot)
    b = has_blok(body)
    if b:
        return "BLOK", b
    bl = body.lower()
    if re.search(r"yamansa rulman\s*\n\s*(az önce|şimdi|1 dk|just now)", bl):
        return "OK", ""
    if "onay bekl" in bl or "yönetici onayı" in bl or "onaylanmayı bekl" in bl or "pending approval" in bl:
        return "PENDING", "yönetici onayı"
    return "OK", "feedde doğrulanamadı"


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--tur", default="auto", help="tur no ya da auto (= son tur + 1)")
    ap.add_argument("--ara", type=int, default=180)
    ap.add_argument("--limit", type=int, default=999)
    ap.add_argument("go", nargs="?")
    a = ap.parse_args()
    go = a.go == "go"
    log = load_log()
    if a.tur == "auto":
        a.tur = max([int(k) for k in log] or [0]) + 1
    a.tur = int(a.tur)
    vi = (a.tur - 1) % 3 + 1
    tur = log.setdefault(str(a.tur), {})
    gs = [g for g in gruplar() if g["url"] not in tur or tur[g["url"]]["durum"] in ("FAIL", "DRY")]
    gs = gs[: a.limit]
    print(f"[{now()}] tur {a.tur} varyant v{vi} · {len(gs)} grup · ara {a.ara}s · {'GO' if go else 'DRY'}", flush=True)
    with sync_playwright() as p:
        ctx = p.chromium.connect_over_cdp("http://localhost:29229").contexts[0]
        page = ctx.pages[0] if ctx.pages else ctx.new_page()
        for i, g in enumerate(gs):
            key = f"{g['segment']}_v{vi}"
            img = str(HERE / "gorseller" / f"{key}.png")
            text = HEPSI[key][1]
            shot = str(SHOTS / f"t{a.tur}_{i:02d}.png")
            try:
                durum, notu = post(page, g["url"], img, text, go, shot)
            except Exception as e:
                durum, notu = "FAIL", str(e)[:100]
            tur[g["url"]] = dict(durum=durum, varyant=key, zaman=now(), grup=g["name"], **{"not": notu})
            save_log(log)
            print(f"[{now()}] {durum:7} {g['name'][:45]:45} {key} {notu}", flush=True)
            if durum == "BLOK":
                print("!!! ENGEL – tur durduruldu", flush=True)
                break
            if i < len(gs) - 1:
                time.sleep(a.ara if go else 5)
    ok = sum(1 for v in tur.values() if v["durum"] == "OK")
    print(f"[{now()}] bitti · OK {ok} · PENDING {sum(1 for v in tur.values() if v['durum']=='PENDING')} · FAIL {sum(1 for v in tur.values() if v['durum']=='FAIL')}", flush=True)


if __name__ == "__main__":
    main()
