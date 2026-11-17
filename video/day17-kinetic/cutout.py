# Her cut-out with alpha (VP9 webm, yuva420p) from the Day 17 take, so type can sit behind her.
# Uses the effects skill's selfie segmenter + guided filter (same recipe as fx.py's Tracker).
# usage: python cutout.py in.mp4 out.webm
import sys, os, subprocess, numpy as np, cv2
import mediapipe as mp
from mediapipe.tasks.python import vision
from mediapipe.tasks.python.core.base_options import BaseOptions
ROOT = '/root/.claude/skills/effects'
src, dst = sys.argv[1], sys.argv[2]
cap = cv2.VideoCapture(src); fps = cap.get(cv2.CAP_PROP_FPS) or 30
W, H = int(cap.get(3)), int(cap.get(4))
seg = vision.ImageSegmenter.create_from_options(vision.ImageSegmenterOptions(
    base_options=BaseOptions(model_asset_path=os.path.join(ROOT, 'models', 'selfie_segmenter.tflite')),
    running_mode=vision.RunningMode.VIDEO, output_confidence_masks=True, output_category_mask=False))
def guided(I, p, r=8, eps=2e-3):
    box = lambda x: cv2.boxFilter(x, -1, (2 * r + 1, 2 * r + 1))
    mI, mp_ = box(I), box(p); a = (box(I * p) - mI * mp_) / (box(I * I) - mI * mI + eps); b = mp_ - a * mI
    return np.clip(box(a) * I + box(b), 0, 1)
enc = subprocess.Popen(['ffmpeg', '-v', 'error', '-y', '-f', 'rawvideo', '-pix_fmt', 'rgba', '-s', f'{W}x{H}', '-r', str(fps), '-i', '-',
    '-c:v', 'libvpx-vp9', '-pix_fmt', 'yuva420p', '-b:v', '0', '-crf', '24', '-deadline', 'good', '-cpu-used', '4', '-row-mt', '1', dst], stdin=subprocess.PIPE)
prev, i = None, 0
while True:
    ok, bgr = cap.read()
    if not ok: break
    rgb = cv2.cvtColor(bgr, cv2.COLOR_BGR2RGB)
    small = cv2.resize(rgb, (W // 2, H // 2))
    m = seg.segment_for_video(mp.Image(image_format=mp.ImageFormat.SRGB, data=np.ascontiguousarray(small)), int(i * 1000 / fps)).confidence_masks[-1].numpy_view().astype(np.float32)
    m = m.reshape(m.shape[0], m.shape[1]); m = cv2.resize(m, (W, H))
    m = guided(cv2.cvtColor(rgb, cv2.COLOR_RGB2GRAY).astype(np.float32) / 255, m)
    m = np.clip((m - 0.5) * 1.8 + 0.5, 0, 1)
    if prev is not None: m = 0.6 * m + 0.4 * prev
    prev = m
    enc.stdin.write(np.dstack([rgb, (m * 255).astype(np.uint8)]).tobytes()); i += 1
enc.stdin.close(); enc.wait(); print('frames', i)
