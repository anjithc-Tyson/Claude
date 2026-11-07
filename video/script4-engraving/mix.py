"""Score + foley for script 4 (TREATMENT.md §6–7), ducked under her voice. Writes out/s4_bed.wav (48 kHz stereo).

Run with the library's Python:  $LIB/.venv/bin/python mix.py  (LIB in the environment).
Score: original, G major, 84 bpm; harpsichord (VCSL, CC0) and strings (VSCO 2 CE, CC0) through core/audio/sampler.py.
Foley: synthesised with numpy / core/audio/sfx.py. Event times come from events.json (the page's window.EV) and the
plate windows below (same numbers as film.js and Engraving.tsx).
"""
import json, os, subprocess, sys
import numpy as np
import soundfile as sf

LIB = os.environ['LIB']
sys.path.insert(0, os.path.join(LIB, 'core', 'audio'))
import sampler as S  # noqa: E402
import sfx  # noqa: E402

HERE = os.path.dirname(os.path.abspath(__file__))
SR = 48000
DUR = 52.62
EV = json.load(open(os.path.join(HERE, 'events.json')))['ev']
PLATES = [(0, 6.45), (10.85, 16.55), (17.55, 24.45), (36.85, 41.05), (49.02, 52.62)]
TISSUE = [10.85, 17.55, 36.85, 49.02]
PEEL = [6.0, 16.1, 24.0, 40.6]
BPM = 84; BEAT = 60 / BPM; BAR = 4 * BEAT
S.seed(11)

# ---------------- score ----------------
ev = []
def n(t, inst, p, d, v, pan=0.0, g=1.0): ev.append((t, inst, p, d, v, pan, g))
# G major progression, one chord per bar: G  D/F#  Em  C  Am  D  G  G
PROG = [('G2', ['G3', 'B3', 'D4', 'G4']), ('F#2', ['D3', 'A3', 'D4', 'F#4']), ('E2', ['E3', 'G3', 'B3', 'E4']), ('C3', ['C4', 'E4', 'G4', 'C5']),
        ('A2', ['A3', 'C4', 'E4', 'A4']), ('D3', ['D4', 'F#4', 'A4', 'D5']), ('G2', ['G3', 'B3', 'D4', 'G4']), ('G2', ['B3', 'D4', 'G4', 'B4'])]
def chord_at(t): return PROG[int(t / BAR) % len(PROG)]
def in_plate(t): return any(a <= t < b for a, b in PLATES)

# harpsichord under the plates: broken chords whose density follows the burin passes
def harp_figure(t0, t1, sub, vel):
    t = np.ceil(t0 / (BEAT / sub)) * (BEAT / sub)
    k = 0
    while t < t1 - 0.05:
        bass, ch = chord_at(t)
        if k % (sub * 2) == 0: n(t, 'harpsichord', bass, BEAT * 1.6, vel * 0.9, -0.2)
        n(t, 'harpsichord', ch[k % 4], BEAT / sub * 1.4, vel * (0.8 + 0.2 * ((k % 4) == 0)), 0.25)
        t += BEAT / sub; k += 1
harp_figure(0.15, 4.2, 2, 0.42)          # A: the finished piece, gently
harp_figure(4.2, 6.2, 1, 0.30)           # the push to the bare spot: thinner, curious
harp_figure(10.95, 16.4, 2, 0.40)        # B1: the three roundels
harp_figure(17.82, 20.14, 1, 0.38)       # outline pass
harp_figure(20.14, 21.08, 2, 0.40)       # hatching
harp_figure(21.08, 24.2, 4, 0.36)        # crossing: 16ths
harp_figure(49.3, 51.2, 2, 0.40)         # the finished plate
for p, dt in [('G2', 0), ('D3', 0.03), ('G3', 0.06), ('B3', 0.09), ('D4', 0.12), ('G4', 0.15)]:
    n(51.25 + dt, 'harpsichord', p, 1.6, 0.5, 0.0)   # the closing roll
n(51.95, 'cellos_pizz', 'G2', 1.2, 0.55, 0.0); n(51.95, 'contrabass_pizz', 'G1', 1.2, 0.5, 0.0)   # last low pluck on the last letter

# roundel "tings" as each ring is scribed, a low pluck as it lands
for e in EV:
    if e['type'] == 'scribe':
        n(e['t'], 'violin_pizz', 'D6' if e['t'] < 30 else 'G6', 0.6, 0.45, 0.3)
        n(e['t'] + 0.7, 'cellos_pizz', 'G2', 0.8, 0.4, -0.1)

# her full-screen sections: soft cello pizzicato on the bar's first and third beats
def pizz_bed(t0, t1, vel=0.3):
    t = np.ceil(t0 / (BEAT * 2)) * (BEAT * 2)
    while t < t1 - 0.2:
        bass, ch = chord_at(t)
        n(t, 'cellos_pizz', bass, 0.9, vel, -0.15)
        if int(t / BEAT) % 4 == 2: n(t + BEAT, 'violas_pizz', ch[1], 0.6, vel * 0.8, 0.2)
        t += BEAT * 2
