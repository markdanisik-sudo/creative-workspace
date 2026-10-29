"""Tests for the Emulsion DCTL plugins, run on the CPU (no Resolve needed).

    python3 test_emulsion.py            # all tests
    python3 test_emulsion.py film       # only tests whose name contains "film"

Needs g++ and numpy.  The plugins are built as C++ by dctl.py with the DCTL
functions from shim.h; the old Film Lab plugins in dctl/ are the reference
for the regression tests.
"""
import math, os, re, sys, traceback
import numpy as np
import dctl

HERE = os.path.dirname(os.path.abspath(__file__))
PLUGIN = os.path.join(HERE, '..', 'plugin')
LEGACY = os.path.join(HERE, '..', '..')
_cache = {}


def plug(name):
    if name not in _cache:
        path = os.path.join(PLUGIN, name) if name.startswith('Emulsion') else os.path.join(LEGACY, name)
        _cache[name] = dctl.build(path)
    return _cache[name]


def di(x):
    """scene linear -> DaVinci Intermediate code value"""
    x = np.asarray(x, float)
    return np.where(x <= 0.00262409, x * 10.44426855, (np.log2(np.maximum(x, 1e-9) + 0.0075) + 7.0) * 0.07329248)


def chart(n=1024, seed=1):
    """grey ramp + random colours, DaVinci Intermediate code values"""
    rng = np.random.default_rng(seed)
    grey = np.repeat(np.linspace(0.0, 1.1, 64)[:, None], 3, 1)
    img = np.concatenate([grey, rng.random((n - 64, 3)) * 1.1])
    side = int(math.sqrt(n))
    return img.reshape(side, side, 3).astype(np.float32)


def grey_ramp(stops=np.linspace(-8, 8, 161)):
    return di(0.18 * 2.0 ** stops)[None, :, None].repeat(3, 2).astype(np.float32)


def close(a, b, what, tol=5e-5):
    """equal up to float rounding, compared in light (code ** 2.4): a channel
    clipped to black can come out as 0 or as 1e-7, which the display gamma
    alone would turn into a 1e-3 code value difference"""
    la, lb = np.sign(a) * np.abs(a) ** 2.4, np.sign(b) * np.abs(b) ** 2.4
    d = np.abs(la - lb)
    i = np.unravel_index(d.argmax(), d.shape)
    assert d.max() < tol, f'{what}: light differs by {d.max():.2e} at {i}: {a[i[:-1]]} vs {b[i[:-1]]}'


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
                line = src[:m.start()].count('\n') + 1
                bad.append(f'{os.path.relpath(path, PLUGIN)}:{line}: {m.group(0)}')
    assert not bad, 'not allowed in DCTL:\n  ' + '\n  '.join(bad)


def test_film_stock_table_order():
    """the Negative Stock combo indexes the generated stock table"""
    src = open(os.path.join(PLUGIN, 'Emulsion_lib', 'film_data.h')).read()
    order = re.search(r'#define STOCK_ORDER "([^"]+)"', src).group(1).split()
    assert plug('Emulsion_Film.dctl').by_name['p_Stock']['enums'] == order


def test_film_data_up_to_date():
    """film_data.h is what tools/build_data.py generates (if scipy is installed)"""
    try:
        import scipy  # noqa: F401
    except ImportError:
        print('    (skipped: no scipy)')
        return
    import subprocess
    path = os.path.join(PLUGIN, 'Emulsion_lib', 'film_data.h')
    keep = open(path).read()
    try:
        subprocess.run([sys.executable, os.path.join(HERE, '..', 'tools', 'build_data.py')], check=True, capture_output=True)
        assert open(path).read() == keep, 'film_data.h is stale: run tools/build_data.py'
    finally:
        open(path, 'w').write(keep)


# ---------------------------------------------------------------- Emulsion Film

def test_film_matches_film_lab():
    """same colour science as Film Lab Color v3, for every stock, print, output and DRT"""
    old, new = plug('FilmLab_Color.dctl'), plug('Emulsion_Film.dctl')
    img = chart()
    for stock in range(24):
        for pr in range(4):
            for out in range(5):
                kw = dict(p_Stock=stock, p_Print=pr, p_Output=out)
                close(old.run(img, **kw), new.run(img, **kw), str(kw))
    for drt in range(4):
        for stock in [0, 3, 23]:
            close(old.run(img, p_DRT=drt, p_Stock=stock), new.run(img, p_DRT=drt, p_Stock=stock), f'DRT {drt} stock {stock}')


