// Script 4 · "The Detail" — the engraving plates (TREATMENT.md). Vertical 1080×1920, times are the edit's seconds.
// The plate is one sheet in several states: (A) the finished ring with one bare spot on its inner band,
// (B) three roundels and the ring re-cut in three passes, (C) the bare spot cut and coloured, (D) the finished plate.
// Her own take is composited outside this page; FIG. I below is the frame her video sits in.
import { B, Wash, drawSheet, borderInk, engraveText, writeScript, roundelFrame, leader, PAL } from './engine/index.js';

const W = 1080, H = 1920;
const cv = document.getElementById('c'); cv.width = W; cv.height = H;
const ctx = cv.getContext('2d');
await Promise.all([document.fonts.load('600 40px "Bodoni Moda"'), document.fonts.load('italic 500 30px "Bodoni Moda"'), document.fonts.load('40px "Pinyon Script"')]);

// ---------- timeline (seconds of the edit; see TREATMENT.md §4–5) ----------
export const T = {
  A: [0, 6.45], B1: [10.85, 16.55], B2: [17.55, 24.45], C: [36.85, 41.05], D: [49.02, 52.62],
  title: 0.35, detail: 4.28,
  person: 11.6, moment: 12.56, carry: 14.78,
  outline: 17.82, metal: 20.14, proportions: 21.08, theirs: 24.1,
  hold: 37.32, really: 38.36, means: 38.96, everything: 39.76,
  end: 49.02,
};
window.DUR = 52.62;
const P = [60, 250, 1020, 1640];                       // plate mark, inside Instagram's safe area
const LIGHT = [-0.6, -0.7];
const RC = { x: 540, y: 1030 };                        // ring centre
const MAKER = { x: 250, y: 1330, r: 150 };             // FIG. I: her video is composited here (state A)
const SPOT = { x: 690, y: 931, rx: 62, ry: 16, rot: 0.38 };   // the bare oval on the inner wall, beside the setting

// ---------- the ring, as shapes ----------
const ell = (cx, cy, rx, ry, a0, a1, n = 90) => B.ellipsePts(cx, cy, rx, ry, 0, n, a0, a1);
const O = { cx: RC.x, cy: RC.y, rx: 290, ry: 175 }, I = { cx: RC.x, cy: RC.y - 10, rx: 258, ry: 150 }, I2 = { cx: RC.x, cy: RC.y + 46, rx: 258, ry: 150 };
const front = B.ring([...ell(O.cx, O.cy, O.rx, O.ry, 0, Math.PI), ...ell(I.cx, I.cy, I.rx, I.ry, Math.PI, 0)]);          // lower half of the band
const back = B.ring([...ell(O.cx, O.cy, O.rx, O.ry, Math.PI, 2 * Math.PI), ...ell(I.cx, I.cy, I.rx, I.ry, 2 * Math.PI, Math.PI)]);
const wall = B.ring([...ell(I.cx, I.cy, I.rx, I.ry, Math.PI, 2 * Math.PI), ...ell(I2.cx, I2.cy, I2.rx * 0.985, I2.ry, 2 * Math.PI, Math.PI)]);   // inner wall seen through the ring
const BZ = { x: RC.x, top: RC.y - 205, bot: RC.y - 150, rx: 62, ry: 21 };
const bezel = B.ring([...ell(BZ.x, BZ.top, BZ.rx, BZ.ry, Math.PI, 0), ...ell(BZ.x, BZ.bot, BZ.rx, BZ.ry, 0, Math.PI)]);
const stone = B.ring(ell(BZ.x, BZ.top - 22, 66, 48, 0, 2 * Math.PI));
const spot = B.ring(B.ellipsePts(SPOT.x, SPOT.y, SPOT.rx, SPOT.ry, SPOT.rot, 60));
const bezelTopPolys = B.ring(ell(BZ.x, BZ.top, BZ.rx, BZ.ry, 0, 2 * Math.PI)).polys;

