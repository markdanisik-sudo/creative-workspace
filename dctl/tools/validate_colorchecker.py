"""ColorChecker report: Film Lab v3 (backup) vs v4, through the DCTLs.

    python3 validate_colorchecker.py

IMPORTANT: both ColorChecker sets were used to fit Film Lab (interimage on the
250D scan, print cross-talk on the 2383 print), so these are in-sample
numbers, not independent validation.  The leave-one-out numbers from
fit_calibration.py (calibration_v4.json) are the honest estimate of how the
fits generalise.  The photo / scan pipelines are unknown, so the exposure and
the white balance of the reference are matched (nuisance), as in the fits.
Needs g++, numpy, scipy, colour-science.
"""
import json, os, sys
import numpy as np
from scipy.optimize import least_squares
import colour

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, '..', 'Emulsion', 'test'))
import dctl  # noqa: E402

CC = json.load(open(os.path.join(HERE, 'colorchecker_250d_scan.json')))
PR = json.load(open(os.path.join(HERE, 'colorchecker_2383_print.json')))['print']
NAMES = [n for n in CC['reference'] if n in PR and n in CC['scan']]
NEUTRAL = np.array([n in ('black', 'white', 'n3.5', 'n5', 'n6.5', 'n8') for n in NAMES])
RGB = colour.RGB_to_RGB(colour.cctf_decoding(np.array([CC['reference'][n] for n in NAMES])), 'sRGB', 'ITU-R BT.2020')


def lab(v):
    return colour.XYZ_to_Lab(colour.sRGB_to_XYZ(np.clip(v, 0, 1)))


def report(tag, plug, target, extra):
    def render(q):
        out = plug.run((RGB * 2 ** q[0])[None].astype(np.float32), p_InGamut=8, p_InGamma=9, p_Output=1, **extra)[0]
        lin = colour.cctf_decoding(np.clip(out, 0, 1)) * np.exp(q[1:])
        return colour.cctf_encoding(np.clip(lin, 0, 1))
    r = least_squares(lambda q: (lab(render(q)) - lab(target)).ravel(), [0, 0, 0, 0], bounds=([-2, -.5, -.5, -.5], [2, .5, .5, .5]))
    o = render(r.x); a, b = lab(o), lab(target)
    de = colour.delta_E(a, b, method='CIE 2000')
    h = np.degrees(np.angle((b[:, 1] + 1j * b[:, 2]) / (a[:, 1] + 1j * a[:, 2] + 1e-9)))
    ch = np.hypot(b[:, 1], b[:, 2]) > 10
    print(f'  {tag:34s} ΔE00 mean {de.mean():5.2f} (chromatic {de[~NEUTRAL].mean():5.2f}, neutral {de[NEUTRAL].mean():5.2f},'
          f' max {de.max():5.1f} {NAMES[de.argmax()]}) | mean hue error {np.abs(h[ch]).mean():4.1f}°')


def main():
    root = os.path.join(HERE, '..')
    v3 = dctl.build(os.path.join(root, 'backup', 'FilmLab_Color_v3.dctl'))
    v4 = dctl.build(os.path.join(root, 'FilmLab_Color.dctl'))
    off = dict(p_Grain=0.0, p_Halation=0.0)
    # only the print: the 250D scan is a scan of the negative, not a print, and is
    # evaluated through a scanner model in fit_calibration.py (leave-one-out)
    for tname, target in [('real 2383 print (photo)', np.array([PR[n] for n in NAMES]))]:
        print(f'\nvs {tname}, {len(NAMES)} patches (in-sample, see docstring):')
        report('v3 Old (data sheets only)', v3, target, dict(p_NegVersion=1, p_PrintVersion=1))
        report('v3 New (fitted)', v3, target, {})
        report('v4 no interimage, no cross-talk', v4, target, dict(off, p_Interimage=0.0, p_Crosstalk=0.0))
        report('v4 default', v4, target, off)


if __name__ == '__main__':
    main()
