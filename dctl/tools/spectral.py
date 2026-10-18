"""Spectral film model built from the digitized Kodak datasheets.

scene RGB (linear Rec.2020) -> reflectance spectrum (smooth basis)
-> negative layer exposure (spectral sensitivity, balance illuminant)
-> characteristic curves (Status M density per layer, fitted)
-> dye amounts -> negative spectral density
-> print exposure (printer lamp, 2383 spectral sensitivity), timed to LAD
-> 2383 characteristic curves (Status A) -> print dye amounts
-> print spectral density -> projection (xenon) -> XYZ -> Rec.2020
"""
import json, os
import numpy as np
from scipy.optimize import least_squares

HERE = os.path.dirname(os.path.abspath(__file__))
WL = np.arange(380.0, 735.0, 5.0)          # wavelength grid (nm)

# ---------------------------------------------------------------- colorimetry
def _g(l, mu, s1, s2):
    s = np.where(l < mu, s1, s2)
    return np.exp(-0.5 * ((l - mu) / s) ** 2)

def cmf(l=WL):
    """CIE 1931 2deg colour matching functions, multi-lobe gaussian fit (Wyman et al. 2013)"""
    x = 1.056 * _g(l, 599.8, 37.9, 31.0) + 0.362 * _g(l, 442.0, 16.0, 26.7) - 0.065 * _g(l, 501.1, 20.4, 26.2)
    y = 0.821 * _g(l, 568.8, 46.9, 40.5) + 0.286 * _g(l, 530.9, 16.3, 31.1)
    z = 1.217 * _g(l, 437.0, 11.8, 36.0) + 0.681 * _g(l, 459.0, 26.0, 13.8)
    return np.stack([x, y, z], 1)

def blackbody(T, l=WL):
    l = l * 1e-9
    b = 1.0 / (l ** 5 * (np.exp(1.4387769e-2 / (l * T)) - 1.0))
    return b / b[np.argmin(abs(WL - 560))]

def daylight(T, l=WL):
    """CIE daylight series via its xy chromaticity; spectrum approximated by a
    blackbody with the same correlated temperature (fine for exposure balance)"""
    return blackbody(T, l)

XYZ_TO_2020 = np.linalg.inv(np.array([[0.63695805, 0.14461690, 0.16888098],
                                      [0.26270021, 0.67799807, 0.05930172],
                                      [0.00000000, 0.02807269, 1.06098506]]))
CAT02 = np.array([[0.7328, 0.4296, -0.1624], [-0.7036, 1.6975, 0.0061], [0.0030, 0.0136, 0.9834]])
D65_XYZ = np.array([0.95047, 1.0, 1.08883])

def cat(src_xyz, dst_xyz):
    s, d = CAT02 @ src_xyz, CAT02 @ dst_xyz
    return np.linalg.inv(CAT02) @ np.diag(d / s) @ CAT02

def xy_to_XYZ(x, y): return np.array([x / y, 1.0, (1 - x - y) / y])

# ---------------------------------------------------------------- datasheet data
def _resample(pts, l=WL, fill=None):
    a = np.array(sorted(pts)); x, y = a[:, 0], a[:, 1]
    keep = np.concatenate([[True], np.diff(x) > 1e-6]); x, y = x[keep], y[keep]
    out = np.interp(l, x, y)
    if fill is not None:
        out = np.where((l < x[0]) | (l > x[-1]), fill, out)
    return out

def _logsens(pts, l=WL):
    """log sensitivity outside the plotted range falls off steeply"""
    a = np.array(sorted(pts)); x, y = a[:, 0], a[:, 1]
    keep = np.concatenate([[True], np.diff(x) > 1e-6]); x, y = x[keep], y[keep]
    out = np.interp(l, x, y)
    out = np.where(l < x[0], y[0] - 0.08 * (x[0] - l), out)
    out = np.where(l > x[-1], y[-1] - 0.08 * (l - x[-1]), out)
    return out

