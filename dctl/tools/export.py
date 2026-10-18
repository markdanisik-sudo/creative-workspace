"""Export the spectral film model as DCTL source: tables.c (spectral tables) and
neg_stock.c (stock table), pasted into FilmLab_Color.dctl.

    python3 export.py
"""
import sys, os, re, json
import numpy as np
HERE = os.path.dirname(os.path.abspath(__file__))
src = open(os.path.join(HERE, 'spectral.py')).read().replace("WL = np.arange(380.0, 735.0, 5.0)", "WL = np.arange(380.0, 735.0, 10.0)")
S = {'__file__': os.path.join(HERE, 'spectral.py')}
exec(compile(src, 'spectral', 'exec'), S)
WL, d = S['WL'], S['load_data']()
films = {k: S['Film'](k, data=d) for k in ['50D', '250D', '500T']}
F = films['250D']
N = len(WL)

def arr(name, v, comment=''):
    vals = ', '.join(('%.6g' % x) + ('' if '.' in ('%.6g' % x) or 'e' in ('%.6g' % x) else '.0') + 'f' for x in v)
    vals = vals.replace('.0e', 'e')
    return f'__CONSTANT__ float {name}[{len(v)}] = {{ {vals} }};' + (f'   // {comment}' if comment else '')

def f(x): s = '%.6g' % x; return (s if ('.' in s or 'e' in s) else s + '.0') + 'f'
def f3(v): return 'make_float3(%s, %s, %s)' % tuple(f(x) for x in v)
def mat(name, M): return f'#define {name} ' + ', '.join(f(x) for x in np.asarray(M).ravel())

out = []
out.append(f'#define NWL {N}            // spectral samples, {WL[0]:.0f}-{WL[-1]:.0f} nm every 10 nm')
# negative dyes (C, M, Y), Vision3 family, peak normalised (Kodak H-1-5207)
dye = d['neg_dye']
out += [arr('NEG_DYE_C', dye[:, 0], 'Vision3 cyan dye'), arr('NEG_DYE_M', dye[:, 1], 'magenta'), arr('NEG_DYE_Y', dye[:, 2], 'yellow')]
# print exposure weights: printer lamp x 2383 spectral sensitivity x orange mask (negative D-min)
W = F.W_print * (10.0 ** -d['neg_dmin'])[:, None]
W = W / W.sum(0)                                     # clear negative -> exposure 1 per layer
out += [arr('PRINT_W_R', W[:, 0], '2383 red-sensitive layer x printer lamp x negative base'), arr('PRINT_W_G', W[:, 1]), arr('PRINT_W_B', W[:, 2])]
# print dyes (C, M, Y), amounts for a visual neutral 1.0 (Kodak H-1-2383)
pd = d['print_dye']
out += [arr('PRINT_DYE_C', pd[:, 0], '2383 cyan dye'), arr('PRINT_DYE_M', pd[:, 1]), arr('PRINT_DYE_Y', pd[:, 2])]
# projection: xenon x print D-min x CIE 1931 -> adapt clear print to D65 -> Rec.2020, clear print = 1
C = S['cmf']()
light = S['XENON'] * 10.0 ** (-F.print_dmin)
white = light @ C
P = (S['XYZ_TO_2020'] @ S['cat'](white / white[1], S['D65_XYZ']) @ (C.T * light / white[1])).T
out += [arr('PROJ_R', P[:, 0], 'xenon projection -> Rec.2020 (D65 adapted)'), arr('PROJ_G', P[:, 1]), arr('PROJ_B', P[:, 2])]
out.append(mat('AINV_NEG', np.linalg.inv(F.A_neg)) + '      // Status M density -> negative dye amounts')
out.append(mat('NEG_DMIN_M', F.neg_dmin_M))
out.append(mat('AINV_PRINT', np.linalg.inv(F.A_print)) + '    // Status A density -> print dye amounts')
pdm = np.array([F.print_fit[k][0] for k in 'RGB'])
out.append(mat('PRINT_DMIN_A', pdm))
# exposure matrices (Rec.2020 -> layer exposure), and their inverses for scans
for k, fl in films.items():
    out.append(mat('MSENS_' + k, fl.M_sens) + f'   // Rec.2020 -> {k} layer exposure (R, G, B)')
    out.append(mat('MSENS_INV_' + k, np.linalg.inv(fl.M_sens)))
