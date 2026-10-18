import numpy as np
from PIL import Image, ImageDraw
def load(path, box=None, thr=140):
    im = Image.open(path).convert('L')
    if box: im = im.crop(box)
    return np.asarray(im) < thr, im
def runs(col):
    idx = np.where(col)[0]
    if len(idx) == 0: return []
    g = np.split(idx, np.where(np.diff(idx) > 1)[0] + 1)
    return [(int(a[0]), int(a[-1])) for a in g]
def trace(mask, x0, y0, x1, step=1, max_jump=12, max_thick=30, exclude=()):
    """follow a dark line from (x0,y0) to x1; returns dict x -> y (centre of the run)"""
    m = mask.copy()
    for (ax, ay, bx, by) in exclude: m[ay:by, ax:bx] = False
    out = {}; y = y0
    for x in range(x0, x1 + (1 if x1 >= x0 else -1), step if x1 >= x0 else -step):
        rs = [r for r in runs(m[:, x]) if r[1] - r[0] < max_thick]
        if not rs: continue
        c = min(rs, key=lambda r: abs((r[0] + r[1]) / 2 - y))
        yc = (c[0] + c[1]) / 2
        if abs(yc - y) <= max_jump:
            out[x] = yc; y = yc
    return out
def overlay(im, curves, path, colors=((255,0,0),(0,170,0),(0,0,255),(255,0,255),(0,200,200))):
    im = im.convert('RGB'); d = ImageDraw.Draw(im)
    for (cv, col) in zip(curves, colors):
        pts = sorted(cv.items())
        for (xa, ya), (xb, yb) in zip(pts[:-1], pts[1:]):
            if xb - xa <= 3: d.line((xa, ya, xb, yb), fill=col, width=3)
    im.save(path)

def trace_pred(mask, x0, y0, x1, max_jump=14, max_thick=30, exclude=(), slope_mem=0.8):
    """like trace(), but predicts y from the running slope so crossings keep their direction"""
    m = mask.copy()
    for (ax, ay, bx, by) in exclude: m[ay:by, ax:bx] = False
    out = {}; y = y0; slope = 0.0; lastx = x0
    step = 1 if x1 >= x0 else -1
    for x in range(x0, x1 + step, step):
        rs = [r for r in runs(m[:, x]) if r[1] - r[0] < max_thick]
        pred = y + slope * (x - lastx)
        if not rs: continue
        c = min(rs, key=lambda r: abs((r[0] + r[1]) / 2 - pred))
        yc = (c[0] + c[1]) / 2
        # a crossing merges two lines into one tall run: use the prediction inside it
        if c[1] - c[0] > 9 and c[0] - 2 <= pred <= c[1] + 2: yc = pred
        if abs(yc - pred) <= max_jump:
            s = (yc - y) / max(abs(x - lastx), 1) * step
            slope = slope_mem * slope + (1 - slope_mem) * s * step
            out[x] = yc; y = yc; lastx = x
    return out

def clean_grid(mask, frac=0.45, pad=2):
    """remove long horizontal/vertical lines (grid, frame) from a mask"""
    m = mask.copy()
    H, W = m.shape
    for y in np.where(m.sum(1) > frac * W)[0]: m[max(y - pad, 0):y + pad + 1] = False
    for x in np.where(m.sum(0) > frac * H)[0]: m[:, max(x - pad, 0):x + pad + 1] = False
    return m

def trace_walk(mask, start, direction, stop, R=6, max_turn=55, max_steps=4000, exclude=()):
    """walk along a line: from `start` (x,y) heading `direction` (dx,dy), step R px to the
    pixel cluster whose heading is closest to the current one; stop(x,y) -> True ends the walk"""
    m = mask.copy()
    for (ax, ay, bx, by) in exclude: m[ay:by, ax:bx] = False
    H, W = m.shape
    p = np.array(start, float); d = np.array(direction, float); d /= np.linalg.norm(d)
    pts = [tuple(p)]
    gap = 0
    for _ in range(max_steps):
        found = False
        for r in (R, R + 3, R + 7, R + 12):                      # bridge small gaps (dotted lines, grid)
            x0, x1 = int(max(p[0] - r - 2, 0)), int(min(p[0] + r + 3, W))
            y0, y1 = int(max(p[1] - r - 2, 0)), int(min(p[1] + r + 3, H))
            ys, xs = np.nonzero(m[y0:y1, x0:x1])
            if len(xs) == 0: continue
            v = np.stack([xs + x0 - p[0], ys + y0 - p[1]], 1)
            dist = np.linalg.norm(v, axis=1)
            sel = (dist > r - 1.5) & (dist < r + 1.5)
            if not sel.any(): continue
            u = v[sel] / dist[sel, None]
            ang = np.degrees(np.arccos(np.clip(u @ d, -1, 1)))
            ok = ang < max_turn
            if not ok.any(): continue
            # cluster candidates by angle, take the cluster closest to straight ahead
            cand = v[sel][ok]; a = ang[ok]
            best = a.min(); grp = cand[a < best + 12]
            step = grp.mean(0); n = np.linalg.norm(step)
            if n < 1e-6: continue
            nd = step / n
            d = 0.6 * d + 0.4 * nd; d /= np.linalg.norm(d)
            p = p + step
            found = True
            break
        if not found: break
        pts.append(tuple(p))
        if stop(*p): break
    return np.array(pts)

