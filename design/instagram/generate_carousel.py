"""m.STUDIO carousel series for Instagram, as Figma-ready SVGs.

Usage: python3 generate_carousel.py logo-path.txt out-dir
"""
import os
import sys
from xml.sax.saxutils import escape

LOGO = open(sys.argv[1]).read().strip()
OUT = sys.argv[2]
os.makedirs(OUT, exist_ok=True)

PAPER, INK, TEXT, MUTED, WHITE = "#E4E3DF", "#121212", "#0A0A0A", "#6E6E6E", "#FFFFFF"
MUTED_DARK = "#828385"
GREYS = ["#8A8A8A", "#9E9E9E", "#767676", "#B0B0B0"]

FORMATS = [
    ("feed-1x1", "Feed 1:1", 1080, 1080, 64, 72),
    ("feed-4x5", "Feed 4:5", 1080, 1350, 72, 80),
    ("feed-3x4", "Feed 3:4", 1080, 1440, 72, 80),
    ("feed-1.91x1", "Feed 1.91:1", 1080, 566, 44, 52),
    ("story-reel-9x16", "Story & Reels 9:16", 1080, 1920, 250, 340),
]
PAD = 72
TOTAL = 10
CAPS = 0.66  # rough advance of Inter Bold capitals, in em


def t(x, y, body, size, fill, weight=600, anchor="start", track=-0.02, name=None, opacity=None):
    ident = f' id="{escape(name)}"' if name else ""
    op = f' fill-opacity="{opacity}"' if opacity is not None else ""
    return (
        f'<text{ident} x="{x:.0f}" y="{y:.0f}" font-family="Inter" font-size="{size:.0f}" font-weight="{weight}" '
        f'letter-spacing="{size * track:.2f}" fill="{fill}"{op} text-anchor="{anchor}">{escape(body)}</text>'
    )


def block(x, y_first, rows, size, fill, weight=700, anchor="start", lh=0.92, track=-0.03, name="Title"):
    spans = "".join(
        f'<tspan x="{x:.0f}" y="{y_first + i * size * lh:.0f}">{escape(r)}</tspan>' for i, r in enumerate(rows)
    )
    return (
        f'<text id="{name}" font-family="Inter" font-size="{size:.0f}" font-weight="{weight}" '
        f'letter-spacing="{size * track:.2f}" fill="{fill}" text-anchor="{anchor}">{spans}</text>'
    )


def fit(text, width, cap):
    return min(cap, width / (len(text) * CAPS))


def logo(x, y, width, fill, anchor="start"):
    s = width / 3200
    if anchor == "end":
        x -= width
    elif anchor == "middle":
        x -= width / 2
    return (
        f'<g id="Logo m.STUDIO" transform="translate({x:.0f} {y:.0f}) scale({s:.5f})">'
        f'<path fill="{fill}" fill-rule="evenodd" d="{LOGO}"/></g>'
    )


def photo(x, y, w, h, r=0, fill=GREYS[0], name="Photo – vložte obrázek", hint=True):
    out = f'<rect id="{escape(name)}" x="{x:.0f}" y="{y:.0f}" width="{w:.0f}" height="{h:.0f}" rx="{r}" fill="{fill}"/>'
    if hint and w > 200 and h > 120 and not (x == 0 and y == 0 and w >= 1080):
        out += t(x + w / 2, y + h / 2 + 9, "FOTKA", 24, WHITE, anchor="middle", name="Hint – smazat", opacity=0.6)
    return out


def shade(W, H, opacity):
    return f'<rect id="Shade" width="{W}" height="{H}" fill="#000" fill-opacity="{opacity}"/>'


def line(x0, x1, y, color, name="Line"):
    return f'<rect id="{name}" x="{x0:.0f}" y="{y:.0f}" width="{x1 - x0:.0f}" height="2" fill="{color}"/>'


def n(i):
    return f"{i:02d}/{TOTAL}"


