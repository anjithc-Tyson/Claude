"""Edit plans for the two Takshila street interviews -> src/data/<name>.json

Order: text-question hook, rapid-fire, dream jewellery (product image pop-ups), the designing, the reveal, close.
Framing stays fixed and centred (no punch-ins). Captions are 1-3 word phrases with one highlighted word.
usage: build_edl.py street|jewel words.json out.json
"""
import json, re, sys

MAX_GAP, PAD_IN, PAD_OUT = 0.42, 0.08, 0.12
P = {
    'street': {
        'hook': ['Would you design', 'your own ring?'],
        'music': {'file': 'music/street.mp3', 'start': 10.77, 'credit': '"Other Dimension (Chill Pill Mix)" by Mazelo Nostra, CC BY-SA 3.0'},
        'clips': [  # (src_a, src_b, chapter, overlay)
            (114.20, 119.76, 'RAPID FIRE', None),          # off the shelf or your own design?
            (121.90, 126.02, None, None),                  # I think on the shelf... because I can already try it
            (127.35, 130.55, None, None),                  # mass produced or one-on-one?
            (132.85, 134.10, None, None),                  # maybe a one-on-one
            (11.78, 13.88, 'HER DREAM PIECE', None),       # what does your dream jewellery look like?
            (14.45, 15.25, None, None),
            (15.95, 23.04, None, None),                    # solitaire rings with diamonds on the band
            (26.05, 28.08, 'THE DESIGN', None),            # do you want to try to design your own ring?
            (28.66, 28.91, None, None),
            (33.85, 38.85, None, {'src': 12.0, 'rate': 1.6}),    # type in your prompts ... hit generate
            (71.95, 74.45, None, {'src': 90.5, 'rate': 3.4}),    # platinum, solitaire with diamonds on the band
            (80.25, 83.40, None, {'src': 101.6, 'rate': 3.6}),   # it's generating
            (83.45, 85.62, None, {'src': 122.8, 'rate': 1.0, 'reveal': True}),  # oh, that's beautiful
            (85.78, 87.85, None, None),                    # what would you name this piece?
            (90.12, 91.98, None, {'src': 126.5, 'rate': 1.0, 'title': 'Victoria'}),
            (108.92, 111.58, None, None),                  # would you pass this piece down?
            (112.10, 113.15, None, None),
            (137.35, 139.65, None, None),                  # thank you so much, Amanda
            (143.80, 147.75, None, None),                  # create your own pieces -> commission
        ],
        'pops': [('solitaire', 17.06, 'solitaire.jpg', 'Solitaire'), ('diamonds', 19.86, 'diamonds.jpg', 'Diamonds on the band'),
                 ('maybe', 132.86, 'rings.jpg', 'One-of-one')],
        'name_tag': (108.96, 'Amanda', "DESIGNED ‘VICTORIA’"),
        'end': {'top': 'DESIGN YOURS AT', 'brand': 'Takshila.co', 'sub': '& earn when your design sells'},
        'answers': [(122.82, 'ON THE SHELF'), (132.86, 'ONE-ON-ONE'), (16.00, 'SOLITAIRE'), (28.72, 'YES!'), (112.14, 'PASS IT DOWN')],
        'punch': [132.85, 112.10],      # source starts of the big answers (zoom + green flash)
        'coin': [133.70, 146.10],       # one-of-one, 'commission'
        'fix': {'solitary': 'solitaire', 'solitary.': 'solitaire.'},
        'drop': [],
        'add': [],
    },
    'jewel': {
        'hook': ['Would you design', 'your own jewellery?'],
        'music': {'file': 'music/jewel.mp3', 'start': 34.36, 'credit': '"Lofi House" by AstroShroom, CC BY-SA 3.0'},
        'clips': [
            (175.76, 181.20, 'RAPID FIRE', None),          # now rapid fire: off the shelf or customise yourself?
            (181.66, 182.22, None, None),                  # customize.
            (183.20, 184.66, None, None),                  # would you like mass-produced jewelry
            (185.44, 188.16, None, None),                  # or one-on-one pieces like what we just created? (Kay's cut)
            (188.90, 189.52, None, None),                  # one-on-one.
            (10.68, 12.60, 'HER DREAM PIECE', None),       # what does your dream jewelry look like?
            (13.50, 14.70, None, None),                    # oh, gold, diamonds
            (19.40, 21.50, None, None),                    # when she said I love gold, so anything gold
            (22.00, 29.80, 'THE DESIGN', None),            # on our website ... AI will customize ... try it out?
            (63.80, 67.20, None, None),                    # she was doing a necklace / you could do a necklace too
            (81.40, 83.22, None, None),                    # do I generate it? yeah, generate
            (110.18, 114.10, None, None),                  # here goes generating... a little cute video
            (114.40, 116.40, None, None),                  # okay, that's so cute
            (121.26, 123.26, None, None),                  # yo, that looks like my dream thing
            (131.90, 132.70, None, None),                  # what was the prompt?
            (134.00, 138.78, None, None),                  # a cross necklace with diamonds and gold
            (152.66, 154.66, None, None),                  # what would you name this if you could name it?
            (160.56, 161.48, None, {'title': 'Jesus is Lord', 'keep_video': True}),
            (162.44, 163.60, None, None),                  # that's very cute
            (208.36, 209.80, None, None),                  # thank you ladies so much
            (218.40, 223.40, None, {'phone': True}),       # we put cross necklace with diamonds, gold -> phone reveal
        ],
        'pops': [('gold', 13.58, 'gold.jpg', 'Gold'), ('diamonds', 14.2, 'diamonds.jpg', 'Diamonds'),
                 ('cross', 134.62, 'cross.jpg', 'Cross necklace'), ('one-on-one', 188.94, 'rings.jpg', 'One-of-one')],
        'name_tag': None,
        'end': {'top': 'DESIGN YOURS AT', 'brand': 'Takshila.co', 'sub': 'one-of-one pieces, made with AI'},
        'fix': {'wrap': 'rapid', 'first,': 'fire,'},
        'drop': [176.06, 221.50],  # 'it' in 'now rapid (it) fire'; a stretched 'thank' under the phone reveal
        'add': [  # words the transcriber missed (26-29.8 s), from an earlier pass over the same audio
            ('then', 26.23, 26.50), ('AI', 26.53, 26.68), ('will', 26.69, 26.90), ('customize', 26.91, 27.38), ('the', 27.39, 28.04),
            ('jewelry', 28.05, 28.22), ('how', 28.23, 28.42), ('you', 28.43, 28.64), ('want', 28.65, 28.74), ('it.', 28.75, 28.92),
            ('Do', 28.93, 29.10), ('you', 29.11, 29.14), ('want', 29.15, 29.24), ('to', 29.25, 29.40), ('try', 29.41, 29.48),
            ('it', 29.49, 29.66), ('out?', 29.67, 29.80)],
    },
}
KEY = {'dream', 'solitaire', 'diamonds', 'design', 'ring', 'generate', 'generating', 'platinum', 'beautiful', 'victoria', 'shelf',
       'one-on-one', 'commission', 'gold', 'necklace', 'customize', 'ai', 'cross', 'jesus', 'lord', 'cute', 'rapid', 'fire'}


