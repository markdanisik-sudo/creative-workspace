"""Instagram templates for m.STUDIO as Figma-ready SVGs (live text, named layers)."""
import os, sys
from xml.sax.saxutils import escape

LOGO = open(sys.argv[1]).read()
OUT = sys.argv[2]
os.makedirs(OUT, exist_ok=True)

WHITE, TEXT, MUTED, SURFACE = "#FFFFFF", "#0A0A0A", "#757575", "#EBEBEB"
INK, INK_TEXT, INK_MUTED = "#121212", "#F2F2F2", "#828385"

FORMATS = [
    # slug, name, W, H, top, bottom  (story keeps clear of Instagram's own UI)
    ("feed-4x5", "Feed 4:5", 1080, 1350, 64, 64),
    ("story-reel-9x16", "Story & Reels 9:16", 1080, 1920, 250, 340),
    ("landscape-16x9", "Landscape 16:9", 1920, 1080, 64, 64),
]
PAD = 64


def text(x, y, body, size, fill, weight=500, anchor="start", track=-0.04, name=None):
    ident = f' id="{escape(name)}"' if name else ""
    return (
        f'<text{ident} x="{x:.0f}" y="{y:.0f}" font-family="Inter" font-size="{size:.0f}" '
        f'font-weight="{weight}" letter-spacing="{size * track:.2f}" fill="{fill}" '
        f'text-anchor="{anchor}">{escape(body)}</text>'
    )


def lines(x, y_last, rows, size, fill, lh=1.05, weight=500, name="Headline"):
    """Bottom-aligned multi-line text: the last row sits on y_last."""
    first = y_last - (len(rows) - 1) * size * lh
    spans = "".join(
        f'<tspan x="{x:.0f}" y="{first + i * size * lh:.0f}">{escape(r)}</tspan>' for i, r in enumerate(rows)
    )
    return (
        f'<text id="{name}" font-family="Inter" font-size="{size:.0f}" font-weight="{weight}" '
        f'letter-spacing="{size * -0.05:.2f}" fill="{fill}">{spans}</text>'
    )


def logo(x, y, width, fill):
    s = width / 3200
    return (
        f'<g id="Logo m.STUDIO" transform="translate({x:.0f} {y:.0f}) scale({s:.5f})">'
        f'<path fill="{fill}" fill-rule="evenodd" d="{LOGO}"/></g>'
    )


def photo(x, y, w, h, r, fill="#BDBDBD", hint=True):
    out = f'<rect id="Photo – vložte obrázek" x="{x:.0f}" y="{y:.0f}" width="{w:.0f}" height="{h:.0f}" rx="{r}" fill="{fill}"/>'
    if hint:
        out += text(x + w / 2, y + h / 2 + 10, "Fotka / video", 30, "#8F8F8F", anchor="middle", name="Hint – smazat")
    return out


def svg(W, H, name, body, bg):
    return (
        f'<svg xmlns="http://www.w3.org/2000/svg" width="{W}" height="{H}" viewBox="0 0 {W} {H}">'
        f'<title>{escape(name)}</title>'
        f'<rect id="Background" width="{W}" height="{H}" fill="{bg}"/>{body}</svg>'
    )


def work(W, H, top, bottom):
    """/Work: project card like the website's Projects grid."""
    lw = 200 if H > 600 else 170
    lh = lw * 438 / 3200
    head = logo(PAD, top, lw, TEXT) + text(W - PAD, top + lh, "(01)", 28, MUTED, anchor="end", name="Counter")
    title_size = 64 if H > 600 else 46
    foot_h = title_size + 70
    py = top + lh + (40 if H > 600 else 28)
    ph = H - bottom - foot_h - py
    body = head + photo(PAD, py, W - 2 * PAD, ph, 40)
    ty = H - bottom - 52
    body += text(PAD, ty, "Porsche", title_size, TEXT, weight=600, name="Title")
    body += text(W - PAD, ty, "2026", title_size * 0.6, TEXT, name="Year", anchor="end", track=-0.03)
    body += text(PAD, H - bottom, "Brand film · Commercial", 30, MUTED, name="Scope", track=-0.03)
    return body, WHITE


def statement(W, H, top, bottom):
    """/Statement: the dark ink box with one big sentence."""
    size = min(W * 0.112, H * 0.15)
    lw = 200 if H > 600 else 170
    body = text(PAD, top + 28, "/Approach", 30, INK_TEXT, name="Label")
    body += text(W - PAD, top + 28, "(02)", 30, INK_MUTED, anchor="end", name="Counter")
    foot = H - bottom
    body += logo(PAD, foot - lw * 438 / 3200, lw, INK_TEXT)
    body += lines(PAD, foot - (90 if H > 600 else 60), ["Story first.", "Then the camera."], size, INK_TEXT)
    return body, INK


def fullbleed(W, H, top, bottom):
    """/Photo: full-bleed image, white logo, tagline and pill."""
    body = photo(0, 0, W, H, 0, fill="#8A8A8A")
    body += (
        '<defs><linearGradient id="fade" x1="0" y1="0" x2="0" y2="1">'
        '<stop offset="0.45" stop-color="#000" stop-opacity="0"/>'
        '<stop offset="1" stop-color="#000" stop-opacity="0.55"/></linearGradient></defs>'
        f'<rect id="Shade" width="{W}" height="{H}" fill="url(#fade)"/>'
    )
    lw = 220 if H > 600 else 170
    body += logo(PAD, top, lw, "#FFFFFF")
    size = min(W * 0.085, H * 0.13)
    pill_h, pill_w = (68, 300) if H > 600 else (54, 250)
    py = H - bottom - pill_h
    body += (
        f'<g id="Button"><rect x="{PAD}" y="{py}" width="{pill_w}" height="{pill_h}" rx="{pill_h / 2}" fill="#FFFFFF"/>'
        + text(PAD + pill_w / 2, py + pill_h / 2 + 10, "Watch the film", 28 if H > 600 else 24, TEXT, anchor="middle", track=-0.03)
        + "</g>"
    )
    body += lines(PAD, py - (44 if H > 600 else 28), ["We feel", "your story."], size, "#FFFFFF")
    return body, "#8A8A8A"


LAYOUTS = [("work", "Work", work), ("statement", "Statement", statement), ("photo", "Photo", fullbleed)]

for slug, fname, W, H, top, bottom in FORMATS:
    for lslug, lname, fn in LAYOUTS:
        body, bg = fn(W, H, top, bottom)
        name = f"{fname} – {lname} ({W}×{H})"
        path = os.path.join(OUT, f"{slug}_{lslug}.svg")
        open(path, "w").write(svg(W, H, name, body, bg))
print("done")