def footer(W, H, bottom, color, counter="01/10", cta="SWIPE FOR MORE"):
    y = H - bottom
    out = '<g id="Footer">'
    if counter:
        out += t(PAD, y - 18, counter, 24, color, weight=500, track=0, name="Counter")
    out += t(W - PAD, y - 18, cta, 22, color, anchor="end", track=-0.01, name="CTA")
    out += line(PAD, W - PAD, y, color) + "</g>"
    return out


def label(x, y, body, color, anchor="middle", size=26):
    return t(x, y, body, size, color, anchor=anchor, track=-0.01, name="Label")


def small(H):
    return H < 700


# ---------------------------------------------------------------- layouts


def cover(W, H, top, bottom):
    """01 Cover – full photo, centred title, the series opener."""
    b = photo(0, 0, W, H, fill=GREYS[2]) + shade(W, H, 0.28)
    b += label(W / 2, top + 26, "BEHIND THE SHOOT", WHITE)
    big = fit("DRIVE", W - 2 * PAD, H * (0.24 if small(H) else 0.22))
    sm = big * 0.42
    mid = top + (H - bottom - top) * 0.5
    b += t(W / 2, mid - big * 0.62, "NIGHT", sm, WHITE, weight=700, anchor="middle", track=-0.03, name="Kicker")
    b += t(W / 2, mid + big * 0.28, "DRIVE", big, WHITE, weight=700, anchor="middle", track=-0.04, name="Title")
    sub = 24 if small(H) else 26
    b += block(W / 2, mid + big * 0.28 + sub * 2.2, ["A BRAND FILM SHOT", "ON THE STREETS OF PRAGUE"], sub, WHITE,
               weight=600, anchor="middle", lh=1.1, track=-0.01, name="Subtitle")
    b += footer(W, H, bottom, WHITE, counter=n(1), cta="SWIPE TO DISCOVER")
    return b, GREYS[2]


def chapter(W, H, top, bottom):
    """02 Chapter – blurred photo, title left, big number right."""
    b = photo(0, 0, W, H, fill=GREYS[1], name="Photo – vložte obrázek (Layer blur 60)") + shade(W, H, 0.3)
    b += label(W / 2, top + 26, "NIGHT DRIVE", WHITE)
    num = H * 0.2 if small(H) else W * 0.22
    y = top + (H - bottom - top) * 0.55
    b += t(W - PAD, y, "01", num, WHITE, weight=600, anchor="end", track=-0.05, name="Number")
    ts = num * 0.3
    b += block(PAD, y - ts * 0.92, ["THE", "IDEA"], ts, WHITE)
    b += line(PAD, W - PAD, y + 18, WHITE, name="Divider")
    b += footer(W, H, bottom, WHITE, counter=n(3), cta="SWIPE FOR MORE")
    return b, GREYS[1]


def under(W, H, bottom, x0, counter):
    """Counter and CTA below the closing line, for the paper slides."""
    return (
        t(x0, H - bottom + 36, counter, 22, MUTED, weight=500, track=0, name="Counter")
        + t(W - PAD, H - bottom + 36, "SWIPE FOR MORE", 22, MUTED, anchor="end", track=-0.01, name="CTA")
    )


