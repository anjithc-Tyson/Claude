"""Assemble a realistic typing run from single real-key takes. usage: typing_run.py OUT.wav SECONDS keys..."""
import sys, random, numpy as np, soundfile as sf
out, dur, keys = sys.argv[1], float(sys.argv[2]), sys.argv[3:]
takes = [sf.read(k, always_2d=True) for k in keys]
sr = takes[0][1]
buf = np.zeros((int(sr * dur) + sr, 2)); rng = random.Random(7); t = 0.02
while t < dur - 0.25:
    x, _ = takes[rng.randrange(len(takes))]
    if x.shape[1] == 1: x = np.repeat(x, 2, 1)
    i = int(t * sr); g = 10 ** (rng.uniform(-4, 0) / 20)
    buf[i:i + len(x)] += x[:len(buf) - i] * g
    t += rng.choice([0.08, 0.09, 0.1, 0.11, 0.12, 0.14, 0.16, 0.18]) + (0.22 if rng.random() < 0.12 else 0)  # word gaps
buf = buf[:int(sr * dur)]; buf *= 0.89 / (np.abs(buf).max() + 1e-9)
fade = int(0.05 * sr); buf[-fade:] *= np.linspace(1, 0, fade)[:, None]
sf.write(out, buf, sr)
