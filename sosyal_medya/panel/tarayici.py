"""Tarayıcı: kullanıcının PC'sinde kalıcı profil (kendi girişleri saklanır)."""
import os
import subprocess
import sys
from contextlib import contextmanager

from playwright.sync_api import sync_playwright

from yollar import PROFIL, TARAYICILAR

os.environ.setdefault("PLAYWRIGHT_BROWSERS_PATH", str(TARAYICILAR))
UA_MASAUSTU = ("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) "
               "Chrome/128.0.0.0 Safari/537.36")


def tarayici_kurulu():
    return TARAYICILAR.exists() and any(p.name.startswith("chromium") for p in TARAYICILAR.iterdir())


def tarayici_kur(cikti=print):
    """Chromium'u indirir (ilk kurulumda bir kez)."""
    TARAYICILAR.mkdir(exist_ok=True)
    env = dict(os.environ, PLAYWRIGHT_BROWSERS_PATH=str(TARAYICILAR))
    if getattr(sys, "frozen", False):
        from playwright._impl._driver import compute_driver_executable, get_driver_env
        cmd = [*compute_driver_executable(), "install", "chromium"]
        env.update(get_driver_env())
    else:
        cmd = [sys.executable, "-m", "playwright", "install", "chromium"]
    p = subprocess.Popen(cmd, stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True, env=env)
    for satir in p.stdout:
        cikti(satir.rstrip())
    return p.wait() == 0


@contextmanager
def ac(gizli=False):
    """Kalıcı profille Chromium açar; `with ac() as ctx:` -> BrowserContext."""
    with sync_playwright() as p:
        ctx = p.chromium.launch_persistent_context(
            str(PROFIL), headless=gizli, locale="tr-TR", timezone_id="Europe/Istanbul",
            viewport={"width": 1366, "height": 850}, user_agent=UA_MASAUSTU if gizli else None,
            args=["--disable-blink-features=AutomationControlled", "--start-maximized"],
            ignore_default_args=["--enable-automation"],
        )
        try:
            yield ctx
        finally:
            ctx.close()


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


def giris_penceresi(site):
    """Kullanıcının kendisi giriş yapması için pencere açar; pencere kapatılınca döner."""
    url = {"fb": "https://www.facebook.com/login", "ig": "https://www.instagram.com/accounts/login/"}[site]
    with ac(gizli=False) as ctx:
        page = ctx.pages[0] if ctx.pages else ctx.new_page()
        page.goto(url)
        try:
            page.wait_for_event("close", timeout=0)
        except Exception:
            pass
