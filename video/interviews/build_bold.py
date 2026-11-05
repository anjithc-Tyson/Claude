"""Edit plan for the 'Bold Claim' script (Takshila Content Feasibility Analysis, script 1).

usage: build_bold.py WORDS.json VIDEO_DIR OUT.json

One clip per script section, in script order. Pauses longer than GAP inside a take become jump cuts
(alternating 1.0 / 1.08 zoom on her face). Product cards land on the words that name them.
"""
import json
import os
import statistics
import sys

import cv2

GAP = 0.22      # longer silences are cut
PAD_IN, PAD_OUT = 0.05, 0.09
RATE = 1.12     # whole edit plays slightly fast (pitch kept)

# clip, on-screen title (number, text), cards (word, image, label, kind)
PLAN = [
    ('20261101_144048', ('', 'Designed around your story'),
     [('metal', 'bold/gold.jpg', 'The metal', 'flash'), ('stone', 'bold/diamond.jpg', 'The stone', 'flash'),
      ('meaning', 'bold/sketch.jpg', 'The meaning', 'flash')]),
    ('20261102_092812', ('01', 'Choose the metal'), [('gold', 'bold/gold.jpg', 'Warm gold', 'card')]),
    ('20261102_093527', None, [('silver', 'bold/silver.jpg', 'Classic silver', 'card'),
                               ('platinum', 'bold/platinum.jpg', 'Modern platinum', 'card')]),
    ('20261102_094354', ('02', 'Choose the stone'),
     [('diamond', 'bold/diamond.jpg', 'Diamond, for something timeless', 'stone'),
      ('sapphire', 'bold/sapphire.jpg', 'Sapphire, for colour', 'stone'),
      ('gem', 'bold/gems.jpg', 'A gem with a meaning', 'stone')]),
    ('20261102_094844', ('03', 'Add the meaning'),
     [('name', None, 'A name', 'chip'), ('memory', None, 'A memory', 'chip'),
      ('milestone', None, 'A milestone', 'chip'), ('feeling', None, 'A feeling', 'chip')]),
    ('20261102_101733', ('', 'From your idea to your piece'),
     [('canvas', 'bold/sketch.jpg', 'A blank canvas', 'card'), ('piece', 'street_ring_full.jpg', 'Only yours', 'reveal'),
      ('detail', 'bold/wax.jpg', 'Every detail, shaped', 'card')]),
    ('20261102_103613', ('', 'Start your custom design'), []),
]
FIX = {'peace': 'piece', 'Tuxilla': 'takshila.co', '.com': None, 'Starts': 'Start'}
KEY = {'metal', 'stone', 'meaning', 'gold', 'silver', 'platinum', 'diamond', 'sapphire', 'gem', 'name', 'memory',
       'milestone', 'feeling', 'story', 'canvas', 'takshila.co', 'kind', 'you', 'piece', 'yours'}
YUNET = os.path.expanduser('~/.claude/skills/effects/models/yunet.onnx')


def norm(w):
    return ''.join(c for c in w.lower() if c.isalnum() or c == '.')


def face_of(path):
    cap = cv2.VideoCapture(path)
    n = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
    det = cv2.FaceDetectorYN.create(YUNET, '', (1080, 1920), 0.7)
    pts = []
    for k in range(8):
        cap.set(cv2.CAP_PROP_POS_FRAMES, int(n * (k + 0.5) / 8))
        ok, fr = cap.read()
        if not ok:
            continue
        _, f = det.detect(fr)
        if f is not None and len(f):
            f = max(f, key=lambda x: x[2])
            pts.append((f[0] + f[2] / 2, f[1] + f[3] / 2))
    return [round(statistics.median(p[i] for p in pts)) for i in range(2)] if pts else [540, 800]


def main(words_path, vdir, out):
    W = json.load(open(words_path))
    segs, words, cards, titles = [], [], [], []
    o = 0.0
    for clip, title, plan_cards in PLAN:
        ws = W[clip]
        dur = float(cv2.VideoCapture(os.path.join(vdir, clip + '.mp4')).get(cv2.CAP_PROP_FRAME_COUNT)) / 30
        groups, cur = [], [ws[0]]
        for w in ws[1:]:
            if w['s'] - cur[-1]['e'] > GAP:
                groups.append(cur)
                cur = [w]
            else:
                cur.append(w)
        groups.append(cur)
        fx, fy = face_of(os.path.join(vdir, clip + '.mp4'))
        clip_o = o
        for gi, g in enumerate(groups):
            a = max(0.0, g[0]['s'] - PAD_IN)
            b = min(dur - 0.05, g[-1]['e'] + PAD_OUT)
            segs.append({'clip': clip, 'a': round(a, 3), 'b': round(b, 3), 'o': round(o, 3), 'zoom': 1.0 if gi % 2 == 0 else 1.08,
                         'fx': fx, 'fy': fy, 'first': gi == 0})
            for w in g:
                raw = w['w']
                base = raw.rstrip(',.?!') or raw
                if base in FIX:
                    if FIX[base] is None:
                        continue
                    text = FIX[base] + raw[len(base):]
                else:
                    text = raw
                t = o + (w['s'] - a) / RATE
                words.append({'w': text, 't': round(t, 3), 'e': round(o + (min(w['e'], b) - a) / RATE, 3),
                              'key': norm(text).strip('.') in KEY, 'end': text[-1:] in '.,?!'})
            o += (b - a) / RATE
        if title:
            titles.append({'t': round(clip_o + 0.05, 3), 'num': title[0], 'text': title[1], 'dur': 2.6})
        # cards on the words that name them
        clip_words = [w for w in words if w['t'] >= clip_o - 1e-6]
        for word, img, label, kind in plan_cards:
            m = next((w for w in clip_words if norm(w['w']).startswith(word)), None)
            if m:
                cards.append({'t': m['t'], 'img': img, 'label': label, 'kind': kind})
    total = round(o, 3)
    # each card holds until the next card in its section, within limits
    for i, c in enumerate(cards):
        nxt = cards[i + 1]['t'] if i + 1 < len(cards) else total
        lim = {'flash': 1.05, 'card': 1.6, 'stone': 1.7, 'reveal': 2.0, 'chip': 99}[c['kind']]
        c['dur'] = round(max(0.5, min(lim, nxt - c['t'] - 0.02)), 3)
    chips = [c for c in cards if c['kind'] == 'chip']
    for c in chips:  # the meaning chips stay up together until the section ends
        c['dur'] = round(chips[-1]['t'] + 2.2 - c['t'], 3)
    data = {'total': total, 'segments': segs, 'words': words, 'cards': cards, 'titles': titles,
            'rate': RATE, 'music': {'file': 'p4/starwalk.mp3', 'start': 104.72}}
    json.dump(data, open(out, 'w'), indent=1)
    print('total', total, 'segments', len(segs), 'words', len(words))
    for c in cards:
        print(' card', c['t'], c['dur'], c['label'])
    for t in titles:
        print(' title', t['t'], t['text'])


if __name__ == '__main__':
    main(*sys.argv[1:4])
