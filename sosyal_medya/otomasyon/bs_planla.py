"""Meta Business Suite'e günlük FB+IG içeriklerini zamanlanmış olarak girer.

Paylaşımı Devin/panel değil Meta yapar: burada sadece "Planla" düğmesine kadar
form doldurulur. Açık bir Chrome (CDP :29229) ve aktif Business Suite oturumu gerekir.

Kullanım:
  python3 bs_planla.py --gun 8 --tarih 2026-09-22 --slot sabah --dry     # forma kadar doldur, Planla'ya basma
  python3 bs_planla.py --gun 8 --tarih 2026-09-22 --slot ana
  python3 bs_planla.py --gun 8 --tarih 2026-09-22 --slot story
  python3 bs_planla.py --plan plan.csv                                     # gun;tarih;slot satırları

Saatler Türkiye saatidir (09:00 sabah, 12:30 ana, 18:30 story). Business Suite
formu "mevcut saat diliminde" çalışır; fark formun varsayılan saatinden ölçülür.
"""
import argparse
import csv
import datetime as dt
import json
import re
import sys
import time
from pathlib import Path
from zoneinfo import ZoneInfo

from playwright.sync_api import sync_playwright

sys.path.insert(0, str(Path(__file__).resolve().parent))
import gunluk_metin as M  # noqa: E402

TR = ZoneInfo("Europe/Istanbul")
BUSINESS = "279493313026379"
ASSET = "108001824010799"
BASE = f"https://business.facebook.com/latest/{{}}?asset_id={ASSET}&business_id={BUSINESS}"
GORSEL = Path(__file__).resolve().parents[1] / "gonderiler"
LOG = Path(__file__).resolve().parent / "bs_planla_log.jsonl"
SAAT = {"sabah": (9, 0), "ana": (12, 30), "story": (18, 30)}
STORY_LINK = "https://www.yamansarulman.com/?utm_source=story&utm_medium=social&utm_campaign=story"
STORY_LINK_ETIKET = "yamansarulman.com"
STICKER_Y = 1600  # story görselinde çıkartma için ayrılan alanın merkezi (1080×1920)


def vis(loc):
    return [e for e in loc.all() if e.is_visible()]


def first_vis(loc, timeout=15000):
    end = time.time() + timeout / 1000
    while time.time() < end:
        v = vis(loc)
        if v:
            return v[0]
        time.sleep(0.3)
    raise TimeoutError(f"görünür öğe yok: {loc}")


def yaz(page, editor, text):
    editor.click()
    page.keyboard.press("Control+A")
    page.keyboard.press("Delete")
    for i, satir in enumerate(text.split("\n")):
        if i:
            page.keyboard.press("Enter")
        if satir:
            page.keyboard.insert_text(satir)
    page.wait_for_timeout(300)


def ui_offset(page):
    """Business Suite formu tarayıcının saat diliminde çalışır (yayınlanan gönderilerin
    created_at epoch'u ile listedeki saat karşılaştırılarak doğrulandı). UTC farkı, dakika."""
    return -int(page.evaluate("new Date().getTimezoneOffset()"))


def hedef_ui_zaman(tarih, slot, offset_min):
    h, m = SAAT[slot]
    tr = dt.datetime(tarih.year, tarih.month, tarih.day, h, m, tzinfo=TR)
    ui = tr.astimezone(dt.timezone(dt.timedelta(minutes=offset_min)))
    return tr, ui


def tarih_saat_gir(page, ui, kac=2):
    """Görünür tarih/saat alanlarını (FB ve IG) doldurur."""
    tarihler = vis(page.locator("input[placeholder='gg.aa.yyyy']"))[:kac]
    for t in tarihler:
        t.click()
        page.keyboard.press("Control+A")
        page.keyboard.type(ui.strftime("%d.%m.%Y"))
        page.keyboard.press("Enter")
        page.wait_for_timeout(600)
        page.keyboard.press("Escape")
        page.wait_for_timeout(300)
        if vis(page.get_by_text(re.compile(r"^(Pzt|Mon)$"))):  # takvim açık kaldıysa boş yere tıkla
            first_vis(page.get_by_text(re.compile("hedef kitlenin en aktif"))).click()
            page.wait_for_timeout(400)
    saatler = [e for e in vis(page.locator("input")) if e.get_attribute("aria-label") == "saat"][:kac]
    dakikalar = [e for e in vis(page.locator("input")) if e.get_attribute("aria-label") == "dakika"][:kac]
    for s in saatler:
        s.click()
        page.keyboard.press("Control+A")
        page.keyboard.type(f"{ui.hour:02d}")
        page.keyboard.press("Tab")
    for d in dakikalar:
        d.click()
        page.keyboard.press("Control+A")
        page.keyboard.type(f"{ui.minute:02d}")
        page.keyboard.press("Tab")
    page.wait_for_timeout(500)
    okunan = [t.input_value() for t in vis(page.locator("input[placeholder='gg.aa.yyyy']"))[:kac]]
    okunan_s = [f"{h}:{m}" for h, m in re.findall(r"Zaman Girişi\s*\S*\s*(\d{1,2})\s*:\s*(\d{2})", page.inner_text("body"))][:kac]
    return okunan, okunan_s


