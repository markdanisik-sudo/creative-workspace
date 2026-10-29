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
LOOKS = ['L_PRINT', 'L_DAY', 'L_NIGHT', 'L_BLEACH', 'L_NEUTRAL']
PLAIN = dict(p_Grain=0.0, p_Halation=0.0)          # colour only
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


def test_simple_ui():
    """the point of Emulsion: a handful of controls"""
    assert len(plug().params) <= 12, [q['label'] for q in plug().params]


# ---------------------------------------------------------------- tone curve

def test_curve_matches_cinesumer():
    """Neutral look, no fade: the luminance curve over DI code is the digitised Cinesumer curve"""
    pts = np.array(json.load(open(os.path.join(HERE, 'cinesumer_curve.json')))['points'])
    x, img = ramp(0.0, 0.85, 171)
    y = luma(plug().run(img, p_Look='L_NEUTRAL', p_Fade=0.0, **PLAIN)[0])
    d = np.abs(np.interp(pts[:, 0], x, y) - pts[:, 1])
    assert d.max() < 0.02, f'max deviation {d.max():.3f} at DI {pts[d.argmax(), 0]}'


def test_curve_grey_and_range():
    """18% grey -> 0.28 (the Cinesumer placement), black and white reachable"""
    p = plug()
    grey = di(np.full((1, 1, 3), 0.18)).astype(np.float32)
    g = p.run(grey, p_Look='L_NEUTRAL', p_Fade=0.0, **PLAIN)[0, 0]
    assert np.all(np.abs(g - 0.28) < 0.01), g
    x, img = ramp()
    y = luma(p.run(img, p_Look='L_NEUTRAL', p_Fade=0.0, **PLAIN)[0])
    assert y[0] < 0.002 and y[-1] > 0.99, (y[0], y[-1])
    # +0.7 stop puts grey near the usual 0.41
    g = p.run(grey, p_Look='L_NEUTRAL', p_Fade=0.0, p_Exposure=0.7, **PLAIN)[0, 0]
    assert abs(g[1] - 0.41) < 0.03, g


def test_curve_monotonic():
    """brighter scene -> brighter picture, every look, contrast and output"""
    p = plug()
    x, img = ramp(0.0, 1.0, 301)
    for look in LOOKS:
        for con in [0.6, 1.0, 1.5]:
            for out in range(3):
                o = p.run(img, p_Look=look, p_Contrast=con, p_Output=out, **PLAIN)[0]
                d = np.diff(o, axis=0)
                # in the deepest blacks (output < 0.08) the gamut compression can
                # wiggle the blue channel by < 0.005: invisible, under the fade
                deep = np.repeat((o[1:].max(1) < 0.08)[:, None], 3, 1)
                assert np.all(d[~deep] >= -1e-6) and np.all(d[deep] >= -0.005), f'{look} contrast {con} output {out}: a channel goes down'


def test_contrast_pivots_on_grey():
    p = plug()
    g = di(np.full((1, 1, 3), 0.18)).astype(np.float32)
    a = p.run(g, p_Look='L_NEUTRAL', **PLAIN)[0, 0]
    for con in [0.6, 1.5]:
        b = p.run(g, p_Look='L_NEUTRAL', p_Contrast=con, **PLAIN)[0, 0]
        assert np.abs(a - b).max() < 1e-4, (con, a, b)


# ---------------------------------------------------------------- colour

def test_neutral_stays_neutral():
    """grey input meets in every channel around 18% grey; Strength 0 is fully neutral"""
    p = plug()
    grey = di(np.full((1, 1, 3), 0.18)).astype(np.float32)
    for look in ['L_PRINT', 'L_BLEACH', 'L_NEUTRAL']:
        o = p.run(grey, p_Look=look, p_Fade=0.0, **PLAIN)[0, 0]
        assert np.ptp(o) < 0.002, f'{look}: grey is tinted: {o}'
    x, img = ramp(0.05, 1.0, 96)
    o = p.run(img, p_Strength=0.0, **PLAIN)[0]
    assert np.ptp(o, axis=1).max() < 1e-4, 'Strength 0 is not neutral'


def test_print_split_tone():
    """Kodak 2383 crossover: cyan-blue shadows, warm highlights (as in the Cinesumer frames)"""
    p = plug()
    shadow = di(np.full((1, 1, 3), 0.18 * 2 ** -3)).astype(np.float32)
    high = di(np.full((1, 1, 3), 0.18 * 2 ** 2.5)).astype(np.float32)
    s = p.run(shadow, p_Look='L_PRINT', p_Fade=0.0, **PLAIN)[0, 0]
    h = p.run(high, p_Look='L_PRINT', p_Fade=0.0, **PLAIN)[0, 0]
    assert s[2] > s[0] + 0.005, f'shadows not cool: {s}'
    assert h[0] > h[2] + 0.01, f'highlights not warm: {h}'


