#!/usr/bin/env python3
"""Post-process Parcel's html-inline output into a fully self-contained bundle.

- Inlines the woff2 fonts referenced from the inlined CSS as base64 data URIs.
- Restores the viewport meta tag, which html-inline strips.
"""
import base64
import pathlib
import re
import sys

root = pathlib.Path(__file__).resolve().parent.parent
html_path = root / "bundle.html"

if not html_path.exists():
    print("bundle.html not found — run scripts/bundle-artifact.sh first")
    sys.exit(1)

html = html_path.read_text()

for font in (root / "dist").glob("*.woff2"):
    data = base64.b64encode(font.read_bytes()).decode()
    html = re.sub(rf"url\({re.escape(font.name)}\)", f"url(data:font/woff2;base64,{data})", html)

if "name=viewport" not in html and 'name="viewport"' not in html:
    meta = '<meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover">'
    html = re.sub(r"(<html[^>]*>)", rf"\1{meta}", html, count=1)

html_path.write_text(html)
print("done — fonts inlined:", html.count("data:font/woff2"))
print("viewport meta present:", "viewport" in html and "viewport-fit=cover" in html)