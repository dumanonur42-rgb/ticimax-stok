"""Yamansa PC senkronu: Rulman Dunyasi + Madte fiyat/stok/min adet -> GitHub XML.
Kullanici PC'sinde arka planda calisir. Tedarikci maliyet fiyatlari GitHub'a ASLA yuklenmez."""
import base64, ctypes, datetime, gzip, html, io, json, math, os, re, sys, time, traceback, urllib.request
import xml.etree.ElementTree as ET
from xml.sax.saxutils import escape

KOD = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, KOD)
import cdp  # noqa: E402

ANA = os.environ.get("SENKRON_KLASOR") or os.path.dirname(KOD)
PROFIL = os.path.join(ANA, "profil")
REPO = "dumanonur42-rgb/ticimax-stok"
DAL = "pc-senkron"
RD = "https://b4b.rulman.com.tr"
MD = "https://b2b.madte.com.tr"
MADTE_KOK = ['22', '25', '28', '34', '141', '329', '343', '368', '385', '420', '423', '439', '539', '547',
             '567', '599', '650', '652', '762']
ESIK = 0.90
LOG = []
CANLI = {"adimlar": {"madte": {"ad": "Madte", "durum": "bekliyor", "yuzde": 0, "metin": "Sırada"},
                     "rd": {"ad": "Rulman Dünyası", "durum": "bekliyor", "yuzde": 0, "metin": "Sırada"}},
         "bitti": False, "ozet": "", "pid": os.getpid()}


def ekran(adim=None, **k):
    """Bilgi ekraninin okudugu canli durum dosyasini yazar."""
    if adim: CANLI["adimlar"][adim].update(k)
    else: CANLI.update(k)
    CANLI["zaman"] = time.time()
    try:
        y = os.path.join(ANA, "canli.json")
        with open(y + ".tmp", "w", encoding="utf-8") as f: json.dump(CANLI, f, ensure_ascii=False)
        os.replace(y + ".tmp", y)
    except OSError:
        pass


def sayi(n):
    return f"{int(n):,}".replace(",", ".")


def onceki(ad, varsayilan):
    try:
        with open(os.path.join(ANA, "onceki.json")) as f: return json.load(f).get(ad) or varsayilan
    except (OSError, ValueError):
        return varsayilan


def onceki_yaz(ad, deger):
    y = os.path.join(ANA, "onceki.json")
    try:
        with open(y) as f: d = json.load(f)
    except (OSError, ValueError):
        d = {}
    d[ad] = deger
    try:
        with open(y, "w") as f: json.dump(d, f)
    except OSError:
        pass


def log(*a):
    s = time.strftime("%H:%M:%S ") + " ".join(str(x) for x in a)
    LOG.append(s)
    try:
        with open(os.path.join(ANA, "senkron.log"), "a", encoding="utf-8") as f:
            f.write(time.strftime("%Y-%m-%d ") + s + "\n")
    except OSError:
        pass


# ---------- Windows DPAPI (sadece bu Windows kullanicisi acabilir) ----------
class _BLOB(ctypes.Structure):
    _fields_ = [("cbData", ctypes.c_uint32), ("pbData", ctypes.POINTER(ctypes.c_char))]


def _dpapi(veri, coz):
    buf = ctypes.create_string_buffer(veri, len(veri))
    i = _BLOB(len(veri), ctypes.cast(buf, ctypes.POINTER(ctypes.c_char))); o = _BLOB()
    f = ctypes.windll.crypt32.CryptUnprotectData if coz else ctypes.windll.crypt32.CryptProtectData
    if not f(ctypes.byref(i), None, None, None, None, 0, ctypes.byref(o)):
        raise RuntimeError("DPAPI hatasi")
    r = ctypes.string_at(o.pbData, o.cbData); ctypes.windll.kernel32.LocalFree(o.pbData)
    return r


def gizli_oku(ad):
    p = os.path.join(ANA, ad)
    if not os.path.exists(p):
        return None
    with open(p, "rb") as f:
        return _dpapi(f.read(), True)


def gizli_yaz(ad, veri):
    with open(os.path.join(ANA, ad), "wb") as f:
        f.write(_dpapi(veri, False))


def token():
    if os.environ.get("SENKRON_TOKEN"):
        return os.environ["SENKRON_TOKEN"]
    with open(os.path.join(ANA, "token.dat"), encoding="ascii") as f:  # PowerShell ConvertFrom-SecureString
        return _dpapi(bytes.fromhex(f.read().strip()), True).decode("utf-16-le")


# ---------- GitHub ----------
def gh(metod, yol, veri=None):
    req = urllib.request.Request(f"https://api.github.com/repos/{REPO}{yol}", method=metod,
                                 data=json.dumps(veri).encode() if veri is not None else None,
                                 headers={"Authorization": "Bearer " + token(), "User-Agent": "yamansa-pc",
                                          "Accept": "application/vnd.github+json"})
    with urllib.request.urlopen(req, timeout=600) as r:
        return json.loads(r.read() or b"{}")


def gh_oku(dal, yol):
    req = urllib.request.Request(f"https://api.github.com/repos/{REPO}/contents/{yol}?ref={dal}",
                                 headers={"Authorization": "Bearer " + token(), "User-Agent": "yamansa-pc",
                                          "Accept": "application/vnd.github.raw"})
    with urllib.request.urlopen(req, timeout=600) as r:
        return r.read()


def gh_yaz(dal, yol, icerik, mesaj):
    sha = None
    for _ in range(3):
        try:
            sha = gh("GET", f"/contents/{yol}?ref={dal}").get("sha")
        except urllib.error.HTTPError as e:
            if e.code != 404: raise
        try:
            v = {"message": mesaj, "branch": dal, "content": base64.b64encode(icerik).decode()}
            if sha: v["sha"] = sha
            gh("PUT", f"/contents/{yol}", v); return
        except urllib.error.HTTPError as e:
            if e.code not in (409, 422): raise
            time.sleep(5)
    raise RuntimeError(f"GitHub'a yazilamadi: {yol}")