def load_data():
    J = lambda f: json.load(open(os.path.join(HERE, f)))
    d = {}
    # negative spectral sensitivities (log), layers ordered R, G, B (= C, M, Y forming)
    s50, s250, v500 = J('sens_50d.json'), J('sens_250d.json'), J('v_500t.json')
    for name, s in [('50D', s50), ('250D', s250), ('500T', v500['sens'])]:
        d['sens_' + name] = np.stack([10 ** _logsens(s['C']), 10 ** _logsens(s['M']), 10 ** _logsens(s['Y'])], 1)
    # negative dyes (Vision3 family, from 250D): C, M, Y and base (orange mask)
    dy = J('dye_250d.json')
    ext = lambda k: _resample(dy[k], fill=None)
    d['neg_dye'] = np.maximum(np.stack([ext('C'), ext('M'), ext('Y')], 1), 0.0)
    d['neg_dmin'] = np.maximum(ext('Dmin'), 0.0)
    d['neg_mid'] = ext('N')
    # characteristic curves (Status M), stops relative to the normal grey exposure
    d['char_neg'] = J('char_neg.json')
    # print
    ps = J('sens_2383.json')
    def psens(main, tail):
        m = 10 ** _logsens(main)
        if tail: m = m + 10 ** _logsens(tail) * (WL <= max(p[0] for p in tail) + 1)
        return m
    d['sens_2383'] = np.stack([psens(ps['C'], ps['C_blue']), psens(ps['M'], ps['M_blue']), psens(ps['Y'], None)], 1)
    pd = J('dye_2383.json')
    d['print_dye'] = np.maximum(np.stack([_resample(pd['C'], fill=0.0), _resample(pd['M'], fill=0.0), _resample(pd['Y'], fill=0.0)], 1), 0.0)
    d['print_neutral'] = _resample(pd['N'])
    d['char_2383'] = J('char_2383_rows.json')
    return d

# ---------------------------------------------------------------- filters / lamps
def uv_filter(l=WL):   # Wratten 2B-like
    return np.clip((l - 385) / 20.0, 0, 1)
def heat_glass(l=WL):  # heat absorbing glass: rolls off the deep red / IR
    return np.where(l < 660, 1.0, np.clip(1.0 - (l - 660) / 120.0, 0.2, 1.0))
PRINTER_LAMP = blackbody(3200) * uv_filter() * heat_glass()
XENON = blackbody(5800) * uv_filter()

# ---------------------------------------------------------------- training reflectances
def natural_reflectances(n=4000, seed=1):
    """random smooth, physically valid (0..1) reflectance spectra: sums of broad bumps
    and sigmoid edges, like paints, foliage, skin and fabrics"""
    rng = np.random.default_rng(seed)
    R = np.zeros((n, len(WL)))
    for i in range(n):
        r = np.full(len(WL), rng.uniform(0.02, 0.3))
        for _ in range(rng.integers(1, 4)):
            if rng.random() < 0.5:   # sigmoid edge (yellows, reds, oranges)
                c, w, h = rng.uniform(420, 680), rng.uniform(8, 40), rng.uniform(-0.6, 0.8)
                r += h / (1 + np.exp(-(WL - c) / w))
            else:                    # band (greens, blues, purples)
                c, w, h = rng.uniform(400, 700), rng.uniform(20, 90), rng.uniform(-0.5, 0.8)
                r += h * np.exp(-0.5 * ((WL - c) / w) ** 2)
        R[i] = np.clip(r, 0.01, 1.0)
    return R

XYZ_D65 = cmf() * daylight(6504)[:, None]
RGB_OF_SPECTRUM = XYZ_TO_2020 @ (XYZ_D65.T / XYZ_D65[:, 1].sum())     # 3 x n, flat reflector = (1,1,1)
TRAIN = natural_reflectances()

# ---------------------------------------------------------------- curves
def sp10(z):
    z = np.asarray(z, float)
    return np.where(z > 0, z + np.log10(1 + 10.0 ** (-np.abs(z))), np.log10(1 + 10.0 ** (-np.abs(z))))

def hd(x, xt, kt, emax, ks):
    e = kt * sp10((x - xt) / kt)
    return e - ks * sp10((e - emax) / ks)

