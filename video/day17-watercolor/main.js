// Day 17 insert, Watercolor Brush: a gold solitaire ring standing upright on warm paper paints itself, seen from the
// front and slightly above. Through its opening we see the inside of the band at the bottom; the camera glides in and
// the engraving "A + R · 14.02.2024" is written along that inner curve as Susanna says it, then pulls back for the end
// card (text set in the Remotion edit). Canvas 1080×1920, pure function of t.
// Timings (insert seconds): A + R at 3.97, the date at 6.25, insert ends at 9.95, end card to 13.55.
const cv = document.getElementById('c'), ctx = cv.getContext('2d');
const CW = 1080, CH = 1920;
window.DUR = 13.55;
const T = {push0: 3.3, push1: 5.4, aR: 3.97, date: 6.25, cut: 9.95};
const OCHRE_L = '#EBCD86', OCHRE = '#D3A651', OCHRE_D = '#AE7F38', UMBER = '#7A5627', BLUEGREY = '#9FB4C4', TERRA = '#E2725B';
let PAPER_IMG, G = {};

// geometry: front face of the band (annulus), and the band's depth seen from slightly above (offset d upward)
const C = {x: 540, y: 900}, R = 300, r = 252, d = 74;
const arc = (cx, cy, rad, a0, a1, n = 48) => { const o = []; for (let i = 0; i <= n; i++) { const a = a0 + (a1 - a0) * i / n; o.push([cx + rad * Math.cos(a), cy + rad * Math.sin(a)]); } return o; };
// the front and back inner circles meet where the inner band disappears from view
const XI = Math.sqrt(r * r - (d / 2) * (d / 2)), AF = Math.atan2(-d / 2, XI), AB = Math.atan2(d / 2, XI);
function washPoly(c, pts, fill, a, passes = 3, jit = 4) {
	for (let p = 0; p < passes; p++) {
		c.beginPath(); pts.forEach(([x, y], i) => (i ? c.lineTo(x + rnd(-jit, jit) * .5, y + rnd(-jit, jit)) : c.moveTo(x, y)));
		c.closePath(); c.globalAlpha = a / passes * 1.6; c.fillStyle = fill; c.fill();
	}
	c.globalAlpha = 1;
}

