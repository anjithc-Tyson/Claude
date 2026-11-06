// Bold Claim script in the reference's influencer style: she talks to camera; on product lines the picture cuts to
// full-screen B-roll with her cut-out in the lower corner (never covering her face). Captions flow one word at a
// time from the first second. Voice only (plus music when supplied): no sound effects.
import React from 'react';
import {AbsoluteFill, Easing, Img, interpolate, OffthreadVideo, Sequence, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import {Audio} from '@remotion/media';
import inflData from './data/infl.json';
import {INSTRUMENT, PLAYFAIR, POPPINS} from './fonts';

const YELLOW = '#ffd84a';
const clamp = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'} as const;
const ease = Easing.bezier(0.16, 1, 0.3, 1);
const springy = Easing.bezier(0.2, 1.5, 0.4, 1);
const SHADOW = '0 2px 3px rgba(0,0,0,0.55), 0 4px 18px rgba(0,0,0,0.4)';

export type FontKey = 'poppins' | 'playfair' | 'instrument';
const FONTS: Record<FontKey, {family: string; weight: number; italicKey: boolean; size: number; track: string}> = {
	poppins: {family: POPPINS, weight: 700, italicKey: false, size: 62, track: '-0.01em'},
	playfair: {family: PLAYFAIR, weight: 700, italicKey: true, size: 68, track: '0'},
	instrument: {family: INSTRUMENT, weight: 400, italicKey: true, size: 76, track: '-0.005em'},
};

type Seg = {clip: string; a: number; b: number; o: number; rate?: number};
const segLen = (s: Seg) => (s.b - s.a) / (s.rate ?? 1);
type Word = {w: string; t: number; e: number; key: boolean};
type Broll = {t: number; e: number; media: string; fit: string};
export type Infl = {total: number; segments: Seg[]; words: Word[]; broll: Broll[]; noCutout?: string[]; hookEnd?: number;
	cta: {t: number; text: string}; music?: {file: string; start: number; vol: number}; font?: FontKey};
export const INFL = inflData as unknown as Infl;
export const INFL_END = 3.2;
export const inflTotal = (d: Infl) => d.total + INFL_END;

const Face: React.FC<{s: Seg}> = ({s}) => {
	const frame = useCurrentFrame();
	const {fps} = useVideoConfig();
	const dur = segLen(s) * fps;
	const vol = interpolate(frame, [0, 2, dur - 2, dur], [0, 1, 1, 0], clamp);
	return <OffthreadVideo src={staticFile(`media/p4/${s.clip}.mp4`)} trimBefore={Math.round(s.a * fps)} playbackRate={s.rate ?? 1} volume={vol} style={{width: 1080, height: 1920}} />;
};

// every B-roll shot fills the whole screen
const Media: React.FC<{b: Broll; i: number}> = ({b, i}) => {
	const frame = useCurrentFrame();
	const {fps} = useVideoConfig();
	const len = (b.e - b.t) * fps;
	// stills get a slow camera move; alternate push-in, pull-out and a sideways drift so cuts feel alive
	const p = interpolate(frame, [0, len], [0, 1], {...clamp, easing: Easing.inOut(Easing.sin)});
	const kind = i % 3;
	const z = kind === 1 ? 1.12 - 0.08 * p : 1.03 + 0.08 * p;
	const dx = kind === 2 ? -24 + 48 * p : 0;
	const style: React.CSSProperties = {width: 1080, height: 1920, objectFit: 'cover', scale: z, translate: `${dx}px 0px`};
	return (
		<AbsoluteFill style={{backgroundColor: '#111'}}>
			{b.media.startsWith('img:') ? (
				<Img src={staticFile(`img/${b.media.slice(4)}`)} style={style} />
			) : (
				<OffthreadVideo src={staticFile(`media/p4/${b.media}`)} muted trimBefore={Math.round(0.4 * fps)} style={style} />
			)}
		</AbsoluteFill>
	);
};

// her cut-out, lower right; the left edge of her frame fades out so no hard line shows where her arm leaves the shot
const Cutout: React.FC<{clip: string; src: number; rate: number}> = ({clip, src, rate}) => {
	const {fps} = useVideoConfig();
	return (
		<AbsoluteFill style={{WebkitMaskImage: 'linear-gradient(to right, transparent 46%, black 58%)', maskImage: 'linear-gradient(to right, transparent 46%, black 58%)'}}>
			<OffthreadVideo src={staticFile(`media/p4/cut/${clip}.webm`)} transparent muted trimBefore={Math.round(src * fps)} playbackRate={rate}
				style={{width: 1080, height: 1920, scale: 0.58, transformOrigin: '1080px 1920px', translate: '60px 0px'}} />
		</AbsoluteFill>
	);
};

// captions like the reference: soft white serif, lowercase, two words at a time, no colour highlights
const chunks2 = (ws: Word[]) => {
	const out: Word[][] = [];
	let cur: Word[] = [];
	for (const w of ws) {
		cur.push(w);
		if (cur.length === 2 || /[.,!?]$/.test(w.w)) {
			out.push(cur);
			cur = [];
		}
	}
	if (cur.length) out.push(cur);
	return out;
};

const Caption: React.FC<{d: Infl; font: FontKey}> = ({d, font}) => {
	const frame = useCurrentFrame();
	const {fps} = useVideoConfig();
	const t = frame / fps;
	const groups = React.useMemo(() => chunks2(d.words), [d.words]);
	if (t >= d.total) return null;
	const gi = groups.findIndex((g, k) => g[0].t <= t && t < Math.min(g[g.length - 1].e + 0.3, groups[k + 1]?.[0].t ?? 1e9));
	if (gi < 0) return null;
	const g = groups[gi];
	const F = FONTS[font];
	const hook = t < (d.hookEnd ?? 0);
	const typed = (w: Word) => {
		const clean = w.w.replace(/[.,!?]+$/, '');
		if (!hook) return clean;
		const span = Math.min(Math.max(0.12, w.e - w.t), 0.05 * clean.length + 0.08);
		return clean.slice(0, Math.max(0, Math.ceil(((t - w.t) / span) * clean.length)));
	};
	const text = g.filter((w) => w.t <= t).map(typed).join(' ');
	const a = hook ? 1 : interpolate(t - g[0].t, [0, 0.08], [0, 1], clamp);
	return (
		<div style={{position: 'absolute', top: 1300, width: 1080, textAlign: 'center', opacity: a}}>
			<span style={{fontFamily: F.family, fontWeight: F.weight, fontSize: F.size, letterSpacing: F.track, color: 'white',
				textTransform: font === 'instrument' ? 'lowercase' : 'none', textShadow: '0 1px 2px rgba(0,0,0,0.6), 0 0 10px rgba(0,0,0,0.45), 0 4px 24px rgba(0,0,0,0.5), 0 0 42px rgba(0,0,0,0.3)'}}>
				{font === 'instrument' ? text.replace(/takshila\.co/i, 'takshila.co') : text}
			</span>
		</div>
	);
};

// CTA: a browser search bar types the address, then a "Design yours" button presses in
const SearchBar: React.FC<{text: string; font: FontKey}> = ({text, font}) => {
	const frame = useCurrentFrame();
	const F = FONTS[font];
	const inA = interpolate(frame, [0, 8], [0, 1], {...clamp, easing: ease});
	const n = Math.round(interpolate(frame, [6, 6 + text.length * 2], [0, text.length], clamp));
	const caret = Math.floor(frame / 8) % 2 === 0;
	return (
		<div style={{position: 'absolute', top: 1450, width: 1080, display: 'flex', justifyContent: 'center', opacity: inA, translate: `0 ${(1 - inA) * 30}px`}}>
			<div style={{width: 760, height: 112, borderRadius: 56, background: 'rgba(255,255,255,0.96)', boxShadow: '0 16px 40px rgba(0,0,0,0.35)',
				display: 'flex', alignItems: 'center', padding: '0 40px', boxSizing: 'border-box', gap: 22}}>
				<svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="#6b6b6b" strokeWidth="2.4" strokeLinecap="round"><circle cx="11" cy="11" r="7" /><path d="M20 20l-4-4" /></svg>
				<div style={{fontFamily: POPPINS, fontWeight: 600, fontSize: 50, color: '#1c1c1c', flex: 1}}>
					{text.slice(0, n)}
					<span style={{opacity: caret ? 1 : 0, color: '#1c1c1c'}}>|</span>
				</div>
			</div>
			<div style={{display: 'none', fontFamily: F.family}} />
		</div>
	);
};

const EndCard: React.FC<{font: FontKey}> = ({font}) => {
	const frame = useCurrentFrame();
	const {fps} = useVideoConfig();
	const F = FONTS[font];
	const z = interpolate(frame, [0, INFL_END * fps], [1.02, 1.1], clamp);
	const a = interpolate(frame, [0, 6], [0, 1], clamp);
	const l1 = interpolate(frame, [4, 14], [0, 1], {...clamp, easing: ease});
	const l2 = interpolate(frame, [12, 22], [0, 1], {...clamp, easing: ease});
	const btn = interpolate(frame, [20, 30], [0, 1], {...clamp, easing: springy});
	return (
		<AbsoluteFill style={{opacity: a, backgroundColor: '#000'}}>
			<Img src={staticFile('img/infl2/15.jpg')} style={{width: 1080, height: 1920, objectFit: 'cover', scale: z}} />
			<AbsoluteFill style={{background: 'linear-gradient(rgba(0,0,0,0.0) 40%, rgba(0,0,0,0.62) 78%)'}} />
			<div style={{position: 'absolute', top: 1220, width: 1080, textAlign: 'center'}}>
				<div style={{opacity: l1, translate: `0 ${(1 - l1) * 24}px`, fontFamily: F.family, fontWeight: F.weight, fontSize: F.size * 1.25, color: 'white', textShadow: SHADOW, lineHeight: 1.05}}>
					Your idea.
				</div>
				<div style={{opacity: l2, translate: `0 ${(1 - l2) * 24}px`, fontFamily: F.family, fontWeight: F.weight, fontStyle: F.italicKey ? 'italic' : 'normal',
					fontSize: F.size * 1.25, color: YELLOW, textShadow: SHADOW, lineHeight: 1.1}}>
					Your piece.
				</div>
				<div style={{marginTop: 54, display: 'inline-block', scale: 0.85 + 0.15 * btn, opacity: btn, background: 'white', color: '#1c1c1c', borderRadius: 999,
					padding: '22px 64px', fontFamily: POPPINS, fontWeight: 700, fontSize: 48, boxShadow: '0 14px 36px rgba(0,0,0,0.4)'}}>
					Design yours at takshila.co
				</div>
			</div>
		</AbsoluteFill>
	);
};

// one real typewriter key strike per letter while the hook types out
const Keys: React.FC<{d: Infl}> = ({d}) => {
	const {fps} = useVideoConfig();
	const hits: {t: number; k: string; v: number}[] = [];
	let n = 0;
	for (const w of d.words) {
		if (w.t >= (d.hookEnd ?? 0)) break;
		const clean = w.w.replace(/[.,!?]+$/, '');
		const span = Math.min(Math.max(0.12, w.e - w.t), 0.05 * clean.length + 0.08);
		for (let c = 0; c < clean.length; c++) {
			hits.push({t: w.t + (span * c) / clean.length, k: ['key00', 'key01', 'key03'][n % 3], v: 0.32 + 0.12 * ((n * 7) % 5) / 4});
			n++;
		}
	}
	return (
		<>
			{hits.map((h, i) => (
				<Sequence key={`k${i}`} name="typewriter key" from={Math.round(h.t * fps)} durationInFrames={6} layout="none">
					<Audio src={staticFile(`sfx/infl/${h.k}.wav`)} volume={h.v} />
				</Sequence>
			))}
		</>
	);
};

export const Influencer: React.FC<{d: Infl}> = ({d}) => {
	const {fps, durationInFrames} = useVideoConfig();
	const font: FontKey = d.font ?? 'instrument';
	const f = (t: number) => Math.round(t * fps);
	const cuts: {from: number; to: number; clip: string; src: number; rate: number}[] = [];
	for (const b of d.broll) {
		for (const s of d.segments) {
			if (d.noCutout?.includes(s.clip)) continue;
			const from = Math.max(b.t, s.o);
			const to = Math.min(b.e, s.o + segLen(s));
			const r = s.rate ?? 1;
			if (to - from > 0.04) cuts.push({from, to, clip: s.clip, src: s.a + (from - s.o) * r, rate: r});
		}
	}
	return (
		<AbsoluteFill style={{backgroundColor: 'black'}}>
			{d.segments.map((s, i) => (
				<Sequence key={`f${i}`} name={`${s.clip} ${s.a}`} from={f(s.o)} durationInFrames={Math.max(1, f(s.o + segLen(s)) - f(s.o))}>
					<Face s={s} />
				</Sequence>
			))}
			{d.broll.map((b, i) => (
				<Sequence key={`b${i}`} name={`broll ${b.media}`} from={f(b.t)} durationInFrames={Math.max(1, f(b.e) - f(b.t))}>
					<Media b={b} i={i} />
				</Sequence>
			))}
			{cuts.map((c, i) => (
				<Sequence key={`c${i}`} name={`cutout ${c.clip}`} from={f(c.from)} durationInFrames={Math.max(1, f(c.to) - f(c.from))}>
					<Cutout clip={c.clip} src={c.src} rate={c.rate} />
				</Sequence>
			))}
			<Caption d={d} font={font} />
			<Keys d={d} />
			<Sequence name="cta search bar" from={f(d.cta.t)} durationInFrames={f(d.total - d.cta.t)}>
				<SearchBar text={d.cta.text} font={font} />
			</Sequence>
			<Sequence name="end card" from={f(d.total)}>
				<EndCard font={font} />
			</Sequence>
			{d.music ? (
				<Audio name="music" src={staticFile(`media/${d.music.file}`)} trimBefore={f(d.music.start)}
					volume={(fr) => interpolate(fr, [0, 10, f(d.total), f(d.total) + 8, durationInFrames - 20, durationInFrames],
						[0, d.music!.vol, d.music!.vol, d.music!.vol * 2.2, d.music!.vol * 2.2, 0], clamp)} />
			) : null}
		</AbsoluteFill>
	);
};
