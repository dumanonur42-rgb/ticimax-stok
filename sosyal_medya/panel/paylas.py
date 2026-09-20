"""Paylaşım işlemleri: FB sayfa gönderisi/story, IG gönderi/story, FB grup gönderisi.
Her fonksiyon (durum, not/url) döner. durum: OK | PENDING | FAIL | BLOK | DRY
Türkçe ve İngilizce arayüz etiketleri birlikte denenir.

Bekleme mantığı: sabit süre yerine öğe görünür olunca devam edilir (_bekle); yavaş PC'de
üst sınıra kadar beklenir, hızlı PC'de anında geçilir. "Paylaş"a basılmadan önce oluşan
hatalar (OnHata) sayfa kapatılıp bir kez daha denenir; paylaşımdan sonra tekrar denenmez
(çift gönderi riski)."""
import re

FB_PAGE = "https://www.facebook.com/yamansarulman/"
IG_USER = "yamansarulman"
UA_MOBIL = ("Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 "
            "(KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1")
BLOK = ("Geçici olarak engellendin", "You're Temporarily Blocked", "çok hızlı hareket", "moving too fast",
        "Bu içerik şu anda kullanılamıyor", "bu özelliği kullanman engellendi", "hesabın kısıtlandı",
        "Try again later", "Daha sonra tekrar dene")
FBID_JS = "els=>[...new Set(els.map(e=>e.href.split('&')[0]))]"
DENEME = 2

FOTO_SEC = ("[aria-label='Fotoğraf/video ekle'], [aria-label='Fotoğraf/video'], "
            "[aria-label='Photo/video'], [aria-label='Add photo/video']")
PAYLAS_SEC = "[aria-label='Paylaş'], [aria-label='Gönder'], [aria-label='Post'], [aria-label='Share']"
ILERI_SEC = "[aria-label='İleri'], [aria-label='Next']"
GECIS_RE = re.compile(r"Geçiş Yap|Şimdi Geçiş Yap|Switch Now", re.I)
KUTU_RE = re.compile(r"Ne düşünüyorsun|What's on your mind|Bir şeyler yaz|Write something", re.I)


class OnHata(Exception):
    """Paylaş düğmesine basılmadan önce oluşan hata – güvenle yeniden denenebilir."""


def _blok(page):
    try:
        b = page.inner_text("body")[:8000].lower()
    except Exception:
        return None
    return next((x for x in BLOK if x.lower() in b), None)


def _loc(page, s):
    return s(page) if callable(s) else page.locator(s)


def _gorunur(loc):
    try:
        return loc.count() > 0 and loc.first.is_visible()
    except Exception:
        return False


def _bekle(page, *secenekler, timeout=15000, adim=250):
    """Seçeneklerden görünür olan ilk locator'ı bekler ve döner; süre dolarsa None."""
    gecen = 0
    while True:
        for s in secenekler:
            loc = _loc(page, s)
            if _gorunur(loc):
                return loc.first
        if gecen >= timeout:
            return None
        page.wait_for_timeout(adim)
        gecen += adim


def _bekle_yok(page, secenek, timeout=15000, adim=250):
    """Locator görünmez/yok olana kadar bekler. -> True (kayboldu) / False (süre doldu)"""
    gecen = 0
    while _gorunur(_loc(page, secenek)):
        if gecen >= timeout:
            return False
        page.wait_for_timeout(adim)
        gecen += adim
    return True


def _tikla(page, *secenekler, timeout=15000, hata=None):
    loc = _bekle(page, *secenekler, timeout=timeout)
    if loc is None:
        if hata:
            raise OnHata(hata)
        return None
    try:
        loc.click(timeout=5000)
    except Exception:
        loc.click(force=True, timeout=5000)
    return loc


def _rol(rol, ad):
    return lambda p: p.get_by_role(rol, name=ad)


def _metin(m, exact=False):
    return lambda p: p.get_by_text(m, exact=exact)


def _yaz(page, box, text):
    box.click()
    page.keyboard.insert_text(text)


