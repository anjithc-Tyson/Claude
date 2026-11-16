// "Day 17": the hidden engraving. House style of the Day series (Day 14/15): Poppins captions (white, spoken word
// terracotta; sap green on light backgrounds), Afacad tracked labels, Instrument Serif italic chips in cream pills,
// Instrument Serif end card with a sap-green Poppins button.
// Her take (media/p11/day17.mp4) with the retakes removed. Her wishes ("nothing loud", "no big gestures", "a secret")
// as chips; from "we tucked it inside the band" the screen moves inside a gold band, and on her words the engraving
// "A + R · 14.02.2024" cuts itself into the metal, letter by letter (drawn in code so the text is exact).
import React from 'react';
import {AbsoluteFill, Easing, interpolate, OffthreadVideo, Sequence, spring, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import {Audio} from '@remotion/media';
import wordsData from './data/day17_words.json';
import {AFACAD, INSTRUMENT, POPPINS} from './fonts';

const clamp = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'} as const;
const TERRA = '#E2725B', SAP = '#507D2A', INK = '#2E2A26', CREAM = '#F3EDE2';
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
const Her: React.FC<{from: number; dur: number; k: number}> = ({from, dur, k}) => {
	const frame = useCurrentFrame();
	const {fps} = useVideoConfig();
	const z = interpolate(frame, [0, dur * fps], k % 2 ? [1.1, 1.14] : [1.0, 1.04], clamp);
	return (
		<AbsoluteFill style={{overflow: 'hidden', background: '#000'}}>
			<OffthreadVideo src={staticFile('media/p11/day17.mp4')} muted trimBefore={Math.round(from * fps)}
				style={{width: 1080, height: 1920, scale: z, transformOrigin: '540px 700px', filter: GRADE}} />
		</AbsoluteFill>
	);
};

// her wishes as cream chips (house style)
const CHIPS = [
	{text: 'nothing loud', at: 16.5},
	{text: 'no big gestures', at: 18.41},
	{text: 'a secret ✨', at: 23.4},
];
const Chips: React.FC = () => {
	const frame = useCurrentFrame();
	const {fps} = useVideoConfig();
	const t = frame / fps;
	const end = out(28.0);
	const fade = interpolate(t, [end - 0.4, end], [1, 0], clamp);
	return (
		<div style={{position: 'absolute', left: 0, right: 0, top: 1000, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 22, opacity: fade}}>
			{CHIPS.map((c, i) => {
				const a = spring({frame: frame - Math.round(out(c.at) * fps), fps, config: {damping: 13, mass: 0.6}});
				return (
					<div key={i} style={{opacity: a, scale: 0.6 + 0.4 * a, translate: `0 ${(1 - a) * 24}px`, background: 'rgba(255,252,246,0.92)', color: INK,
						borderRadius: 60, padding: '16px 40px', fontFamily: INSTRUMENT, fontStyle: 'italic', fontSize: 62, boxShadow: '0 12px 30px rgba(40,30,20,0.18)',
						border: i === 2 ? `2px solid ${TERRA}` : '2px solid transparent'}}>{c.text}</div>
				);
			})}
		</div>
	);
};

// inside the band: a macro of the inner surface of a gold ring, curving across the frame; the engraving cuts itself in
const ENGRAVE = 'A + R  ·  14.02.2024';
const BandInside: React.FC<{dur: number; text: string; reveal: (t: number) => number; push?: [number, number]; label?: (t: number) => string}> = ({dur, text, reveal, push = [1.0, 1.08], label}) => {
	const frame = useCurrentFrame();
	const {fps} = useVideoConfig();
	const t = frame / fps;
	const inA = interpolate(t, [0, 0.35], [0, 1], clamp);
	const z = interpolate(t, [0, dur], push, {...clamp, easing: Easing.inOut(Easing.quad)});
	const n = Math.round(reveal(t) * text.length);
	const shown = text.slice(0, n);
	const writing = n > 0 && n < text.length;
	const sweep = interpolate((t % 4.5) / 4.5, [0, 1], [-30, 130]);
	// band geometry: a wide strip that sags slightly in the middle (concave inner surface)
	const y = 820, h = 330, sag = 70;
	const top = `M -120 ${y - h / 2} Q 540 ${y - h / 2 + sag} 1200 ${y - h / 2}`;
	const mid = `M -120 ${y + 10} Q 540 ${y + 10 + sag} 1200 ${y + 10}`;
	const band = `${top} L 1200 ${y + h / 2} Q 540 ${y + h / 2 + sag} -120 ${y + h / 2} Z`;
	return (
		<AbsoluteFill style={{background: `radial-gradient(ellipse 80% 55% at 50% 45%, #FBF6EE 0%, ${CREAM} 55%, #E7DDCD 100%)`, opacity: inA}}>
			<AbsoluteFill style={{scale: z, transformOrigin: '540px 860px'}}>
				<svg width={1080} height={1920} viewBox="0 0 1080 1920">
					<defs>
						<linearGradient id="gold" x1="0" y1={y - h / 2} x2="0" y2={y + h / 2 + sag} gradientUnits="userSpaceOnUse">
							<stop offset="0" stopColor="#7A5521" />
							<stop offset="0.12" stopColor="#C9973E" />
							<stop offset="0.3" stopColor="#F4D488" />
							<stop offset="0.42" stopColor="#FFF0C2" />
							<stop offset="0.55" stopColor="#E3B865" />
							<stop offset="0.78" stopColor="#B4842F" />
							<stop offset="1" stopColor="#6A4718" />
						</linearGradient>
						<linearGradient id="shine" x1="0" y1="0" x2="1" y2="0">
							<stop offset="0" stopColor="#FFF8E0" stopOpacity="0" />
							<stop offset="0.5" stopColor="#FFF8E0" stopOpacity="0.55" />
							<stop offset="1" stopColor="#FFF8E0" stopOpacity="0" />
						</linearGradient>
						<filter id="soft" x="-10%" y="-10%" width="120%" height="140%"><feGaussianBlur stdDeviation="22" /></filter>
						<path id="arc" d={mid} />
						<clipPath id="bandClip"><path d={band} /></clipPath>
					</defs>
					{/* soft shadow under the band */}
					<path d={band} fill="rgba(70,50,25,0.28)" filter="url(#soft)" transform="translate(0 36)" />
					<path d={band} fill="url(#gold)" />
					{/* fine brushed texture */}
					<g clipPath="url(#bandClip)" opacity="0.12">
						{Array.from({length: 46}).map((_, i) => (
							<path key={i} d={`M -120 ${y - h / 2 + i * 8} Q 540 ${y - h / 2 + sag + i * 8} 1200 ${y - h / 2 + i * 8}`} stroke={i % 2 ? '#5A3E12' : '#FFF6D6'} strokeWidth="1" fill="none" />
						))}
					</g>
					{/* engraving: dark cut + light lower lip so the letters read as incised */}
					<text fontFamily={INSTRUMENT} fontStyle="italic" fontSize="132" letterSpacing="4" textAnchor="middle" fill="#FFF3CC" opacity="0.7" transform="translate(0 3)">
						<textPath href="#arc" startOffset="50%">{shown}</textPath>
					</text>
					<text fontFamily={INSTRUMENT} fontStyle="italic" fontSize="132" letterSpacing="4" textAnchor="middle" fill="#5B3F15" opacity="0.9">
						<textPath href="#arc" startOffset="50%">{shown}</textPath>
					</text>
					{/* travelling light across the polished metal */}
					<g clipPath="url(#bandClip)">
						<rect x={sweep * 10.8 - 160} y={0} width={320} height={1920} fill="url(#shine)" transform={`rotate(12 ${sweep * 10.8} 820)`} />
					</g>
				</svg>
				{writing ? (
					<div style={{position: 'absolute', left: 540 + (n / text.length - 0.5) * 900 - 9, top: 850 - 9, width: 18, height: 18, borderRadius: 9,
						background: 'radial-gradient(circle, #FFFFFF 0%, #FFE9A8 45%, rgba(255,233,168,0) 75%)'}} />
				) : null}
			</AbsoluteFill>
			{label ? <div style={{position: 'absolute', left: 0, right: 0, top: 150, textAlign: 'center', fontFamily: AFACAD, fontWeight: 500, fontSize: 30, letterSpacing: '0.34em', color: '#8B7F70'}}>{label(t)}</div> : null}
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
			<BandInside dur={DAY17_END} text={ENGRAVE} reveal={() => 1} push={[1.02, 1.06]} />
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
	const aR0 = out(68.97) - b0, aR1 = out(70.85) - b0, d0 = out(71.25) - b0, d1 = out(74.5) - b0;
	const plusR = 'A + R'.length, total = ENGRAVE.length;
	const reveal = (t: number) => {
		if (t < aR0) return 0;
		if (t < aR1) return interpolate(t, [aR0, aR1], [0, plusR / total], clamp);
		if (t < d0) return plusR / total;
		return interpolate(t, [d0, d1], [plusR / total, 1], clamp);
	};
	const label = (t: number) => (t < aR0 ? 'THE PART NOBODY SEES' : 'INSIDE THE BAND');
	const light = (t: number) => t >= b0 && t < b1;
	const keys = Array.from({length: total}).map((_, k) => {
		const r = (k + 1) / total;
		const tt = r <= plusR / total ? aR0 + (r / (plusR / total)) * (aR1 - aR0) : d0 + ((r - plusR / total) / (1 - plusR / total)) * (d1 - d0);
		return b0 + tt;
	}).filter((_, k) => ENGRAVE[k] !== ' ');
	const sfx: {t: number; f: string; v: number; len?: number}[] = [
		...CHIPS.map((c) => ({t: out(c.at) - 0.03, f: 'pop', v: 0.09})),
		{t: b0 - 0.15, f: 'whoosh', v: 0.16},
		...keys.filter((_, i) => i % 2 === 0).map((t) => ({t, f: 'tick', v: 0.07, len: 0.4})),
		{t: b0 + d1 + 0.1, f: 'glock', v: 0.2},
		{t: TAKE - 0.1, f: 'whoosh', v: 0.18},
		{t: TAKE + 0.5, f: 'click', v: 0.32},
	];
	return (
		<AbsoluteFill style={{background: '#000'}}>
			{KEEP.map(([a, b], i) => (
				<Sequence key={i} name={`take ${a}-${b}`} from={f(OFF[i])} durationInFrames={f(OFF[i] + b - a) - f(OFF[i])}>
					<Her from={a} dur={b - a} k={i} />
					<Audio src={staticFile('media/p11/day17.mp4')} trimBefore={f(a)} volume={(fr) => interpolate(fr, [0, 3, f(b - a) - 3, f(b - a)], [0, 1, 1, 0], clamp)} />
				</Sequence>
			))}
			<Chips />
			<Sequence name="inside the band" from={f(b0)} durationInFrames={f(b1) - f(b0)}>
				<BandInside dur={b1 - b0} text={ENGRAVE} reveal={reveal} push={[1.0, 1.12]} label={label} />
			</Sequence>
			<Sequence name="end card" from={f(TAKE)}><EndCard /></Sequence>
			<Captions light={light} />
			{sfx.map((h, i) => (
				<Sequence key={`s${i}`} name={`sfx ${h.f}`} from={Math.max(0, f(h.t))} durationInFrames={f(h.len ?? 2.2)} layout="none">
					<Audio src={staticFile(`sfx/reel/${h.f}.wav`)} volume={h.v} />
				</Sequence>
			))}
			<Audio name="music" src={staticFile('media/p4/lovelikethis.mp3')}
				volume={(fr) => interpolate(fr, [0, 20, f(TAKE) - 20, f(TAKE) + 10, durationInFrames - 25, durationInFrames], [0, 0.12, 0.12, 0.3, 0.3, 0], clamp)} />
		</AbsoluteFill>
	);
};
