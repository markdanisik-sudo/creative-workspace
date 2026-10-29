"""Tests for the Emulsion DCTL, run on the CPU (no Resolve needed).

    python3 test_emulsion.py            # all tests
    python3 test_emulsion.py curve      # only tests whose name contains "curve"

Needs g++ and numpy.  The plugin is built as C++ by dctl.py with the DCTL
functions from shim.h.
"""
import json, os, re, sys, traceback
import numpy as np
import dctl

HERE = os.path.dirname(os.path.abspath(__file__))
PLUGIN = os.path.join(HERE, '..', 'plugin')
PLAIN = dict(p_Grain=0, p_Halation=0, p_Weave='GW_OFF')   # colour only
_cache = {}


def plug():
    if 'p' not in _cache:
        _cache['p'] = dctl.build(os.path.join(PLUGIN, 'Emulsion.dctl'))
    return _cache['p']


def di(x):
    """scene linear -> DaVinci Intermediate code value"""
    x = np.asarray(x, float)
    return np.where(x <= 0.00262409, x * 10.44426855, (np.log2(np.maximum(x, 1e-9) + 0.0075) + 7.0) * 0.07329248)


def ramp(lo=0.0, hi=1.0, n=201):
    x = np.linspace(lo, hi, n).astype(np.float32)
    return x, np.repeat(x[None, :, None], 3, 2)


def chart(n=1024, seed=1):
    rng = np.random.default_rng(seed)
    side = int(np.sqrt(n))
    return (rng.random((side, side, 3)) * 1.05).astype(np.float32)


def luma(c):
    return c @ np.array([0.2126, 0.7152, 0.0722])


def finite(a, what):
    assert np.all(np.isfinite(a)), f'{what}: NaN or Inf in the output'


# ---------------------------------------------------------------- source checks

def plugin_sources():
    out = []
    for root, _, files in os.walk(PLUGIN):
        out += [os.path.join(root, f) for f in files if f.endswith(('.dctl', '.h'))]
    return sorted(out)


def strip(src):
    src = re.sub(r'/\*.*?\*/', '', src, flags=re.S)
    src = re.sub(r'//[^\n]*', '', src)
    return re.sub(r'"[^"\n]*"', '""', src)


def test_source_float_literals():
    """GPU backends (Metal especially) need f on every floating literal"""
    bad = []
    num = re.compile(r'(?<![\w.])(\d+\.\d*(?:[eE][-+]?\d+)?|\.\d+(?:[eE][-+]?\d+)?|\d+[eE][-+]?\d+)(?![\w.])')
    for path in plugin_sources():
        for i, line in enumerate(strip(open(path).read()).split('\n'), 1):
            if 'DEFINE_UI_PARAMS' in line:
                continue
            for m in num.finditer(line):
                bad.append(f'{os.path.relpath(path, PLUGIN)}:{i}: {m.group(1)}')
    assert not bad, 'literals without f:\n  ' + '\n  '.join(bad[:20])


def test_source_no_host_only_code():
    """things that build as C++ but not as a DCTL kernel"""
    banned = [r'\bdouble\b', r'\bstatic\b', r'\bstd::', r'#include\s*<', r'\bprintf\b', r'\bnew\b', r'\bdelete\b',
              r'\bpowf\b', r'\bsqrtf\b', r'\bexpf\b', r'\blogf\b', r'\bfabsf?\b']
    bad = []
    for path in plugin_sources():
        src = strip(open(path).read())
        for b in banned:
            for m in re.finditer(b, src):
                bad.append(f'{os.path.relpath(path, PLUGIN)}:{src[:m.start()].count(chr(10)) + 1}: {m.group(0)}')
    assert not bad, 'not allowed in DCTL:\n  ' + '\n  '.join(bad)


def test_ui_layout():
    """SumerFade-style layout: neutral defaults, film character from the stock menus"""
    p = plug()
    assert len(p.params) <= 26, [q['label'] for q in p.params]
    for q in p.params:
        if q['name'] in ('p_Contrast', 'p_DensityR', 'p_DensityG', 'p_DensityB', 'p_Saturation'):
            assert q['default'] == 1.0, q['name']
        if q['name'] in ('p_Split', 'p_ShadowRoll', 'p_HighlightRoll', 'p_Grain', 'p_Halation'):
            assert q['default'] == 0.0, q['name']
    assert abs(p.by_name['p_Pivot']['default'] - 0.336) < 1e-9


# ---------------------------------------------------------------- tone curve

NEUTRAL = dict(p_Neg='NEG_NONE', p_Print='PR_NONE')   # no film colour: just the curve


def run_grey(p, stops=0.0, **kw):
    return p.run(di(np.full((1, 1, 3), 0.18 * 2.0 ** stops)).astype(np.float32), **dict(PLAIN, **kw))[0, 0]