def neg_curve(stops, p):
    """p = (dmin, gamma, xt, kt, emax, ks); x in log10 exposure relative to grey"""
    dmin, g, xt, kt, emax, ks = p
    return dmin + g * hd(np.asarray(stops) * 0.30103, xt, kt, emax, ks)

def fit_neg_curves(char):
    out = {}
    for stock, layers in char.items():
        out[stock] = {}
        for k in 'RGB':
            a = np.array(layers[k]); s, D = a[:, 0], a[:, 1]
            p0 = [D.min(), 0.6, -1.3, 0.25, 3.5, 0.35]
            lo = [0.0, 0.3, -2.6, 0.05, 1.0, 0.05]; hi = [1.2, 1.0, -0.3, 0.8, 6.0, 1.5]
            r = least_squares(lambda p: neg_curve(s, p) - D, p0, bounds=(lo, hi))
            out[stock][k] = r.x
    return out

PRINT_DMIN = {'R': 0.05, 'G': 0.05, 'B': 0.09}    # 2383 base + fog, Status A (read off the toe)

def print_curve(logH, p):
    """2383 Status A density vs log exposure: sigmoid with a free toe and shoulder.
    p = (dmin, dmax, x0, gamma, toe, shoulder)"""
    dmin, dmax, x0, g, a, b = p
    x = np.asarray(logH, float)
    # asymmetric logistic: separate softness below / above the mid point
    t = (x - x0) * g
    s = np.where(t < 0, a, b)
    return dmin + (dmax - dmin) / (1.0 + np.exp(-t / s)) ** s

def fit_print_curves(char):
    out = {}
    for k in 'RGB':
        a = np.array(char[k]); x, D = a[:, 0], a[:, 1]
        dm = PRINT_DMIN[k]
        f = lambda q: print_curve(x, [dm] + list(q)) - D
        q0 = [4.1, np.interp(2.0, D, x), 2.5, 1.0, 1.0]
        r = least_squares(f, q0, bounds=([3.8, -1.0, 0.5, 0.2, 0.2], [4.4, 3.0, 8.0, 5.0, 5.0]))
        out[k] = np.array([dm] + list(r.x))
    return out

# ---------------------------------------------------------------- densitometry
def bands(centers, width=18.0):
    b = np.stack([np.exp(-0.5 * ((WL - c) / width) ** 2) for c in centers], 1)
    return b / b.sum(0)

STATUS_M = bands([655.0, 540.0, 445.0])      # R, G, B (negative dye peaks region)
STATUS_A = bands([631.7, 547.2, 459.0], 16.9)   # R, G, B: calibrated so the LAD patch is a visual neutral 1.0 under xenon

def band_matrix(dyes, band):
    """band density of unit dye k in channel j (linear, average density)"""
    return band.T @ dyes                       # 3 x 3