def photo_card(W, H, top, bottom):
    """03 Photo card – rounded photo on paper, caption, title + number."""
    b = ""
    num = H * 0.17 if small(H) else W * 0.12
    base = H - bottom - 30
    if small(H):
        pw = W * 0.5
        b += photo(PAD, top, pw - PAD, H - top - bottom - 84, r=24)
        b += block(PAD, H - bottom - 20 - 22 * 1.15, ["NATURE’S RAW BEAUTY MEETS", "DOCUMENTARY STORYTELLING."], 20,
                   MUTED, weight=600, lh=1.15, track=-0.01, name="Caption")
        x0 = pw + 40
    else:
        ph = (H - top - bottom) * 0.56
        b += photo(PAD, top, W - 2 * PAD, ph, r=32)
        b += block(PAD, top + ph + 40, ["NATURE’S RAW BEAUTY MEETS", "DOCUMENTARY STORYTELLING."], 24, MUTED,
                   weight=600, lh=1.15, track=-0.01, name="Caption")
        x0 = PAD
    ts = num * 0.42
    b += t(W - PAD, base, "02", num, MUTED, weight=600, anchor="end", track=-0.05, name="Number")
    b += block(x0, base - ts * 0.92, ["ON", "SET"], ts, MUTED)
    b += label(x0, base - ts * 1.92 - 12, "NIGHT DRIVE", MUTED, anchor="start", size=22)
    b += line(x0, W - PAD, H - bottom, TEXT, name="Divider")
    b += under(W, H, bottom, x0, n(4))
    return b, PAPER


def duo(W, H, top, bottom):
    """04 Duo – two photos with captions, title + number."""
    b = label(W / 2, top + 26, "FROM THE SET", MUTED)
    gap = 24
    pw = (W - 2 * PAD - gap) / 2
    ph = min(pw, (H - top - bottom) * (0.42 if not small(H) else 0.52))
    py = top + 70
    caps = [["WE STOPPED THE CAR FIVE", "TIMES A NIGHT FOR STILLS."], ["THE CITY NEVER LOOKED", "QUIETER THAN AT 3 AM."]]
    for i in range(2):
        x = PAD + i * (pw + gap)
        b += photo(x, py, pw, ph, r=28, fill=GREYS[i], name=f"Photo {i + 1} – vložte obrázek")
        if not small(H):
            b += block(x + 12, py + ph + 36, caps[i], 22, MUTED, weight=600, lh=1.15, track=-0.01, name=f"Caption {i + 1}")
    if not small(H):
        num = W * 0.12
        base = H - bottom - 30
        ts = num * 0.42
        b += t(W - PAD, base, "02", num, MUTED, weight=600, anchor="end", track=-0.05, name="Number")
        b += block(PAD, base - ts * 0.92, ["ON", "SET"], ts, MUTED)
        b += line(PAD, W - PAD, H - bottom, TEXT, name="Divider")
        b += under(W, H, bottom, PAD, n(5))
    else:
        b += footer(W, H, bottom, TEXT, counter=n(5))
    return b, PAPER


def rows(W, H, y0, y1, items, color, line_color, x0=PAD, x1=None, num_size=None):
    x1 = x1 or W - PAD
    step = (y1 - y0) / len(items)
    ns = num_size or min(step * 0.62, 110)
    ls = min(ns * 0.42, 32)
    out = '<g id="Index">'
    for i, name in enumerate(items):
        base = y0 + step * (i + 1) - 14
        out += t(x0, base - 6, name, ls, color, weight=700, track=-0.02, name=f"Row {i + 1}")
        out += t(x1, base, f"{i + 1:02d}", ns, color, weight=500, anchor="end", track=-0.04, name=f"Number {i + 1}")
        out += line(x0, x1, base + 12, line_color, name=f"Row line {i + 1}")
    return out + "</g>"


INDEX = ["THE IDEA", "ON SET", "BEHIND THE LENS", "THE CITY", "FINAL CUT"]


def index_light(W, H, top, bottom):
    """05 Index – contents of the carousel on paper."""
    count = 3 if small(H) else 5
    b = label(W / 2, top + 26, "NIGHT DRIVE", MUTED)
    b += rows(W, H, top + 50, H - bottom - (64 if small(H) else 120), INDEX[:count], MUTED, TEXT)
    b += footer(W, H, bottom, TEXT, counter=n(2), cta="SWIPE TO DISCOVER")
    return b, PAPER


