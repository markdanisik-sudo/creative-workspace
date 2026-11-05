"""Film Lab v4: reference model of the colour chain, in numpy.

The DCTL (FilmLab_Color.dctl) implements exactly this; the tests compare the
two.  Fits (interimage, print cross-talk) and the generated DCTL constants
(export.py) come from here too.

    scene light (Rec.2020 linear, 0.18 = grey)
    -> layer exposure: root-polynomial map fitted on the stock's spectral
       sensitivity under its balance light                       [M sens, D/F map]
    -> sensitometry per layer: Status M H&D curves fitted on the
       Kodak curves, development (push / pull)                   [M curves, E push]
    -> interimage on exposure-equivalent density                 [F on a 250D scan]
    -> film saturation on layer density vs the neutral of the
       same visual exposure, layer density                       [D]
    -> negative dye amounts -> spectral transmission (36 bands)  [M dyes, F Status M]
    -> printer lamp -> 2383 layer exposure, timed so a normally
       exposed, normally developed grey prints to LAD            [M sens, E lamp]
    -> 2383 cross-talk (optional calibration)                    [F on a 2383 print]
    -> 2383 Status A H&D curves                                  [M]
    -> print dye amounts -> projection (lamp) -> CIE 1931 -> D65  [M dyes, E lamp]

Tags: M = digitised Kodak data, D = derived, F = fitted, E = estimated.
"""
import json, os
import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
_src = open(os.path.join(HERE, 'spectral.py')).read().replace(
    'WL = np.arange(380.0, 735.0, 5.0)', 'WL = np.arange(380.0, 735.0, 10.0)')
S = {'__file__': os.path.join(HERE, 'spectral.py')}
exec(compile(_src, 'spectral.py', 'exec'), S)
WL = S['WL']
DATA = S['load_data']()
FILMS = {k: S['Film'](k, data=DATA) for k in ['50D', '250D', '500T']}
REF = FILMS['250D']
GREY = 0.18
LAD = np.array([1.09, 1.06, 1.03])
PT = 0.30103 / 12.0                     # one printer point: 1/12 stop of print exposure

# ------------------------------------------------------------------ stocks
# Negative Stock combo order.  sens / dyes: which spectral data set is used.
#   key, label, sens set, dye set, curves from, halation gain, grain sigma
STOCKS = [
    ('V3_5203',   'Vision3 50D 5203',                    '50D',  '250D', '50D',  1.0, 0.0060),
    ('V3_5213',   'Vision3 200T 5213 (estimated)',       '500T', '500T', '200T', 1.0, 0.0085),
    ('V3_5207',   'Vision3 250D 5207',                   '250D', '250D', '250D', 1.0, 0.0090),
    ('V3_5219',   'Vision3 500T 5219',                   '500T', '500T', '500T', 1.0, 0.0130),
    ('V3_5219NR', 'Vision3 500T 5219 no rem-jet',        '500T', '500T', '500T', 6.0, 0.0135),
    ('NEG_NONE',  'None - print only',                   None,   '250D', None,   1.0, 0.0),
]
STOCK_TAGS = {
    'V3_5203': 'curves, spectral sensitivity: Kodak H-1-5203 [M]; dyes: 250D set [E: no 50D dye graph]',
    'V3_5213': 'NO KODAK DATA: 500T spectral data, hand-set curves (legacy_stocks.json) [E]',
    'V3_5207': 'curves, spectral sensitivity, dyes: Kodak H-1-5207 [M]',
    'V3_5219': 'curves, spectral sensitivity, dyes: VISION3 500T brochure [M, coarser digitisation]',
    'V3_5219NR': 'as 5219; no anti-halation backing: halation gain [E]',
    'NEG_NONE': 'ideal straight-line negative, no colour of its own [D]',
}
SENS_SETS = ['50D', '250D', '500T']
DYE_SETS = ['250D', '500T']
HALATION_LAYER = np.array([1.0, 0.25, 0.0])   # halation re-exposes the red layer, a little green [E]


