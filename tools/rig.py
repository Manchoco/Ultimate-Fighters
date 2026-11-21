"""Génère les poses articulées de chaque combattant par déformation « marionnette »
(Moving Least Squares rigide) autour du squelette détecté.
Sortie : une planche (spritesheet) par combattant + un fichier JSON de métadonnées."""
import json, math, sys
import numpy as np
from PIL import Image
from scipy.ndimage import map_coordinates, zoom

FD = 'public/assets/fighters/'
OUT = 'public/assets/rigs/'
poses = json.load(open('tools/poses.json'))
# Archer : articulations placées à la main (MediaPipe ne le détecte pas)
poses['archer'] = {
    'nose': (0.44, 0.12), 'lsh': (0.58, 0.19), 'rsh': (0.33, 0.17), 'lel': (0.75, 0.235), 'rel': (0.15, 0.15),
    'lwr': (0.90, 0.24), 'rwr': (0.33, 0.18), 'lhip': (0.52, 0.40), 'rhip': (0.36, 0.40),
    'lkn': (0.58, 0.62), 'rkn': (0.22, 0.68), 'lan': (0.72, 0.90), 'ran': (0.12, 0.90),
}

BODY_H = 400            # hauteur du corps dans la planche (px)
PAD_X, PAD_TOP, PAD_BOT = 0.55, 0.22, 0.03  # marges (fraction de la hauteur du corps)

def ang(v): return math.degrees(math.atan2(v[1], v[0]))
def rot(p, c, a):
    a = math.radians(a); s, co = math.sin(a), math.cos(a)
    x, y = p[0] - c[0], p[1] - c[1]
    return np.array([c[0] + x * co - y * s, c[1] + x * s + y * co])

def skeleton(name, W, H):
    P = {k: np.array([v[0] * W, v[1] * H]) for k, v in poses[name].items()}
    # bras/jambe « avant » = le plus à droite (le combattant regarde à droite)
    fa, ba = (('l', 'r') if P['lwr'][0] > P['rwr'][0] else ('r', 'l'))
    fl, bl = (('l', 'r') if P['lan'][0] > P['ran'][0] else ('r', 'l'))
    S = {
        'head': P['nose'], 'neck': (P['lsh'] + P['rsh']) / 2 + np.array([0, -0.02 * H]),
        'fsh': P[fa + 'sh'], 'fel': P[fa + 'el'], 'fwr': P[fa + 'wr'],
        'bsh': P[ba + 'sh'], 'bel': P[ba + 'el'], 'bwr': P[ba + 'wr'],
        'fhip': P[fl + 'hip'], 'fkn': P[fl + 'kn'], 'fan': P[fl + 'an'],
        'bhip': P[bl + 'hip'], 'bkn': P[bl + 'kn'], 'ban': P[bl + 'an'],
    }
    S['pelvis'] = (S['fhip'] + S['bhip']) / 2
    S['chest'] = (S['neck'] * 0.55 + S['pelvis'] * 0.45)
    S['top'] = S['head'] + np.array([0, -0.07 * H])  # sommet du crâne
    return S

UPPER = ['head', 'top', 'neck', 'chest', 'fsh', 'fel', 'fwr', 'bsh', 'bel', 'bwr']

def apply_pose(S0, spec):
    S = {k: v.copy() for k, v in S0.items()}
    def chain_rot(joints, pivot, a):
        c = S[pivot].copy()
        for j in joints: S[j] = rot(S[j], c, a)
    def set_dir(a, b, rest, target_abs=None, delta=0):
        cur = ang(S[b] - S[a])
        tgt = target_abs if target_abs is not None else cur + delta
        chain_rot(rest, a, tgt - cur)
    if spec.get('torso'): chain_rot(UPPER, 'pelvis', spec['torso'])
    if spec.get('head'): chain_rot(['head', 'top'], 'neck', spec['head'])
    limbs = {'fa': ('fsh', 'fel', 'fwr'), 'ba': ('bsh', 'bel', 'bwr'), 'fl': ('fhip', 'fkn', 'fan'), 'bl': ('bhip', 'bkn', 'ban')}
    for k, (a, b, c) in limbs.items():
        if k + '_up' in spec or k + '_UP' in spec:
            set_dir(a, b, [b, c], target_abs=spec.get(k + '_UP'), delta=spec.get(k + '_up', 0))
        if k + '_lo' in spec or k + '_LO' in spec:
            set_dir(b, c, [c], target_abs=spec.get(k + '_LO'), delta=spec.get(k + '_lo', 0))
    # les pieds restent au sol : on descend tout le corps si les jambes se plient
    if not spec.get('air'):
        ground0 = max(S0['fan'][1], S0['ban'][1])
        planted = [S[j][1] for j in ('fan', 'ban') if not spec.get('lift_' + j)]
        if planted:
            dy = ground0 - max(planted)
            for k in S: S[k] = S[k] + np.array([0, dy])
    return S

