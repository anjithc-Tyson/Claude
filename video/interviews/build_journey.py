"""Edit plan for script 3 ("This is how a blank canvas becomes a custom piece…") as a journey-tracker edit.

usage: build_journey.py WORDS.json VIDEO.mp4 OUT.json

One take. The stumble is dropped, pauses over GAP are cut, the take is sped up gently if it runs slow (max MAX_RATE),
and the tracker steps are pinned to her words.
"""
import json
import sys

import cv2

GAP = 0.5
PAD_IN, PAD_OUT = 0.08, 0.16
TARGET_CPS = 10.2
MAX_RATE = 1.10
DROP = [(17.0, 19.45)]                      # "Together we choose… no…" before the clean restart
FIX = {'texture': 'takshila.co', '.co': None, 'sit': 'set,', 'shape': 'shape,'}
FIX_AT = {15.64: 'years.'}                  # "imagined for years" (heard as "yours")
KEY = {'blank', 'canvas', 'custom', 'idea', 'stone', 'date', 'design', 'metal', 'details', 'shape', 'set', 'polish',
       'refine', 'life', 'piece', 'you', 'forever', 'takshila.co'}
# (word, not before source time, event, payload)
EVENTS = [
    ('idea', 7.0, 'step', {'step': 0}),
    ('stone', 9.0, 'thumb', {'img': 'J01', 'label': 'A meaningful stone'}),
    ('date', 11.0, 'thumb', {'img': 'J02', 'label': 'A special date'}),
    ('design', 12.0, 'thumb', {'img': 'J03', 'label': 'Your design'}),
    ('together', 19.0, 'step', {'step': 1}),
    ('metal', 23.0, 'thumb', {'img': 'J04', 'label': 'Metal'}),
    ('stone', 25.0, 'thumb', {'img': 'J05', 'label': 'Stone'}),
    ('details', 26.0, 'thumb', {'img': 'J06', 'label': 'Details'}),
    ('then', 30.0, 'step', {'step': 2}),
    ('shape', 31.0, 'thumb', {'img': 'J07', 'label': 'Shape'}),
    ('sit', 32.0, 'thumb', {'img': 'J08', 'label': 'Set'}),
    ('polish', 33.0, 'thumb', {'img': 'J09', 'label': 'Polish'}),
    ('refine', 34.0, 'refine', {}),
    ('What', 39.0, 'step', {'step': 3}),
    ('piece', 42.0, 'reveal', {'img': 'J10'}),
    ('Bring', 46.0, 'cta', {}),
]


def norm(w):
    return ''.join(c for c in w.lower() if c.isalnum() or c == '.')


def main(words_path, video, out):
    ws = list(json.load(open(words_path)).values())[0]
    ws = [w for w in ws if not any(a <= w['s'] < b for a, b in DROP)]
    dur = cv2.VideoCapture(video).get(cv2.CAP_PROP_FRAME_COUNT) / 30
    groups, cur = [], [ws[0]]
    for w in ws[1:]:
        if w['s'] - cur[-1]['e'] > GAP or any(cur[-1]['e'] <= a < w['s'] for a, _ in DROP):
            groups.append(cur)
            cur = [w]
        else:
            cur.append(w)
    groups.append(cur)
    spans = [(max(0.0, g[0]['s'] - PAD_IN), min(dur - 0.05, g[-1]['e'] + PAD_OUT)) for g in groups]
    cps = sum(len(w['w']) for w in ws) / sum(b - a for a, b in spans)
    rate = round(min(MAX_RATE, max(1.0, TARGET_CPS / cps)), 3) if cps < TARGET_CPS * 0.95 else 1.0
    segs, src2out, o = [], [], 0.0
    for a, b in spans:
        segs.append({'a': round(a, 3), 'b': round(b, 3), 'o': round(o, 3), 'rate': rate})
        src2out.append((a, b, o))
        o += (b - a) / rate
    to_out = lambda t: next((oo + (t - a) / rate for a, b, oo in src2out if a - 1e-6 <= t <= b + 1e-6), None)
    words = []
    for w in ws:
        raw = w['w']
        base = raw.rstrip(',.?!') or raw
        if w['s'] in FIX_AT:
            text = FIX_AT[w['s']]
        elif base in FIX:
            if FIX[base] is None:
                continue
            text = FIX[base] + raw[len(base):]
        else:
            text = raw
        t, e = to_out(w['s']), to_out(min(w['e'], w['s'] + 1.2))
        if t is None:
            continue
        words.append({'w': text, 't': round(t, 3), 'e': round(e if e is not None else t + 0.3, 3), 'key': norm(text).strip('.,') in KEY})
    events = []
    for word, after, ev, payload in EVENTS:
        m = next(w for w in ws if w['w'].strip(',.?!') == word and w['s'] >= after)
        events.append({'t': round(to_out(m['s']) - 0.05, 3), 'ev': ev, **payload})
    total = round(o, 3)
    data = {'clip': video.split('/')[-1][:-4], 'total': total, 'segments': segs, 'words': words, 'events': events,
            'music': {'file': 'p5/parampampam.mp3', 'start': 27.0, 'vol': 0.11},
            'placeholders': False,
            'images': {f'J{k:02d}': f'journey/J{k:02d}.jpg' for k in range(1, 12)}}
    json.dump(data, open(out, 'w'), indent=1)
    print('cps', round(cps, 1), 'rate', rate, 'total', total, 'segments', len(segs), 'words', len(words))
    print(' '.join(w['w'] for w in words))
    for e in events:
        print(' ', e['t'], e['ev'], {k: v for k, v in e.items() if k not in ('t', 'ev')})


if __name__ == '__main__':
    main(*sys.argv[1:4])