def curve_params(which):
    """per layer (R, G, B): dmin, gamma, toe, toe softness, shoulder, shoulder softness"""
    nf = REF.neg_fit
    if which in ('50D', '250D', '500T'):
        return np.array([nf[which][k] for k in 'RGB'])
    ref = nf['250D']
    if which == '200T':
        p = json.load(open(os.path.join(HERE, 'legacy_stocks.json')))['V3_5213'][1]
        g = {'R': p['gr'], 'G': p['gg'], 'B': p['gb']}
        return np.array([[ref[k][0], g[k] * ref[k][1] / 0.60, p['xt'], p['kt'], p['emax'], p['ks']] for k in 'RGB'])
    # ideal negative: straight line, no colour of its own
    return np.array([[ref[k][0], 0.6, -1.45, 0.05, 9.0, 0.3] for k in 'RGB'])


# ------------------------------------------------------------------ helpers
def sp10(z):
    z = np.asarray(z, float)
    return np.where(z > 0, z + np.log10(1 + 10.0 ** (-np.abs(z))), np.log10(1 + 10.0 ** (-np.abs(z))))


def hd(x, xt, kt, emax, ks):
    e = kt * sp10((x - xt) / kt)
    return e - ks * sp10((e - emax) / ks)


def couple(x, k, c):
    """x_i += k * sum_j c_ij (x_i - x_j); c = (RG, RB, GR, GB, BR, BG)"""
    r, g, b = x[..., 0], x[..., 1], x[..., 2]
    return np.stack([r + k * (c[0] * (r - g) + c[1] * (r - b)),
                     g + k * (c[2] * (g - r) + c[3] * (g - b)),
                     b + k * (c[4] * (b - r) + c[5] * (b - g))], -1)


# luminance-like weights of the three layers for the "same visual exposure"
# neutral used by Film Saturation (Rec.2020 Y weights, as in Film Lab v3) [E]
VIS_W = np.array([0.2627, 0.6780, 0.0593])

# fitted calibrations (see fit_calibration.py); None = not fitted yet
_CAL_PATH = os.path.join(HERE, 'calibration_v4.json')
CAL = json.load(open(_CAL_PATH)) if os.path.exists(_CAL_PATH) else {
    'interimage': [0.0] * 6, 'print_crosstalk': [0.0] * 6}


# ------------------------------------------------------------------ negative
class Negative:
    def __init__(self, stock_key):
        row = next(s for s in STOCKS if s[0] == stock_key)
        self.key, self.label, sens, dyes, curves, self.halation, self.grain = row
        self.ideal = sens is None
        self.M_rp = FILMS[sens].M_rp if sens else None
        self.P = curve_params(curves)
        self.dye_set = dyes
        f = FILMS['500T'] if dyes == '500T' else REF
        self.A_inv = np.linalg.inv(f.A_neg)
        self.dmin_M = f.neg_dmin_M
        self.dye, self.base = f.neg_dye, f.neg_dmin

    def exposure(self, E):
        E = np.asarray(E, float)
        return E if self.ideal else S['layer_exposure'](self.M_rp, E)

    def density(self, E, push=0.0, interimage=1.0, saturation=1.0, layer=(1, 1, 1), ii=None):
        """Status M density of each layer.  push in stops of development (E)."""
        P = develop(self.P, push)
        e = self.exposure(E)
        x = np.log10(np.maximum(e, 1e-7) / GREY)
        D = np.stack([P[i, 0] + P[i, 1] * hd(x[..., i], *P[i, 2:]) for i in range(3)], -1)
        Dg = np.array([P[i, 0] + P[i, 1] * hd(0.0, *P[i, 2:]) for i in range(3)])
        if not self.ideal:
            c = np.array(CAL['interimage'] if ii is None else ii)
            # interimage on exposure-equivalent density: in the straight line the
            # same as coupling log exposures; in toe / shoulder it fades with the
            # density the layers actually develop
            u = (D - Dg) / P[:, 1]
            D = D + P[:, 1] * (couple(u, interimage, c) - u)
            # film saturation: each layer's departure from the density it would
            # have for a neutral of the same visual exposure
            if saturation != 1.0:
                xn = x @ VIS_W
                Dn = np.stack([P[i, 0] + P[i, 1] * hd(xn, *P[i, 2:]) for i in range(3)], -1)
                D = Dn + saturation * (D - Dn)
        # layer density (dye amount of each layer above base)
        D = P[:, 0] + np.asarray(layer, float) * (D - P[:, 0])
        return D

    def grey_reference(self, layer=(1, 1, 1)):
        """normal exposure, normal development: what the printer lights are set for"""
        return self.density(np.full(3, GREY), push=0.0, layer=layer)

    def spectrum(self, D, silver=0.0):
        amt = (D - self.dmin_M) @ self.A_inv.T
        return self.base + amt @ self.dye.T + np.asarray(silver)[..., None]


