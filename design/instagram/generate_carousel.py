"""m.STUDIO carousel series for Instagram, as Figma-ready SVGs, in the website's own style.

Usage: python3 generate_carousel.py logo-path.txt out-dir
"""
import os
import sys
from xml.sax.saxutils import escape

LOGO = open(sys.argv[1]).read().strip()
OUT = sys.argv[2]
os.makedirs(OUT, exist_ok=True)

# Website tokens (light) and the ink box / footer.
BG, TEXT, MUTED, LINE, SURFACE = "#FFFFFF", "#0A0A0A", "#757575", "#A8A8A8", "#EBEBEB"
INK, INK_TEXT, INK_MUTED, FOOT_LOGO = "#121212", "#F2F2F2", "#828385", "#2E2E2E"
PHOTO = ["#CFCFCF", "#C2C2C2", "#B6B6B6", "#D8D8D8"]

FORMATS = [
    ("feed-1x1", "Feed 1:1", 1080, 1080, 64, 64),
    ("feed-4x5", "Feed 4:5", 1080, 1350, 72, 72),
    ("feed-3x4", "Feed 3:4", 1080, 1440, 72, 72),
    ("feed-1.91x1", "Feed 1.91:1", 1080, 566, 44, 44),
    ("story-reel-9x16", "Story & Reels 9:16", 1080, 1920, 250, 340),
]
PAD = 64
GLYPH = 0.5  # rough advance of Inter Medium, in em, at the website's tight tracking


def wide(H):
    return H < 700


def tall(W, H):
    return H / W > 1.5


def t(x, y, body, size, fill, weight=500, anchor="start", track=-0.04, name=None):
    ident = f' id="{escape(name)}"' if name else ""
    return (
        f'<text{ident} x="{x:.0f}" y="{y:.0f}" font-family="Inter" font-size="{size:.0f}" font-weight="{weight}" '
        f'letter-spacing="{size * track:.2f}" fill="{fill}" text-anchor="{anchor}">{escape(body)}</text>'
    )


def para(x, y_first, rows, size, lh=1.1, weight=500, track=-0.05, anchor="start", name="Text"):
    """Rows of (text, colour), or of [(text, colour), …] for two-tone lines."""
    out = []
    for i, row in enumerate(rows):
        segs = row if isinstance(row, list) else [row]
        spans = "".join(f'<tspan fill="{c}">{escape(s)}</tspan>' for s, c in segs)
        out.append(f'<tspan x="{x:.0f}" y="{y_first + i * size * lh:.0f}">{spans}</tspan>')
    return (
        f'<text id="{name}" font-family="Inter" font-size="{size:.0f}" font-weight="{weight}" '
        f'letter-spacing="{size * track:.2f}" text-anchor="{anchor}">{"".join(out)}</text>'
    )


def fit(text, width, cap):
    return min(cap, width / (len(text) * GLYPH))


def logo(x, y, width, fill, anchor="start"):
    if anchor == "end":
        x -= width
    elif anchor == "middle":
        x -= width / 2
    return (
        f'<g id="Logo m.STUDIO" transform="translate({x:.0f} {y:.0f}) scale({width / 3200:.5f})">'
        f'<path fill="{fill}" fill-rule="evenodd" d="{LOGO}"/></g>'
    )


def photo(x, y, w, h, r, fill=PHOTO[0], name="Photo – vložte obrázek"):
    out = f'<rect id="{escape(name)}" x="{x:.0f}" y="{y:.0f}" width="{w:.0f}" height="{h:.0f}" rx="{r}" fill="{fill}"/>'
    if w > 160 and h > 100:
        out += t(x + w / 2, y + h / 2 + 9, "Fotka", 26, "#8F8F8F", anchor="middle", name="Hint – smazat")
    return out


