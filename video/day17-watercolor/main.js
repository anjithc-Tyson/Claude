// Day 17 insert, Watercolor Brush: a gold ring paints itself on warm paper, the camera leans into the inside of the
// band, and the engraving "A + R · 14.02.2024" is written there in ink as Susanna says it. Then it pulls back for the
// end card (whose text is set in the Remotion edit). Canvas 1080×1920, pure function of t.
// Timings (insert seconds) match the cut: A + R at 3.97, the date at 6.25, insert ends at 9.95, end card to 13.55.
const cv = document.getElementById('c'), ctx = cv.getContext('2d');
const CW = 1080, CH = 1920;
window.DUR = 13.55;
const T = {paint0: 0.5, paint1: 3.6, push0: 3.4, push1: 5.6, aR: 3.97, date: 6.25, cut: 9.95};
const OCHRE_L = '#E9CB82', OCHRE = '#D3A651', OCHRE_D = '#B1823A', UMBER = '#7E5A2A', BLUEGREY = '#9FB4C4', TERRA = '#E2725B';
let PAPER_IMG, G = {};

function washPoly(c, pts, fill, a, passes = 3, jit = 5) {
	for (let p = 0; p < passes; p++) {
		c.beginPath(); pts.forEach(([x, y], i) => { const yy = y + (i % 3 === 0 ? rnd(-jit, jit) : 0); i ? c.lineTo(x + rnd(-jit, jit) * .5, yy) : c.moveTo(x, yy); });
		c.closePath(); c.globalAlpha = a / passes * 1.6; c.fillStyle = fill; c.fill();
	}
	c.globalAlpha = 1;
}
// ring geometry (world coords = canvas coords before camera)
const C = {x: 540, y: 780}, RX = 380, RY = 140, DH = 96, IRX = 346, IRY = 122;
const ell = (cx, cy, rx, ry, a0, a1, n = 40) => { const o = []; for (let i = 0; i <= n; i++) { const a = a0 + (a1 - a0) * i / n; o.push([cx + rx * Math.cos(a), cy + ry * Math.sin(a)]); } return o; };
const FAR0 = Math.PI * 1.04, FAR1 = Math.PI * 1.96;   // far (upper) arc
const NEAR0 = Math.PI * 0.02, NEAR1 = Math.PI * 0.98; // near (lower) arc

