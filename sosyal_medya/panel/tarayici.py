"""Tarayıcı: kullanıcının PC'sinde kalıcı profil (kendi girişleri saklanır)."""
import os
import subprocess
import sys
import time
from contextlib import contextmanager

from yollar import KOK, PROFIL, TARAYICILAR

GOMULU = KOK / "tarayicilar"  # paketle gelen Chromium (CI'da playwright install ile doldurulur)
UA_MASAUSTU = ("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) "
               "Chrome/128.0.0.0 Safari/537.36")
GIRIS_URL = {"fb": "https://www.facebook.com/login", "ig": "https://www.instagram.com/accounts/login/"}
SITE_AD = {"fb": "Facebook", "ig": "Instagram"}
# giriş yapılmış oturumun çerezi (dil/arayüzden bağımsız)
GIRIS_CEREZ = {"fb": ("facebook.com", "c_user"), "ig": ("instagram.com", "ds_user_id")}
GIRIS_PENCERE = (600, 820)  # app-mode giriş penceresi (adres çubuğu/sekme yok)


def _chromium_var(dizin):
    return dizin.is_dir() and any(p.name.startswith("chromium") for p in dizin.iterdir())


def tarayici_dizini():
    """Önce paketle gelen Chromium, yoksa kullanıcı klasörüne indirilen."""
    return GOMULU if _chromium_var(GOMULU) else TARAYICILAR


def gomulu():
    return _chromium_var(GOMULU)


def tarayici_kurulu():
    return _chromium_var(tarayici_dizini())


os.environ["PLAYWRIGHT_BROWSERS_PATH"] = str(tarayici_dizini())


def tarayici_kur(cikti=print):
    """Chromium'u kullanıcı klasörüne indirir (paketle gelmediyse)."""
    TARAYICILAR.mkdir(exist_ok=True)
    env = dict(os.environ, PLAYWRIGHT_BROWSERS_PATH=str(TARAYICILAR))
    if getattr(sys, "frozen", False):
        from playwright._impl._driver import compute_driver_executable, get_driver_env
        cmd = [*compute_driver_executable(), "install", "chromium", "--no-shell"]
        env.update(get_driver_env())
    else:
        cmd = [sys.executable, "-m", "playwright", "install", "chromium", "--no-shell"]
    p = subprocess.Popen(cmd, stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True, env=env)
    for satir in p.stdout:
        cikti(satir.rstrip())
    ok = p.wait() == 0
    os.environ["PLAYWRIGHT_BROWSERS_PATH"] = str(tarayici_dizini())
    return ok


@contextmanager
def ac(gizli=False, uygulama_url=None, konum=None):
    """Kalıcı profille Chromium açar; `with ac() as ctx:` -> BrowserContext.

    uygulama_url verilirse Chromium "uygulama penceresi" modunda açılır: sekme, adres çubuğu ve menü yok,
    yalnızca sayfa; masaüstü uygulaması gibi görünür (giriş pencereleri için).
    """
    from playwright.sync_api import sync_playwright
    os.environ["PLAYWRIGHT_BROWSERS_PATH"] = str(tarayici_dizini())
    ortak = dict(headless=gizli, channel="chromium",  # gizli modda da tam Chromium (headless shell gerekmez)
                 locale="tr-TR", timezone_id="Europe/Istanbul", ignore_default_args=["--enable-automation"])
    args = ["--disable-blink-features=AutomationControlled"]
    if uygulama_url:
        w, h = GIRIS_PENCERE
        args += [f"--app={uygulama_url}", f"--window-size={w},{h}"]
        if konum:
            args.append(f"--window-position={konum[0]},{konum[1]}")
        ortak.update(no_viewport=True)
    else:
        args.append("--start-maximized")
        ortak.update(viewport={"width": 1366, "height": 850}, user_agent=UA_MASAUSTU if gizli else None)
    with sync_playwright() as p:
        ctx = p.chromium.launch_persistent_context(str(PROFIL), args=args, **ortak)
        try:
            yield ctx
        finally:
            try:
                ctx.close()
            except Exception:  # noqa: BLE001  pencere kullanıcı tarafından kapatılmış olabilir
                pass


def giris_kontrol(ctx):
    """-> {'fb': bool, 'ig': bool}"""
    out = {}
    page = ctx.new_page()
    try:
        page.goto("https://www.facebook.com/", wait_until="domcontentloaded")
        page.wait_for_timeout(4000)
        out["fb"] = "login" not in page.url and page.locator("[aria-label='Hesabın'], [aria-label='Your profile'], "
                                                              "[aria-label='Profilin']").count() > 0
        page.goto("https://www.instagram.com/", wait_until="domcontentloaded")
        page.wait_for_timeout(5000)
        out["ig"] = "login" not in page.url and page.locator("a[href*='/direct/'], svg[aria-label='Home'], "
                                                              "svg[aria-label='Ana Sayfa']").count() > 0
    finally:
        page.close()
    return out


def giris_cerezi_var(ctx, site):
    alan, ad = GIRIS_CEREZ[site]
    try:
        return any(c["name"] == ad and alan in c["domain"] and c.get("value") for c in ctx.cookies())
    except Exception:  # noqa: BLE001  pencere kapanmış olabilir
        return False


def giris_penceresi(siteler=("fb", "ig"), ilerleme=None, konum=None, zaman_asimi=900):
    """Kullanıcının kendisi giriş yapması için her site için sırayla bir uygulama penceresi açar.

    Giriş çerezi görüldüğünde pencere kendiliğinden kapanır ve sıradaki siteye geçilir; kullanıcı pencereyi
    kapatırsa da geçilir. ilerleme(site, durum) -> durum: 'acildi' | 'giris' | 'kapatildi' | 'zaman_asimi'.
    -> {'fb': bool, 'ig': bool} (çerezle görülen giriş)
    """
    if isinstance(siteler, str):
        siteler = (siteler,)
    bildir = ilerleme or (lambda site, durum: None)
    sonuc = {}
    for site in siteler:
        with ac(gizli=False, uygulama_url=GIRIS_URL[site], konum=konum) as ctx:
            bildir(site, "acildi")
            son = time.time() + zaman_asimi
            durum = "zaman_asimi"
            while time.time() < son:
                if not ctx.pages or all(p.is_closed() for p in ctx.pages):
                    durum = "kapatildi"
                    break
                if giris_cerezi_var(ctx, site):
                    time.sleep(4)  # giriş sonrası yönlendirme / "tarayıcıyı kaydet" adımı tamamlansın
                    durum = "giris"
                    break
                time.sleep(1.5)
            sonuc[site] = giris_cerezi_var(ctx, site)
            bildir(site, durum)
    return sonuc
