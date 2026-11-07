// Script 4 in the Lemo-Opuscar "Copperplate Engraving" style (video/script4-engraving/TREATMENT.md).
// Her take is full screen; at the beats the engraved plate (rendered by the library's engine, plates.mp4) takes the
// frame, entering under a tissue guard and leaving by a corner peel (printmaking transitions only, STYLE.md §6).
// On the opening plate she sits in the engraved roundel FIG. I. Her words: copperplate script on a deckled slip.
import React from 'react';
import {AbsoluteFill, Easing, interpolate, OffthreadVideo, Sequence, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import {Audio} from '@remotion/media';
import detailData from './data/detail.json';
import {loadFont} from '@remotion/fonts';

const PINYON = 'PinyonX';
loadFont({family: PINYON, url: staticFile('fonts/PinyonScript-normal.woff2'), weight: '400', format: 'woff2'});

const W = 1080, H = 1920;
const clamp = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'} as const;
const ease = Easing.inOut(Easing.cubic);
type Seg = {a: number; b: number; o: number; rate: number};
type Word = {w: string; t: number; e: number};
type D = {clip: string; total: number; segments: Seg[]; words: Word[]};
export const ENG = detailData as unknown as D;
export const ENG_END = 3.6;
export const engTotal = (d: D) => d.total + ENG_END;
const segLen = (s: Seg) => (s.b - s.a) / s.rate;

// plate windows (must match film.js T.*); in = tissue guard, out = corner peel
const WIN = [
	{a: 0, b: 6.45, tin: false, tout: true},
	{a: 10.85, b: 16.55, tin: true, tout: true},
	{a: 17.55, b: 24.45, tin: true, tout: true},
	{a: 36.85, b: 41.05, tin: true, tout: true},
	{a: 49.02, b: 52.62, tin: true, tout: false},
];
const TIS = 0.5, PEEL = 0.45;
const MAKER = {x: 250, y: 1330, r: 150};

const Face: React.FC<{d: D; s: Seg}> = ({d, s}) => {
	const frame = useCurrentFrame();
	const {fps} = useVideoConfig();
	const dur = segLen(s) * fps;
	const vol = interpolate(frame, [0, 2, dur - 2, dur], [0, 1, 1, 0], clamp);
	return (
		<AbsoluteFill style={{overflow: 'hidden'}}>
			<OffthreadVideo src={staticFile(`media/p7/${d.clip}.mp4`)} trimBefore={Math.round(s.a * fps)} playbackRate={s.rate} volume={vol}
				style={{position: 'absolute', width: W, height: H, scale: 1.1, transformOrigin: '540px 0px', top: -180, filter: 'sepia(0.12) saturate(0.95) contrast(1.03)'}} />
		</AbsoluteFill>
	);
};

// polygon of the rectangle on the side x + y < c, and the flap (the peeled corner folded back over the fold line)
const peelPolys = (p: number) => {
	const c = W + H - p * (W + H) * 1.02;
	const keep: number[][] = [];
	const corners = [[0, 0], [W, 0], [W, H], [0, H]];
	for (let i = 0; i < 4; i++) {
		const [x1, y1] = corners[i], [x2, y2] = corners[(i + 1) % 4];
		const in1 = x1 + y1 < c, in2 = x2 + y2 < c;
		if (in1) keep.push([x1, y1]);
		if (in1 !== in2) { const u = (c - x1 - y1) / (x2 + y2 - x1 - y1); keep.push([x1 + (x2 - x1) * u, y1 + (y2 - y1) * u]); }
	}
	// flap: the part already lifted (x + y >= c), mirrored across the fold line x + y = c
	const cut: number[][] = [];
	for (let i = 0; i < 4; i++) {
		const [x1, y1] = corners[i], [x2, y2] = corners[(i + 1) % 4];
		const in1 = x1 + y1 >= c, in2 = x2 + y2 >= c;
		if (in1) cut.push([x1, y1]);
		if (in1 !== in2) { const u = (c - x1 - y1) / (x2 + y2 - x1 - y1); cut.push([x1 + (x2 - x1) * u, y1 + (y2 - y1) * u]); }
	}
	const flap = cut.map(([x, y]) => [c - y, c - x]);
	const css = (pts: number[][]) => (pts.length ? `polygon(${pts.map(([x, y]) => `${x.toFixed(1)}px ${y.toFixed(1)}px`).join(',')})` : 'polygon(0 0,0 0,0 0)');
	return {keep: css(keep), flap: css(flap)};
};

const Plate: React.FC<{w: (typeof WIN)[number]}> = ({w}) => {
	const frame = useCurrentFrame();
	const {fps} = useVideoConfig();
	const t = frame / fps + w.a;
	// tissue guard: sweeps down over her, then lifts away downward to show the plate
	const ti = w.tin ? (t - w.a) / TIS : 2;
	const cover = interpolate(ti, [0, 0.5], [0, H], {...clamp, easing: ease});       // bottom edge of the tissue (phase 1)
	const lift = interpolate(ti, [0.5, 1], [0, H], {...clamp, easing: ease});        // top edge of the tissue (phase 2)
	const showPlate = ti >= 0.5;
	const pe = w.tout ? interpolate(t, [w.b - PEEL, w.b], [0, 1], {...clamp, easing: ease}) : 0;
	const pp = peelPolys(pe);
	const makerA = interpolate(t, [0.25, 0.6, 3.9, 4.2], [0, 1, 1, 0], clamp) * (w.a === 0 ? 1 : 0);
	return (
		<AbsoluteFill>
			{showPlate ? (
				<AbsoluteFill style={{clipPath: pe > 0 ? pp.keep : ti < 1 ? `inset(0px 0px ${H - lift}px 0px)` : undefined}}>
					<OffthreadVideo src={staticFile('media/p7/plates.mp4')} muted trimBefore={Math.round(w.a * fps)} style={{width: W, height: H}} />
					{makerA > 0 ? (
						<div style={{position: 'absolute', left: MAKER.x - MAKER.r, top: MAKER.y - MAKER.r, width: MAKER.r * 2, height: MAKER.r * 2, borderRadius: '50%', overflow: 'hidden', opacity: makerA,
							filter: 'sepia(0.35) contrast(1.05)'}}>
							<OffthreadVideo src={staticFile(`media/p7/${ENG.clip}.mp4`)} muted trimBefore={Math.round((ENG.segments[0].a + (t - ENG.segments[0].o)) * fps)}
								style={{position: 'absolute', width: 1080 * 0.6, height: 1920 * 0.6, left: MAKER.r - 536 * 0.6, top: MAKER.r - 700 * 0.6}} />
						</div>
					) : null}
				</AbsoluteFill>
			) : null}
			{w.tin && ti < 1 ? (
				<div style={{position: 'absolute', left: 0, width: W, top: showPlate ? lift : cover - H, height: H,
					background: 'linear-gradient(rgba(246,240,226,0.9), rgba(240,232,214,0.86))', boxShadow: '0 -14px 30px rgba(60,40,20,0.25), 0 14px 30px rgba(60,40,20,0.25)'}} />
			) : null}
			{pe > 0 && pe < 1 ? (
				<AbsoluteFill style={{filter: 'drop-shadow(-12px -10px 18px rgba(40,25,10,0.4))'}}>
					<AbsoluteFill style={{clipPath: pp.flap, background: 'linear-gradient(315deg, #efe5cc, #f8f1e0 60%, #e4d6b6)'}} />
				</AbsoluteFill>
			) : null}
		</AbsoluteFill>
	);
};

// her words on a deckled paper slip (Pinyon Script), above Instagram's caption row
const cues = (words: Word[]) => {
	const out: {t0: number; t1: number; text: string}[] = [];
	let cur: Word[] = [];
	for (const w of words) {
		cur.push(w);
		if (/[.,!?]$/.test(w.w) || cur.length >= 5) {
			out.push({t0: cur[0].t - 0.1, t1: cur[cur.length - 1].e + 0.6, text: cur.map((x) => x.w).join(' ').replace(/[,]$/, '')});
			cur = [];
		}
	}
	if (cur.length) out.push({t0: cur[0].t - 0.1, t1: cur[cur.length - 1].e + 0.6, text: cur.map((x) => x.w).join(' ')});
	for (let i = 0; i < out.length - 1; i++) out[i].t1 = Math.min(Math.max(out[i].t1, out[i].t0 + 1.8), out[i + 1].t0);
	return out;
};
const deckle = (w: number, h: number) => {
	const pts: string[] = [];
	const n = 40;
	for (let i = 0; i <= n; i++) pts.push(`${((i / n) * w).toFixed(1)}px ${(2 + 2.5 * Math.abs(Math.sin(i * 2.3))).toFixed(1)}px`);
	for (let i = 0; i <= 8; i++) pts.push(`${(w - 2 - 2 * Math.abs(Math.sin(i * 1.7))).toFixed(1)}px ${((i / 8) * h).toFixed(1)}px`);
	for (let i = n; i >= 0; i--) pts.push(`${((i / n) * w).toFixed(1)}px ${(h - 2 - 2.5 * Math.abs(Math.sin(i * 1.9))).toFixed(1)}px`);
	for (let i = 8; i >= 0; i--) pts.push(`${(2 + 2 * Math.abs(Math.sin(i * 2.1))).toFixed(1)}px ${((i / 8) * h).toFixed(1)}px`);
	return `polygon(${pts.join(',')})`;
};
const Slip: React.FC<{d: D}> = ({d}) => {
	const frame = useCurrentFrame();
	const {fps} = useVideoConfig();
	const t = frame / fps;
	const cs = React.useMemo(() => cues(d.words), [d.words]);
	const c = cs.find((x) => t >= x.t0 && t < x.t1);
	if (!c) return null;
	const a = interpolate(t, [c.t0, c.t0 + 0.12], [0, 1], clamp);
	const w = Math.min(760, 80 + c.text.length * 19), h = 96;
	return (
		<div style={{position: 'absolute', left: 470 - w / 2, top: 1545, width: w, height: h, opacity: a, translate: `0 ${(1 - a) * 6}px`,
			filter: 'drop-shadow(0 6px 10px rgba(40,25,10,0.35))'}}>
			<div style={{position: 'absolute', inset: 0, clipPath: deckle(w, h), background: 'linear-gradient(#f6efdd, #efe5cc)'}} />
			<div style={{position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: PINYON, fontSize: 46, color: '#2b1e14', paddingTop: 6}}>{c.text}</div>
		</div>
	);
};

export const EngravingReel: React.FC<{d: D}> = ({d}) => {
	const {fps} = useVideoConfig();
	const f = (t: number) => Math.round(t * fps);
	return (
		<AbsoluteFill style={{backgroundColor: 'black'}}>
			{d.segments.map((s, i) => (
				<Sequence key={`f${i}`} name={`take ${s.a}`} from={f(s.o)} durationInFrames={Math.max(1, f(s.o + segLen(s)) - f(s.o))}>
					<Face d={d} s={s} />
				</Sequence>
			))}
			{WIN.map((w, i) => (
				<Sequence key={`w${i}`} name={`plate ${w.a}`} from={f(w.a)} durationInFrames={f(w.b) - f(w.a)}>
					<Plate w={w} />
				</Sequence>
			))}
			<Slip d={d} />
			<Audio name="score + foley" src={staticFile('media/p7/s4_bed.wav')} />
		</AbsoluteFill>
	);
};