# ---------- yardimci ----------
def num(s):
    s = (s or "").split("&")[0].strip()
    if not re.search(r"\d", s): return None
    return float(s.replace(".", "").replace(",", "."))


def para(p):
    return f"{p:.2f}"


def tarayici_ac():
    t = cdp.Tarayici(PROFIL)
    s = t.sayfa()
    s.komut("Network.enable")
    try:
        c = gizli_oku("cerez.dat")
        if c: s.komut("Network.setCookies", cookies=json.loads(c))
    except Exception as e:  # noqa: BLE001
        log("cerez yuklenemedi", e)
    return t, s


def cerez_kaydet(s):
    try:
        c = s.komut("Network.getAllCookies")["cookies"]
        c = [{k: x[k] for k in ("name", "value", "domain", "path", "secure", "httpOnly", "expires", "sameSite") if k in x}
             for x in c if "rulman.com.tr" in x["domain"] or "madte.com.tr" in x["domain"]]
        for x in c:
            if x.get("expires", -1) <= 0: x.pop("expires", None)
        gizli_yaz("cerez.dat", json.dumps(c).encode())
    except Exception as e:  # noqa: BLE001
        log("cerez kaydedilemedi", e)


# ---------- Rulman Dunyasi ----------
RD_ARAMA = {"manufacturer": None, "vehicleBrand": None, "vehicleModel": None, "productGroup1": None,
            "productGroup2": None, "productGroup3": None, "t9Text": "", "campaign": False, "newArrival": False,
            "newProduct": False, "comparsionProduct": False, "onQuantity": False, "onWay": False, "image": False}
RD_JS = """(async (B) => {
 const bek = ms => new Promise(z => setTimeout(z, ms));
 const post = async (yol, veri) => { for (let t = 0; t < 5; t++) { try {
   const r = await fetch(yol, {method: 'POST', credentials: 'include', body: JSON.stringify(veri),
     headers: {'Content-Type': 'application/json;charset=utf-8', 'X-Requested-With': 'XMLHttpRequest'}});
   if (r.ok) return await r.json(); } catch (e) {} await bek(5000 * (t + 1)); } return null; };
 if (B === null) return await post('/Search/GetManufaturerList', {});
 const out = []; let n = 0;
 while (n < 30000) { const d = await post('/Search/SearchProduct', Object.assign({}, B, {dataCount: n}));
   if (d === null) return {hata: 'cevap yok', n: n};
   if (!d.length) break;
   for (const x of d) out.push([x.Id, x.Code, (x.Campaign || {}).Type || 0, x.CampaignPriceCustomerStr,
     (x.PriceNetCustomer || {}).ValueFinal || 0, x.TotalQuantity || 0, x.MinOrder || 1, x.Manufacturer]);
   n += d.length; await bek(300); }
 return {urunler: out, n: n}; })(%s)"""


def rd_cek(s):
    s.git(RD + "/Search", 5)
    m = s.js(RD_JS % "null", 120)
    if not isinstance(m, list) or len(m) < 2:
        raise GirisYok("Rulman Dunyasi girisi yok")
    urunler = {}
    toplam = sum(int(x.get("RecordCount") or 0) for x in m[1:]) or onceki("rd_toplam", 54000); n = 0
    ekran("rd", durum="calisiyor", yuzde=1, metin=f"Giriş tamam. Toplam {sayi(toplam)} ürün çekilecek.")
    for i, x in enumerate(m[1:], 1):
        ekran("rd", metin=f"{sayi(n)} / {sayi(toplam)} ürün çekildi · şimdi: {x['Name']} ({i}/{len(m) - 1} marka)")
        r = s.js(RD_JS % json.dumps(dict(RD_ARAMA, manufacturer=x["Name"])), 1800)
        if not r or r.get("hata"):
            raise RuntimeError(f"RD {x['Name']} markasi cekilemedi (baglanti koptu)")
        for u in r["urunler"]:
            urunler[str(u[0])] = u
        n += r["n"]
        ekran("rd", yuzde=min(90, int(90 * n / max(toplam, 1))),
              metin=f"{sayi(n)} / {sayi(toplam)} ürün çekildi · son: {x['Name']}")
        log("RD", x["Name"], x.get("RecordCount"), r["n"])
    onceki_yaz("rd_toplam", n)
    return urunler


def rd_vadeli(u):
    if u[2]:
        v = num(u[3])
        if v: return v
    return u[4] or 0


def rd_hesap(u):
    v = rd_vadeli(u)
    if not v or v <= 0: return None
    sat = round(v * (2.0 if v <= 1000 else 1.5), 2)
    mo = max(1, int(u[6] or 1)); q = 1
    while q * sat <= mo * v: q += 1
    return sat, max(0, int(u[5] or 0)), q