// the three passes of the burin on one figure; `when` = null → already cut (instant)
function cutRing(when) {
  const ink = new B.Ink();
  const ex = [...bezel.polys, ...stone.polys];
  const tone = (polys, base) => B.formTone(polys, { light: LIGHT, base });
  const tB = tone(back.polys, 0.18), tF = tone(front.polys, 0.06), tW = tone(wall.polys, 0.42), tZ = tone(bezel.polys, 0.12), tS = B.sphereTone(BZ.x, BZ.top - 30, 62, 44, { base: 0.08 });
  ink.group('ol');
  for (const sh of [back, wall, front, bezel]) for (const p of sh.polys) B.outline(ink, p, { w: 2.0, light: LIGHT, seed: 3, excl: sh === back || sh === wall ? ex : null });
  for (const p of stone.polys) B.outline(ink, p, { w: 1.8, light: LIGHT, seed: 4 });
  ink.group('h1');
  B.hatch(ink, back.polys, { angle: -0.25, spacing: 4.4, tone: tB, thr: 0.12, wMax: 1.7, excl: ex, seed: 5 });
  B.hatch(ink, wall.polys, { angle: 0.05, spacing: 3.6, tone: tW, thr: 0.1, wMax: 1.5, excl: [...ex, ...spot.polys], seed: 6 });
  B.contourHatch(ink, front.polys, { spacing: 4.2, tone: tF, thr: 0.12, wMax: 1.8, seed: 7 });
  B.hatch(ink, bezel.polys, { angle: 1.45, spacing: 3.8, tone: tZ, thr: 0.1, wMax: 1.6, excl: stone.polys, seed: 8 });
  B.hatch(ink, stone.polys, { angle: -0.7, spacing: 3.4, tone: tS, thr: 0.18, wMax: 1.3, seed: 9 });
  ink.group('h2');
  B.hatch(ink, back.polys, { angle: 0.85, spacing: 4.8, tone: tB, thr: 0.48, wMax: 1.3, excl: ex, seed: 10 });
  B.hatch(ink, wall.polys, { angle: 1.1, spacing: 4.0, tone: tW, thr: 0.48, wMax: 1.2, excl: [...ex, ...spot.polys], seed: 11 });
  B.hatch(ink, front.polys, { angle: -0.9, spacing: 4.6, tone: tF, thr: 0.5, wMax: 1.4, seed: 12 });
  B.hatch(ink, stone.polys, { angle: 0.6, spacing: 3.8, tone: tS, thr: 0.5, wMax: 1.0, seed: 13 });
  ink.group('h3');
  B.hatch(ink, [...back.polys, ...wall.polys, ...front.polys, ...bezel.polys], { angle: 0.25, spacing: 5.6, tone: (x, y) => Math.max(tB(x, y), tF(x, y), tW(x, y)) * (B.inAny(bezelTopPolys, x, y) ? 0 : 1), thr: 0.76, wMax: 0.9, excl: [...stone.polys, ...spot.polys], seed: 14 });
  // facets on the ruby: a table and star lines, cut with the outline
  ink.group('ol');
  const tb = ell(BZ.x, BZ.top - 36, 30, 16, 0, 2 * Math.PI, 40); B.outline(ink, tb, { w: 1.1, light: LIGHT, seed: 15 });
  for (let k = 0; k < 8; k++) { const a = k / 8 * Math.PI * 2; B.stroke(ink, [[BZ.x + Math.cos(a) * 30, BZ.top - 36 + Math.sin(a) * 16], [BZ.x + Math.cos(a) * 62, BZ.top - 22 + Math.sin(a) * 45]], 0.8); }
  if (when) {
    ink.schedule('ol', when.ol[0], when.ol[1], { conc: 3 });
    ink.schedule('h1', when.h1[0], when.h1[1], { conc: 60 });
    ink.schedule('h2', when.h2[0], when.h2[1], { conc: 60 });
    ink.schedule('h3', when.h3[0], when.h3[1], { conc: 50 });
  } else for (const g of ['ol', 'h1', 'h2', 'h3']) ink.instant(g);
  ink.build();
  return ink;
}
const ringA = cutRing(null);
const ringB = cutRing({ ol: [T.outline, T.outline + 1.6], h1: [T.metal, T.metal + 1.4], h2: [T.proportions, T.proportions + 1.3], h3: [T.proportions + 1.2, T.proportions + 2.4] });