function build() {
	// visible inner band (bottom crescent): inside the front inner circle, outside the back inner circle
	const innerFront = arc(C.x, C.y, r, AF, Math.PI - AF, 60);
	const innerBack = arc(C.x, C.y - d, r, Math.PI - AB, AB, 60);
	// top outer surface (crescent above the front outer circle, where the stone sits)
	const outerBack = arc(C.x, C.y - d, R, Math.PI * 1.02, Math.PI * 1.98, 60);
	const outerFrontTop = arc(C.x, C.y, R, Math.PI * 1.98, Math.PI * 1.02, 60);
	G.wash = document.createElement('canvas'); G.wash.width = CW; G.wash.height = CH;
	{ const c = G.wash.getContext('2d');
		washPoly(c, [...innerFront, ...innerBack], OCHRE, .55);
		washPoly(c, [...arc(C.x, C.y, r, AF + .25, Math.PI - AF - .25, 40), ...arc(C.x, C.y - d * .45, r, Math.PI - AB - .3, AB + .3, 40)], OCHRE_D, .35);
		washPoly(c, [...outerBack, ...outerFrontTop], OCHRE_L, .5);
		washPoly(c, [...arc(C.x, C.y, R, 0, Math.PI * 2, 90), ...arc(C.x, C.y, r, Math.PI * 2, 0, 80)], OCHRE, .5, 3, 3);
	}
	// soft shadow on the paper under the ring
	G.shadow = []; for (let i = 0; i < 6; i++) G.shadow.push(mk(arc(C.x + 14, 0, R * (1.0 - i * .06), Math.PI * .1, Math.PI * .9, 24).map(([x, y]) => [x, C.y + R - 26 + y * .09 + i * 3]), 24, '#8f8478', {prof: 'even', nb: 3, a: .15, rough: .35}));
	// front face strokes running around the band: light upper left, bare-paper highlight, darker lower right
	G.face = [];
	const rings = 6;
	for (let k = 0; k < rings; k++) {
		const rad = r + 4 + (R - r - 8) * k / (rings - 1);
		for (const [a0, a1, col, a] of [[Math.PI * .95, Math.PI * 1.55, OCHRE_L, .5], [Math.PI * 1.7, Math.PI * 2.35, OCHRE, .55], [Math.PI * .1, Math.PI * .85, OCHRE_D, .55], [Math.PI * 2.35, Math.PI * 2.62, UMBER, .35]]) {
			if (k === 2 && col === OCHRE_L) continue; // the highlight left as paper
			G.face.push(mk(arc(C.x + rnd(-2, 2), C.y + rnd(-2, 2), rad, a0 + rnd(-.05, .05), a1 + rnd(-.05, .05), 30), rnd(9, 13), col, {prof: 'brush', nb: 4, a, rough: .35}));
		}
	}
	// inner band strokes (the inside surface, where the engraving goes): deeper at the far edge, lighter toward us
	G.inner = [];
	for (let k = 0; k < 5; k++) {
		const f = k / 4, cy = C.y - d * (1 - f) + rnd(-2, 2), col = f < .35 ? OCHRE_D : f < .7 ? OCHRE : OCHRE_L;
		if (k === 3) continue; // a soft highlight inside
		G.inner.push(mk(arc(C.x, cy, r - 2, AF + .12 + rnd(0, .05), Math.PI - AF - .12 - rnd(0, .05), 40), rnd(12, 17), col, {prof: 'brush', nb: 5, a: .5, rough: .38}));
	}
	// top surface strokes
	G.top = [];
	for (let k = 0; k < 4; k++) { const cy = C.y - d * (k / 3); G.top.push(mk(arc(C.x, cy, R - 4, Math.PI * 1.1 + rnd(0, .04), Math.PI * 1.9 - rnd(0, .04), 36), rnd(11, 15), k < 2 ? OCHRE_L : OCHRE, {prof: 'brush', nb: 4, a: .45, rough: .35})); }
	// ink edges: the only lines, darker strokes along the form
	G.edge = [
		mk(arc(C.x, C.y, R, -Math.PI * .02, Math.PI * 2.02, 90), 3.2, INK2, {prof: 'even', nb: 0, a: .62, rough: .4}),
		mk(arc(C.x, C.y, r, -Math.PI * .02, Math.PI * 2.02, 80), 2.8, INK2, {prof: 'even', nb: 0, a: .58, rough: .4}),
		mk(arc(C.x, C.y - d, r, AB, Math.PI - AB, 50), 2.4, INK2, {prof: 'even', nb: 0, a: .5, rough: .4}),
		mk(arc(C.x, C.y - d, R, Math.PI * 1.05, Math.PI * 1.95, 50), 2.8, INK2, {prof: 'even', nb: 0, a: .55, rough: .4}),
	];
	// the stone: a round brilliant in a four-claw setting on top of the band
	const sx = C.x, sy = C.y - R - d - 58, R0 = 70;
	G.stone = [];
	for (let i = 0; i < 26; i++) { const a = rnd(0, Math.PI * 2), rr = rnd(.2, 1) * R0; G.stone.push(mk(polar(sx + Math.cos(a) * rr * .35, sy + 8 + Math.sin(a) * rr * .25, a, rr * .7, rnd(-5, 5), 5), rnd(12, 20), pick([BLUEGREY, '#c4d1da', '#7f97a8', '#d9e2e8']), {prof: 'leaf', nb: 2, a: rnd(.25, .5), rough: .35})); }
	G.stone.push(mk(arc(sx, sy + 22, R0, 0, Math.PI * 2, 40).map(([x, y]) => [x, sy + 22 + (y - sy - 22) * .26]), 2.8, INK2, {prof: 'even', nb: 0, a: .72, rough: .3}));
	G.stone.push(mk([[sx - R0, sy + 22], [sx - R0 * .55, sy - 32], [sx + R0 * .55, sy - 32], [sx + R0, sy + 22]], 2.6, INK2, {prof: 'even', nb: 0, a: .7, rough: .3}));
	for (const f of [-1, -.5, 0, .5, 1]) G.stone.push(mk([[sx + f * R0 * .55, sy - 32], [sx + f * R0 * .9, sy + 22]], 1.5, INK2, {prof: 'even', nb: 0, a: .38}));
	G.stone.push(mk([[sx - R0, sy + 22], [sx, sy + 86], [sx + R0, sy + 22]], 2.3, INK2, {prof: 'even', nb: 0, a: .55, rough: .3}));
	for (const f of [-.5, 0, .5]) G.stone.push(mk([[sx + f * R0, sy + 24], [sx, sy + 84]], 1.3, INK2, {prof: 'even', nb: 0, a: .3}));
	for (const dx of [-54, -18, 18, 54]) G.stone.push(mk(qcurve(sx + dx, sy + 18, sx + dx * 1.15, sy + 86, dx > 0 ? 4 : -4, 6), 11, OCHRE_D, {prof: 'tip', nb: 3, a: .82}));
	G.stoneFill = [[sx - R0, sy + 22], [sx - R0 * .55, sy - 32], [sx + R0 * .55, sy - 32], [sx + R0, sy + 22], [sx, sy + 86]];
	for (const k of ['shadow', 'face', 'inner', 'top', 'edge', 'stone']) G[k + 'Spr'] = sprite(G[k]);
}