for a, b in [(6.45, 10.85), (16.55, 17.55), (24.45, 36.6), (41.4, 49.0)]:
    pizz_bed(a, b)

# the reveal: silence 37.0–37.3, a rising pizz figure as the roundel grows, then the first bowed notes on "everything"
T_EVERY = 39.76
for i, p in enumerate(['G4', 'A4', 'B4', 'D5', 'E5', 'G5']):
    n(38.3 + i * 0.13, 'violins_pizz', p, 0.4, 0.38, 0.2)
for inst, ps, v in [('cellos', ['G2', 'D3'], 0.42), ('violas', ['B3', 'D4'], 0.36), ('violins', ['G4', 'B4', 'D5'], 0.32)]:
    for p in ps: ev.append({'t': T_EVERY, 'inst': inst, 'pitch': p, 'dur': 3.8, 'vel': v, 'pan': 0.0, 'attack': 0.45, 'release': 1.6})
for inst, ps, v in [('cellos', ['C3', 'G3'], 0.34), ('violins', ['E4', 'G4', 'C5'], 0.26)]:    # IV → I, very soft, under her question
    for p in ps: ev.append({'t': 43.6, 'inst': inst, 'pitch': p, 'dur': 2.6, 'vel': v, 'pan': 0.0, 'attack': 0.8, 'release': 1.4})
for inst, ps, v in [('cellos', ['G2', 'D3'], 0.32), ('violins', ['D4', 'G4', 'B4'], 0.24)]:
    for p in ps: ev.append({'t': 46.4, 'inst': inst, 'pitch': p, 'dur': 3.2, 'vel': v, 'pan': 0.0, 'attack': 0.8, 'release': 1.8})

music = S.render(ev, dur=DUR, master=False)
music = S.room(music, size=0.32, mix=0.18)
# true silence before the reveal and the gentle lift-out at the very end
def gate(x, a, b, fade=0.04):
    i0, i1, f = int(a * SR), int(b * SR), int(fade * SR)
    x[i0:i1] = 0; x[max(0, i0 - f):i0] *= np.linspace(1, 0, min(f, i0))[:, None]
gate(music, 37.0, 37.3)
music *= np.clip((DUR - np.arange(len(music)) / SR) / 0.6, 0, 1)[:, None]

# ---------------- foley ----------------
L = int(DUR * SR); fol = np.zeros((L, 2), np.float32)
def put(x, t, g=1.0, pan=0.0):
    i = int(t * SR); x = np.asarray(x, np.float32)
    j = min(L, i + len(x))
    if j <= i: return
    l, r = (1 - pan) * 0.5 ** 0.5 * 1.41, (1 + pan) * 0.5 ** 0.5 * 1.41
    fol[i:j, 0] += x[:j - i] * g * min(1, l); fol[i:j, 1] += x[:j - i] * g * min(1, r)
rng = np.random.default_rng(4)
def burin(d, density=1.0):
    """band-passed hiss with chatter and a faint plate ring, as lines are cut"""
    x = sfx.bp(sfx.noise(d), 2600, 9000) * 0.35
    ch = np.zeros_like(x)
    for k in rng.uniform(0, d, int(18 * d * density)): i = int(k * SR); ch[i:i + 90] += rng.uniform(0.3, 1) * np.exp(-np.arange(min(90, len(ch) - i)) / 18)
    x = x + sfx.bp(ch, 3000, 8000) * 0.8
    tt = sfx.t_(d); ring = sum(np.sin(2 * np.pi * f * tt) for f in (1180, 2310, 3470)) * 0.015
    env = np.minimum(1, tt / 0.05) * np.minimum(1, (d - tt) / 0.12)
    return (x + ring) * env
def tick(): x = sfx.hp(sfx.noise(0.012), 3000) * sfx.env_exp(0.012, 0.002); return x
def letters(t, d):
    for k in np.arange(0, d, 0.07): put(tick(), t + k + rng.uniform(0, 0.02), 0.22)
def scribe(t):
    d = 0.42; x = sfx.bp(sfx.noise(d), 3500, 9500) * (0.5 + 0.5 * np.sin(2 * np.pi * 9 * sfx.t_(d))) * np.minimum(1, (d - sfx.t_(d)) / 0.08)
    put(x, t, 0.22, 0.2)
def burnish(t, d): put(sfx.lp(sfx.noise(d), 1200) * (0.6 + 0.4 * np.sin(2 * np.pi * 5 * sfx.t_(d))) * np.minimum(1, (d - sfx.t_(d)) / 0.1), t, 0.12)
def pen(t, d):
    for k in np.arange(0, d, 0.24): put(sfx.bp(sfx.noise(0.16), 2000, 6000) * np.hanning(int(0.16 * SR) + 0)[:int(round(0.16 * SR))], t + k, 0.16)