def rd_xml(site, urunler):
    e = lambda x: escape(str(x if x is not None else ""))
    L = ['<?xml version="1.0" encoding="UTF-8"?>', "<Urunler>"]; say = {"eslesen": 0, "kayip": 0, "fiyatsiz": 0}
    for rid, (kod, ad, marka, kat, desi) in site.items():
        u = urunler.get(rid)
        if not u: say["kayip"] += 1; continue
        h = rd_hesap(u)
        if not h: say["fiyatsiz"] += 1; continue
        sat, stok, mn = h; say["eslesen"] += 1
        L += ["  <Urun>", f"    <UrunKartiID>RD{rid}</UrunKartiID>", f"    <UrunAdi>{e(ad)}</UrunAdi>"]
        L += [f"    <{t}>{mn}</{t}>" for t in ("MinSiparisAdedi", "UrunAdediMinimumDeger", "UrunAdediVarsayilanDeger", "UyeAlisMin", "BayiAlisMin")]
        L += [f"    <Marka>{e(marka)}</Marka>", "    <Tedarikci>RULMANDUNYASI</Tedarikci>",
              f"    <KategoriYolu>{e(kat)}</KategoriYolu>", f"    <Kategori>{e(kat.split('>')[-1].strip())}</Kategori>",
              f"    <Desi>{e(desi)}</Desi>", "    <UrunSecenek>", "      <Secenek>",
              f"        <VaryasyonID>RD{rid}</VaryasyonID>", f"        <StokKodu>{e(kod)}</StokKodu>",
              f"        <Barkod>{e(kod)}</Barkod>", f"        <StokAdedi>{stok}</StokAdedi>"]
        L += [f"        <{t}>{para(sat)}</{t}>" for t in ("SatisFiyati", "IndirimliFiyat", "IndirimliFiyatTL")]
        L += ["        <KDVDahil>false</KDVDahil>", "        <KdvOrani>20</KdvOrani>", "        <ParaBirimi>TL</ParaBirimi>",
              "        <ParaBirimiKodu>TRY</ParaBirimiKodu>", f"        <FiyatTL>{para(sat)}</FiyatTL>",
              "      </Secenek>", "    </UrunSecenek>", "  </Urun>"]
    L.append("</Urunler>")
    kodlar = {v[0].strip().upper() for v in site.values()}
    say["yeni"] = sorted({u[1] for k, u in urunler.items() if k not in site and (u[7] or "").upper() != "ORS"
                          and u[1].strip().upper() not in kodlar and rd_vadeli(u) > 0})
    return "\n".join(L) + "\n", say


# ---------- Madte ----------
def madte_parse(txt):
    res = []
    for blk in re.split(r'class="prbx-item\s+prbx-list-item"', txt)[1:]:
        g = lambda lab: (re.search(r'prbx-text[^>]*>\s*' + lab + r'\s*</span>\s*<span class="ayirici">\s*:\s*</span>\s*<span class="prbx-value[^"]*">(.*?)</span>', blk, re.S) or [None, None])[1]
        m = re.search(r'href="/Stok/StokDetay/(\d+)"', blk)
        t2 = re.sub(r'(\|\s*)+', '|', html.unescape(re.sub(r'<[^>]+>', '|', blk)))
        tiers = re.findall(r'\|\s*([\d.]+)\s*(?:-\s*([\d.]+)|Üzeri)\s*\|\s*%[\d,]+\s*\|\s*Net Fiyat:\s*\|\s*([\d.,]+)\s*TL', t2)
        res.append(dict(id=m and m.group(1), kod=g('Stok Kodu'), liste=g('Liste Fiyatı'), net=g('Net Fiyat'),
                        ist=g('İstanbul Stok'), konya=g('Konya Stok'), minsip=g('Min Sip Miktar'), carpan=g('Çarpan'),
                        qty=(re.search(r'name="quantity"[^>]*min="(\d+)"', blk) or [None, None])[1], tiers=tiers))
    return res


MD_JS = """(async (u) => { for (let t = 0; t < 4; t++) { try {
  const r = await fetch(u, {credentials: 'include', headers: {'X-Requested-With': 'XMLHttpRequest'}});
  if (r.ok) return {url: r.url, text: await r.text()}; } catch (e) {}
  await new Promise(z => setTimeout(z, 8000 * (t + 1))); } return null; })(%s)"""


def madte_girisli(s):
    s.git(MD + "/", 5)
    u = (s.js("location.href") or "").lower()
    return "giris" not in u and "login" not in u


def chrome_madte_linkleri():
    """Madte masaustu uygulamasinin Chrome'a actirdigi hizli giris adresleri (en yeni once)."""
    import shutil, sqlite3, tempfile
    h = os.path.expandvars(r"%LOCALAPPDATA%\Google\Chrome\User Data\Default\History")
    t = os.path.join(tempfile.gettempdir(), "ys_md_gecmis.db")
    try:
        shutil.copyfile(h, t)
        db = sqlite3.connect(t)
        r = [x[0] for x in db.execute("select url from urls where url like '%b2b.madte.com.tr/login/HizliGiris/%'"
                                      " order by last_visit_time desc limit 3")]
        db.close(); return r
    except Exception as e:  # noqa: BLE001
        log("Chrome gecmisi okunamadi", e); return []
    finally:
        try: os.remove(t)
        except OSError: pass


def madte_cek(s):
    if not madte_girisli(s):
        eski = gizli_oku("madte_link.dat")
        for link in ([eski.decode()] if eski else []) + chrome_madte_linkleri():
            s.git(link, 6)
            if madte_girisli(s):
                gizli_yaz("madte_link.dat", link.encode()); break
        else:
            raise GirisYok("Madte girisi yok")
    urunler = {}
    toplam = onceki("madte_toplam", 23000)
    ekran("madte", durum="calisiyor", yuzde=1, metin=f"Giriş tamam. Yaklaşık {sayi(toplam)} ürün çekilecek.")
    for kok in MADTE_KOK:
        p = 0
        while True:
            r = s.js(MD_JS % json.dumps(f"/Arama/_Prbx?page={p}&Cat={kok}&_StokBoxCount=250&Paging=true"), 600)
            if r is None: raise RuntimeError(f"Madte {kok}/{p} cekilemedi")
            if "Giris" in r["url"]: raise GirisYok("Madte girisi yok")
            tot = re.findall(r"ManuelPage\('\d+', '(\d+)'", r["text"]); tot = int(tot[0]) if tot else 0
            its = madte_parse(r["text"])
            for it in its:
                if it["id"]: urunler[it["id"]] = it
            p += 1
            ekran("madte", yuzde=min(90, int(90 * len(urunler) / max(toplam, 1))),
                  metin=f"{sayi(len(urunler))} / {sayi(toplam)} ürün çekildi")
            if not its or p * 250 >= tot: break
            time.sleep(1.5)
        log("Madte", kok, p, len(urunler))
    onceki_yaz("madte_toplam", len(urunler))
    return urunler


