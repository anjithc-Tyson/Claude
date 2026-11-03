#!/bin/bash
# Cloud-session setup for the Takshila video toolkit. Skills that live in .claude/skills load by themselves;
# this installs the tools they call: FFmpeg, yt-dlp, HyperFrames, the effects skill, earshot (audio listening).
set -euo pipefail

if [ "${CLAUDE_CODE_REMOTE:-}" != "true" ]; then
  exit 0
fi

# FFmpeg (cuts + mixes video) and libEGL (mediapipe person cut-outs)
if ! command -v ffmpeg >/dev/null 2>&1 || ! command -v ffprobe >/dev/null 2>&1 || ! ldconfig -p | grep -q libEGL.so.1; then
  apt-get update -qq && DEBIAN_FRONTEND=noninteractive apt-get install -y -qq ffmpeg libegl1 libgles2
fi

# yt-dlp: saves the Reels
if ! command -v yt-dlp >/dev/null 2>&1; then
  pip install -q yt-dlp
fi

# HyperFrames: captions + graphics (HTML -> MP4)
if ! command -v hyperframes >/dev/null 2>&1; then
  npm install -g -s hyperframes
fi

# Effects skill (talking-head video effects) + faster-whisper for word-timed captions
EFFECTS_DIR="$HOME/.claude/skills/effects"
if [ ! -d "$EFFECTS_DIR/.git" ]; then
  mkdir -p "$HOME/.claude/skills"
  git clone -q https://github.com/Vibha-Ramprakash/claude-video-effects "$EFFECTS_DIR"
fi
bash "$EFFECTS_DIR/scripts/setup.sh"
"$EFFECTS_DIR/.venv/bin/python" -c "import faster_whisper" 2>/dev/null || "$EFFECTS_DIR/.venv/bin/python" -m pip install -q faster-whisper

# earshot: listening tools for sound effects and mixes (skills: earshot, real-sound). Pinned to the reviewed release.
EARSHOT_REV=591fa3e028032e6dce56620a20e932e35667e8d8
EARSHOT_DIR="$HOME/.local/share/earshot"
EARSHOT_VENV="$HOME/.local/share/earshot-venv"
if [ ! -d "$EARSHOT_DIR/.git" ]; then
  git clone -q https://github.com/Leonxlnx/earshot.git "$EARSHOT_DIR"
fi
git -C "$EARSHOT_DIR" fetch -q origin "$EARSHOT_REV" 2>/dev/null || true
git -C "$EARSHOT_DIR" checkout -q "$EARSHOT_REV"
if [ ! -x "$EARSHOT_VENV/bin/earshot" ]; then
  python3 -m venv "$EARSHOT_VENV"
  "$EARSHOT_VENV/bin/pip" install -q torch torchaudio --index-url https://download.pytorch.org/whl/cpu
  "$EARSHOT_VENV/bin/pip" install -q -e "$EARSHOT_DIR[mcp]"
fi
ln -sf "$EARSHOT_VENV/bin/earshot" /usr/local/bin/earshot