def overlay_pts(im, curves, path, colors=((255,0,0),(200,0,200),(220,170,0),(0,170,0),(0,0,255))):
    im = im.convert('RGB'); d = ImageDraw.Draw(im)
    for c, col in zip(curves, colors):
        d.line([tuple(q) for q in c], fill=col, width=3)
    im.save(path)

from scipy import ndimage
def remove_small(mask, max_extent=45):
    """drop small connected components (text glyphs, tick marks)"""
    lab, n = ndimage.label(mask, structure=np.ones((3, 3)))
    sl = ndimage.find_objects(lab)
    keep = np.zeros(n + 1, bool)
    for i, s in enumerate(sl, 1):
        if max(s[0].stop - s[0].start, s[1].stop - s[1].start) > max_extent: keep[i] = True
    return keep[lab]

def remove_text(mask, boxes, max_extent=40):
    """drop small components that sit inside the given text boxes"""
    lab, n = ndimage.label(mask, structure=np.ones((3, 3)))
    drop = np.zeros(n + 1, bool)
    for i, s in enumerate(ndimage.find_objects(lab), 1):
        h, w = s[0].stop - s[0].start, s[1].stop - s[1].start
        cy, cx = (s[0].start + s[0].stop) / 2, (s[1].start + s[1].stop) / 2
        if max(h, w) <= max_extent and any(ax <= cx <= bx and ay <= cy <= by for ax, ay, bx, by in boxes): drop[i] = True
    return mask & ~drop[lab]

def trace_dashes(mc, x0, x1, y0, max_thick=14):
    pts = []; prev = y0; lastx = x0
    for x in range(x0, x1):
        rs = [r for r in runs(mc[:, x]) if r[1] - r[0] < max_thick]
        if not rs: continue
        c = min(rs, key=lambda r: abs((r[0] + r[1]) / 2 - prev)); yc = (c[0] + c[1]) / 2
        if abs(yc - prev) < 12 + 2.0 * (x - lastx): pts.append((x, yc)); prev = yc; lastx = x
    return np.array(pts)

def trace_guided(mask, guide, tol=18, max_thick=40, along='x'):
    """digitize a curve by snapping a hand-drawn guide polyline to the nearest dark run.
    along='x': walk columns (for flat-ish parts); 'y': walk rows (for steep parts).
    guide: list of (x, y) points in pixel coordinates, monotonic in the walk axis."""
    g = np.array(guide, float)
    out = []
    if along == 'x':
        for x in range(int(g[0, 0]), int(g[-1, 0]) + 1):
            ye = np.interp(x, g[:, 0], g[:, 1])
            rs = [r for r in runs(mask[:, x]) if r[1] - r[0] < max_thick]
            if not rs: continue
            c = min(rs, key=lambda r: abs((r[0] + r[1]) / 2 - ye)); yc = (c[0] + c[1]) / 2
            if abs(yc - ye) < tol: out.append((x, yc))
    else:
        o = np.argsort(g[:, 1]); gy = g[o]
        for y in range(int(gy[0, 1]), int(gy[-1, 1]) + 1):
            xe = np.interp(y, gy[:, 1], gy[:, 0])
            rs = [r for r in runs(mask[y, :]) if r[1] - r[0] < max_thick]
            if not rs: continue
            c = min(rs, key=lambda r: abs((r[0] + r[1]) / 2 - xe)); xc = (c[0] + c[1]) / 2
            if abs(xc - xe) < tol: out.append((xc, y))
    return np.array(out)

def merge_xy(*parts):
    a = np.concatenate([p for p in parts if len(p)])
    return a[np.argsort(a[:, 0], kind='stable')]