def kur():
    yol = os.path.join(ANA, "kur.json")
    try:
        with urllib.request.urlopen("https://www.tcmb.gov.tr/kurlar/today.xml", timeout=30) as r:
            x = ET.fromstring(r.read())
        k = {c.get("Kod"): float(c.find("ForexSelling").text) for c in x.findall("Currency") if c.get("Kod") in ("USD", "EUR")}
        assert k["USD"] > 1 and k["EUR"] > 1
        with open(yol, "w") as f: json.dump(k, f)
        return k
    except Exception as e:  # noqa: BLE001
        log("TCMB kuru alinamadi, onceki kur:", e)
        with open(yol) as f: return json.load(f)


def madte_fiyat(liste, K):
    m = re.match(r"\s*([\d.,]+)\s*(USD|EUR|TL|\$|€)", liste or "")
    if not m: return None
    v = float(m[1].replace(".", "").replace(",", ".")); c = {"$": "USD", "€": "EUR"}.get(m[2], m[2])
    if v <= 0: return None
    tl = v * (1 if c == "TL" else K[c]); return round(tl * (3 if tl <= 100 else 2), 2)


def madte_stok(x):
    x = (x or "").strip()
    if not x or x == "Tükendi": return 0
    return max(0, int(float(x.replace(".", "").replace(",", "."))))


def madte_min(P, x):
    if x.get("tiers"):
        M = int(num(x.get("qty")) or num(x["tiers"][0][0])); K = 1; C = num(x["tiers"][0][2])
    elif x.get("net") and x.get("minsip"):
        M = max(1, math.ceil(num(x["minsip"]))); K = max(1, math.ceil(num(x.get("carpan") or "1") or 1)); C = num(x["net"].split()[0])
    else:
        return None
    if not C: return None
    buy = lambda m: max(M, math.ceil(m / K) * K)
    ok = lambda m: m * P > buy(m) * C + 1e-9
    for n in range(1, 100000):
        if all(ok(m) for m in range(n, n + 2 * max(M, K) + 1)): return n
    return None


def deger(b, t):
    m = re.search(rf"<{t}>([^<]*)</{t}>", b)
    return m.group(1) if m else None


def madte_guncelle(eski_xml, urunler, K):
    say = {"eslesen": 0, "kayip": 0, "fiyatsiz": 0, "degisen": 0, "fiyat": 0, "stok": 0, "min": 0}

    def tag(b, t, v):
        return re.sub(rf"<{t}>[^<]*</{t}>", f"<{t}>{v}</{t}>", b)

    def bir(m):
        b = m.group(0); i = re.search(r"<UrunKartiID>MD(\d+)</UrunKartiID>", b)
        x = urunler.get(i.group(1)) if i else None
        if not x: say["kayip"] += 1; return b
        P = madte_fiyat(x.get("liste"), K)
        if not P: say["fiyatsiz"] += 1; return b
        say["eslesen"] += 1; y = b
        for t in ("SatisFiyati", "IndirimliFiyat", "IndirimliFiyatTL", "FiyatTL"): y = tag(y, t, para(P))
        y = tag(y, "StokAdedi", madte_stok(x.get("ist")) + madte_stok(x.get("konya")))
        mn = madte_min(P, x)
        if mn:
            for t in ("MinSiparisAdedi", "UrunAdediMinimumDeger", "UrunAdediVarsayilanDeger", "UyeAlisMin", "BayiAlisMin"):
                y = tag(y, t, mn)
        say["degisen"] += y != b
        for a, t in (("fiyat", "SatisFiyati"), ("stok", "StokAdedi"), ("min", "MinSiparisAdedi")):
            say[a] += deger(b, t) != deger(y, t)
        return y
    yeni = re.sub(r"  <Urun>.*?</Urun>", bir, eski_xml, flags=re.S)
    return yeni, say


class GirisYok(Exception):
    pass


# ---------- ana akis ----------
def kilit_canli(p):
    """Kilidi birakan program hala calisiyor mu (yarida kapanan calismadan kalan kilidi temizlemek icin)."""
    try:
        pid = int(open(p).read().strip() or 0)
    except (OSError, ValueError):
        return False
    if not pid: return False
    if os.name != "nt":
        try: os.kill(pid, 0); return True
        except OSError: return False
    import ctypes
    k = ctypes.windll.kernel32
    h = k.OpenProcess(0x1000, False, pid)
    if not h: return False
    kod = ctypes.c_ulong(); k.GetExitCodeProcess(h, ctypes.byref(kod)); k.CloseHandle(h)
    return kod.value == 259


def kilit():
    p = os.path.join(ANA, "calisiyor.lock")
    try:
        if os.path.exists(p) and (time.time() - os.path.getmtime(p) > 4 * 3600 or not kilit_canli(p)):
            os.remove(p)
        fd = os.open(p, os.O_CREAT | os.O_EXCL | os.O_WRONLY); os.write(fd, str(os.getpid()).encode()); os.close(fd)
        return p
    except FileExistsError:
        return None


