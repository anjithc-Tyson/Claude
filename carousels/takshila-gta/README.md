# Takshila — "The Gold Job" (GTA V-style carousel)

Seven 1080×1350 Instagram slides styled like an open-world crime game UI. Display type is Pricedown, in GTA's HUD colours (cash green, mission-passed gold, white text with heavy black outlines). Uses no game logo, title or characters.

1. Box-art cover: grid of graded photo panels, title block
2. Mission 01 · The Pitch: mission-start title card, help box, subtitles, radar
3. Choose your loot: selection wheel with the 8 categories
4. Pick your crew: AI Design Studio / Master Jeweler / You (the boss, 100% cut)
5. Green light: interaction menu where nothing gets made until you say yes
6. Mission 04 · The Craft: pause-menu stats (solid gold, hallmarked, GIA & IGI, 15 days)
7. Mission passed: results screen + CTA

```bash
node export.js     # export/*.png at 1080×1350
node export.js 2   # 2160×2700
```

## Font (not in git)

Pricedown (Typodermic) is free for commercial **static** work like these images, but its licence forbids sharing the font file. It is git-ignored, so each person who exports needs their own copy:

1. Download it from dafont.com/pricedown.font.
2. Save `Pricedown Bl.otf` as `fonts/pricedown.otf`.
