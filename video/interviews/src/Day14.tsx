// "Day 14 the Bracelet": idea to sparkle. Her take (media/p9/day14.mp4, upscaled from 720p) with the long pauses
// tightened. Her three wishes ("elegant", "delicate", "just the right sparkle") pop up as soft word chips above her
// head; on "we brought her idea to life" a pencil sketch of the bracelet draws itself full screen, then dissolves
// into the finished bracelet on "beautiful diamond bracelet"; "the finished piece" cuts to it on the wrist.
import React from 'react';
import {AbsoluteFill, Easing, Img, interpolate, OffthreadVideo, Sequence, spring, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import {Audio} from '@remotion/media';
import wordsData from './data/day14_words.json';
import {AFACAD, INSTRUMENT, POPPINS} from './fonts';

const clamp = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'} as const;
const ease = Easing.bezier(0.16, 1, 0.3, 1);
const TERRA = '#E2725B', SAP = '#507D2A', INK = '#2E2A26';
type Word = {w: string; t: number; e: number};
const WORDS = wordsData as Word[];

// kept parts of the take (source seconds)
const KEEP: [number, number][] = [[0.6, 28.6], [30.55, 38.4], [38.95, 45.7], [46.7, 54.2]];
const OFF: number[] = KEEP.reduce<number[]>((acc, k, i) => [...acc, i === 0 ? 0 : acc[i - 1] + (KEEP[i - 1][1] - KEEP[i - 1][0])], []);
const TAKE = OFF[OFF.length - 1] + KEEP[KEEP.length - 1][1] - KEEP[KEEP.length - 1][0];
export const DAY14_END = 3.4;
export const day14Total = () => TAKE + DAY14_END;
// source time -> output time
const out = (src: number) => {
	for (let i = KEEP.length - 1; i >= 0; i--) if (src >= KEEP[i][0] - 0.3) return OFF[i] + Math.max(0, src - KEEP[i][0]);
	return src;
};

const FIX: Record<string, string> = {bought: 'brought', Takshila: 'takshila.co', Darko: ''};
type CW = {w: string; t: number; e: number};
const capWords: CW[] = WORDS.filter((w) => KEEP.some(([a, b]) => w.t >= a && w.t < b))
	.map((w) => ({w: FIX[w.w] ?? w.w, t: out(w.t), e: out(w.e)}))
	.filter((w) => w.w);

const GRADE = 'contrast(1.05) saturate(1.04) sepia(0.06)';
const Her: React.FC<{from: number; dur: number; k: number}> = ({from, dur, k}) => {
	const frame = useCurrentFrame();
	const {fps} = useVideoConfig();
	const z = interpolate(frame, [0, dur * fps], k % 2 ? [1.1, 1.14] : [1.0, 1.04], clamp);
	return (
		<AbsoluteFill style={{overflow: 'hidden', background: '#000'}}>
			<OffthreadVideo src={staticFile('media/p9/day14.mp4')} muted trimBefore={Math.round(from * fps)}
				style={{width: 1080, height: 1920, scale: z, transformOrigin: '540px 760px', filter: GRADE}} />
		</AbsoluteFill>
	);
};

// her three wishes as soft chips above her head
const CHIPS = [
	{text: 'elegant', at: 2.87},
	{text: 'delicate', at: 4.07},
	{text: 'just the right sparkle ✨', at: 6.15},
];
const Chips: React.FC = () => {
	const frame = useCurrentFrame();
	const {fps} = useVideoConfig();
	const t = frame / fps;
	const end = out(17.0);
	const fade = interpolate(t, [end - 0.4, end], [1, 0], clamp);
	return (
		<div style={{position: 'absolute', left: 0, right: 0, top: 210, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 22, opacity: fade}}>
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

// the pencil sketch draws itself (soft-edged wipe), holds with a slow push, then dissolves into the photo
const SketchToPhoto: React.FC<{dur: number; photoAt: number}> = ({dur, photoAt}) => {
	const frame = useCurrentFrame();
	const {fps} = useVideoConfig();
	const t = frame / fps;
	const draw = interpolate(t, [0.25, 2.8], [0, 1], {...clamp, easing: Easing.inOut(Easing.quad)});
	const edge = -10 + draw * 120;   // percent across
	const photo = interpolate(t, [photoAt - 0.25, photoAt + 0.45], [0, 1], {...clamp, easing: ease});
	const zs = interpolate(t, [0, photoAt + 0.5], [1.0, 1.08], clamp);
	const zp = interpolate(t, [photoAt, dur], [1.04, 1.12], clamp);
	const inA = interpolate(t, [0, 0.25], [0, 1], clamp);
	return (
		<AbsoluteFill style={{background: '#F3EDE2', opacity: inA}}>
			<AbsoluteFill style={{scale: zs, transformOrigin: '540px 760px'}}>
				<Img src={staticFile('img/bracelet/B_sketch.jpg')} style={{width: 1080, height: 1920,
					maskImage: `linear-gradient(100deg, black ${edge - 8}%, transparent ${edge + 4}%)`, WebkitMaskImage: `linear-gradient(100deg, black ${edge - 8}%, transparent ${edge + 4}%)`}} />
			</AbsoluteFill>
			<AbsoluteFill style={{opacity: photo, scale: zp, transformOrigin: '540px 720px'}}>
				<Img src={staticFile('img/bracelet/B_photo.jpg')} style={{width: 1080, height: 1920}} />
			</AbsoluteFill>
			<div style={{position: 'absolute', left: 0, right: 0, top: 150, textAlign: 'center', fontFamily: AFACAD, fontWeight: 500, fontSize: 30, letterSpacing: '0.34em',
				color: photo > 0.5 ? '#6F6A64' : '#8B7F70', opacity: inA}}>{photo > 0.5 ? 'THE FINISHED PIECE' : 'HER IDEA, ON PAPER'}</div>
		</AbsoluteFill>
	);
};

const Wrist: React.FC<{dur: number}> = ({dur}) => {
	const frame = useCurrentFrame();
	const {fps} = useVideoConfig();
	const t = frame / fps;
	const z = interpolate(t, [0, dur], [1.0, 1.1], clamp);
	const sweep = interpolate(t, [0.3, 1.6], [-400, 1400], clamp);
	return (
		<AbsoluteFill style={{overflow: 'hidden', background: '#EEE7DD'}}>
			<AbsoluteFill style={{scale: z, transformOrigin: '600px 560px'}}>
				<Img src={staticFile('img/bracelet/B_wrist.jpg')} style={{width: 1080, height: 1920}} />
				<div style={{position: 'absolute', top: 0, bottom: 0, left: sweep, width: 300, rotate: '16deg', mixBlendMode: 'soft-light',
					background: 'linear-gradient(90deg, rgba(255,255,255,0), rgba(255,255,255,0.6), rgba(255,255,255,0))'}} />
			</AbsoluteFill>
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
			textShadow: onLight ? '0 0 24px rgba(255,250,240,0.9)' : '0 3px 0 rgba(0,0,0,0.5), 0 0 22px rgba(0,0,0,0.45)'}}>
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
	const z = interpolate(frame, [0, 4 * fps], [1.06, 1.12], clamp);
	return (
		<AbsoluteFill style={{opacity: interpolate(frame, [0, 15], [0, 1], clamp), background: '#F3EDE2'}}>
			<AbsoluteFill style={{scale: z, transformOrigin: '540px 900px'}}>
				<Img src={staticFile('img/bracelet/B_photo.jpg')} style={{width: 1080, height: 1920, opacity: 0.9}} />
			</AbsoluteFill>
			<AbsoluteFill style={{background: 'linear-gradient(rgba(248,244,237,0.92) 0%, rgba(248,244,237,0.55) 34%, rgba(248,244,237,0) 55%)'}} />
			<div style={{position: 'absolute', left: 80, right: 80, top: 210, textAlign: 'center', color: INK, opacity: a, translate: `0 ${(1 - a) * 26}px`}}>
				<div style={{fontFamily: INSTRUMENT, fontSize: 110, lineHeight: 1.0}}>Every piece begins<br />with <i style={{color: TERRA}}>one little idea</i></div>
			</div>
			<div style={{position: 'absolute', left: 0, right: 0, top: 560, textAlign: 'center', opacity: b}}>
				<div style={{display: 'inline-block', background: SAP, color: 'white', borderRadius: 60, padding: '20px 50px', fontFamily: POPPINS, fontWeight: 600, fontSize: 40}}>Bring yours · takshila.co</div>
			</div>
		</AbsoluteFill>
	);
};

export const Day14Reel: React.FC = () => {
	const {fps, durationInFrames} = useVideoConfig();
	const f = (t: number) => Math.round(t * fps);
	const sk0 = out(18.3), sk1 = out(28.6) - 0.02, photoAt = out(26.3) - sk0;
	const wr0 = out(32.65), wr1 = out(36.0);
	const light = (t: number) => (t >= sk0 && t < sk1) || (t >= wr0 && t < wr1);
	const sfx: {t: number; f: string; v: number; len?: number}[] = [
		...CHIPS.map((c) => ({t: out(c.at) - 0.03, f: 'pop', v: 0.16})),
		{t: sk0 - 0.15, f: 'whoosh', v: 0.16},
		{t: sk0 + photoAt - 0.9, f: 'riser', v: 0.12, len: 1.2},
		{t: sk0 + photoAt + 0.05, f: 'glock', v: 0.22},
		{t: wr0 + 0.3, f: 'tick2', v: 0.18},
		{t: TAKE - 0.1, f: 'whoosh', v: 0.2},
		{t: TAKE + 0.5, f: 'click', v: 0.35},
	];
	return (
		<AbsoluteFill style={{background: '#000'}}>
			{KEEP.map(([a, b], i) => (
				<Sequence key={i} name={`take ${a}-${b}`} from={f(OFF[i])} durationInFrames={f(OFF[i] + b - a) - f(OFF[i])}>
					<Her from={a} dur={b - a} k={i} />
					<Audio src={staticFile('media/p9/day14.mp4')} trimBefore={f(a)} volume={(fr) => interpolate(fr, [0, 3, f(b - a) - 3, f(b - a)], [0, 1, 1, 0], clamp)} />
				</Sequence>
			))}
			<Chips />
			<Sequence name="sketch to photo" from={f(sk0)} durationInFrames={f(sk1) - f(sk0)}><SketchToPhoto dur={sk1 - sk0} photoAt={photoAt} /></Sequence>
			<Sequence name="wrist" from={f(wr0)} durationInFrames={f(wr1) - f(wr0)}><Wrist dur={wr1 - wr0} /></Sequence>
			<Sequence name="end card" from={f(TAKE)}><EndCard /></Sequence>
			<Captions light={light} />
			{sfx.map((h, i) => (
				<Sequence key={`s${i}`} name={`sfx ${h.f}`} from={Math.max(0, f(h.t))} durationInFrames={f(h.len ?? 2.2)} layout="none">
					<Audio src={staticFile(`sfx/reel/${h.f}.wav`)} volume={h.v} />
				</Sequence>
			))}
			<Audio name="music" src={staticFile('media/p5/parampampam.mp3')} trimBefore={f(27)}
				volume={(fr) => interpolate(fr, [0, 20, f(TAKE) - 20, f(TAKE) + 10, durationInFrames - 25, durationInFrames], [0, 0.12, 0.12, 0.3, 0.3, 0], clamp)} />
		</AbsoluteFill>
	);
};
