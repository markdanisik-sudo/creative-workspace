"""Digitise the Kodak VISION3 200T 5213 / 7213 technical data sheet.

    pdfimages -png KODAK-VISION3-200T-5213-7213-technical-information.pdf img/5213
    python3 digitize_5213.py img/5213 [overlay_dir]

Reads the graph images embedded in the PDF (the sheet itself is not stored
in the repository) and writes char_200t.json (Status M characteristic
curves), sens_200t.json (log spectral sensitivity), dye_200t.json (spectral
dye density, peak normalised, D-min subtracted; minimum density and midscale
neutral) and gran_200t.json (diffuse RMS granularity).  Axes are calibrated on
the frame and tick marks found in each image; with overlay_dir the traces are
drawn over the graphs for checking.

Accuracy: the graphs are about 220-260 dpi raster images; one pixel is about
0.005 D (sensitometry), 0.009 log sensitivity, 0.7 nm (spectra), 0.0035 D
(dyes).  Line width is 3-4 px; tracing takes the line centre.  Expect about
+-0.01 D, as for the earlier sheets.
"""
import json, os, sys
import numpy as np
from PIL import Image
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from digi import runs, trace_guided, remove_text, overlay  # noqa: E402

HERE = os.path.dirname(os.path.abspath(__file__))


def load(path, thr=120):
    im = Image.open(path).convert('L')
    return np.asarray(im) < thr, im


def to_pairs(pts, fx, fy, nd=4):
    return [[round(float(fx(x)), nd), round(float(fy(y)), nd)] for x, y in pts]


def sensitometry(path, ov=None):
    """Sensitometric Curves: x = camera stops (-8..+8 at the frame, ticks every
    stop, 0 = normal exposure), y = Status M density 0..3 at the frame"""
    m, im = load(path)
    x0, x1, ytop, ybot = 107.6, 674.5, 97.0, 663.0          # frame (ticks: 35.45 px per stop)
    fx = lambda x: -8.0 + 16.0 * (x - x0) / (x1 - x0)
    fy = lambda y: 3.0 * (ybot - y) / (ybot - ytop)
    px = lambda s: x0 + (s + 8.0) / 16.0 * (x1 - x0)
    py = lambda d: ybot - d / 3.0 * (ybot - ytop)
    m = remove_text(m, [(110, 100, 400, 200), (630, 130, 670, 370)])       # legend box and B / G / R labels
    m[:, :int(x0) + 4] = False; m[:, int(x1) - 2:] = False; m[int(ybot) - 12:, :] = False; m[:int(ytop) + 3, :] = False
    out = {}
    # guide points read off the graph (stops, density); snapped to the line
    guides = {'B': [(-7.9, 0.85), (-5, 0.88), (-3, 1.07), (0, 1.62), (4, 2.25), (7, 2.62), (8.5, 2.72)],
              'G': [(-7.9, 0.58), (-5, 0.61), (-3, 0.83), (0, 1.36), (4, 2.05), (7, 2.42), (8.5, 2.53)],
              'R': [(-7.9, 0.18), (-5, 0.21), (-3, 0.40), (0, 0.85), (4, 1.38), (7, 1.73), (8.5, 1.83)]}
    traces = []
    for k, g in guides.items():
        pts = trace_guided(m, [(px(s), py(d)) for s, d in g], tol=14, max_thick=12)
        traces.append({int(x): y for x, y in pts})
        out[k] = to_pairs(pts, fx, fy)
    if ov: overlay(im, traces, os.path.join(ov, 'sensitometry.png'))
    return out


def grid_lines(m, frac=0.6):
    """rows / columns of the long grid and frame lines (centres)"""
    H, W = m.shape
    rows = [y for y in range(H) if m[y].sum() > frac * W * 0.8]
    cols = [x for x in range(W) if m[:, x].sum() > frac * H * 0.8]
    c = lambda v: [float(np.mean(g)) for g in np.split(np.array(v), np.where(np.diff(v) > 2)[0] + 1)] if v else []
    return c(rows), c(cols)


def guided(m, guide, fx_inv, fy_inv, steep=()):
    """trace along x, and along y inside the `steep` x ranges (data units)"""
    g = [(fx_inv(a), fy_inv(b)) for a, b in guide]
    pts = trace_guided(m, g, tol=12, max_thick=12)
    keep = [p for p in pts if not any(fx_inv(a) <= p[0] <= fx_inv(b) for a, b in steep)]
    for a, b in steep:
        seg = [q for q in g if fx_inv(a) - 1 <= q[0] <= fx_inv(b) + 1]
        if len(seg) >= 2:
            ys = trace_guided(m, seg, tol=10, max_thick=12, along='y')
            keep += [tuple(p) for p in ys]
    keep = sorted(keep, key=lambda p: p[0])
    return keep


