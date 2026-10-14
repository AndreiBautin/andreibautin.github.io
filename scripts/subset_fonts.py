"""Rebuilds dist/fonts from assets/fonts (Google's full Latin subsets),
keeping only the characters the site can show. The hero text is the
largest paint and waits on Manrope, so every byte here is on the LCP path.

Run with: python scripts/subset_fonts.py  (needs fonttools and brotli)
Add a range below if new copy uses a character outside it; verify fails
when a page uses a character the fonts no longer carry.
"""
from pathlib import Path
from fontTools import subset

ROOT = Path(__file__).resolve().parent.parent
# ASCII, nbsp, (c), middle dot, dashes, curly quotes, ellipsis, bullet,
# arrows, the sparkle, multiplication sign.
UNICODES = "U+0020-007E,U+00A0,U+00A9,U+00B7,U+00D7,U+2013-2014,U+2018-2019,U+201C-201D,U+2022,U+2026,U+2190-2193,U+2197,U+2726"

for src in sorted((ROOT / "assets/fonts").glob("*.woff2")):
    out = ROOT / "dist/fonts" / src.name
    subset.main([str(src), f"--unicodes={UNICODES}", "--flavor=woff2", "--layout-features=kern,liga,calt",
                 "--no-hinting", "--desubroutinize", f"--output-file={out}"])
    print(f"{src.name}: {src.stat().st_size} -> {out.stat().st_size} bytes")