def giris_penceresi():
    """Kullanici giris yapsin diye gorunur pencere; kapatinca biter."""
    t = cdp.Tarayici(PROFIL, gorunur=True)
    s = t.sayfa(); s.komut("Network.enable")
    s.git(RD + "/", 2)
    if not gizli_oku("madte_link.dat"):
        s.komut("Target.createTarget", url=MD + "/")
    try:
        while t.proc.poll() is None:
            time.sleep(3)
            try: cerez_kaydet(s)
            except Exception: pass
    finally:
        t.kapat()


PS_KUTU = r"""
Add-Type -AssemblyName System.Windows.Forms
[Console]::OutputEncoding = [Text.Encoding]::UTF8
$f = New-Object Windows.Forms.Form
$f.Text = 'Yamansa Senkron - Rulman Dunyasi'; $f.Width = 520; $f.Height = 300; $f.TopMost = $true
$f.StartPosition = 'CenterScreen'; $f.FormBorderStyle = 'FixedDialog'; $f.MaximizeBox = $false
$l = New-Object Windows.Forms.Label; $l.Left = 12; $l.Top = 10; $l.Width = 480; $l.Height = 60
$l.Text = $env:YS_MESAJ; $f.Controls.Add($l)
$t = New-Object Windows.Forms.TextBox; $t.Left = 12; $t.Top = 75; $t.Width = 480; $t.Height = 120
$t.Multiline = $true; $t.UseSystemPasswordChar = $false; $t.ScrollBars = 'Vertical'; $f.Controls.Add($t)
$o = New-Object Windows.Forms.Button; $o.Text = 'Guncelle'; $o.Left = 300; $o.Top = 210; $o.Width = 90
$o.DialogResult = 'OK'; $f.Controls.Add($o); $f.AcceptButton = $o
$v = New-Object Windows.Forms.Button; $v.Text = 'Vazgec'; $v.Left = 400; $v.Top = 210; $v.Width = 90
$v.DialogResult = 'Cancel'; $f.Controls.Add($v); $f.CancelButton = $v
$f.Add_Shown({ $f.Activate(); $t.Focus() })
if ($f.ShowDialog() -eq 'OK') { [Console]::Out.Write($t.Text) }
"""

PS_BILGI = r"""
Add-Type -AssemblyName System.Windows.Forms
[Windows.Forms.MessageBox]::Show($env:YS_MESAJ, 'Yamansa Senkron') | Out-Null
"""