def test_film_matches_film_lab_controls():
    """every control, at random settings (Negative / Print Version map to the
    Interimage and Print Crosstalk sliders)"""
    old, new = plug('FilmLab_Color.dctl'), plug('Emulsion_Film.dctl')
    img = chart(256)
    rng = np.random.default_rng(7)
    shared = [p for p in new.params if p['name'] in old.by_name and p['type'] != 'DCTLUI_COMBO_BOX']
    for trial in range(120):
        kw = {}
        for p in shared:
            if p['type'] == 'DCTLUI_CHECK_BOX':
                kw[p['name']] = int(rng.random() < 0.3)
            elif rng.random() < 0.4:
                kw[p['name']] = rng.uniform(p['min'], p['max'])
        kw.pop('p_ShowCurve', None)
        kw['p_Stock'] = int(rng.integers(24)); kw['p_Print'] = int(rng.integers(4)); kw['p_Output'] = int(rng.integers(5))
        kw['p_InGamut'] = int(rng.integers(9)); kw['p_InGamma'] = int(rng.integers(11))
        kw['p_NegStrength'] = 1.0           # Film Lab jumps at 0.5 in the scan; tested separately
        # blends in code values would mix a channel clipped to 0 vs 1e-7 into
        # visible values; the blends have their own tests
        kw['p_Strength'] = float(rng.random() < 0.8); kw['p_PrintStrength'] = float(rng.random() < 0.8)
        neg_old, print_old = int(rng.random() < 0.3), int(rng.random() < 0.3)
        a = old.run(img, p_NegVersion=neg_old, p_PrintVersion=print_old, **kw)
        b = new.run(img, p_Crosstalk=0.0 if print_old else 1.0,
                    **dict(kw, p_Interimage=0.0 if neg_old else kw.get('p_Interimage', 1.0)))
        close(a, b, f'trial {trial}: {kw}')


def test_film_grey_on_lad():
    """18% grey through Vision3 + 2383 lands on Kodak's LAD: ~0.41 in Rec.709"""
    p = plug('Emulsion_Film.dctl')
    img = di(np.full((1, 1, 3), 0.18)).astype(np.float32)
    for stock in ['V3_5203', 'V3_5207', 'V3_5219', 'NEG_NONE']:
        o = p.run(img, p_Stock=stock)[0, 0]
        assert np.all(np.abs(o - 0.405) < 0.01), f'{stock}: grey -> {o}'
        assert np.ptp(o) < 0.01, f'{stock}: grey is not neutral: {o}'


def test_film_tone_monotonic():
    """brighter scene -> brighter picture, for every stock and print"""
    p = plug('Emulsion_Film.dctl')
    img = grey_ramp()
    for stock in range(24):
        for pr in range(4):
            for pp in [-2.0, 0.0, 3.0]:
                o = p.run(img, p_Stock=stock, p_Print=pr, p_PushPull=pp)[0]
                Y = o @ np.array([0.2126, 0.7152, 0.0722])
                assert np.all(np.diff(Y) >= -1e-5), f'stock {stock} print {pr} push {pp}: tone curve goes down'
                assert Y[0] < 0.08 and Y[-1] > 0.8, f'stock {stock} print {pr}: range {Y[0]:.3f}..{Y[-1]:.3f}'


def test_film_extremes_finite():
    """every slider at its minimum and maximum, on extreme input"""
    p = plug('Emulsion_Film.dctl')
    img = np.concatenate([chart(256).reshape(-1, 3), [[-0.2, -0.2, -0.2], [0, 0, 0], [4, 4, 4], [2, -0.1, 0.5]]])[None].astype(np.float32)
    sliders = [q for q in p.params if q['type'] == 'DCTLUI_SLIDER_FLOAT']
    for q in sliders:
        for v in [q['min'], q['max']]:
            for out in [0, 3]:
                finite(p.run(img, p_Output=out, **{q['name']: v}), f"{q['name']}={v}")
    for q in [q for q in p.params if q['type'] == 'DCTLUI_COMBO_BOX']:
        for v in range(len(q['enums'])):
            finite(p.run(img, **{q['name']: v}), f"{q['name']}={q['enums'][v]}")