// ---------- the three things a piece begins with: roundel contents (drawn at radius 500, scaled in) ----------
const RD = [
  { x: 215, y: 585, r: 104, at: T.person, label: 'THE PERSON', fig: 'fig. 1' },
  { x: 540, y: 585, r: 104, at: T.moment, label: 'THE MOMENT', fig: 'fig. 2' },
  { x: 865, y: 585, r: 104, at: T.carry, label: 'WHAT THEY CARRY', fig: 'fig. 3' },
];
function roundelInk(i) {
  const ink = new B.Ink(), k = 0.2;                     // local radius 500 → 100 world units
  const at = B.xf(0, 0, k);
  if (i === 0) {   // a profile, facing right
    const d = 'M-120 330 C-150 220 -170 120 -150 30 C-190 -40 -200 -150 -150 -240 C-90 -340 60 -360 130 -280 C170 -230 175 -170 170 -120 C200 -100 230 -70 235 -40 C215 -30 195 -20 180 -12 C190 10 190 30 175 45 C185 60 180 80 165 90 C160 130 120 150 70 150 C60 210 70 270 100 330 Z';
    engraveShape(d, at, ink, 'p', 4.2 / k);
  } else if (i === 1) {   // a clock face at a quarter past
    const face = B.ring(B.ellipsePts(0, 0, 300 * k, 300 * k, 0, 96));
    const tone = B.formTone(face.polys, { light: LIGHT, base: 0.1 });
    ink.group('pol'); for (const p of face.polys) B.outline(ink, p, { w: 2.0, light: LIGHT });
    for (let h = 0; h < 12; h++) { const a = h / 12 * Math.PI * 2; B.stroke(ink, [[Math.cos(a) * 250 * k, Math.sin(a) * 250 * k], [Math.cos(a) * 285 * k, Math.sin(a) * 285 * k]], 1.6); }
    B.stroke(ink, [[0, 0], [0, -200 * k]], 2.4); B.stroke(ink, [[0, 0], [150 * k, 30 * k]], 2.0);
    ink.group('ph1'); B.hatch(ink, face.polys, { angle: -0.6, spacing: 3.6, tone, thr: 0.3, wMax: 1.1 });
    ink.group('ph2'); ink.group('ph3');
  } else {   // a sealed letter with a heart on the seal
    engraveShape('M-300 -190 L300 -190 L300 190 L-300 190 Z', at, ink, 'p', 4.0 / k);
    ink.group('pol');
    B.stroke(ink, [[-300 * k, -190 * k], [0, 40 * k], [300 * k, -190 * k]], 1.6);
    B.outline(ink, B.ellipsePts(0, 40 * k, 62 * k, 62 * k, 0, 48), { w: 1.6, light: LIGHT });
    B.stroke(ink, [[-22 * k, 30 * k], [0, 62 * k], [22 * k, 30 * k]], 1.3);
  }
  const t0 = RD[i].at + 0.35;
  ink.schedule('pol', t0, t0 + 0.6, { conc: 3 }); ink.schedule('ph1', t0 + 0.4, t0 + 1.0, { conc: 40 });
  ink.schedule('ph2', t0 + 0.7, t0 + 1.2, { conc: 40 }); ink.schedule('ph3', t0 + 0.9, t0 + 1.3, { conc: 30 });
  ink.build(); return ink;
}
function engraveShape(d, at, ink, g, spacing) {
  const sh = B.shape(d, at), tone = B.formTone(sh.polys, { light: LIGHT, base: 0.06 });
  ink.group(g + 'ol'); for (const p of sh.polys) B.outline(ink, p, { w: 1.8, light: LIGHT });
  ink.group(g + 'h1'); B.hatch(ink, sh.polys, { angle: -0.6, spacing: spacing * 0.2, tone, thr: 0.12, wMax: 1.2 });
  ink.group(g + 'h2'); B.hatch(ink, sh.polys, { angle: 0.45, spacing: spacing * 0.22, tone, thr: 0.5, wMax: 0.9 });
  ink.group(g + 'h3'); B.hatch(ink, sh.polys, { angle: -0.1, spacing: spacing * 0.26, tone, thr: 0.76, wMax: 0.7 });
}
const RINK = [0, 1, 2].map(roundelInk);

