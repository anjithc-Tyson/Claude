"""Face position per edit segment, for punch-ins.

usage: faces.py VIDEO EDL.json OUT.json [left|right|biggest]

Samples 5 frames inside each segment's source range, detects faces with YuNet (from the effects skill),
picks one face per frame (default: the leftmost = the interviewee in the street videos), and writes the
median centre and size in 1080x1920 video coordinates: {"<segment index>": [x, y, size] | null}.
"""
import json
import os
import statistics
import sys

import cv2

MODEL = os.path.expanduser('~/.claude/skills/effects/models/yunet.onnx')


def main(video, edl, out, pick='left'):
    segs = json.load(open(edl))['segments']
    cap = cv2.VideoCapture(video)
    w, h = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH)), int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
    det = cv2.FaceDetectorYN.create(MODEL, '', (w, h), 0.7)
    sx, sy = 1080 / w, 1920 / h
    res = {}
    for i, s in enumerate(segs):
        pts = []
        for k in range(5):
            t = s['a'] + (s['b'] - s['a']) * (k + 0.5) / 5
            cap.set(cv2.CAP_PROP_POS_MSEC, t * 1000)
            ok, fr = cap.read()
            if not ok:
                continue
            _, faces = det.detect(fr)
            if faces is None or len(faces) == 0:
                continue
            faces = [f for f in faces if f[2] * sx > 50]  # ignore tiny background faces
            if not faces:
                continue
            f = {'left': min(faces, key=lambda f: f[0]), 'right': max(faces, key=lambda f: f[0]),
                 'biggest': max(faces, key=lambda f: f[2])}[pick]
            pts.append(((f[0] + f[2] / 2) * sx, (f[1] + f[3] / 2) * sy, f[2] * sx))
        res[str(i)] = [round(statistics.median(p[j] for p in pts)) for j in range(3)] if pts else None
    json.dump(res, open(out, 'w'), indent=1)
    print(res)


if __name__ == '__main__':
    main(*sys.argv[1:5])
