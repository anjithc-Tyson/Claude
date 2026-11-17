// Day 17, "Bold kinetic type" in the Takshila palette (terracotta #E2725B, sap green #507D2A, cream #F3EDE2, ink #2E2A26).
// Even pace: every sentence is its own segment with a gentle speed change (×0.94–1.15) toward one speaking rate, and
// the gaps between sentences are trimmed to the same short beat (src/data/day17k.json).
// Visual layers: her full frame; a giant terracotta word BEHIND her on each key line (her alpha cut-out, media/p11/
// day17_cut.webm, is laid back on top); white kinetic captions in front with the keyword on a terracotta block; the
// engraving and the end card as cream type cards.
import React from 'react';
import {AbsoluteFill, interpolate, OffthreadVideo, Sequence, spring, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import {Audio} from '@remotion/media';
import k17 from './data/day17k.json';
import {ROUND} from './fonts';

const clamp = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'} as const;
const TERRA = '#E2725B', SAP = '#507D2A', CREAM = '#F3EDE2', INK = '#2E2A26';
type Seg = {a: number; b: number; rate: number; o: number};
type Word = {w: string; t: number; e: number; src: number};
const D = k17 as {segs: Seg[]; words: Word[]; total: number};
const SEGS = D.segs;
const TAKE = D.total;
export const K17_END = 3.4;
export const k17Total = () => TAKE + K17_END;
const segLen = (s: Seg) => (s.b - s.a) / s.rate;
const outOf = (src: number) => { const s = SEGS.find((x) => src >= x.a && src < x.b) ?? SEGS[SEGS.length - 1]; return s.o + (src - s.a) / s.rate; };

const fixAt = (w: Word): string => {
	if (w.w === 'Takshila') return 'takshila.co';
	if (w.w === '.co.') return '';
	if (w.w === 'plus') return '+';
	if (w.w === 'of' && w.src > 71 && w.src < 73) return '';
	if (w.w === 'full') return 'a few';
	if (w.w === 'remarks.') return 'marks.';
	return w.w;
};
type CW = {w: string; t: number; e: number};
const capWords: CW[] = D.words.map((w) => ({w: fixAt(w), t: w.t, e: w.e})).filter((w) => w.w);
const groups: CW[][] = (() => {
	const res: CW[][] = [];
	let cur: CW[] = [];
	capWords.forEach((w) => {
		if (cur.length && w.t - cur[cur.length - 1].e > 0.5) { res.push(cur); cur = []; }
		cur.push(w);
		if (/[.,!?]$/.test(w.w) || cur.length === 3) { res.push(cur); cur = []; }
	});
	if (cur.length) res.push(cur);
	return res;
})();
const KEY = /^(meaningful|nobody|sees|susanna|takshila\.co|ring|loves|truly|loud|gestures|secret|two|know|where|somewhere|tucked|inside|band|wear|story|marks|yours|say|comment|lovely)$/i;
const clean = (w: string) => w.replace(/[.,!?]+$/, '');
const keyIndex = (g: CW[]) => g.findIndex((w) => KEY.test(clean(w.w)));

// giant words behind her, on the key lines (source time of the spoken word → output time)
const BEHIND: {word: string; src: number; dur: number; col?: string}[] = [
	{word: 'NOBODY', src: 3.9, dur: 1.7},
	{word: 'TRULY', src: 14.2, dur: 1.4},
	{word: 'LOUD', src: 17.0, dur: 1.6, col: SAP},
	{word: 'SECRET', src: 23.3, dur: 2.0},
	{word: 'TWO', src: 26.6, dur: 1.4},
	{word: 'WHERE?', src: 29.2, dur: 1.4, col: SAP},
	{word: 'INSIDE', src: 50.4, dur: 1.9},
	{word: 'STORY', src: 76.5, dur: 1.7},
	{word: 'YOURS?', src: 80.7, dur: 1.5},
];
// the engraving card: from "A plus R" to the end of the date
const CARD0 = outOf(68.85), CARD1 = outOf(74.7), DATE_AT = outOf(71.2);

const Her: React.FC<{s: Seg; i: number; layer: 'base' | 'cut'}> = ({s, i, layer}) => {
	const frame = useCurrentFrame();
	const {fps} = useVideoConfig();
	const p = frame / (segLen(s) * fps);
	// alternate wide / close per sentence (a jump-cut feel), a slow drift inside each
	const base = i % 2 ? 1.14 : 1.0;
	const z = base + 0.03 * p;
	const style: React.CSSProperties = {position: 'absolute', width: 1080, height: 1920, scale: z, transformOrigin: '540px 620px', filter: 'contrast(1.08) saturate(1.04) sepia(0.05)'};
	return layer === 'base' ? (
		<AbsoluteFill style={{overflow: 'hidden', background: '#000'}}>
			<OffthreadVideo src={staticFile('media/p11/day17.mp4')} muted trimBefore={Math.round(s.a * fps)} playbackRate={s.rate} style={style} />
		</AbsoluteFill>
	) : (
		<AbsoluteFill style={{overflow: 'hidden'}}>
			<OffthreadVideo src={staticFile('media/p11/day17_cut.webm')} transparent muted trimBefore={Math.round(s.a * fps)} playbackRate={s.rate} style={style} />
		</AbsoluteFill>
	);
};

const Behind: React.FC<{word: string; dur: number; col?: string}> = ({word, dur, col = TERRA}) => {
	const frame = useCurrentFrame();
	const {fps} = useVideoConfig();
	const t = frame / fps;
	const s = spring({frame, fps, config: {damping: 14, mass: 0.5, stiffness: 190}});
	const outA = interpolate(t, [dur - 0.2, dur], [1, 0], clamp);
	const size = Math.min(330, 1700 / word.length);
	return (
		<div style={{position: 'absolute', left: 0, right: 0, top: 360, textAlign: 'center', fontFamily: ROUND, fontWeight: 900, fontSize: size, lineHeight: 0.9,
			letterSpacing: '-0.03em', color: col, opacity: outA, scale: 1.25 - 0.25 * s, translate: `0 ${(1 - s) * -40 + t * -14}px`}}>{word}</div>
	);
};

const Captions: React.FC = () => {
	const frame = useCurrentFrame();
	const {fps} = useVideoConfig();
	const t = frame / fps;
	if (t >= TAKE || (t >= CARD0 && t < CARD1)) return null;
	const gi = groups.findIndex((g, i) => t >= g[0].t - 0.05 && t < Math.min(g[g.length - 1].e + 0.35, groups[i + 1]?.[0].t ?? 1e9));
	if (gi < 0) return null;
	const g = groups[gi], k = keyIndex(g);
	const long = g.map((w) => clean(w.w)).join(' ').length > 15;
	return (
		<div style={{position: 'absolute', left: 60, right: 60, top: 1270, fontFamily: ROUND, fontWeight: 900, fontSize: long ? 100 : 116, lineHeight: 1.0,
			letterSpacing: '-0.02em', textTransform: 'uppercase', color: 'white', textShadow: '0 5px 22px rgba(0,0,0,0.4)'}}>
			{g.map((w, i) => {
				const s = spring({frame: frame - Math.round((w.t - 0.05) * fps), fps, config: {damping: 13, mass: 0.45, stiffness: 220}});
				const shown = t >= w.t - 0.05;
				const isKey = i === k;
				return (
					<span key={i} style={{display: 'inline-block', marginRight: '0.2em', marginBottom: 8, opacity: shown ? 1 : 0, scale: shown ? 1.3 - 0.3 * s : 1, transformOrigin: 'left bottom',
						background: isKey ? TERRA : undefined, padding: isKey ? '0 0.14em' : undefined, borderRadius: isKey ? 10 : undefined, textShadow: isKey ? 'none' : undefined}}>{clean(w.w)}</span>
				);
			})}
		</div>
	);
};

const EngraveCard: React.FC = () => {
	const frame = useCurrentFrame();
	const {fps} = useVideoConfig();
	const t = frame / fps;
	const a = spring({frame, fps, config: {damping: 12, mass: 0.5, stiffness: 200}});
	const d = spring({frame: frame - Math.round((DATE_AT - CARD0) * fps), fps, config: {damping: 12, mass: 0.5, stiffness: 200}});
	const zoom = interpolate(t, [0, CARD1 - CARD0], [1, 1.06], clamp);
	return (
		<AbsoluteFill style={{background: CREAM, alignItems: 'center', justifyContent: 'center'}}>
			<div style={{scale: zoom, textAlign: 'center', fontFamily: ROUND, fontWeight: 900, color: INK, textTransform: 'uppercase', letterSpacing: '-0.03em'}}>
				<div style={{fontSize: 54, letterSpacing: '0.32em', fontWeight: 700, opacity: a, color: SAP, marginBottom: 46}}>inside the band</div>
				<div style={{fontSize: 300, lineHeight: 0.9, scale: 1.35 - 0.35 * a, opacity: a}}>A<span style={{color: TERRA}}>+</span>R</div>
				<div style={{fontSize: 150, lineHeight: 1, marginTop: 34, scale: d > 0.01 ? 1.35 - 0.35 * d : 0, opacity: d, color: TERRA}}>14.02.2024</div>
			</div>
		</AbsoluteFill>
	);
};

const EndCard: React.FC = () => {
	const frame = useCurrentFrame();
	const {fps} = useVideoConfig();
	const s = (o: number) => spring({frame: frame - o, fps, config: {damping: 12, mass: 0.5, stiffness: 200}});
	const lines = [['WHAT', INK], ['WOULD', INK], ['YOURS', TERRA], ['SAY?', INK]] as const;
	return (
		<AbsoluteFill style={{background: CREAM, padding: '0 70px', justifyContent: 'center'}}>
			<div style={{fontFamily: ROUND, fontWeight: 900, fontSize: 190, lineHeight: 0.88, letterSpacing: '-0.03em'}}>
				{lines.map(([w, c], i) => <div key={w} style={{color: c, opacity: s(i * 4) > 0.02 ? 1 : 0, scale: 1.3 - 0.3 * s(i * 4), transformOrigin: 'left bottom'}}>{w}</div>)}
			</div>
			<div style={{marginTop: 60, opacity: s(20), translate: `0 ${(1 - s(20)) * 30}px`}}>
				<span style={{display: 'inline-block', background: SAP, color: 'white', fontFamily: ROUND, fontWeight: 800, fontSize: 42, padding: '18px 40px', borderRadius: 14}}>COMMENT BELOW · TAKSHILA.CO</span>
			</div>
		</AbsoluteFill>
	);
};

export const Day17KineticReel: React.FC = () => {
	const {fps, durationInFrames} = useVideoConfig();
	const f = (t: number) => Math.round(t * fps);
	const sfx: {t: number; f: string; v: number; len?: number}[] = [
		...BEHIND.map((b) => ({t: outOf(b.src) - 0.05, f: 'whoosh', v: 0.08})),
		{t: CARD0 + 0.02, f: 'pop', v: 0.18},
		{t: DATE_AT + 0.02, f: 'pop', v: 0.16},
		{t: TAKE - 0.08, f: 'whoosh', v: 0.2},
		{t: TAKE + 0.7, f: 'click', v: 0.3},
	];
	return (
		<AbsoluteFill style={{background: '#000'}}>
			{SEGS.map((s, i) => {
				const from = f(s.o), dur = Math.max(1, f(s.o + segLen(s)) - from);
				const bh = BEHIND.filter((b) => b.src >= s.a && b.src < s.b);
				return (
					<Sequence key={i} name={`sentence ${i + 1} ×${s.rate}`} from={from} durationInFrames={dur}>
						<Her s={s} i={i} layer="base" />
						{bh.map((b, j) => (
							<Sequence key={j} name={`behind ${b.word}`} from={f(outOf(b.src) - s.o)} durationInFrames={f(b.dur)}><Behind word={b.word} dur={b.dur} col={b.col} /></Sequence>
						))}
						{bh.length ? <Her s={s} i={i} layer="cut" /> : null}
						<Audio src={staticFile('media/p11/day17.mp4')} trimBefore={f(s.a)} playbackRate={s.rate}
							volume={(fr) => interpolate(fr, [0, 2, dur - 2, dur], [0, 1, 1, 0], clamp)} />
					</Sequence>
				);
			})}
			<Sequence name="engraving card" from={f(CARD0)} durationInFrames={f(CARD1) - f(CARD0)}><EngraveCard /></Sequence>
			<Sequence name="end card" from={f(TAKE)}><EndCard /></Sequence>
			<Captions />
			{sfx.map((h, i) => (
				<Sequence key={`s${i}`} name={`sfx ${h.f}`} from={Math.max(0, f(h.t))} durationInFrames={f(h.len ?? 2.2)} layout="none">
					<Audio src={staticFile(`sfx/reel/${h.f}.wav`)} volume={h.v} />
				</Sequence>
			))}
			<Audio name="music" src={staticFile('media/p11/night_sky.mp3')}
				volume={(fr) => interpolate(fr, [0, 10, f(TAKE) - 10, f(TAKE) + 6, durationInFrames - 20, durationInFrames], [0, 0.1, 0.1, 0.28, 0.28, 0], clamp)} />
		</AbsoluteFill>
	);
};