function build() {
	// pooled base washes (back wall, front wall), painted before the strokes
	G.wash = document.createElement('canvas'); G.wash.width = CW; G.wash.height = CH;
	{ const c = G.wash.getContext('2d');
		const far = (dy, rx, ry) => ell(C.x, C.y + dy, rx, ry, FAR0, FAR1, 40), near = (dy, rx, ry) => ell(C.x, C.y + dy, rx, ry, NEAR0, NEAR1, 40);
		washPoly(c, [...far(0, IRX, IRY), ...far(DH, IRX, IRY).reverse()], OCHRE_L, .5, 3, 4);
		washPoly(c, [...near(0, RX, RY), ...near(DH, RX, RY).reverse()], OCHRE, .5, 3, 4);
		washPoly(c, [...near(DH * .6, RX, RY), ...near(DH, RX, RY).reverse()], OCHRE_D, .35, 3, 3); }
	// soft shadow on the paper
	G.shadow = []; for (let i = 0; i < 6; i++) G.shadow.push(mk(ell(C.x + 10, C.y + DH + 70 + i * 6, RX * (1.02 - i * .03), 40 - i * 3, NEAR0 - .1, NEAR1 + .1, 30), 26, '#8f8478', {prof: 'even', nb: 3, a: .16, rough: .35}));
	// back inner wall: bands following the far arc, top light, a bare-paper highlight, darker below
	G.back = [];
	const rows = 7;
	for (let r = 0; r < rows; r++) {
		if (r === 2) continue; // left unpainted: the polished highlight
		const k = r / (rows - 1), y = C.y + k * DH, col = k < .3 ? OCHRE_L : k < .65 ? OCHRE : OCHRE_D;
		G.back.push(mk(ell(C.x + rnd(-6, 6), y + rnd(-3, 3), IRX - 4, IRY - 4, FAR0 + rnd(0, .06), FAR1 - rnd(0, .06), 34), rnd(13, 20), col, {prof: 'brush', nb: 5, a: .45, rough: .4}));
	}
	G.back.push(mk(ell(C.x, C.y + DH * .92, IRX - 6, IRY - 8, FAR0 + .05, FAR1 - .05, 34), 16, UMBER, {prof: 'even', nb: 4, a: .38, rough: .3}));
	// top rim face (the ring's upper edge, seen from above)
	G.rim = [];
	for (const [rr, col, a] of [[0, OCHRE, .7], [.5, OCHRE_L, .55], [1, OCHRE_D, .5]]) {
		const rx = IRX + (RX - IRX) * rr, ry = IRY + (RY - IRY) * rr;
		G.rim.push(mk(ell(C.x, C.y, rx, ry, -Math.PI * .02, Math.PI * 1.02, 44), 16, col, {prof: 'even', nb: 4, a, rough: .25}));
		G.rim.push(mk(ell(C.x, C.y, rx, ry, Math.PI * .98, Math.PI * 2.02, 44), 16, col, {prof: 'even', nb: 4, a, rough: .25}));
	}
	// front outer wall: bands following the near arc, darker toward the bottom
	G.front = [];
	for (let r = 0; r < 6; r++) {
		const k = r / 5, y = C.y + 10 + k * (DH - 4), col = k < .25 ? OCHRE_L : k < .6 ? OCHRE : k < .85 ? OCHRE_D : UMBER;
		if (r === 1) continue; // a second highlight on the near side
		G.front.push(mk(ell(C.x + rnd(-5, 5), y + rnd(-3, 3), RX + 2, RY + 2, NEAR1 - rnd(0, .05), NEAR0 + rnd(0, .05), 36), rnd(16, 24), col, {prof: 'brush', nb: 6, a: .5, rough: .4}));
	}
	// ink edges (the only "lines": darker edge strokes along the form)
	G.edge = [
		mk(ell(C.x, C.y, RX, RY, -Math.PI * .02, Math.PI * 2.02, 70), 3.2, INK2, {prof: 'even', nb: 0, a: .6, rough: .4}),
		mk(ell(C.x, C.y, IRX, IRY, FAR0 - .1, FAR1 + .1, 50), 2.6, INK2, {prof: 'even', nb: 0, a: .55, rough: .4}),
		mk(ell(C.x, C.y + DH, RX, RY, NEAR1 + .03, NEAR0 - .03, 50), 3.4, INK2, {prof: 'even', nb: 0, a: .6, rough: .4}),
		mk([[C.x - RX, C.y], [C.x - RX + 1, C.y + DH]], 3, INK2, {prof: 'even', nb: 0, a: .55}),
		mk([[C.x + RX, C.y], [C.x + RX - 1, C.y + DH]], 3, INK2, {prof: 'even', nb: 0, a: .55}),
	];
	// the stone: a round brilliant on the far rim, blue-grey washes, bare-paper light, ink facets
	const sx = C.x, sy = C.y - RY - 52, R0 = 64;
	G.stone = [];
	for (let i = 0; i < 26; i++) { const a = rnd(0, Math.PI * 2), rr = rnd(.2, 1) * R0; G.stone.push(mk(polar(sx + Math.cos(a) * rr * .35, sy + 10 + Math.sin(a) * rr * .25, a, rr * .7, rnd(-5, 5), 5), rnd(12, 22), pick([BLUEGREY, '#c4d1da', '#7f97a8', '#d9e2e8']), {prof: 'leaf', nb: 2, a: rnd(.25, .5), rough: .35})); }
	const gir = ell(sx, sy + 22, R0, 22, 0, Math.PI * 2, 40);
	G.stone.push(mk(gir, 2.8, INK2, {prof: 'even', nb: 0, a: .72, rough: .3}));
	const tl = [sx - R0 * .55, sy - 34], tr = [sx + R0 * .55, sy - 34];
	G.stone.push(mk([[sx - R0, sy + 22], tl, tr, [sx + R0, sy + 22]], 2.6, INK2, {prof: 'even', nb: 0, a: .7, rough: .3}));
	for (const f of [-1, -.5, 0, .5, 1]) G.stone.push(mk([[sx + f * R0 * .55, sy - 34], [sx + f * R0 * .9, sy + 22]], 1.6, INK2, {prof: 'even', nb: 0, a: .4}));
	G.stone.push(mk([[sx - R0, sy + 22], [sx, sy + 66], [sx + R0, sy + 22]], 2.2, INK2, {prof: 'even', nb: 0, a: .5, rough: .3}));
	for (const f of [-.5, 0, .5]) G.stone.push(mk([[sx + f * R0, sy + 24], [sx, sy + 64]], 1.3, INK2, {prof: 'even', nb: 0, a: .3}));
	G.stoneFill = [[sx - R0, sy + 22], [sx - R0 * .55, sy - 34], [sx + R0 * .55, sy - 34], [sx + R0, sy + 22], [sx, sy + 66]];
	for (const dx of [-46, 46]) G.stone.push(mk(qcurve(sx + dx, sy + 30, sx + dx * 1.1, sy + 58, dx > 0 ? 4 : -4, 6), 12, OCHRE_D, {prof: 'tip', nb: 3, a: .85}));
	// sprites of finished groups
	for (const k of ['shadow', 'back', 'rim', 'front', 'edge', 'stone']) G[k + 'Spr'] = sprite(G[k]);
}