def develop(P, push):
    """push / pull as development time [E: no Kodak push data in our set]:
    layer gamma x (1 + 0.12 push), a small speed gain in the toe (0.06 log E
    per stop) and fog (+0.02 D per stop of push)."""
    P = P.copy()
    P[:, 1] *= 1.0 + 0.12 * push
    P[:, 2] -= 0.06 * push
    if push > 0:
        P[:, 0] += 0.02 * push
    return P


# ------------------------------------------------------------------ print
class Print:
    def __init__(self, crosstalk=1.0, xt=None):
        f = REF
        self.curves = {k: f.print_fit[k] for k in 'RGB'}
        self.A_inv = np.linalg.inv(f.A_print)
        self.dmin_amt = f.print_dmin_amt
        self.dmin_spec = f.print_dmin
        self.W = DATA['sens_2383'] * S['PRINTER_LAMP'][:, None]
        self.crosstalk = crosstalk
        self.xt = np.array(CAL['print_crosstalk'] if xt is None else xt)

    def exposure(self, spec):
        return np.maximum((10.0 ** (-spec)) @ self.W, 1e-30)

    def density(self, logH):
        return np.stack([S['print_curve'](logH[..., i], self.curves[k]) for i, k in enumerate('RGB')], -1)

    def inverse(self, D, k):
        xs = np.linspace(-3, 5, 16001)
        return np.interp(D, S['print_curve'](xs, self.curves[k]), xs)

    def project(self, Dp):
        amt = Dp @ self.A_inv.T
        spec = (amt - self.dmin_amt) @ DATA['print_dye'].T + self.dmin_spec
        light = S['XENON'] * 10.0 ** (-spec)
        C = S['cmf']()
        white = (S['XENON'] * 10.0 ** (-self.dmin_spec)) @ C
        XYZ = (light @ C) / white[1]
        XYZ = XYZ @ S['cat'](white / white[1], S['D65_XYZ']).T
        return XYZ @ S['XYZ_TO_2020'].T


def render(E, stock='V3_5207', push=0.0, interimage=1.0, saturation=1.0, layer=(1, 1, 1),
           crosstalk=1.0, lights=(0, 0, 0), ii=None, xt=None):
    """scene light (Rec.2020) -> projected print light (Rec.2020, clear print = 1)"""
    n = Negative(stock); p = Print(crosstalk, xt)
    D = n.density(E, push, interimage, saturation, layer, ii)
    Dg = n.grey_reference(layer)
    H, Hg = p.exposure(n.spectrum(D)), p.exposure(n.spectrum(Dg))
    e = np.log10(H / Hg)
    e = couple(e, crosstalk, p.xt)
    logH = np.stack([e[..., i] + p.inverse(LAD[i], k) + PT * lights[i] for i, k in enumerate('RGB')], -1)
    return p.project(p.density(logH))


def to_rec709(L):
    M = np.array([[1.66049100, -0.58764114, -0.07284986], [-0.12455047, 1.13289990, -0.00834942], [-0.01815076, -0.10057890, 1.11872966]])
    o = L @ M.T
    Y = L @ np.array([0.2627, 0.6780, 0.0593])
    mn = o.min(-1)
    t = np.where((mn < 0) & (Y > 0), Y / np.maximum(Y - mn, 1e-12), 1.0)
    o = Y[..., None] + (o - Y[..., None]) * t[..., None]
    return np.clip(o, 0, 1) ** (1 / 2.4)