def pill(x, y, label, dark=True, anchor="start", size=26, name="Button"):
    h = size * 2.4
    w = len(label) * size * 0.55 + size * 2.6
    if anchor == "end":
        x -= w
    bg, fg = (TEXT, BG) if dark else (SURFACE, TEXT)
    return (
        f'<g id="{name}"><rect x="{x:.0f}" y="{y:.0f}" width="{w:.0f}" height="{h:.0f}" rx="{h / 2:.0f}" fill="{bg}"/>'
        + t(x + w / 2, y + h / 2 + size * 0.36, label, size, fg, anchor="middle", track=-0.03)
        + "</g>"
    )


def header(W, top, label, index, fg=TEXT, muted=MUTED):
    """The website's section label: /Label ………… (01)."""
    return (
        '<g id="Section label">'
        + t(PAD, top + 26, f"/{label}", 28, fg, track=-0.03, name="Label")
        + t(W - PAD, top + 26, f"({index:02d})", 28, muted, anchor="end", track=-0.02, name="Index")
        + "</g>"
    )


def footer(W, H, bottom, fg=TEXT, muted=MUTED, right="mstudio.company"):
    lw = 150
    return (
        '<g id="Footer">'
        + logo(PAD, H - bottom - lw * 438 / 3200, lw, fg)
        + t(W - PAD, H - bottom, right, 24, muted, anchor="end", track=-0.02, name="Web")
        + "</g>"
    )


def body_box(H, top, bottom):
    """Space between the section label and the footer."""
    gap = 44 if wide(H) else 70
    return top + gap, H - bottom - gap


# ---------------------------------------------------------------- slides


def cover(W, H, top, bottom):
    b = header(W, top, "Behind the shoot", 1)
    y0, y1 = body_box(H, top, bottom)
    size = fit("Night drive", W - 2 * PAD, 96 if wide(H) else 230)
    b += t(PAD - size * 0.04, y0 + size * 0.78, "Night drive", size, TEXT, track=-0.07, name="Title")
    tag = 24 if wide(H) else 30
    ty = y0 + size * 0.78 + tag * (1.6 if wide(H) else 1.9)
    b += para(W - PAD, ty, [("A brand film shot", MUTED), ("on the streets of Prague.", MUTED)], tag, lh=1.3,
              track=-0.04, anchor="end", name="Tagline")
    py = ty + tag * 1.6
    b += photo(PAD, py, W - 2 * PAD, y1 - py, 28 if wide(H) else 40)
    b += footer(W, H, bottom, right="Swipe →")
    return b, BG


def contents(W, H, top, bottom):
    b = header(W, top, "Contents", 2)
    y0, y1 = body_box(H, top, bottom)
    items = ["The idea", "On set", "Behind the lens", "The city", "What we did"]
    items = items[:3] if wide(H) else items
    step = min((y1 - y0) / len(items), 210)
    size = min(step * 0.42, 66)
    b += '<g id="Menu list">'
    for i, item in enumerate(items):
        base = y0 + step * (i + 1) - 26
        b += t(PAD, base, item, size, TEXT, weight=600, track=-0.04, name=f"Item {i + 1}")
        b += t(W - PAD, base, f"({i + 1:02d})", 26, TEXT, anchor="end", track=-0.02, name=f"Number {i + 1}")
        b += f'<rect id="Line {i + 1}" x="{PAD}" y="{base + 24:.0f}" width="{W - 2 * PAD}" height="2" fill="{LINE}"/>'
    b += "</g>" + footer(W, H, bottom)
    return b, BG


def chapter(W, H, top, bottom):
    b = header(W, top, "Chapter one", 3, INK_TEXT, INK_MUTED)
    y0, y1 = body_box(H, top, bottom)
    size = fit("The idea.", W * 0.8, 200 if not wide(H) else 110)
    lead = 26 if wide(H) else 38
    rows = [
        ("Every film starts with listening.", INK_MUTED),
        ("We dug into the brand, the audience", INK_MUTED),
        [("and what really needed ", INK_MUTED), ("to be said.", INK_TEXT)],
    ]
    ly = y1 - (len(rows) - 1) * lead * 1.3
    b += para(PAD, ly, rows, lead, lh=1.3, track=-0.04, name="Lead")
    b += t(PAD - size * 0.04, ly - lead * 1.3 - 24, "The idea.", size, INK_TEXT, track=-0.07, name="Title")
    b += footer(W, H, bottom, INK_TEXT, INK_MUTED)
    return b, INK