def test_curve_matches_cinesumer():
    """no film colour, no fade: the luminance curve over DI code is the digitised Cinesumer curve"""
    pts = np.array(json.load(open(os.path.join(HERE, 'cinesumer_curve.json')))['points'])
    x, img = ramp(0.0, 0.85, 171)
    y = luma(plug().run(img, p_Fade=0.0, **NEUTRAL, **PLAIN)[0])
    d = np.abs(np.interp(pts[:, 0], x, y) - pts[:, 1])
    assert d.max() < 0.02, f'max deviation {d.max():.3f} at DI {pts[d.argmax(), 0]}'


def test_curve_grey_and_range():
    """18% grey -> 0.28 (Cinesumer: pivot 0.336 = DI grey), black and white reachable"""
    p = plug()
    for neg in range(6):
        for pr in range(3):
            g = run_grey(p, p_Neg=neg, p_Print=pr, p_Fade=0.0)
            assert np.all(np.abs(g - 0.28) < 0.01), (neg, pr, g)
    x, img = ramp()
    y = luma(p.run(img, p_Fade=0.0, **NEUTRAL, **PLAIN)[0])
    assert y[0] < 0.002 and y[-1] > 0.99, (y[0], y[-1])
    assert abs(run_grey(p, p_Exposure=0.7, p_Fade=0.0, **NEUTRAL)[1] - 0.41) < 0.03


def test_curve_monotonic():
    """brighter scene -> brighter picture: every stock, print, contrast, roll-off and output"""
    p = plug()
    x, img = ramp(0.0, 1.0, 301)
    cases = [dict(p_Neg=n, p_Print=pr) for n in range(6) for pr in range(3)]
    cases += [dict(p_Contrast=c) for c in [0.5, 1.5]] + [dict(p_Output=o) for o in [1, 2]]
    cases += [dict(p_ShadowRoll=a, p_HighlightRoll=b) for a in [-1.0, 1.0] for b in [-1.0, 1.0]]
    cases += [dict(p_Split=sp) for sp in [-1.0, 1.0]] + [dict(p_DensityR=1.5, p_DensityB=0.5), dict(p_DensityR=0.5, p_DensityB=1.5)]
    for kw in cases:
        o = p.run(img, **kw, **PLAIN)[0]
        d = np.diff(o, axis=0)
        # in the deepest blacks (output < 0.08) the gamut compression can
        # wiggle the blue channel by < 0.005: invisible, under the fade
        deep = np.repeat((o[1:].max(1) < 0.08)[:, None], 3, 1)
        assert np.all(d[~deep] >= -1e-4) and np.all(d[deep] >= -0.005), f'{kw}: a channel goes down'


def test_contrast_pivots_on_grey():
    p = plug()
    a = run_grey(p, **NEUTRAL)
    for con in [0.5, 1.5]:
        assert np.abs(run_grey(p, p_Contrast=con, **NEUTRAL) - a).max() < 1e-4, con
    # a pivot above grey: more contrast darkens grey
    assert run_grey(p, p_Contrast=1.4, p_Pivot=0.5, **NEUTRAL)[1] < a[1] - 0.02


# ---------------------------------------------------------------- colour

def test_neutral_without_film():
    p = plug()
    x, img = ramp(0.0, 1.0, 96)
    o = p.run(img, **NEUTRAL, **PLAIN)[0]
    assert np.ptp(o, axis=1).max() < 0.02, 'None / None is not neutral (only the cool fade may tint)'
    o = p.run(img, p_Fade=0.0, **NEUTRAL, **PLAIN)[0]
    assert np.ptp(o, axis=1).max() < 1e-4, 'None / None tints greys'


def test_print_split_tone():
    """negative x 2383 crossover: blue shadows, warm highlights (as in the Cinesumer frames)"""
    p = plug()
    for neg in ['NEG_50D', 'NEG_250D', 'NEG_500T']:
        for pr in ['PR_2383', 'PR_2393']:
            s = run_grey(p, -3.0, p_Neg=neg, p_Print=pr, p_Fade=0.0)
            h = run_grey(p, 2.5, p_Neg=neg, p_Print=pr, p_Fade=0.0)
            assert s[2] > s[0] + 0.005, f'{neg} {pr}: shadows not cool: {s}'
            assert h[0] > h[2] + 0.02, f'{neg} {pr}: highlights not warm: {h}'


def test_split_mix():
    p = plug()
    for stops, ch in [(-3.0, 2), (2.5, 0)]:
        a = run_grey(p, stops, p_Fade=0.0)
        b = run_grey(p, stops, p_Fade=0.0, p_Split=1.0)
        warm_cool = (b[0] - b[2]) - (a[0] - a[2])
        assert (warm_cool < -0.003) if ch == 2 else (warm_cool > 0.01), f'{stops} stops: {a} -> {b}'
    assert np.abs(run_grey(p, p_Split=1.0, p_Fade=0.0) - run_grey(p, p_Fade=0.0)).max() < 1e-4, 'grey moved'


