"""Morceau original « dans l'esprit coupé-décalé », 100 % synthétisé (aucun échantillon externe).
126 BPM, 16 mesures en boucle : grosse caisse 4/4, clap, charleston, tambour parlant syncopé,
basse profonde, guitare « sebene » en arpèges (grille I–IV–V–IV en ré majeur) et une mélodie lead."""
import numpy as np
from scipy.signal import lfilter, butter
import sys
SR = 44100; BPM = 126; S16 = 60 / BPM / 4; BARS = 16
N = int(round(BARS * 16 * S16 * SR))
mix = {k: np.zeros(N) for k in ['kick', 'clap', 'hat', 'drum', 'bass', 'gtr', 'lead', 'shk']}
rng = np.random.default_rng(7)
def at(step): return int(round(step * S16 * SR))
def add(track, start, sig, gain=1.0):
    s = start % N; e = min(N, s + len(sig)); mix[track][s:e] += sig[:e - s] * gain
    if s + len(sig) > N: rest = s + len(sig) - N; mix[track][:rest] += sig[e - s:e - s + rest] * gain  # rebouclage
def env(n, a=0.002, d=0.2):
    t = np.arange(n) / SR; return np.minimum(1, t / a) * np.exp(-t / d)
def bp(x, lo, hi): b, a = butter(2, [lo / (SR / 2), hi / (SR / 2)], 'band'); return lfilter(b, a, x)
def hp(x, f): b, a = butter(2, f / (SR / 2), 'high'); return lfilter(b, a, x)
def lp(x, f): b, a = butter(2, f / (SR / 2), 'low'); return lfilter(b, a, x)
def mtof(m): return 440 * 2 ** ((m - 69) / 12)

def kick():
    n = int(0.35 * SR); t = np.arange(n) / SR
    f = 45 + 90 * np.exp(-t * 28); ph = 2 * np.pi * np.cumsum(f) / SR
    return np.sin(ph) * np.exp(-t * 7) + 0.15 * np.sin(ph * 2) * np.exp(-t * 30)
def clap():
    n = int(0.25 * SR); x = rng.standard_normal(n)
    e = np.exp(-np.arange(n) / SR / 0.09); e[:int(0.01*SR)] *= 1.6
    return bp(x, 900, 3500) * e
def hat(open_=False):
    n = int((0.18 if open_ else 0.05) * SR); return hp(rng.standard_normal(n), 7000) * env(n, 0.001, 0.07 if open_ else 0.018)
def tdrum(pitch):  # tambour parlant : membrane accordée dont la hauteur glisse
    n = int(0.3 * SR); t = np.arange(n) / SR
    f = pitch * (1 + 0.5 * np.exp(-t * 25)); ph = 2 * np.pi * np.cumsum(f) / SR
    slap = bp(rng.standard_normal(n), 1500, 5000) * np.exp(-t * 80) * 0.3
    return (np.sin(ph) + 0.3 * np.sin(1.59 * ph)) * np.exp(-t * 9) + slap
def pluck(freq, dur=0.35, bright=0.996):  # guitare par Karplus-Strong
    n = int(dur * SR); P = int(SR / freq)
    x = np.zeros(n); x[:P] = rng.uniform(-1, 1, P)
    a = np.zeros(P + 2); a[0] = 1; a[P] = -bright / 2; a[P + 1] = -bright / 2
    y = lfilter([1], a, x); return lp(y, 4500) * env(n, 0.001, dur * 0.6)
def bassnote(freq, dur):
    n = int(dur * SR); t = np.arange(n) / SR
    y = np.sin(2 * np.pi * freq * t) + 0.35 * np.sin(4 * np.pi * freq * t) + 0.12 * np.sign(np.sin(2 * np.pi * freq * t))
    return lp(y, 500) * env(n, 0.005, dur * 0.9)

# grille sebene en ré majeur : D – G – A – G (une mesure chacun)
CH = [[62, 66, 69], [67, 71, 74], [69, 73, 76], [67, 71, 74]]
ROOT = [38, 43, 45, 43]
for bar in range(BARS):
    b0 = bar * 16; ch = CH[bar % 4]; root = ROOT[bar % 4]
    for beat in range(4): add('kick', at(b0 + beat * 4), kick(), 1.0)
    for beat in (1, 3): add('clap', at(b0 + beat * 4), clap(), 0.55)
    for s in range(16): add('hat', at(b0 + s), hat(s % 4 == 2), 0.22 if s % 2 else 0.12)
    for s in range(16): add('shk', at(b0 + s) + int(0.01 * SR), hp(rng.standard_normal(1500), 5000) * env(1500, 0.004, 0.012), 0.08)
    # tambour parlant : motif syncopé, variation toutes les 2 mesures
    pat = [(0, 180), (3, 150), (6, 220), (8, 180), (10, 150), (13, 240), (14, 200)] if bar % 2 == 0 else \
          [(0, 180), (2, 220), (5, 150), (7, 260), (10, 180), (11, 150), (14, 240)]
    for s, p in pat: add('drum', at(b0 + s), tdrum(p), 0.45)
    # basse : fondamentale syncopée (le « temps fort décalé »)
    for s, dn, d in [(0, 0, 3), (3, 0, 2), (6, 12, 2), (8, 0, 3), (11, 7, 2), (14, 5, 2)]:
        add('bass', at(b0 + s), bassnote(mtof(root + dn), d * S16 * 1.1), 0.75)
    # guitare sebene : arpèges en doubles croches, les deux dernières mesures de chaque groupe montent
    arp = [ch[0], ch[1], ch[2], ch[1] + 12 if bar % 8 >= 6 else ch[1]]
    if bar >= 2:
        for s in range(16):
            note = arp[s % 4] + (12 if s >= 8 and bar % 4 == 3 else 0)
            add('gtr', at(b0 + s), pluck(mtof(note), 0.3), 0.32 if s % 4 == 0 else 0.22)
    # mélodie lead (mesures 9 à 16) : guitare aiguë, phrase qui répond
    if bar >= 8:
        phrase = [(0, 2), (3, 4), (6, 2), (8, 7), (10, 4), (12, 2), (14, 0)] if bar % 2 == 0 else \
                 [(0, 4), (2, 7), (4, 9), (7, 7), (10, 4), (12, 2)]
        for s, iv in phrase: add('lead', at(b0 + s), pluck(mtof(ch[0] + 12 + iv), 0.45, 0.998), 0.38)

gains = {'kick': 0.9, 'clap': 0.6, 'hat': 0.5, 'shk': 0.5, 'drum': 0.7, 'bass': 0.8, 'gtr': 0.55, 'lead': 0.5}
pan = {'kick': 0, 'clap': 0, 'hat': 0.3, 'shk': -0.4, 'drum': -0.25, 'bass': 0, 'gtr': 0.35, 'lead': -0.2}
L = sum(mix[k] * gains[k] * (1 - max(0, pan[k])) for k in mix); R = sum(mix[k] * gains[k] * (1 + min(0, pan[k])) for k in mix)
st = np.stack([L, R], 1); st = np.tanh(st / np.max(np.abs(st)) * 1.6) * 0.89  # légère saturation douce, niveau final
import wave
with wave.open(sys.argv[1], 'wb') as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes((st * 32767).astype('<i2').tobytes())
print(f'{N / SR:.1f} s')