def onayla_ve_yakala(page, dugme_adi, dry):
    """Planla'ya basar; giden isteklerde scheduled_publish_time / epoch arar."""
    yakalanan = []

    def on_req(req):
        if req.method != "POST":
            return
        try:
            body = req.post_data or ""
        except Exception:
            return
        if "schedul" in body.lower() or "publish_time" in body.lower():
            yakalanan.append(body[:4000])

    if dry:
        return None
    page.on("request", on_req)
    btn = vis(page.get_by_role("button", name=dugme_adi))[-1]  # alt çubuktaki ana düğme
    if not btn.is_enabled():
        raise RuntimeError(f"{dugme_adi} düğmesi pasif")
    btn.click()
    page.wait_for_timeout(9000)
    page.remove_listener("request", on_req)
    epochs = []
    for b in yakalanan:
        epochs += re.findall(r'(?:scheduled_publish_time|publish_time|scheduledPublishTime|scheduled_time)\\?"?[=:]\\?"?(\d{10})', b)
    return epochs


def planlanan_epochs(page, ay_sayisi=3):
    """Planlayıcı takvimini (ay görünümü, bu ay + sonraki aylar) yükler; gönderi ve
    hikaye kayıtlarının publish_time epoch'larını (UTC) döndürür."""
    bulunan = set()

    def on_resp(r):
        if r.request.method != "POST":
            return
        try:
            b = r.text()
        except Exception:  # noqa: BLE001
            return
        bulunan.update(int(x) for x in re.findall(r'"publish_time":\s*"?(\d{10})', b))

    page.on("response", on_resp)
    page.goto(BASE.format("content_calendar"), wait_until="domcontentloaded")
    page.wait_for_timeout(8000)
    first_vis(page.get_by_role("button", name="Ay")).click()
    page.wait_for_timeout(5000)
    for _ in range(ay_sayisi - 1):
        ileri = [x for x in vis(page.get_by_role("button")) if x.inner_text().strip() == "Right"]
        if not ileri:
            break
        ileri[0].click()
        page.wait_for_timeout(6000)
    page.remove_listener("response", on_resp)
    return sorted(bulunan)


def gonderi_planla(page, gun, slot, tarih, dry):
    d = M.sabah(gun) if slot == "sabah" else M.ana(gun)
    page.goto(BASE.format("composer"), wait_until="domcontentloaded")
    first_vis(page.get_by_text("Fotoğraf/video ekle"), 30000)
    page.wait_for_timeout(1500)
    with page.expect_file_chooser(timeout=20000) as fc:
        first_vis(page.get_by_text("Fotoğraf/video ekle")).click()
    fc.value.set_files(str(GORSEL / d["img"]))
    first_vis(page.get_by_text("1080 x"), 40000)
    page.wait_for_timeout(1500)

    sw = first_vis(page.get_by_role("switch", name="Gönderiyi Facebook ve"))
    if sw.get_attribute("aria-checked") != "true":
        sw.click()
        page.wait_for_timeout(1500)
    # Facebook metni
    for t in vis(page.get_by_role("tab")):
        if t.inner_text().strip() == "Facebook":
            t.click()
    page.wait_for_timeout(800)
    yaz(page, first_vis(page.locator("[contenteditable='true']")), d["fb"])
    # Instagram metni
    for t in vis(page.get_by_role("tab")):
        if t.inner_text().strip() == "Instagram":
            t.click()
    page.wait_for_timeout(800)
    yaz(page, first_vis(page.locator("[contenteditable='true']")), d["ig"])

    sw = first_vis(page.get_by_role("switch", name="Tarih ve saat ayarla"))
    if sw.get_attribute("aria-checked") != "true":
        sw.click()
        page.wait_for_timeout(2000)
    off = ui_offset(page)
    tr, ui = hedef_ui_zaman(tarih, slot, off)
    okunan = tarih_saat_gir(page, ui, kac=2)
    page.screenshot(path=f"/home/ubuntu/bs_form_{slot}_{gun:02d}.png")
    epochs = onayla_ve_yakala(page, "Planla", dry)
    return dict(slot=slot, gun=gun, tr=tr.isoformat(), ui=ui.strftime("%d.%m.%Y %H:%M"), offset=off, form=okunan, epochs=epochs, dry=dry)


