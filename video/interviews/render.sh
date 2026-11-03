#!/bin/bash
# Render both interview edits, normalise loudness to -14 LUFS (Reels), then score them with earshot.
set -euo pipefail
cd "$(dirname "$0")"
export REMOTION_CHROME=${REMOTION_CHROME:-/opt/pw-browsers/chromium_headless_shell-1243/chrome-headless-shell-linux64/chrome-headless-shell}
mkdir -p out
for comp in Street Jewel; do
  name=$(echo "$comp" | tr 'A-Z' 'a-z')
  npx remotion render "$comp" "out/${name}_master.mp4" --concurrency=4 --crf=15 --audio-bitrate=320k --log=error
  ffmpeg -v error -y -i "out/${name}_master.mp4" -c:v copy -af "loudnorm=I=-14:TP=-1.5:LRA=11" -ar 48000 -c:a aac -b:a 320k \
    -movflags +faststart "out/takshila_${name}.mp4"
  ffmpeg -v error -i "out/takshila_${name}.mp4" -f null -
  echo "rendered out/takshila_${name}.mp4"
done
if command -v earshot >/dev/null; then
  for name in street jewel; do
    earshot critique "out/takshila_${name}.mp4" > "out/critique_${name}.txt" 2>&1 || true
    earshot sheet "out/takshila_${name}.mp4" -o "out/sheet_${name}_audio.png" --detail low > /dev/null 2>&1 || true
  done
fi
