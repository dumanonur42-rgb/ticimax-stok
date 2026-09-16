"""Paylaşım işlemleri: FB sayfa gönderisi/story, IG gönderi/story, FB grup gönderisi.
Her fonksiyon (durum, not/url) döner. durum: OK | PENDING | FAIL | BLOK | DRY
Türkçe ve İngilizce arayüz etiketleri birlikte denenir."""
import re

FB_PAGE = "https://www.facebook.com/yamansarulman/"
IG_USER = "yamansarulman"
UA_MOBIL = ("Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 "
            "(KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1")
BLOK = ("Geçici olarak engellendin", "You're Temporarily Blocked", "çok hızlı hareket", "moving too fast",
        "Bu içerik şu anda kullanılamıyor", "bu özelliği kullanman engellendi", "hesabın kısıtlandı",
        "Try again later", "Daha sonra tekrar dene")
FBID_JS = "els=>[...new Set(els.map(e=>e.href.split('&')[0]))]"


def _blok(page):
    try:
        b = page.inner_text("body")[:8000].lower()
    except Exception:
        return None
    return next((x for x in BLOK if x.lower() in b), None)


def _ilk(page, *secenekler, timeout=4000):
    """Verilen locator'lardan görünür olan ilkini döner (yoksa None)."""
    for s in secenekler:
        loc = s(page) if callable(s) else page.locator(s)
        try:
            if loc.count() and loc.first.is_visible(timeout=timeout):
                return loc.first
        except Exception:
            continue
    return None


def _tikla_metin(page, *metinler, exact=True, timeout=3000):
    for m in metinler:
        loc = page.get_by_text(m, exact=exact)
        try:
            if loc.count():
                loc.first.click(timeout=timeout)
                return True
        except Exception:
            continue
    return False


def _tikla_rol(page, rol, *adlar, timeout=3000):
    for a in adlar:
        loc = page.get_by_role(rol, name=a)
        try:
            if loc.count():
                loc.first.click(timeout=timeout)
                return True
        except Exception:
            continue
    return False


# ---------------------------------------------------------------- Facebook sayfa
def fb_post(ctx, img, text, go, shot):
    page = ctx.new_page()
    try:
        page.goto(FB_PAGE, wait_until="domcontentloaded")
        page.wait_for_timeout(6000)
        page.keyboard.press("Escape")
        if b := _blok(page):
            page.screenshot(path=str(shot))
            return "BLOK", b
        onceki = set(page.locator("a[href*='/photo/?fbid=']").evaluate_all(FBID_JS))
        if not _tikla_metin(page, "Ne düşünüyorsun?", "What's on your mind", exact=False):
            page.screenshot(path=str(shot))
            return "FAIL", "gönderi kutusu bulunamadı (Sayfa oturumu açık mı?)"
        page.wait_for_timeout(3000)
        with page.expect_file_chooser(timeout=10000) as fc:
            btn = _ilk(page, "[aria-label='Fotoğraf/video ekle']", "form [aria-label='Fotoğraf/video']",
                       "[aria-label='Photo/video']")
            btn.click()
        fc.value.set_files(str(img))
        page.wait_for_timeout(6000)
        box = page.locator("form div[contenteditable='true']:not([aria-label*='yorum']):not([aria-label*='omment'])").last
        box.click()
        page.keyboard.insert_text(text)
        page.wait_for_timeout(3000)
        nxt = _ilk(page, "[aria-label='İleri']", "[aria-label='Next']", timeout=1500)
        if nxt:
            nxt.click()
            page.wait_for_timeout(4000)
        page.screenshot(path=str(shot))
        if not go:
            return "DRY", ""
        _ilk(page, "[aria-label='Paylaş']", "[aria-label='Post']", "[aria-label='Gönder']").click()
        try:
            page.locator("div[role='dialog'] form").first.wait_for(state="detached", timeout=90000)
        except Exception:
            pass
        page.wait_for_timeout(8000)
        if b := _blok(page):
            page.screenshot(path=str(shot))
            return "BLOK", b
        page.goto(FB_PAGE, wait_until="domcontentloaded")
        page.wait_for_timeout(7000)
        yeni = [h for h in page.locator("a[href*='/photo/?fbid=']").evaluate_all(FBID_JS) if h not in onceki]
        return ("OK" if yeni else "FAIL"), (yeni[0] if yeni else "feedde yeni gönderi görülmedi")
    except Exception as e:
        page.screenshot(path=str(shot))
        return "FAIL", str(e)[:120]
    finally:
        page.close()


