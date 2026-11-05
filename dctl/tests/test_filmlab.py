"""Film Lab v4 validation, run on the CPU (no Resolve needed).

    python3 dctl/tests/test_filmlab.py           # all tests
    python3 dctl/tests/test_filmlab.py kodak     # tests whose name contains "kodak"

Needs g++, numpy, scipy and colour-science.  The DCTL is built as C++ by
Emulsion/test/dctl.py (shim of the DCTL runtime) and compared with:
  - the digitised Kodak curves (dctl/tools/*.json)            numerical
  - colour-science (camera decoding)                           numerical
  - the Python reference model (dctl/tools/filmlab_model.py)   numerical
Visual qualities (grain look, halation look, overall "film feel") are not
tested here; see FILMLAB_V4.md, section Validation.
"""
import json, os, re, subprocess, sys, traceback
import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.normpath(os.path.join(HERE, '..'))
sys.path.insert(0, os.path.join(ROOT, 'Emulsion', 'test'))
sys.path.insert(0, os.path.join(ROOT, 'tools'))
import dctl                      # noqa: E402
import colour                    # noqa: E402
import filmlab_model as M        # noqa: E402

_cache = {}
OFF = dict(p_Grain=0.0, p_Halation=0.0)             # colour only
LIN2020 = dict(p_InGamut='G_2020', p_InGamma='T_LIN')


def plug(name='FilmLab_Color.dctl'):
    if name not in _cache:
        _cache[name] = dctl.build(os.path.join(ROOT, name))
    return _cache[name]


def run(img, **kw):
    return plug().run(np.asarray(img, np.float32), **dict(OFF, **kw))


def px(rgb):
    return np.asarray(rgb, np.float32).reshape(1, -1, 3)


def stops_ramp(lo=-7.0, hi=7.0, n=141):
    s = np.linspace(lo, hi, n)
    return s, px(np.repeat((0.18 * 2.0 ** s)[:, None], 3, 1))


def cineon_density(out):
    """Cineon printing density output -> D - D(normal grey)"""
    return (out * 1023.0 - 445.0) * 0.002


# ---------------------------------------------------------------- source

def strip(src):
    src = re.sub(r'/\*.*?\*/', '', src, flags=re.S)
    src = re.sub(r'//[^\n]*', '', src)
    return re.sub(r'"[^"\n]*"', '""', src)


def test_source_float_literals():
    num = re.compile(r'(?<![\w.])(\d+\.\d*(?:[eE][-+]?\d+)?|\.\d+(?:[eE][-+]?\d+)?|\d+[eE][-+]?\d+)(?![\w.])')
    bad = []
    for name in ['FilmLab_Color.dctl', 'FilmLab_Texture.dctl']:
        for i, line in enumerate(strip(open(os.path.join(ROOT, name)).read()).split('\n'), 1):
            if 'DEFINE_UI_PARAMS' not in line:
                bad += [f'{name}:{i}: {m.group(1)}' for m in num.finditer(line)]
    assert not bad, 'literals without f:\n  ' + '\n  '.join(bad[:20])


def test_source_generated_block_up_to_date():
    r = subprocess.run([sys.executable, os.path.join(ROOT, 'tools', 'export.py'), '--check'], capture_output=True)
    assert r.returncode == 0, 'FilmLab_Color.dctl data block is stale: run tools/export.py'


def test_source_stock_order():
    src = open(os.path.join(ROOT, 'FilmLab_Color.dctl')).read()
    order = re.search(r'#define STOCK_ORDER "([^"]+)"', src).group(1).split()
    assert plug().by_name['p_Stock']['enums'] == order


# ---------------------------------------------------------------- input

