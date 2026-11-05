"""Draw the digitised Kodak data as vector charts (SVG).

    python3 plot_datasheets.py            # writes dctl/docs/graphs/*.svg

One chart per graph we digitised: characteristic curves, spectral
sensitivity and spectral dye density of each negative, and the same for
2383.  The data is ours (digitised from the Kodak data sheets, see the
digitize_*.py scripts and the json files here); the layout is our own.
Each SVG is self-contained, follows the viewer's light / dark setting, labels
every curve directly and shows the curve's name on hover.  Stray digitising
points are removed for display (digi.clean_curve; the model applies the same
cleaning to the 200T and 500T spectral data).
"""
import json, os, sys
import numpy as np
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from digi import clean_curve  # noqa: E402

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.normpath(os.path.join(HERE, '..', 'docs', 'graphs'))
J = lambda f: json.load(open(os.path.join(HERE, f)))

W, H = 720, 470
L, R, T, B = 64, 150, 58, 56          # plot margins (right margin holds the curve labels)

# validated colour roles (dataviz palette; light / dark).  Layers: red / green /
# blue; dyes: cyan -> blue slot, magenta, yellow (labels carry identity too)
STYLE = """
<style>
  svg { --surface:#fcfcfb; --ink:#0b0b0b; --ink2:#52514e; --muted:#898781; --grid:#e1e0d9; --axis:#c3c2b7;
        --red:#e34948; --green:#008300; --blue:#2a78d6; --magenta:#e87ba4; --yellow:#eda100;
        font-family: system-ui, -apple-system, "Segoe UI", sans-serif; }
  @media (prefers-color-scheme: dark) {
    svg { --surface:#1a1a19; --ink:#f0efec; --ink2:#c3c2b7; --muted:#898781; --grid:#2c2c2a; --axis:#383835;
          --red:#e66767; --green:#008300; --blue:#3987e5; --magenta:#d55181; --yellow:#c98500; }
  }
  .bg { fill: var(--surface); }
  .grid { stroke: var(--grid); stroke-width: 1; }
  .axis { stroke: var(--axis); stroke-width: 1; }
  .tick { fill: var(--muted); font-size: 12px; }
  .axlabel { fill: var(--ink2); font-size: 13px; }
  .title { fill: var(--ink); font-size: 17px; font-weight: 600; }
  .sub { fill: var(--ink2); font-size: 12.5px; }
  .src { fill: var(--muted); font-size: 11px; }
  .lab { fill: var(--ink); font-size: 12.5px; }
  .curve { fill: none; stroke-width: 2; stroke-linejoin: round; stroke-linecap: round; }
  .curve:hover { stroke-width: 3.5; }
  .ref { stroke: var(--muted); stroke-width: 1; stroke-dasharray: 3 4; }
</style>"""


def esc(s):
    return s.replace('&', '&amp;').replace('<', '&lt;').replace('>', '&gt;')


