"""m.STUDIO labels for the NIIMBOT D11 on 30 × 14 mm clear labels.

The D11 prints a 12 mm wide band, so every design keeps its ink inside the middle
12 mm of the 14 mm label (1 mm margin top and bottom, plus 1 mm safety).
Thermal print is black only: no grey, no gradients.

Usage: python3 generate.py ../../instagram/logo-path.txt out-dir
Writes one SVG per design (30 × 14 mm, 1 unit = 0.1 mm).
"""
import os
import sys

LOGO = open(sys.argv[1]).read().strip()
OUT = sys.argv[2]
os.makedirs(OUT, exist_ok=True)

W, H = 300, 140  # tenths of a millimetre
SAFE_TOP, SAFE_BOTTOM = 20, 120  # ink stays within 2–12 mm: the printable 12 mm minus 1 mm safety
LOGO_W, LOGO_H = 3200, 438  # the logo path's own box
MONO_W = 965  # "m." alone


def logo(cx, cy, width, fill="#000", mono=False):
    """The m.STUDIO logo (or just "m.") centred on cx, cy."""
    box = MONO_W if mono else LOGO_W
    s = width / box
    x, y = cx - width / 2, cy - LOGO_H * s / 2
    clip = (
        f'<clipPath id="mono"><rect width="{MONO_W}" height="{LOGO_H}"/></clipPath>' if mono else ""
    )
    return (
        f'<defs>{clip}</defs><g id="Logo" transform="translate({x:.2f} {y:.2f}) scale({s:.5f})"'
        + (' clip-path="url(#mono)"' if mono else "")
        + f'><path fill="{fill}" fill-rule="evenodd" d="{LOGO}"/></g>'
    )


def text(cx, y, body, size, fill="#000", weight=600, track=-0.02):
    return (
        f'<text x="{cx}" y="{y}" font-family="Inter" font-size="{size}" font-weight="{weight}" '
        f'letter-spacing="{size * track:.2f}" fill="{fill}" text-anchor="middle">{body}</text>'
    )


MID = (SAFE_TOP + SAFE_BOTTOM) / 2

DESIGNS = {
    # 1 – the full logo, as large as the band allows
    "01-logo": logo(150, MID, 260),
    # 2 – logo with the claim underneath
    "02-logo-claim": logo(150, MID - 14, 236) + text(150, MID + 34, "We feel your story.", 22, weight=600),
    # 3 – "m." monogram, big
    "03-monogram": logo(150, MID, 160, mono=True),
    # 4 – monogram left, divider, STUDIO-style claim right
    "04-monogram-claim": logo(62, MID, 92, mono=True)
    + '<rect x="122" y="32" width="2" height="76" fill="#000"/>'
    + text(210, MID - 6, "We feel", 26, weight=600)
    + text(210, MID + 24, "your story.", 26, weight=600),
    # 5 – inverted: a solid black bar with the logo knocked out (looks great on clear labels)
    "05-logo-inverse": f'<rect x="6" y="{SAFE_TOP}" width="288" height="{SAFE_BOTTOM - SAFE_TOP}" rx="16" fill="#000"/>'
    + logo(150, MID, 230, fill="#fff"),
}

for name, body in DESIGNS.items():
    with open(os.path.join(OUT, f"{name}.svg"), "w") as f:
        f.write(
            f'<svg xmlns="http://www.w3.org/2000/svg" width="30mm" height="14mm" viewBox="0 0 {W} {H}">'
            f"<title>m.STUDIO – NIIMBOT D11 30×14 – {name}</title>{body}</svg>"
        )
print("done", len(DESIGNS))