def story_planla(page, gun, tarih, dry):
    d = M.story(gun)
    page.goto(BASE.format("story_composer"), wait_until="domcontentloaded")
    first_vis(page.get_by_text("Fotoğraf/video ekle"), 30000)
    page.wait_for_timeout(1500)
    with page.expect_file_chooser(timeout=20000) as fc:
        first_vis(page.get_by_text("Fotoğraf/video ekle")).click()
    fc.value.set_files(str(GORSEL / d["img"]))
    duzenle = []
    son = time.time() + 60
    while not duzenle and time.time() < son:
        duzenle = [b for b in vis(page.get_by_role("button", name="Düzenle")) if b.bounding_box()["x"] > 250]
        page.wait_for_timeout(500)
    if not duzenle:
        raise RuntimeError("medya yüklenmedi (Düzenle yok)")
    page.wait_for_timeout(1500)

    # Bağlantı çıkartması: Düzenle -> Daha fazla çıkartma -> Bağlantı
    duzenle[0].click()
    page.wait_for_timeout(2500)
    first_vis(page.get_by_role("button", name="Daha fazla çıkartma"), 15000).click()
    page.wait_for_timeout(1500)
    first_vis(page.get_by_text("Bağlantı", exact=True), 15000).click()
    first_vis(page.get_by_text("Bağlantı çıkartması ekle"), 15000)
    page.wait_for_timeout(800)
    url_in = vis(page.locator("input[type=text]"))
    if len(url_in) < 2:
        raise RuntimeError("bağlantı çıkartması alanları bulunamadı")
    url_in[0].click()
    page.keyboard.insert_text(d["link"])
    url_in[1].click()
    page.keyboard.insert_text(STORY_LINK_ETIKET)
    page.wait_for_timeout(800)
    uygula = [b for b in vis(page.get_by_role("button", name="Uygula")) if b.is_enabled()]
    uygula[-1].click()  # diyalogdaki Uygula
    page.wait_for_timeout(2000)
    # çıkartmayı görseldeki ayrılmış alana (y≈STICKER_Y/1920) sürükle
    onizleme = [e for e in vis(page.locator("img")) if (e.bounding_box() or {}).get("height", 0) > 400 and (e.bounding_box() or {}).get("x", 0) > 800]
    st = first_vis(page.get_by_text(STORY_LINK_ETIKET))
    ib, sb = onizleme[-1].bounding_box(), st.bounding_box()
    sx, sy = sb["x"] + sb["width"] / 2, sb["y"] + sb["height"] / 2
    tx, ty = ib["x"] + ib["width"] / 2, ib["y"] + ib["height"] * STICKER_Y / 1920
    page.mouse.move(sx, sy)
    page.mouse.down()
    page.mouse.move(sx + (tx - sx) / 2, sy + (ty - sy) / 2, steps=10)
    page.mouse.move(tx, ty, steps=10)
    page.mouse.up()
    page.wait_for_timeout(1000)
    sb2 = first_vis(page.get_by_text(STORY_LINK_ETIKET)).bounding_box()
    cikartma_y = round((sb2["y"] + sb2["height"] / 2 - ib["y"]) / ib["height"] * 1920)
    page.screenshot(path=f"/home/ubuntu/bs_story_link_{gun:02d}.png")
    if abs(cikartma_y - STICKER_Y) > 60:
        raise RuntimeError(f"çıkartma yerleşmedi: y={cikartma_y}")
    # editörden çık (dış Uygula)
    first_vis(page.get_by_role("button", name="Uygula")).click()
    page.wait_for_timeout(2500)

    # "Şimdi paylaş | Planla" seçimi (sol panel; alttaki ana düğme değil)
    secim = [b for b in vis(page.get_by_role("button", name="Planla")) if b.bounding_box()["x"] < 840]
    secim[0].click()
    page.wait_for_timeout(2000)
    off = ui_offset(page)
    tr, ui = hedef_ui_zaman(tarih, "story", off)
    okunan = tarih_saat_gir(page, ui, kac=2)
    page.screenshot(path=f"/home/ubuntu/bs_form_story_{gun:02d}.png")
    epochs = onayla_ve_yakala(page, "Planla", dry)
    return dict(slot="story", gun=gun, tr=tr.isoformat(), ui=ui.strftime("%d.%m.%Y %H:%M"), offset=off, form=okunan, epochs=epochs, dry=dry)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--gun", type=int)
    ap.add_argument("--tarih")
    ap.add_argument("--slot", choices=list(SAAT))
    ap.add_argument("--plan")
    ap.add_argument("--dry", action="store_true")
    ap.add_argument("--dogrula", action="store_true", help="planlama yapma; logdaki kayıtları takvimle karşılaştır")
    a = ap.parse_args()
    isler = []
    if a.plan:
        with open(a.plan, encoding="utf-8") as f:
            for r in csv.reader(f, delimiter=";"):
                if r and r[0].isdigit():
                    isler.append((int(r[0]), dt.date.fromisoformat(r[1]), r[2]))
    elif not a.dogrula:
        isler.append((a.gun, dt.date.fromisoformat(a.tarih), a.slot))

    with sync_playwright() as p:
        b = p.chromium.connect_over_cdp("http://localhost:29229")
        ctx = b.contexts[0]
        page = ctx.new_page()
        page.set_viewport_size({"width": 1400, "height": 1000})
        if a.dogrula:
            dogrula(page)
            page.close()
            return
        sonuclar = []
        for gun, tarih, slot in isler:
            try:
                if slot == "story":
                    r = story_planla(page, gun, tarih, a.dry)
                else:
                    r = gonderi_planla(page, gun, slot, tarih, a.dry)
            except Exception as e:  # noqa: BLE001
                try:
                    page.screenshot(path=f"/home/ubuntu/bs_hata_{slot}_{gun:02d}.png", timeout=5000)
                except Exception:  # noqa: BLE001
                    pass
                r = dict(slot=slot, gun=gun, tarih=str(tarih), hata=repr(e)[:500], dry=a.dry)
                try:
                    page.close()
                except Exception:  # noqa: BLE001
                    pass
                page = ctx.new_page()
                page.set_viewport_size({"width": 1400, "height": 1000})
            r["tarih"] = str(tarih)
            sonuclar.append(r)
            print(json.dumps(r, ensure_ascii=False), flush=True)
            with open(LOG, "a", encoding="utf-8") as f:
                f.write(json.dumps(r, ensure_ascii=False) + "\n")
        if not a.dry:
            epochs = set(planlanan_epochs(page))
            eksik = [r for r in sonuclar if "hata" in r or int(dt.datetime.fromisoformat(r["tr"]).timestamp()) not in epochs]
            print(json.dumps(dict(ozet=True, girilen=len(sonuclar), takvimde=len(sonuclar) - len(eksik),
                                  eksik=[(r["gun"], r["slot"]) for r in eksik]), ensure_ascii=False), flush=True)
            page.close()


def dogrula(page):
    """Logdaki gerçek (dry olmayan, hatasız) kayıtları Planlayıcı takvimiyle karşılaştırır."""
    kayitlar = [json.loads(s) for s in LOG.read_text(encoding="utf-8").splitlines() if s.strip()]
    kayitlar = [k for k in kayitlar if not k.get("dry") and "hata" not in k and not k.get("ozet") and not k.get("iptal")]
    epochs = set(planlanan_epochs(page))
    for k in kayitlar:
        k["takvimde"] = int(dt.datetime.fromisoformat(k["tr"]).timestamp()) in epochs
        print(k["tarih"], k["slot"], "gun", k["gun"], "OK" if k["takvimde"] else "EKSIK")
    print("toplam", len(kayitlar), "takvimde", sum(k["takvimde"] for k in kayitlar))


if __name__ == "__main__":
    main()