// ---------- the hidden detail: initials, a heart and a birthstone on the inner band (magnified roundel) ----------
const DET = { x: SPOT.x, y: SPOT.y, r0: 80, r1: 260, sx: 790, sy: 1425, sr: 135 };   // scribed round the spot, re-cut larger, then flown to its slot
const sapphire = B.ring(B.ellipsePts(175, 10, 34, 30, 0, 48));
const detInk = (() => {
  const ink = new B.Ink();
  ink.group('s'); for (const p of sapphire.polys) B.outline(ink, p, { w: 1.5, light: LIGHT });
  const st = B.sphereTone(175, 4, 32, 28, { base: 0.1 });
  for (let k = 0; k < 6; k++) { const a = k / 6 * Math.PI * 2; B.stroke(ink, [[175, 10], [175 + Math.cos(a) * 34, 10 + Math.sin(a) * 30]], 0.7); }
  ink.group('sh'); B.hatch(ink, sapphire.polys, { angle: -0.5, spacing: 3.0, tone: st, thr: 0.25, wMax: 1.0 });
  // the band surface inside the roundel: long, gently curved burin lines
  ink.group('b');
  for (let k = -5; k <= 5; k++) { const y = k * 26; B.stroke(ink, [[-280, y + 30], [0, y - 6 + Math.abs(k) * 2], [280, y + 30]], 0.55 + (k > 2 ? 0.4 : 0)); }
  ink.schedule('b', T.really - 0.1, T.really + 0.5, { conc: 11 }); ink.schedule('s', T.means + 0.3, T.means + 0.75, { conc: 4 }); ink.schedule('sh', T.means + 0.55, T.everything - 0.05, { conc: 30 });
  ink.build(); return ink;
})();

// ---------- hand colouring (only at the reveal) ----------
const wash = new Wash({ scale: 1.4 });
wash.add({ path: stone.path, polys: stone.polys, color: '#a8323f', origin: [BZ.x - 30, BZ.top - 50], t0: T.everything + 0.15, dur: 1.3, alpha: 0.82 });
wash.add({ path: front.path, polys: front.polys, color: '#c9a14a', origin: [RC.x - 200, RC.y + 90], t0: T.everything + 0.5, dur: 1.5, alpha: 0.5 });
wash.add({ path: back.path, polys: back.polys, color: '#c9a14a', origin: [RC.x + 180, RC.y - 110], t0: T.everything + 0.75, dur: 1.4, alpha: 0.42 });
wash.add({ path: bezel.path, polys: bezel.polys, color: '#c9a14a', origin: [BZ.x, BZ.bot], t0: T.everything + 0.6, dur: 1.2, alpha: 0.5 });
const washDet = new Wash({ scale: 1.4 });
washDet.add({ path: sapphire.path, polys: sapphire.polys, color: '#2e4f9e', origin: [170, 0], t0: T.everything + 0.05, dur: 1.0, alpha: 0.85 });

// border, cut once at the start of state B and present thereafter (state A: already cut)
const border = new B.Ink(); border.group('b'); borderInk(border, [P[0] + 26, P[1] + 26, P[2] - 26, P[3] - 26]); border.instant('b'); border.build();

