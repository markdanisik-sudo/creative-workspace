"""Fit the two ColorChecker calibrations of Film Lab v4 and validate them.

    python3 fit_calibration.py          # writes calibration_v4.json + a report

1. Interimage shape (6 coefficients) on the real Vision3 250D scan
   (colorchecker_250d_scan.json).  The scanner is unknown, so a generic
   scanner (per-channel inversion and a shared logistic tone curve, 7
   parameters) and the exposure are fitted with it: nuisance parameters.
2. 2383 cross-talk (6) on the real 2383 print (colorchecker_2383_print.json),
   compared for interimage strengths 0 / 0.6 / 1.  The camera that
   photographed the print is unknown: exposure and per-channel white balance
   are fitted as nuisance.

Validation: leave-one-out over the chromatic patches (refit without the
patch, measure its error).  Both data sets are 24 patches at one exposure in
8-bit sRGB through unknown pipelines; neither characterises spectral response.
Requires numpy, scipy, colour-science.
"""
import json, os, sys
import numpy as np
from scipy.optimize import least_squares
import colour
import filmlab_model as M

HERE = os.path.dirname(os.path.abspath(__file__))
J = lambda f: json.load(open(os.path.join(HERE, f)))
CC = J('colorchecker_250d_scan.json'); PR = J('colorchecker_2383_print.json')['print']
NAMES = [n for n in CC['reference'] if n in CC['scan'] and n in PR]
NEUTRAL = np.array([n in ('black', 'white', 'n3.5', 'n5', 'n6.5', 'n8') or n.startswith('neutral') or n == 'white 9.5 (.05 D)' for n in NAMES])
REF_RGB = colour.RGB_to_RGB(colour.cctf_decoding(np.array([CC['reference'][n] for n in NAMES])), 'sRGB', 'ITU-R BT.2020')
SCAN = np.array([CC['scan'][n] for n in NAMES]); PRINT = np.array([PR[n] for n in NAMES])


def lab_of_srgb(v):
    return colour.XYZ_to_Lab(colour.sRGB_to_XYZ(np.clip(v, 0, 1)))


def de00(a, b):
    return colour.delta_E(lab_of_srgb(a), lab_of_srgb(b), method='CIE 2000')


# ---------------------------------------------------------------- 1. scan
neg250 = M.Negative('V3_5207')
G = neg250.P[:, 1]


def scan(D, p):
    """generic film scanner: per-channel inversion around grey, shared logistic tone"""
    Dg = neg250.density(np.full(3, M.GREY), interimage=0.0)
    u = (D - Dg) / G * 0.30103 * p[0] + p[1] + np.array([0, p[2], p[3]])
    return p[4] + (p[5] - p[4]) / (1 + np.exp(-u * p[6]))


def scan_model(q, use):
    c = q[:6] * use; p, ev = q[6:13], q[13]
    D = neg250.density(REF_RGB * 2 ** ev, ii=c)
    return scan(D, p)


def scan_res(q, use, mask):
    o = scan_model(q, use)
    return (lab_of_srgb(o) - lab_of_srgb(SCAN))[mask].ravel() / 10


Q0 = np.array([0] * 6 + [1.0, 0.0, 0.0, 0.0, 0.0, 0.95, 1.5, 0.0])
LO = [-0.6] * 6 + [0.3, -2, -1, -1, -0.1, 0.6, 0.3, -2]; HI = [1.5] * 6 + [3, 2, 1, 1, 0.2, 1.1, 6, 2]


def fit_scan(mask, use=1.0):
    return least_squares(lambda q: scan_res(q, use, mask), Q0, bounds=(LO, HI))


# ---------------------------------------------------------------- 2. print
def print_model(q, c_shape):
    k, xt, ev, wb = q[0], q[1:7], q[7], q[8:11]
    L = M.render(REF_RGB * 2 ** ev, 'V3_5207', interimage=k, ii=c_shape, crosstalk=1.0, xt=xt)
    return colour.cctf_encoding(np.clip(colour.RGB_to_RGB(L, 'ITU-R BT.2020', 'sRGB') * np.exp(wb), 0, 1))


def print_res(q, c_shape, mask, fit_xt=True):
    if not fit_xt:
        q = np.concatenate([q[:1], np.zeros(6), q[1:]])
    return (lab_of_srgb(print_model(q, c_shape)) - lab_of_srgb(PRINT))[mask].ravel() / 10


def fit_print(c_shape, mask, fit_xt=True):
    q0 = np.array([1.0] + [0.0] * 6 + [0.0, 0, 0, 0]) if fit_xt else np.array([1.0, 0.0, 0, 0, 0])
    lo = [0.0] + [-0.4] * 6 + [-2, -0.5, -0.5, -0.5] if fit_xt else [0.0, -2, -0.5, -0.5, -0.5]
    hi = [1.5] + [0.4] * 6 + [2, 0.5, 0.5, 0.5] if fit_xt else [1.5, 2, 0.5, 0.5, 0.5]
    r = least_squares(lambda q: print_res(q, c_shape, mask, fit_xt), q0, bounds=(lo, hi))
    return np.concatenate([r.x[:1], np.zeros(6), r.x[1:]]) if not fit_xt else r.x