def card(x, y, w, h, title, year, scope, fill, compact=False):
    """The website's project card: surface frame, photo, title + year, scope."""
    info = 116 if not compact else 92
    ts = 34 if not compact else 26
    out = f'<g id="Card – {escape(title)}">'
    out += f'<rect id="Card" x="{x:.0f}" y="{y:.0f}" width="{w:.0f}" height="{h:.0f}" rx="36" fill="{SURFACE}"/>'
    out += photo(x + 12, y + 12, w - 24, h - 24 - info, 26, fill)
    out += t(x + 26, y + h - info + ts + 16, title, ts, TEXT, weight=600, track=-0.04, name="Title")
    out += t(x + w - 26, y + h - info + ts + 16, year, ts * 0.8, TEXT, anchor="end", track=-0.03, name="Year")
    out += t(x + 26, y + h - (28 if not compact else 22), scope, ts * 0.72, MUTED, track=-0.03, name="Scope")
    return out + "</g>"


def project(W, H, top, bottom):
    b = header(W, top, "On set", 4)
    y0, y1 = body_box(H, top, bottom)
    b += card(PAD, y0, W - 2 * PAD, y1 - y0, "Night drive", "2026", "Brand film · Porsche", PHOTO[0], wide(H))
    b += footer(W, H, bottom)
    return b, BG


def duo(W, H, top, bottom):
    b = header(W, top, "On set", 5)
    y0, y1 = body_box(H, top, bottom)
    gap = 16
    cards = [("Location scout", "Day 1", "Vyšehrad, 3 am"), ("First take", "Day 2", "Karlův most")]
    if tall(W, H):
        ch = (y1 - y0 - gap) / 2
        for i, (a, c, d) in enumerate(cards):
            b += card(PAD, y0 + i * (ch + gap), W - 2 * PAD, ch, a, c, d, PHOTO[i + 1])
    else:
        cw = (W - 2 * PAD - gap) / 2
        for i, (a, c, d) in enumerate(cards):
            b += card(PAD + i * (cw + gap), y0, cw, y1 - y0, a, c, d, PHOTO[i + 1], compact=True)
    b += footer(W, H, bottom)
    return b, BG


def photo_statement(W, H, top, bottom):
    b = header(W, top, "Behind the lens", 6)
    y0, y1 = body_box(H, top, bottom)
    b += f'<rect id="Photo – vložte obrázek" x="{PAD}" y="{y0:.0f}" width="{W - 2 * PAD}" height="{y1 - y0:.0f}" rx="40" fill="#9A9A9A"/>'
    size = 40 if wide(H) else 52
    b += t(W / 2, (y0 + y1) / 2 + size * 0.36, "We feel your story.", size, "#FFFFFF",
           weight=600, anchor="middle", track=-0.04, name="Statement")
    return b + footer(W, H, bottom), BG


def two_tone(W, H, top, bottom):
    b = header(W, top, "The city", 7)
    y0, y1 = body_box(H, top, bottom)
    size = fit("everything in between.", W - 2 * PAD, 96 if not wide(H) else 52)
    rows = [
        ("Prague after dark.", TEXT),
        ("Quiet courtyards,", MUTED),
        ("neon streets and", MUTED),
        ("everything in between.", MUTED),
    ]
    btn = 26 if not wide(H) else 20
    by = y1 - btn * 2.4
    ty = by - (50 if not wide(H) else 30) - (len(rows) - 1) * size * 1.1
    b += para(PAD, ty, rows, size, lh=1.1, track=-0.05, name="Statement")
    b += pill(PAD, by, "Watch the film  +", dark=False, size=btn)
    return b + footer(W, H, bottom), BG


