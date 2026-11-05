"""Trace the 2383 Sensitometric Curves from the Kodak VISION Color Print Film
2383/3383 data sheet and write the shoulder / D-max plateau (D > 3.8) to
char_2383_shoulder.json.

    pdfimages -png KODAK-VISION-Color-Print-Film-2383-3383-data-sheet.pdf img/2383
    python3 digitize_2383.py img/2383-002.png [overlay.png]

char_2383_rows.json (digitised earlier) stops at D 4.06; the sheet shows the
plateau at about 4.10-4.12 for all three layers.  The mid-range of this trace
agrees with char_2383_rows.json within 0.008 log E, and the toe ends at about
0.06-0.10 D (+-0.03 at this resolution: a 3 px line is 0.05 D), consistent
with the base + fog of 0.05 / 0.05 / 0.09 used by the model.
Axes: frame -3.0..3.0 log E (64 px per 1.0), 0..6 D (64.08 px per 1.0).
"""
import json, os, sys
import numpy as np
from PIL import Image
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from digi import trace_guided, remove_text, overlay  # noqa: E402

HERE = os.path.dirname(os.path.abspath(__file__))


def main():
    path = sys.argv[1]
    im = Image.open(path)
    m = np.asarray(im.convert('L')) < 140
    fx = lambda x: -3.0 + (x - 69.5) / 64.0
    fy = lambda y: (438.5 - y) / 64.08
    fxi = lambda e: 69.5 + (e + 3.0) * 64.0
    fyi = lambda d: 438.5 - d * 64.08
    m[:, :73] = False; m[:, 451:] = False; m[436:, :] = False; m[:58, :] = False
    m = remove_text(m, [(75, 60, 400, 130), (320, 200, 345, 230), (320, 290, 345, 320), (320, 365, 345, 395)])
    # guides: the curves of char_2383_rows.json, extended by a plateau at 4.1
    rows = json.load(open(os.path.join(HERE, 'char_2383_rows.json')))
    out, tr = {}, []
    for L in 'RGB':
        a = sorted(rows[L]); end = a[-1][0]
        guide = [(fxi(e), fyi(d)) for e, d in a[::5]] + [(fxi(e), fyi(4.11)) for e in np.linspace(end + 0.05, 2.6, 20)]
        flat = trace_guided(m, guide, tol=10, max_thick=10)
        steep = trace_guided(m, [q for q in guide if fyi(3.6) < q[1] < fyi(0.4)], tol=8, max_thick=10, along='y')
        pts = sorted([tuple(q) for q in flat] + [tuple(q) for q in steep])
        out[L] = [[round(fx(x), 4), round(fy(y), 4)] for x, y in pts if fy(y) > 3.8]
        tr.append({int(round(x)): y for x, y in pts})
    out['source'] = ('Kodak VISION Color Print Film 2383/3383 data sheet, Sensitometric Curves (Status A): shoulder and '
                     'D-max plateau (D > 3.8), traced from the sheet; complements char_2383_rows.json (which stops at D 4.06)')
    json.dump(out, open(os.path.join(HERE, 'char_2383_shoulder.json'), 'w'))
    if len(sys.argv) > 2: overlay(im, tr, sys.argv[2])
    for L in 'RGB':
        print(L, len(out[L]), 'points, max D', max(p[1] for p in out[L]))


if __name__ == '__main__':
    main()
