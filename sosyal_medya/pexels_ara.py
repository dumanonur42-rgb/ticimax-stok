#!/usr/bin/env python3
"""Pexels'te (ücretsiz ticari lisans) arama yapar, sonuçları listeler."""
import sys
import json
from playwright.sync_api import sync_playwright

queries = sys.argv[1:] or ["ball bearing"]
out = {}
with sync_playwright() as p:
    b = p.chromium.connect_over_cdp("http://localhost:29229")
    ctx = b.contexts[0]
    pg = ctx.new_page()
    for q in queries:
        pg.goto(f"https://www.pexels.com/search/{q.replace(' ', '%20')}/", wait_until="domcontentloaded", timeout=60000)
        pg.wait_for_timeout(4000)
        for _ in range(3):
            pg.mouse.wheel(0, 3000)
            pg.wait_for_timeout(1500)
        items = pg.evaluate(
            """Array.from(document.querySelectorAll('a[href*="/photo/"]')).map(a=>{
                const img=a.querySelector('img');
                return {href:a.href, alt: img? img.alt : ''}})"""
        )
        seen = {}
        for it in items:
            pid = it["href"].rstrip("/").split("-")[-1]
            if pid.isdigit() and pid not in seen:
                seen[pid] = it["alt"].replace("Free ", "")[:90]
        out[q] = seen
        print(f"\n## {q} ({len(seen)})")
        for pid, alt in seen.items():
            print(pid, "|", alt)
    pg.close()
json.dump(out, open("/tmp/pexels_results.json", "w"), ensure_ascii=False, indent=1)