def _denemeli(fn):
    """fn(st) -> (durum, not). Paylaş'a basılmadan önce oluşan hatada bir kez daha dener;
    st['paylasildi'] True ise (düğmeye basıldı) tekrar denemez – çift gönderi riski."""
    son = None
    for _ in range(DENEME):
        st = {"paylasildi": False}
        try:
            return fn(st)
        except OnHata as e:
            son = str(e)
        except Exception as e:
            son = str(e).splitlines()[0][:140]
        if st["paylasildi"]:
            break
    return "FAIL", son or "bilinmeyen hata"


def _ss(page, shot):
    try:
        page.screenshot(path=str(shot))
    except Exception:
        pass


def _foto_yukle(page, kok, img, timeout=15000):
    """Fotoğraf düğmesine tıklayıp dosya seçiciye görseli verir; kok=form/dialog locator ya da page."""
    btn = _bekle(page, lambda p: kok.locator(FOTO_SEC), timeout=timeout)
    if btn is None:
        raise OnHata("Fotoğraf/video düğmesi bulunamadı")
    with page.expect_file_chooser(timeout=10000) as fc:
        btn.click()
    fc.value.set_files(str(img))


def _fb_sayfa_gecis(page):
    """Kişisel profildeyken Sayfa'ya 'Geçiş Yap' düğmesi görünürse tıklar."""
    g = _bekle(page, _rol("button", GECIS_RE), lambda p: p.locator("[role='button']").filter(has_text=GECIS_RE),
               timeout=1500)
    if g is not None:
        g.click()
        page.wait_for_load_state("domcontentloaded")
        _bekle(page, lambda p: p.locator("[role='button']").filter(has_text=KUTU_RE), timeout=15000)
        return True
    return False


def _fb_kutu(page, timeout):
    kutu = _bekle(page, _metin(KUTU_RE), lambda p: p.locator("[role='button']").filter(has_text=KUTU_RE),
                  timeout=timeout)
    if kutu is None and _fb_sayfa_gecis(page):
        kutu = _bekle(page, _metin(KUTU_RE), lambda p: p.locator("[role='button']").filter(has_text=KUTU_RE),
                      timeout=8000)
    return kutu


def _fb_form(page, timeout=15000):
    form = lambda p: p.locator("form").filter(has=p.locator("div[contenteditable='true']"))  # noqa: E731
    if _bekle(page, form, timeout=timeout) is None:
        raise OnHata("gönderi formu açılmadı")
    return page.locator("form").filter(has=page.locator("div[contenteditable='true']")).last


def _fb_metin_kutusu(form):
    return form.locator("div[contenteditable='true']:not([aria-label*='yorum']):not([aria-label*='omment'])").first


def _fb_ileri_ve_paylas(page, form, shot, go):
    """Görsel önizlemesi + metin hazır; 'İleri' varsa geçer, Paylaş düğmesini bekler.
    -> (paylas_locator | None)"""
    paylas = _bekle(page, lambda p: form.locator(PAYLAS_SEC), lambda p: form.locator(ILERI_SEC), timeout=20000)
    if paylas is None:
        raise OnHata("Paylaş düğmesi görünmedi")
    if (paylas.get_attribute("aria-label") or "") in ("İleri", "Next"):
        paylas.click()
        paylas = _bekle(page, lambda p: form.locator(PAYLAS_SEC), timeout=15000)
        if paylas is None:
            raise OnHata("Paylaş düğmesi görünmedi (İleri sonrası)")
    for _ in range(40):  # yükleme bitmeden düğme pasif (aria-disabled) kalır
        if paylas.get_attribute("aria-disabled") not in ("true", "1"):
            break
        page.wait_for_timeout(500)
    page.screenshot(path=str(shot))
    return paylas


# ---------------------------------------------------------------- Facebook sayfa
def fb_post(ctx, img, text, go, shot):
    return _denemeli(lambda st: _fb_post(ctx, img, text, go, shot, st))