BONES = [('top', 'head'), ('head', 'neck'), ('neck', 'chest'), ('chest', 'pelvis'), ('neck', 'fsh'), ('neck', 'bsh'),
         ('fsh', 'fel'), ('fel', 'fwr'), ('bsh', 'bel'), ('bel', 'bwr'), ('pelvis', 'fhip'), ('pelvis', 'bhip'),
         ('fhip', 'fkn'), ('fkn', 'fan'), ('bhip', 'bkn'), ('bkn', 'ban'), ('fsh', 'bsh'), ('chest', 'fhip'), ('chest', 'bhip')]

def handles(S, ext):
    pts = []
    for a, b in BONES:
        for t in (0.0, 0.33, 0.66, 1.0):
            pts.append(S[a] * (1 - t) + S[b] * t)
    for a, b, f in (('fel', 'fwr', ext), ('bel', 'bwr', ext), ('fkn', 'fan', 0.25), ('bkn', 'ban', 0.25)):
        pts.append(S[b] + (S[b] - S[a]) * f)
    return np.array(pts)

def mls_rigid_inverse(P_def, Q_src, gx, gy, alpha=1.4):
    """Pour chaque point (gx, gy) de l'image finale, retrouve le point source."""
    V = np.stack([gx.ravel(), gy.ravel()], 1)
    d2 = ((V[:, None, :] - P_def[None, :, :]) ** 2).sum(-1) + 1e-6
    w = 1.0 / d2 ** alpha
    ws = w.sum(1, keepdims=True)
    ps = (w @ P_def) / ws; qs = (w @ Q_src) / ws
    ph = P_def[None] - ps[:, None]; qh = Q_src[None] - qs[:, None]
    phc = ph[..., 0] + 1j * ph[..., 1]; qhc = qh[..., 0] + 1j * qh[..., 1]
    r = (w * np.conj(phc) * qhc).sum(1)
    r = r / (np.abs(r) + 1e-9)
    vc = (V[:, 0] - ps[:, 0]) + 1j * (V[:, 1] - ps[:, 1])
    f = vc * r + (qs[:, 0] + 1j * qs[:, 1])
    return f.real.reshape(gx.shape), f.imag.reshape(gx.shape)

# ----- Poses (angles en degrés ; 0 = vers l'avant, 90 = vers le bas, -90 = vers le haut) -----
POSES = {
    'idle0': {},
    'idle1': {'torso': 1.5, 'head': 3, 'fa_up': 4, 'ba_up': 4, 'fa_lo': -3},
    'walk0': {'fl_up': -14, 'fl_lo': 10, 'bl_up': 12, 'bl_lo': 6, 'fa_up': 5, 'ba_up': -5, 'torso': 2},
    'walk1': {'fl_up': 12, 'fl_lo': 6, 'bl_up': -14, 'bl_lo': 10, 'fa_up': -5, 'ba_up': 5, 'torso': 2},
    'punch0': {'torso': -6, 'fa_up': 10, 'fa_lo': 12, 'head': -3, 'bl_up': 4},
    'punch1': {'torso': 12, 'fa_up': -16, 'fa_lo': -28, 'ba_up': -8, 'head': 5, 'fl_up': -6},
    'kick0': {'torso': -6, 'fl_up': -45, 'fl_lo': 55, 'fa_up': -8, 'lift_fan': 1},
    'kick1': {'torso': -20, 'fl_UP': -18, 'fl_LO': -12, 'fa_up': -14, 'ba_up': 12, 'lift_fan': 1},
    'low': {'torso': 12, 'fl_UP': 12, 'fl_LO': 14, 'bl_up': -40, 'bl_lo': 70, 'fa_up': -10, 'lift_fan': 1},
    'crouch': {'torso': 10, 'fl_up': -38, 'fl_lo': 62, 'bl_up': -38, 'bl_lo': 62, 'head': 6},
    'jump': {'fl_up': -55, 'fl_lo': 85, 'bl_up': -35, 'bl_lo': 80, 'fa_up': -10, 'ba_up': -10, 'air': 1},
    'airkick': {'torso': -15, 'fl_UP': 10, 'fl_LO': 12, 'bl_up': -40, 'bl_lo': 85, 'fa_up': -12, 'air': 1},
    'hit': {'torso': -14, 'head': -22, 'fa_up': 16, 'fa_lo': 12, 'ba_up': -12, 'fl_up': 6},
    'hitmid': {'torso': 18, 'head': 14, 'fa_up': 14, 'ba_up': 12, 'fl_up': -10, 'fl_lo': 15},
    'block': {'torso': 5, 'head': 8, 'fa_up': -20, 'ba_up': -25, 'fa_lo': -15, 'ba_lo': -20},
    'special': {'torso': 12, 'fa_up': -14, 'fa_lo': -22, 'ba_up': -14, 'ba_lo': -20, 'head': 3, 'fl_up': -8},
    'upper': {'torso': -10, 'fa_up': -28, 'fa_lo': -20, 'fl_up': -35, 'fl_lo': 50, 'lift_fan': 1, 'head': -10},
    'heavy0': {'torso': -16, 'fa_up': -22, 'ba_up': -18, 'head': -8, 'bl_up': 8},
    'heavy1': {'torso': 26, 'fa_up': 22, 'fa_lo': 18, 'ba_up': 18, 'head': 12, 'fl_up': -14, 'fl_lo': 20},
    'win': {'fa_up': -26, 'fa_lo': -18, 'head': -12, 'torso': -5},
    'ko': {'head': 26, 'fa_up': 20, 'fa_lo': 15, 'ba_up': 22, 'fl_up': -10, 'bl_up': 10},
}
ORDER = list(POSES)

