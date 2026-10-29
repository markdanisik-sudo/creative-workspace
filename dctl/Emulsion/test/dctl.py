"""Build a .dctl file as a CPU program and run it on numpy images.

    plug = build('path/to/Plugin.dctl')
    out = plug.run(img, p_Exposure=1.0)      # img: H x W x 3 float32
    plug.params                              # UI parameters parsed from the file

The .dctl source is preprocessed here: #include "..." files are inlined,
DEFINE_UI_PARAMS become C++ globals that the command line can set, and
DEFINE_LUT loads the .cube file next to the plugin.  shim.h supplies the
DCTL math functions.
"""
import hashlib, json, os, re, subprocess
import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
BUILD = os.path.join(HERE, '.build')


def _split_args(s):
    """split on top-level commas (ignores commas inside {} and quotes)"""
    out, depth, quote, cur = [], 0, False, ''
    for ch in s:
        if ch == '"':
            quote = not quote
        elif not quote and ch == '{':
            depth += 1
        elif not quote and ch == '}':
            depth -= 1
        if ch == ',' and depth == 0 and not quote:
            out.append(cur.strip()); cur = ''
        else:
            cur += ch
    out.append(cur.strip())
    return out


def _macro_calls(src, name):
    """(start, end, args) of each NAME(...) call, matching parentheses"""
    for m in re.finditer(r'^[ \t]*' + name + r'\s*\(', src, re.M):
        i, depth = m.end(), 1
        while depth:
            depth += {'(': 1, ')': -1}.get(src[i], 0)
            i += 1
        yield m.start(), i, src[m.end():i - 1]


def _inline(path, seen=None):
    seen = seen if seen is not None else []
    src = open(path).read()
    base = os.path.dirname(path)
    def inc(m):
        p = os.path.normpath(os.path.join(base, m.group(1)))
        if not os.path.exists(p):
            raise FileNotFoundError(f'{path}: #include "{m.group(1)}" not found')
        seen.append(p)
        return _inline(p, seen)[0]
    return re.sub(r'^[ \t]*#include\s+"([^"]+)"[^\n]*$', inc, src, flags=re.M), seen


def preprocess(path):
    src, deps = _inline(os.path.abspath(path))
    base = os.path.dirname(os.path.abspath(path))
    params, pieces, last = [], [], 0
    for a, b, body in _macro_calls(src, 'DEFINE_UI_PARAMS'):
        f = _split_args(body)
        name, label, kind = f[0], f[1], f[2]
        p = {'name': name, 'label': label, 'type': kind, 'default': float(f[3])}
        if kind in ('DCTLUI_SLIDER_FLOAT', 'DCTLUI_SLIDER_INT'):
            p.update(min=float(f[4]), max=float(f[5]), step=float(f[6]))
        if kind == 'DCTLUI_COMBO_BOX':
            p['enums'] = [e.strip() for e in f[4].strip('{} ').split(',')]
            p['labels'] = json.loads('[' + f[5].strip('{} ') + ']')
            if len(p['enums']) != len(p['labels']):
                raise ValueError(f'{name}: {len(p["enums"])} enum names but {len(p["labels"])} labels')
        ctype = 'float' if kind in ('DCTLUI_SLIDER_FLOAT', 'DCTLUI_VALUE_BOX') else 'int'
        decl = ''
        if 'enums' in p:
            decl = 'enum { ' + ', '.join(p['enums']) + ' }; '
        decl += f'static {ctype} {name} = {f[3]};'
        pieces += [src[last:a], decl]
        last = b
        params.append(p)
    src = ''.join(pieces) + src[last:]
    luts = []
    def lut(m):
        luts.append(m.group(2).strip())
        return f'static CubeLut {m.group(1).strip()}("{os.path.join(base, m.group(2).strip())}");'
    src = re.sub(r'^[ \t]*DEFINE_LUT\s*\(\s*(\w+)\s*,\s*([^)]+)\)', lut, src, flags=re.M)

    setter = ['static bool set_param(const std::string& n, double v)', '{']
    for p in params:
        ctype = 'float' if p['type'] in ('DCTLUI_SLIDER_FLOAT', 'DCTLUI_VALUE_BOX') else 'int'
        setter.append(f'    if (n == "{p["name"]}") {{ {p["name"]} = ({ctype})v; return true; }}')
    setter += ['    return false;', '}']
    texture = bool(re.search(r'transform\s*\([^)]*__TEXTURE__', src))
    js = json.dumps(params).replace('\\', '\\\\').replace('"', '\\"')
    cpp = ['#include "shim.h"', '#define DCTL_TEXTURE' if texture else '', src, '\n'.join(setter),
           f'static const char* DCTL_PARAMS_JSON = "{js}";', '#include "runner.h"']
    return '\n'.join(cpp), params, deps, luts


class Plugin:
    def __init__(self, path, exe, params):
        self.path, self.exe, self.params = path, exe, params
        self.by_name = {p['name']: p for p in params}

    def enum(self, param, name):
        """index of an enum name in a combo box (p_Stock, 'V3_5207') -> 1"""
        return self.by_name[param]['enums'].index(name)

    def run(self, img, **kw):
        img = np.ascontiguousarray(img, np.float32)
        h, w = img.shape[:2]
        args = []
        for k, v in kw.items():
            if isinstance(v, str):
                v = self.enum(k, v)
            args.append(f'{k}={float(v)!r}')
        data = np.array([w, h], np.int32).tobytes() + img.tobytes()
        r = subprocess.run([self.exe] + args, input=data, capture_output=True)
        if r.returncode:
            raise RuntimeError(f'{os.path.basename(self.path)} failed: {r.stderr.decode()}')
        return np.frombuffer(r.stdout[8:], np.float32).reshape(h, w, 3).copy()


def build(path, flags=('-O2',)):
    path = os.path.abspath(path)
    cpp, params, deps, _ = preprocess(path)
    os.makedirs(BUILD, exist_ok=True)
    key = hashlib.sha1((cpp + ' '.join(flags) + open(os.path.join(HERE, 'shim.h')).read()
                        + open(os.path.join(HERE, 'runner.h')).read()).encode()).hexdigest()[:12]
    stem = os.path.splitext(os.path.basename(path))[0]
    exe = os.path.join(BUILD, f'{stem}_{key}')
    if not os.path.exists(exe):
        src = os.path.join(BUILD, f'{stem}.cpp')
        open(src, 'w').write(cpp)
        cmd = ['g++', '-std=c++17', *flags, '-Wall', '-Wno-unused-function', '-Wno-unused-variable',
               '-Wno-misleading-indentation', '-I', HERE, src, '-o', exe]
        r = subprocess.run(cmd, capture_output=True, text=True)
        if r.returncode:
            raise RuntimeError(f'build of {os.path.basename(path)} failed:\n{r.stderr}')
    return Plugin(path, exe, params)
