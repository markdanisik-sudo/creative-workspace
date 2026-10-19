import sys, numpy as np, colorsys
sys.path.insert(0, 'kodak')
from scipy.optimize import least_squares
from cc import REF, FILM, names, lin
src = open('kodak/spectral.py').read().replace("WL = np.arange(380.0, 735.0, 5.0)", "WL = np.arange(380.0, 735.0, 10.0)")
S = {'__file__': 'kodak/spectral.py'}; exec(compile(src, 'sp', 'exec'), S)
F = S['Film']('250D')
M709_2020 = np.array([[0.62740390, 0.32928304, 0.04331307], [0.06909729, 0.91954040, 0.01136232], [0.01639144, 0.08801331, 0.89559525]])
order = sum(names, [])
rgb = np.array([lin(REF[n]) for n in order]) @ M709_2020.T
film = np.array([FILM[n] for n in order])
neutral = np.array([n in names[0] for n in order])
nf = F.neg_fit['250D']
def density(x):                     # x: log10 exposure rel. grey, per layer -> Status M density
    return np.stack([S['neg_curve'](x[:, i] / 0.30103, nf[k]) for i, k in enumerate('RGB')], 1)
def interimage(x, c):
    # each layer is pushed away from the others: x_i += sum_j c_ij (x_i - x_j); neutrals untouched
    cr, cg, cb = c[0:2], c[2:4], c[4:6]
    xr, xg, xb = x[:, 0], x[:, 1], x[:, 2]
    return np.stack([xr + cr[0] * (xr - xg) + cr[1] * (xr - xb),
                     xg + cg[0] * (xg - xr) + cg[1] * (xg - xb),
                     xb + cb[0] * (xb - xr) + cb[1] * (xb - xg)], 1)
def scan(D, p):
    # generic scanner: per-channel inversion around grey, shared tone curve (logistic in density)
    Dg = density(np.zeros((1, 3)))[0]
    g = np.array([nf[k][1] for k in 'RGB'])
    u = (D - Dg) / g * 0.30103 * p[0] + p[1] + np.array([0, p[2], p[3]])     # stops-ish, channel balance
    v = p[4] + (p[5] - p[4]) / (1 + np.exp(-u * p[6]))
    return np.clip(v, 0, 1)
def render(params, ev):
    c, p = params[:6], params[6:]
    E = rgb @ F.M_sens.T * 2 ** ev
    x = np.log10(np.maximum(E, 1e-6) / 0.18)
    return scan(density(interimage(x, c)), p)
def chroma(v):
    l = lin(np.clip(v, 0, 1)); Y = l @ [0.2126, 0.7152, 0.0722]
    return np.stack([(l[:, 0] - Y) / (Y + 0.02), (l[:, 2] - Y) / (Y + 0.02), np.log2((Y + 0.01) / 0.2)], 1)
tc = chroma(film)
def res(q, fix_c=False):
    params = np.concatenate([np.zeros(6) if fix_c else q[:6], q[6:13]]); ev = q[13]
    o = chroma(render(params, ev))
    r = (o - tc); r[:, 2] *= 0.5
    w = np.where(neutral, 1.0, 1.5)[:, None]
    return (r * w).ravel()
p0 = np.array([0, 0, 0, 0, 0, 0, 1.0, 0.0, 0.0, 0.0, 0.0, 0.95, 1.5, 0.0])
lo = [-0.6] * 6 + [0.3, -2, -1, -1, -0.1, 0.6, 0.3, -2]; hi = [1.5] * 6 + [3, 2, 1, 1, 0.2, 1.1, 6, 2]
base = least_squares(lambda q: res(q, True), p0, bounds=(lo, hi))
fit = least_squares(res, base.x, bounds=(lo, hi))
H = lambda v: np.array([colorsys.rgb_to_hsv(*np.clip(c, 0, 1)) for c in v])
def errs(q, fix_c=False):
    params = np.concatenate([np.zeros(6) if fix_c else q[:6], q[6:13]]); o = render(params, q[13])
    hf, ho = H(film), H(o); m = ~neutral
    dh = np.abs(((ho[m, 0] - hf[m, 0] + 0.5) % 1 - 0.5) * 360); ds = np.abs(ho[m, 1] - hf[m, 1])
    return dh.mean(), ds.mean(), o
for tag, q, fx in [('bez interimage (jen sken)', base.x, True), ('s interimage', fit.x, False)]:
    dh, ds, o = errs(q, fx); print(f'{tag}: odstin {dh:.1f} deg, sytost {ds:.3f}')
c = fit.x[:6]
print('interimage koeficienty  R: vs G %.3f vs B %.3f | G: vs R %.3f vs B %.3f | B: vs R %.3f vs G %.3f' % tuple(c))
print('scanner params', np.round(fit.x[6:], 3))
np.save('ii_fit.npy', fit.x)
dh, ds, o = errs(fit.x)
for i, n in enumerate(order):
    if n in names[0]: continue
    hf, ho = colorsys.rgb_to_hsv(*film[i]), colorsys.rgb_to_hsv(*np.clip(o[i], 0, 1))
    print('  %-14s film %s  model %s   dh %+4.0f' % (n, np.round(film[i] * 255).astype(int), np.round(np.clip(o[i], 0, 1) * 255).astype(int), ((ho[0] - hf[0] + .5) % 1 - .5) * 360))