def test_layer_density():
    """Red Density: steeper red layer -> less red in shadows, more in highlights, grey unchanged"""
    p = plug()
    for stops, sign in [(-3.0, -1), (2.5, 1)]:
        a, b = run_grey(p, stops, **NEUTRAL), run_grey(p, stops, p_DensityR=1.3, **NEUTRAL)
        # green moves a little: a redder Rec.2020 red has a negative green in Rec.709
        assert sign * (b[0] - a[0]) > 0.005 and abs(b[1] - a[1]) < 0.02, (stops, a, b)
    assert np.abs(run_grey(p, p_DensityR=1.3, p_DensityB=0.7, **NEUTRAL) - run_grey(p, **NEUTRAL)).max() < 1e-4


def test_roll_offs():
    """+ = softer: lifted shadows, lower highlights; grey and the end points stay"""
    p = plug()
    kw = dict(p_Fade=0.0, **NEUTRAL)
    assert run_grey(p, -3.0, p_ShadowRoll=1.0, **kw)[1] > run_grey(p, -3.0, **kw)[1] + 0.005
    assert run_grey(p, -3.0, p_ShadowRoll=-1.0, **kw)[1] < run_grey(p, -3.0, **kw)[1] - 0.005
    assert run_grey(p, 2.5, p_HighlightRoll=1.0, **kw)[1] < run_grey(p, 2.5, **kw)[1] - 0.01
    assert run_grey(p, 2.5, p_HighlightRoll=-1.0, **kw)[1] > run_grey(p, 2.5, **kw)[1] + 0.01
    for k in ['p_ShadowRoll', 'p_HighlightRoll']:
        assert np.abs(run_grey(p, **{k: 1.0}, **kw) - run_grey(p, **kw)).max() < 1e-4, k


def test_fade_lifts_cool_blacks():
    p = plug()
    black = np.zeros((1, 1, 3), np.float32)
    o = p.run(black, **NEUTRAL, **PLAIN)[0, 0]
    assert np.allclose(o, [0.024, 0.035, 0.043], atol=0.003), o
    assert p.run(black, p_Fade=0.0, **PLAIN)[0, 0].max() < 0.002
    deep = p.run(black, p_Print='PR_2393', **PLAIN)[0, 0]
    assert np.all(deep < o - 0.005), f'2393 blacks not deeper: {deep}'


def test_stocks_differ():
    """each negative has its own colour (spectral sensitivity, layer gamma)"""
    p = plug()
    img = chart(256)
    outs = [p.run(img, p_Neg=n, **PLAIN) for n in ['NEG_50D', 'NEG_250D', 'NEG_500T', 'NEG_NONE']]
    for i in range(4):
        for j in range(i + 1, 4):
            assert np.abs(outs[i] - outs[j]).mean() > 0.002, (i, j)
    # CineStill = the same emulsion, colour unchanged without halation
    assert np.abs(p.run(img, p_Neg='NEG_CS50', **PLAIN) - outs[0]).max() < 1e-6


def test_temperature_direction():
    p = plug()
    warm, cool = run_grey(p, p_Temp=1.0, **NEUTRAL), run_grey(p, p_Temp=-1.0, **NEUTRAL)
    assert warm[0] > warm[2] and cool[2] > cool[0], (warm, cool)


def test_outputs_same_display_light():
    """sRGB / P3 encode the same light as Rec.709 for greys"""
    p = plug()
    x, img = ramp(0.1, 0.9, 41)
    a = p.run(img, **NEUTRAL, **PLAIN)[0] ** 2.4
    assert np.abs(p.run(img, p_Output='OUT_SRGB', **NEUTRAL, **PLAIN)[0] ** 2.2 - a).max() < 1e-4
    assert np.abs(p.run(img, p_Output='OUT_P3', **NEUTRAL, **PLAIN)[0] ** 2.6 - a).max() < 1e-4


def test_inputs_decode_grey():
    """every camera's 18% grey code lands on the same output"""
    p = plug()
    grey = {'T_DI': 0.336043, 'T_LOGC3': 0.391007, 'T_LOGC4': 0.278396, 'T_SLOG3': 0.410557, 'T_VLOG': 0.423319,
            'T_LOG3G10': 0.333136, 'T_LIN': 0.18, 'T_CINEON': 446.0 / 1023.0}
    ref = None
    for t, code in grey.items():
        o = p.run(np.full((1, 1, 3), code, np.float32), p_InGamut='G_2020', p_InGamma=t, **PLAIN)[0, 0]
        ref = o if ref is None else ref
        assert np.abs(o - ref).max() < 0.004, f'{t}: {o} vs {ref}'