def main():
    allm = np.ones(len(NAMES), bool)
    chrom = np.where(~NEUTRAL)[0]
    print(f'{len(NAMES)} patches, {len(chrom)} chromatic')

    # ---- scan: interimage shape
    base = fit_scan(allm, use=0.0); full = fit_scan(allm)
    c_shape = full.x[:6]
    e0 = de00(scan_model(base.x, 0.0), SCAN); e1 = de00(scan_model(full.x, 1.0), SCAN)
    loo = []
    for i in chrom:
        m = allm.copy(); m[i] = False
        r = fit_scan(m); loo.append(de00(scan_model(r.x, 1.0), SCAN)[i])
    loo0 = []
    for i in chrom:
        m = allm.copy(); m[i] = False
        r = fit_scan(m, use=0.0); loo0.append(de00(scan_model(r.x, 0.0), SCAN)[i])
    print('\n250D scan (interimage shape):')
    print(f'  in-sample ΔE00 chromatic: no interimage {e0[chrom].mean():.2f}, with {e1[chrom].mean():.2f}')
    print(f'  leave-one-out ΔE00:       no interimage {np.mean(loo0):.2f}, with {np.mean(loo):.2f}')
    print('  coefficients RG RB GR GB BR BG:', np.round(c_shape, 4))

    # ---- print: interimage strength vs cross-talk.  The print photo cannot
    # separate the two (cross-talk cancels interimage), so compare fixed
    # strengths, each with and without fitted cross-talk, under leave-one-out
    def err(q): return de00(print_model(q, c_shape), PRINT)

    def fit_nuisance(k, xt, mask):
        r = least_squares(lambda q: print_res(np.concatenate([[k], xt, q]), c_shape, mask), [0, 0, 0, 0],
                          bounds=([-2, -.5, -.5, -.5], [2, .5, .5, .5]))
        return np.concatenate([[k], xt, r.x])

    def fit_xt(k, mask):
        r = least_squares(lambda q: print_res(np.concatenate([[k], q]), c_shape, mask), [0.0] * 10,
                          bounds=([-.4] * 6 + [-2, -.5, -.5, -.5], [.4] * 6 + [2, .5, .5, .5]))
        return np.concatenate([[k], r.x])

    print('\n2383 print (ΔE00, chromatic patches; exposure and white balance of the photo fitted as nuisance):')
    table = {}
    for k in (0.0, 0.6, 1.0):
        loo_n, loo_x = [], []
        for i in chrom:
            m = allm.copy(); m[i] = False
            loo_n.append(err(fit_nuisance(k, np.zeros(6), m))[i]); loo_x.append(err(fit_xt(k, m))[i])
        qn, qx = fit_nuisance(k, np.zeros(6), allm), fit_xt(k, allm)
        table[k] = dict(no_xt=[round(float(err(qn)[chrom].mean()), 2), round(float(np.mean(loo_n)), 2)],
                        xt=[round(float(err(qx)[chrom].mean()), 2), round(float(np.mean(loo_x)), 2)], crosstalk=qx[1:7])
        print(f'  interimage {k}: no cross-talk in-sample {table[k]["no_xt"][0]:.2f} / LOO {table[k]["no_xt"][1]:.2f}'
              f'   + cross-talk in-sample {table[k]["xt"][0]:.2f} / LOO {table[k]["xt"][1]:.2f}')

    # default: interimage 1 (supported by the scan), cross-talk fitted at that
    # strength: the one setting consistent with both data sets
    xt = table[1.0]['crosstalk']
    out = {'note': 'Fitted by fit_calibration.py on the ColorChecker scan / print: calibration data, not '
                   'independent validation (leave-one-out numbers in report).  The print cannot separate '
                   'interimage strength from cross-talk; default = scan interimage + cross-talk fitted with it.',
           'interimage': list(np.round(c_shape, 5)),
           'print_crosstalk': list(np.round(xt, 5)),
           'report': {'scan_dE00_insample_no_ii_vs_ii': [round(float(e0[chrom].mean()), 2), round(float(e1[chrom].mean()), 2)],
                      'scan_dE00_loo_no_ii_vs_ii': [round(float(np.mean(loo0)), 2), round(float(np.mean(loo)), 2)],
                      'print_dE00_by_interimage_strength': {str(k): {'no_crosstalk_insample_loo': v['no_xt'],
                                                                     'crosstalk_insample_loo': v['xt']} for k, v in table.items()}}}
    json.dump(out, open(os.path.join(HERE, 'calibration_v4.json'), 'w'), indent=1)
    print('\nwrote calibration_v4.json')


if __name__ == '__main__':
    main()
