"""Tek bir Facebook grubuna görsel + metin paylaşır.
Kullanım: python3 fb_grup_post.py <grup_url> <varyant_key ör. beyaz_v1> [go]
Çıktı: son satır 'OK <permalink|->' veya 'FAIL <neden>'"""
import sys, re, time
from pathlib import Path
from playwright.sync_api import sync_playwright

sys.path.insert(0, str(Path(__file__).resolve().parent))
from varyantlar import HEPSI  # noqa: E402

URL, KEY = sys.argv[1], sys.argv[2]
GO = len(sys.argv) > 3 and sys.argv[3] == "go"
HERE = Path(__file__).resolve().parent
ITEM = dict(img=str(HERE / "gorseller" / f"{KEY}.png"), text=HEPSI[KEY][1])
SHOT = str(HERE / "son_paylasim.png")


def fail(page, why):
    try:
        page.screenshot(path=SHOT)
    except Exception:
        pass
    print("FAIL", why)
    sys.exit(1)


with sync_playwright() as p:
    b = p.chromium.connect_over_cdp("http://localhost:29229")
    ctx = b.contexts[0]
    page = ctx.pages[0] if ctx.pages else ctx.new_page()
    page.goto(URL, wait_until="domcontentloaded")
    page.wait_for_timeout(6000)
    body = page.inner_text("body")[:4000]
    for bad in ("Geçici olarak engellendin", "You're Temporarily Blocked", "çok hızlı", "Bu içerik şu anda kullanılamıyor"):
        if bad in body:
            fail(page, "BLOK: " + bad)

    # Composer: "Bir şeyler yaz..." / "Herkese açık bir şeyler yaz..."
    opener = page.locator("[role='button']").filter(has_text=re.compile(r"(Bir şeyler yaz|Write something|bir şeyler yaz)")).first
    if opener.count() == 0:
        fail(page, "composer bulunamadı (üyelik onaylı mı / paylaşım izni var mı?)")
    opener.click()
    page.wait_for_timeout(3000)
    dlg = page.locator("form").filter(has=page.locator("[contenteditable='true']")).last
    if dlg.count() == 0:
        fail(page, "form açılmadı")

    # Foto ekle
    try:
        with page.expect_file_chooser(timeout=8000) as fc:
            btn = dlg.locator("[aria-label='Fotoğraf/video ekle'], [aria-label='Fotoğraf/video'], [aria-label='Photo/video']").first
            btn.click()
        fc.value.set_files(ITEM["img"])
    except Exception as e:
        fail(page, "foto eklenemedi: " + str(e)[:80])
    page.wait_for_timeout(5000)

    box = dlg.locator("div[contenteditable='true']:not([aria-label*='yorum'])").first
    box.click()
    page.keyboard.insert_text(ITEM["text"])
    page.wait_for_timeout(2500)
    page.screenshot(path=SHOT)

    # Onay gerekebilir (grup kuralları vb.) -> İleri varsa tıkla
    ileri = dlg.locator("[aria-label='İleri'], [aria-label='Next']").first
    if ileri.count() and ileri.is_visible():
        ileri.click()
        page.wait_for_timeout(2500)

    share = dlg.locator("[aria-label='Paylaş'], [aria-label='Gönder'], [aria-label='Post']").first
    if share.count() == 0:
        fail(page, "Paylaş düğmesi yok")
    if not GO:
        print("DRY", share.get_attribute("aria-label"))
        sys.exit(0)
    share.click()
    # Yayınlanmasını bekle
    for _ in range(30):
        page.wait_for_timeout(1000)
        if page.locator("form").filter(has=page.locator("[contenteditable='true']")).count() == 0:
            break
    page.wait_for_timeout(4000)
    body = page.inner_text("body")[:6000]
    if "Geçici olarak engellendin" in body or "çok hızlı" in body:
        fail(page, "BLOK sonrası")
    pending = "onay bekliyor" in body.lower() or "pending" in body.lower()
    page.screenshot(path=SHOT)
    print("OK", "pending" if pending else "-")