def index_card(W, H, top, bottom):
    """06 Index card – contents on a rounded paper card over a photo."""
    count = 3 if small(H) else 5
    b = photo(0, 0, W, H, fill=GREYS[3], name="Photo – vložte obrázek (Layer blur 30)")
    b += label(PAD, top + 26, "NIGHT DRIVE", WHITE, anchor="start")
    b += logo(W - PAD, top, 170, WHITE, anchor="end")
    cy0, cy1 = top + 64, H - bottom - 56
    b += f'<rect id="Card" x="{PAD}" y="{cy0}" width="{W - 2 * PAD}" height="{cy1 - cy0}" rx="32" fill="{PAPER}"/>'
    inset = 72 if not small(H) else 48
    b += rows(W, H, cy0 + (60 if not small(H) else 10), cy1 - (60 if not small(H) else 24), INDEX[:count], MUTED, TEXT,
              x0=PAD + inset, x1=W - PAD - inset, num_size=None if small(H) else 64)
    b += footer(W, H, bottom, WHITE, counter=n(2), cta="SWIPE TO DISCOVER")
    return b, GREYS[3]


def split(W, H, top, bottom):
    """07 Split – paper header with title + number, photo below."""
    head = H * (0.5 if small(H) else 0.42)
    b = f'<rect id="Paper" width="{W}" height="{head:.0f}" fill="{PAPER}"/>'
    b += photo(0, head, W, H - head, fill=GREYS[0])
    ts = fit("THE LENS", W * 0.6, 120 if not small(H) else 64)
    y = top + ts * 0.82
    b += block(PAD, y, ["BEHIND", "THE LENS"], ts, TEXT)
    b += t(W - PAD, y, "03", ts * 0.8, TEXT, weight=600, anchor="end", track=-0.05, name="Number")
    b += t(PAD, y + ts * 0.92 + 38, "LENSES, LIGHT AND LONG NIGHTS", 26 if not small(H) else 22, TEXT, weight=600, track=-0.01, name="Subtitle")
    if not small(H):
        b += block(PAD, head - 56, ["SHOT ON ANAMORPHIC GLASS,", "LIT BY THE CITY ITSELF."], 22, TEXT, weight=500, lh=1.15,
                   track=-0.01, name="Caption")
    b += footer(W, H, bottom, WHITE, counter=n(6))
    return b, PAPER


def band(W, H, top, bottom):
    """08 Band – photo with a paper band across the middle."""
    b = photo(0, 0, W, H, fill=GREYS[1])
    bh = H * (0.34 if small(H) else 0.24)
    by = (H - bh) / 2 + (0 if small(H) else (top - bottom) / 4)
    b += label(W / 2, top + 26, "PRAGUE", WHITE)
    b += f'<rect id="Band" x="0" y="{by:.0f}" width="{W}" height="{bh:.0f}" fill="{PAPER}"/>'
    ts = fit("04. THE CITY", W - 2 * PAD - 120, 84)
    b += t(W / 2, by + bh / 2 + ts * 0.1, "04. THE CITY", ts, TEXT, weight=700, anchor="middle", track=-0.03, name="Title")
    b += block(W / 2, by + bh / 2 + ts * 0.1 + 44, ["FROM THE QUIET COURTYARDS OF MALÁ STRANA", "TO THE NEON OF AFTER-HOURS ŽIŽKOV."],
               20 if small(H) else 22, TEXT, weight=600, anchor="middle", lh=1.15, track=-0.01, name="Subtitle")
    b += footer(W, H, bottom, WHITE, counter=n(7))
    return b, GREYS[1]


