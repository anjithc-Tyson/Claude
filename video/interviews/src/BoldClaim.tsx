// "Bold Claim" script (Takshila Content Feasibility Analysis, script 1): choose the metal, the stone and the meaning.
// Selfie takes cut tight, luxury serif titles, word-by-word captions, product cards on the words that name them.
import React from 'react';
import {AbsoluteFill, Easing, Img, interpolate, OffthreadVideo, Sequence, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import {Audio} from '@remotion/media';
import boldData from './data/bold.json';
import {SERIF, SANS} from './fonts';

const SAP = '#4f6b2e';
const SAP_DARK = '#2f4a17';
const SAP_LIGHT = '#c4dd9c';
const CREAM = '#fbf6ec';
const clamp = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'} as const;
const ease = Easing.bezier(0.16, 1, 0.3, 1);
const springy = Easing.bezier(0.2, 1.5, 0.4, 1);

type Seg = {clip: string; a: number; b: number; o: number; zoom: number; fx: number; fy: number; first: boolean};
type Word = {w: string; t: number; e: number; key: boolean; end: boolean};
type Card = {t: number; dur: number; img: string | null; label: string; kind: 'flash' | 'card' | 'stone' | 'reveal' | 'chip'};
type TitleT = {t: number; num: string; text: string; dur: number};
export type Bold = {total: number; rate: number; segments: Seg[]; words: Word[]; cards: Card[]; titles: TitleT[]; music: {file: string; start: number}};
export const BOLD = boldData as unknown as Bold;
export const BOLD_END = 3.4;
export const boldTotal = (d: Bold) => d.total + BOLD_END;

const Hit: React.FC<{t: number; file: string; vol: number; dur?: number}> = ({t, file, vol, dur = 2}) => {
	const {fps} = useVideoConfig();
	return (
		<Sequence name={`sfx ${file}`} from={Math.max(0, Math.round(t * fps))} durationInFrames={Math.round(dur * fps)} layout="none">
			<Audio src={staticFile(`sfx/bold/${file}.wav`)} volume={vol} />
		</Sequence>
	);
};

const Shot: React.FC<{s: Seg; rate: number}> = ({s, rate}) => {
	const frame = useCurrentFrame();
	const {fps} = useVideoConfig();
	const dur = ((s.b - s.a) / rate) * fps;
	const vol = interpolate(frame, [0, 1.5, dur - 1.5, dur], [0, 1, 1, 0], clamp);
	return (
		<AbsoluteFill style={{overflow: 'hidden'}}>
			<OffthreadVideo src={staticFile(`media/p4/${s.clip}.mp4`)} trimBefore={Math.round(s.a * fps)} playbackRate={rate} volume={vol}
				style={{width: 1080, height: 1920, scale: s.zoom, transformOrigin: `${s.fx}px ${s.fy}px`}} />
		</AbsoluteFill>
	);
};

const Title: React.FC<{num: string; text: string; dur: number}> = ({num, text, dur}) => {
	const frame = useCurrentFrame();
	const {fps} = useVideoConfig();
	const end = dur * fps;
	const a = interpolate(frame, [0, 8, end - 8, end], [0, 1, 1, 0], clamp);
	const y = interpolate(frame, [0, 14], [26, 0], {...clamp, easing: ease});
	const track = interpolate(frame, [0, 30], [0.32, 0.16], {...clamp, easing: ease});
	const line = interpolate(frame, [6, 26], [0, 1], {...clamp, easing: ease});
	return (
		<AbsoluteFill style={{opacity: a}}>
			<div style={{position: 'absolute', inset: 0, height: 620, background: 'linear-gradient(rgba(12,18,8,0.62), rgba(12,18,8,0))'}} />
			<div style={{position: 'absolute', top: 190, width: 1080, textAlign: 'center', translate: `0 ${y}px`}}>
				{num ? <div style={{fontFamily: SERIF, fontStyle: 'italic', fontWeight: 500, fontSize: 96, color: SAP_LIGHT, lineHeight: 1}}>{num}</div> : null}
				<div style={{fontFamily: SERIF, fontWeight: 600, fontSize: num ? 66 : 70, color: CREAM, letterSpacing: `${track}em`, textTransform: 'uppercase',
					marginTop: num ? 10 : 0, textShadow: '0 4px 18px rgba(0,0,0,0.55)', padding: '0 60px', lineHeight: 1.15}}>{text}</div>
				<div style={{margin: '26px auto 0', height: 2, width: 260 * line, background: SAP_LIGHT}} />
			</div>
		</AbsoluteFill>
	);
};

// up to three words a line; each word lands as it is spoken
const chunk = (ws: Word[]) => {
	const out: Word[][] = [];
	let cur: Word[] = [];
	for (const w of ws) {
		cur.push(w);
		if (cur.length === 3 || w.end) {
			out.push(cur);
			cur = [];
		}
	}
	if (cur.length) out.push(cur);
	return out;
};

const Captions: React.FC<{d: Bold; low: (t: number) => boolean; hide: (t: number) => boolean}> = ({d, low, hide}) => {
	const frame = useCurrentFrame();
	const {fps} = useVideoConfig();
	const t = frame / fps;
	const chunks = React.useMemo(() => chunk(d.words), [d.words]);
	if (hide(t)) return null;
	const c = chunks.find((g, i) => t >= g[0].t && t < Math.min(g[g.length - 1].e + 0.25, chunks[i + 1]?.[0].t ?? 1e9));
	if (!c) return null;
	return (
		<div style={{position: 'absolute', top: low(t) ? 1660 : 1330, width: 1080, textAlign: 'center', padding: '0 70px', boxSizing: 'border-box'}}>
			{c.map((w, i) => {
				const age = t - w.t;
				const on = age >= 0;
				const s = interpolate(age, [0, 0.12], [0.86, 1], {...clamp, easing: springy});
				return (
					<span key={i} style={{display: 'inline-block', margin: '0 12px', opacity: on ? 1 : 0, scale: on ? s : 0.86,
						fontFamily: SERIF, fontWeight: w.key ? 600 : 600, fontStyle: w.key ? 'italic' : 'normal', fontSize: w.key ? 104 : 94,
						color: w.key ? SAP_LIGHT : CREAM, textShadow: '0 3px 4px rgba(0,0,0,0.55), 0 8px 26px rgba(0,0,0,0.5)', lineHeight: 1.05}}>
						{w.w.replace(/[,]$/, '')}
					</span>
				);
			})}
		</div>
	);
};

// full-screen fast cut (hook)
const Flash: React.FC<{c: Card}> = ({c}) => {
	const frame = useCurrentFrame();
	const z = interpolate(frame, [0, c.dur * 30], [1.16, 1.0], {...clamp, easing: ease});
	const white = interpolate(frame, [0, 3], [0.8, 0], clamp);
	return (
		<AbsoluteFill style={{backgroundColor: '#000'}}>
			<Img src={staticFile(`img/${c.img}`)} style={{width: 1080, height: 1920, objectFit: 'cover', scale: z, filter: 'contrast(1.06) saturate(1.1)'}} />
			<AbsoluteFill style={{background: 'radial-gradient(ellipse at 50% 60%, rgba(0,0,0,0) 40%, rgba(0,0,0,0.55))'}} />
			<div style={{position: 'absolute', top: 1480, width: 1080, textAlign: 'center', fontFamily: SERIF, fontStyle: 'italic', fontWeight: 600, fontSize: 120,
				color: CREAM, textShadow: '0 6px 30px rgba(0,0,0,0.7)'}}>{c.label}</div>
			<AbsoluteFill style={{backgroundColor: 'white', opacity: white}} />
		</AbsoluteFill>
	);
};

// product card, centred below the middle; stones get a light sweep
const ProductCard: React.FC<{c: Card}> = ({c}) => {
	const frame = useCurrentFrame();
	const end = c.dur * 30;
	const s = interpolate(frame, [0, 9], [0.55, 1], {...clamp, easing: springy});
	const rot = interpolate(frame, [0, 12], [-4, 0], {...clamp, easing: ease});
	const out = interpolate(frame, [end - 6, end], [1, 0], clamp);
	const push = interpolate(frame, [0, end], [1.0, 1.08], clamp);
	const sweep = interpolate(frame, [6, 22], [-120, 220], {...clamp, easing: Easing.inOut(Easing.cubic)});
	return (
		<AbsoluteFill style={{opacity: out}}>
			<div style={{position: 'absolute', left: 190, top: 900, width: 700, scale: s * (0.9 + 0.1 * out), rotate: `${rot}deg`, transformOrigin: '350px 420px',
				background: CREAM, borderRadius: 30, padding: 14, boxShadow: '0 30px 80px rgba(0,0,0,0.45)'}}>
				<div style={{width: 672, height: 600, borderRadius: 20, overflow: 'hidden', position: 'relative'}}>
					<Img src={staticFile(`img/${c.img}`)} style={{width: '100%', height: '100%', objectFit: 'cover', scale: push, filter: 'contrast(1.05) saturate(1.08)'}} />
					{c.kind === 'stone' ? (
						<div style={{position: 'absolute', inset: 0, background: 'linear-gradient(115deg, rgba(255,255,255,0) 35%, rgba(255,255,255,0.75) 50%, rgba(255,255,255,0) 65%)',
							translate: `${sweep}% 0`, mixBlendMode: 'screen'}} />
					) : null}
				</div>
				<div style={{fontFamily: SERIF, fontStyle: 'italic', fontWeight: 600, fontSize: 52, color: SAP_DARK, textAlign: 'center', padding: '14px 10px 6px'}}>{c.label}</div>
			</div>
		</AbsoluteFill>
	);
};

const Reveal: React.FC<{c: Card}> = ({c}) => {
	const frame = useCurrentFrame();
	const end = c.dur * 30;
	const z = interpolate(frame, [0, end], [1.12, 1.0], {...clamp, easing: ease});
	const white = interpolate(frame, [0, 5], [1, 0], clamp);
	const out = interpolate(frame, [end - 6, end], [1, 0], clamp);
	const lab = interpolate(frame, [6, 18], [0, 1], {...clamp, easing: ease});
	return (
		<AbsoluteFill style={{opacity: out, backgroundColor: '#e9e1d4'}}>
			<Img src={staticFile(`img/${c.img}`)} style={{width: 1080, height: 1920, objectFit: 'cover', scale: z}} />
			<div style={{position: 'absolute', top: 260, width: 1080, textAlign: 'center', opacity: lab, translate: `0 ${(1 - lab) * 20}px`,
				fontFamily: SERIF, fontStyle: 'italic', fontWeight: 600, fontSize: 130, color: SAP_DARK}}>{c.label}</div>
			<AbsoluteFill style={{backgroundColor: 'white', opacity: white}} />
		</AbsoluteFill>
	);
};

const Chip: React.FC<{c: Card; i: number}> = ({c, i}) => {
	const frame = useCurrentFrame();
	const end = c.dur * 30;
	const s = interpolate(frame, [0, 8], [0.6, 1], {...clamp, easing: springy});
	const a = interpolate(frame, [0, 4, end - 6, end], [0, 1, 1, 0], clamp);
	return (
		<div style={{position: 'absolute', top: 1190 + i * 116, width: 1080, display: 'flex', justifyContent: 'center', opacity: a}}>
			<div style={{scale: s, background: 'rgba(251,246,236,0.94)', borderRadius: 999, padding: '14px 50px', boxShadow: '0 14px 40px rgba(0,0,0,0.35)',
				fontFamily: SERIF, fontStyle: 'italic', fontWeight: 600, fontSize: 66, color: SAP_DARK, borderLeft: `10px solid ${SAP}`}}>{c.label}</div>
		</div>
	);
};

const EndCard: React.FC = () => {
	const frame = useCurrentFrame();
	const a = interpolate(frame, [0, 8], [0, 1], clamp);
	const ring = interpolate(frame, [0, 16], [0.8, 1], {...clamp, easing: springy});
	const t1 = interpolate(frame, [8, 20], [0, 1], {...clamp, easing: ease});
	const t2 = interpolate(frame, [16, 28], [0, 1], {...clamp, easing: ease});
	return (
		<AbsoluteFill style={{backgroundColor: '#f4eee4', opacity: a, alignItems: 'center'}}>
			<div style={{marginTop: 260, width: 700, height: 700, borderRadius: 350, overflow: 'hidden', scale: ring, boxShadow: '0 30px 80px rgba(60,50,30,0.25)', border: `10px solid ${CREAM}`}}>
				<Img src={staticFile('img/street_ring_full.jpg')} style={{width: '100%', height: '100%', objectFit: 'cover'}} />
			</div>
			<div style={{marginTop: 90, fontFamily: SERIF, fontWeight: 500, fontSize: 150, color: SAP_DARK, letterSpacing: '0.04em', opacity: t1, translate: `0 ${(1 - t1) * 20}px`}}>Takshila</div>
			<div style={{marginTop: 4, fontFamily: SERIF, fontStyle: 'italic', fontWeight: 500, fontSize: 64, color: '#5c5243', opacity: t1}}>Start your custom design</div>
			<div style={{marginTop: 70, background: SAP_DARK, color: CREAM, borderRadius: 999, padding: '22px 70px', fontFamily: SANS, fontWeight: 600, fontSize: 52,
				letterSpacing: '0.06em', opacity: t2, scale: 0.9 + 0.1 * t2}}>takshila.co</div>
		</AbsoluteFill>
	);
};

export const BoldClaim: React.FC<{d: Bold}> = ({d}) => {
	const {fps, durationInFrames} = useVideoConfig();
	const f = (t: number) => Math.round(t * fps);
	const segDur = (s: Seg) => (s.b - s.a) / d.rate;
	const chips = d.cards.filter((c) => c.kind === 'chip');
	const covering = d.cards.filter((c) => c.kind === 'flash' || c.kind === 'reveal');
	const inCard = (t: number) => d.cards.some((c) => (c.kind === 'card' || c.kind === 'stone' || c.kind === 'chip') && t >= c.t && t < c.t + c.dur);
	const hide = (t: number) => t >= d.total || covering.some((c) => t >= c.t && t < c.t + c.dur);
	return (
		<AbsoluteFill style={{backgroundColor: 'black'}}>
			{d.segments.map((s, i) => (
				<Sequence key={`s${i}`} name={`${s.clip} ${s.a}`} from={f(s.o)} durationInFrames={Math.max(1, f(s.o + segDur(s)) - f(s.o))}>
					<Shot s={s} rate={d.rate} />
				</Sequence>
			))}
			{d.titles.map((t) => (
				<Sequence key={`t${t.t}`} name={`title ${t.text}`} from={f(t.t)} durationInFrames={f(t.dur)}>
					<Title num={t.num} text={t.text} dur={t.dur} />
				</Sequence>
			))}
			{d.cards.map((c) => (
				<Sequence key={`c${c.t}`} name={`${c.kind} ${c.label}`} from={f(c.t - 0.04)} durationInFrames={f(c.dur)}>
					{c.kind === 'flash' ? <Flash c={c} /> : c.kind === 'reveal' ? <Reveal c={c} /> : c.kind === 'chip' ? <Chip c={c} i={chips.indexOf(c)} /> : <ProductCard c={c} />}
				</Sequence>
			))}
			<Captions d={d} low={inCard} hide={hide} />
			<Sequence name="end card" from={f(d.total)}>
				<EndCard />
			</Sequence>

			<Audio name="music" src={staticFile(`media/${d.music.file}`)} trimBefore={f(d.music.start)}
				volume={(fr) => interpolate(fr, [0, 6, f(d.total) - 4, f(d.total) + 6, durationInFrames - f(1.2), durationInFrames], [0.0, 0.13, 0.13, 0.32, 0.32, 0], clamp)} />
			<Hit t={0} file="impact" vol={0.55} />
			{d.cards.map((c) =>
				c.kind === 'flash' ? (
					<React.Fragment key={`h${c.t}`}>
						<Hit t={c.t - 0.06} file="whoosh" vol={0.5} />
						<Hit t={c.t - 0.04} file="click" vol={0.8} />
					</React.Fragment>
				) : c.kind === 'stone' ? (
					<React.Fragment key={`h${c.t}`}>
						<Hit t={c.t - 0.04} file="pop" vol={0.8} />
						<Hit t={c.t + 0.15} file="shimmer" vol={0.55} />
					</React.Fragment>
				) : c.kind === 'chip' ? (
					<Hit key={`h${c.t}`} t={c.t - 0.04} file="click" vol={0.75} />
				) : c.kind === 'reveal' ? (
					<React.Fragment key={`h${c.t}`}>
						<Hit t={c.t - 1.2} file="riser" vol={0.4} />
						<Hit t={c.t - 0.04} file="impact" vol={0.5} />
						<Hit t={c.t} file="shimmer_long" vol={0.5} />
					</React.Fragment>
				) : (
					<Hit key={`h${c.t}`} t={c.t - 0.04} file="pop" vol={0.85} />
				),
			)}
			{d.titles.filter((t) => t.t > 0.5).map((t) => (
				<Hit key={`ht${t.t}`} t={t.t - 0.08} file="whoosh" vol={0.5} />
			))}
			<Hit t={d.total - 0.1} file="swell" vol={0.5} />
			<Hit t={d.total + 0.5} file="ding" vol={0.55} />
		</AbsoluteFill>
	);
};