def refine(m, out, fixes, fx, fy, fxi, fyi, tol=5):
    """re-trace short stretches where two lines run within ~0.05 D of each other and
    the main trace took the neighbour; guides are the line crossings measured in the
    pixel columns (see the column listing in FILMLAB_V4.md).  Replaces the points of
    `out[k]` inside the guide's wavelength range."""
    for k, g in fixes.items():
        lo, hi = g[0][0], g[-1][0]
        pts = trace_guided(m, [(fxi(a_), fyi(b_)) for a_, b_ in g], tol=tol, max_thick=12)
        new = [p_ for p_ in out[k] if not (lo <= p_[0] <= hi)] + to_pairs(pts, fx, fy)
        out[k] = sorted(new)
    return out


def spectral_sensitivity(path, ov=None):
    """log sensitivity vs wavelength; grid every 50 nm (250-750) and 1.0 (0-4)"""
    m, im = load(path)
    rows, cols = grid_lines(m)
    y4, y0 = rows[0], rows[-1]; x250, x750 = cols[0], cols[-1]
    fx = lambda x: 250.0 + 500.0 * (x - x250) / (x750 - x250)
    fy = lambda y: 4.0 * (y0 - y) / (y0 - y4)
    fxi = lambda l: x250 + (l - 250.0) / 500.0 * (x750 - x250)
    fyi = lambda s: y0 - s / 4.0 * (y0 - y4)
    for r in rows: m[int(r) - 2:int(r) + 3, :] = False
    for c in cols: m[:, int(c) - 2:int(c) + 3] = False
    m = remove_text(m, [(115, 60, 410, 160), (300, 200, 375, 285), (415, 285, 505, 370), (535, 280, 620, 370), (230, 590, 700, 660)])
    guides = {   # (nm, log sensitivity) read off the graph, snapped to the line
        'Y': [(380, 2.33), (395, 2.62), (400, 2.68), (410, 2.66), (425, 2.76), (440, 2.85), (450, 2.77), (460, 2.79), (467, 2.82), (473, 2.72),
              (480, 2.45), (490, 1.95), (500, 1.45), (510, 1.05), (520, 0.47)],
        'M': [(480, 0.97), (490, 1.5), (500, 1.85), (510, 2.0), (520, 2.12), (535, 2.25), (550, 2.47), (560, 2.38), (570, 2.28), (580, 2.08),
              (588, 1.5), (595, 0.9), (600, 0.27)],
        'C': [(560, 0.32), (568, 0.55), (575, 0.95), (582, 1.4), (590, 1.68), (600, 1.85), (610, 2.02), (620, 2.1), (635, 2.16), (645, 2.18),
              (655, 2.1), (662, 1.8), (668, 1.3), (675, 0.85), (680, 0.52)]}
    steep = {'Y': [(474, 521)], 'M': [(479, 505), (582, 601)], 'C': [(559, 592), (657, 681)]}
    out, tr = {}, []
    for k, g in guides.items():
        pts = guided(m, g, fxi, fyi, steep[k])
        out[k] = to_pairs(pts, fx, fy)
        tr.append({int(round(x)): y for x, y in pts})
    if ov: overlay(im, tr, os.path.join(ov, 'sensitivity.png'))
    return out


