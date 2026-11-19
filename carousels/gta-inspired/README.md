# Takshila — game-HUD heist carousels

Two Instagram carousels (1080×1350, 4:5) in a crime-game HUD style: wanted-level stars, mission titles, objective boxes, cutscene subtitles, sunset skyline. Uses Takshila's palette (night / plum / pumpkin / gold), logo and product photos taken from `showcase/`.

- **A · The Gold Job** (7 slides): how Takshila works, told as five missions → "Mission complete".
- **B · Most Wanted** (6 slides): bestsellers shown as wanted posters, with the price as the bounty → design-your-own CTA.

Edit `carousels.html`, then re-export:

```bash
node export.js      # 1080×1350 PNGs → export/
node export.js 2    # 2160×2700 retina
```
