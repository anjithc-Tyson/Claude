#!/bin/bash
# Installs the video toolkit (FFmpeg, yt-dlp, HyperFrames) and the effects skill in cloud sessions.
set -euo pipefail

if [ "${CLAUDE_CODE_REMOTE:-}" != "true" ]; then
  exit 0
fi

# FFmpeg: cuts + mixes video
if ! command -v ffmpeg >/dev/null 2>&1 || ! command -v ffprobe >/dev/null 2>&1; then
  apt-get update -qq && DEBIAN_FRONTEND=noninteractive apt-get install -y -qq ffmpeg
fi

# yt-dlp: saves the Reels
if ! command -v yt-dlp >/dev/null 2>&1; then
  pip install -q yt-dlp
fi

# HyperFrames: captions + graphics (HTML -> MP4)
if ! command -v hyperframes >/dev/null 2>&1; then
  npm install -g -s hyperframes
fi

# Effects skill (42 talking-head video effects)
EFFECTS_DIR="$HOME/.claude/skills/effects"
if [ ! -d "$EFFECTS_DIR/.git" ]; then
  mkdir -p "$HOME/.claude/skills"
  git clone -q https://github.com/Vibha-Ramprakash/claude-video-effects "$EFFECTS_DIR"
fi
bash "$EFFECTS_DIR/scripts/setup.sh"
