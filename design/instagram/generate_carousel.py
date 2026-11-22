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
    # slug, name, W, H, side margin, top, bottom – feed and landscape keep one margin all round;
    # the story keeps clear of Instagram's own controls at the top and bottom.
    ("feed-4x5", "Feed 4:5", 1080, 1350, 72, 72, 72),
    ("story-reel-9x16", "Story & Reels 9:16", 1080, 1920, 72, 250, 300),
    ("landscape-16x9", "Landscape 16:9", 1920, 1080, 88, 88, 88),
]
PAD = 64
GLYPH = 0.5  # rough advance of Inter Medium, in em, at the website's tight tracking


def wide(H):
    return H < 700


def landscape(W, H):
    return W > H


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


def footer(W, H, bottom, fg=TEXT, muted=MUTED, right="Swipe →"):
    lw = 150
    return (
        '<g id="Footer">'
        + logo(PAD, H - bottom - lw * 438 / 3200, lw, fg)
        + (t(W - PAD, H - bottom, right, 24, muted, anchor="end", track=-0.02, name="Hint") if right else "")
        + "</g>"
    )


def body_box(H, top, bottom):
    """Space between the section label and the footer."""
    return top + 64, H - bottom - 64


# ---------------------------------------------------------------- slides


def cover(W, H, top, bottom):
    b = header(W, top, "Behind the shoot", 1)
    y0, y1 = body_box(H, top, bottom)
    tag_rows = [("A brand film shot", MUTED), ("on the streets of Prague.", MUTED)]
    if landscape(W, H):
        # Title and tagline in the left column, the photo fills the right.
        col = (W - 2 * PAD) * 0.42
        size = fit("Night", col, 260)
        b += para(PAD - size * 0.04, y1 - 30 * 1.3 - 60 - size * 1.0, [("Night", TEXT), ("drive", TEXT)], size,
                  lh=1.0, track=-0.07, name="Title")
        b += para(PAD, y1 - 30 * 1.3, tag_rows, 30, lh=1.3, track=-0.04, name="Tagline")
        px = PAD + col + 40
        b += photo(px, y0, W - PAD - px, y1 - y0, 40)
        return b + footer(W, H, bottom), BG
    size = fit("Night drive", W - 2 * PAD, 230)
    b += t(PAD - size * 0.04, y0 + size * 0.78, "Night drive", size, TEXT, track=-0.07, name="Title")
    ty = y0 + size * 0.78 + 30 * 2.8
    b += para(PAD, ty, tag_rows, 30, lh=1.3, track=-0.04, name="Tagline")
    py = ty + 30 * 1.3 + 48
    b += photo(PAD, py, W - 2 * PAD, y1 - py, 40)
    b += footer(W, H, bottom)
    return b, BG


def tile(x, y, w, h, label, index, title, dark=False, size=48):
    """A bento tile like the m.studio.lab overview: /label (01) on top, title at the foot."""
    bg, fg, mu = (INK, INK_TEXT, INK_MUTED) if dark else (SURFACE, TEXT, MUTED)
    return (
        f'<g id="Tile {index:02d}"><rect x="{x:.0f}" y="{y:.0f}" width="{w:.0f}" height="{h:.0f}" rx="32" fill="{bg}"/>'
        + t(x + 28, y + 46, f"/{label}", 22, fg, track=-0.03, name="Label")
        + t(x + w - 28, y + 46, f"({index:02d})", 22, mu, anchor="end", track=-0.02, name="Index")
        + t(x + 26, y + h - 30, title, size, fg, weight=600, track=-0.05, name="Title")
        + "</g>"
    )


