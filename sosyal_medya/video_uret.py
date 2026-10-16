#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""YouTube Shorts / TikTok / Reels için 9:16 seslendirmeli tanıtım videosu.

Akış:
  1. Her sahnenin Türkçe seslendirmesi alınır; kelime zamanları çıkarılır.
     - video/ses/<sahne>.mp3 varsa hazır kayıt kullanılır (ElevenLabs web arayüzünden indirilen
       insan kalitesinde ses); kelime zamanları faster-whisper ile metne hizalanır.
     - yoksa ELEVENLABS_API_KEY tanımlıysa ElevenLabs API (karakter zamanlamalı),
     - o da yoksa edge-tts.
  2. Tüm video tek bir HTML sayfasıdır: CSS keyframe animasyonları sahne başlangıç
     zamanlarına göre gecikmelidir. Playwright ile animasyon saati kare kare ileri
     alınıp (Web Animations API currentTime) her kare ekran görüntüsü alınır.
  3. numpy ile ritim + whoosh üretilir, seslendirme altında müzik kısılır (ducking).
  4. ffmpeg kareleri ve sesi H.264/AAC MP4 olarak birleştirir.

Kullanım:  python3 video_uret.py   -> video/yamansa_tanitim_9x16.mp4
"""
import asyncio
import base64
import difflib
import hashlib
import json
import os
import re
import subprocess
import unicodedata
from pathlib import Path

import edge_tts
import numpy as np
import requests
from faster_whisper import WhisperModel
from playwright.sync_api import sync_playwright
from scipy.io import wavfile

from gorsel_uret import CHROME, CSS, FOTO, LOGO_ICON, b64
from icerik_verisi import SITE, TEL

HERE = Path(__file__).resolve().parent
OUT = HERE / "video"
TMP = OUT / "_katman"
SES = OUT / "ses"      # hazır seslendirme kayıtları: <sahne id>.mp3
WHISPER_MODEL = os.environ.get("WHISPER_MODEL", "medium")
W, H = 1080, 1920
FPS = 30
SR = 48000
ELEVEN_KEY = os.environ.get("ELEVENLABS_API_KEY", "")
ELEVEN_VOICE = os.environ.get("ELEVEN_VOICE", "7VqWGAWwo2HMrylfKrcm")  # Fatih Yıldırım – derin, net, doğal (Voice Library)
ELEVEN_MODEL = "eleven_multilingual_v2"
ELEVEN_SETTINGS = dict(stability=0.42, similarity_boost=0.8, style=0.25, use_speaker_boost=True, speed=1.0)
VOICE = f"eleven:{ELEVEN_VOICE}" if ELEVEN_KEY else "tr-TR-AhmetNeural"
RATE = "+0%"
VO_START = 0.45     # seslendirme sahne başından kaç sn sonra başlar
PAD = 0.8           # seslendirme bitince sahne kaç sn daha kalır
XF = 0.55           # wipe geçiş süresi
URL = SITE.replace("https://www.", "")

# vo: seslendirmeye giden metin (marka adları Türkçe okunuşuyla yazılır: "Es Ka Ef", "Şaomi")
# cap: ekranda görünen alt yazı; `Görünen|okunuş` ile ilgili vo kelimesine bağlanır, yoksa aynı kelime aranır
# kes: bu kelimelerden sonraki duraksama (sessizlik) kurguda kesilir
SCENES = [
    dict(id="hook", foto="34240236.jpg", kb="in", min=4.0,
         vo="Motorun mu titriyor? Tekerleğin mi ses yapıyor? Sorun, büyük ihtimalle rulmanda."),
    dict(id="logo", foto="19911427.jpg", kb="out",
         vo="Yamansa Rulman. 1986'dan beri rulmanda güvenilir adres."),
    dict(id="moto", foto="18171624.jpg", kb="in",
         vo="Honda'dan Yamaha'ya, Ka Te Em'den Bajaj'a; tüm motosikletler için tekerlek rulmanı setleri stokta.",
         cap="Honda'dan Yamaha'ya, KTM'den|ka Bajaj'a; tüm motosikletler için tekerlek rulmanı setleri stokta.",
         kes=["tekerlek"]),
    dict(id="scooter", foto="26860251.jpg", kb="out",
         vo="Şaomi, Naynbot, Dualtron. Elektrikli skuter rulmanları, ölçüsüyle hazır.",
         cap="Xiaomi,|şaomi Ninebot,|naynbot Dualtron. Elektrikli scooter|skuter rulmanları, ölçüsüyle hazır."),
    dict(id="zz", foto="35568191.jpg", kb="in",
         vo="Zet zet mi, iki er es mi? Tekerlek için iki er es, motor içi için zet zet. Emin değilseniz ölçünüzü yazın, biz bulalım.",
         cap="ZZ|zet mi, 2RS|iki mi? Tekerlek için 2RS,|iki motor içi için ZZ.|zet Emin değilseniz ölçünüzü yazın, biz bulalım."),
    dict(id="sanayi", foto="7568421.jpg", kb="out",
         vo="Konik, silindirik, oynak makaralı. Es Ka Ef, Fag, O Re Se. Hepsi orijinal ve faturalı.",
         cap="Konik, silindirik, oynak makaralı. SKF,|es FAG,|fag ORS.|o Hepsi orijinal ve faturalı."),
    dict(id="kargo", foto="4483608.jpg", kb="in",
         vo="Saat üçe kadar verdiğiniz sipariş, aynı gün kargoda."),
    dict(id="outro", foto="19911421.jpg", kb="out", min=5.0,
         vo="yamansarulman nokta kom. Ölçünüzü yazın, doğru rulmanı birlikte bulalım.",
         cap=f"{URL}&nbsp;·|yamansarulman Ölçünüzü yazın, doğru rulmanı birlikte bulalım."),
]

VIDEO_CSS = CSS + """
html,body{width:1080px;height:1920px;margin:0;overflow:hidden;background:var(--mid);--s:0s}
*{animation-fill-mode:both!important}
.stage{position:absolute;inset:0;overflow:hidden}
.scene{position:absolute;inset:0;visibility:hidden;animation:hold var(--d) linear var(--s) 1;animation-fill-mode:none!important}
@keyframes hold{from,to{visibility:visible}}
.ph{position:absolute;inset:0;background-size:cover;background-position:center;filter:saturate(.6) contrast(1.05)}
.ph.in{animation:kbin var(--d) linear var(--s) 1}
.ph.out{animation:kbout var(--d) linear var(--s) 1}
@keyframes kbin{from{transform:scale(1) translate(0,0)}to{transform:scale(1.16) translate(-2%,1%)}}
@keyframes kbout{from{transform:scale(1.16) translate(2%,-1%)}to{transform:scale(1) translate(0,0)}}
.shade{position:absolute;inset:0;background:linear-gradient(180deg,rgba(1,27,84,.45) 0%,rgba(1,27,84,.25) 35%,rgba(7,15,43,.9) 68%,rgba(7,15,43,1) 100%)}
.shade.deep{background:linear-gradient(180deg,rgba(1,27,84,.7),rgba(7,15,43,.92))}
.grid{background-size:135px 135px}

