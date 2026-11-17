// Day 17, "Bold kinetic type" in the Takshila palette: forest green #2E6B3F accent, sap green #507D2A, cream #F3EDE2,
// ink #2E2A26. Natural pace, exactly as recorded (no speed changes): the kept takes, with the stammered "we" and the
// first of two "somewhere"s cut out (src/data/day17k.json). Wide/close framing alternates per sentence.
// Visual layers: her footage with the effects-skill visuals baked in (media/p11/take_fx2.mp4, plan in
// video/day17-kinetic/plan.json: spotlight, scribble, her-brief checklist, message pop-ups, comment bar, follow button);
// a freeze-frame name tag for Sisanda; giant forest-green words BEHIND her on a few key lines (her alpha cut-out,
// media/p11/day17_cut.webm, laid back on top); white kinetic captions with the keyword on a forest-green block; the
// engraving and the end card as cream type cards.
import React from 'react';
import {AbsoluteFill, Freeze, interpolate, OffthreadVideo, Sequence, spring, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import {Audio} from '@remotion/media';
import k17 from './data/day17k.json';
import {ROUND} from './fonts';

const clamp = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'} as const;
const FOREST = '#2E6B3F', CREAM = '#F3EDE2', INK = '#2E2A26';
type Seg = {a: number; b: number; rate: number; o: number; fx: number};
type Word = {w: string; t: number; e: number; src: number};
const D = k17 as {segs: Seg[]; words: Word[]; total: number};
const SEGS = D.segs;
const TAKE = D.total;
export const K17_END = 3.4;
export const k17Total = () => TAKE + K17_END;
const segLen = (s: Seg) => (s.b - s.a) / s.rate;
const outOf = (src: number) => { const s = SEGS.find((x) => src >= x.a && src < x.b) ?? SEGS[SEGS.length - 1]; return s.o + (src - s.a) / s.rate; };

const fixAt = (w: Word): string => {
	if (w.src > 54.8 && w.src < 54.9) return '';
	if (/^susanna/i.test(w.w)) return w.w.replace(/susanna/i, 'Sisanda');
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
const KEY = /^(meaningful|nobody|sees|sisanda|takshila\.co|ring|loves|truly|loud|gestures|secret|two|know|where|somewhere|tucked|inside|band|wear|story|marks|yours|say|comment|lovely)$/i;
const clean = (w: string) => w.replace(/[.,!?]+$/, '');
// output times where each sentence starts (for the wide/close alternation)
const SENT: number[] = capWords.reduce<number[]>((acc, w, i) => (i === 0 || /[.?!]$/.test(capWords[i - 1].w) ? [...acc, w.t - 0.05] : acc), []);
const keyIndex = (g: CW[]) => g.findIndex((w) => KEY.test(clean(w.w)));

// giant words behind her, on the key lines (source time of the spoken word → output time)
const BEHIND: {word: string; src: number; dur: number; col?: string}[] = [
	{word: 'TWO', src: 26.6, dur: 1.4},
	{word: 'INSIDE', src: 50.4, dur: 1.9},
	{word: 'STORY', src: 76.5, dur: 1.7},
	{word: 'YOURS?', src: 80.7, dur: 0.9},
];
// effect windows (output time) baked into take_fx2.mp4: no punch-in there, so their overlays stay whole
// take_fx2.mp4 time → output time (the effects were rendered on the cut before the "uh-oh" was removed)
const fxOut = (x: number) => { const s = [...SEGS].reverse().find((q) => x >= q.fx) ?? SEGS[0]; return s.o + x - s.fx; };
const FX_WIN: [number, number][] = ([[0.2, 3.9], [12.6, 14.6], [14.9, 23.6], [27.6, 32.6], [54.4, 57.6]] as [number, number][]).map(([a, b]) => [fxOut(a), fxOut(b)]);
const CMT0 = fxOut(54.4), CMT1 = fxOut(56.7);
const NAME0 = 3.93, NAME1 = 4.82, NAME_END = 6.9;
// the engraving card: from "A plus R" to the end of the date
const CARD0 = outOf(68.85), CARD1 = outOf(74.7), DATE_AT = outOf(71.2);

const Her: React.FC<{s: Seg; i: number; layer: 'base' | 'cut'; skip?: number}> = ({s, i, layer, skip = 0}) => {
	const frame = useCurrentFrame();
	const {fps} = useVideoConfig();
	const p = (skip + frame / fps) / segLen(s);
	// alternate wide / close per sentence (a jump-cut feel), a slow drift inside each
	const t = s.o + skip + frame / fps;
	const k = SENT.reduce((n, st, j) => (t >= st ? j : n), 0);
	const close = k % 2 === 1 && !(t > outOf(20.4) && t < outOf(24.6)) && !FX_WIN.some(([a, b]) => t > a - 0.3 && t < b + 0.3);
	const z = (close ? 1.12 : 1.0) + 0.02 * p;
	const style: React.CSSProperties = {position: 'absolute', width: 1080, height: 1920, scale: z, transformOrigin: '540px 620px', filter: 'contrast(1.08) saturate(1.04) sepia(0.05)'};
	return layer === 'base' ? (
		<AbsoluteFill style={{overflow: 'hidden', background: '#000'}}>
			<OffthreadVideo src={staticFile('media/p11/take_fx2.mp4')} muted trimBefore={Math.round(s.fx * fps)} style={style} />
		</AbsoluteFill>
	) : (
		<AbsoluteFill style={{overflow: 'hidden'}}>
			<OffthreadVideo src={staticFile('media/p11/day17_cut.webm')} transparent muted trimBefore={Math.round((s.a + skip) * fps)} playbackRate={s.rate} style={style} />
		</AbsoluteFill>
	);
};

// freeze-frame name tag: the picture holds in the pause before "Hi, I'm Sisanda", a hand-drawn arrow draws to her and
// her name lands in forest green; the label stays while she says her name
const NameTag: React.FC = () => {
	const frame = useCurrentFrame();
	const {fps} = useVideoConfig();
	const t = frame / fps;
	const draw = interpolate(t, [0.1, 0.55], [0, 1], clamp);
	const lab = spring({frame: frame - 6, fps, config: {damping: 12, mass: 0.5, stiffness: 200}});
	const out = interpolate(t, [NAME_END - NAME0 - 0.25, NAME_END - NAME0], [1, 0], clamp);
	const L = 520;
	return (
		<AbsoluteFill style={{opacity: out}}>
			<svg width={1080} height={1920} style={{position: 'absolute'}}>
				<path d="M 720 470 C 760 560, 720 640, 640 660" fill="none" stroke={FOREST} strokeWidth={9} strokeLinecap="round" strokeDasharray={L} strokeDashoffset={L * (1 - draw)} />
				{draw >= 1 ? <path d="M 668 632 L 636 662 L 678 676" fill="none" stroke={FOREST} strokeWidth={9} strokeLinecap="round" strokeLinejoin="round" /> : null}
			</svg>
			<div style={{position: 'absolute', left: 560, top: 300, rotate: '-4deg', opacity: lab, scale: 1.3 - 0.3 * lab, transformOrigin: 'left bottom'}}>
				<div style={{fontFamily: ROUND, fontWeight: 900, fontSize: 96, lineHeight: 0.95, color: FOREST, letterSpacing: '-0.02em'}}>SISANDA</div>
				<div style={{fontFamily: ROUND, fontWeight: 700, fontSize: 30, color: INK, letterSpacing: '0.12em', marginTop: 8}}>DESIGNER · TAKSHILA.CO</div>
			</div>
		</AbsoluteFill>
	);
};
const FrozenHer: React.FC = () => {
	const {fps} = useVideoConfig();
	const frame = useCurrentFrame();
	const z = interpolate(frame / fps, [0, NAME1 - NAME0], [1, 1.05], clamp);
	return (
		<AbsoluteFill style={{overflow: 'hidden', background: '#000'}}>
			<Freeze frame={0}>
				<OffthreadVideo src={staticFile('media/p11/take_fx2.mp4')} muted trimBefore={Math.round(NAME0 * fps)}
					style={{position: 'absolute', width: 1080, height: 1920, scale: z, transformOrigin: '540px 620px', filter: 'contrast(1.08) saturate(0.5) sepia(0.1)'}} />
			</Freeze>
			<div style={{position: 'absolute', left: 54, top: 120, width: 84, height: 84, borderRadius: 16, background: 'rgba(0,0,0,0.55)', display: 'flex', gap: 14, alignItems: 'center', justifyContent: 'center'}}>
				<div style={{width: 14, height: 40, background: 'white', borderRadius: 3}} /><div style={{width: 14, height: 40, background: 'white', borderRadius: 3}} />
			</div>
		</AbsoluteFill>
	);
};

const Behind: React.FC<{word: string; dur: number; col?: string}> = ({word, dur, col = FOREST}) => {
	const frame = useCurrentFrame();
	const {fps} = useVideoConfig();
	const t = frame / fps;
	const s = spring({frame, fps, config: {damping: 14, mass: 0.5, stiffness: 190}});
	const outA = interpolate(t, [dur - 0.2, dur], [1, 0], clamp);
	const size = Math.min(270, 1450 / word.length);
	return (
		<div style={{position: 'absolute', left: 0, right: 0, top: 360, textAlign: 'center', fontFamily: ROUND, fontWeight: 900, fontSize: size, lineHeight: 0.9,
			letterSpacing: '-0.03em', color: col, opacity: outA, scale: 1.25 - 0.25 * s, translate: `0 ${(1 - s) * -40 + t * -14}px`}}>{word}</div>
	);
};

const Captions: React.FC = () => {
	const frame = useCurrentFrame();
	const {fps} = useVideoConfig();
	const t = frame / fps;
	if (t >= TAKE || (t >= CARD0 && t < CARD1) || (t >= CMT0 && t < CMT1)) return null; // the comment bar carries this line
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
						background: isKey ? FOREST : undefined, padding: isKey ? '0 0.14em' : undefined, borderRadius: isKey ? 10 : undefined, textShadow: isKey ? 'none' : undefined}}>{clean(w.w)}</span>
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
				<div style={{fontSize: 54, letterSpacing: '0.32em', fontWeight: 700, opacity: a, color: FOREST, marginBottom: 46}}>inside the band</div>
				<div style={{fontSize: 300, lineHeight: 0.9, scale: 1.35 - 0.35 * a, opacity: a}}>A<span style={{color: FOREST}}>+</span>R</div>
				<div style={{fontSize: 150, lineHeight: 1, marginTop: 34, scale: d > 0.01 ? 1.35 - 0.35 * d : 0, opacity: d, color: FOREST}}>14.02.2024</div>
			</div>
		</AbsoluteFill>
	);
};