def chart(name, title, sub, xlab, ylab, xr, yr, xticks, yticks, series, source, refs=()):
    """series: list of (label, colour role, points [[x, y]...], dash or None)"""
    pw, ph = W - L - R, H - T - B
    sx = lambda x: L + (x - xr[0]) / (xr[1] - xr[0]) * pw
    sy = lambda y: T + ph - (y - yr[0]) / (yr[1] - yr[0]) * ph
    o = [f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W} {H}" width="{W}" height="{H}" role="img" aria-labelledby="t d">',
         f'<title id="t">{esc(title)}</title><desc id="d">{esc(sub)}. {esc(source)}</desc>', STYLE,
         f'<rect class="bg" width="{W}" height="{H}" rx="8"/>',
         f'<text class="title" x="{L}" y="26">{esc(title)}</text>', f'<text class="sub" x="{L}" y="44">{esc(sub)}</text>']
    for v in yticks:
        o.append(f'<line class="grid" x1="{L}" x2="{L + pw}" y1="{sy(v):.1f}" y2="{sy(v):.1f}"/>')
        o.append(f'<text class="tick" x="{L - 8}" y="{sy(v) + 4:.1f}" text-anchor="end">{v:g}</text>')
    for v in xticks:
        o.append(f'<line class="grid" x1="{sx(v):.1f}" x2="{sx(v):.1f}" y1="{T}" y2="{T + ph}"/>')
        o.append(f'<text class="tick" x="{sx(v):.1f}" y="{T + ph + 18}" text-anchor="middle">{v:g}</text>')
    o.append(f'<line class="axis" x1="{L}" x2="{L + pw}" y1="{T + ph}" y2="{T + ph}"/>')
    o.append(f'<line class="axis" x1="{L}" x2="{L}" y1="{T}" y2="{T + ph}"/>')
    for x, lab in refs:
        o.append(f'<line class="ref" x1="{sx(x):.1f}" x2="{sx(x):.1f}" y1="{T}" y2="{T + ph}"/>')
        o.append(f'<text class="src" x="{sx(x) + 5:.1f}" y="{T + 12}">{esc(lab)}</text>')
    o.append(f'<text class="axlabel" x="{L + pw / 2:.1f}" y="{H - 18}" text-anchor="middle">{esc(xlab)}</text>')
    o.append(f'<text class="axlabel" transform="translate(18 {T + ph / 2:.1f}) rotate(-90)" text-anchor="middle">{esc(ylab)}</text>')
    o.append(f'<text class="src" x="{W - 12}" y="{H - 6}" text-anchor="end">{esc(source)}</text>')
    o.append(f'<clipPath id="plot"><rect x="{L}" y="{T}" width="{pw}" height="{ph}"/></clipPath>')
    ends = []
    step = (xr[1] - xr[0]) / (pw * 2.0)        # half-pixel columns
    for lab, role, pts, dash in series:
        a = np.array(clean_curve(pts))           # stray digitising points removed (display)
        a = a[(a[:, 0] >= xr[0]) & (a[:, 0] <= xr[1])]
        # one median point per half-pixel column: traces along x and along y (steep
        # flanks) interleave when sorted by x; the median draws the line, not a zig-zag
        k = np.floor((a[:, 0] - xr[0]) / step).astype(int)
        a = np.array([[a[k == i, 0].mean(), np.median(a[k == i, 1])] for i in np.unique(k)])
        d = 'M' + ' L'.join(f'{sx(x):.1f},{sy(y):.1f}' for x, y in a)
        da = f' stroke-dasharray="{dash}"' if dash else ''
        o.append(f'<path class="curve" clip-path="url(#plot)" d="{d}" style="stroke:var(--{role})"{da}><title>{esc(lab)}</title></path>')
        ends.append([sy(a[-1, 1]), lab, role, sx(a[-1, 0])])
    # direct labels at the right edge, inside the plot's height, spread so they never overlap
    for e in ends: e[0] = min(max(e[0], T + 6), T + ph - 4)
    ends.sort()
    for i in range(1, len(ends)):
        ends[i][0] = max(ends[i][0], ends[i - 1][0] + 16)
    over = ends[-1][0] - (T + ph - 4) if ends else 0
    if over > 0:                               # pushed past the bottom: shift the stack up
        for e in ends: e[0] -= over
        for i in range(len(ends) - 2, -1, -1):
            ends[i][0] = min(ends[i][0], ends[i + 1][0] - 16)
    for y, lab, role, x in ends:
        o.append(f'<line x1="{L + pw + 4}" x2="{L + pw + 16}" y1="{y:.1f}" y2="{y:.1f}" style="stroke:var(--{role});stroke-width:3;stroke-linecap:round"/>')
        o.append(f'<text class="lab" x="{L + pw + 21}" y="{y + 4:.1f}">{esc(lab)}</text>')
    o.append('</svg>')
    os.makedirs(OUT, exist_ok=True)
    open(os.path.join(OUT, name + '.svg'), 'w').write('\n'.join(o))
    return name + '.svg'