def _fb_post(ctx, img, text, go, shot, st):
    page = ctx.new_page()
    try:
        page.goto(FB_PAGE, wait_until="domcontentloaded")
        kutu = _fb_kutu(page, timeout=20000)
        page.keyboard.press("Escape")
        if b := _blok(page):
            page.screenshot(path=str(shot))
            return "BLOK", b
        if kutu is None:
            page.screenshot(path=str(shot))
            raise OnHata("gönderi kutusu bulunamadı (Sayfa oturumu açık mı? Sayfa profiline geçiş yapın)")
        onceki = set(page.locator("a[href*='/photo/?fbid=']").evaluate_all(FBID_JS))
        kutu.click()
        form = _fb_form(page)
        _foto_yukle(page, form, img)
        _yaz(page, _fb_metin_kutusu(form), text)
        # görsel önizlemesi form içine gelince yükleme tamam
        _bekle(page, lambda p: form.locator("img[src^='blob:'], img[src*='scontent']"), timeout=20000)
        paylas = _fb_ileri_ve_paylas(page, form, shot, go)
        if not go:
            return "DRY", ""
        st["paylasildi"] = True
        paylas.click()
        _bekle_yok(page, "div[role='dialog'] form", timeout=90000)
        if b := _blok(page):
            page.screenshot(path=str(shot))
            return "BLOK", b
        for _ in range(6):  # feed yeni gönderiyi birkaç sn içinde gösterir
            page.goto(FB_PAGE, wait_until="domcontentloaded")
            _bekle(page, "a[href*='/photo/?fbid=']", timeout=8000)
            yeni = [h for h in page.locator("a[href*='/photo/?fbid=']").evaluate_all(FBID_JS) if h not in onceki]
            if yeni:
                return "OK", yeni[0]
            page.wait_for_timeout(3000)
        page.screenshot(path=str(shot))
        return "OK", "Paylaş tıklandı, feedde henüz görünmedi"
    except Exception:
        _ss(page, shot)
        raise
    finally:
        page.close()


def fb_story(ctx, img, link, alt, go, shot):
    return _denemeli(lambda st: _fb_story(ctx, img, link, alt, go, shot, st))


def _fb_story(ctx, img, link, alt, go, shot, st):
    page = ctx.new_page()
    try:
        page.goto("https://www.facebook.com/stories/create/", wait_until="domcontentloaded")
        btn = _bekle(page, "[aria-label='Bir fotoğraf veya video hikayesi oluştur']",
                     "[aria-label='Create a photo story']", "[aria-label='Create a Photo Story']",
                     lambda p: p.locator("[role='button']").filter(
                         has_text=re.compile(r"fotoğraf.*hikayesi oluştur|Create a photo story", re.I)),
                     timeout=25000)
        if btn is None:
            page.screenshot(path=str(shot))
            if b := _blok(page):
                return "BLOK", b
            raise OnHata("hikaye oluşturma ekranı açılmadı (Facebook oturumu açık mı?)")
        with page.expect_file_chooser(timeout=10000) as fc:
            btn.click()
        fc.value.set_files(str(img))
        paylas_sec = ("[aria-label='Hikayede Paylaş'], [aria-label='Hikayende paylaş'], "
                      "[aria-label='Hikayede paylaş'], [aria-label='Share to story'], [aria-label='Share to Story']")
        paylas = _bekle(page, paylas_sec, _rol("button", re.compile(r"Hikaye(de|nde) paylaş|Share to story", re.I)),
                        timeout=30000)
        if paylas is None:
            page.screenshot(path=str(shot))
            raise OnHata("görsel yüklendi ama 'Hikayede Paylaş' düğmesi görünmedi")
        try:
            if not _gorunur(page.locator("input[value='web link']")):
                _tikla(page, _metin("Düğme Ekle"), _metin("Add button"), timeout=1500)
            if _bekle(page, "input[value='web link']", timeout=3000) is not None:
                page.locator("input[value='web link']").click(force=True, timeout=3000)
                alan = _bekle(page, "input[type='text']", timeout=4000)
                if alan is not None:
                    page.locator("input[type='text']").last.fill(link)
        except Exception:
            pass
        try:
            if _tikla(page, _metin("Alternatif metin"), _metin("Alt text"), timeout=1500) is not None:
                ta = _bekle(page, "textarea", timeout=4000)
                if ta is not None:
                    page.locator("textarea").last.fill(alt)
        except Exception:
            pass
        page.screenshot(path=str(shot))
        if not go:
            return "DRY", ""
        st["paylasildi"] = True
        paylas.click()
        # paylaşım tamamlanınca düzenleyici kapanır (URL /stories/create dışına çıkar)
        for _ in range(60):
            page.wait_for_timeout(1000)
            if "/stories/create" not in page.url:
                break
        if b := _blok(page):
            page.screenshot(path=str(shot))
            return "BLOK", b
        if "/stories/create" in page.url and _gorunur(page.locator(paylas_sec)):
            page.screenshot(path=str(shot))
            return "FAIL", "'Hikayede Paylaş' tıklandı ama paylaşım tamamlanmadı"
        return "OK", "https://www.facebook.com/stories/"
    except Exception:
        _ss(page, shot)
        raise
    finally:
        page.close()