const EndCard: React.FC = () => {
	const frame = useCurrentFrame();
	const {fps} = useVideoConfig();
	const s = (o: number) => spring({frame: frame - o, fps, config: {damping: 12, mass: 0.5, stiffness: 200}});
	const lines = [['WHAT', INK], ['WOULD', INK], ['YOURS', FOREST], ['SAY?', INK]] as const;
	return (
		<AbsoluteFill style={{background: CREAM, padding: '0 70px', justifyContent: 'center'}}>
			<div style={{fontFamily: ROUND, fontWeight: 900, fontSize: 190, lineHeight: 0.88, letterSpacing: '-0.03em'}}>
				{lines.map(([w, c], i) => <div key={w} style={{color: c, opacity: s(i * 4) > 0.02 ? 1 : 0, scale: 1.3 - 0.3 * s(i * 4), transformOrigin: 'left bottom'}}>{w}</div>)}
			</div>
			<div style={{marginTop: 60, opacity: s(20), translate: `0 ${(1 - s(20)) * 30}px`}}>
				<span style={{display: 'inline-block', background: FOREST, color: 'white', fontFamily: ROUND, fontWeight: 800, fontSize: 42, padding: '18px 40px', borderRadius: 14}}>COMMENT BELOW · TAKSHILA.CO</span>
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
						{bh.map((b, j) => {
							// her cut-out only while a word is behind her, so it never covers the baked-in overlays
							const skip = outOf(b.src) - s.o;
							return <Sequence key={`c${j}`} name={`cut-out ${b.word}`} from={f(skip)} durationInFrames={f(b.dur)}><Her s={s} i={i} layer="cut" skip={f(skip) / fps} /></Sequence>;
						})}
						<Audio src={staticFile('media/p11/day17.mp4')} trimBefore={f(s.a)} playbackRate={s.rate}
							volume={(fr) => interpolate(fr, [0, 2, dur - 2, dur], [0, 1, 1, 0], clamp)} />
					</Sequence>
				);
			})}
			<Sequence name="name freeze" from={f(NAME0)} durationInFrames={f(NAME1) - f(NAME0)}><FrozenHer /></Sequence>
			<Sequence name="name tag" from={f(NAME0)} durationInFrames={f(NAME_END) - f(NAME0)}><NameTag /></Sequence>
			<Sequence name="engraving card" from={f(CARD0)} durationInFrames={f(CARD1) - f(CARD0)}><EngraveCard /></Sequence>
			<Sequence name="end card" from={f(TAKE)}><EndCard /></Sequence>
			<Captions />
			{sfx.map((h, i) => (
				<Sequence key={`s${i}`} name={`sfx ${h.f}`} from={Math.max(0, f(h.t))} durationInFrames={f(h.len ?? 2.2)} layout="none">
					<Audio src={staticFile(`sfx/reel/${h.f}.wav`)} volume={h.v} />
				</Sequence>
			))}
			<Audio name="music" src={staticFile('media/p11/night_sky.mp3')}
				volume={(fr) => interpolate(fr, [0, 10, f(TAKE) - 10, f(TAKE) + 6, durationInFrames - 20, durationInFrames], [0, 0.04, 0.04, 0.17, 0.17, 0], clamp)} />
		</AbsoluteFill>
	);
};
