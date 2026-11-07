# Script 4 — Glow & spotlight (effects skill)
Input: media/p7/edit.mp4, padded 300 px at the top (wall smeared) so words behind her head fit:
`ffmpeg -i script4.mp4 -vf "pad=1080:2220:0:300,fillborders=top=300:mode=smear,crop=1080:1920:0:0" script4_room.mp4`
Then `fx.py --plan script4_effects.json script4_room.mp4 out.mp4` from the effects skill.