def test_canon_log_decoding():
    """Canon Log 2 / 3 decode to the scene light colour-science gives (both data-level conventions)"""
    for t, enc in [('T_CLOG2', colour.models.log_encoding_CanonLog2), ('T_CLOG3', colour.models.log_encoding_CanonLog3)]:
        lin = 0.18 * 2.0 ** np.linspace(-6, 6, 25)
        for levels in ['LV_FULL', 'LV_VIDEO']:
            code = np.array([float(enc(v)) for v in lin])                     # code / 1023
            if levels == 'LV_VIDEO':
                code = (code * 1023.0 - 64.0) / 876.0                          # as if Resolve scaled legal range
            out = run(px(np.repeat(code[:, None], 3, 1)), p_InGamut='G_2020', p_InGamma=t, p_Levels=levels,
                      p_Stock='NEG_NONE', p_DRT='DRT_OFF')[0]
            dwg = colour.RGB_to_RGB(np.repeat(lin[:, None], 3, 1), 'ITU-R BT.2020', 'DaVinci Wide Gamut')
            want = colour.models.oetf_DaVinciIntermediate(dwg)
            err = np.abs(out - want).max()
            assert err < 2e-4, f'{t} {levels}: max DI code error {err:.2e}'


def test_other_decoders_unchanged():
    encs = {'T_LOGC3': colour.models.log_encoding_ARRILogC3, 'T_LOGC4': colour.models.log_encoding_ARRILogC4,
            'T_SLOG3': colour.models.log_encoding_SLog3, 'T_VLOG': colour.models.log_encoding_VLog,
            'T_LOG3G10': colour.models.log_encoding_Log3G10, 'T_DI': colour.models.oetf_DaVinciIntermediate}
    lin = 0.18 * 2.0 ** np.linspace(-5, 6, 12)
    want = colour.models.oetf_DaVinciIntermediate(colour.RGB_to_RGB(np.repeat(lin[:, None], 3, 1), 'ITU-R BT.2020', 'DaVinci Wide Gamut'))
    for t, enc in encs.items():
        code = np.array([float(enc(v)) for v in lin])
        out = run(px(np.repeat(code[:, None], 3, 1)), p_InGamut='G_2020', p_InGamma=t, p_Stock='NEG_NONE', p_DRT='DRT_OFF')[0]
        assert np.abs(out - want).max() < 2e-4, t


def test_cinema_gamut_matrix():
    M_cs = colour.matrix_RGB_to_RGB(colour.RGB_COLOURSPACES['Cinema Gamut'], colour.RGB_COLOURSPACES['ITU-R BT.2020'])
    rgb = np.random.default_rng(0).random((32, 3)) * 0.5 + 0.05
    out = run(px(rgb), p_InGamut='G_CCG', p_InGamma='T_LIN', p_Stock='NEG_NONE', p_DRT='DRT_OFF')[0]
    want = colour.models.oetf_DaVinciIntermediate(colour.RGB_to_RGB(rgb @ M_cs.T, 'ITU-R BT.2020', 'DaVinci Wide Gamut'))
    assert np.abs(out - want).max() < 2e-4


# ---------------------------------------------------------------- negative vs Kodak

def test_kodak_negative_curves():
    """grey ramp through the DCTL negative (Cineon output) vs the digitised Status M curves"""
    char = json.load(open(os.path.join(ROOT, 'tools', 'char_neg.json')))
    s, img = stops_ramp(-6.5, 7.0, 136)
    for key, st in [('V3_5203', '50D'), ('V3_5207', '250D'), ('V3_5219', '500T')]:
        dD = cineon_density(run(img, p_Stock=key, p_DRT='DRT_CINEON', p_Interimage=0.0, **LIN2020)[0])
        Dgrey = M.Negative(key).grey_reference()            # fitted density of the normal grey
        for i, L in enumerate('RGB'):
            a = np.array(sorted(char[st][L])); xs, D = a[:, 0], a[:, 1]
            m = (s >= xs.min()) & (s <= xs.max())
            err = dD[m, i] + Dgrey[i] - np.interp(s[m], xs, D)
            rms, mx = np.sqrt(np.mean(err ** 2)), np.abs(err).max()
            assert rms < 0.012 and mx < 0.035, f'{st} {L}: rms {rms:.4f}, max {mx:.4f} D'