// ---------- camera: a loupe over the sheet ----------
const ease = x => x < 0 ? 0 : x > 1 ? 1 : x * x * (3 - 2 * x);
function cam(t) {
  let z = 1, f = [W / 2, H / 2];
  if (t < T.A[1]) {                                     // breathing, then push to the bare spot at "detail"
    const p = ease((t - T.detail) / 1.3); z = 1 + 0.015 * Math.min(1, t / 4) + p * 1.55; f = [W / 2 + (SPOT.x - W / 2) * p, H / 2 + (SPOT.y - H / 2) * p];
  } else if (t >= T.C[0] && t < T.C[1]) {               // push into the spot, ride the roundel, pull back for the colour
    const pin = ease((t - T.C[0]) / 0.55), pout = ease((t - (T.everything - 0.1)) / 0.9);
    const zin = 1 + 1.15 * pin, zz = zin + (1.05 - zin) * pout; z = zz;
    const fx = W / 2 + (DET.x - W / 2) * pin * (1 - pout), fy = H / 2 + (DET.y - H / 2) * pin * (1 - pout); f = [fx, fy];
  }
  return { z, f };
}

const inside = (t, [a, b]) => t >= a && t < b;
window.render = (t) => {
  ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
  const state = inside(t, T.A) ? 'A' : (inside(t, T.B1) || inside(t, T.B2)) ? 'B' : inside(t, T.C) ? 'C' : t >= T.D[0] ? 'D' : null;
  if (!state) return;                                   // her full-screen sections are composited outside this page
  const { z, f } = cam(t);
  ctx.setTransform(z, 0, 0, z, W / 2 - f[0] * z, H / 2 - f[1] * z);
  drawSheet(ctx, { W, H, plate: P });
  // colour sits under the ink
  if (state === 'C' || state === 'D') { wash.draw(ctx, t); }
  border.draw(ctx, Infinity);
  // the ring
  const ring = state === 'A' ? ringA : ringB;
  ring.draw(ctx, state === 'A' ? Infinity : t);
  // the bare spot: burnished copper left uncut (A, B), later cut (C, D)
  const cutSpot = state === 'C' ? ease((t - T.hold) / 0.6) : state === 'D' ? 1 : 0;
  const spotOn = state === 'A' || state === 'C' || (state === 'B' && t > T.outline + 1.2);
  if (spotOn) {
    ctx.save(); ctx.globalAlpha = 0.85 * (1 - cutSpot); ctx.fillStyle = '#f4ecd9'; ctx.fill(spot.path);
    ctx.strokeStyle = 'rgba(120,90,50,0.35)'; ctx.lineWidth = 0.8; ctx.stroke(spot.path); ctx.restore();
  }
  // lettering
  engraveText(ctx, 'TAKSHILA  ·  CUSTOM JEWELLERY', W / 2, P[1] + 70, { size: 17, weight: 600, track: 0.22, p: state === 'A' ? (t - 0.1) / 0.8 : 1 });
  engraveText(ctx, 'PL. IV', P[2] - 60, P[1] + 70, { size: 17, weight: 600, track: 0.2, align: 'right', p: 1 });
  if (state === 'A') {
    engraveText(ctx, 'THE FINISHED PIECE.', W / 2, 420, { size: 50, weight: 600, track: 0.14, p: (t - T.title) / 1.3 });
    engraveText(ctx, 'beautiful, but not yet personal', W / 2, 465, { size: 24, italic: true, weight: 500, p: (t - 1.6) / 1.0 });
    roundelFrame(ctx, MAKER.x, MAKER.y, MAKER.r + 8, { p: (t - 0.2) / 0.7, w: 2.4 });
    engraveText(ctx, 'FIG. I  ·  THE MAKER', MAKER.x, MAKER.y + MAKER.r + 50, { size: 17, weight: 600, track: 0.18, p: (t - 0.8) / 0.8 });
    leader(ctx, [SPOT.x + 20, SPOT.y + 8], [760, 1290], { p: (t - 2.3) / 0.6, w: 0.9 });
    engraveText(ctx, 'fig. II  —  ?', 760, 1325, { size: 24, italic: true, weight: 500, p: (t - 2.8) / 0.6 });
  }
  if (state === 'B' || state === 'C' || state === 'D') {
    for (let i = 0; i < 3; i++) {
      const R = RD[i], p = (t - R.at) / 0.35;
      if (p <= 0) continue;
      // ruled ground and the content, scaled in from the roundel's centre
      ctx.save(); ctx.beginPath(); ctx.arc(R.x, R.y, R.r - 6, 0, 7); ctx.clip();
      ctx.strokeStyle = 'rgba(28,21,16,0.18)'; ctx.lineWidth = 0.5;
      for (let y = R.y - R.r; y < R.y + R.r; y += 9) { ctx.beginPath(); ctx.moveTo(R.x - R.r, y); ctx.lineTo(R.x + R.r, y); ctx.stroke(); }
      ctx.translate(R.x, R.y); RINK[i].draw(ctx, t, { view: null }); ctx.restore();
      roundelFrame(ctx, R.x, R.y, R.r, { p, w: 2.2 });
      engraveText(ctx, R.label, R.x, R.y + R.r + 40, { size: 16, weight: 600, track: 0.16, p: (t - R.at - 0.4) / 0.6 });
      engraveText(ctx, R.fig, R.x, R.y + R.r + 66, { size: 18, italic: true, weight: 500, p: (t - R.at - 0.6) / 0.4 });
    }
    // the design: metal and proportions, cut as their passes run
    const lp = (t - T.metal - 0.3) / 0.5;
    leader(ctx, [RC.x - 285, RC.y + 40], [150, 1330], { p: lp, w: 0.9 });
    engraveText(ctx, '18K GOLD', 120, 1365, { size: 18, weight: 600, track: 0.16, align: 'left', p: (t - T.metal - 0.6) / 0.6 });
    engraveText(ctx, 'the metal', 120, 1392, { size: 20, italic: true, weight: 500, align: 'left', p: (t - T.metal - 0.9) / 0.5 });
    const sp = (t - T.proportions - 0.3) / 0.7;
    if (sp > 0) {   // a scale rule under the ring
      ctx.save(); ctx.strokeStyle = PAL.ink; ctx.lineWidth = 1.2; const x0 = RC.x - 300, x1 = x0 + 600 * Math.min(1, sp);
      ctx.beginPath(); ctx.moveTo(x0, 1255); ctx.lineTo(x1, 1255); ctx.stroke();
      for (let k = 0; k <= 10; k++) { const x = x0 + k * 60; if (x > x1) break; ctx.beginPath(); ctx.moveTo(x, 1255); ctx.lineTo(x, k % 5 ? 1245 : 1237); ctx.stroke(); }
      ctx.restore();
      engraveText(ctx, 'PROPORTIONS  ·  SCALE 3 : 1', RC.x, 1292, { size: 16, weight: 600, track: 0.16, p: (t - T.proportions - 0.8) / 0.6 });
    }
    if (state === 'B') engraveText(ctx, 'balanced · wearable · theirs', 460, 1480, { size: 30, italic: true, weight: 500, p: (t - T.theirs + 1.6) / 1.0 });
  }
  // the hidden detail (C, D): scribed round the spot, burnished, re-cut larger, then flown to its slot
  if (state === 'C' || state === 'D') {
    const pr = state === 'D' ? 1 : ease((t - T.hold) / 0.5), grow = state === 'D' ? 1 : ease((t - T.really + 0.25) / 0.6);
    const fly = state === 'D' ? 1 : ease((t - T.everything - 0.25) / 0.9);
    const lift = Math.sin(Math.PI * fly) * 40;
    const cx = DET.x + (DET.sx - DET.x) * fly, cy = DET.y + (DET.sy - DET.y) * fly - lift;
    const rBig = DET.r0 + (DET.r1 - DET.r0) * grow, r = rBig * Math.pow(DET.sr / DET.r1, fly);
    if (pr > 0) {
      ctx.save(); ctx.beginPath(); ctx.arc(cx, cy, r - 6, 0, 7); ctx.clip();
      ctx.fillStyle = 'rgba(244,236,217,0.97)'; ctx.fill();                       // burnished clean
      ctx.translate(cx, cy); ctx.scale(r / DET.r1, r / DET.r1);
      washDet.draw(ctx, t);
      detInk.draw(ctx, t, { view: null });
      writeScript(ctx, 'A & M', -55, 22, { size: 108, p: state === 'D' ? 1 : (t - T.means + 0.15) / 0.8 });
      const hp = state === 'D' ? 1 : ease((t - T.means - 0.6) / 0.4);
      if (hp > 0) { ctx.globalAlpha = hp; ctx.strokeStyle = PAL.ink; ctx.lineWidth = 2.6; ctx.beginPath();
        const hx = 92, hy = -46; ctx.moveTo(hx, hy + 14); ctx.bezierCurveTo(hx - 26, hy - 6, hx - 12, hy - 26, hx, hy - 12); ctx.bezierCurveTo(hx + 12, hy - 26, hx + 26, hy - 6, hx, hy + 14); ctx.stroke(); ctx.globalAlpha = 1; }
      ctx.restore();
      roundelFrame(ctx, cx, cy, r, { p: pr, w: 2.4 });
      if (fly > 0.02) leader(ctx, [SPOT.x + 10, SPOT.y + 10], [cx - r * 0.55, cy - r * 0.8], { p: fly, w: 0.9 });
    }
    engraveText(ctx, 'FIG. II  ·  THE DETAIL', 120, 1470, { size: 17, weight: 600, track: 0.18, align: 'left', p: state === 'D' ? 1 : (t - T.everything - 0.9) / 0.7 });
    engraveText(ctx, 'initials & a birthstone,', 120, 1500, { size: 21, italic: true, weight: 500, align: 'left', p: state === 'D' ? 1 : (t - T.everything - 1.1) / 0.5 });
    engraveText(ctx, 'inner band', 120, 1527, { size: 21, italic: true, weight: 500, align: 'left', p: state === 'D' ? 1 : (t - T.everything - 1.3) / 0.4 });
  }
  if (state === 'D') {
    const e = t - T.end;
    engraveText(ctx, 'THE DETAIL.', W / 2, 392, { size: 56, weight: 600, track: 0.16, p: (e - 0.2) / 1.0 });
    engraveText(ctx, 'a ring for A & M', W / 2, 432, { size: 26, italic: true, weight: 500, p: (e - 0.9) / 0.8 });
    engraveText(ctx, 'takshila.co', 330, 1585, { size: 34, weight: 600, track: 0.12, p: (e - 1.5) / 0.8 });
    engraveText(ctx, 'TAKSHILA SCULP.', 860, P[3] - 46, { size: 13, weight: 600, track: 0.2, align: 'right', p: (e - 2.4) / 0.6 });
  }
};

// sound and cue events for the mixer (window.EV)
window.EV = [
  { t: T.title, type: 'letters', dur: 1.3 }, { t: T.detail, type: 'loupe' },
  ...RD.map(R => ({ t: R.at, type: 'scribe' })), ...RD.map(R => ({ t: R.at + 0.35, type: 'cut', dur: 1.0 })),
  { t: T.outline, type: 'cut', dur: 1.6 }, { t: T.metal, type: 'hatch', dur: 1.4 }, { t: T.proportions, type: 'hatch', dur: 2.4 },
  { t: T.hold, type: 'scribe' }, { t: T.really - 0.1, type: 'burnish', dur: 0.6 }, { t: T.means - 0.15, type: 'script', dur: 0.8 },
  { t: T.everything + 0.05, type: 'water' }, { t: T.everything + 0.5, type: 'water' }, { t: T.everything + 0.75, type: 'water' },
  { t: T.end + 0.2, type: 'letters', dur: 1.0 }, { t: T.end + 1.5, type: 'letters', dur: 0.8 }, { t: T.end + 2.4, type: 'thump' },
];
window.MAKER = MAKER;
window.READY = true;
