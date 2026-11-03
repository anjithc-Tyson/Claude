# Takshila video toolkit

Everything Claude needs to edit Takshila videos in a cloud session. It loads on its own in every new session of
this repository: the skills from `.claude/skills/`, the tools from the startup hook `.claude/hooks/session-start.sh`.

## Skills

| Skill | Where it lives | What it is for |
|---|---|---|
| `earshot` | `.claude/skills/earshot` (engine installed by the hook) | Measures sound: describes a sound, picks the best take, checks sync to cuts, loudness, scores a film against pro launch films; 252 code-made SFX (shutters, pops, whooshes, risers) |
| `real-sound` | `.claude/skills/real-sound` | Soundtracks from real licensed recordings: cue lists, sourcing with licence checks, mixing, mastering, credits |
| `real-sfx` | `.claude/skills/real-sfx` | Places real recorded SFX on the exact frame, keeps music and voice; ships 78 CC0 UI sounds; add your own library in `config.json` |
| `remotion-*` (13 skills) | `.claude/skills/remotion-*` | Building videos in code with Remotion: compositions, captions, effects, transitions, rendering |
| `ui-ux-pro-max` | `.claude/skills/ui-ux-pro-max` | UI/UX design guidance |
| `effects` | cloned by the hook into `~/.claude/skills/effects` | 51 talking-head effects (orbit, spotlight, glass widgets, timeline...) |

## Tools the hook installs

- FFmpeg, yt-dlp, HyperFrames, libEGL
- the effects skill's Python environment, plus faster-whisper (word-timed captions) and mediapipe (person cut-outs)
- earshot, pinned to the reviewed release, with CPU PyTorch (`earshot` on the PATH); its listening models (~1.1 GB)
  download on first use
- `tools/video/openverse.py`: search and download openly licensed images and audio from Openverse, with an
  `ATTRIBUTION.txt` for every download

## Where things are saved

- **In this repository (permanent):** skills, the startup hook, tools, this guide.
- **In the session's scratchpad (temporary):** footage, renders and Remotion projects while a video is being made.
  The cloud machine can reset and wipe them, so download every finished video and keep raw footage, reference videos
  and sound packs in Google Drive.
- Licences: earshot MIT; Clipwing real-sfx and Remotion skills per their repositories (Remotion itself is free for
  teams of up to 3, see `remotion-license`); uisfx sounds CC0.