# --------------------------------------------------------------- Instagram
IG_KAPAT_RE = re.compile(r"^(Not now|Şimdi değil|OK|Tamam)$", re.I)


def _ig_popup_kapat(page):
    for _ in range(2):
        b = page.get_by_role("button", name=IG_KAPAT_RE)
        if not _gorunur(b):
            return
        try:
            b.first.click(timeout=2000)
        except Exception:
            return
        page.wait_for_timeout(400)


def _ig_baslik(page):
    try:
        h = page.locator("div[role='dialog'] h1")
        return h.first.inner_text(timeout=1000) if h.count() else ""
    except Exception:
        return ""


def ig_post(ctx, img, text, alt, go, shot):
    return _denemeli(lambda st: _ig_post(ctx, img, text, alt, go, shot, st))


def _ig_post(ctx, img, text, alt, go, shot, st):
    page = ctx.new_page()
    try:
        page.goto("https://www.instagram.com/", wait_until="domcontentloaded")
        olustur_re = re.compile(r"New post|Create|Oluştur|Yeni gönderi", re.I)
        olustur = (lambda p: p.get_by_role("link", name=olustur_re),
                   lambda p: p.locator("a, [role='link'], [role='button']").filter(
                       has=p.locator("svg[aria-label='New post' i], svg[aria-label='Yeni gönderi' i]")),
                   "[aria-label='New post' i], [aria-label='Yeni gönderi' i], [aria-label='Oluştur' i], "
                   "[aria-label='Create' i]")
        btn = _bekle(page, *olustur, timeout=25000)
        if btn is None:
            _ig_popup_kapat(page)
            btn = _bekle(page, *olustur, timeout=5000)
        if btn is None:
            page.screenshot(path=str(shot))
            raise OnHata("Oluştur düğmesi yok (Instagram oturumu açık mı?)")
        _ig_popup_kapat(page)
        btn.click()
        sec_re = re.compile(r"Select from computer|Bilgisayardan seç", re.I)
        secici = _bekle(page, _rol("button", sec_re), _metin(sec_re),
                        lambda p: p.get_by_text(re.compile(r"^(Post|Gönderi)$", re.I)), timeout=10000)
        if secici is None:
            raise OnHata("Yeni gönderi penceresi açılmadı")
        if re.fullmatch(r"Post|Gönderi", (secici.inner_text() or "").strip(), re.I):
            secici.click()  # Oluştur menüsü: Gönderi / Yapay zeka
            secici = _bekle(page, _rol("button", sec_re), _metin(sec_re), timeout=10000)
            if secici is None:
                raise OnHata("'Bilgisayardan seç' düğmesi yok")
        with page.expect_file_chooser(timeout=10000) as fc:
            secici.click()
        fc.value.set_files(str(img))
        ileri_re = re.compile(r"^(Next|İleri)$")
        for _ in range(2):  # kırp -> düzenle -> açıklama (her adımda pencere başlığı değişir)
            n = _bekle(page, _rol("button", ileri_re), _metin(ileri_re, exact=True), timeout=20000)
            if n is None:
                raise OnHata("görsel yüklenmedi ('İleri' görünmedi)")
            baslik = _ig_baslik(page)
            n.click()
            for _ in range(40):
                if _ig_baslik(page) != baslik:
                    break
                page.wait_for_timeout(250)
        box = _bekle(page, "div[role='dialog'] div[contenteditable='true']", "div[role='dialog'] textarea",
                     timeout=15000)
        if box is None:
            raise OnHata("açıklama kutusu bulunamadı")
        _yaz(page, box, text)
        try:
            konum = page.get_by_placeholder(re.compile("Add location|Konum ekle"))
            if _gorunur(konum):
                konum.click()
                konum.fill("İkitelli OSB")
                sec = _bekle(page, lambda p: p.locator("div[role='dialog'] button").filter(
                    has_text="İkitelli OSB").filter(has_not_text="Cadde"), timeout=6000)
                if sec is not None:
                    sec.click()
        except Exception:
            pass
        try:
            if _tikla(page, _metin("Accessibility"), _metin("Erişilebilirlik"), timeout=1500) is not None:
                alan = page.get_by_placeholder(re.compile("Write alt text|Alternatif metin yaz"))
                if _bekle(page, lambda p: alan, timeout=4000) is not None:
                    alan.fill(alt)
        except Exception:
            pass
        paylas = _bekle(page, _rol("button", re.compile(r"^(Share|Paylaş)$")),
                        _metin(re.compile(r"^(Share|Paylaş)$"), exact=True), timeout=8000)
        page.screenshot(path=str(shot))
        if paylas is None:
            raise OnHata("Paylaş düğmesi yok")
        if not go:
            return "DRY", ""
        st["paylasildi"] = True
        paylas.click()
        ok_re = re.compile(r"shared|paylaşıldı", re.I)
        sonuc = _bekle(page, lambda p: p.locator("div[role='dialog']").get_by_text(ok_re), timeout=90000)
        if sonuc is None and _gorunur(page.locator("div[role='dialog']").get_by_text(
                re.compile(r"couldn't be shared|paylaşılamadı|Something went wrong|Bir hata oluştu", re.I))):
            page.screenshot(path=str(shot))
            return "FAIL", "Instagram: gönderi paylaşılamadı (tekrar deneyin)"
        page.goto(f"https://www.instagram.com/{IG_USER}/", wait_until="domcontentloaded")
        a = _bekle(page, "article a[href*='/p/'], main a[href*='/p/']", timeout=15000)
        url = a.get_attribute("href") if a is not None else ""
        if sonuc is None and not url:
            page.screenshot(path=str(shot))
            return "FAIL", "paylaşım onayı görülmedi"
        return "OK", ("https://www.instagram.com" + url if url else f"https://www.instagram.com/{IG_USER}/")
    except Exception:
        _ss(page, shot)
        raise
    finally:
        page.close()