.up{opacity:0;transform:translateY(90px);animation:up .65s cubic-bezier(.2,.8,.2,1) calc(var(--s) + var(--t)) 1}
@keyframes up{to{opacity:1;transform:translateY(0)}}
.stamp{opacity:0;transform:scale(1.7);animation:stamp .38s cubic-bezier(.2,1.2,.3,1) calc(var(--s) + var(--t)) 1}
@keyframes stamp{60%{opacity:1}to{opacity:1;transform:scale(1)}}
.slideL{opacity:0;transform:translateX(-140%);animation:slide .6s cubic-bezier(.2,.9,.2,1) calc(var(--s) + var(--t)) 1}
.slideR{opacity:0;transform:translateX(140%);animation:slide .6s cubic-bezier(.2,.9,.2,1) calc(var(--s) + var(--t)) 1}
@keyframes slide{to{opacity:1;transform:translateX(0)}}
.pop{opacity:0;transform:scale(.5);animation:pop .45s cubic-bezier(.2,1.6,.4,1) calc(var(--s) + var(--t)) 1}
@keyframes pop{to{opacity:1;transform:scale(1)}}
.grow{transform:scaleX(0);transform-origin:left;animation:grow .7s cubic-bezier(.2,.8,.2,1) calc(var(--s) + var(--t)) 1}
@keyframes grow{to{transform:scaleX(1)}}
.pulse{animation:pulse 1.1s ease-in-out calc(var(--s) + var(--t)) infinite}
@keyframes pulse{0%,100%{transform:scale(1);box-shadow:0 0 0 0 rgba(255,106,0,.55)}50%{transform:scale(1.04);box-shadow:0 0 0 26px rgba(255,106,0,0)}}
.spin{animation:spin 9s linear 0s infinite}
@keyframes spin{to{transform:rotate(360deg)}}

.wipe{position:absolute;top:-10%;bottom:-10%;left:-40%;width:180%;transform:translateX(-100%) skewX(-14deg);animation:wipe .62s cubic-bezier(.7,0,.3,1) calc(var(--s) + var(--t)) 1}
@keyframes wipe{to{transform:translateX(100%) skewX(-14deg)}}

