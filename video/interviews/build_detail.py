"""Edit plan for script 4 ("The finished piece is beautiful. But this is the detail that makes it personal.") as a locked-detail reveal.

usage: build_detail.py WORDS.json VIDEO.mp4 OUT.json

One take. The first read of the 'custom jewellery is different' line and the 'No.' stumble are dropped, pauses over GAP are cut, the take is sped up gently if it runs slow (max MAX_RATE),
and the tracker steps are pinned to her words.
"""
import json
import sys

import cv2

GAP = 0.5
PAD_IN, PAD_OUT = 0.08, 0.16
TARGET_CPS = 10.2
MAX_RATE = 1.10
DROP = [(32.5, 47.9),                        # first read of "That is what makes custom jewellery different…"
        (61.6, 69.7)]                        # "What detail would you bring to perfect piece? No."
FIX = {'costume': 'custom', 'Takshila': 'takshila.co', 'Darko': None}
FIX_AT = {}
KEY = {'finished', 'beautiful', 'detail', 'personal', 'template', 'person', 'moment', 'carry', 'design', 'metal', 'proportions',
       'theirs', 'custom', 'different', 'everything', 'takshila.co', 'perfect', 'piece'}
# (word, not before source time, event, payload)
EVENTS = [
    ('detail', 4.0, 'lock', {}),
    ('person,', 12.5, 'pin', {'n': 0, 'label': 'The person'}),
    ('moment', 14.0, 'pin', {'n': 1, 'label': 'The moment'}),
    ('carry', 16.0, 'pin', {'n': 2, 'label': 'What they carry'}),
    ('metal,', 22.0, 'spec', {'label': 'Metal'}),
    ('proportions', 23.0, 'spec', {'label': 'Proportions'}),
    ('theirs.', 30.0, 'spec', {'label': 'Completely theirs'}),
    ('hold', 57.0, 'unlock', {'img': 'D2'}),
    ('Takshila', 69.0, 'question', {}),
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
        m = next(w for w in ws if w['w'] in (word, word.strip(',.?!')) or w['w'].strip(',.?!') == word.strip(',.?!')) and False or next(w for w in ws if w['w'].strip(',.?!') == word.strip(',.?!') and w['s'] >= after)
        events.append({'t': round(to_out(m['s']) - 0.05, 3), 'ev': ev, **payload})
    total = round(o, 3)
    data = {'clip': video.split('/')[-1][:-4], 'total': total, 'segments': segs, 'words': words, 'events': events,
            'music': {'file': 'p5/parampampam.mp3', 'start': 27.0, 'vol': 0.11},
            'placeholders': True,
            'images': {k: f'detail/{k}.jpg' for k in ['D1', 'D2', 'D3']}}
    json.dump(data, open(out, 'w'), indent=1)
    print('cps', round(cps, 1), 'rate', rate, 'total', total, 'segments', len(segs), 'words', len(words))
    print(' '.join(w['w'] for w in words))
    for e in events:
        print(' ', e['t'], e['ev'], {k: v for k, v in e.items() if k not in ('t', 'ev')})


if __name__ == '__main__':
    main(*sys.argv[1:4])