def main():
    neg = J('char_neg.json')
    neg['200T'] = J('char_200t.json')['200T']; neg['500T'] = J('char_500t.json')['500T']
    sens = {'50D': J('sens_50d.json'), '200T': J('sens_200t.json'), '250D': J('sens_250d.json'), '500T': J('sens_500t.json')}
    dyes = {'200T': J('dye_200t.json'), '250D': J('dye_250d.json'), '500T': J('dye_500t.json')}
    names = {'50D': 'Vision3 50D 5203', '200T': 'Vision3 200T 5213', '250D': 'Vision3 250D 5207', '500T': 'Vision3 500T 5219'}
    sheet = {'50D': '5203', '200T': '5213/7213', '250D': '5207', '500T': '5219/7219'}
    made = []
    for st, nm in names.items():
        src = f'Data digitised from Kodak {nm.split()[-1]} technical data ({sheet[st]}) for Film Lab'
        made.append(chart(f'{st}_characteristic', f'{nm}: characteristic curves', 'Status M density of each layer, ECN-2',
                          'Camera stops from normal exposure', 'Density (Status M)', (-8, 8), (0, 3),
                          range(-8, 9, 2), [0, 0.5, 1, 1.5, 2, 2.5, 3],
                          [('Blue (B)', 'blue', neg[st]['B'], None), ('Green (G)', 'green', neg[st]['G'], None), ('Red (R)', 'red', neg[st]['R'], None)],
                          src, refs=[(0, 'normal exposure')]))
        s = sens[st]
        made.append(chart(f'{st}_sensitivity', f'{nm}: spectral sensitivity', 'Log sensitivity per layer (density 0.2 above D-min); blue layer forms yellow dye, green magenta, red cyan',
                          'Wavelength (nm)', 'Log sensitivity', (350, 700), (0, 3.5), range(350, 701, 50), [0, 0.5, 1, 1.5, 2, 2.5, 3, 3.5],
                          [('Blue layer', 'blue', s['Y'], None), ('Green layer', 'green', s['M'], None),
                           ('Red layer', 'red', s['C'], None)], src))
        if st in dyes:
            d = dyes[st]
            made.append(chart(f'{st}_dyes', f'{nm}: spectral dye density', 'Dyes peak-normalised, D-min subtracted; midscale neutral and base (D-min)',
                              'Wavelength (nm)', 'Diffuse spectral density', (400, 800), (-0.1, 1.8), range(400, 801, 50),
                              [0, 0.2, 0.4, 0.6, 0.8, 1, 1.2, 1.4, 1.6, 1.8],
                              [('Cyan dye', 'blue', d['C'], None), ('Magenta dye', 'magenta', d['M'], None), ('Yellow dye', 'yellow', d['Y'], None),
                               ('Midscale neutral', 'ink2', d['N'], None), ('Minimum density', 'muted', d['Dmin'], '6 5')], src))
    # 2383
    src = 'Data digitised from Kodak VISION Color Print Film 2383/3383 data sheet for Film Lab'
    c = J('char_2383_rows.json'); sh = J('char_2383_shoulder.json')
    made.append(chart('2383_characteristic', 'Kodak 2383 print: characteristic curves', 'Status A density of each layer, ECP-2',
                      'Log exposure (lux-seconds)', 'Density (Status A)', (-0.5, 2.6), (0, 4.5), [-0.5, 0, 0.5, 1, 1.5, 2, 2.5],
                      [0, 0.5, 1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5],
                      [('Blue (B)', 'blue', c['B'] + sh['B'], None), ('Green (G)', 'green', c['G'] + sh['G'], None), ('Red (R)', 'red', c['R'] + sh['R'], None)], src))
    s = J('sens_2383.json')
    made.append(chart('2383_sensitivity', 'Kodak 2383 print: spectral sensitivity', 'Log sensitivity per layer; blue layer forms yellow dye, green magenta, red cyan',
                      'Wavelength (nm)', 'Log sensitivity', (350, 750), (-3, 1), range(350, 751, 50), [-3, -2, -1, 0, 1],
                      [('Blue layer', 'blue', s['Y'], None), ('Green layer', 'green', s['M'], None),
                       ('Red layer', 'red', s['C'], None)], src))
    d = J('dye_2383.json')
    made.append(chart('2383_dyes', 'Kodak 2383 print: spectral dye density', 'Dyes for a visual neutral of density 1.0, and the neutral',
                      'Wavelength (nm)', 'Diffuse spectral density', (350, 750), (0, 1.2), range(350, 751, 50), [0, 0.2, 0.4, 0.6, 0.8, 1, 1.2],
                      [('Cyan dye', 'blue', d['C'], None), ('Magenta dye', 'magenta', d['M'], None), ('Yellow dye', 'yellow', d['Y'], None),
                       ('Neutral', 'ink2', d['N'], None)], src))
    print('wrote', len(made), 'charts to', os.path.relpath(OUT))


if __name__ == '__main__':
    main()