def test_film_negative_strength_continuous():
    """Negative Strength blends smoothly (Film Lab jumped at 0.5 with DRT Neutral / Off)"""
    p = plug('Emulsion_Film.dctl')
    img = (0.2 + 0.5 * chart(256)[..., :1] + 0.15 * (chart(256, seed=2) - 0.55)).astype(np.float32)   # inside Rec.709
    for drt in ['DRT_NEUTRAL', 'DRT_OFF']:                 # the DRTs that scan the negative
        for stock in ['V3_5203', 'V3_5219']:
            a = p.run(img, p_DRT=drt, p_Stock=stock, p_NegStrength=0.495)
            b = p.run(img, p_DRT=drt, p_Stock=stock, p_NegStrength=0.505)
            assert np.abs(a - b).max() < 0.01, f'DRT {drt} {stock}: jump at Negative Strength 0.5'
    # DRT Neutral at Negative Strength 0 = no negative at all
    close(p.run(img, p_DRT='DRT_NEUTRAL', p_NegStrength=0.0), p.run(img, p_DRT='DRT_NEUTRAL', p_Stock='NEG_NONE'), 'ideal')


def test_film_strength_zero_is_neutral():
    """Strength 0 = the same neutral picture whatever the film settings"""
    p = plug('Emulsion_Film.dctl')
    img = chart(256)
    ref = p.run(img, p_Strength=0.0)
    for kw in [dict(p_Stock='V3_5219'), dict(p_Print='PR_2393'), dict(p_PrintExp=6.0, p_DyeSat=2.0), dict(p_NegBleach=1, p_PushPull=2.0)]:
        close(ref, p.run(img, p_Strength=0.0, **kw), str(kw))
    assert np.abs(ref - p.run(img)).max() > 0.05, 'film does nothing'
    mid = p.run(img, p_Strength=0.5)
    close(mid, 0.5 * (ref + p.run(img)), 'strength 0.5')


def test_film_hdr_grey_nits():
    """PQ: 18% grey sits on HDR Grey nits"""
    p = plug('Emulsion_Film.dctl')
    img = di(np.full((1, 1, 3), 0.18)).astype(np.float32)
    for grey in [10.0, 18.0, 30.0]:
        o = p.run(img, p_Output='OUT_PQ', p_HdrGrey=grey, p_Stock='NEG_NONE', p_DRT='DRT_NEUTRAL')[0, 0]
        m1, m2, c1, c2, c3 = 0.1593017578125, 78.84375, 0.8359375, 18.8515625, 18.6875
        y = np.power(np.maximum(np.power(o, 1 / m2) - c1, 0) / (c2 - c3 * np.power(o, 1 / m2)), 1 / m1) * 10000
        assert np.all(np.abs(y / grey - 1) < 0.03), f'grey {grey}: {y} nits'


def test_film_off_dwg_roundtrip():
    """DRT Off with no film and no grade returns the input (DWG / Intermediate)"""
    p = plug('Emulsion_Film.dctl')
    img = chart(256)
    for kw in [dict(p_Strength=0.0), dict(p_Stock='NEG_NONE'), dict(p_NegStrength=0.0)]:
        o = p.run(img, p_DRT='DRT_OFF', **kw)
        assert np.abs(o - img).max() < 2e-4, f'{kw}: max diff {np.abs(o - img).max():.2e}'


def test_film_show_curve():
    """Show Curve draws only inside its box, bottom left"""
    p = plug('Emulsion_Film.dctl')
    img = np.full((90, 160, 3), di(0.18), np.float32)
    a, b = p.run(img), p.run(img, p_ShowCurve=1)
    changed = np.any(np.abs(a - b) > 1e-6, 2)
    ys, xs = np.nonzero(changed)
    assert changed.any() and xs.max() < 0.36 * 160 and ys.min() > 0.6 * 90, 'curve outside its box'


# ---------------------------------------------------------------- Emulsion Texture

