#!/usr/bin/env python3
"""Corrimar sample-lid QR sticker (site-v2, v3 pass).

Default URL is a PLACEHOLDER short path. When the real page is LIVE, re-run:
    python3 make_qr.py "https://REAL.domain/s"      (keep it 26 characters or fewer for a 25x25 grid)
then: python3 render.py && zbarimg qr.png sticker-*-600dpi.png
The /s path must redirect to /?src=sample (site-v2/s/index.html and _redirects do this).

Outputs (this folder): qr.png, sticker-1.5in-round.svg, sticker-2in-round.svg.
Layout: brand name above the code, "Scan to reserve" below, straight text, 8 pt or larger,
full 4-module light quiet zone. No warning text on the artwork; the placeholder warning lives in
the preview caption only. Convert text to outlines and add the printer's bleed before printing.
"""
import base64, math, os, sys
from xml.sax.saxutils import escape
import segno

HERE = os.path.dirname(os.path.abspath(__file__))
URL = sys.argv[1] if len(sys.argv) > 1 else "https://PLACEHOLDER.ex/s"  # PLACEHOLDER
IS_PLACEHOLDER = "PLACEHOLDER" in URL.upper()
QUIET = 4
LID, BALM = "#171614", "#EDE9E1"
PT = 100 / 72.0  # 1 pt in sticker units (100 units = 1 inch)

qr = segno.make(URL, error="m", micro=False)
n = qr.symbol_size(scale=1, border=0)[0]
total = n + 2 * QUIET
scale = max(10, 1650 // total)
qr.save(os.path.join(HERE, "qr.png"), scale=scale, border=QUIET, dark="#000000", light="#ffffff")
matrix = [list(r) for r in qr.matrix]
font_path = os.path.join(HERE, "..", "fonts", "hanken-grotesk-latin.woff2")
font_b64 = base64.b64encode(open(font_path, "rb").read()).decode()

def qr_path(x0, y0, mod):
    out = []
    for r, row in enumerate(matrix):
        c = 0
        while c < n:
            if row[c]:
                s = c
                while c < n and row[c]: c += 1
                out.append("M%.3f %.3fh%.3fv%.3fh-%.3fz" % (x0 + s * mod, y0 + r * mod, (c - s) * mod, mod, (c - s) * mod))
            else:
                c += 1
    return "".join(out)

def layout(d_in):
    D = d_in * 100.0; R = D / 2; safe = R - 0.06 * 100  # keep 0.06 in off the cut line
    name_fs = (9.5 if d_in < 1.75 else 12) * PT
    cta_fs = (8.0 if d_in < 1.75 else 10.0) * PT
    cap = 0.72
    name_w = 8 * 0.58 * name_fs           # "Corrimar", Hanken 600
    cta_w = 15 * 0.56 * cta_fs + 14 * 0.04 * cta_fs  # "Scan to reserve", 500, +0.04em tracking
    gap = 0.03 * D
    best = None
    def half_chord(y): dy = abs(y - R); return math.sqrt(max(0, safe ** 2 - dy ** 2))
    for s10 in range(300, int(D * 10)):
        s = s10 / 10.0
        h = cap * name_fs + gap + s + gap + cap * cta_fs
        for t10 in range(0, int((D - h) * 10)):
            top = t10 / 10.0
            plate_top = top + cap * name_fs + gap
            plate_bot = plate_top + s
            cta_base = plate_bot + gap + cap * cta_fs
            if (half_chord(top) >= name_w / 2 and half_chord(cta_base + 0.22 * cta_fs) >= cta_w / 2 and
                    math.hypot(s / 2, R - plate_top) <= safe and math.hypot(s / 2, plate_bot - R) <= safe):
                best = (s, top + cap * name_fs, plate_top, cta_base)
                break
    s, name_base, plate_top, cta_base = best
    return D, R, s, name_base, plate_top, cta_base, name_fs, cta_fs

def sticker(d_in, fname):
    D, R, s, name_base, py, cta_base, name_fs, cta_fs = layout(d_in)
    mod = s / total; px = R - s / 2
    svg = f'''<?xml version="1.0" encoding="UTF-8"?>
<!-- Corrimar sample-lid sticker, {d_in} in round. Artboard = cut line; extend the dark ground for the printer's bleed. -->
<!-- Encodes: {escape(URL)}{" (PLACEHOLDER: regenerate from the final live URL before printing)" if IS_PLACEHOLDER else ""} -->
<!-- QR version {qr.version} ({n}x{n}), error {qr.error}, {QUIET}-module quiet zone, module {mod / 100 * 25.4:.2f} mm. Text: Hanken Grotesk {name_fs / PT:.1f} pt / {cta_fs / PT:.1f} pt; outline before print. -->
<svg xmlns="http://www.w3.org/2000/svg" width="{d_in}in" height="{d_in}in" viewBox="0 0 {D:.0f} {D:.0f}">
  <title>Corrimar sample sticker, {d_in} in round</title>
  <defs><style>@font-face{{font-family:'Hanken Grotesk';src:url(data:font/woff2;base64,{font_b64}) format('woff2');font-weight:100 900;}}</style></defs>
  <circle cx="{R}" cy="{R}" r="{R}" fill="{LID}"/>
  <text x="{R}" y="{name_base:.2f}" text-anchor="middle" font-family="Hanken Grotesk, Helvetica, Arial, sans-serif" font-size="{name_fs:.2f}" font-weight="600" letter-spacing="{-0.02 * name_fs:.2f}" fill="{BALM}">Corrimar</text>
  <rect x="{px:.3f}" y="{py:.3f}" width="{s:.3f}" height="{s:.3f}" rx="{1.2 * mod:.2f}" fill="{BALM}"/>
  <path d="{qr_path(px + QUIET * mod, py + QUIET * mod, mod)}" fill="{LID}" shape-rendering="crispEdges"/>
  <text x="{R}" y="{cta_base:.2f}" text-anchor="middle" font-family="Hanken Grotesk, Helvetica, Arial, sans-serif" font-size="{cta_fs:.2f}" font-weight="500" letter-spacing="{0.04 * cta_fs:.2f}" fill="{BALM}">Scan to reserve</text>
</svg>
'''
    open(os.path.join(HERE, fname), "w", encoding="utf-8").write(svg)
    return mod, s, name_fs / PT, cta_fs / PT

print("URL:", URL, f"({len(URL)} chars)", "(PLACEHOLDER)" if IS_PLACEHOLDER else "")
print("QR version:", qr.version, f"({n}x{n})", "error:", qr.error)
for d, f in [(1.5, "sticker-1.5in-round.svg"), (2, "sticker-2in-round.svg")]:
    mod, s, a, b = sticker(d, f)
    print(f"{d} in: code+quiet zone {s / 100:.2f} in, module {mod / 100 * 25.4:.2f} mm, name {a:.1f} pt, CTA {b:.1f} pt")
