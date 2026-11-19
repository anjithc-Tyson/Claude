// "Your partner is not a Pinterest board": her single take (media/p18/her.mp4) with "Pinterest to personal" visuals:
// a saved-rings board that tears away on "board", identical pins with climbing save counts on "copying what everybody
// is saving", this-or-that split cards (bold / quietly romantic, vintage / modern), a "recommended for you" feed that
// glitches apart on "no algorithm could ever predict", and a macro push into the hidden sapphire. Captions as the
// driftwood reel (Instrument Serif, no box, spoken word highlighted in the logo green). Rings are generated images.
import React from 'react';
import {AbsoluteFill, Img, interpolate, OffthreadVideo, Sequence, spring, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import {Audio} from '@remotion/media';
import wordsData from './data/pin_words.json';
import {AFACAD, INSTRUMENT, SANS} from './fonts';

const FOREST = '#2E6B3F', LOGO = '#123726', CREAM = '#F3EDE2', INK = '#2E2A26';
const clamp = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'} as const;
const M = (f: string) => staticFile(`media/p18/${f}`);
type W = {w: string; t: number; e: number};
const TAKE = 61.4;
const END = 3.4;
export const pinTotal = () => TAKE + END;

type Kind = 'board' | 'split1' | 'split2' | 'algo' | 'sapphire';
const INS: {a: number; b: number; kind: Kind}[] = [
	{a: 0, b: 3.9, kind: 'board'},
	{a: 16.0, b: 21.3, kind: 'split1'},
	{a: 21.3, b: 30.6, kind: 'split2'},
	{a: 35.7, b: 38.75, kind: 'algo'},
	{a: 39.3, b: 48.6, kind: 'sapphire'},
];
const insAt = (t: number) => INS.find((s) => t >= s.a && t < s.b);
const PINS = [0, 1, 2, 3, 4, 5].map((i) => `pin${i}.jpg`);

// ---------- her ----------
const Her: React.FC = () => {
	const frame = useCurrentFrame();
	const {fps} = useVideoConfig();
	const z = 1.04 + 0.03 * Math.sin(frame / fps / 8);
	return (
		<AbsoluteFill style={{overflow: 'hidden', background: '#000'}}>
			<OffthreadVideo src={M('her.mp4')} muted style={{width: 1080, height: 1920, scale: z, transformOrigin: '540px 700px', filter: 'contrast(1.05) saturate(1.03)'}} />
		</AbsoluteFill>
	);
};

// ---------- a saved-pins board (generic, no platform branding) ----------
const Pin: React.FC<{src: string; h: number; saves?: string}> = ({src, h, saves}) => (
	<div style={{position: 'relative', width: '100%', height: h, borderRadius: 26, overflow: 'hidden', marginBottom: 18, background: '#eee'}}>
		<Img src={M(src)} style={{width: '100%', height: '100%', objectFit: 'cover'}} />
		<div style={{position: 'absolute', right: 14, top: 14, padding: '10px 20px', borderRadius: 999, background: INK, color: 'white', fontFamily: SANS, fontWeight: 700, fontSize: 24}}>Saved</div>
		{saves && <div style={{position: 'absolute', left: 14, bottom: 14, padding: '8px 16px', borderRadius: 999, background: 'rgba(255,255,255,0.92)', color: INK, fontFamily: SANS, fontWeight: 600, fontSize: 22}}>{saves}</div>}
	</div>
);
const BoardUI: React.FC<{title: string; scroll: number; grey?: number}> = ({title, scroll, grey = 0}) => {
	const colA = [0, 2, 4, 1, 3, 5, 0, 2], colB = [3, 1, 5, 2, 0, 4, 3, 1];
	const hA = [520, 420, 560, 460, 500, 430, 520, 450], hB = [440, 540, 420, 520, 460, 540, 430, 520];
	return (
		<AbsoluteFill style={{background: 'white', filter: `grayscale(${grey})`}}>
			<div style={{position: 'absolute', left: 40, right: 40, top: 70, display: 'flex', alignItems: 'center', gap: 20}}>
				<div style={{flex: 1, height: 84, borderRadius: 999, background: '#EFEFEF', display: 'flex', alignItems: 'center', padding: '0 34px', fontFamily: SANS, fontSize: 32, color: '#6b6b6b'}}>
					<svg width={34} height={34} viewBox="0 0 24 24" style={{marginRight: 16}}><circle cx={10} cy={10} r={7} fill="none" stroke="#6b6b6b" strokeWidth={2.4} /><path d="M15.5 15.5 21 21" stroke="#6b6b6b" strokeWidth={2.4} strokeLinecap="round" /></svg>
					engagement ring ideas
				</div>
			</div>
			<div style={{position: 'absolute', left: 40, top: 190, fontFamily: SANS, fontWeight: 700, fontSize: 52, color: INK}}>{title}</div>
			<div style={{position: 'absolute', left: 40, top: 262, fontFamily: SANS, fontSize: 28, color: '#767676'}}>1,284 pins · saved by everyone</div>
			<div style={{position: 'absolute', left: 30, right: 30, top: 330 - scroll, display: 'flex', gap: 18}}>
				<div style={{flex: 1}}>{colA.map((p, i) => <Pin key={i} src={PINS[p]} h={hA[i]} />)}</div>
				<div style={{flex: 1}}>{colB.map((p, i) => <Pin key={i} src={PINS[p]} h={hB[i]} />)}</div>
			</div>
		</AbsoluteFill>
	);
};

// 0 -> "board.": the board scrolls, greys out on "not", and tears down the middle on "board" to reveal her
const BoardOpen: React.FC = () => {
	const frame = useCurrentFrame();
	const {fps} = useVideoConfig();
	const t = frame / fps;
	const TEAR = 3.32;
	const grey = interpolate(t, [2.2, 2.6], [0, 0.85], clamp);
	const p = interpolate(t, [TEAR, TEAR + 0.5], [0, 1], {...clamp, easing: (x) => 1 - Math.pow(1 - x, 3)});
	const edge: string[] = [];
	for (let i = 0; i <= 30; i++) edge.push(`${50 + (i % 2 ? 2.2 : -2.2) + Math.sin(i * 1.9) * 1.4}% ${(i / 30) * 100}%`);
	const left = `polygon(0% 0%, ${edge.join(', ')}, 0% 100%)`;
	const right = `polygon(100% 0%, ${edge.join(', ')}, 100% 100%)`;
	const board = <BoardUI title="Rings everyone saved" scroll={t * 60} grey={grey} />;
	return (
		<AbsoluteFill>
			<AbsoluteFill style={{clipPath: left, translate: `${-p * 700}px ${p * 40}px`, rotate: `${-p * 6}deg`, transformOrigin: '0px 1920px'}}>{board}</AbsoluteFill>
			<AbsoluteFill style={{clipPath: right, translate: `${p * 700}px ${p * 60}px`, rotate: `${p * 7}deg`, transformOrigin: '1080px 1920px'}}>{board}</AbsoluteFill>
		</AbsoluteFill>
	);
};

// "copying what everybody is saving": identical pins slide in above her head, save counts climbing
const Copies: React.FC = () => {
	const frame = useCurrentFrame();
	const {fps} = useVideoConfig();
	const t = frame / fps;
	const base = [48200, 51700, 63900];
	return (
		<div style={{position: 'absolute', left: 40, right: 40, top: 120, display: 'flex', gap: 18}}>
			{[0, 1, 2].map((i) => {
				const a = spring({frame: frame - i * 5, fps, config: {damping: 14, mass: 0.5}});
				const n = Math.round(base[i] + t * 4200 * (i + 1));
				return (
					<div key={i} style={{flex: 1, opacity: a, translate: `0 ${(1 - a) * -60}px`, rotate: `${(i - 1) * 3}deg`, boxShadow: '0 14px 34px rgba(0,0,0,0.25)', borderRadius: 26}}>
						<Pin src={PINS[i % 2 ? 1 : 0]} h={380} saves={`${(n / 1000).toFixed(1)}K saves`} />
					</div>
				);
			})}
		</div>
	);
};

const LogoChip: React.FC = () => {
	const frame = useCurrentFrame();
	const {fps} = useVideoConfig();
	const a = spring({frame, fps, config: {damping: 14, mass: 0.5}});
	return (
		<div style={{position: 'absolute', left: 0, right: 0, top: 150, display: 'flex', justifyContent: 'center', opacity: a, translate: `0 ${(1 - a) * -20}px`}}>
			<div style={{background: 'rgba(243,237,226,0.95)', borderRadius: 999, padding: '20px 44px', boxShadow: '0 10px 30px rgba(0,0,0,0.15)'}}>
				<Img src={staticFile('takshila_logo.png')} style={{height: 54, display: 'block'}} />
			</div>
		</div>
	);
};

// this-or-that: two halves, the one she names lights up, the other dims
// ring centre row in each 1080x1920 image, so each half frames its ring
const RING_Y: Record<string, number> = {'bold.png': 560, 'romantic.png': 1150, 'vintage.png': 1030, 'modern.png': 1010};
const Split: React.FC<{top: string; bottom: string; topLabel: string; bottomLabel: string; topAt: number; bottomAt: number; from: number}> = ({top, bottom, topLabel, bottomLabel, topAt, bottomAt, from}) => {
	const frame = useCurrentFrame();
	const {fps} = useVideoConfig();
	const t = from + frame / fps;
	const topOn = spring({frame: frame - Math.round((topAt - from) * fps), fps, config: {damping: 16, mass: 0.6}});
	const botOn = spring({frame: frame - Math.round((bottomAt - from) * fps), fps, config: {damping: 16, mass: 0.6}});
	const topLevel = t < bottomAt ? 0.55 + 0.45 * topOn : 1 - 0.55 * botOn;
	const botLevel = t < bottomAt ? 0.55 : 0.55 + 0.45 * botOn;
	const intro = spring({frame, fps, config: {damping: 18, mass: 0.6}});
	const half = (src: string, label: string, level: number, y: number, on: number) => (
		<div style={{position: 'absolute', left: 0, top: y, width: 1080, height: 960, overflow: 'hidden'}}>
			<Img src={M(src)} style={{width: 1080, height: 1920, objectFit: 'cover', translate: `0 ${-Math.min(960, Math.max(0, (RING_Y[src] ?? 960) - 480))}px`, scale: 1.05 + 0.06 * on, transformOrigin: `540px ${RING_Y[src] ?? 960}px`, filter: `brightness(${0.45 + 0.55 * level}) saturate(${0.5 + 0.5 * level})`}} />
			<div style={{position: 'absolute', left: 50, top: y === 0 ? 70 : 60, padding: '12px 26px', borderRadius: 10, background: level > 0.8 ? LOGO : 'rgba(0,0,0,0.35)', color: CREAM,
				fontFamily: AFACAD, fontSize: 32, letterSpacing: '0.24em', opacity: 0.6 + 0.4 * level}}>{label}</div>
		</div>
	);
	return (
		<AbsoluteFill style={{background: '#111', opacity: intro}}>
			{half(top, topLabel, topLevel, 0, topOn)}
			{half(bottom, bottomLabel, botLevel, 960, botOn)}
			<div style={{position: 'absolute', left: 0, right: 0, top: 957, height: 6, background: CREAM}} />
			<div style={{position: 'absolute', left: 540 - 62, top: 960 - 62, width: 124, height: 124, borderRadius: 62, background: CREAM, display: 'flex', alignItems: 'center', justifyContent: 'center',
				fontFamily: INSTRUMENT, fontStyle: 'italic', fontSize: 64, color: INK, boxShadow: '0 8px 24px rgba(0,0,0,0.3)'}}>or</div>
		</AbsoluteFill>
	);
};

// "no algorithm could ever predict": a "recommended for you" feed glitches and breaks apart
const Algo: React.FC = () => {
	const frame = useCurrentFrame();
	const {fps, durationInFrames} = useVideoConfig();
	const t = frame / fps;
	const len = durationInFrames / fps;
	const g = interpolate(t, [0, 0.4, len - 0.6, len], [0.35, 0.8, 0.9, 1.2], clamp);
	const jitter = (k: number) => Math.sin(frame * 3.1 + k * 7.3) * 70 * g;
	const slices = [0, 1, 2, 3, 4, 5, 6, 7];
	const fade = interpolate(t, [len - 0.25, len], [1, 0], clamp);
	return (
		<AbsoluteFill style={{background: 'white', opacity: fade}}>
			{slices.map((i) => (
				<AbsoluteFill key={i} style={{clipPath: `inset(${i * 12.5}% 0 ${100 - (i + 1) * 12.5}% 0)`, translate: `${(frame + i) % 3 === 0 ? jitter(i) : jitter(i) * 0.2}px 0`}}>
					<BoardUI title="Recommended for you" scroll={t * 40} />
				</AbsoluteFill>
			))}
			<AbsoluteFill style={{mixBlendMode: 'multiply', opacity: 0.55 * g, translate: `${10 * g}px 0`, background: 'rgba(0,255,255,0.35)'}} />
			<AbsoluteFill style={{mixBlendMode: 'multiply', opacity: 0.55 * g, translate: `${-10 * g}px 0`, background: 'rgba(255,0,80,0.25)'}} />
			{frame % 4 < 2 && <div style={{position: 'absolute', left: 0, right: 0, top: 300 + ((frame * 97) % 1300), height: 18 + 30 * g, background: 'rgba(0,0,0,0.85)'}} />}
		</AbsoluteFill>
	);
};

// "a secret sapphire tucked right beneath the setting": slow macro push, a thin circle draws around the sapphire
const SAPPH = {x: 577, y: 684};
const Sapphire: React.FC<{at: number; from: number}> = ({at, from}) => {
	const frame = useCurrentFrame();
	const {fps, durationInFrames} = useVideoConfig();
	const p = frame / durationInFrames;
	const z = 1.0 + 0.55 * (1 - Math.pow(1 - p, 2));
	const t = from + frame / fps;
	const ring = interpolate(t, [at, at + 0.9], [0, 1], clamp);
	const lab = spring({frame: frame - Math.round((at - from) * fps), fps, config: {damping: 16, mass: 0.6}});
	return (
		<AbsoluteFill style={{background: '#000', overflow: 'hidden'}}>
			<AbsoluteFill style={{scale: z, transformOrigin: `${SAPPH.x}px ${SAPPH.y}px`}}>
				<Img src={M('sapphire.png')} style={{width: 1080, height: 1920, objectFit: 'cover'}} />
				<svg width={1080} height={1920} style={{position: 'absolute', left: 0, top: 0}}>
					<circle cx={SAPPH.x} cy={SAPPH.y} r={62} fill="none" stroke={CREAM} strokeWidth={5} strokeDasharray={2 * Math.PI * 62} strokeDashoffset={(1 - ring) * 2 * Math.PI * 62} transform={`rotate(-90 ${SAPPH.x} ${SAPPH.y})`} opacity={0.9} />
				</svg>
			</AbsoluteFill>
			<AbsoluteFill style={{background: 'linear-gradient(rgba(0,0,0,0) 58%, rgba(0,0,0,0.45) 80%, rgba(0,0,0,0.55))'}} />
			<div style={{position: 'absolute', left: 0, right: 0, top: 190, textAlign: 'center', opacity: lab, translate: `0 ${(1 - lab) * 16}px`, fontFamily: AFACAD, fontSize: 32, letterSpacing: '0.34em', color: CREAM, textShadow: '0 2px 14px rgba(0,0,0,0.6)'}}>A SECRET SAPPHIRE, JUST FOR HER</div>
		</AbsoluteFill>
	);
};

const Insert: React.FC<{kind: Kind; from: number}> = ({kind, from}) => {
	switch (kind) {
	case 'board': return <BoardOpen />;
	case 'split1': return <Split top="bold.png" bottom="romantic.png" topLabel="BOLD & UNAPOLOGETIC" bottomLabel="QUIETLY ROMANTIC" topAt={16.7} bottomAt={19.42} from={from} />;
	case 'split2': return <Split top="vintage.png" bottom="modern.png" topLabel="THE DRAMA OF VINTAGE" bottomLabel="CLEAN MODERN LINES" topAt={23.66} bottomAt={28.88} from={from} />;
	case 'algo': return <Algo />;
	case 'sapphire': return <Sapphire at={41.26} from={from} />;
	}
};

// ---------- captions ----------
const RAW = wordsData as W[];
const WORDS: W[] = [];
for (const r of RAW) {
	const w = {...r};
	if (w.w.startsWith('.') && WORDS.length) { WORDS[WORDS.length - 1].w += w.w; WORDS[WORDS.length - 1].e = w.e; continue; }
	if (w.w === 'chain.') w.w = 'trend.';
	if (w.w === 'Sapphire') w.w = 'sapphire';
	WORDS.push(w);
}
for (const w of WORDS) w.w = w.w.replace(/^Takshila\.co/, 'takshila.co');
const KEY = /^(pinterest|ring|copying|saving|takshila\.co|she|bold|romantic|vintage|modern|personality|algorithm|secret|sapphire|her|made|personal)$/i;
const clean = (s: string) => s.replace(/[.,!?]+$/, '');
const groups: W[][] = (() => {
	const res: W[][] = []; let cur: W[] = [];
	WORDS.forEach((w) => {
		if (cur.length && w.t - cur[cur.length - 1].e > 0.6) { res.push(cur); cur = []; }
		cur.push(w);
		const len = cur.map((x) => x.w).join(' ').length;
		if (/[.,!?]$/.test(w.w) || cur.length === 6 || len > 30) { res.push(cur); cur = []; }
	});
	if (cur.length) res.push(cur);
	for (let i = res.length - 1; i > 0; i--) {
		const prev = res[i - 1];
		if (res[i].length === 1 && !/[.,!?]$/.test(prev[prev.length - 1].w) && res[i][0].t - prev[prev.length - 1].e < 0.6) { prev.push(...res[i]); res.splice(i, 1); }
	}
	return res;
})();
const Captions: React.FC = () => {
	const frame = useCurrentFrame();
	const {fps} = useVideoConfig();
	const t = frame / fps;
	if (t >= TAKE) return null;
	const ins = insAt(t);
	const gi = groups.findIndex((g, i) => t >= g[0].t - 0.05 && t < Math.min(g[g.length - 1].e + 0.35, groups[i + 1]?.[0].t ?? 1e9));
	if (gi < 0) return null;
	const g = groups[gi];
	const light = (ins?.kind === 'board' && t < 3.4) || ins?.kind === 'algo';
	const top = ins?.kind === 'split1' || ins?.kind === 'split2' ? 1560 : 1420;
	const a = spring({frame: frame - Math.round((g[0].t - 0.08) * fps), fps, config: {damping: 16, mass: 0.5, stiffness: 200}});
	return (
		<div style={{position: 'absolute', left: 60, right: 60, top, display: 'flex', justifyContent: 'center'}}>
			<div style={{opacity: a, translate: `0 ${(1 - a) * 12}px`, fontFamily: INSTRUMENT, fontSize: 88, lineHeight: 1.12, textAlign: 'center', maxWidth: 940,
				background: light ? 'rgba(255,255,255,0.85)' : undefined, borderRadius: light ? 20 : undefined, padding: light ? '6px 18px' : undefined}}>
				{g.map((w, i) => {
					const isKey = KEY.test(clean(w.w));
					const nextT = g[i + 1]?.t ?? groups[gi + 1]?.[0].t ?? w.e + 0.4;
					const active = t >= w.t - 0.04 && t < Math.min(nextT - 0.02, Math.max(w.e, w.t + 0.18) + 0.25);
					return (
						<span key={i} style={{display: 'inline-block', marginRight: i < g.length - 1 ? '0.12em' : 0, padding: '0 0.12em', borderRadius: 12,
							background: active ? LOGO : 'transparent', color: active ? CREAM : light ? INK : 'white', fontStyle: isKey ? 'italic' : 'normal',
							textShadow: active || light ? 'none' : '0 2px 3px rgba(0,0,0,0.55), 0 0 22px rgba(0,0,0,0.45)'}}>{clean(w.w)}</span>
					);
				})}
			</div>
		</div>
	);
};

const EndCard: React.FC = () => {
	const frame = useCurrentFrame();
	const {fps} = useVideoConfig();
	const s = (o: number) => spring({frame: frame - o, fps, config: {damping: 16, mass: 0.6, stiffness: 160}});
	return (
		<AbsoluteFill style={{background: CREAM, padding: '0 80px', justifyContent: 'center', alignItems: 'center', textAlign: 'center'}}>
			<Img src={staticFile('takshila_logo.png')} style={{height: 92, opacity: s(0), translate: `0 ${(1 - s(0)) * 20}px`}} />
			<div style={{marginTop: 70, fontFamily: INSTRUMENT, fontSize: 110, lineHeight: 1.02, color: INK}}>
				<div style={{opacity: s(6), translate: `0 ${(1 - s(6)) * 22}px`}}>Not saved.</div>
				<div style={{opacity: s(12), translate: `0 ${(1 - s(12)) * 22}px`, fontStyle: 'italic', color: FOREST}}>Made for her.</div>
			</div>
			<div style={{marginTop: 64, opacity: s(20), translate: `0 ${(1 - s(20)) * 22}px`}}>
				<span style={{display: 'inline-block', background: LOGO, color: CREAM, fontFamily: AFACAD, fontSize: 32, letterSpacing: '0.24em', padding: '20px 44px', borderRadius: 999}}>DESIGN HER RING · TAKSHILA.CO</span>
			</div>
		</AbsoluteFill>
	);
};

export const PinBoardReel: React.FC = () => {
	const {fps, durationInFrames} = useVideoConfig();
	const f = (t: number) => Math.round(t * fps);
	const sfx: {t: number; f: string; v: number}[] = [
		{t: 3.3, f: 'pin:tear', v: 0.5},
		...[0, 1, 2].map((i) => ({t: 6.65 + i * 0.17, f: 'pop', v: 0.16})),
		{t: 9.84, f: 'pop', v: 0.14},
		{t: 15.95, f: 'whoosh', v: 0.08}, {t: 16.7, f: 'click', v: 0.22}, {t: 19.42, f: 'click', v: 0.22},
		{t: 23.66, f: 'click', v: 0.22}, {t: 28.88, f: 'click', v: 0.22},
		{t: 35.75, f: 'pin:glitch', v: 0.22}, {t: 38.3, f: 'pin:glitch', v: 0.3},
		{t: 41.2, f: 'glock', v: 0.14},
		{t: TAKE - 0.1, f: 'whoosh', v: 0.08},
		{t: TAKE + 0.5, f: 'glock', v: 0.1},
	];
	return (
		<AbsoluteFill style={{background: '#000'}}>
			<Sequence name="her" durationInFrames={f(TAKE)}><Her /></Sequence>
			<Sequence name="copies" from={f(6.6)} durationInFrames={f(9.0 - 6.6)}><Copies /></Sequence>
			<Sequence name="logo" from={f(9.8)} durationInFrames={f(12.6 - 9.8)}><LogoChip /></Sequence>
			{INS.map((s, i) => (
				<Sequence key={i} name={`insert ${s.kind}`} from={f(s.a)} durationInFrames={f(s.b) - f(s.a)}><Insert kind={s.kind} from={s.a} /></Sequence>
			))}
			<Captions />
			<Sequence name="end card" from={f(TAKE)}><EndCard /></Sequence>
			<Sequence name="voice" durationInFrames={f(TAKE)} layout="none">
				<Audio src={M('her.mp4')} volume={(fr) => interpolate(fr, [0, 3, f(TAKE) - 6, f(TAKE)], [0, 1, 1, 0], clamp)} />
			</Sequence>
			<Audio name="music" src={M('music.mp3')}
				volume={(fr) => interpolate(fr, [0, f(0.4), f(TAKE - 0.5), f(TAKE + 0.4), durationInFrames - f(1), durationInFrames], [0, 0.035, 0.035, 0.24, 0.24, 0], clamp)} />
			{sfx.map((h, i) => (
				<Sequence key={`s${i}`} name={`sfx ${h.f}`} from={Math.max(0, f(h.t))} durationInFrames={f(2.2)} layout="none">
					<Audio src={staticFile(h.f.startsWith('pin:') ? `sfx/pin/${h.f.slice(4)}.wav` : `sfx/reel/${h.f}.wav`)} volume={h.v} />
				</Sequence>
			))}
		</AbsoluteFill>
	);
};
