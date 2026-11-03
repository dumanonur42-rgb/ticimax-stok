import os, runpy, sys, traceback, urllib.request
ANA = os.path.dirname(os.path.abspath(__file__))
KOD = os.path.join(ANA, "kod")
os.makedirs(KOD, exist_ok=True)
for ad in ("cdp.py", "senkron.py"):
    try:
        u = f"https://raw.githubusercontent.com/dumanonur42-rgb/ticimax-stok/pc-senkron/pc/{ad}"
        v = urllib.request.urlopen(u, timeout=60).read()
        compile(v, ad, "exec")
        with open(os.path.join(KOD, ad), "wb") as f: f.write(v)
    except Exception:
        pass
os.environ["SENKRON_KLASOR"] = ANA
try:
    sys.argv = [os.path.join(KOD, "senkron.py")] + sys.argv[1:]
    runpy.run_path(sys.argv[0], run_name="__main__")
except Exception:
    with open(os.path.join(ANA, "senkron.log"), "a", encoding="utf-8") as f: f.write(traceback.format_exc())