PS_EKRAN = r"""
Add-Type -AssemblyName System.Windows.Forms, System.Drawing
Add-Type -Namespace YS -Name W -MemberDefinition '[DllImport("user32.dll")] public static extern IntPtr SendMessage(IntPtr h, int m, IntPtr w, IntPtr l);'
[Windows.Forms.Application]::EnableVisualStyles()
$dosya = $env:YS_DOSYA
$lacivert = [Drawing.Color]::FromArgb(11, 42, 74); $gri = [Drawing.Color]::FromArgb(95, 104, 115)
$yesil = [Drawing.Color]::FromArgb(22, 135, 76); $kirmizi = [Drawing.Color]::FromArgb(200, 40, 40)
$sari = [Drawing.Color]::FromArgb(196, 128, 0); $mavi = [Drawing.Color]::FromArgb(25, 103, 210)
function F($b, $s) { New-Object Drawing.Font('Segoe UI', $b, $s) }
$f = New-Object Windows.Forms.Form
$f.Text = 'Yamansa Senkron'; $f.ClientSize = New-Object Drawing.Size(560, 430); $f.BackColor = [Drawing.Color]::White
$f.StartPosition = 'CenterScreen'; $f.FormBorderStyle = 'FixedSingle'; $f.MaximizeBox = $false; $f.Font = F 10 'Regular'
$ust = New-Object Windows.Forms.Panel; $ust.SetBounds(0, 0, 560, 74); $ust.BackColor = $lacivert; $f.Controls.Add($ust)
$b1 = New-Object Windows.Forms.Label; $b1.Text = 'Yamansa Senkron'; $b1.ForeColor = [Drawing.Color]::White
$b1.Font = F 16 'Bold'; $b1.SetBounds(20, 10, 400, 32); $ust.Controls.Add($b1)
$b2 = New-Object Windows.Forms.Label; $b2.Text = 'Madte ve Rulman Dünyası fiyat / stok güncellemesi'
$b2.ForeColor = [Drawing.Color]::FromArgb(190, 205, 222); $b2.SetBounds(22, 44, 420, 20); $ust.Controls.Add($b2)
$sure = New-Object Windows.Forms.Label; $sure.ForeColor = [Drawing.Color]::FromArgb(190, 205, 222)
$sure.TextAlign = 'MiddleRight'; $sure.SetBounds(400, 44, 140, 20); $ust.Controls.Add($sure)
$genel = New-Object Windows.Forms.Label; $genel.Font = F 11 'Bold'; $genel.SetBounds(20, 86, 520, 24); $f.Controls.Add($genel)
$satir = @{}; $y = 120
foreach ($a in 'madte', 'rd') {
  $ad = New-Object Windows.Forms.Label; $ad.Font = F 11 'Bold'; $ad.ForeColor = $lacivert; $ad.SetBounds(20, $y, 300, 22)
  $dr = New-Object Windows.Forms.Label; $dr.Font = F 10 'Bold'; $dr.TextAlign = 'MiddleRight'; $dr.SetBounds(300, $y, 240, 22)
  $pb = New-Object Windows.Forms.ProgressBar; $pb.SetBounds(20, ($y + 26), 520, 18); $pb.Style = 'Continuous'
  $mt = New-Object Windows.Forms.Label; $mt.ForeColor = $gri; $mt.SetBounds(20, ($y + 48), 520, 40)
  $f.Controls.AddRange(@($ad, $dr, $pb, $mt)); $satir[$a] = @($ad, $dr, $pb, $mt); $y += 100
}
$oz = New-Object Windows.Forms.Label; $oz.SetBounds(20, 322, 520, 56); $oz.ForeColor = $lacivert; $f.Controls.Add($oz)
$not = New-Object Windows.Forms.Label; $not.ForeColor = $gri; $not.Font = F 8.5 'Regular'; $not.SetBounds(20, 392, 400, 30)
$not.Text = 'Pencereyi kapatsanız da güncelleme arka planda devam eder.'; $f.Controls.Add($not)
$k = New-Object Windows.Forms.Button; $k.Text = 'Kapat'; $k.SetBounds(440, 388, 100, 30); $k.FlatStyle = 'Flat'
$k.BackColor = $lacivert; $k.ForeColor = [Drawing.Color]::White; $k.Add_Click({ $f.Close() }); $f.Controls.Add($k)
$etiket = @{ bekliyor = @('Sırada', $gri, 1); calisiyor = @('Çalışıyor', $mavi, 1); tamam = @('✔ Tamamlandı', $yesil, 1);
  hata = @('✖ Hata', $kirmizi, 2); cerez = @('● Sizi bekliyor', $sari, 3); atlandi = @('Atlandı', $gri, 1) }
$t = New-Object Windows.Forms.Timer; $t.Interval = 1000
$t.Add_Tick({
  try { $d = Get-Content -Raw -Encoding UTF8 $dosya | ConvertFrom-Json } catch { return }
  $simdi = [DateTimeOffset]::UtcNow.ToUnixTimeSeconds()
  if ($d.baslangic) { $sn = [int]($simdi - $d.baslangic); $sure.Text = 'Süre: {0}:{1:00}' -f [int][math]::Floor($sn / 60), ($sn % 60) }
  $hataVar = $false; $bekle = $false
  foreach ($a in 'madte', 'rd') {
    $x = $d.adimlar.$a; $s = $satir[$a]; $e = $etiket[[string]$x.durum]; if (-not $e) { $e = $etiket.bekliyor }
    $s[0].Text = $x.ad; $s[1].Text = $e[0]; $s[1].ForeColor = $e[1]; $s[3].Text = $x.metin
    $yz = [int]$x.yuzde; if ($yz -gt 100) { $yz = 100 }; $s[2].Value = $yz
    if ($x.durum -eq 'calisiyor') { $s[1].Text = 'Çalışıyor  %' + $yz }
    [YS.W]::SendMessage($s[2].Handle, 0x410, [IntPtr]$e[2], [IntPtr]::Zero) | Out-Null
    if ($x.durum -eq 'hata') { $hataVar = $true }; if ($x.durum -eq 'cerez') { $bekle = $true }
  }
  $canli = $null -ne (Get-Process -Id $d.pid -ErrorAction SilentlyContinue)
  if ($d.bitti) {
    $t.Stop(); $oz.Text = $d.ozet
    if ($hataVar) { $genel.Text = '✖ Bitti ama hata var. Hatalı kısımda eski fiyatlar korundu.'; $genel.ForeColor = $kirmizi }
    else { $genel.Text = '✔ Güncelleme bitti'; $genel.ForeColor = $yesil }
    $not.Text = 'Bitti. Pencereyi kapatabilirsiniz.'; $f.Activate()
  } elseif (-not $canli) {
    $genel.Text = '✖ Program beklenmedik şekilde kapandı. Siteye yarım veri gitmedi, tekrar deneyin.'; $genel.ForeColor = $kirmizi
  } elseif ($bekle) { $genel.Text = '● Rulman Dünyası çerezi bekleniyor'; $genel.ForeColor = $sari }
  elseif ($simdi - $d.zaman -gt 900) {
    $genel.Text = '● 15 dakikadır ilerleme yok, bağlantı yavaş olabilir. Bekleyin.'; $genel.ForeColor = $sari
  } else { $genel.Text = '● Çalışıyor, ürünler çekiliyor…'; $genel.ForeColor = $mavi }
})
$f.Add_Shown({ $t.Start(); $f.Activate() })
[Windows.Forms.Application]::Run($f)
"""
EKRAN_ACIK = False


def ekran_ac():
    """Canli bilgi ekranini ayri bir pencerede acar (programi bekletmez)."""
    global EKRAN_ACIK
    if os.name != "nt": return
    try:
        import subprocess
        y = os.path.join(ANA, "ekran.ps1")
        with open(y, "w", encoding="utf-8-sig") as f: f.write(PS_EKRAN)
        subprocess.Popen(["powershell", "-NoProfile", "-ExecutionPolicy", "Bypass", "-WindowStyle", "Hidden", "-File", y],
                         env=dict(os.environ, YS_DOSYA=os.path.join(ANA, "canli.json")), creationflags=0x08000000)
        EKRAN_ACIK = True
    except Exception as e:  # noqa: BLE001
        log("bilgi ekrani acilamadi", e)


def ps_calistir(betik, mesaj):
    import subprocess
    env = dict(os.environ, YS_MESAJ=mesaj)
    r = subprocess.run(["powershell", "-NoProfile", "-ExecutionPolicy", "Bypass", "-WindowStyle", "Hidden",
                        "-Command", betik], env=env, capture_output=True, timeout=3600,
                       creationflags=0x08000000)
    return r.stdout.decode("utf-8", "replace").strip()


CEREZ_AD = re.compile(r"^[A-Za-z0-9_.\-]+$")


