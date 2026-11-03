"""Edge/Chrome DevTools (CDP) icin kucuk websocket istemcisi (sadece standart kutuphane)."""
import base64, json, os, socket, struct, subprocess, time, urllib.request

EDGE_YOLLARI = [r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe",
                r"C:\Program Files\Microsoft\Edge\Application\msedge.exe"]
UA = ("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) "
      "Chrome/130.0.0.0 Safari/537.36 Edg/130.0.0.0")


def edge_yolu():
    for p in EDGE_YOLLARI:
        if os.path.exists(p):
            return p
    return os.environ.get("SENKRON_TARAYICI") or "msedge"


def bos_port():
    s = socket.socket(); s.bind(("127.0.0.1", 0)); p = s.getsockname()[1]; s.close(); return p


class Tarayici:
    def __init__(self, profil, gorunur=False, ua=None):
        self.port = bos_port()
        arg = [edge_yolu(), f"--user-data-dir={profil}", f"--remote-debugging-port={self.port}",
               "--no-first-run", "--no-default-browser-check", "--disable-sync", "about:blank"]
        if not gorunur:
            arg[1:1] = ["--headless=new", "--disable-gpu", f"--user-agent={ua or UA}", "--window-size=1280,900"]
        kw = {}
        if os.name == "nt":
            kw["creationflags"] = 0x08000000  # CREATE_NO_WINDOW
        self.proc = subprocess.Popen(arg, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, **kw)
        for _ in range(60):
            try:
                urllib.request.urlopen(f"http://127.0.0.1:{self.port}/json/version", timeout=2).read(); break
            except Exception:
                time.sleep(0.5)
        else:
            raise RuntimeError("Tarayici acilmadi")

    def sayfa(self):
        ls = json.loads(urllib.request.urlopen(f"http://127.0.0.1:{self.port}/json/list", timeout=10).read())
        ls = [x for x in ls if x.get("type") == "page"]
        if not ls:
            req = urllib.request.Request(f"http://127.0.0.1:{self.port}/json/new?about:blank", method="PUT")
            ls = [json.loads(urllib.request.urlopen(req, timeout=10).read())]
        return Sayfa(ls[0]["webSocketDebuggerUrl"])

    def kapat(self):
        try:
            self.proc.terminate(); self.proc.wait(15)
        except Exception:
            try: self.proc.kill()
            except Exception: pass


class Sayfa:
    def __init__(self, ws_url):
        host, _, yol = ws_url[len("ws://"):].partition("/")
        h, p = host.split(":")
        self.s = socket.create_connection((h, int(p)), timeout=30)
        key = base64.b64encode(os.urandom(16)).decode()
        self.s.sendall((f"GET /{yol} HTTP/1.1\r\nHost: {host}\r\nUpgrade: websocket\r\nConnection: Upgrade\r\n"
                        f"Sec-WebSocket-Key: {key}\r\nSec-WebSocket-Version: 13\r\n\r\n").encode())
        cev = b""
        while b"\r\n\r\n" not in cev:
            c = self.s.recv(4096)
            if not c: raise RuntimeError("websocket kapandi")
            cev += c
        if b" 101 " not in cev.split(b"\r\n")[0]:
            raise RuntimeError("websocket baglanmadi")
        self.tampon = cev.split(b"\r\n\r\n", 1)[1]
        self.n = 0

    def _oku(self, n):
        while len(self.tampon) < n:
            c = self.s.recv(1 << 20)
            if not c: raise RuntimeError("websocket kapandi")
            self.tampon += c
        v, self.tampon = self.tampon[:n], self.tampon[n:]
        return v

    def _gonder(self, metin):
        d = metin.encode(); m = os.urandom(4); n = len(d)
        bas = b"\x81" + (bytes([0x80 | n]) if n < 126 else
                         (b"\xfe" + struct.pack(">H", n) if n < 65536 else b"\xff" + struct.pack(">Q", n)))
        self.s.sendall(bas + m + bytes(b ^ m[i % 4] for i, b in enumerate(d)))

    def _mesaj(self):
        parca = b""
        while True:
            b1, b2 = self._oku(2)
            n = b2 & 0x7F
            if n == 126: n = struct.unpack(">H", self._oku(2))[0]
            elif n == 127: n = struct.unpack(">Q", self._oku(8))[0]
            veri = self._oku(n)
            op = b1 & 0x0F
            if op == 8: raise RuntimeError("websocket kapandi")
            if op in (9, 10): continue
            parca += veri
            if b1 & 0x80:
                return json.loads(parca.decode("utf-8"))

    def komut(self, metod, zaman=120, **param):
        self.n += 1; no = self.n
        self._gonder(json.dumps({"id": no, "method": metod, "params": param}))
        self.s.settimeout(zaman)
        while True:
            m = self._mesaj()
            if m.get("id") == no:
                if "error" in m: raise RuntimeError(f"{metod}: {m['error']}")
                return m.get("result", {})

    def git(self, url, bekle=4):
        self.komut("Page.navigate", url=url)
        time.sleep(bekle)
        for _ in range(60):
            if self.js("document.readyState") == "complete": break
            time.sleep(1)
        return self.js("location.href")

    def js(self, ifade, zaman=600):
        r = self.komut("Runtime.evaluate", zaman=zaman + 30, expression=ifade, awaitPromise=True,
                       returnByValue=True, timeout=zaman * 1000)
        if r.get("exceptionDetails"):
            raise RuntimeError("JS hatasi: " + str(r["exceptionDetails"].get("exception", {}).get("description") or r["exceptionDetails"])[:300])
        return r.get("result", {}).get("value")