def grid(W, H, top, bottom):
    """09 Grid – four photos edge to edge."""
    b = ""
    for i in range(4):
        x, y = (i % 2) * W / 2, (i // 2) * H / 2
        b += photo(x, y, W / 2, H / 2, fill=GREYS[i], name=f"Photo {i + 1} – vložte obrázek")
    b += label(W / 2, top + 26, "THE CITY", WHITE)
    b += footer(W, H, bottom, WHITE, counter=n(8))
    return b, GREYS[0]


def text_slide(W, H, top, bottom):
    """10 Text – a short story on a dark, blurred background."""
    b = photo(0, 0, W, H, fill="#3A3A3A", name="Photo – vložte obrázek (Layer blur 80)", hint=False)
    b += shade(W, H, 0.45)
    b += label(PAD, top + 26, "05 — FINAL CUT", WHITE, anchor="start")
    b += logo(W - PAD, top, 170, WHITE, anchor="end")
    size = 22 if small(H) else 26
    col = W * (0.5 if small(H) else 0.42)
    x = (W - col) / 2
    p1 = ["WE FEEL INSPIRED BY THE", "BEAUTIFUL CHAOS OF THE CITY."]
    p2 = ["ROAMING THE STREETS AND", "FINDING NEW TEXTURES, LIGHT", "AND EVERYTHING IN BETWEEN.",
          "EVERYWHERE YOU LOOK, THERE’S", "A STORY UNFOLDING."]
    if small(H):
        p2 = p2[:3]
    total = (len(p1) + len(p2)) * size * 1.2 + size * 3
    y = top + (H - bottom - top - total) / 2 + size
    b += block(x, y, p1, size, WHITE, weight=600, lh=1.2, track=-0.01, name="Paragraph 1")
    b += block(x, y + (len(p1) + 2) * size * 1.2, p2, size, WHITE, weight=600, lh=1.2, track=-0.01, name="Paragraph 2")
    b += footer(W, H, bottom, WHITE, counter=n(9))
    return b, "#3A3A3A"


def end(W, H, top, bottom):
    """10 End – logo, call to action, the address."""
    b = label(W / 2, top + 26, "NIGHT DRIVE", MUTED_DARK)
    lw = min(W * 0.62, (H - top - bottom) * 2.4)
    mid = top + (H - bottom - top) * 0.46
    b += logo(W / 2, mid - lw * 438 / 3200, lw, WHITE, anchor="middle")
    size = 30 if not small(H) else 24
    b += t(W / 2, mid + size * 2.4, "SEE THE FULL FILM", size, WHITE, weight=700, anchor="middle", track=-0.02, name="CTA title")
    pill_w, pill_h = (320, 64) if not small(H) else (260, 52)
    py = mid + size * 3.4
    b += (
        f'<g id="Button"><rect x="{(W - pill_w) / 2:.0f}" y="{py:.0f}" width="{pill_w}" height="{pill_h}" rx="{pill_h / 2}" fill="{WHITE}"/>'
        + t(W / 2, py + pill_h / 2 + 9, "LINK IN BIO", 24 if not small(H) else 20, TEXT, weight=700, anchor="middle", track=-0.01)
        + "</g>"
    )
    b += footer(W, H, bottom, MUTED_DARK, counter=n(10), cta="MSTUDIO.COMPANY")
    return b, INK


LAYOUTS = [
    ("01-cover", "Cover", cover),
    ("02-index", "Index", index_light),
    ("02b-index-card", "Index card (alternative)", index_card),
    ("03-chapter", "Chapter", chapter),
    ("04-photo-card", "Photo card", photo_card),
    ("05-duo", "Duo", duo),
    ("06-split", "Split", split),
    ("07-band", "Band", band),
    ("08-grid", "Grid", grid),
    ("09-text", "Text", text_slide),
    ("10-end", "End", end),
]

for slug, fname, W, H, top, bottom in FORMATS:
    folder = os.path.join(OUT, slug)
    os.makedirs(folder, exist_ok=True)
    for lslug, lname, fn in LAYOUTS:
        body, bg = fn(W, H, top, bottom)
        name = f"Carousel {lname} – {fname} ({W}×{H})"
        with open(os.path.join(folder, f"{lslug}.svg"), "w") as f:
            f.write(
                f'<svg xmlns="http://www.w3.org/2000/svg" width="{W}" height="{H}" viewBox="0 0 {W} {H}">'
                f"<title>{escape(name)}</title>"
                f'<rect id="Background" width="{W}" height="{H}" fill="{bg}"/>{body}</svg>'
            )
print("done")