def rd_cerez_coz(metin):
    """Yapistirilan cerezi okur: 'ad=deger; ...', JSON, DevTools tablosu (sekmeli) ya da sadece deger."""
    metin = (metin or "").strip().strip('"').strip()
    if metin.lower().startswith("cookie:"): metin = metin[7:].strip()
    c = {}
    if metin[:1] in "[{":
        try:
            j = json.loads(metin); j = j if isinstance(j, list) else j.get("cookies", [j])
            c = {x["name"]: str(x["value"]) for x in j if x.get("name") and "value" in x}
        except Exception:  # noqa: BLE001
            c = {}
    if not c:
        for satir in re.split(r"[\r\n]+", metin):
            satir = satir.strip()
            if not satir: continue
            if satir.startswith("#"): continue
            if "\t" in satir:
                p = [x.strip() for x in satir.split("\t")]
                if len(p) >= 7 and p[1].upper() in ("TRUE", "FALSE"):  # Netscape cookies.txt
                    if p[5] and p[6]: c[p[5]] = p[6]
                elif len(p) >= 2 and p[0] and p[1]: c[p[0]] = p[1]
            elif "=" in satir:
                for par in satir.split(";"):
                    if "=" in par:
                        a, b = par.split("=", 1)
                        if a.strip(): c[a.strip()] = b.strip()
            elif not c:
                c["RulmanB4bV4Session"] = satir
    temiz = {}
    for a, b in c.items():
        if "." in a and a.lower().endswith(("rulman.com.tr", ".com")): continue
        b = b.strip().strip('"')
        if CEREZ_AD.match(a) and b and not re.search(r"[\s;,]", b):
            temiz[a] = b
    log("RD cerez okundu:", ", ".join(f"{a}({len(b)})" for a, b in temiz.items()) or "bos")
    return temiz


def rd_cerez_yukle(s, c):
    for ad in c:
        for dom in ("b4b.rulman.com.tr", ".rulman.com.tr", ".b4b.rulman.com.tr"):
            s.komut("Network.deleteCookies", name=ad, domain=dom)
    for a, b in c.items():
        s.komut("Network.setCookie", name=a, value=b, domain="b4b.rulman.com.tr", path="/", secure=True,
                httpOnly=True)


def rd_cerezle(s):
    """Kayitli giris gecmisse kullanicidan cerez ister (sadece elle calistirmada)."""
    mesaj = ("Madte guncellendi. Simdi Rulman Dunyasi icin cerezi buraya yapistirip Guncelle'ye basin.\n"
             "Vazgec derseniz RD fiyatlari bugun degismez.")
    for _ in range(3):
        ekran("rd", durum="cerez", metin="Rulman Dünyası çerezi bekleniyor. Açılan pencereye yapıştırın.")
        metin = ps_calistir(PS_KUTU, mesaj)
        if not metin:
            raise GirisYok("Rulman Dunyasi cerezi girilmedi")
        try:
            c = rd_cerez_coz(metin)
        except Exception:  # noqa: BLE001
            c = {}
        if c:
            try:
                rd_cerez_yukle(s, c)
                return rd_adim(s)
            except GirisYok:
                pass
            except RuntimeError as e:
                if "Cookie" not in str(e) and "cookie" not in str(e): raise
                log("cerez yuklenemedi", str(e)[:120])
        ekran("rd", durum="cerez", metin="Bu çerez çalışmadı, yenisini yapıştırın.")
        mesaj = "Bu cerez calismadi (suresi dolmus ya da eksik). Rulman Dunyasi'ni yeniden acip yeni cerezi yapistirin."
    raise GirisYok("Rulman Dunyasi cerezi gecersiz")


def adim_metin(ad, d):
    if d.get("durum") == "tamam":
        m = f"{sayi(d.get('eslesen', 0))} ürün güncellendi · fiyatı değişen {sayi(d.get('fiyat', 0))}" \
            f" · stoğu değişen {sayi(d.get('stok', 0))} · min adedi değişen {sayi(d.get('min', 0))}"
        k = d.get("kayip", 0) + d.get("fiyatsiz", 0)
        return m + (f" · {sayi(k)} ürün eski hâliyle korundu" if k else "")
    if d.get("durum") == "giris_gerekli":
        return "Giriş yapılamadı, fiyatlar değişmedi." + (" Madte uygulamasını bir kez açın." if ad == "madte" else "")
    return f"Hata: {d.get('hata', '')[:150]} · Eski fiyatlar korundu, siteye bir şey gitmedi."


def adim_ekran(ad, d):
    ekran(ad, durum="tamam" if d.get("durum") == "tamam" else "hata",
          yuzde=100 if d.get("durum") == "tamam" else CANLI["adimlar"][ad]["yuzde"], metin=adim_metin(ad, d))


def calis(elle=False):
    durum = {"zaman": datetime.datetime.now().isoformat(timespec="seconds"), "elle": elle}
    t, s = tarayici_ac()
    try:
        for ad, f in (("madte", madte_adim), ("rd", rd_adim)):
            if "--sadece-rd" in sys.argv and ad == "madte":
                ekran(ad, durum="atlandi", metin="Bu sefer çalıştırılmadı"); continue
            ekran(ad, durum="calisiyor", yuzde=0, metin="Giriş yapılıyor…")
            try:
                try:
                    durum[ad] = f(s)
                except GirisYok:
                    if not (elle and ad == "rd"): raise
                    durum[ad] = rd_cerezle(s)
            except GirisYok as e:
                durum[ad] = {"durum": "giris_gerekli", "hata": str(e)}; log(e)
            except Exception as e:  # noqa: BLE001
                durum[ad] = {"durum": "hata", "hata": str(e)[:300]}; log(traceback.format_exc())
            adim_ekran(ad, durum[ad])
            cerez_kaydet(s)
    finally:
        t.kapat()
    return durum


