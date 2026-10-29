"""Generate plugin/Emulsion_lib/film_data.h from the Kodak data in dctl/tools.

    python3 build_data.py

The spectral model (dctl/tools/spectral.py) fits the datasheet curves and
builds the matrices; this script writes them as DCTL constants: spectral
tables (380-730 nm every 10 nm), densitometry matrices, the stock table and
the 2383 curves.  Requires numpy and scipy.
"""
import json, os
import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
DATA = os.path.normpath(os.path.join(HERE, '..', '..', 'tools'))
OUT = os.path.normpath(os.path.join(HERE, '..', 'plugin', 'Emulsion_lib', 'film_data.h'))

# the model on a 10 nm grid (the DCTL integrates 36 samples per pixel)
_src = open(os.path.join(DATA, 'spectral.py')).read()
_src = _src.replace('WL = np.arange(380.0, 735.0, 5.0)', 'WL = np.arange(380.0, 735.0, 10.0)')
S = {'__file__': os.path.join(DATA, 'spectral.py')}
exec(compile(_src, 'spectral.py', 'exec'), S)
WL, D = S['WL'], S['load_data']()
FILMS = {k: S['Film'](k, data=D) for k in ['50D', '250D', '500T']}
REF = FILMS['250D']

# Negative Stock combo box, in order.  `sens`: spectral sensitivity set
# (0 = 50D, 1 = 250D, 2 = 500T); `measured`: curves fitted on the Kodak sheet.
STOCKS = [
    ('V3_5203',   'Vision3 50D 5203',                 0, '50D'),
    ('V3_5207',   'Vision3 250D 5207',                1, '250D'),
    ('V3_5213',   'Vision3 200T 5213',                2, None),
    ('V3_5219',   'Vision3 500T 5219',                2, '500T'),
    ('V3_5219NR', 'Vision3 500T 5219 no rem-jet',     2, '500T'),
    ('V2_5201',   'Vision2 50D 5201',                 0, None),
    ('V2_5205',   'Vision2 250D 5205',                1, None),
    ('V2_5212',   'Vision2 100T 5212',                2, None),
    ('V2_5217',   'Vision2 200T 5217',                2, None),
    ('V2_5218',   'Vision2 500T 5218',                2, None),
    ('V2_5229',   'Vision2 Expression 500T 5229',     2, None),
    ('V1_5246',   'Vision 250D 5246',                 1, None),
    ('V1_5274',   'Vision 200T 5274',                 2, None),
    ('V1_5277',   'Vision 320T 5277',                 2, None),
    ('V1_5279',   'Vision 500T 5279',                 2, None),
    ('V1_5289',   'Vision 800T 5289',                 2, None),
    ('E_5247',    'Eastman ECN II 100T 5247',         2, None),
    ('E_5294',    'Eastman 400T 5294',                2, None),
    ('EXR_5245',  'Eastman EXR 50D 5245',             0, None),
    ('EXR_5248',  'Eastman EXR 100T 5248',            2, None),
    ('EXR_5293',  'Eastman EXR 200T 5293',            2, None),
    ('EXR_5296',  'Eastman EXR 500T 5296',            2, None),
    ('EXR_5298',  'Eastman EXR 500T 5298',            2, None),
    ('NEG_NONE',  'None - print only',                3, None),
]

# interimage (DIR) coupling between the negative layers, fitted on a
# ColorChecker in a real Vision3 250D scan (dctl/tools/fit_interimage.py),
# scaled to 0.6 of the scan fit: the strength that matches best through 2383
INTERIMAGE = {'RG': 0.0097, 'RB': 0.2045, 'GR': 0.0759, 'GB': -0.0772, 'BR': 0.2350, 'BG': -0.1913}
# 2383 layer cross-talk, fitted on a ColorChecker in a real 2383 print
# (dctl/tools/fit_print_crosstalk.py)
PRINT_XTALK = {'RG': -0.1236, 'RB': -0.0665, 'GR': 0.0655, 'GB': 0.0870, 'BR': -0.0223, 'BG': -0.0381}
LAD = (1.09, 1.06, 1.03)     # laboratory aim density of 18% grey on 2383, Status A


def f(x):
    s = '%.6g' % x
    if 'e' in s:
        m, e = s.split('e')
        return (m if '.' in m else m + '.0') + 'e' + e + 'f'
    return (s if '.' in s else s + '.0') + 'f'


def arr(name, v, comment=''):
    v = np.asarray(v, float).ravel()
    body = ', '.join(f(x) for x in v)
    return (f'// {comment}\n' if comment else '') + f'__CONSTANT__ float {name}[{len(v)}] = {{ {body} }};'


def mat(name, M, comment=''):
    return f'#define {name} ' + ', '.join(f(x) for x in np.asarray(M, float).ravel()) + (f'   // {comment}' if comment else '')


def stock_rows():
    """per stock: dmin, gamma, toe point, toe softness, shoulder, shoulder
    softness (each R, G, B), spectral set, colour separation"""
    legacy = json.load(open(os.path.join(DATA, 'legacy_stocks.json')))
    ref = REF.neg_fit['250D']
    rows, notes = [], []
    for sid, label, sens, measured in STOCKS:
        if sid == 'NEG_NONE':
            # ideal negative: straight line, no colour of its own
            P = [[ref[k][0], 0.6, -1.45, 0.05, 9.0, 0.3] for k in 'RGB']
            cd, note = 1.0, 'ideal negative'
        elif measured:
            P = [list(REF.neg_fit[measured][k]) for k in 'RGB']
            cd, note = 1.0, 'Kodak datasheet curves'
        else:
            # Vision3 spectral data with the tone character of the stock
            p = legacy[sid][1]
            g = {'R': p['gr'], 'G': p['gg'], 'B': p['gb']}
            P = [[ref[k][0], g[k] * ref[k][1] / 0.60, p['xt'], p['kt'], p['emax'], p['ks']] for k in 'RGB']
            cd, note = (1.0 + p['sat']) / 1.25, legacy[sid][0].lstrip('/ ') or 'tone from the stock character'
        P = np.array(P)                                  # 3 layers x 6
        rows.append(list(P.T.ravel()) + [sens, cd])      # dmin RGB, gamma RGB, ...
        notes.append(f'{sid:10s} {label} ({note})')
    return rows, notes