def fb_story(ctx, img, link, alt, go, shot):
    page = ctx.new_page()
    try:
        page.goto("https://www.facebook.com/stories/create/", wait_until="domcontentloaded")
        page.wait_for_timeout(7000)
        with page.expect_file_chooser(timeout=10000) as fc:
            _ilk(page, "[aria-label='Bir fotoğraf veya video hikayesi oluştur']",
                 "[aria-label='Create a photo story']", "[aria-label='Create a Photo Story']").click()
        fc.value.set_files(str(img))
        page.wait_for_timeout(8000)
        try:
            page.locator("input[value='web link']").click(force=True, timeout=5000)
            page.wait_for_timeout(2500)
            page.locator("input[type='text']").last.fill(link)
            page.wait_for_timeout(1500)
        except Exception:
            pass
        try:
            _tikla_metin(page, "Alternatif metin", "Alt text", timeout=4000)
            page.wait_for_timeout(1200)
            page.locator("textarea").last.fill(alt)
        except Exception:
            pass
        page.screenshot(path=str(shot))
        if not go:
            return "DRY", ""
        _ilk(page, "[aria-label='Hikayede Paylaş']", "[aria-label='Hikayende paylaş']",
             "[aria-label='Share to story']", "[aria-label='Share to Story']").click()
        page.wait_for_timeout(10000)
        if b := _blok(page):
            return "BLOK", b
        return "OK", "https://www.facebook.com/stories/"
    except Exception as e:
        page.screenshot(path=str(shot))
        return "FAIL", str(e)[:120]
    finally:
        page.close()


# --------------------------------------------------------------- Instagram
def _ig_popup_kapat(page):
    for _ in range(2):
        _tikla_rol(page, "button", "Not now", "Not Now", "Şimdi değil", "OK", "Tamam", timeout=1500)
        page.wait_for_timeout(600)


def ig_post(ctx, img, text, alt, go, shot):
    page = ctx.new_page()
    try:
        page.goto("https://www.instagram.com/", wait_until="domcontentloaded")
        page.wait_for_timeout(7000)
        _ig_popup_kapat(page)
        acildi = False
        for name in ("New post", "Create", "Oluştur", "Yeni gönderi"):
            loc = page.get_by_role("link", name=name)
            if loc.count() == 0:
                loc = page.locator(f"[aria-label='{name}']")
            if loc.count():
                loc.first.click()
                acildi = True
                break
        if not acildi:
            page.screenshot(path=str(shot))
            return "FAIL", "Oluştur düğmesi yok (Instagram oturumu açık mı?)"
        page.wait_for_timeout(2500)
        _tikla_metin(page, "Post", "Gönderi", timeout=2000)
        page.wait_for_timeout(1500)
        with page.expect_file_chooser(timeout=10000) as fc:
            if not _tikla_rol(page, "button", re.compile("Select from computer|Bilgisayardan seç", re.I)):
                page.get_by_text(re.compile("Select|seç", re.I)).first.click()
        fc.value.set_files(str(img))
        page.wait_for_timeout(5000)
        for _ in range(2):
            _tikla_rol(page, "button", "Next", "İleri")
            page.wait_for_timeout(3000)
        box = page.locator("div[role='dialog'] div[contenteditable='true'], div[role='dialog'] textarea").first
        box.click()
        page.keyboard.insert_text(text)
        page.wait_for_timeout(2000)
        _tikla_metin(page, "Create new post", "Yeni gönderi oluştur", timeout=1500)
        page.wait_for_timeout(800)
        try:
            loc = page.get_by_placeholder(re.compile("Add location|Konum ekle"))
            loc.click()
            loc.fill("İkitelli OSB")
            page.wait_for_timeout(3500)
            page.locator("div[role='dialog'] button").filter(has_text="İkitelli OSB").filter(
                has_not_text="Cadde").first.click(timeout=4000)
            page.wait_for_timeout(1000)
        except Exception:
            pass
        try:
            _tikla_metin(page, "Accessibility", "Erişilebilirlik", timeout=2000)
            page.wait_for_timeout(800)
            page.get_by_placeholder(re.compile("Write alt text|Alternatif metin yaz")).fill(alt)
        except Exception:
            pass
        page.screenshot(path=str(shot))
        if not go:
            return "DRY", ""
        _tikla_rol(page, "button", "Share", "Paylaş")
        page.wait_for_timeout(15000)
        body = page.inner_text("div[role='dialog']")[:200].lower() if page.locator("div[role='dialog']").count() else ""
        ok = "shared" in body or "paylaşıldı" in body
        page.goto(f"https://www.instagram.com/{IG_USER}/", wait_until="domcontentloaded")
        page.wait_for_timeout(6000)
        a = page.locator("article a[href*='/p/'], main a[href*='/p/']").first
        url = a.get_attribute("href") if a.count() else ""
        return ("OK" if ok or url else "FAIL"), ("https://www.instagram.com" + url if url else body)
    except Exception as e:
        page.screenshot(path=str(shot))
        return "FAIL", str(e)[:120]
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
            _ig_popup_kapat(page)
            c = page.get_by_label(re.compile("^(Close|Kapat)$"))
            if c.count():
                c.first.click(force=True, timeout=3000)
                page.wait_for_timeout(1200)
        # Aktif hikaye yoksa 'Your story' tıklaması dosya seçici açar; varsa görüntüleyici açılır.
        # Bu yüzden doğrudan hikaye yükleme input'una (accept=png/jpeg/avif) dosya verilir.
        girdi = page.locator("input[type=file][accept*='png']").first
        if girdi.count():
            girdi.set_input_files(str(img))
        else:
            with page.expect_file_chooser(timeout=10000) as fc:
                if not _tikla_metin(page, "Your story", "Hikayen", timeout=4000):
                    page.locator("[aria-label='New story'], [aria-label='Yeni hikaye']").first.click()
            fc.value.set_files(str(img))
        page.wait_for_timeout(8000)
        page.screenshot(path=str(shot))
        if "/create/story" not in page.url and not page.get_by_text(re.compile("Add to your story|Hikayene ekle")).count():
            return "FAIL", "hikaye düzenleyici açılmadı"
        if not go:
            return "DRY", ""
        if not _tikla_metin(page, "Add to your story", "Hikayene ekle", timeout=5000):
            return "FAIL", "'Hikayene ekle' düğmesi yok"
        page.wait_for_timeout(15000)
        return "OK", f"https://www.instagram.com/stories/{IG_USER}/"
    except Exception as e:
        page.screenshot(path=str(shot))
        return "FAIL", str(e)[:120]
    finally:
        page.close()