def test_kodak_2383_curves():
    """the smooth 2383 fit vs the digitised Status A curves, and no step at the mid point"""
    char = json.load(open(os.path.join(ROOT, 'tools', 'char_2383_rows.json')))
    for L in 'RGB':
        a = np.array(char[L]); x, D = a[:, 0], a[:, 1]
        p = M.REF.print_fit[L]
        err = M.S['print_curve'](x, p) - D
        assert np.sqrt(np.mean(err ** 2)) < 0.01 and np.abs(err).max() < 0.04, L
        xs = np.linspace(x.min(), x.max(), 20001)
        assert np.abs(np.diff(M.S['print_curve'](xs, p))).max() < 1e-3, f'{L}: step in the curve'


def test_dctl_matches_reference_model():
    """the whole colour chain, DCTL vs numpy model, on ColorChecker-like colours"""
    cc = json.load(open(os.path.join(ROOT, 'tools', 'colorchecker_250d_scan.json')))['reference']
    rgb = colour.RGB_to_RGB(colour.cctf_decoding(np.array(list(cc.values()))), 'sRGB', 'ITU-R BT.2020')
    rgb = np.concatenate([rgb, rgb * 4, rgb / 8])
    cases = [dict(stock=k) for k in ['V3_5203', 'V3_5213', 'V3_5207', 'V3_5219', 'NEG_NONE']]
    cases += [dict(push=-1.0), dict(push=2.0), dict(interimage=0.0), dict(interimage=2.0), dict(saturation=0.4),
              dict(saturation=1.6), dict(layer=(1.1, 0.95, 1.05)), dict(crosstalk=0.0), dict(lights=(3, -2, 1))]
    names = dict(stock='p_Stock', push='p_Push', interimage='p_Interimage', saturation='p_FilmSat', crosstalk='p_Crosstalk')
    for c in cases:
        kw = {}
        for k, v in c.items():
            if k == 'layer':
                kw.update(p_LayerC=v[0], p_LayerM=v[1], p_LayerY=v[2])
            elif k == 'lights':
                kw.update(p_PrintR=v[0], p_PrintG=v[1], p_PrintB=v[2])
            else:
                kw[names[k]] = v
        out = run(px(rgb), **LIN2020, **kw)[0]
        want = M.to_rec709(M.render(rgb, **c))
        d = np.abs(out - want)
        assert d.max() < 3e-3, f'{c}: max diff {d.max():.4f} at {rgb[d.max(1).argmax()]}'


# ---------------------------------------------------------------- exposure, push

def test_exposure_is_photographic():
    """Exposure = scaling scene light before the negative, for every stock"""
    s, img = stops_ramp(-6, 6, 61)
    for k in ['V3_5203', 'V3_5213', 'V3_5207', 'V3_5219']:
        a = run(img, p_Stock=k, p_Exposure=1.0, **LIN2020)[0]
        b = run(img * 2.0, p_Stock=k, **LIN2020)[0]
        assert np.abs(a - b).max() < 1e-4, k


def test_underexposure_reaches_the_toe():
    """negative contrast falls in the toe and the shoulder, for every stock"""
    s, img = stops_ramp(-7, 7, 141)
    for k in ['V3_5203', 'V3_5213', 'V3_5207', 'V3_5219']:
        D = cineon_density(run(img, p_Stock=k, p_DRT='DRT_CINEON', **LIN2020)[0])[:, 1]
        slope = np.gradient(D, s * 0.30103)
        mid = slope[np.abs(s) < 1].mean()
        assert slope[s < -5.5].mean() < 0.6 * mid, f'{k}: no toe'
        assert np.all(np.diff(D) > 0), f'{k}: density not monotonic'


