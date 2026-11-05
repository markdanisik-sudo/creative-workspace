"""Digitise the spectral graphs of the Kodak VISION3 500T 5219 / 7219 technical data.

    pdfimages -png VISION3_5219_7219_Technical-data.pdf img/5219
    python3 digitize_5219.py img/5219 [overlay_dir]

Writes sens_500t.json and dye_500t.json (same format as the 200T files).
They replace the VISION3 500T brochure digitisation (v_500t.json), whose dye
graph had a density offset of about -0.1 D (negative dye densities) and a
cyan peak at 704 nm instead of about 683 nm.  The characteristic curves of
the full sheet are in char_500t.json.  See digitize_5213.py for accuracy.
"""
import json, os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from digitize_5213 import load, to_pairs, grid_lines, guided, remove_text, overlay, HERE  # noqa: E402


def spectral_sensitivity(path, ov=None):
    m, im = load(path)
    rows, cols = grid_lines(m, frac=0.45)
    y4, y0 = rows[0], rows[-1]; x250, x750 = cols[0], cols[-1]
    fx = lambda x: 250.0 + 500.0 * (x - x250) / (x750 - x250)
    fy = lambda y: 4.0 * (y0 - y) / (y0 - y4)
    fxi = lambda l: x250 + (l - 250.0) / 500.0 * (x750 - x250)
    fyi = lambda s: y0 - s / 4.0 * (y0 - y4)
    for r in rows: m[int(r) - 2:int(r) + 3, :] = False
    for c in cols: m[:, int(c) - 2:int(c) + 3] = False
    m = remove_text(m, [(295, 185, 390, 275), (435, 275, 535, 360), (565, 300, 655, 385), (110, 440, 425, 565), (250, 600, 760, 715)])
    guides = {
        'Y': [(370, 2.52), (385, 2.95), (400, 3.18), (410, 3.2), (425, 3.17), (440, 3.12), (450, 3.08), (462, 3.07), (470, 3.0),
              (480, 2.75), (490, 2.45), (500, 2.2), (510, 1.85), (518, 1.45), (524, 1.0), (530, 0.68)],
        'M': [(450, 1.03), (460, 1.15), (470, 1.27), (480, 1.6), (490, 1.95), (500, 2.2), (510, 2.35), (525, 2.5), (540, 2.68),
              (550, 2.8), (560, 2.72), (572, 2.6), (580, 2.35), (586, 1.9), (592, 1.4), (600, 0.75)],
        'C': [(510, 0.6), (520, 0.68), (530, 0.75), (540, 0.68), (548, 0.6), (556, 0.78), (565, 1.05), (575, 1.4), (585, 1.85),
              (595, 2.1), (610, 2.25), (625, 2.42), (640, 2.38), (650, 2.45), (660, 2.42), (668, 2.1), (678, 1.7)]}
    steep = {'Y': [(472, 531)], 'M': [(449, 502), (576, 601)], 'C': [(548, 600), (662, 679)]}
    out, tr = {}, []
    for k, g in guides.items():
        pts = guided(m, g, fxi, fyi, steep[k])
        out[k] = to_pairs(pts, fx, fy); tr.append({int(round(x)): y for x, y in pts})
    if ov: overlay(im, tr, os.path.join(ov, 'sensitivity_500t.png'))
    return out


def dye_density(path, ov=None):
    """frame 400-800 nm, -0.2..1.8 D; ticks every 0.2 D (56.6 px) and 50 nm (70.75 px)"""
    m, im = load(path)
    x400, x800, ytop, ybot = 96.0, 662.0, 79.0, 645.0
    fx = lambda x: 400.0 + 400.0 * (x - x400) / (x800 - x400)
    fy = lambda y: -0.2 + 2.0 * (ybot - y) / (ybot - ytop)
    fxi = lambda l: x400 + (l - 400.0) / 400.0 * (x800 - x400)
    fyi = lambda d: ybot - (d + 0.2) / 2.0 * (ybot - ytop)
    m[:, :int(x400) + 3] = False; m[:, int(x800) - 2:] = False; m[:int(ytop) + 3, :] = False; m[int(ybot) - 3:, :] = False
    m = remove_text(m, [(100, 85, 470, 115), (115, 215, 280, 245), (125, 270, 200, 300), (240, 270, 360, 300), (465, 270, 525, 300),
                        (440, 510, 615, 540)])
    # guides: the 200T sheet's traced curves (same dye family), snapped to the 500T lines
    ref = json.load(open(os.path.join(HERE, 'dye_200t.json')))
    guides = {k: [tuple(p) for p in ref[k][::3]] for k in ['Y', 'M', 'C', 'N', 'Dmin']}
    # where 500T departs from 200T by more than the snapping tolerance: read off the 500T graph
    guides['N'] = [(400, 1.1), (420, 1.45), (445, 1.65), (460, 1.6), (475, 1.48), (490, 1.38), (500, 1.4), (512, 1.44), (525, 1.41),
                   (540, 1.41), (550, 1.33), (565, 1.2), (580, 1.05), (595, 0.85), (605, 0.77), (615, 0.79), (625, 0.81), (640, 0.82),
                   (660, 0.88), (685, 0.92), (710, 0.88), (740, 0.7), (770, 0.45), (800, 0.17)]
    guides['Y'] = [p for p in guides['Y'] if p[0] <= 515] + [(520, 0.2), (535, 0.15), (550, 0.12), (565, 0.09), (580, 0.05), (600, 0.03),
                                                              (650, 0.012), (700, 0.006)]
    steep = {'M': [(452, 532), (543, 590)], 'C': [(540, 655)], 'Y': [(455, 515)], 'N': [(548, 600)]}
    out, tr = {}, []
    for k, g in guides.items():
        pts = guided(m, g, fxi, fyi, steep.get(k, ()))
        out[k] = to_pairs(pts, fx, fy); tr.append({int(round(x)): y for x, y in pts})
    if ov: overlay(im, tr, os.path.join(ov, 'dyes_500t.png'))
    return out


def main():
    stem = sys.argv[1]
    ov = sys.argv[2] if len(sys.argv) > 2 else None
    if ov: os.makedirs(ov, exist_ok=True)
    src = 'Kodak VISION3 500T 5219/7219 technical data'
    sens = spectral_sensitivity(stem + '-003.png', ov)
    sens['source'] = src + ', Spectral Sensitivity Curves (log sensitivity, density 0.2 above D-min, Status M)'
    json.dump(sens, open(os.path.join(HERE, 'sens_500t.json'), 'w'))
    dye = dye_density(stem + '-005.png', ov)
    dye['source'] = src + ', Spectral Dye Density Curves (ECN-2, D-mins subtracted; C, M, Y peak normalised)'
    json.dump(dye, open(os.path.join(HERE, 'dye_500t.json'), 'w'))
    for name, d in [('sens', sens), ('dye', dye)]:
        for k, v in d.items():
            if k != 'source':
                print(f'{name} {k}: {len(v)} points, {v[0][0]:.0f}-{v[-1][0]:.0f} nm, max {max(p[1] for p in v):.3f}, min {min(p[1] for p in v):.3f}')


if __name__ == '__main__':
    main()
