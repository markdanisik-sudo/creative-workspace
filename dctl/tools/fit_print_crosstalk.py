import numpy as np, sys
from scipy.optimize import minimize
import cmp_print as cp
from runc import runbin, lin709_to_di
K = ['PI_RG', 'PI_RB', 'PI_GR', 'PI_GB', 'PI_BR', 'PI_BG']
img = lin709_to_di((cp.ref_lin * 2 ** 0.4)[None].astype(np.float32))
def run(x): return np.clip(runbin('fitp', img, p_Stock=1, p_Output=1, **dict(zip(K, x)))[0], 0, 1)
def obj(x):
    h, s = cp.err(run(x)); return h / 8 + s + 0.05 * np.sum(np.square(x))
r = minimize(obj, np.zeros(6), method='Nelder-Mead', options=dict(maxiter=900, xatol=1e-3, fatol=1e-4, initial_simplex=None))
print(np.round(r.x, 4).tolist()); print('pred: hue %.1f sat %.2f' % cp.err(run(np.zeros(6))), ' po: hue %.1f sat %.2f' % cp.err(run(r.x)))
np.save('pi_fit.npy', r.x); cp.err(run(r.x), True)