def test_push_pull_is_development():
    """push raises contrast and fog, gains toe speed, and is not an exposure shift"""
    s, img = stops_ramp(-6, 6, 121)
    dens = lambda p, ev=0.0: cineon_density(run(img * 2 ** ev, p_Stock='V3_5207', p_DRT='DRT_CINEON', p_Push=p, **LIN2020)[0])[:, 1]
    d0, d1 = dens(0.0), dens(1.0)
    g0 = np.gradient(d0, s * 0.30103)[np.abs(s) < 1].mean(); g1 = np.gradient(d1, s * 0.30103)[np.abs(s) < 1].mean()
    assert 1.08 < g1 / g0 < 1.16, f'gamma ratio {g1 / g0:.3f}'
    # an exposure shift can match the pushed density at one point, not along the curve
    best = min(np.abs(dens(0.0, ev) - d1).max() for ev in np.linspace(-0.5, 1.5, 41))
    assert best > 0.05, 'push behaves like exposure'
    # 1 stop under + push 1 prints close to normal grey (what pushing is for)
    g = lambda **kw: run(px([[0.18, 0.18, 0.18]]), **LIN2020, **kw)[0, 0, 1]
    assert abs(g(p_Exposure=-1.0, p_Push=1.0) - g()) < abs(g(p_Exposure=-1.0) - g()) / 3


# ---------------------------------------------------------------- saturation, density

def test_film_saturation():
    """Film Saturation: 1 = off, greys untouched, chroma scales, weaker deep in the toe"""
    cc = json.load(open(os.path.join(ROOT, 'tools', 'colorchecker_250d_scan.json')))['reference']
    rgb = colour.RGB_to_RGB(colour.cctf_decoding(np.array(list(cc.values()))), 'sRGB', 'ITU-R BT.2020')
    def chroma(o):
        lab = colour.XYZ_to_Lab(colour.sRGB_to_XYZ(np.clip(o, 0, 1) ** 2.4 ** 1))
        return np.hypot(lab[:, 1], lab[:, 2])
    base = run(px(rgb), **LIN2020)[0]
    assert np.abs(run(px(rgb), p_FilmSat=1.0, **LIN2020)[0] - base).max() == 0
    hi, lo = chroma(run(px(rgb), p_FilmSat=1.5, **LIN2020)[0]), chroma(run(px(rgb), p_FilmSat=0.5, **LIN2020)[0])
    c0 = chroma(base); col = c0 > 15
    assert np.all(hi[col] > c0[col]) and np.all(lo[col] < c0[col])
    s, grey = stops_ramp(-6, 6, 25)
    g = run(grey, p_FilmSat=0.3, **LIN2020)[0]
    assert np.abs(g - run(grey, **LIN2020)[0]).max() < 2e-3, 'film saturation tints greys'
    # exposure dependence: same colour 6 stops under changes less
    red = np.array([[0.3, 0.08, 0.06]])
    eff = lambda k: np.abs(run(px(red * k), p_FilmSat=1.6, **LIN2020)[0] - run(px(red * k), **LIN2020)[0]).max()
    assert eff(1 / 64) < 0.5 * eff(1.0)


def test_layer_density_keeps_grey():
    """the lab re-times grey: layer density changes the crossover, not the grey balance"""
    g = run(px([[0.18, 0.18, 0.18]]), p_LayerC=1.15, p_LayerY=0.85, **LIN2020)[0, 0]
    assert np.ptp(g) < 0.004, g
    s, img = stops_ramp(2, 4, 3)
    a, b = run(img, **LIN2020)[0], run(img, p_LayerC=1.15, **LIN2020)[0]
    assert np.abs(a - b).max() > 0.01, 'layer density does nothing'