// engraving written along the inside of the band, following its lower curve, one glyph at a time
const ENG = ['A', '+', 'R', '·', '1', '4', '.', '0', '2', '.', '2', '0', '2', '4'];
const GAP = [0, .7, .7, .9, .9, 0, 0, 0, 0, 0, 0, 0, 0, 0];
function glyphTimes() {
	const aR = [T.aR - .05, T.aR + .85], dt = [T.date + .05, T.date + 2.4];
	return ENG.map((g, i) => (i < 3 ? aR[0] + (aR[1] - aR[0]) * i / 3 : dt[0] + (dt[1] - dt[0]) * (i - 3) / (ENG.length - 3)));
}
const ENG_CY = () => C.y - d / 2, ENG_R = () => r - 4;
function engraving(t) {
	const size = 40;
	ctx.save(); ctx.font = `italic 400 ${size}px "Instrument Serif"`;
	const sp = ctx.measureText(' ').width * .6, ws = ENG.map((g) => ctx.measureText(g).width);
	const total = ws.reduce((a, b) => a + b, 0) + GAP.reduce((a, b) => a + b, 0) * sp + (ENG.length - 1) * 2;
	const t0s = glyphTimes(), rr = ENG_R(), cy = ENG_CY();
	let x = -total / 2;
	ENG.forEach((g, i) => {
		x += GAP[i] * sp;
		const phi = (x + ws[i] / 2) / rr;
		const px = C.x + rr * Math.sin(phi), py = cy + rr * Math.cos(phi);
		const p = seg(t, t0s[i], t0s[i] + .32);
		if (p > 0) {
			ctx.save(); ctx.translate(px, py); ctx.rotate(-phi); ctx.scale(1, .82);
			ctx.beginPath(); ctx.rect(-ws[i] / 2 - 3, -size, (ws[i] + 6) * eo(p), size * 1.8); ctx.clip();
			ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
			ctx.fillStyle = rgba('#F7E8BE', .55); ctx.fillText(g, 0, 1.6);
			ctx.fillStyle = rgba(g === '+' ? '#C9553E' : '#4A3010', .95); ctx.fillText(g, 0, 0); if (g === '+') ctx.fillText(g, 0, 0);
			ctx.restore();
		}
		x += ws[i] + 2;
	});
	ctx.restore();
}

