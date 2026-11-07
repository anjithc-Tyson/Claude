// Script 4 as a bold creator edit: tight jump cuts with alternating punch-ins (harder snaps on the big words),
// huge uppercase captions with a yellow highlight on the keyword, quick full-screen photo cuts with a flash,
// emoji stickers and punchy sounds from the supplied reel pack. Full frame (no Instagram safe-zone limits).
import React from 'react';
import {AbsoluteFill, Easing, Img, interpolate, OffthreadVideo, Sequence, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import {Audio} from '@remotion/media';
import detailData from './data/detail.json';
import {POPPINS} from './fonts';

const clamp = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'} as const;
const springy = Easing.bezier(0.2, 1.6, 0.4, 1);
const ease = Easing.bezier(0.16, 1, 0.3, 1);
const YELLOW = '#F5C518';

type Seg = {a: number; b: number; o: number; rate: number};
type Word = {w: string; t: number; e: number; key: boolean};
type D = {clip: string; total: number; segments: Seg[]; words: Word[]};
export const BOLDC = detailData as unknown as D;
export const BOLDC_END = 3.4;
export const boldcTotal = (d: D) => d.total + BOLDC_END;
const segLen = (s: Seg) => (s.b - s.a) / s.rate;

// her face sits at about (536, 590) on screen in the base framing (scale 1.1, lifted 180 px)
const FACE = {x: 536, y: 590};
const SNAP = ['detail', 'personal.', 'person,', 'different.', 'everything.', 'question'];   // words that get a hard punch-in

// quick full-screen photo cuts on the words they illustrate
const BROLL: {word: string; after: number; imgs: string[]; dur: number}[] = [
	{word: 'finished', after: 0, imgs: ['studio2/P11.jpg'], dur: 1.0},
	{word: 'detail', after: 4, imgs: ['studio2/P05.jpg'], dur: 0.9},
	{word: 'moment', after: 12, imgs: ['journey/J02.jpg'], dur: 0.8},
	{word: 'carry', after: 14, imgs: ['journey/J01.jpg'], dur: 0.9},
	{word: 'metal,', after: 19, imgs: ['studio2/P06.jpg', 'studio2/P07.jpg', 'studio2/P08.jpg'], dur: 0.9},
	{word: 'proportions', after: 20, imgs: ['studio2/P11.jpg'], dur: 0.75},
	{word: 'everything.', after: 39, imgs: ['journey/J10.jpg'], dur: 1.1},
	{word: 'perfect', after: 46, imgs: ['journey/J11c.jpg'], dur: 1.2},
];
const STICKERS: {word: string; after: number; emoji: string; x: number; y: number; rot: number}[] = [
	{word: 'personal.', after: 5, emoji: '❤️', x: 860, y: 1480, rot: 12},
	{word: 'template.', after: 9, emoji: '🚫', x: 220, y: 1480, rot: -10},
	{word: 'person,', after: 11, emoji: '🙋‍♀️', x: 860, y: 1480, rot: 10},
	{word: 'balanced,', after: 23, emoji: '⚖️', x: 220, y: 1480, rot: -10},
	{word: 'different.', after: 31, emoji: '💯', x: 860, y: 1480, rot: 14},
	{word: 'question', after: 41, emoji: '🤔', x: 220, y: 1480, rot: -12},
	{word: 'around?', after: 48, emoji: '👇', x: 540, y: 1500, rot: 0},
];
const at = (d: D, w: string, after: number) => d.words.find((x) => x.t >= after && x.w === w)?.t ?? 1e9;

const Face: React.FC<{d: D; s: Seg; zoom: (t: number) => number}> = ({d, s, zoom}) => {
	const frame = useCurrentFrame();
	const {fps} = useVideoConfig();
	const dur = segLen(s) * fps;
	const vol = interpolate(frame, [0, 2, dur - 2, dur], [0, 1, 1, 0], clamp);
	const z = zoom(s.o + frame / fps);
	return (
		<AbsoluteFill style={{overflow: 'hidden', scale: z, transformOrigin: `${FACE.x}px ${FACE.y}px`}}>
			<OffthreadVideo src={staticFile(`media/p7/${d.clip}.mp4`)} trimBefore={Math.round(s.a * fps)} playbackRate={s.rate} volume={vol}
				style={{position: 'absolute', width: 1080, height: 1920, scale: 1.1, transformOrigin: '540px 0px', top: -180, filter: 'contrast(1.06) saturate(1.08)'}} />
		</AbsoluteFill>
	);
};

const groupsOf = (words: Word[]) => {
	const out: Word[][] = [];
	let cur: Word[] = [];
	for (const w of words) {
		cur.push(w);
		if (/[.,!?]$/.test(w.w) || cur.length === 3) {
			out.push(cur);
			cur = [];
		}
	}
	if (cur.length) out.push(cur);
	return out;
};

const Captions: React.FC<{d: D}> = ({d}) => {
	const frame = useCurrentFrame();
	const {fps} = useVideoConfig();
	const t = frame / fps;
	const groups = React.useMemo(() => groupsOf(d.words), [d.words]);
	if (t >= d.total) return null;
	const gi = groups.findIndex((g, k) => g[0].t <= t && t < Math.min(g[g.length - 1].e + 0.25, groups[k + 1]?.[0].t ?? 1e9));
	if (gi < 0) return null;
	const g = groups[gi];
	const pop = interpolate(t - g[0].t, [0, 0.12], [0.6, 1], {...clamp, easing: springy});
	const key = g.find((w) => w.key) ?? null;
	return (
		<div style={{position: 'absolute', left: 50, right: 50, top: 1180, display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '6px 22px', scale: pop}}>
			{g.map((w, i) => {
				const on = t >= w.t;
				const hot = w === key;
				const bump = interpolate(t - w.t, [0, 0.08, 0.16], [1, 1.12, 1], clamp);
				return (
					<span key={i} style={{fontFamily: POPPINS, fontWeight: 800, fontSize: 112, lineHeight: 1.05, textTransform: 'uppercase', color: hot ? '#111' : 'white',
						background: hot ? YELLOW : 'transparent', borderRadius: 16, padding: hot ? '0 16px' : 0, opacity: on ? 1 : 0.35, scale: on ? bump : 1, rotate: hot ? '-2deg' : '0deg',
						textShadow: hot ? 'none' : '0 6px 0 rgba(0,0,0,0.85), 0 0 26px rgba(0,0,0,0.55)', WebkitTextStroke: hot ? 'none' : '3px #000'}}>
						{w.w.replace(/[.,!?]+$/, '').replace('takshila.co', 'TAKSHILA.CO')}
					</span>
				);
			})}
		</div>
	);
};

const Broll: React.FC<{imgs: string[]; dur: number}> = ({imgs, dur}) => {
	const frame = useCurrentFrame();
	const {fps} = useVideoConfig();
	const t = frame / fps;
	const k = Math.min(imgs.length - 1, Math.floor((t / dur) * imgs.length));
	const flash = interpolate(t, [0, 0.07], [0.85, 0], clamp);
	const z = interpolate(t, [0, dur], [1.18, 1.0], {...clamp, easing: ease});
	return (
		<AbsoluteFill style={{background: '#000'}}>
			<Img src={staticFile(`img/${imgs[k]}`)} style={{width: 1080, height: 1920, objectFit: 'cover', scale: z}} />
			<AbsoluteFill style={{background: 'white', opacity: flash}} />
		</AbsoluteFill>
	);
};

const Sticker: React.FC<{emoji: string; x: number; y: number; rot: number}> = ({emoji, x, y, rot}) => {
	const frame = useCurrentFrame();
	const s = interpolate(frame, [0, 6], [0, 1], {...clamp, easing: springy});
	const out = interpolate(frame, [30, 36], [1, 0], clamp);
	return <div style={{position: 'absolute', left: x - 90, top: y - 90, width: 180, height: 180, fontSize: 150, lineHeight: '180px', textAlign: 'center', scale: s * out, rotate: `${rot}deg`}}>{emoji}</div>;
};

const EndCard: React.FC = () => {
	const frame = useCurrentFrame();
	const {fps} = useVideoConfig();
	const z = interpolate(frame, [0, BOLDC_END * fps], [1.05, 1.15], clamp);
	const p1 = interpolate(frame, [4, 12], [0.5, 1], {...clamp, easing: springy});
	const p2 = interpolate(frame, [14, 22], [0, 1], {...clamp, easing: springy});
	return (
		<AbsoluteFill style={{background: '#000'}}>
			<Img src={staticFile('img/journey/J10.jpg')} style={{width: 1080, height: 1920, objectFit: 'cover', scale: z, filter: 'brightness(0.75)'}} />
			<div style={{position: 'absolute', left: 50, right: 50, top: 1120, textAlign: 'center', scale: p1}}>
				<div style={{fontFamily: POPPINS, fontWeight: 800, fontSize: 104, lineHeight: 1.04, color: 'white', textShadow: '0 6px 0 rgba(0,0,0,0.85)', WebkitTextStroke: '3px #000'}}>COMMENT YOUR</div>
				<div style={{display: 'inline-block', marginTop: 10, fontFamily: POPPINS, fontWeight: 800, fontSize: 116, color: '#111', background: YELLOW, borderRadius: 18, padding: '0 22px', rotate: '-2deg'}}>DETAIL 👇</div>
			</div>
			<div style={{position: 'absolute', left: 0, right: 0, top: 1480, display: 'flex', justifyContent: 'center', scale: p2, opacity: p2}}>
				<div style={{background: 'white', color: '#111', borderRadius: 50, padding: '22px 60px', fontFamily: POPPINS, fontWeight: 800, fontSize: 54}}>takshila.co</div>
			</div>
		</AbsoluteFill>
	);
};

export const BoldCreatorReel: React.FC<{d: D}> = ({d}) => {
	const {fps, durationInFrames} = useVideoConfig();
	const f = (t: number) => Math.round(t * fps);
	const groups = React.useMemo(() => groupsOf(d.words), [d.words]);
	// alternate 1.0 / 1.16 per phrase (a jump-cut feel), snapping to 1.34 for 0.7 s on the big words
	const zoom = (t: number) => {
		const gi = Math.max(0, groups.findIndex((g, k) => t < (groups[k + 1]?.[0].t ?? 1e9)));
		let z = gi % 2 ? 1.16 : 1.0;
		for (const w of d.words) if (SNAP.includes(w.w) && t >= w.t && t < w.t + 0.7) z = 1.34;
		return z;
	};
	const broll = BROLL.map((b) => ({...b, t: at(d, b.word, b.after)})).filter((b) => b.t < 1e8);
	const stickers = STICKERS.map((s) => ({...s, t: at(d, s.word, s.after)})).filter((s) => s.t < 1e8);
	const T = Math.min(f(d.total), durationInFrames - 30);
	return (
		<AbsoluteFill style={{backgroundColor: 'black'}}>
			{d.segments.map((s, i) => (
				<Sequence key={`f${i}`} name={`take ${s.a}`} from={f(s.o)} durationInFrames={Math.max(1, f(s.o + segLen(s)) - f(s.o))}>
					<Face d={d} s={s} zoom={zoom} />
				</Sequence>
			))}
			{broll.map((b, i) => (
				<Sequence key={`b${i}`} name={`broll ${b.word}`} from={f(b.t - 0.05)} durationInFrames={f(b.dur)}>
					<Broll imgs={b.imgs} dur={b.dur} />
				</Sequence>
			))}
			<Captions d={d} />
			{stickers.map((s, i) => (
				<Sequence key={`st${i}`} name={`sticker ${s.emoji}`} from={f(s.t)} durationInFrames={36}>
					<Sticker emoji={s.emoji} x={s.x} y={s.y} rot={s.rot} />
				</Sequence>
			))}
			<Sequence name="end card" from={f(d.total)}>
				<EndCard />
			</Sequence>
			{/* sound: only the supplied reel pack */}
			{broll.map((b, i) => (
				<Sequence key={`sw${i}`} from={Math.max(0, f(b.t - 0.12))} durationInFrames={f(1.5)} layout="none">
					<Audio src={staticFile('sfx/reel/whoosh.wav')} volume={0.3} />
				</Sequence>
			))}
			{stickers.map((s, i) => (
				<Sequence key={`sp${i}`} from={f(s.t)} durationInFrames={f(0.6)} layout="none">
					<Audio src={staticFile('sfx/reel/pop.wav')} volume={0.32} />
				</Sequence>
			))}
			<Sequence from={f(d.total)} durationInFrames={f(1.5)} layout="none"><Audio src={staticFile('sfx/reel/whoosh.wav')} volume={0.3} /></Sequence>
			<Sequence from={f(d.total + 0.5)} durationInFrames={f(1.2)} layout="none"><Audio src={staticFile('sfx/reel/pop.wav')} volume={0.4} /></Sequence>
			<Audio name="music" src={staticFile('media/p5/parampampam.mp3')} trimBefore={f(27)}
				volume={(fr) => interpolate(fr, [0, 10, T, T + 8, Math.max(T + 9, durationInFrames - 20), Math.max(T + 10, durationInFrames)], [0, 0.11, 0.11, 0.24, 0.24, 0], clamp)} />
		</AbsoluteFill>
	);
};
