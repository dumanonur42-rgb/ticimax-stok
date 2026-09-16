"""Tarayıcı: kullanıcının PC'sinde kalıcı profil (kendi girişleri saklanır)."""
import os
import subprocess
import sys
from contextlib import contextmanager

from playwright.sync_api import sync_playwright

from yollar import KOK, PROFIL, TARAYICILAR

GOMULU = KOK / "tarayicilar"  # paketle gelen Chromium (CI'da playwright install ile doldurulur)
UA_MASAUSTU = ("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) "
               "Chrome/128.0.0.0 Safari/537.36")
GIRIS_URL = {"fb": "https://www.facebook.com/login", "ig": "https://www.instagram.com/accounts/login/"}


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
def ac(gizli=False):
    """Kalıcı profille Chromium açar; `with ac() as ctx:` -> BrowserContext."""
    os.environ["PLAYWRIGHT_BROWSERS_PATH"] = str(tarayici_dizini())
    with sync_playwright() as p:
        ctx = p.chromium.launch_persistent_context(
            str(PROFIL), headless=gizli, channel="chromium",  # gizli modda da tam Chromium (headless shell gerekmez)
            locale="tr-TR", timezone_id="Europe/Istanbul",
            viewport={"width": 1366, "height": 850}, user_agent=UA_MASAUSTU if gizli else None,
            args=["--disable-blink-features=AutomationControlled", "--start-maximized"],
            ignore_default_args=["--enable-automation"],
        )
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


def giris_penceresi(siteler=("fb", "ig")):
    """Kullanıcının kendisi giriş yapması için pencere açar (her site bir sekme); pencere kapatılınca döner."""
    if isinstance(siteler, str):
        siteler = (siteler,)
    with ac(gizli=False) as ctx:
        sayfalar = []
        for i, site in enumerate(siteler):
            page = ctx.pages[0] if i == 0 and ctx.pages else ctx.new_page()
            try:
                page.goto(GIRIS_URL[site], wait_until="domcontentloaded")
            except Exception:  # noqa: BLE001  internet yoksa sekme yine açık kalsın
                pass
            sayfalar.append(page)
        if sayfalar:
            sayfalar[0].bring_to_front()
        try:
            ctx.wait_for_event("close", timeout=0)
        except Exception:
            pass