function label(txt, y, a) {
	if (a <= 0) return;
	ctx.save(); ctx.font = '500 30px "Afacad Flux"'; ctx.letterSpacing = '10px'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
	ctx.shadowColor = rgba(PAPER, .95); ctx.shadowBlur = 10; ctx.fillStyle = rgba('#6F6658', a); ctx.fillText(txt, CW / 2 + 5, y); ctx.restore();
}
function draw(L, spr, p) { if (p <= 0) return; if (p >= 1) ctx.drawImage(spr.cv, spr.x0, spr.y0); else drawList(ctx, L, p); }

function render(t) {
	ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1; ctx.drawImage(PAPER_IMG, 0, 0);
	// camera: the whole ring while it paints, then glide through the opening to the inside of the band, then back
	const push = eio(seg(t, T.push0, T.push1)), back = eio(seg(t, T.cut, T.cut + 1.3));
	const focusY = lerp(C.y - 40, ENG_CY() + ENG_R() - 6, push);
	const z = lerp(lerp(1.0, 2.15, push), 0.9, back) + .012 * Math.sin(t * .6);
	const sy = lerp(860, 1080, back);
	const fy = lerp(focusY, C.y - 40, back);
	const sk = .003 * Math.sin(t * 1.15) * seg(t, 3.6, 4.6);
	ctx.setTransform(z, 0, sk * z, z, CW / 2 - C.x * z, sy - fy * z);
	const bloom = ss(seg(t, 0.15, 0.9));
	if (bloom > 0) { const g = ctx.createRadialGradient(C.x, C.y - 60, 10, C.x, C.y - 60, 520); g.addColorStop(0, rgba('#E9CB82', .2 * bloom)); g.addColorStop(1, rgba('#E9CB82', 0)); ctx.fillStyle = g; ctx.fillRect(C.x - 600, C.y - 660, 1200, 1300); }
	const P = (a, b) => seg(t, a, b);
	draw(G.shadow, G.shadowSpr, P(0.45, 1.0));
	{ const w = P(0.5, 1.5); if (w > 0) { ctx.save(); ctx.beginPath(); ctx.rect(C.x - R - 60, 0, (2 * R + 120) * eo(w), CH); ctx.clip(); ctx.globalAlpha = ss(w); ctx.drawImage(G.wash, 0, 0); ctx.restore(); } }
	draw(G.face, G.faceSpr, P(0.7, 2.2));
	draw(G.inner, G.innerSpr, P(1.4, 2.4));
	draw(G.top, G.topSpr, P(1.8, 2.6));
	draw(G.edge, G.edgeSpr, P(2.4, 3.2));
	{ const q = P(2.7, 3.0); if (q > 0) { ctx.beginPath(); G.stoneFill.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y))); ctx.closePath(); ctx.fillStyle = rgba(PAPER, .96 * q); ctx.fill(); } }
	draw(G.stone, G.stoneSpr, P(2.7, 3.5));
	engraving(t);
	ctx.setTransform(1, 0, 0, 1, 0, 0);
	label('THE PART NOBODY SEES', 150, ss(P(0.8, 1.4)) * (1 - ss(P(T.aR - .4, T.aR))));
	label('INSIDE THE BAND', 150, ss(P(T.aR, T.aR + .6)) * (1 - ss(P(T.cut - .3, T.cut))));
}
window.render = render;
window.TEXTS = () => [];
(async () => {
	PAPER_IMG = new Image(); PAPER_IMG.src = 'paper.jpg'; await PAPER_IMG.decode();
	await document.fonts.load('italic 400 40px "Instrument Serif"'); await document.fonts.load('500 30px "Afacad Flux"');
	withSeed(17, build);
	window.READY = true;
})();