def test_tone_monotonic_all_stocks_and_prints():
    s, img = stops_ramp(-8, 8, 161)
    for k in range(6):
        for pr in range(4):
            for push in [-1.0, 0.0, 2.0]:
                Y = run(img, p_Stock=k, p_Print=pr, p_Push=push, **LIN2020)[0] @ [0.2126, 0.7152, 0.0722]
                assert np.all(np.diff(Y) >= -1e-5), (k, pr, push)
                assert Y[0] < 0.08 and Y[-1] > 0.8, (k, pr, push, Y[0], Y[-1])


# ---------------------------------------------------------------- texture in the negative

def light_strip():
    img = np.full((40, 512, 3), 0.18, np.float32)
    img[18:22, 254:258] = 0.18 * 2 ** 6
    return img


def test_halation():
    flat = np.full((24, 96, 3), 0.18, np.float32)
    assert np.abs(run(flat, p_Halation=1.0, **LIN2020) - run(flat, **LIN2020)).max() < 1e-5, 'halation changes a flat field'
    img = light_strip()
    base = run(img, **LIN2020)
    d = run(img, p_Halation=1.0, **LIN2020) - base
    near = d[20, 259:266]
    assert near[:, 0].max() > 0.01 and near[:, 0].max() > 3 * np.abs(near[:, 2]).max(), f'no red halation: {near}'
    assert np.abs(d[:, :150]).max() < 1e-4, 'halation far from the light'
    nr = run(img, p_Halation=1.0, p_Stock='V3_5219NR', **LIN2020) - run(img, p_Stock='V3_5219NR', **LIN2020)
    assert nr[20, 259:266, 0].mean() > 3 * d[20, 259:266, 0].mean(), 'no rem-jet not stronger'


def test_grain():
    a = np.full((64, 64, 3), 0.18, np.float32)
    base = run(a, **LIN2020)
    g = lambda **kw: plug().run(a, **dict(LIN2020, p_Halation=0.0, **kw)) - plug().run(a, **dict(LIN2020, p_Halation=0.0, p_Grain=0.0, **{k: v for k, v in kw.items() if k != 'p_Grain'}))
    g250 = g(p_Grain=1.0)
    assert np.abs(g250).mean() > 0.002, 'no visible grain'
    assert abs(g250.mean()) < 0.2 * np.abs(g250).mean(), 'grain shifts the brightness'
    assert np.abs(g(p_Grain=1.0, p_Stock='V3_5219')).std() > 1.2 * np.abs(g(p_Grain=1.0, p_Stock='V3_5203')).std()
    assert g(p_Grain=1.0, p_Push=2.0).std() > g250.std()
    assert g(p_Grain=1.0, p_Format='FMT_S16').std() > g250.std() * 0.9


def test_extremes_finite():
    p = plug()
    img = np.random.default_rng(2).random((16, 16, 3)).astype(np.float32)
    img[0, :3] = [[-0.2, -0.2, -0.2], [0, 0, 0], [1.6, 1.6, 1.6]]
    for q in p.params:
        vals = range(len(q['enums'])) if 'enums' in q else ([0, 1] if 'min' not in q else [q['min'], q['max']])
        for v in vals:
            assert np.all(np.isfinite(p.run(img, **{q['name']: v}))), f"{q['name']}={v}"


def test_texture_node_builds():
    t = plug('FilmLab_Texture.dctl')
    img = np.random.default_rng(3).random((32, 48, 3)).astype(np.float32)
    assert np.all(np.isfinite(t.run(img)))


# ---------------------------------------------------------------- runner

def main(argv):
    tests = [(n, f) for n, f in globals().items() if n.startswith('test_') and callable(f)]
    if len(argv) > 1:
        tests = [(n, f) for n, f in tests if any(a in n for a in argv[1:])]
    failed = 0
    for name, fn in tests:
        try:
            fn(); print(f'ok    {name}')
        except Exception:
            failed += 1; print(f'FAIL  {name}'); traceback.print_exc()
    print(f'\n{len(tests) - failed} passed, {failed} failed')
    return 1 if failed else 0


if __name__ == '__main__':
    sys.exit(main(sys.argv))