// engraving text laid along the middle of the back wall, one glyph at a time
const ENG = [{s: 'A', t: 0}, {s: '+', t: 1, acc: true}, {s: 'R', t: 2}, {s: '·', t: 3}, {s: '1', t: 4}, {s: '4', t: 5}, {s: '.', t: 6}, {s: '0', t: 7}, {s: '2', t: 8}, {s: '.', t: 9}, {s: '2', t: 10}, {s: '0', t: 11}, {s: '2', t: 12}, {s: '4', t: 13}];
const GAP = [0, .8, .8, 1.0, 1.0, 0, 0, 0, 0, 0, 0, 0, 0, 0]; // extra space before a glyph (in spaces)
function glyphTimes() {
	const aR = [T.aR - .05, T.aR + .85], dt = [T.date + .05, T.date + 2.4];
	return ENG.map((g, i) => (i < 3 ? aR[0] + (aR[1] - aR[0]) * i / 3 : dt[0] + (dt[1] - dt[0]) * (i - 3) / (ENG.length - 3)));
}
function engraving(t) {
	const size = 54, ecx = C.x, ecy = C.y + DH * .55, erx = IRX - 24, ery = IRY - 6;
	ctx.save();
	ctx.font = `italic 400 ${size}px "Instrument Serif"`;
	const sp = ctx.measureText(' ').width * .55;
	const ws = ENG.map((g) => ctx.measureText(g.s).width);
	const total = ws.reduce((a, b) => a + b, 0) + GAP.reduce((a, b) => a + b, 0) * sp + (ENG.length - 1) * 3;
	// arc length → angle on the far arc (approximate by x across the ellipse)
	const t0s = glyphTimes();
	let x = -total / 2;
	ENG.forEach((g, i) => {
		x += GAP[i] * sp;
		const mid = x + ws[i] / 2, u = clamp(mid / erx, -.98, .98), ang = -Math.PI / 2 + Math.asin(u) * 1.0;
		const px = ecx + erx * u, py = ecy - ery * Math.sqrt(1 - u * u);
		const rot = Math.atan2(ery * u / Math.sqrt(1 - u * u + 1e-6), erx);
		const p = seg(t, t0s[i], t0s[i] + .32);
		if (p > 0) {
			ctx.save(); ctx.translate(px, py); ctx.rotate(rot); ctx.scale(1 - Math.abs(u) * .18, 1);
			ctx.beginPath(); ctx.rect(-ws[i] / 2 - 4, -size, (ws[i] + 8) * eo(p), size * 1.6); ctx.clip();
			ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
			ctx.fillStyle = rgba('#F7E8BE', .55); ctx.fillText(g.s, 0, 2);            // light lower lip of the cut
			ctx.fillStyle = rgba(g.acc ? TERRA : '#4E3412', .88); ctx.fillText(g.s, 0, 0); // the engraved groove
			ctx.restore();
		}
		x += ws[i] + 3;
	});
	ctx.restore();
}

