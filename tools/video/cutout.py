"""Cut a talking person out of a video (green-screen style), for compositing over B-roll.

usage: cutout.py IN.mp4 OUT.webm [--preview OUT.jpg]

Uses the effects skill's MediaPipe selfie segmenter. The mask is smoothed over time and feathered, then the
person is written as VP9 with alpha (yuva420p), which Remotion's OffthreadVideo plays with `transparent`.
"""
import os
import subprocess
import sys

import cv2
import mediapipe as mp
import numpy as np
from mediapipe.tasks import python as mpt
from mediapipe.tasks.python import vision

MODEL = os.path.expanduser('~/.claude/skills/effects/models/selfie_segmenter.tflite')


def main(src, out, preview=None):
    cap = cv2.VideoCapture(src)
    w, h = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH)), int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
    fps = cap.get(cv2.CAP_PROP_FPS) or 30
    seg = vision.ImageSegmenter.create_from_options(vision.ImageSegmenterOptions(
        base_options=mpt.BaseOptions(model_asset_path=MODEL), running_mode=vision.RunningMode.VIDEO,
        output_confidence_masks=True))
    ff = None if preview else subprocess.Popen(
        ['ffmpeg', '-v', 'error', '-y', '-f', 'rawvideo', '-pix_fmt', 'rgba', '-s', f'{w}x{h}', '-r', str(fps), '-i', '-',
         '-c:v', 'libvpx-vp9', '-pix_fmt', 'yuva420p', '-b:v', '0', '-crf', '20', '-row-mt', '1', '-deadline', 'good', '-cpu-used', '4',
         '-auto-alt-ref', '0', out], stdin=subprocess.PIPE)
    prev, i = None, 0
    while True:
        ok, fr = cap.read()
        if not ok:
            break
        rgb = cv2.cvtColor(fr, cv2.COLOR_BGR2RGB)
        res = seg.segment_for_video(mp.Image(image_format=mp.ImageFormat.SRGB, data=np.ascontiguousarray(rgb)), int(i * 1000 / fps))
        m = res.confidence_masks[0].numpy_view().astype(np.float32).reshape(h, w)
        prev = m if prev is None else 0.6 * m + 0.4 * prev          # temporal smoothing: no flicker on the edges
        a = np.clip((prev - 0.35) / 0.3, 0, 1)                     # firm inside, soft edge
        a = cv2.GaussianBlur(a, (0, 0), 2.2)
        rgba = np.dstack([rgb, (a * 255).astype(np.uint8)])
        if preview and i < int(os.environ.get("PF", 45)):
            i += 1
            continue
        if preview:
            bg = np.zeros_like(rgb); bg[:] = (40, 160, 60)
            comp = (rgb * a[..., None] + bg * (1 - a[..., None])).astype(np.uint8)
            cv2.imwrite(preview, cv2.cvtColor(comp, cv2.COLOR_RGB2BGR))
            return
        ff.stdin.write(rgba.tobytes())
        i += 1
    ff.stdin.close()
    ff.wait()
    print(out, i, 'frames')


if __name__ == '__main__':
    a = sys.argv[1:]
    if '--preview' in a:
        k = a.index('--preview')
        main(a[0], a[1], a[k + 1])
    else:
        main(a[0], a[1])