# --------------------------------------------------------------- Facebook grup
def grup_post(ctx, url, img, text, go, shot):
    page = ctx.new_page()
    try:
        page.goto(url, wait_until="domcontentloaded")
        page.wait_for_timeout(6000)
        page.keyboard.press("Escape")
        if b := _blok(page):
            page.screenshot(path=str(shot))
            return "BLOK", b
        opener = page.locator("[role='button']").filter(
            has_text=re.compile(r"(Bir şeyler yaz|Write something|bir şeyler yaz)")).first
        if opener.count() == 0:
            page.screenshot(path=str(shot))
            return "FAIL", "gönderi kutusu yok (üyelik onayı / paylaşım izni)"
        opener.click()
        page.wait_for_timeout(3000)
        dlg = page.locator("form").filter(has=page.locator("[contenteditable='true']")).last
        if dlg.count() == 0:
            page.screenshot(path=str(shot))
            return "FAIL", "form açılmadı"
        try:
            with page.expect_file_chooser(timeout=8000) as fc:
                dlg.locator("[aria-label='Fotoğraf/video ekle'], [aria-label='Fotoğraf/video'], "
                            "[aria-label='Photo/video']").first.click()
            fc.value.set_files(str(img))
        except Exception as e:
            page.screenshot(path=str(shot))
            return "FAIL", "fotoğraf: " + str(e)[:60]
        page.wait_for_timeout(5000)
        box = dlg.locator("div[contenteditable='true']:not([aria-label*='yorum']):not([aria-label*='omment'])").first
        box.click()
        page.keyboard.insert_text(text)
        page.wait_for_timeout(2500)
        ileri = dlg.locator("[aria-label='İleri'], [aria-label='Next']").first
        if ileri.count() and ileri.is_visible():
            ileri.click()
            page.wait_for_timeout(2500)
        share = dlg.locator("[aria-label='Paylaş'], [aria-label='Gönder'], [aria-label='Post']").first
        if share.count() == 0:
            page.screenshot(path=str(shot))
            return "FAIL", "Paylaş düğmesi yok"
        if not go:
            page.screenshot(path=str(shot))
            page.keyboard.press("Escape")
            return "DRY", ""
        share.click()
        for _ in range(40):
            page.wait_for_timeout(1000)
            if page.locator("form").filter(has=page.locator("[contenteditable='true']")).count() == 0:
                break
        page.wait_for_timeout(4000)
        page.screenshot(path=str(shot))
        if b := _blok(page):
            return "BLOK", b
        bl = page.inner_text("body")[:8000].lower()
        if re.search(r"yamansa rulman\s*\n\s*(az önce|şimdi|1 dk|just now)", bl):
            return "OK", ""
        if any(x in bl for x in ("onay bekl", "yönetici onayı", "onaylanmayı bekl", "pending approval")):
            return "PENDING", "yönetici onayı bekliyor"
        return "OK", "feedde doğrulanamadı"
    except Exception as e:
        page.screenshot(path=str(shot))
        return "FAIL", str(e)[:120]
    finally:
        page.close()