function label(txt, y, a) {
	if (a <= 0) return;
	ctx.save(); ctx.font = '500 30px "Afacad Flux"'; ctx.letterSpacing = '10px'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
	ctx.shadowColor = rgba(PAPER, .95); ctx.shadowBlur = 10; ctx.fillStyle = rgba('#6F6658', a); ctx.fillText(txt, CW / 2 + 5, y); ctx.restore();
}

function draw(L, spr, p) {
	if (p <= 0) return;
	if (p >= 1) ctx.drawImage(spr.cv, spr.x0, spr.y0); else drawList(ctx, L, p);
}

function render(t) {
	ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1; ctx.drawImage(PAPER_IMG, 0, 0);
	// camera: locked sheet while it paints, lean into the band, then pull back and lower for the end card
	const push = eio(seg(t, T.push0, T.push1)), back = eio(seg(t, T.cut, T.cut + 1.3));
	const z = lerp(lerp(1.0, 1.7, push), 0.95, back) + .012 * Math.sin(t * .6);
	const fx = C.x, fy = lerp(C.y + DH * .3, C.y + DH * .55 - IRY + 6, push);
	const ty = lerp(0, 330, back);
	const sk = .004 * Math.sin(t * 1.15) * seg(t, T.paint1, T.paint1 + 1);
	ctx.setTransform(z, 0, sk * z, z, CW / 2 - fx * z, 860 + ty - fy * z);
	// a wet bloom of gold under everything as the first touch
	const bloom = ss(seg(t, 0.15, 0.9));
	if (bloom > 0) { const g = ctx.createRadialGradient(C.x, C.y + 40, 10, C.x, C.y + 40, 520); g.addColorStop(0, rgba('#E9CB82', .22 * bloom)); g.addColorStop(1, rgba('#E9CB82', 0)); ctx.fillStyle = g; ctx.fillRect(C.x - 600, C.y - 560, 1200, 1200); }
	const P = (a, b) => seg(t, a, b);
	draw(G.shadow, G.shadowSpr, P(0.5, 1.1));
	{ const w = P(0.55, 1.6); if (w > 0) { ctx.save(); ctx.beginPath(); ctx.rect(C.x - RX - 60, 0, (2 * RX + 120) * eo(w), CH); ctx.clip(); ctx.globalAlpha = ss(w); ctx.drawImage(G.wash, 0, 0); ctx.restore(); } }
	draw(G.back, G.backSpr, P(0.7, 2.1));
	draw(G.rim, G.rimSpr, P(1.5, 2.6));
	draw(G.front, G.frontSpr, P(1.9, 3.0));
	draw(G.edge, G.edgeSpr, P(2.7, 3.4));
	{ const q = P(2.9, 3.2); if (q > 0) { ctx.beginPath(); G.stoneFill.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y))); ctx.closePath(); ctx.fillStyle = rgba(PAPER, .96 * q); ctx.fill(); } }
	draw(G.stone, G.stoneSpr, P(2.9, 3.6));
	engraving(t);
	ctx.setTransform(1, 0, 0, 1, 0, 0);
	// labels in the series style (Afacad, tracked)
	label('THE PART NOBODY SEES', 150, ss(P(0.8, 1.4)) * (1 - ss(P(T.aR - .4, T.aR))));
	label('INSIDE THE BAND', 150, ss(P(T.aR, T.aR + .6)) * (1 - ss(P(T.cut - .3, T.cut))));
}
window.render = render;
window.TEXTS = () => [];
(async () => {
	PAPER_IMG = new Image(); PAPER_IMG.src = 'paper.jpg'; await PAPER_IMG.decode();
	await document.fonts.load('italic 400 58px "Instrument Serif"'); await document.fonts.load('500 30px "Afacad Flux"');
	withSeed(17, build);
	window.READY = true;
})();
