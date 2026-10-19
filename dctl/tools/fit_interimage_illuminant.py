import numpy as np
exec(open('fit_ii.py').read().split("p0 = np.array")[0])
TR = S['TRAIN']; RGBS = S['RGB_OF_SPECTRUM']; WLn = S['WL']
sens = F.d['sens_250D']
def msens(T):
    ill = S['blackbody'](T)
    W = sens * ill[:, None]; W = W / W.sum(0)          # film exposed under T, grey-balanced (scanner/timing neutralises)
    # what a D65 camera would record for the same surfaces is our input; the film sees them under T
    rgb_d65 = TR @ RGBS.T
    E = TR @ W
    M = np.linalg.lstsq(rgb_d65, E, rcond=None)[0].T
    return M / M.sum(1, keepdims=True)
cache = {}
def render2(params, ev, T):
    key = round(T, -1)
    if key not in cache: cache[key] = msens(key)
    c, p = params[:6], params[6:]
    E = rgb @ cache[key].T * 2 ** ev
    x = np.log10(np.maximum(E, 1e-6) / 0.18)
    return scan(density(interimage(x, c)), p)
def res2(q, fix_c=False):
    params = np.concatenate([np.zeros(6) if fix_c else q[:6], q[6:13]])
    o = chroma(render2(params, q[13], q[14] * 1000)); r = o - tc; r[:, 2] *= 0.5
    return (r * np.where(neutral, 1.0, 1.5)[:, None]).ravel()
p0 = np.concatenate([np.load('ii_fit.npy'), [5.5]])
lo = [-0.6] * 6 + [0.3, -2, -1, -1, -0.1, 0.6, 0.3, -2, 2.6]; hi = [1.5] * 6 + [3, 2, 1, 1, 0.2, 1.1, 6, 2, 7.5]
best = None
for T0 in [3.0, 4.0, 5.5, 6.5]:
    q0 = p0.copy(); q0[14] = T0
    b = least_squares(lambda q: res2(q, True), q0, bounds=(lo, hi))
    f = least_squares(res2, b.x, bounds=(lo, hi))
    if best is None or f.cost < best[1].cost: best = (b, f)
b, f = best
H = lambda v: np.array([colorsys.rgb_to_hsv(*np.clip(c, 0, 1)) for c in v])
def errs2(q, fix_c=False):
    params = np.concatenate([np.zeros(6) if fix_c else q[:6], q[6:13]]); o = render2(params, q[13], q[14] * 1000)
    hf, ho = H(film), H(o); m = ~neutral
    return np.abs(((ho[m, 0] - hf[m, 0] + .5) % 1 - .5) * 360).mean(), np.abs(ho[m, 1] - hf[m, 1]).mean(), o
for tag, q, fx in [('svetlo scény + sken, bez interimage', b.x, True), ('svetlo + sken + interimage', f.x, False)]:
    dh, ds, o = errs2(q, fx); print(f'{tag}: odstin {dh:.1f} deg, sytost {ds:.3f}, svetlo {q[14]*1000:.0f} K')
print('interimage  R: vs G %.3f vs B %.3f | G: vs R %.3f vs B %.3f | B: vs R %.3f vs G %.3f' % tuple(f.x[:6]))
np.save('ii_fit2.npy', f.x)
dh, ds, o = errs2(f.x)
for i, n in enumerate(order):
    if n in names[0]: continue
    hf, ho = colorsys.rgb_to_hsv(*film[i]), colorsys.rgb_to_hsv(*np.clip(o[i], 0, 1))
    print('  %-14s film %-15s model %-15s dh %+4.0f' % (n, np.round(film[i] * 255).astype(int), np.round(np.clip(o[i], 0, 1) * 255).astype(int), ((ho[0] - hf[0] + .5) % 1 - .5) * 360))