def picture(w=96, h=64, seed=3):
    """display-referred test picture: soft gradients, edges and a few bright lights"""
    rng = np.random.default_rng(seed)
    y, x = np.mgrid[0:h, 0:w].astype(np.float32)
    img = np.stack([0.2 + 0.5 * x / w, 0.3 + 0.3 * y / h, 0.45 - 0.2 * x / w], 2)
    img[(x // 12 + y // 12) % 2 == 0] *= 0.6                                  # edges
    for _ in range(4):
        cx, cy = rng.uniform(0, w), rng.uniform(0, h)
        img[(x - cx) ** 2 + (y - cy) ** 2 < 9] = [1.0, 0.97, 0.9]              # lights
    return img.astype(np.float32)


def test_texture_matches_film_lab():
    """same texture as Film Lab Texture v2"""
    old, new = plug('FilmLab_Texture.dctl'), plug('Emulsion_Texture.dctl')
    img = picture()
    cases = [{}, dict(p_Weave=1.0, p_Breath=1.0, p_Vignette=2.0), dict(p_Animate=0, p_Seed=17),
             dict(p_MtfSoft=3.0, p_RedSoft=2.0, p_Acutance=2.0, p_AcuRadius=3.0),
             dict(p_HalAmount=4.0, p_HalRadius=4.0, p_HalThreshold=0.2, p_BloomAmount=1.0, p_BloomThreshold=0.1),
             dict(p_GrainChroma=0.0, p_GrainSize=3.0), dict(p_Strength=0.4)]
    cases += [dict(p_GrainStock=g) for g in range(8)] + [dict(p_Format=f) for f in range(4)] + [dict(p_Quality=q) for q in range(3)]
    for kw in cases:
        d = np.abs(old.run(img, **kw) - new.run(img, **kw)).max()
        assert d < 1e-5, f'{kw}: max diff {d:.2e}'


def test_texture_off_is_identity():
    p = plug('Emulsion_Texture.dctl')
    img = picture()
    assert np.abs(p.run(img, p_Strength=0.0) - img).max() < 1e-6
    off = dict(p_MtfSoft=0.0, p_RedSoft=0.0, p_Acutance=0.0, p_HalAmount=0.0, p_BloomAmount=0.0, p_GrainAmount=0.0)
    for dg in range(3):
        assert np.abs(p.run(img, p_Display=dg, **off) - img).max() < 1e-5, f'display {dg}'


def test_texture_grain_animation():
    """Animate Grain: new grain when the picture changes; off = the same grain"""
    p = plug('Emulsion_Texture.dctl')
    a = np.full((64, 64, 3), 0.45, np.float32)
    b = a + 0.01
    only = dict(p_MtfSoft=0.0, p_RedSoft=0.0, p_Acutance=0.0, p_HalAmount=0.0, p_BloomAmount=0.0)
    ga, gb = p.run(a, **only) - a, p.run(b, **only) - b
    assert np.abs(ga).mean() > 0.003, 'no visible grain'
    assert np.abs(ga.mean()) < 0.1 * np.abs(ga).mean(), 'grain shifts the brightness'
    assert np.corrcoef(ga.ravel(), gb.ravel())[0, 1] < 0.2, 'grain does not change between frames'
    sa, sb = p.run(a, p_Animate=0, **only) - a, p.run(b, p_Animate=0, **only) - b
    assert np.corrcoef(sa.ravel(), sb.ravel())[0, 1] > 0.95, 'static grain changes'


def test_texture_extremes_finite():
    p = plug('Emulsion_Texture.dctl')
    img = picture(48, 32)
    img[0, 0] = [4.0, 4.0, 4.0]; img[0, 1] = [-0.1, 0.0, 0.0]
    for q in [q for q in p.params if q['type'] in ('DCTLUI_SLIDER_FLOAT', 'DCTLUI_SLIDER_INT')]:
        for v in [q['min'], q['max']]:
            finite(p.run(img, **{q['name']: v}), f"{q['name']}={v}")


# ---------------------------------------------------------------- Emulsion LUT

def test_lut_empty_slots_are_identity():
    p = plug('Emulsion_LUT.dctl')
    img = chart(256)[..., :] / 1.1
    for slot in range(10):
        assert np.abs(p.run(img, p_Slot=slot) - img).max() < 1e-6, f'slot {slot + 1}'


def test_lut_intensity_and_bypass():
    """a LUT in slot 03 (an inverting LUT, in a temporary copy of the plugin)"""
    import shutil, tempfile
    tmp = tempfile.mkdtemp()
    try:
        shutil.copy(os.path.join(PLUGIN, 'Emulsion_LUT.dctl'), tmp)
        shutil.copytree(os.path.join(PLUGIN, 'Emulsion_LUTs'), os.path.join(tmp, 'Emulsion_LUTs'))
        rows = ['LUT_3D_SIZE 2'] + [f'{1 - r} {1 - g} {1 - b}' for b in (0, 1) for g in (0, 1) for r in (0, 1)]
        open(os.path.join(tmp, 'Emulsion_LUTs', 'slot03.cube'), 'w').write('\n'.join(rows) + '\n')
        p = dctl.build(os.path.join(tmp, 'Emulsion_LUT.dctl'))
        img = chart(256) / 1.1
        assert np.abs(p.run(img, p_Slot='SLOT03') - (1 - img)).max() < 1e-5
        assert np.abs(p.run(img, p_Slot='SLOT03', p_Intensity=0.25) - (img + 0.25 * (1 - 2 * img))).max() < 1e-5
        assert np.abs(p.run(img, p_Slot='SLOT03', p_Bypass=1) - img).max() < 1e-7
    finally:
        shutil.rmtree(tmp)


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