# ---------------------------------------------------------------- model
class Film:
    def __init__(self, stock='250D', balance=None, data=None):
        self.d = data or load_data()
        self.stock = stock
        self.neg_fit = fit_neg_curves(self.d['char_neg'])
        self.print_fit = fit_print_curves(self.d['char_2383'])
        sens = self.d['sens_' + stock]
        T = balance or (3200 if stock.endswith('T') else 5500)
        self.illum = blackbody(T) if T < 4000 else daylight(T)
        # scene RGB -> layer exposure: best linear map over natural reflectances,
        # exposed under the film's balance illuminant, neutral kept exact
        W = sens * self.illum[:, None]                           # n x 3 (R, G, B layer)
        W = W / W.sum(0)                                         # flat reflector -> exposure 1
        rgb = TRAIN @ RGB_OF_SPECTRUM.T; E = TRAIN @ W
        M = np.linalg.lstsq(rgb, E, rcond=None)[0].T             # 3 x 3
        M = M / M.sum(1, keepdims=True)                          # (1,1,1) -> (1,1,1)
        self.M_sens = M
        self.train_err = np.abs(rgb @ M.T - E).mean(0) / E.mean(0)
        self.A_neg = band_matrix(self.d['neg_dye'], STATUS_M)
        self.A_print = band_matrix(self.d['print_dye'], STATUS_A)
        self.neg_dmin_M = STATUS_M.T @ self.d['neg_dmin']
        # print Dmin: small, slightly bluish base (Status A ~ 0.04 / 0.05 / 0.09)
        pdmin = np.array([p[0] for p in (self.print_fit['R'], self.print_fit['G'], self.print_fit['B'])])
        self.print_dmin_amt = np.linalg.solve(self.A_print, pdmin)
        self.print_dmin = self.d['print_dye'] @ self.print_dmin_amt
        self.W_print = self.d['sens_2383'] * PRINTER_LAMP[:, None]
        self.lad = np.array([1.09, 1.06, 1.03])
        self.calibrate()

    # ---- negative
    def neg_density(self, rgb):
        E = np.einsum('ij,...j->...i', self.M_sens, np.asarray(rgb, float))
        stops = np.log2(np.maximum(E, 1e-6) / 0.18)
        f = self.neg_fit[self.stock]
        return np.stack([neg_curve(stops[..., i], f[k]) for i, k in enumerate('RGB')], -1)

    def neg_spectrum(self, D):
        amt = np.einsum('ij,...j->...i', np.linalg.inv(self.A_neg), D - self.neg_dmin_M)
        return self.d['neg_dmin'] + np.einsum('nk,...k->...n', self.d['neg_dye'], amt), amt

    # ---- print
    def print_exposure(self, Dneg_spec):
        t = 10.0 ** (-Dneg_spec)
        return np.einsum('...n,nj->...j', t, self.W_print)

    def calibrate(self):
        """printer lights so that the 18% grey prints to LAD (Status A 1.09 / 1.06 / 1.03)"""
        Dg = self.neg_density(np.array([0.18, 0.18, 0.18]))
        H = self.print_exposure(self.neg_spectrum(Dg)[0])
        target = []
        for i, k in enumerate('RGB'):
            p = self.print_fit[k]
            xs = np.linspace(-2, 4, 4001); target.append(np.interp(self.lad[i], print_curve(xs, p), xs))
        self.print_offset = np.array(target) - np.log10(H)

    def print_density(self, Dneg_spec, lights=(0, 0, 0)):
        logH = np.log10(np.maximum(self.print_exposure(Dneg_spec), 1e-12)) + self.print_offset + 0.025 * np.array(lights)
        return np.stack([print_curve(logH[..., i], self.print_fit[k]) for i, k in enumerate('RGB')], -1)

    def project(self, Dp):
        amt = np.einsum('ij,...j->...i', np.linalg.inv(self.A_print), Dp)
        spec = np.einsum('nk,...k->...n', self.d['print_dye'], amt - self.print_dmin_amt) + self.print_dmin
        light = XENON * 10.0 ** (-spec)
        C = cmf()
        XYZ = np.einsum('...n,nj->...j', light, C)
        white = (XENON * 10.0 ** (-self.print_dmin)) @ C
        XYZ = np.einsum('ij,...j->...i', cat(white / white[1], D65_XYZ), XYZ / white[1])
        return np.einsum('ij,...j->...i', XYZ_TO_2020, XYZ), amt

    def render(self, rgb2020, lights=(0, 0, 0)):
        D = self.neg_density(rgb2020)
        spec, _ = self.neg_spectrum(D)
        Dp = self.print_density(spec, lights)
        L, _ = self.project(Dp)
        return L

def to709(L):
    M = np.array([[1.66049100, -0.58764114, -0.07284986], [-0.12455047, 1.13289990, -0.00834942], [-0.01815076, -0.10057890, 1.11872966]])
    o = np.einsum('ij,...j->...i', M, L)
    Y = L @ np.array([0.2627, 0.6780, 0.0593])
    mn = o.min(-1); t = np.where((mn < 0) & (Y > 0), Y / np.maximum(Y - mn, 1e-12), 1.0)
    o = Y[..., None] + (o - Y[..., None]) * t[..., None]
    return np.clip(o, 0, 1) ** (1 / 2.4)