def ozet(durum):
    d = {a: (durum.get(a) or {}) for a in ("madte", "rd")}
    sat = [f"{isim}: {adim_metin(ad, d[ad])}" for ad, isim in (("madte", "Madte"), ("rd", "Rulman Dünyası")) if d[ad]]
    if sat and all(x.get("durum") in ("tamam", None) for x in d.values()):
        sat.append("Ticimax bir sonraki okumada (10 saatte bir) siteye geçirir.")
    return "\n".join(sat)


def rd_fark(eski, yeni):
    def oku(x):
        return {deger(b, "UrunKartiID"): (deger(b, "SatisFiyati"), deger(b, "StokAdedi"), deger(b, "MinSiparisAdedi"))
                for b in re.findall(r"<Urun>.*?</Urun>", x, re.S)}
    E, Y = oku(eski), oku(yeni)
    f = {"fiyat": 0, "stok": 0, "min": 0}
    for i, v in Y.items():
        w = E.get(i)
        if not w: continue
        for j, a in enumerate(("fiyat", "stok", "min")): f[a] += v[j] != w[j]
    return f


def rd_adim(s):
    site = json.loads(gzip.decompress(gh_oku(DAL, "pc/rd_site.json.gz")))
    urunler = rd_cek(s)
    ekran("rd", yuzde=92, metin="Fiyat ve stoklar hesaplanıyor, kontrol ediliyor…")
    xml, say = rd_xml(site, urunler)
    d = {"durum": "yayinlanmadi", "rd_toplam": len(urunler), "site": len(site), "eslesen": say["eslesen"],
         "kayip": say["kayip"], "fiyatsiz": say["fiyatsiz"], "yeni_sayi": len(say["yeni"])}
    if say["eslesen"] < ESIK * len(site):
        d["hata"] = "eslesen urun cok az, eski XML korundu"; return d
    try:
        eski = gzip.decompress(gh_oku(DAL, "durum/rd_guncelle.xml.gz")).decode("utf-8")
        d.update(rd_fark(eski, xml))
    except Exception as e:  # noqa: BLE001
        log("RD fark hesaplanamadi", e)
    ekran("rd", yuzde=96, metin="Dosya siteye gönderiliyor…")
    b = io.BytesIO()
    with gzip.GzipFile(fileobj=b, mode="wb", mtime=0) as g: g.write(xml.encode("utf-8"))
    gh_yaz(DAL, "durum/rd_guncelle.xml.gz", b.getvalue(), f"RD gunluk fiyat/stok {time.strftime('%Y-%m-%d')}")
    gh_yaz(DAL, "durum/rd_yeni_urunler.txt", "\n".join(say["yeni"]).encode(), "RD yeni urun listesi")
    d["durum"] = "tamam"; return d


def madte_adim(s):
    K = kur()
    urunler = madte_cek(s)
    eski = gzip.decompress(gh_oku("main", "ekler/madte.xml.gz")).decode("utf-8")
    ekran("madte", yuzde=92, metin="Fiyat ve stoklar hesaplanıyor, kontrol ediliyor…")
    yeni, say = madte_guncelle(eski, urunler, K)
    toplam = say["eslesen"] + say["kayip"] + say["fiyatsiz"]
    d = dict(say, durum="yayinlanmadi", madte_toplam=len(urunler), kur=K.get("USD"))
    if say["eslesen"] < ESIK * toplam:
        d["hata"] = "eslesen urun cok az, eski XML korundu"; return d
    if say["degisen"]:
        ekran("madte", yuzde=96, metin="Dosya siteye gönderiliyor…")
        b = io.BytesIO()
        with gzip.GzipFile(fileobj=b, mode="wb", mtime=0) as g: g.write(yeni.encode("utf-8"))
        gh_yaz("main", "ekler/madte.xml.gz", b.getvalue(), f"Madte gunluk fiyat/stok {time.strftime('%Y-%m-%d')}")
        if ELLE:  # elle calistirmada Talha dosyasini hemen yeniden olustur, Ticimax ilk okumada alsin
            try:
                gh("POST", "/actions/workflows/gunluk-stok.yml/dispatches", {"ref": "main"}); log("Talha dosyasi yenileniyor")
            except Exception as e:  # noqa: BLE001
                log("Talha tetiklenemedi", e)
    d["durum"] = "tamam"; return d


ELLE = False


def main():
    global ELLE
    os.makedirs(ANA, exist_ok=True)
    elle = ELLE = "--elle" in sys.argv
    if "--giris" in sys.argv:
        giris_penceresi(); return
    k = kilit()
    if not k:
        log("zaten calisiyor")
        if elle: ekran_ac()
        return
    ekran(bitti=False, ozet="", baslangic=time.time())
    if elle: ekran_ac()
    if os.name == "nt":  # calisma bitene kadar PC uykuya gecmesin
        ctypes.windll.kernel32.SetThreadExecutionState(0x80000001)
    durum = {}
    try:
        durum = calis(elle)
        durum["log"] = LOG[-60:]
        log("BITTI", json.dumps({a: (durum.get(a) or {}).get("durum") for a in ("rd", "madte")}))
        try:
            gh_yaz(DAL, "durum/son.json", json.dumps(durum, ensure_ascii=False, indent=1).encode(), "PC senkron durumu")
        except Exception as e:  # noqa: BLE001
            log("durum yazilamadi", e)
    except Exception as e:  # noqa: BLE001
        log(traceback.format_exc()); durum["hata"] = str(e)[:200]
    finally:
        ekran(bitti=True, ozet=ozet(durum) or ("Hata: " + durum.get("hata", "bilinmeyen")))
        os.remove(k)
        if elle and not EKRAN_ACIK:
            ps_calistir(PS_BILGI, ozet(durum))


if __name__ == "__main__":
    main()