def norm(w):
    return re.sub(r"[^a-z\-']", '', w.lower())


def main(name, words_path, out, mode='full'):
    plan = dict(P[name])
    if mode == 'quiz':
        # open straight on the anchor's question (no title card), from 'would you rather'
        plan['clips'] = [((115.60, *c[1:]) if i == 0 else c) for i, c in enumerate(plan['clips'])]
        # the Design Studio comes up as soon as she has the tablet, straight on the prompt being typed (no category grid)
        typing = {33.85: {'src': 76.0, 'rate': 1.4, 'typing': True}, 71.95: {'src': 86.0, 'rate': 5.4, 'typing': True}}
        plan['clips'] = [((c[0], c[1], c[2], typing[c[0]]) if c[0] in typing else c) for c in plan['clips']]
    raw = json.load(open(words_path))
    words = []
    for w in raw:
        if w['w'].startswith('-') and words:
            words[-1]['w'] += w['w']; words[-1]['e'] = w['e']; continue
        words.append(dict(w))
    if plan['add']:
        words = [w for w in words if not (26.05 <= w['s'] < 29.9 and norm(w['w']) in ('and', 'then', 'yes', 'i', 'do'))] + \
                [{'w': t, 's': s, 'e': e} for t, s, e in plan['add']]
        words.append({'w': 'and', 's': 25.95, 'e': 26.22})
        words.sort(key=lambda w: w['s'])
    words = [w for w in words if round(w['s'], 2) not in plan['drop']]
    for w in words:
        w['w'] = plan['fix'].get(w['w'], w['w'])

    segs, t0 = [], 0.0
    for a, b, chapter, ov in plan['clips']:
        ws = [w for w in words if a - 0.05 <= w['s'] < b]
        runs, cur = [], [ws[0]]
        for w in ws[1:]:
            if w['s'] - cur[-1]['e'] > MAX_GAP:
                runs.append(cur); cur = [w]
            else:
                cur.append(w)
        runs.append(cur)
        if ov:
            runs = [ws]
        for k, r in enumerate(runs):
            ra, rb = (a, b) if ov else (max(a, r[0]['s'] - PAD_IN), min(b, r[-1]['e'] + PAD_OUT))
            seg = {'a': round(ra, 3), 'b': round(rb, 3), 'o': round(t0, 3)}
            if k == 0 and chapter:
                seg['chapter'] = chapter
            if k == 0 and ov:
                seg['overlay'] = ov
            segs.append(seg)
            t0 += rb - ra
    HOOK = 0.0 if mode == 'quiz' else 2.2  # the opening question card plays over the first shot (full edit only)
    for s in segs:
        s['o'] = round(s['o'] + HOOK, 3)
    total = round(t0 + HOOK, 3)

    def to_out(t):
        for s in segs:
            if s['a'] - 1e-6 <= t < s['b'] + 1e-6:
                return round(s['o'] + t - s['a'], 3)
        return None

    # captions: phrases of up to 3 words, broken at punctuation and pauses; the strongest word is highlighted
    caps, cur = [], []
    def flush():
        if not cur:
            return
        key = max(range(len(cur)), key=lambda i: (norm(cur[i]['w']) in KEY, len(cur[i]['w'])))
        caps.append({'t': cur[0]['o'], 'e': cur[-1]['oe'], 'words': [c['w'].strip(',.?!') for c in cur],
                     'key': key if norm(cur[key]['w']) in KEY else -1})
        cur.clear()
    timed = []
    for w in words:
        o = to_out(w['s'])
        if o is not None:
            timed.append((o, w))
    timed.sort(key=lambda x: x[0])
    prev = None
    for o, w in timed:
        oe = to_out(min(w['e'], w['s'] + 1.0) - 0.005) or o + 0.3
        if prev and (o - prev['oe'] > 0.35 or len(cur) >= 3 or prev['w'][-1:] in ',.?!'):
            flush()
        cur.append({'w': w['w'], 'o': o, 'oe': oe}); prev = cur[-1]
    flush()
    for c, n in zip(caps, caps[1:] + [None]):
        c['e'] = round(min(n['t'] if n else c['e'] + 0.5, c['e'] + 0.5), 3)

    pops = []
    for word, near, img, label in plan['pops']:
        cand = [w for w in words if norm(w['w']).startswith(norm(word)) and abs(w['s'] - near) < 1.5]
        t = to_out(min(cand, key=lambda w: abs(w['s'] - near))['s']) if cand else to_out(near)
        if t is not None:
            pops.append({'t': t, 'img': img, 'label': label})

    # every word on its own (quiz style), in output order
    word_caps = []
    for o, w in timed:
        word_caps.append({'w': w['w'].strip(',.?!'), 't': o, 'key': norm(w['w']).strip("'") in KEY})
    for c, n in zip(word_caps, word_caps[1:] + [None]):
        c['e'] = round(min(n['t'] if n else c['t'] + 0.6, c['t'] + 0.7), 3)
    answers = [{'t': to_out(t), 'label': lab} for t, lab in plan.get('answers', []) if to_out(t) is not None]
    punch = [i for i, sg in enumerate(segs) if any(abs(sg['a'] - p) < 0.05 for p in plan.get('punch', []))]
    coins = [to_out(t) for t in plan.get('coin', []) if to_out(t) is not None]

    nt = plan['name_tag']
    data = {
        'name': name, 'total': total, 'hook': plan['hook'], 'hookDur': HOOK, 'music': plan['music'], 'segments': segs,
        'captions': caps, 'pops': pops, 'end': plan['end'],
        'nameTag': {'t': to_out(nt[0]), 'name': nt[1], 'sub': nt[2]} if nt else None,
        'words': word_caps, 'answers': answers, 'punch': punch, 'coins': coins,
    }
    json.dump(data, open(out, 'w'), indent=1)
    print(name, 'total', total, 'segments', len(segs), 'captions', len(caps), 'pops', [(p['label'], p['t']) for p in pops])


if __name__ == '__main__':
    main(*sys.argv[1:5])
