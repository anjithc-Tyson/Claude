"""Edit plan for the Bold Claim script in the reference's influencer style (green-screen over B-roll).

usage: build_infl.py WORDS.json VIDEO_DIR OUT.json

Natural speed. Only pauses longer than GAP are cut. B-roll beats are pinned to words: from the first word to the
last word of each beat the picture is full-screen product footage with her cut-out in the lower corner.
"""
import json
import os
import sys

import cv2

GAP = 0.5
PAD_IN, PAD_OUT = 0.08, 0.16

# clip, [(first word, last word, media, fit)] ; fit 'cover' crops to fill, 'fit' shows landscape full width over a blur
PLAN = [
    ('20261101_144048', []),
    ('20261102_092812', [('warm', 'memory', 'stock/34611.mp4', 'fit'), ('that', 'heirloom', 'stock/50784.mp4', 'cover')]),
    ('20261102_093527', [('classic', 'versatile', 'stock/5180.mp4', 'fit'), ('modern', 'strength', 'stock/5220.mp4', 'cover'),
                         ('finish', 'style', 'img:infl/platinum_hand.jpg', 'cover')]),
    ('20261102_094354', [('diamond', 'timeless', 'stock/20877.mp4', 'fit'), ('sapphire', 'color', 'img:infl/sapphire.jpg', 'cover'),
                         ('gem', 'understand', 'stock/2567.mp4', 'cover')]),
    ('20261102_094844', [('name', 'name', 'img:infl/engrave.jpg', 'cover'), ('memory', 'milestone', 'img:infl/note.jpg', 'cover'),
                         ('feeling', 'close', 'stock/51260.mp4', 'cover')]),
    ('20261102_101733', [('blank', 'canvas', 'img:infl/sketch.jpg', 'cover'), ('piece', 'you', 'img:infl/box.jpg', 'cover')]),
    ('20261102_103613', []),
]
FIX = {'peace': 'piece', 'Tuxilla': 'takshila.co', '.com': None, 'Starts': 'Start'}
KEY = {'metal', 'stone', 'meaning', 'gold', 'silver', 'platinum', 'diamond', 'sapphire', 'gem', 'name', 'memory', 'milestone',
       'feeling', 'story', 'canvas', 'takshila.co', 'kind', 'heirloom'}


def norm(w):
    return ''.join(c for c in w.lower() if c.isalnum() or c == '.')


def main(words_path, vdir, out):
    W = json.load(open(words_path))
    segs, words, broll = [], [], []
    o = 0.0
    for clip, beats in PLAN:
        ws = W[clip]
        dur = cv2.VideoCapture(os.path.join(vdir, clip + '.mp4')).get(cv2.CAP_PROP_FRAME_COUNT) / 30
        groups, cur = [], [ws[0]]
        for w in ws[1:]:
            (groups.append(cur), cur := [w]) if w['s'] - cur[-1]['e'] > GAP else cur.append(w)
        groups.append(cur)
        src2out = []  # (src a, src b, out o) for this clip
        for g in groups:
            a, b = max(0.0, g[0]['s'] - PAD_IN), min(dur - 0.05, g[-1]['e'] + PAD_OUT)
            segs.append({'clip': clip, 'a': round(a, 3), 'b': round(b, 3), 'o': round(o, 3)})
            src2out.append((a, b, o))
            o += b - a
        to_out = lambda t: next((oo + t - a for a, b, oo in src2out if a - 1e-6 <= t <= b + 1e-6), None)
        clip_words = []
        for w in ws:
            raw = w['w']
            base = raw.rstrip(',.?!') or raw
            if base in FIX and FIX[base] is None:
                continue
            text = FIX[base] + raw[len(base):] if base in FIX else raw
            t, e = to_out(w['s']), to_out(min(w['e'], w['s'] + 1.2))
            if t is None:
                continue
            item = {'w': text, 't': round(t, 3), 'e': round(e if e is not None else t + 0.3, 3), 'key': norm(text).strip('.') in KEY}
            words.append(item)
            clip_words.append((norm(raw), item))
        k = 0
        for first, last, media, fit in beats:
            i = next(j for j in range(k, len(clip_words)) if clip_words[j][0].startswith(first))
            jl = next(j for j in range(i, len(clip_words)) if clip_words[j][0].startswith(last))
            k = jl + 1
            t0 = clip_words[i][1]['t'] - 0.12
            t1 = clip_words[jl][1]['e'] + 0.18
            broll.append({'t': round(t0, 3), 'e': round(t1, 3), 'media': media, 'fit': fit})
    total = round(o, 3)
    # neighbouring beats meet cleanly (no flash of her between two products)
    for x, y in zip(broll, broll[1:]):
        if 0 < y['t'] - x['e'] < 0.45:
            x['e'] = y['t']
    data = {'total': total, 'segments': segs, 'words': words, 'broll': broll,
            'noCutout': ['20261102_094354'],
            'cta': {'t': next(w['t'] for w in words if w['w'].startswith('takshila')), 'text': 'takshila.co'}}
    json.dump(data, open(out, 'w'), indent=1)
    print('total', total, 'segments', len(segs), 'words', len(words), 'broll', len(broll),
          'broll share', round(sum(b['e'] - b['t'] for b in broll) / total, 2))
    for b in broll:
        print(' ', b['t'], b['e'], b['media'])


if __name__ == '__main__':
    main(*sys.argv[1:4])
