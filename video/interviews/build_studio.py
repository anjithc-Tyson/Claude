"""Edit plan for script 2 ("What would your perfect piece look like…") as a live Takshila design-studio walkthrough.

usage: build_studio.py WORDS.json VIDEO_DIR OUT.json

She talks in the top half; the bottom half is the takshila.co Design Studio, whose state changes on her words.
Pauses over GAP are cut; slow takes are sped up gently (max MAX_RATE) so the pace stays even across takes.
"""
import json
import os
import sys

import cv2

GAP = 0.5
PAD_IN, PAD_OUT = 0.08, 0.16
TARGET_CPS = 10.2
MAX_RATE = 1.10
CLIPS = ['20261102_172933', '20261102_173618', '20261102_174036', '20261102_174505', '20261102_174753']
TAKE_END = {'20261102_173618': 13.9}          # cut the "Yay! High five!" after "understand"
FIX = {'Taxula': 'takshila.co', 'Taxila': 'takshila.co', '.co': None, 'words': 'to wear it'}
FIX_AT = {('20261102_174036', 5.02): 'Gold,'}  # she says gold; the transcript heard "Stone"
KEY = {'perfect', 'piece', 'canvas', 'shape', 'stone', 'story', 'symbol', 'detail', 'gold', 'silver', 'platinum',
       'design', 'proportions', 'yours', 'life', 'takshila.co'}

# studio events on her words: (clip, word, event, payload)
EVENTS = [
    ('20261102_172933', 'What', 'describe', None),
    ('20261102_173618', 'shape', 'idea', {'chip': 'A shape I love', 'text': 'An oval ring', 'img': 'P02'}),
    ('20261102_173618', 'stone', 'idea', {'chip': 'A stone with a story', 'text': ' with my grandmother\'s sapphire', 'img': 'P03'}),
    ('20261102_173618', 'symbol', 'idea', {'chip': 'A symbol', 'text': ', a tiny moon inside', 'img': 'P04'}),
    ('20261102_173618', 'detail', 'idea', {'chip': 'A hidden detail', 'text': ' and a hidden heart', 'img': 'P05'}),
    ('20261102_174036', 'foundation', 'generate', None),
    ('20261102_174036', 'Stone', 'metal', {'metal': 'Gold', 'img': 'P06'}),
    ('20261102_174036', 'silver', 'metal', {'metal': 'Silver', 'img': 'P07'}),
    ('20261102_174036', 'platinum', 'metal', {'metal': 'Platinum', 'img': 'P08'}),
    ('20261102_174036', 'stone', 'stone', {'stone': 'Sapphire', 'img': 'P09'}),
    ('20261102_174036', 'details', 'detail', {'detail': 'Pavé band', 'img': 'P10'}),
    ('20261102_174505', 'turn', 'direct', {'imgs': ['P10', 'P13', 'P14'], 'pick': 0}),
    ('20261102_174505', 'refine', 'refine', {'img': 'P11'}),
    ('20261102_174505', 'every', 'worn', {'img': 'P12'}),
    ('20261102_174753', 'Tell', 'final', {'sketch': 'P02', 'img': 'P11'}),
]


def norm(w):
    return ''.join(c for c in w.lower() if c.isalnum() or c == '.')


def main(words_path, vdir, out):
    W = json.load(open(words_path))
    segs, words, events, rates = [], [], [], {}
    o = 0.0
    for clip in CLIPS:
        ws = [w for w in W[clip] if w['s'] < TAKE_END.get(clip, 1e9)]
        dur = cv2.VideoCapture(os.path.join(vdir, clip + '.mp4')).get(cv2.CAP_PROP_FRAME_COUNT) / 30
        groups, cur = [], [ws[0]]
        for w in ws[1:]:
            if w['s'] - cur[-1]['e'] > GAP:
                groups.append(cur)
                cur = [w]
            else:
                cur.append(w)
        groups.append(cur)
        spans = [(max(0.0, g[0]['s'] - PAD_IN), min(dur - 0.05, TAKE_END.get(clip, 1e9), g[-1]['e'] + PAD_OUT)) for g in groups]
        cps = sum(len(w['w']) for w in ws) / sum(b - a for a, b in spans)
        rate = round(min(MAX_RATE, max(1.0, TARGET_CPS / cps)), 3) if cps < TARGET_CPS * 0.95 else 1.0
        rates[clip] = (round(cps, 1), rate)
        src2out = []
        for a, b in spans:
            segs.append({'clip': clip, 'a': round(a, 3), 'b': round(b, 3), 'o': round(o, 3), 'rate': rate})
            src2out.append((a, b, o))
            o += (b - a) / rate
        to_out = lambda t: next((oo + (t - a) / rate for a, b, oo in src2out if a - 1e-6 <= t <= b + 1e-6), None)
        clip_words = []
        for w in ws:
            raw = w['w']
            base = raw.rstrip(',.?!') or raw
            if (clip, w['s']) in FIX_AT:
                text = FIX_AT[(clip, w['s'])]
            elif base in FIX:
                if FIX[base] is None:
                    continue
                text = FIX[base] + raw[len(base):]
            else:
                text = raw
            t, e = to_out(w['s']), to_out(min(w['e'], w['s'] + 1.2))
            if t is None:
                continue
            item = {'w': text, 't': round(t, 3), 'e': round(e if e is not None else t + 0.3, 3), 'key': norm(text).strip('.') in KEY}
            words.append(item)
            clip_words.append((raw.strip(',.?!'), item))
        k = 0
        for c, word, ev, payload in EVENTS:
            if c != clip:
                continue
            j = next(j for j in range(k, len(clip_words)) if clip_words[j][0] == word)
            k = j + 1
            events.append({'t': round(clip_words[j][1]['t'] - 0.05, 3), 'ev': ev, **(payload or {})})
    total = round(o, 3)
    data = {'total': total, 'segments': segs, 'words': words, 'events': events,
            'hookEnd': round(next(s['o'] for s in segs if s['clip'] == CLIPS[1]), 3),
            'cta': {'t': next(w['t'] for w in words if w['w'].startswith('Tell')), 'text': 'takshila.co'},
            'music': {'file': 'p5/parampampam.mp3', 'start': 27.0, 'vol': 0.16},
            'images': {k: f'studio2/{k}.jpg' for k in ['P02', 'P03', 'P04', 'P05', 'P06', 'P07', 'P08', 'P09', 'P10', 'P11', 'P12', 'P13', 'P14']}}
    json.dump(data, open(out, 'w'), indent=1)
    print('pace (cps, rate)', rates)
    print('total', total, 'segments', len(segs), 'words', len(words), 'events', len(events))
    for e in events:
        print(' ', e['t'], e['ev'], {k: v for k, v in e.items() if k not in ('t', 'ev')})


if __name__ == '__main__':
    main(*sys.argv[1:4])
