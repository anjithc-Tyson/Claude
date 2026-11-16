// "Day 17": the hidden engraving. House style of the Day series (Day 14/15): Poppins captions (white, spoken word
// terracotta; sap green on light backgrounds), Afacad tracked labels, Instrument Serif italic chips in cream pills,
// Instrument Serif end card with a sap-green Poppins button.
// Her take (media/p11/day17.mp4) with the retakes removed. On "And here it is" the screen moves inside a gold ring
// (photoreal macro) and the engraving "A + R · 14.02.2024" appears on the inner wall as she says it.
import React from 'react';
import {AbsoluteFill, Easing, interpolate, OffthreadVideo, Sequence, spring, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import {Audio} from '@remotion/media';
import wordsData from './data/day17_words.json';
import {INSTRUMENT, POPPINS} from './fonts';

const clamp = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'} as const;
const TERRA = '#E2725B', SAP = '#507D2A', INK = '#2E2A26';
type Word = {w: string; t: number; e: number};
const WORDS = wordsData as Word[];

// kept parts of the take (source seconds): drops "let me start that one again" + the retake, and the first date take
const KEEP: [number, number][] = [[0.9, 35.2], [49.3, 54.88], [65.0, 74.95], [75.6, 84.6]];
const OFF: number[] = KEEP.reduce<number[]>((acc, k, i) => [...acc, i === 0 ? 0 : acc[i - 1] + (KEEP[i - 1][1] - KEEP[i - 1][0])], []);
const TAKE = OFF[OFF.length - 1] + KEEP[KEEP.length - 1][1] - KEEP[KEEP.length - 1][0];
export const DAY17_END = 3.6;
export const day17Total = () => TAKE + DAY17_END;
const out = (src: number) => {
	for (let i = KEEP.length - 1; i >= 0; i--) if (src >= KEEP[i][0] - 0.3) return OFF[i] + Math.max(0, src - KEEP[i][0]);
	return src;
};

// transcript fixes
const fixAt = (w: Word): string => {
	if (w.t > 54.8 && w.t < 54.9) return '';
	if (w.w === 'Takshila') return 'takshila.co';
	if (w.w === '.co.') return '';
	if (w.w === 'plus') return '+';
	if (w.w === 'R,' ) return 'R,';
	if (w.w === 'of' && w.t > 71 && w.t < 73) return '';
	if (w.w === 'full') return 'a few';
	if (w.w === 'remarks.') return 'marks.';
	return w.w;
};
type CW = {w: string; t: number; e: number};
const capWords: CW[] = WORDS.filter((w) => KEEP.some(([a, b]) => w.t >= a && w.t < b))
	.map((w) => ({w: fixAt(w), t: out(w.t), e: out(w.e)}))
	.filter((w) => w.w);

const GRADE = 'contrast(1.05) saturate(1.04) sepia(0.06)';
// her cut with the face-tracked effects baked in (effects skill: spotlight, huge-strike LOUD, backdrop-word SECRET,
// lean-ins, slow push, crayon-write A + R), rendered from the kept takes in output time: video/day17-effects/plan.json
const Her: React.FC<{from: number}> = ({from}) => {
	const {fps} = useVideoConfig();
	const z = 1;
	return (
		<AbsoluteFill style={{overflow: 'hidden', background: '#000'}}>
			<OffthreadVideo src={staticFile('media/p11/take_fx.mp4')} muted trimBefore={Math.round(from * fps)}
				style={{width: 1080, height: 1920, scale: z, transformOrigin: '540px 700px', filter: GRADE}} />
		</AbsoluteFill>
	);
};

// the Watercolor Brush insert (Lemo-Opuscar, video/day17-watercolor): rendered page video, revealed by a wavy
// brush-edge wipe over her shot; plays from "And here it is" and continues under the end card
const WC_IN = 0.55;
const Watercolor: React.FC<{from: number; wipe?: boolean}> = ({from, wipe}) => {
	const frame = useCurrentFrame();
	const {fps} = useVideoConfig();
	const p = wipe ? interpolate(frame / fps, [0, WC_IN], [0, 1], {...clamp, easing: Easing.inOut(Easing.cubic)}) : 1;
	const pts: string[] = [];
	const edge = -8 + p * 116;
	for (let i = 0; i <= 24; i++) { const y = (i / 24) * 100; const x = edge + 3.2 * Math.sin(i * 1.7 + frame * 0.15) + 1.8 * Math.sin(i * 3.9); pts.push(`${x.toFixed(2)}% ${y.toFixed(2)}%`); }
	const clip = p >= 1 ? undefined : `polygon(0% 0%, ${pts.join(', ')}, 0% 100%)`;
	return (
		<AbsoluteFill style={{clipPath: clip}}>
			<OffthreadVideo src={staticFile('media/p11/wc_insert.mp4')} muted trimBefore={Math.round(from * fps)} style={{width: 1080, height: 1920}} />
		</AbsoluteFill>
	);
};

const groupsOf = (ws: CW[]) => {
	const res: CW[][] = [];
	let cur: CW[] = [];
	ws.forEach((w) => {
		if (cur.length && w.t - cur[cur.length - 1].e > 0.7) { res.push(cur); cur = []; }
		cur.push(w);
		if (/[.,!?]$/.test(w.w) || cur.length === 4) { res.push(cur); cur = []; }
	});
	if (cur.length) res.push(cur);
	return res;
};
const Captions: React.FC<{light: (t: number) => boolean}> = ({light}) => {
	const frame = useCurrentFrame();
	const {fps} = useVideoConfig();
	const t = frame / fps;
	const groups = React.useMemo(() => groupsOf(capWords), []);
	const g = groups.find((x, i) => t >= x[0].t - 0.05 && t < Math.min(x[x.length - 1].e + 0.5, groups[i + 1]?.[0].t ?? 1e9));
	if (!g || t >= TAKE) return null;
	const onLight = light(t);
	const a = spring({frame: frame - Math.round((g[0].t - 0.05) * fps), fps, config: {damping: 14, mass: 0.5}});
	return (
		<div style={{position: 'absolute', left: 70, right: 70, top: 1440, textAlign: 'center', opacity: a, scale: 0.92 + 0.08 * a,
			fontFamily: POPPINS, fontWeight: 700, fontSize: 62, lineHeight: 1.12, color: onLight ? INK : 'white',
			textShadow: onLight ? '0 0 18px rgba(255,252,246,1), 0 0 34px rgba(255,252,246,0.95), 0 0 6px rgba(255,252,246,1)' : '0 3px 0 rgba(0,0,0,0.5), 0 0 22px rgba(0,0,0,0.45)'}}>
			{g.map((w, i) => (
				<span key={i} style={{color: t >= w.t - 0.03 ? (onLight ? SAP : TERRA) : undefined}}>{w.w.replace(/,$/, '')}{i < g.length - 1 ? ' ' : ''}</span>
			))}
		</div>
	);
};

const EndCard: React.FC = () => {
	const frame = useCurrentFrame();
	const {fps} = useVideoConfig();
	const a = spring({frame, fps, config: {damping: 16, mass: 0.7}});
	const b = spring({frame: frame - 10, fps, config: {damping: 16, mass: 0.7}});
	return (
		<AbsoluteFill style={{opacity: interpolate(frame, [0, 15], [0, 1], clamp)}}>
			<Watercolor from={9.95} />
			<AbsoluteFill style={{background: 'linear-gradient(rgba(248,244,237,0.97) 0%, rgba(248,244,237,0.9) 30%, rgba(248,244,237,0) 50%)'}} />
			<div style={{position: 'absolute', left: 80, right: 80, top: 210, textAlign: 'center', color: INK, opacity: a, translate: `0 ${(1 - a) * 26}px`}}>
				<div style={{fontFamily: INSTRUMENT, fontSize: 110, lineHeight: 1.0}}>What would<br /><i style={{color: TERRA}}>yours</i> say?</div>
			</div>
			<div style={{position: 'absolute', left: 0, right: 0, top: 500, textAlign: 'center', opacity: b}}>
				<div style={{display: 'inline-block', background: SAP, color: 'white', borderRadius: 60, padding: '20px 50px', fontFamily: POPPINS, fontWeight: 600, fontSize: 40}}>Tell us below · takshila.co</div>
			</div>
		</AbsoluteFill>
	);
};

export const Day17Reel: React.FC = () => {
	const {fps, durationInFrames} = useVideoConfig();
	const f = (t: number) => Math.round(t * fps);
	// inside-the-band scene: from "And here it is" to the end of the date
	const b0 = out(65.0), b1 = out(74.95);
	const aR0 = out(68.97) - b0;
	const light = (t: number) => t >= b0 && t < b1;
	const sfx: {t: number; f: string; v: number; len?: number}[] = [
		{t: 2.15, f: 'whoosh', v: 0.13},
		{t: 15.8 + 1.7, f: 'pop', v: 0.12},
		{t: 24.25, f: 'whoosh', v: 0.12},
		{t: b0 - 0.15, f: 'whoosh', v: 0.16},
		{t: b0 + aR0, f: 'glock', v: 0.16},
		{t: TAKE - 0.1, f: 'whoosh', v: 0.18},
		{t: TAKE + 0.5, f: 'click', v: 0.32},
	];
	return (
		<AbsoluteFill style={{background: '#000'}}>
			{KEEP.map(([a, b], i) => (
				<Sequence key={i} name={`take ${a}-${b}`} from={f(OFF[i])} durationInFrames={f(OFF[i] + b - a) - f(OFF[i])}>
					<Her from={OFF[i]} />
					<Audio src={staticFile('media/p11/day17.mp4')} trimBefore={f(a)} volume={(fr) => interpolate(fr, [0, 3, f(b - a) - 3, f(b - a)], [0, 1, 1, 0], clamp)} />
				</Sequence>
			))}
			<Sequence name="inside the band" from={f(b0)} durationInFrames={f(b1) - f(b0)}>
				<Watercolor from={0} wipe />
			</Sequence>
			<Sequence name="end card" from={f(TAKE)}><EndCard /></Sequence>
			<Captions light={light} />
			{sfx.map((h, i) => (
				<Sequence key={`s${i}`} name={`sfx ${h.f}`} from={Math.max(0, f(h.t))} durationInFrames={f(h.len ?? 2.2)} layout="none">
					<Audio src={staticFile(`sfx/reel/${h.f}.wav`)} volume={h.v} />
				</Sequence>
			))}
			<Audio name="music" src={staticFile('media/p11/me_and_you.mp3')}
				volume={(fr) => interpolate(fr, [0, 20, f(TAKE) - 20, f(TAKE) + 10, durationInFrames - 25, durationInFrames], [0, 0.11, 0.11, 0.26, 0.26, 0], clamp)} />
		</AbsoluteFill>
	);
};