def ig_story(ctx, img, go, shot):
    return _denemeli(lambda st: _ig_story(ctx, img, go, shot, st))


MOBIL_W, MOBIL_H = 360, 640
DONDUR_RE = re.compile(r"cihazını döndür|Rotate your device|rotate your phone", re.I)


def _mobil_emulasyon(page, cdp):
    """Dikey telefon görünümü: Playwright viewport (gezinmelerde kalıcı) + CDP UA/mobil bayrağı."""
    page.set_viewport_size({"width": MOBIL_W, "height": MOBIL_H})
    cdp.send("Emulation.setUserAgentOverride", {"userAgent": UA_MOBIL, "platform": "iPhone"})
    cdp.send("Emulation.setDeviceMetricsOverride", {
        "width": MOBIL_W, "height": MOBIL_H, "deviceScaleFactor": 3, "mobile": True,
        "screenWidth": MOBIL_W, "screenHeight": MOBIL_H,
        "screenOrientation": {"type": "portraitPrimary", "angle": 0}})
    cdp.send("Emulation.setTouchEmulationEnabled", {"enabled": True, "maxTouchPoints": 5})


def _ig_dikey_mi(page):
    try:
        return page.evaluate("() => window.innerWidth < window.innerHeight")
    except Exception:
        return True