.vtag{font-family:'Montserrat';font-weight:700;font-size:26px;letter-spacing:.22em;text-transform:uppercase;color:#fff;background:var(--orange);padding:14px 22px;display:inline-block;border-radius:4px}
.vh1{font-family:'Montserrat';font-weight:900;font-size:138px;line-height:.94;letter-spacing:-.03em;color:#fff;margin:0}
.vh1 .l{display:block}
.vsub{font-size:34px;line-height:1.35;color:#fff;opacity:.92;margin-top:28px;max-width:920px}
.chips{display:flex;flex-wrap:wrap;gap:14px;margin-top:40px}
.chip{font-family:'Montserrat';font-weight:800;font-size:28px;letter-spacing:.04em;color:#fff;border:2px solid rgba(255,255,255,.55);padding:14px 24px;border-radius:999px;background:rgba(7,15,43,.35)}
.chip.o{background:var(--orange);border-color:var(--orange)}
.head{position:absolute;top:72px;left:72px;right:72px;display:flex;justify-content:space-between;align-items:center;color:#fff}
.foot{position:absolute;left:72px;right:72px;bottom:72px;display:flex;justify-content:space-between;align-items:center;color:#fff;font-weight:600;font-size:26px;letter-spacing:.04em}
.foot .ln{flex:1;height:1px;background:#fff;opacity:.35;margin:0 28px}
.cap{position:absolute;left:72px;right:72px;bottom:190px;display:flex;flex-wrap:wrap;justify-content:center;gap:0 14px;font-family:'Inter';font-weight:700;font-size:40px;line-height:1.35;text-align:center}
.cap .w{color:rgba(255,255,255,.42);animation:word .45s ease-out calc(var(--s) + var(--t)) 1;display:inline-block}
@keyframes word{25%{color:var(--orange);transform:scale(1.14)}to{color:#fff;transform:scale(1)}}
.big{font-family:'Montserrat';font-weight:900;color:#fff;letter-spacing:-.03em;line-height:.95}
.hookw{display:inline-block;margin:0 .14em}
.card{flex:1;border-radius:14px;padding:38px 32px;color:#fff}
.card b{font-family:'Montserrat';font-weight:900;font-size:96px;display:block;line-height:1}
.card small{display:block;font-size:22px;letter-spacing:.14em;text-transform:uppercase;opacity:.85;margin:8px 0 22px}
.card span{display:block;font-size:28px;font-weight:600;padding:12px 0;border-top:1px solid rgba(255,255,255,.25)}
"""


def tr_upper(s):
    return s.replace("i", "İ").replace("ı", "I").upper()


# ---------------------------------------------------------------- seslendirme
def _tts_eleven(scene, path):
    """ElevenLabs TTS; karakter hizalamasından kelime zamanları türetilir."""
    r = requests.post(
        f"https://api.elevenlabs.io/v1/text-to-speech/{ELEVEN_VOICE}/with-timestamps",
        params=dict(output_format="mp3_44100_128"),
        headers={"xi-api-key": ELEVEN_KEY},
        json=dict(text=scene["vo"], model_id=ELEVEN_MODEL, language_code="tr", voice_settings=ELEVEN_SETTINGS),
        timeout=120)
    r.raise_for_status()
    j = r.json()
    Path(path).write_bytes(base64.b64decode(j["audio_base64"]))
    al = j["alignment"]
    words, cur = [], None
    for ch, t0, t1 in zip(al["characters"], al["character_start_times_seconds"], al["character_end_times_seconds"]):
        if ch.isspace():
            if cur:
                words.append(cur)
            cur = None
        elif cur is None:
            cur = dict(t=t0, d=t1 - t0, text=ch)
        else:
            cur["text"] += ch
            cur["d"] = t1 - cur["t"]
    if cur:
        words.append(cur)
    return words


def _norm(s):
    """Hizalama için: küçük harf, aksan/noktalama/boşluk yok (ş->s, ı->i ...)."""
    s = s.replace("ı", "i").replace("İ", "i").lower()
    s = unicodedata.normalize("NFKD", s)
    return re.sub(r"[^a-z0-9]", "", s)


def _align_words(vo, heard):
    """vo kelimelerini whisper'ın duyduğu kelimelere ([(metin, t0, t1)]) karakter düzeyinde eşler.
    Whisper 'Ka Te Em' -> 'KTM' gibi birleştirse de karakter eşleşmesi çoğunlukla tutar;
    eşleşmeyen karakterler komşu eşleşmeler arasında doğrusal dağıtılır."""
    vo_words = vo.split()
    a, spans = "", []          # a: normalize vo metni; spans: her vo kelimesinin a içindeki aralığı
    for w in vo_words:
        n = _norm(w)
        spans.append((len(a), len(a) + len(n)))
        a += n
    b, tmap = "", []           # b: normalize duyulan metin; tmap[i]: b[i] karakterinin zamanı
    for txt, t0, t1 in heard:
        n = _norm(txt)
        if not n:
            continue
        for k in range(len(n)):
            tmap.append(t0 + (t1 - t0) * k / len(n))
        b += n
    tmap.append(heard[-1][2])
    anchors = [(0, 0)]
    for m in difflib.SequenceMatcher(None, a, b, autojunk=False).get_matching_blocks():
        if m.size:
            anchors += [(m.a, m.b), (m.a + m.size, m.b + m.size)]
    anchors.append((len(a), len(b)))
    ax = np.array([p[0] for p in anchors], float)
    bx = np.array([p[1] for p in anchors], float)

    def t_of(i):
        j = float(np.interp(i, ax, bx))
        return float(np.interp(j, np.arange(len(tmap)), tmap))

    words = []
    for w, (i0, i1) in zip(vo_words, spans):
        t0, t1 = t_of(i0), t_of(max(i1, i0 + 1))
        words.append(dict(t=t0, d=max(t1 - t0, 0.05), text=w))
    return words


_whisper = None


def _words_from_audio(scene, path):
    """Hazır kayıt: faster-whisper kelime zamanları + metne hizalama."""
    global _whisper
    if _whisper is None:
        _whisper = WhisperModel(WHISPER_MODEL, device="cpu", compute_type="int8")
    segs, _ = _whisper.transcribe(str(path), language="tr", word_timestamps=True, beam_size=5,
                               initial_prompt=scene["vo"])
    heard = [(w.word, w.start, w.end) for s in segs for w in s.words]
    if not heard:
        raise ValueError(f"{scene['id']}: kayıtta konuşma bulunamadı: {path}")
    return _align_words(scene["vo"], heard)


async def _tts_edge(scene, path):
    com = edge_tts.Communicate(scene["vo"], VOICE, rate=RATE, boundary="WordBoundary")
    words = []
    with open(path, "wb") as f:
        async for ch in com.stream():
            if ch["type"] == "audio":
                f.write(ch["data"])
            elif ch["type"] == "WordBoundary":
                words.append(dict(t=ch["offset"] / 1e7, d=ch["duration"] / 1e7, text=ch["text"]))
    return words


def tighten(data, words, kes=(), gap=0.5, thr=0.012, min_sil=0.8, hes=0.15, hes_gap=0.08):
    """Cümle aralarındaki uzun sessizlikleri `gap` sn'ye, `kes` kelimelerinden sonraki duraksamaları
    `hes_gap` sn'ye kısaltır; kelime zamanlarını kaydırır."""
    win = int(0.02 * SR)
    env = np.convolve(np.abs(data), np.ones(win) / win, mode="same")
    silent = env < thr
    edges = np.flatnonzero(np.diff(np.concatenate(([0], silent.astype(np.int8), [0]))))
    kes = {_norm(k) for k in kes}

    def word_before(t):
        prev = [w for w in words if w["t"] <= t + 0.05]
        return _norm(prev[-1]["text"]) if prev else ""

    cuts = []  # (kes_başlangıç, kes_bitiş) örnek indeksleri
    for a, b in zip(edges[::2], edges[1::2]):
        if a == 0:
            cuts.append((0, max(0, b - int(0.06 * SR))))
        elif b >= len(data) - win:
            cuts.append((min(len(data), a + int(0.12 * SR)), len(data)))
        elif b - a >= min_sil * SR:
            half = int(gap / 2 * SR)
            cuts.append((a + half, b - half))
        elif b - a >= hes * SR and word_before(a / SR) in kes:
            half = int(hes_gap / 2 * SR)
            cuts.append((a + half, b - half))
    keep = np.ones(len(data), bool)
    for a, b in cuts:
        keep[a:b] = False
    removed_before = np.cumsum(~keep)

    def remap(t):
        i = min(int(t * SR), len(data) - 1)
        return (i - removed_before[i]) / SR

    return data[keep], [dict(w, t=remap(w["t"])) for w in words]


def make_voice():
    TMP.mkdir(parents=True, exist_ok=True)
    t0 = 0.0
    for i, s in enumerate(SCENES):
        ready = SES / f"{s['id']}.mp3"
        if ready.exists():
            key = hashlib.md5(ready.read_bytes() + f"|{WHISPER_MODEL}|{s['vo']}|{s.get('kes', ())}".encode()).hexdigest()[:8]
        else:
            key = hashlib.md5(f"{VOICE}|{RATE}|{ELEVEN_MODEL}|{sorted(ELEVEN_SETTINGS.items())}|{s['vo']}".encode()).hexdigest()[:8]
        mp3 = TMP / f"vo{i}_{key}.mp3"
        wav = TMP / f"vo{i}_{key}.wav"
        meta = TMP / f"vo{i}_{key}.json"
        if not (meta.exists() and json.loads(meta.read_text())):
            if ready.exists():
                mp3 = ready
                words = _words_from_audio(s, mp3)
            elif ELEVEN_KEY:
                words = _tts_eleven(s, mp3)
            else:
                words = asyncio.run(_tts_edge(s, mp3))
            subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", str(mp3), "-ar", str(SR), "-ac", "1", str(wav)], check=True)
            _, data = wavfile.read(wav)
            data, words = tighten(data.astype(np.float64) / 32768.0, words, s.get("kes", ()))
            wavfile.write(wav, SR, (data * 32767).astype(np.int16))
            meta.write_text(json.dumps(words, ensure_ascii=False))
        s["words"] = json.loads(meta.read_text())
        s["wav"] = wav
        s["vo_dur"] = float(subprocess.check_output(
            ["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", str(wav)]))
        vo_dur = s["vo_dur"]
        s["d"] = max(s.get("min", 0), VO_START + vo_dur + PAD)
        s["s"] = t0
        t0 += s["d"]
    return t0


def wt(s, prefix, nth=0):
    """Sahne içi zaman: seslendirmede `prefix` ile başlayan n. kelimenin başlangıcı."""
    hits = [w for w in s["words"] if w["text"].lower().startswith(prefix.lower())]
    return VO_START + hits[nth]["t"] - 0.08


# ---------------------------------------------------------------- HTML
def cap_tokens(s):
    """Alt yazı kelimeleri: (görünen metin, sahne içi zaman). Her token sırayla bir sonraki uygun vo kelimesine bağlanır."""
    out, j = [], 0
    for tok in s.get("cap", s["vo"]).split():
        txt, _, pre = tok.partition("|")
        pre = (pre or txt.strip(".,;:?!")).lower()
        while j < len(s["words"]) and not s["words"][j]["text"].lower().startswith(pre):
            j += 1
        if j >= len(s["words"]):
            raise ValueError(f"{s['id']}: alt yazı kelimesi seslendirmede bulunamadı: {tok!r}")
        out.append((txt, VO_START + s["words"][j]["t"]))
        j += 1
    return out


def cap_html(s):
    spans = "".join(f'<span class="w" style="--t:{t:.3f}s">{txt}</span>' for txt, t in cap_tokens(s))
    return f'<div class="cap">{spans}</div>'


def head_html():
    return f"""<div class="head">
      <div class="brand"><img src="{LOGO_ICON}" style="height:64px"><div class="sep"></div><span style="font-size:36px">YAMANSA</span></div>
      <div style="font-weight:600;font-size:24px;letter-spacing:.06em;opacity:.85">{URL}</div></div>"""


def foot_html():
    return f'<div class="foot"><span>{URL}</span><div class="ln"></div><span>{TEL}</span></div>'


def bearing_svg(size, cls=""):
    balls = "".join(
        f'<circle cx="{50 + 38 * np.cos(a):.2f}" cy="{50 + 38 * np.sin(a):.2f}" r="5.2" fill="#fff"/>'
        for a in np.linspace(0, 2 * np.pi, 12, endpoint=False))
    return f"""<svg class="{cls}" viewBox="0 0 100 100" width="{size}" height="{size}" style="display:block">
      <circle cx="50" cy="50" r="47" fill="none" stroke="#fff" stroke-width="5"/>
      <circle cx="50" cy="50" r="29" fill="none" stroke="#fff" stroke-width="5"/>
      <circle cx="50" cy="50" r="38" fill="none" stroke="#fff" stroke-width="1.2" opacity=".5"/>{balls}</svg>"""


def h1_lines(lines, cls, t0, step=0.12, size=138):
    return f'<h1 class="vh1" style="font-size:{size}px">' + "".join(
        f'<span class="l {cls}" style="--t:{t0 + i * step:.2f}s">{l}</span>' for i, l in enumerate(lines)) + "</h1>"


def chips(items, t0, step=0.09, orange=()):
    return '<div class="chips">' + "".join(
        f'<span class="chip pop {"o" if i in orange else ""}" style="--t:{t0 + i * step:.2f}s">{c}</span>'
        for i, c in enumerate(items)) + "</div>"


def scene_hook(s):
    # cümleler: kelimeler konuşulduğu anda sahneye "damgalanır"
    groups, cur = [], []
    for (txt, t), w in zip(cap_tokens(s), s["words"]):
        cur.append(dict(w, text=txt))
        if txt.endswith(("?", ".")):
            groups.append(cur)
            cur = []
    if cur:
        groups.append(cur)
    html = ""
    for gi, g in enumerate(groups):
        start = VO_START + g[0]["t"] - 0.1
        end = VO_START + groups[gi + 1][0]["t"] - 0.1 if gi + 1 < len(groups) else s["d"] + 1
        last = gi == len(groups) - 1
        words = "".join(
            f'<span class="hookw stamp" style="--t:{VO_START + w["t"] - 0.05 - start:.3f}s;{"color:var(--orange)" if last and w["text"].lower().startswith("rulman") else ""}">{tr_upper(w["text"])}</span>'
            for w in g)
        html += f"""<div class="scene" style="--s:{start:.3f}s;--d:{end - start:.3f}s;display:flex;align-items:center;justify-content:center;padding:0 60px">
          <div class="big" style="font-size:{124 if not last else 150}px;text-align:center">{words}</div></div>"""
    return html


def scene_logo(s):
    letters = "".join(
        f'<span class="up" style="--t:{0.55 + i * 0.06:.2f}s;display:inline-block">{c}</span>' for i, c in enumerate("YAMANSA"))
    return f"""
      <div style="position:absolute;left:0;right:0;top:50%;transform:translateY(-60%);text-align:center">
        <div class="stamp" style="--t:.3s"><img src="{LOGO_ICON}" style="width:360px;filter:drop-shadow(0 20px 40px rgba(0,0,0,.45))"></div>
        <div style="font-family:Montserrat;font-weight:900;font-size:124px;letter-spacing:.02em;color:#fff;margin-top:6px">{letters}</div>
        <div class="up" style="--t:1.0s;font-family:Montserrat;font-weight:700;font-size:36px;letter-spacing:.42em;color:var(--steel)">RULMAN</div>
        <div class="grow" style="--t:1.15s;width:140px;height:10px;background:var(--orange);margin:40px auto 0"></div>
        <div class="pop" style="--t:{wt(s, '1986'):.2f}s;margin-top:40px"><span class="vtag" style="font-size:30px">1986'dan beri</span></div>
      </div>{cap_html(s)}"""


def scene_moto(s):
    return f"""
      <div style="position:absolute;left:72px;right:72px;bottom:440px">
        <div class="pop" style="--t:.25s"><span class="vtag">Motosiklet</span></div>
        <div style="margin-top:36px">{h1_lines(["TEKERLEK", "RULMANI", "SETLERİ"], "slideL", 0.4)}</div>
        {chips(["Honda", "Yamaha", "Bajaj", "KTM", "CFMOTO", "Mondial", "RKS", "Kuba"], wt(s, "Honda"), orange=(0, 3))}
      </div>{cap_html(s)}"""


def scene_scooter(s):
    return f"""
      <div style="position:absolute;left:72px;right:72px;bottom:440px;text-align:right">
        <div class="pop" style="--t:.25s"><span class="vtag">E-Scooter</span></div>
        <div style="margin-top:36px">{h1_lines(["SCOOTER", "RULMANI", "STOKTA."], "slideR", 0.4)}</div>
        <div style="display:flex;justify-content:flex-end">{chips(["Xiaomi", "Segway Ninebot", "Dualtron", "Navee", "Citymate"], wt(s, "Şaomi"), orange=(0, 1, 2))}</div>
      </div>{cap_html(s)}"""


def scene_zz(s):
    return f"""
      <div style="position:absolute;left:72px;right:72px;top:290px">
        <div class="pop" style="--t:.2s"><span class="vtag">Teknik bilgi</span></div>
        <div style="margin-top:30px">{h1_lines(["ZZ Mİ,", "2RS Mİ?"], "up", 0.35, size=150)}</div>
      </div>
      <div style="position:absolute;left:72px;right:72px;top:800px;display:flex;gap:120px">
        <div class="card slideL" style="--t:{wt(s, 'Zet'):.2f}s;background:rgba(184,192,204,.18);border:2px solid rgba(255,255,255,.35);backdrop-filter:blur(8px)">
          <b>ZZ</b><small>Metal kapak</small><span>Yüksek devir</span><span>Düşük sürtünme</span><span>Motor içi · kuru ortam</span></div>
        <div class="card slideR" style="--t:{wt(s, 'iki'):.2f}s;background:var(--orange)">
          <b>2RS</b><small>Kauçuk keçe</small><span>Su & çamur koruması</span><span>Gres içinde kalır</span><span>Tekerlek · dış ortam</span></div>
        <div class="stamp" style="--t:{wt(s, 'Tekerlek'):.2f}s;position:absolute;left:50%;top:50%;margin:-58px 0 0 -58px;width:116px;height:116px;border-radius:50%;background:var(--navy);border:6px solid #fff;display:flex;align-items:center;justify-content:center;font-family:Montserrat;font-weight:900;font-size:44px;color:#fff;box-shadow:0 20px 50px rgba(0,0,0,.45)">VS</div>
      </div>
      {cap_html(s)}"""


def scene_sanayi(s):
    words = [("KONİK.", "Konik"), ("SİLİNDİRİK.", "silindirik"), ("OYNAK.", "oynak")]
    h1 = '<h1 class="vh1" style="font-size:128px">' + "".join(
        f'<span class="l stamp" style="--t:{wt(s, k):.2f}s;{"color:var(--orange)" if i == 2 else ""}">{w}</span>' for i, (w, k) in enumerate(words)) + "</h1>"
    return f"""
      <div style="position:absolute;left:72px;right:72px;bottom:440px">
        <div class="pop" style="--t:.2s"><span class="vtag">Sanayi</span></div>
        <div style="margin-top:36px">{h1}</div>
        {chips(["SKF", "FAG", "ORS", "NMB", "TPI"], wt(s, "Es"), step=0.14)}
        <div class="up" style="--t:{wt(s, 'Hepsi'):.2f}s" ><p class="vsub" style="font-weight:600">Orijinal ürün · faturalı · stoktan</p></div>
      </div>{cap_html(s)}"""


def scene_kargo(s):
    return f"""
      <div style="position:absolute;left:72px;right:72px;top:300px">
        <div class="pop" style="--t:.2s"><span class="vtag">Lojistik</span></div>
        <div class="stamp" style="--t:{wt(s, 'üçe'):.2f}s;font-family:Montserrat;font-weight:900;font-size:260px;line-height:1;color:#fff;letter-spacing:-.04em;margin-top:24px">15<span style="color:var(--orange)">:</span>00</div>
        <div class="up" style="--t:{wt(s, 'kadar'):.2f}s;font-size:34px;color:var(--steel);font-weight:600;letter-spacing:.12em;text-transform:uppercase;margin-top:6px">'e kadar verilen siparişler</div>
        <div style="margin-top:56px">{h1_lines(["AYNI GÜN", "KARGODA."], "stamp", wt(s, "aynı"), step=wt(s, "kargoda") - wt(s, "aynı"), size=150)}</div>
        <div class="grow" style="--t:{wt(s, 'aynı'):.2f}s;height:12px;background:var(--orange);margin-top:40px;width:100%"></div>
      </div>{cap_html(s)}"""


def scene_outro(s):
    return f"""
      <div style="position:absolute;left:0;right:0;top:250px;text-align:center">
        <div class="stamp" style="--t:.2s;position:relative;width:420px;height:420px;margin:0 auto">
          <div style="position:absolute;inset:0;opacity:.85">{bearing_svg(420, 'spin')}</div>
          <img src="{LOGO_ICON}" style="position:absolute;left:50%;top:50%;width:200px;transform:translate(-50%,-50%);filter:drop-shadow(0 18px 30px rgba(0,0,0,.5))">
        </div>
        <div class="up" style="--t:{wt(s, 'yamansa'):.2f}s;font-family:Montserrat;font-weight:900;font-size:88px;color:#fff;letter-spacing:-.03em;margin-top:60px">{URL}</div>
        <div class="up" style="--t:{wt(s, 'yamansa') + 0.3:.2f}s;font-size:44px;color:var(--steel);font-weight:600;margin-top:10px">{TEL}</div>
        <div class="pop" style="--t:{wt(s, 'Ölçünü'):.2f}s;margin-top:70px">
          <span class="pulse" style="--t:{wt(s, 'Ölçünü') + 0.5:.2f}s;display:inline-block;background:var(--orange);color:#fff;font-family:Montserrat;font-weight:900;font-size:46px;letter-spacing:.04em;padding:30px 60px;border-radius:999px">ÖLÇÜNÜ YAZ, DM AT</span></div>
        <div class="up" style="--t:{wt(s, 'doğru'):.2f}s;font-size:34px;color:#fff;opacity:.9;margin-top:50px">Doğru rulmanı birlikte bulalım.</div>
      </div>{cap_html(s)}"""


BUILDERS = dict(hook=scene_hook, logo=scene_logo, moto=scene_moto, scooter=scene_scooter, zz=scene_zz,
                sanayi=scene_sanayi, kargo=scene_kargo, outro=scene_outro)


def page_html(total):
    parts = []
    for s in SCENES:
        deep = s["id"] in ("hook", "logo", "zz", "kargo")
        chrome = "" if s["id"] in ("hook", "logo") else head_html()
        parts.append(f"""
        <div class="scene" style="--s:{s['s']:.3f}s;--d:{s['d'] + XF:.3f}s">
          <div class="ph {s['kb']}" style="--s:{s['s']:.3f}s;--d:{s['d'] + XF:.3f}s;background-image:url('{b64(FOTO / s['foto'])}')"></div>
          <div class="shade {'deep' if deep else ''}"></div><div class="grid"></div>
          {'' if s['id'] == 'hook' else f'<div style="position:absolute;right:-120px;bottom:520px;opacity:.16">{bearing_svg(420, "spin")}</div>'}
          <div class="stage" style="--s:{s['s']:.3f}s">{BUILDERS[s['id']](s)}</div>
          {chrome}{foot_html() if s['id'] != 'hook' else ''}
        </div>""")
    # sahne geçişleri: çift panel çapraz wipe
    for s in SCENES[1:]:
        t = s["s"] - XF / 2
        parts.append(f'<div class="wipe" style="--t:{t:.3f}s;background:var(--orange);z-index:50"></div>'
                     f'<div class="wipe" style="--t:{t + 0.09:.3f}s;background:var(--navy);z-index:49"></div>')
    return f"""<!doctype html><html lang="tr"><head><meta charset="utf-8"><style>{VIDEO_CSS}</style></head>
    <body><div class="stage">{''.join(parts)}</div></body></html>"""


# ---------------------------------------------------------------- ses
def _env(n, a, d):
    t = np.arange(n) / SR
    return np.exp(-t / d) * np.minimum(1, t / max(a, 1e-4))


def make_music(total, boundaries):
    rng = np.random.default_rng(7)
    n = int(total * SR)
    t = np.arange(n) / SR
    bpm = 124
    beat = 60 / bpm
    out = np.zeros(n)
    # kick + hat
    for b in np.arange(0, total, beat):
        i = int(b * SR)
        k = int(0.35 * SR)
        tt = np.arange(k) / SR
        kick = np.sin(2 * np.pi * (48 * tt + 80 * np.exp(-tt * 18))) * _env(k, 0.001, 0.09) * 0.9
        out[i:i + k] += kick[: n - i]
        for off, g in ((beat / 2, 0.22), (beat / 4, 0.09), (3 * beat / 4, 0.09)):
            j = int((b + off) * SR)
            h = int(0.06 * SR)
            if j + h < n:
                out[j:j + h] += rng.normal(0, 1, h) * _env(h, 0.001, 0.012) * g
    # bas: 2 barlık kalıp
    notes = [55, 55, 65.4, 49]   # A1 A1 C2 G1
    for bar_i, b in enumerate(np.arange(0, total, beat * 4)):
        f = notes[bar_i % 4]
        for step in range(8):
            j = int((b + step * beat / 2) * SR)
            k = int(beat / 2 * SR)
            if j + k > n:
                break
            tt = np.arange(k) / SR
            saw = 2 * ((tt * f) % 1) - 1
            sq = np.sign(np.sin(2 * np.pi * f * 2 * tt)) * 0.3
            out[j:j + k] += (saw + sq) * _env(k, 0.004, 0.16) * (0.34 if step % 2 == 0 else 0.22)
    # pad
    for f in (220, 261.6, 329.6):
        out += 0.035 * np.sin(2 * np.pi * f * t + np.sin(2 * np.pi * 0.3 * t)) * (0.6 + 0.4 * np.sin(2 * np.pi * 0.11 * t))
    # whoosh (geçişlerde)
    for bt in boundaries:
        i = int((bt - 0.35) * SR)
        k = int(0.7 * SR)
        if 0 <= i and i + k < n:
            tt = np.arange(k) / SR
            noise = rng.normal(0, 1, k)
            sweep = np.sin(2 * np.pi * (300 + 2500 * tt / 0.7) * tt)
            env = np.sin(np.pi * tt / 0.7) ** 2
            out[i:i + k] += (noise * 0.35 + sweep * 0.25) * env * 0.9
    out /= np.max(np.abs(out)) + 1e-9
    fade = int(1.2 * SR)
    out[:fade] *= np.linspace(0, 1, fade)
    out[-fade * 2:] *= np.linspace(1, 0, fade * 2)
    return out


def make_audio(total, path):
    n = int(total * SR)
    voice = np.zeros(n)
    for s in SCENES:
        sr, data = wavfile.read(s["wav"])
        data = data.astype(np.float64) / 32768.0
        i = int((s["s"] + VO_START) * SR)
        voice[i:i + len(data)] += data[: n - i]
    voice *= 0.95 / (np.max(np.abs(voice)) + 1e-9)
    music = make_music(total, [s["s"] for s in SCENES[1:]])
    # ducking: seslendirme varken müzik kısılır
    env = np.convolve(np.abs(voice), np.ones(int(0.08 * SR)) / int(0.08 * SR), mode="same")
    active = (env > 0.02).astype(np.float64)
    active = np.convolve(active, np.ones(int(0.25 * SR)) / int(0.25 * SR), mode="same")
    gain = 0.42 - 0.27 * np.clip(active * 1.3, 0, 1)
    mix = voice + music * gain
    mix = np.tanh(mix * 1.1) * 0.95
    wavfile.write(path, SR, (mix * 32767).astype(np.int16))


# ---------------------------------------------------------------- kare render + encode
def render(total, out):
    html = page_html(total)
    (TMP / "video.html").write_text(html, encoding="utf-8")
    frames = int(round(total * FPS))
    cmd = ["ffmpeg", "-v", "error", "-y",
           "-f", "image2pipe", "-framerate", str(FPS), "-c:v", "mjpeg", "-i", "-",
           "-i", str(TMP / "mix.wav"),
           "-c:v", "libx264", "-preset", "medium", "-crf", "18", "-pix_fmt", "yuv420p", "-r", str(FPS),
           "-c:a", "aac", "-b:a", "160k", "-movflags", "+faststart", "-shortest", str(out)]
    with sync_playwright() as pw:
        browser = pw.chromium.launch(executable_path=CHROME, headless=True)
        page = browser.new_context(device_scale_factor=1, viewport={"width": W, "height": H}).new_page()
        page.set_content(html, wait_until="load")
        page.wait_for_function("document.fonts.ready.then(()=>document.fonts.status==='loaded')")
        page.wait_for_timeout(200)
        page.evaluate("()=>{window.A=document.getAnimations();A.forEach(a=>a.pause())}")
        enc = subprocess.Popen(cmd, stdin=subprocess.PIPE)
        for f in range(frames):
            page.evaluate("t=>A.forEach(a=>{a.currentTime=t})", f * 1000 / FPS)
            enc.stdin.write(page.screenshot(type="jpeg", quality=94))
            if f % 60 == 0:
                print(f"kare {f}/{frames}", flush=True)
        enc.stdin.close()
        enc.wait()
        browser.close()
    if enc.returncode:
        raise SystemExit("ffmpeg hata")


if __name__ == "__main__":
    total = make_voice()
    for s in SCENES:
        print(f"{s['id']:8s} {s['s']:6.2f}s +{s['d']:.2f}s  vo={s['vo_dur']:.2f}s")
    make_audio(total, TMP / "mix.wav")
    out = OUT / "yamansa_tanitim_9x16.mp4"
    render(total, out)
    print("ok", out, f"{total:.1f}s")
