# Takshila — "The Heist" panoramic carousel

One continuous 7560×1350 comic-heist artwork, sliced into seven 1080×1350 Instagram slides (4:5). Pieces cross the slide seams on purpose (the lariat over 1→2, the tennis bracelet over 5→6, the caution tape under every slide), so swiping feels like one long poster.

1. The Heist of your life (cover)
2. Step 01 · Case the joint: describe it
3. Step 02 · The plan: AI drafts it, a jeweler perfects it in 3D
4. Step 03 · Crack the vault: nothing gets made till you say yes
5. Step 04 · Solid gold: hand-crafted
6. Step 05 · Clean getaway: certified, insured, delivered in 15 days
7. Your move: CTA

Product cutouts in `assets/stickers/` were made from the showcase photos with rembg.

```bash
node export.js     # export/slide-1..7.png + panorama-full.png
node export.js 2   # 2160×2700 retina
```