def _ig_story(ctx, img, go, shot, st):
    """9:16 mobil emülasyonla yükleme – web'in ekran oranına göre kırpmasını önler.
    Instagram yatay ekranda 'Hikayene ekleme yapmak için cihazını döndür' der ve düğmeyi göstermez;
    bu yüzden dikey görünüm her gezinmeden sonra doğrulanır."""
    page = ctx.new_page()
    cdp = ctx.new_cdp_session(page)
    try:
        _mobil_emulasyon(page, cdp)
        page.goto("https://www.instagram.com/", wait_until="domcontentloaded")
        if not _ig_dikey_mi(page):
            _mobil_emulasyon(page, cdp)
            page.reload(wait_until="domcontentloaded")
        # Aktif hikaye yoksa 'Your story' tıklaması dosya seçici açar; varsa görüntüleyici açılır.
        # Bu yüzden doğrudan hikaye yükleme input'una (accept=png/jpeg/avif) dosya verilir.
        hazir = _bekle(page, lambda p: p.locator("input[type=file][accept*='png']"),
                       _metin(re.compile(r"^(Your story|Hikayen)$"), exact=True),
                       "[aria-label='New story'], [aria-label='Yeni hikaye']",
                       "svg[aria-label='Home'], svg[aria-label='Ana Sayfa']", timeout=25000)
        for _ in range(3):
            _ig_popup_kapat(page)
            c = page.get_by_label(re.compile("^(Close|Kapat)$"))
            if _gorunur(c):
                c.first.click(force=True, timeout=3000)
                page.wait_for_timeout(600)
        if hazir is None:
            page.screenshot(path=str(shot))
            raise OnHata("Instagram ana sayfa yüklenmedi (oturum açık mı?)")
        girdi = page.locator("input[type=file][accept*='png']").first
        if girdi.count():
            girdi.set_input_files(str(img))
        else:
            with page.expect_file_chooser(timeout=10000) as fc:
                _tikla(page, _metin(re.compile(r"^(Your story|Hikayen)$"), exact=True),
                       "[aria-label='New story'], [aria-label='Yeni hikaye']", timeout=5000,
                       hata="hikaye ekleme düğmesi yok")
            fc.value.set_files(str(img))
        ekle_re = re.compile(r"^\s*(Add to (your )?story|Hikayene ekle|Hikayeye ekle)\s*$", re.I)
        ekle_sec = (_rol("button", ekle_re),
                    lambda p: p.locator("button, [role='button']").filter(has_text=ekle_re),
                    _metin(ekle_re))
        ekle = None
        for _ in range(16):  # yükleme/işleme yavaş PC'de 30-40 sn sürebilir
            ekle = _bekle(page, *ekle_sec, timeout=2500)
            if ekle is not None:
                break
            if _gorunur(page.get_by_text(DONDUR_RE)) or not _ig_dikey_mi(page):
                _mobil_emulasyon(page, cdp)  # yatay görünüme düşmüş; dikeye dönünce düğme gelir
                page.wait_for_timeout(1000)
            _ig_popup_kapat(page)
        page.screenshot(path=str(shot))
        if ekle is None:
            if "/create/story" not in page.url:
                raise OnHata("hikaye düzenleyici açılmadı")
            if _gorunur(page.get_by_text(DONDUR_RE)):
                raise OnHata("Instagram dikey görünüme geçmedi ('cihazını döndür' uyarısı)")
            raise OnHata("'Hikayene ekle' düğmesi yok")
        if not go:
            return "DRY", ""
        st["paylasildi"] = True
        ekle.scroll_into_view_if_needed()
        try:
            ekle.click(timeout=8000)
        except Exception:
            ekle.click(force=True, timeout=8000)
        for _ in range(40):  # paylaşım bitince düzenleyici kapanır (ana sayfaya döner)
            page.wait_for_timeout(1000)
            if "/create/story" not in page.url:
                break
        if "/create/story" in page.url and _bekle(page, *ekle_sec, timeout=1000) is not None:
            page.screenshot(path=str(shot))
            return "FAIL", "'Hikayene ekle' tıklandı ama paylaşım tamamlanmadı"
        return "OK", f"https://www.instagram.com/stories/{IG_USER}/"
    except Exception:
        _ss(page, shot)
        raise
    finally:
        page.close()