def contents(W, H, top, bottom):
    b = header(W, top, "Contents", 2)
    y0, y1 = body_box(H, top, bottom)
    items = [("Chapter", "The idea"), ("Chapter", "On set"), ("Chapter", "The lens"), ("Chapter", "The city"),
             ("Chapter", "What we did")]
    gap = 12
    x0, w = PAD, W - 2 * PAD
    if wide(H):
        cw = (w - 2 * gap) / 3
        for i, (lab, title) in enumerate(items[:3]):
            b += tile(x0 + i * (cw + gap), y0, cw, y1 - y0, lab, i + 1, title, dark=i == 0, size=38)
        return b + footer(W, H, bottom), BG
    if landscape(W, H):
        bw = (w - gap) * 0.4
        b += tile(x0, y0, bw, y1 - y0, items[0][0], 1, items[0][1], dark=True, size=96)
        cw, ch = (w - bw - 2 * gap) / 2, (y1 - y0 - gap) / 2
        for i, (lab, title) in enumerate(items[1:]):
            b += tile(x0 + bw + gap + (i % 2) * (cw + gap), y0 + (i // 2) * (ch + gap), cw, ch, lab, i + 2, title, size=52)
        return b + footer(W, H, bottom), BG
    big = (y1 - y0 - gap) * (0.42 if not tall(W, H) else 0.36)
    b += tile(x0, y0, w, big, *items[0][:1], 1, items[0][1], dark=True, size=96 if not wide(H) else 60)
    cw, ch = (w - gap) / 2, (y1 - y0 - big - 2 * gap) / 2
    for i, (lab, title) in enumerate(items[1:]):
        b += tile(x0 + (i % 2) * (cw + gap), y0 + big + gap + (i // 2) * (ch + gap), cw, ch, lab, i + 2, title,
                  size=44 if not tall(W, H) else 52)
    return b + footer(W, H, bottom), BG


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
    # Title and lead as one block, centred in the slide.
    block = size * 0.75 + 24 + lead * 1.3 + (len(rows) - 1) * lead * 1.3
    ly = (y0 + y1) / 2 + block / 2 - (len(rows) - 1) * lead * 1.3
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


def corner(x, y, dx, dy, arm=44, stroke=3):
    """One L-shaped frame mark of a camera monitor."""
    return (
        f'<rect x="{min(x, x + dx * arm):.0f}" y="{y - stroke / 2:.0f}" width="{arm}" height="{stroke}" fill="#FFFFFF"/>'
        f'<rect x="{x - stroke / 2:.0f}" y="{min(y, y + dy * arm):.0f}" width="{stroke}" height="{arm}" fill="#FFFFFF"/>'
    )


def monitor(W, H, top, bottom):
    """06 Monitor – the frame as the camera sees it, like the m.studio.lab menu image."""
    b = header(W, top, "Behind the lens", 6)
    y0, y1 = body_box(H, top, bottom)
    x0, x1 = PAD, W - PAD
    b += f'<rect id="Photo – vložte obrázek" x="{x0}" y="{y0:.0f}" width="{x1 - x0}" height="{y1 - y0:.0f}" rx="40" fill="#5E5E5E"/>'
    i = 36 if wide(H) else 48
    osd = 22 if wide(H) else 26
    b += '<g id="Monitor OSD">'
    b += f'<circle cx="{x0 + i + 8:.0f}" cy="{y0 + i + osd * 0.5 - 8:.0f}" r="8" fill="#E5484D"/>'
    b += t(x0 + i + 26, y0 + i + osd * 0.5, "REC   00:12:04:18", osd, "#FFFFFF", track=0, name="Timecode")
    b += t(x1 - i, y0 + i + osd * 0.5, "A001C003", osd, "#FFFFFF", anchor="end", track=0, name="Clip")
    b += t(x0 + i, y1 - i, "ISO 800   5600K   T2.0", osd, "#FFFFFF", track=0, name="Settings")
    b += t(x1 - i, y1 - i, "24 fps", osd, "#FFFFFF", anchor="end", track=0, name="Frame rate")
    fi = i + osd * 1.6
    fx0, fy0, fx1, fy1 = x0 + fi, y0 + fi, x1 - fi, y1 - fi
    b += corner(fx0, fy0, 1, 1) + corner(fx1, fy0, -1, 1) + corner(fx0, fy1, 1, -1) + corner(fx1, fy1, -1, -1)
    cx, cy = (x0 + x1) / 2, (y0 + y1) / 2
    b += f'<rect x="{cx - 14:.0f}" y="{cy - 1:.0f}" width="28" height="2" fill="#FFFFFF" fill-opacity="0.7"/>'
    b += f'<rect x="{cx - 1:.0f}" y="{cy - 14:.0f}" width="2" height="28" fill="#FFFFFF" fill-opacity="0.7"/>'
    b += "</g>"
    size = 34 if wide(H) else 44
    b += t(cx, cy + 14 + size * 1.6, "We feel your story.", size, "#FFFFFF", weight=600, anchor="middle",
           track=-0.04, name="Statement")
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
    btn = 26
    # Centre the statement and its button in the free space.
    block = size * 0.75 + (len(rows) - 1) * size * 1.1 + 56 + btn * 2.4
    ty = (y0 + y1) / 2 - block / 2 + size * 0.75
    by = ty + (len(rows) - 1) * size * 1.1 + 56
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
    kicker = y0 + inset + 22
    room = y1 - inset - kicker - 40
    size = min(room / len(items) / 1.35, 96)
    step = size * 1.35
    # Centre the list in the box under the kicker.
    block = step * (len(items) - 1) + size * 0.75
    start = kicker + 40 + (room - block) / 2 + size * 0.75
    for i, item in enumerate(items):
        base = start + i * step
        b += t(PAD + inset, base, item, size, INK_TEXT, weight=600, track=-0.05, name=f"Service {i + 1}")
        cx, cy, arm = W - PAD - inset - 20, base - size * 0.34, 18
        b += (
            f'<g id="Toggle {i + 1}" opacity="0.45"><rect x="{cx - arm:.0f}" y="{cy - 1.5:.0f}" width="{2 * arm}" height="3" fill="{INK_TEXT}"/>'
            f'<rect x="{cx - 1.5:.0f}" y="{cy - arm:.0f}" width="3" height="{2 * arm}" fill="{INK_TEXT}"/></g>'
        )
    b += t(PAD + inset, kicker, "Production by m.STUDIO", 26 if not wide(H) else 22, INK_MUTED, track=-0.03, name="Kicker")
    return b + footer(W, H, bottom), BG


def tag(x, y, label, size=22):
    """A small white pill caption sitting on a photo."""
    h = size * 2
    w = len(label) * size * 0.55 + size * 1.8
    return (
        f'<g id="Tag – {escape(label)}"><rect x="{x:.0f}" y="{y - h:.0f}" width="{w:.0f}" height="{h:.0f}" rx="{h / 2:.0f}" fill="#FFFFFF"/>'
        + t(x + w / 2, y - h / 2 + size * 0.36, label, size, TEXT, anchor="middle", track=-0.03)
        + "</g>"
    )


def grid(W, H, top, bottom):
    """09 Bento – one big frame and two small ones, captions in pills."""
    b = header(W, top, "The city", 9)
    y0, y1 = body_box(H, top, bottom)
    gap = 12
    x0, w, h = PAD, W - 2 * PAD, y1 - y0
    tags = ["Malá Strana, 2 am", "Žižkov", "Karlín"]
    if tall(W, H):
        bh = (h - gap) * 0.6
        frames = [(x0, y0, w, bh)]
        sw = (w - gap) / 2
        frames += [(x0 + i * (sw + gap), y0 + bh + gap, sw, h - bh - gap) for i in range(2)]
    else:
        bw = (w - gap) * 0.6
        frames = [(x0, y0, bw, h)]
        sh = (h - gap) / 2
        frames += [(x0 + bw + gap, y0 + i * (sh + gap), w - bw - gap, sh) for i in range(2)]
    for i, (x, y, fw, fh) in enumerate(frames):
        b += photo(x, y, fw, fh, 32, PHOTO[i], f"Photo {i + 1} – vložte obrázek")
        b += tag(x + 20, y + fh - 20, tags[i], 20 if wide(H) else 22)
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
    return b, INK


SLIDES = [
    ("01-cover", "Cover", cover),
    ("02-contents", "Contents", contents),
    ("03-chapter", "Chapter", chapter),
    ("04-project", "Project card", project),
    ("05-duo", "Duo", duo),
    ("06-monitor", "Monitor", monitor),
    ("07-statement", "Two-tone statement", two_tone),
    ("08-services", "What we did", services),
    ("09-bento", "Bento", grid),
    ("10-end", "End", end),
]

for slug, fname, W, H, PAD, top, bottom in FORMATS:
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