def build(name):
    src = Image.open(FD + name + '.png').convert('RGBA')
    s = BODY_H / src.height
    src = src.resize((round(src.width * s), BODY_H), Image.LANCZOS)
    W, H = src.size
    a = np.asarray(src).astype(np.float32) / 255.0
    pm = a.copy(); pm[..., :3] *= pm[..., 3:4]  # alpha pré-multiplié (pas de franges)
    S0 = skeleton(name, W, H)
    ext = 0.35
    FW = int(W + 2 * PAD_X * H); FH = int(H * (1 + PAD_TOP + PAD_BOT))
    ox = (FW - W) / 2; oy = PAD_TOP * H
    step = 4
    gy, gx = np.mgrid[0:FH:step, 0:FW:step].astype(np.float32)
    Q = handles(S0, ext)
    frames = []
    for pname in ORDER:
        S = apply_pose(S0, POSES[pname])
        Pd = handles(S, ext) + np.array([ox, oy])
        sx, sy = mls_rigid_inverse(Pd, Q, gx, gy)
        fx = zoom(sx, (FH / sx.shape[0], FW / sx.shape[1]), order=1)[:FH, :FW]
        fy = zoom(sy, (FH / sy.shape[0], FW / sy.shape[1]), order=1)[:FH, :FW]
        out = np.zeros((FH, FW, 4), np.float32)
        for c in range(4):
            out[..., c] = map_coordinates(pm[..., c], [fy, fx], order=1, mode='constant', cval=0.0)
        al = out[..., 3:4]
        rgb = np.where(al > 1e-4, out[..., :3] / np.maximum(al, 1e-4), 0)
        img = np.concatenate([rgb, al], -1)
        frames.append(Image.fromarray((np.clip(img, 0, 1) * 255).astype(np.uint8)))
    cols = 5; rows = math.ceil(len(frames) / cols)
    sheet = Image.new('RGBA', (FW * cols, FH * rows))
    for i, f in enumerate(frames): sheet.paste(f, ((i % cols) * FW, (i // cols) * FH))
    sheet.save(OUT + name + '.webp', 'WEBP', quality=88, method=6)
    meta = {'frameWidth': FW, 'frameHeight': FH, 'bodyHeight': H, 'originY': (oy + H) / FH, 'frames': ORDER}
    return meta, sheet

if __name__ == '__main__':
    import os
    os.makedirs(OUT, exist_ok=True)
    names = sys.argv[1:] or list(poses)
    allmeta = {}
    try: allmeta = json.load(open(OUT + 'rigs.json'))
    except Exception: pass
    for n in names:
        meta, sheet = build(n)
        allmeta[n] = meta
        prev = sheet.copy(); prev.thumbnail((1600, 1600)); bg = Image.new('RGB', prev.size, (90, 90, 110)); bg.paste(prev, mask=prev.split()[3]); bg.save(f'/tmp/prev_{n}.png')
        print(n, meta['frameWidth'], meta['frameHeight'])
    json.dump(allmeta, open(OUT + 'rigs.json', 'w'), indent=1)