# --------------------------------------------------------------- Facebook grup
def grup_post(ctx, url, img, text, go, shot):
    return _denemeli(lambda st: _grup_post(ctx, url, img, text, go, shot, st))


def _grup_post(ctx, url, img, text, go, shot, st):
    page = ctx.new_page()
    try:
        page.goto(url, wait_until="domcontentloaded")
        opener_sec = lambda p: p.locator("[role='button']").filter(  # noqa: E731
            has_text=re.compile(r"Bir şeyler yaz|Write something|Ne düşünüyorsun|What's on your mind", re.I))
        opener = _bekle(page, opener_sec, timeout=20000)
        page.keyboard.press("Escape")
        if b := _blok(page):
            page.screenshot(path=str(shot))
            return "BLOK", b
        if opener is None and _fb_sayfa_gecis(page):
            opener = _bekle(page, opener_sec, timeout=8000)
        if opener is None:
            page.screenshot(path=str(shot))
            bl = (page.inner_text("body")[:6000] if page.locator("body").count() else "").lower()
            if any(x in bl for x in ("gruba katıl", "join group", "katılma isteği", "request to join")):
                return "FAIL", "gruba üye değilsiniz / üyelik onayı bekliyor"
            if any(x in bl for x in ("bu içerik şu anda kullanılamıyor", "content isn't available")):
                return "FAIL", "grup bulunamadı / erişim yok"
            raise OnHata("gönderi kutusu yok (üyelik onayı / paylaşım izni)")
        opener.click()
        form = _fb_form(page)
        _foto_yukle(page, form, img)
        _yaz(page, _fb_metin_kutusu(form), text)
        _bekle(page, lambda p: form.locator("img[src^='blob:'], img[src*='scontent']"), timeout=20000)
        paylas = _fb_ileri_ve_paylas(page, form, shot, go)
        if not go:
            page.keyboard.press("Escape")
            return "DRY", ""
        st["paylasildi"] = True
        paylas.click()
        kapandi = _bekle_yok(page, lambda p: p.locator("form").filter(has=p.locator("div[contenteditable='true']")),
                             timeout=45000)
        if b := _blok(page):
            page.screenshot(path=str(shot))
            return "BLOK", b
        bl = page.inner_text("body")[:8000].lower()
        if any(x in bl for x in ("onay bekl", "yönetici onayı", "onaylanmayı bekl", "pending approval",
                                 "gönderin yöneticiler tarafından")):
            page.screenshot(path=str(shot))
            return "PENDING", "yönetici onayı bekliyor"
        for _ in range(8):  # yeni gönderi feedde birkaç sn içinde görünür
            bl = page.inner_text("body")[:8000].lower()
            if re.search(r"yamansa rulman\s*\n\s*(az önce|şimdi|1 dk|just now|1m)", bl):
                page.screenshot(path=str(shot))
                return "OK", ""
            page.wait_for_timeout(1000)
        page.screenshot(path=str(shot))
        if not kapandi:
            return "FAIL", "Paylaş tıklandı ama form kapanmadı"
        return "OK", "feedde doğrulanamadı"
    except Exception:
        _ss(page, shot)
        raise
    finally:
        page.close()