# ---------------------------------------------------------------- texture

def light_picture():
    """a small, very bright light in the middle of a 4K-wide strip"""
    img = np.full((40, 4096 // 8, 3), di(0.18), np.float32)
    img[18:22, 254:258] = di(0.18 * 2 ** 6)
    return img


def test_halation_only_around_lights():
    p = plug()
    flat = np.full((24, 96, 3), di(0.18), np.float32)
    assert np.abs(p.run(flat, p_Halation=1) - p.run(flat, **PLAIN)).max() < 1e-6, 'halation on a flat picture'
    img = light_picture()
    base = p.run(img, **PLAIN)
    assert np.abs(p.run(img, p_HalStrength=10.0, **PLAIN) - base).max() == 0, 'halation while disabled'
    d = p.run(img, p_Halation=1) - base
    near = d[20, 259:264]                                      # just right of the light
    assert near[:, 0].max() > 0.02 and near[:, 0].max() > 3 * near[:, 2].max(), f'no red glow: {near}'
    assert np.abs(d[:, :150]).max() < 1e-6, 'halation far from the light'
    soft = p.run(img, p_Halation=1, p_HalStrength=0.5) - base
    cs = p.run(img, p_Halation=1, p_HalStrength=0.5, p_Neg='NEG_CS50') - p.run(img, p_Neg='NEG_CS50', **PLAIN)
    assert cs[20, 260:270, 0].mean() > 2 * soft[20, 260:270, 0].mean(), 'CineStill (no rem-jet) not stronger / wider'


def test_grain():
    """off by default, visible when on, unbiased, new each frame, size by format"""
    p = plug()
    a = np.full((64, 64, 3), di(0.18), np.float32)
    b = a + 0.002
    assert np.abs(p.run(a) - p.run(a, **PLAIN)).max() == 0, 'grain while disabled'
    ga = p.run(a, p_Grain=1) - p.run(a, **PLAIN)
    gb = p.run(b, p_Grain=1) - p.run(b, **PLAIN)
    assert np.abs(ga).mean() > 0.002, 'no visible grain'
    assert abs(ga.mean()) < 0.15 * np.abs(ga).mean(), 'grain shifts the brightness'
    assert np.corrcoef(ga.ravel(), gb.ravel())[0, 1] < 0.2, 'grain does not change between frames'
    s8 = p.run(a, p_Grain=1, p_GrainSize='GS_8') - p.run(a, **PLAIN)
    g65 = p.run(a, p_Grain=1, p_GrainSize='GS_65') - p.run(a, **PLAIN)
    assert np.abs(s8).mean() > 2 * np.abs(g65).mean(), 'Super 8 not grainier than 65 mm'
    mono = p.run(a, p_Grain=1, p_GrainColor=0.0) - p.run(a, **PLAIN)
    assert np.corrcoef(mono[..., 0].ravel(), mono[..., 2].ravel())[0, 1] > 0.99, 'Grain Color 0 is not monochrome'


def test_gate_weave():
    p = plug()
    y, x = np.mgrid[0:48, 0:96].astype(np.float32)
    img = np.stack([0.2 + 0.4 * x / 96, 0.3 + 0.0 * x, 0.2 + 0.4 * y / 48], 2).astype(np.float32)
    base = p.run(img, **PLAIN)
    moved = p.run(img, **dict(PLAIN, p_Weave='GW_STRONG'))
    assert np.abs(moved - base).max() > 0.002, 'no weave'
    assert np.abs(p.run(img, **dict(PLAIN, p_Weave='GW_SUBTLE')) - base).max() < np.abs(moved - base).max()


def test_extremes_finite():
    p = plug()
    img = chart(256)
    img[0, :4] = [[-0.2, -0.2, -0.2], [0, 0, 0], [1.6, 1.6, 1.6], [1.2, -0.1, 0.4]]
    on = dict(p_Grain=1, p_Halation=1, p_Weave='GW_STRONG')
    for q in p.params:
        vals = range(len(q['enums'])) if 'enums' in q else ([0, 1] if 'min' not in q else [q['min'], q['max']])
        for v in vals:
            finite(p.run(img, **dict(on, **{q['name']: v})), f"{q['name']}={v}")


# ---------------------------------------------------------------- runner

def main(argv):
    tests = [(n, f) for n, f in globals().items() if n.startswith('test_') and callable(f)]
    if len(argv) > 1:
        tests = [(n, f) for n, f in tests if any(a in n for a in argv[1:])]
    failed = 0
    for name, fn in tests:
        try:
            fn()
            print(f'ok    {name}')
        except Exception:
            failed += 1
            print(f'FAIL  {name}')
            traceback.print_exc()
    print(f'\n{len(tests) - failed} passed, {failed} failed')
    return 1 if failed else 0


if __name__ == '__main__':
    sys.exit(main(sys.argv))