def test_fade_lifts_cool_blacks():
    p = plug()
    black = np.zeros((1, 1, 3), np.float32)
    o = p.run(black, **PLAIN)[0, 0]
    assert np.allclose(o, [0.024, 0.035, 0.043], atol=0.003), o
    assert p.run(black, p_Fade=0.0, **PLAIN)[0, 0].max() < 0.002


def test_strength_zero_ignores_look():
    p = plug()
    img = chart(256)
    ref = p.run(img, p_Look='L_NEUTRAL', p_Strength=0.0, **PLAIN)
    for look in LOOKS:
        assert np.abs(p.run(img, p_Look=look, p_Strength=0.0, **PLAIN) - ref).max() < 1e-6, look


def test_temperature_direction():
    p = plug()
    g = di(np.full((1, 1, 3), 0.18)).astype(np.float32)
    warm = p.run(g, p_Look='L_NEUTRAL', p_Temp=1.0, **PLAIN)[0, 0]
    cool = p.run(g, p_Look='L_NEUTRAL', p_Temp=-1.0, **PLAIN)[0, 0]
    assert warm[0] > warm[2] and cool[2] > cool[0], (warm, cool)


def test_outputs_same_display_light():
    """sRGB / P3 encode the same light as Rec.709 for greys"""
    p = plug()
    x, img = ramp(0.1, 0.9, 41)
    a = p.run(img, p_Look='L_NEUTRAL', **PLAIN)[0] ** 2.4
    assert np.abs(p.run(img, p_Look='L_NEUTRAL', p_Output='OUT_SRGB', **PLAIN)[0] ** 2.2 - a).max() < 1e-4
    assert np.abs(p.run(img, p_Look='L_NEUTRAL', p_Output='OUT_P3', **PLAIN)[0] ** 2.6 - a).max() < 1e-4


def test_inputs_decode_grey():
    """every camera's 18% grey code lands on the same output"""
    p = plug()
    grey = {'T_DI': 0.336043, 'T_LOGC3': 0.391007, 'T_LOGC4': 0.278396, 'T_SLOG3': 0.410557, 'T_VLOG': 0.423319,
            'T_LOG3G10': 0.333136, 'T_LIN': 0.18, 'T_CINEON': 446.0 / 1023.0}
    ref = None
    for t, code in grey.items():
        o = p.run(np.full((1, 1, 3), code, np.float32), p_InGamut='G_2020', p_InGamma=t, p_Look='L_NEUTRAL', **PLAIN)[0, 0]
        ref = o if ref is None else ref
        assert np.abs(o - ref).max() < 0.004, f'{t}: {o} vs {ref}'


# ---------------------------------------------------------------- texture

def test_halation_only_around_lights():
    p = plug()
    img = np.full((48, 96, 3), di(0.18), np.float32)
    flat = p.run(img, p_Grain=0.0) - p.run(img, **PLAIN)
    assert np.abs(flat).max() < 1e-6, 'halation on a flat grey picture'
    img[20:24, 46:50] = di(0.18 * 2 ** 6)
    d = p.run(img, p_Grain=0.0, p_Halation=2.0) - p.run(img, **PLAIN)
    ring = d[14:30, 40:56].copy(); ring[6:10, 6:10] = 0
    assert ring[..., 0].max() > 0.02 and ring[..., 0].max() > 3 * ring[..., 2].max(), 'no red glow around the light'
    assert np.abs(d[:, :20]).max() < 1e-6, 'halation far from the light'


def test_grain():
    """visible, unbiased, new with each frame"""
    p = plug()
    a = np.full((64, 64, 3), di(0.18), np.float32)
    b = a + 0.002
    ga = p.run(a, p_Halation=0.0) - p.run(a, **PLAIN)
    gb = p.run(b, p_Halation=0.0) - p.run(b, **PLAIN)
    assert np.abs(ga).mean() > 0.002, 'no visible grain'
    assert abs(ga.mean()) < 0.15 * np.abs(ga).mean(), 'grain shifts the brightness'
    assert np.corrcoef(ga.ravel(), gb.ravel())[0, 1] < 0.2, 'grain does not change between frames'


def test_extremes_finite():
    p = plug()
    img = chart(256)
    img[0, :4] = [[-0.2, -0.2, -0.2], [0, 0, 0], [1.6, 1.6, 1.6], [1.2, -0.1, 0.4]]
    for q in p.params:
        vals = range(len(q['enums'])) if 'enums' in q else [q['min'], q['max']]
        for v in vals:
            finite(p.run(img, **{q['name']: v}), f"{q['name']}={v}")


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