def dye_density(path, ov=None):
    """spectral dye density, 400-800 nm at the frame, -0.2..1.8 (ticks every 0.2)"""
    m, im = load(path)
    x400, x800, ytop, ybot = 117.0, 683.0, 66.0, 632.0       # frame; ticks: 0.0 at 575, 56.5 px per 0.2
    fx = lambda x: 400.0 + 400.0 * (x - x400) / (x800 - x400)
    fy = lambda y: -0.2 + 2.0 * (ybot - y) / (ybot - ytop)
    fxi = lambda l: x400 + (l - 400.0) / 400.0 * (x800 - x400)
    fyi = lambda d: ybot - (d + 0.2) / 2.0 * (ybot - ytop)
    m[:, :int(x400) + 3] = False; m[:, int(x800) - 2:] = False; m[:int(ytop) + 3, :] = False; m[int(ybot) - 3:, :] = False
    m = remove_text(m, [(120, 70, 480, 100), (150, 260, 225, 290), (245, 155, 410, 185), (535, 275, 595, 300),
                        (435, 490, 610, 515), (120, 580, 215, 605)])
    guides = {
        'Y': [(400, 0.5), (415, 0.78), (430, 0.95), (445, 1.0), (455, 0.97), (470, 0.8), (485, 0.55), (500, 0.32), (515, 0.15), (530, 0.07),
              (550, 0.035), (580, 0.015)],
        # below ~480 nm: magenta is the near-zero line (bump at 428 nm) that rises to its
        # 537 nm peak; cyan is the line falling from 0.22 (its blue absorption)
        'M': [(400, 0.01), (415, 0.02), (428, 0.04), (440, 0.025), (450, 0.03), (462, 0.08), (475, 0.2), (490, 0.38), (505, 0.58),
              (520, 0.82)],
        'C': [(400, 0.22), (420, 0.13), (440, 0.08), (460, 0.05), (480, 0.04), (495, 0.045), (510, 0.06), (525, 0.09)],
        'N': [(400, 1.1), (420, 1.45), (440, 1.58), (450, 1.58), (465, 1.48), (480, 1.42), (495, 1.32), (505, 1.36), (515, 1.38), (535, 1.37),
              (545, 1.33), (560, 1.18), (575, 1.0), (590, 0.8), (602, 0.7), (612, 0.71), (625, 0.76), (640, 0.78), (660, 0.85), (680, 0.89),
              (700, 0.86), (730, 0.68), (760, 0.45), (785, 0.24), (800, 0.13)],
        'Dmin': [(400, 0.6), (420, 0.75), (445, 0.85), (460, 0.81), (475, 0.8), (490, 0.69), (500, 0.69), (515, 0.62), (530, 0.56), (550, 0.54),
                 (570, 0.53), (580, 0.46), (590, 0.3), (600, 0.25), (615, 0.22), (630, 0.19), (660, 0.17), (700, 0.16), (740, 0.14), (780, 0.1)]}
    # magenta and cyan: the Vision3 dyes share their shapes, so the 250D sheet's
    # digitised curves are the guide (only a guide: every point is snapped to
    # the 200T line); steep flanks are traced along y
    ref = json.load(open(os.path.join(HERE, 'dye_250d.json')))
    for k, lo, hi in [('M', 525, 800), ('C', 535, 800)]:
        r = sorted(p for p in ref[k] if lo <= p[0] <= hi)
        guides[k] = [q for q in guides[k] if q[0] < lo] + [(a_, b_) for a_, b_ in r[::4]]
    steep = {'M': [(452, 532), (541, 585)], 'C': [(540, 655)], 'Y': [(455, 520)], 'N': [(548, 600)]}
    out, tr = {}, []
    for k, g in guides.items():
        pts = guided(m, g, fxi, fyi, steep.get(k, ()))
        out[k] = to_pairs(pts, fx, fy)
        tr.append({int(round(x)): y for x, y in pts})
    # cyan and the yellow tail cross at ~530 nm
    out = refine(m, out, {'C': [(505, 0.042), (515, 0.049), (520, 0.053), (525, 0.061), (530, 0.074), (535, 0.083), (540, 0.097),
                                (545, 0.111), (550, 0.129)],
                          'Y': [(515, 0.153), (520, 0.123), (525, 0.097), (530, 0.074), (535, 0.058), (540, 0.047), (545, 0.037),
                                (550, 0.03)]}, fx, fy, fxi, fyi)
    if ov: overlay(im, tr, os.path.join(ov, 'dyes.png'))
    return out


def main():
    stem = sys.argv[1]
    ov = sys.argv[2] if len(sys.argv) > 2 else None
    if ov: os.makedirs(ov, exist_ok=True)
    src = 'Kodak VISION3 200T 5213/7213 technical information'
    char = sensitometry(stem + '-001.png', ov)
    json.dump({'200T': char, 'source': src + ', Sensitometric Curves (3200 K 1/50 s, ECN-2, Status M); '
               'x = camera stops from normal exposure (0 stops = -1.284 log lux-s)'},
              open(os.path.join(HERE, 'char_200t.json'), 'w'))
    for k, v in char.items():
        print(f'char {k}: {len(v)} points, stops {v[0][0]:+.2f}..{v[-1][0]:+.2f}, D {min(p[1] for p in v):.3f}..{max(p[1] for p in v):.3f}')
    sens = spectral_sensitivity(stem + '-005.png', ov)
    sens['source'] = src + ', Spectral Sensitivity Curves (log sensitivity, density 0.2 above D-min, Status M)'
    json.dump(sens, open(os.path.join(HERE, 'sens_200t.json'), 'w'))
    dye = dye_density(stem + '-004.png', ov)
    dye['source'] = src + ', Spectral Dye Density Curves (ECN-2, D-mins subtracted; C, M, Y peak normalised)'
    json.dump(dye, open(os.path.join(HERE, 'dye_200t.json'), 'w'))
    for name, d in [('sens', sens), ('dye', dye)]:
        for k, v in d.items():
            if k != 'source':
                print(f'{name} {k}: {len(v)} points, {v[0][0]:.0f}-{v[-1][0]:.0f} nm, max {max(p[1] for p in v):.3f}')


if __name__ == '__main__':
    main()