# 2383 curves
pf = F.print_fit
for i, k in enumerate('RGB'):
    out.append(mat('PRINT_CURVE_' + k, pf[k]) + '   // dmin, dmax, x0, gamma, toe, shoulder')
open(os.path.join(HERE, 'tables.c'), 'w').write('\n'.join(out) + '\n')

# ------------------------------------------------------------------ stock table
neg_fit = F.neg_fit
blocks = json.load(open(os.path.join(HERE, 'legacy_stocks.json')))   # tone character of the non-Vision3 stocks
measured = {'V3_5203': '50D', 'V3_5207': '250D', 'V3_5219': '500T', 'V3_5219NR': '500T'}
daylight = {'V3_5203', 'V3_5207', 'V2_5201', 'V2_5205', 'V1_5246', 'EXR_5245'}
fifty = {'V3_5203', 'V2_5201', 'EXR_5245'}
ref = neg_fit['250D']
lines = ['__DEVICE__ NegStock neg_stock(int id)', '{', '    NegStock s;']
first = True
for sid, (cmt, p) in blocks.items():  # noqa
    if sid == 'NEG_NONE': continue
    if sid in measured:
        nf = neg_fit[measured[sid]]
        par = {k: nf[k] for k in 'RGB'}; cd = 1.0; src = 'Kodak datasheet, measured'
        mx = {'50D': 0, '250D': 1, '500T': 2}[measured[sid]]
    else:
        g = {'R': p['gr'], 'G': p['gg'], 'B': p['gb']}
        par = {k: [ref[k][0], g[k] * ref[k][1] / 0.60, p['xt'], p['kt'], p['emax'], p['ks']] for k in 'RGB'}
        cd = (1.0 + p['sat']) / 1.25; src = 'Vision3 spectral data, tone from the stock character'
        mx = 0 if sid in fifty else (1 if sid in daylight else 2)
    P = np.array([par[k] for k in 'RGB'])     # 3 x 6
    lines.append(f"    {'if' if first else '} else if'} (id == {sid}) {{" + (f'  {cmt}' if cmt else ''))
    lines.append(f'        // {src}')
    names = ['dmin', 'g', 'xt', 'kt', 'emax', 'ks']
    lines.append('        ' + ' '.join(f's.{n} = {f3(P[:, j])};' for j, n in enumerate(names[:3])))
    lines.append('        ' + ' '.join(f's.{n} = {f3(P[:, j])};' for j, n in enumerate(names[3:], 3)))
    lines.append(f'        s.mat = {mx}; s.cd = {f(cd)};')
    first = False
r = ref
lines.append('    } else {                      // NEG_NONE: ideal negative, straight line, no colour of its own')
lines.append(f"        s.dmin = {f3([r[k][0] for k in 'RGB'])}; s.g = make_float3(0.6f, 0.6f, 0.6f); s.xt = make_float3(-1.45f, -1.45f, -1.45f);")
lines.append('        s.kt = make_float3(0.05f, 0.05f, 0.05f); s.emax = make_float3(9.0f, 9.0f, 9.0f); s.ks = make_float3(0.3f, 0.3f, 0.3f);')
lines.append('        s.mat = 3; s.cd = 1.0f;')
lines += ['    }', '    return s;', '}', '']
open(os.path.join(HERE, 'neg_stock.c'), 'w').write('\n'.join(lines))
print('\n'.join(out[:2]), '...'); print('\n'.join(lines[:12]))