def main():
    F = REF
    o = ['// =============================================================================',
         '//  Emulsion film data: GENERATED by tools/build_data.py, do not edit by hand',
         '//',
         '//  Kodak H-1-5203 (Vision3 50D), H-1-5207 (250D), VISION3 500T brochure,',
         '//  H-1-2383 (2383 print film): spectral sensitivities, characteristic',
         '//  curves and dye densities digitised from the published graphs.',
         '// =============================================================================',
         '',
         f'#define NWL {len(WL)}             // spectral samples, {WL[0]:.0f}-{WL[-1]:.0f} nm every 10 nm', '']

    dye = D['neg_dye']
    o += [arr('NEG_DYE_C', dye[:, 0], 'negative dyes, Vision3 family (unit amount, peak normalised)'),
          arr('NEG_DYE_M', dye[:, 1]), arr('NEG_DYE_Y', dye[:, 2]), '']
    W = F.W_print * (10.0 ** -D['neg_dmin'])[:, None]
    W = W / W.sum(0)
    o += [arr('PRINT_W_R', W[:, 0], 'printer lamp x negative base (orange mask) x 2383 layer sensitivity; clear negative = 1'),
          arr('PRINT_W_G', W[:, 1]), arr('PRINT_W_B', W[:, 2]), '']
    pd = D['print_dye']
    o += [arr('PRINT_DYE_C', pd[:, 0], '2383 dyes (amount for a visual neutral 1.0)'),
          arr('PRINT_DYE_M', pd[:, 1]), arr('PRINT_DYE_Y', pd[:, 2]), '']
    C = S['cmf']()
    light = S['XENON'] * 10.0 ** (-F.print_dmin)
    white = light @ C
    P = (S['XYZ_TO_2020'] @ S['cat'](white / white[1], S['D65_XYZ']) @ (C.T * light / white[1])).T
    o += [arr('PROJ_R', P[:, 0], 'xenon projector x print base -> CIE 1931 -> D65 adapted -> Rec.2020; clear print = 1'),
          arr('PROJ_G', P[:, 1]), arr('PROJ_B', P[:, 2]), '']

    o += [mat('NEG_AINV', np.linalg.inv(F.A_neg), 'Status M density -> negative dye amounts'),
          mat('NEG_DMIN_M', F.neg_dmin_M, 'negative base, Status M'),
          mat('PRINT_AINV', np.linalg.inv(F.A_print), 'Status A density -> print dye amounts'),
          mat('PRINT_DMIN_A', [F.print_fit[k][0] for k in 'RGB'], 'print base, Status A'), '']

    sens = [FILMS[k].M_sens for k in ['50D', '250D', '500T']] + [np.eye(3)]
    o += [arr('SENS', np.array(sens), 'scene Rec.2020 -> layer exposure (R, G, B) for 50D, 250D, 500T, ideal; 9 values each'),
          arr('SENS_INV', np.array([np.linalg.inv(m) for m in sens]), '... and back (scans)'), '']

    o.append('// 2383 characteristic curves, Status A: dmin, dmax, mid point, gamma, toe, shoulder')
    for k in 'RGB':
        o.append(mat('PRINT_CURVE_' + k, F.print_fit[k]))
    avg = np.mean([[F.print_fit[k][3], F.print_fit[k][4], F.print_fit[k][5]] for k in 'RGB'], 0)
    o += [mat('PRINT_CURVE_AVG', avg, 'gamma, toe, shoulder averaged (neutral print curve)'),
          '#define LAD ' + ', '.join(f(x) for x in LAD) + '   // laboratory aim density of 18% grey, Status A', '']

    o.append('// interimage coupling (negative) and layer cross-talk (2383): x_i += c_ij (x_i - x_j)')
    o.append('#define INTERIMAGE ' + ', '.join(f(INTERIMAGE[k]) for k in ['RG', 'RB', 'GR', 'GB', 'BR', 'BG']))
    o.append('#define PRINT_XTALK ' + ', '.join(f(PRINT_XTALK[k]) for k in ['RG', 'RB', 'GR', 'GB', 'BR', 'BG']))
    o.append('')

    rows, notes = stock_rows()
    o.append(f'#define NSTOCK {len(rows)}')
    o.append('#define STOCK_STRIDE 20')
    o.append('// Negative Stock combo box order (the table index is the combo value):')
    o += ['//   ' + n for n in notes]
    o.append('// per stock: dmin RGB, gamma RGB, toe RGB, toe softness RGB, shoulder RGB,')
    o.append('// shoulder softness RGB, spectral set, colour separation')
    o.append(arr('STOCKS', np.array(rows)))
    o.append(f'#define STOCK_ORDER "{" ".join(s[0] for s in STOCKS)}"')
    open(OUT, 'w').write('\n'.join(o) + '\n')
    print('wrote', os.path.relpath(OUT))


if __name__ == '__main__':
    main()