def water(t):
    tt = sfx.t_(0.18); f = 900 + 1600 * np.exp(-tt / 0.03); x = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-tt / 0.05)
    put(x, t, 0.18); put(sfx.bp(sfx.noise(0.5), 400, 3000) * sfx.env_exp(0.5, 0.18), t + 0.08, 0.07)
def tissue(t):
    d = 0.55; x = sfx.bp(sfx.noise(d), 1500, 8000) * (np.abs(sfx.noise(d)) > 1.4) * 0.8 + sfx.bp(sfx.noise(d), 600, 3000) * 0.25
    put(x * np.hanning(len(x)), t - 0.08, 0.2)
def peel(t):
    d = 0.5; cr = sfx.hp(sfx.noise(d), 1800) * (rng.random(int(round(d * SR))) > 0.985) * 3
    put((cr + sfx.bp(sfx.noise(d), 500, 2500) * 0.3) * np.linspace(0.3, 1, int(round(d * SR))), t, 0.2, 0.3)

for e in EV:
    ty, t = e['type'], e['t']
    if ty == 'letters': letters(t, e.get('dur', 1.0))
    elif ty == 'scribe': scribe(t)
    elif ty in ('cut', 'hatch'): put(burin(e.get('dur', 1.0), 1.6 if ty == 'hatch' else 1.0), t, 0.16 if ty == 'hatch' else 0.13, -0.1)
    elif ty == 'burnish': burnish(t, e.get('dur', 0.6))
    elif ty == 'script': pen(t, e.get('dur', 0.8))
    elif ty == 'water': water(t)
    elif ty == 'thump': put(sfx.thump(0.8, 65), t, 0.35)
    elif ty == 'loupe': put(sfx.whoosh(0.5, 0.6), t - 0.1, 0.08)
for t in TISSUE: tissue(t)
for t in PEEL: peel(t)
# room: a quiet workroom with a faint clock under the plates, nothing under her
room = np.zeros(L, np.float32)
for a, b in PLATES:
    i0, i1 = int(a * SR), int(min(b, DUR) * SR)
    room[i0:i1] += sfx.lp(sfx.noise((i1 - i0) / SR), 500) * 0.012
    for k in np.arange(a + 0.3, b, 1.0): j = int(k * SR); room[j:j + 300] += sfx.hp(sfx.noise(300 / SR), 2500) * np.exp(-np.arange(300) / 50) * 0.04
fol += room[:, None]
fol[int(37.0 * SR):int(37.3 * SR)] *= 0.15   # the silence before "hold": one small sound at most

# ---------------- duck under her voice ----------------
d = json.load(open(os.path.join(HERE, '..', 'interviews', 'src', 'data', 'detail.json')))
src = os.path.join(os.environ['MEDIA'], d['clip'] + '.mp4')
voice = np.zeros(L, np.float32)
for s in d['segments']:
    raw = subprocess.run(['ffmpeg', '-v', 'error', '-ss', str(s['a']), '-to', str(s['b']), '-i', src, '-ac', '1', '-ar', str(SR), '-f', 'f32le', '-'], capture_output=True).stdout
    x = np.frombuffer(raw, np.float32); i = int(s['o'] * SR); j = min(L, i + len(x)); voice[i:j] = x[:j - i]
win = int(0.05 * SR); envv = np.sqrt(np.convolve(voice ** 2, np.ones(win) / win, 'same'))
speech = np.clip((20 * np.log10(envv + 1e-6) + 42) / 10, 0, 1)            # 0 = silence, 1 = speaking
k = int(0.25 * SR); speech = np.convolve(speech, np.ones(k) / k, 'same')    # smooth attack / release
duck = 1 - 0.5 * speech                                                    # music about half under speech (STYLE.md §7)
music = music[:L] * duck[:, None]

bed = music * 0.55 + fol
peak = np.abs(bed).max(); bed = bed / max(1.0, peak / 0.89)
os.makedirs(os.path.join(HERE, 'out'), exist_ok=True)
sf.write(os.path.join(HERE, 'out', 's4_bed.wav'), bed.astype(np.float32), SR, subtype='PCM_24')
sf.write(os.path.join(HERE, 'out', 's4_voice_ref.wav'), voice, SR, subtype='PCM_16')
open(os.path.join(HERE, 'CREDITS_music.txt'), 'w').write('\n'.join(S.credits(['harpsichord', 'cellos_pizz', 'violins_pizz', 'violin_pizz', 'violas_pizz', 'contrabass_pizz', 'cellos', 'violas', 'violins'])) + '\n')
print('bed', round(len(bed) / SR, 2), 's, peak', round(float(np.abs(bed).max()), 3))