def services(W, H, top, bottom):
    b = header(W, top, "What we did", 8)
    y0, y1 = body_box(H, top, bottom)
    b += f'<rect id="Ink box" x="{PAD}" y="{y0:.0f}" width="{W - 2 * PAD}" height="{y1 - y0:.0f}" rx="40" fill="{INK}"/>'
    items = ["Concept", "Shoot", "Edit", "Colour grade"]
    items = items[:3] if wide(H) else items
    inset = 48 if not wide(H) else 32
    room = y1 - y0 - 2 * inset - (60 if not wide(H) else 44)
    size = min(room / len(items) / 1.35, 88)
    step = size * 1.35
    start = y1 - inset - step * (len(items) - 1)
    for i, item in enumerate(items):
        base = start + i * step
        b += t(PAD + inset, base, item, size, INK_TEXT, weight=600, track=-0.05, name=f"Service {i + 1}")
        cx, cy, arm = W - PAD - inset - 20, base - size * 0.34, 18
        b += (
            f'<g id="Toggle {i + 1}" opacity="0.45"><rect x="{cx - arm:.0f}" y="{cy - 1.5:.0f}" width="{2 * arm}" height="3" fill="{INK_TEXT}"/>'
            f'<rect x="{cx - 1.5:.0f}" y="{cy - arm:.0f}" width="3" height="{2 * arm}" fill="{INK_TEXT}"/></g>'
        )
    b += t(PAD + inset, y0 + inset + 22, "Production by m.STUDIO", 26 if not wide(H) else 22, INK_MUTED, track=-0.03, name="Kicker")
    return b + footer(W, H, bottom), BG


def grid(W, H, top, bottom):
    b = header(W, top, "The city", 9)
    y0, y1 = body_box(H, top, bottom)
    gap = 12
    cw, ch = (W - 2 * PAD - gap) / 2, (y1 - y0 - gap) / 2
    for i in range(4):
        b += photo(PAD + (i % 2) * (cw + gap), y0 + (i // 2) * (ch + gap), cw, ch, 28, PHOTO[i], f"Photo {i + 1} – vložte obrázek")
    return b + footer(W, H, bottom), BG


def end(W, H, top, bottom):
    b = header(W, top, "Night drive", 10, INK_TEXT, INK_MUTED)
    y0, _ = body_box(H, top, bottom)
    lw = W - 2 * PAD
    lh = lw * 438 / 3200
    b += logo(PAD, H - bottom - lh, lw, FOOT_LOGO)
    size = 40 if wide(H) else 60
    ly = y0 + size * 0.9
    b += para(PAD, ly, [("Have a story to tell?", INK_MUTED), ("We make you feel it.", INK_TEXT)], size, lh=1.12,
              track=-0.05, name="Lead")
    b += pill(PAD, ly + size * 1.12 + (44 if not wide(H) else 26), "Start a project  +", dark=False, size=26 if not wide(H) else 20)
    b += t(W - PAD, ly, "mstudio.company", 26 if not wide(H) else 22, INK_TEXT, anchor="end", weight=600, track=-0.03, name="Web")
    return b, INK


SLIDES = [
    ("01-cover", "Cover", cover),
    ("02-contents", "Contents", contents),
    ("03-chapter", "Chapter", chapter),
    ("04-project", "Project card", project),
    ("05-duo", "Duo", duo),
    ("06-photo", "Photo statement", photo_statement),
    ("07-statement", "Two-tone statement", two_tone),
    ("08-services", "What we did", services),
    ("09-grid", "Grid", grid),
    ("10-end", "End", end),
]

for slug, fname, W, H, top, bottom in FORMATS:
    folder = os.path.join(OUT, slug)
    os.makedirs(folder, exist_ok=True)
    for sslug, sname, fn in SLIDES:
        body, bg = fn(W, H, top, bottom)
        name = f"Carousel {sname} – {fname} ({W}×{H})"
        with open(os.path.join(folder, f"{sslug}.svg"), "w") as f:
            f.write(
                f'<svg xmlns="http://www.w3.org/2000/svg" width="{W}" height="{H}" viewBox="0 0 {W} {H}">'
                f"<title>{escape(name)}</title>"
                f'<rect id="Background" width="{W}" height="{H}" fill="{bg}"/>{body}</svg>'
            )
print("done")
