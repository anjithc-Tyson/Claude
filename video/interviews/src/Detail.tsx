// Script 4, the curiosity gap: a card shows the finished ring with one spot hidden behind a lock. Three pins open as she
// names the person, the moment and what they carry; the design specs tick in; on "made to hold something…" the lock
// opens and the hidden detail is revealed. Ends on an Instagram-style question sticker. Same framing and safe zones as
// script 3 (box bottom-left, clear of Instagram's caption row and buttons).
import React from 'react';
import {AbsoluteFill, Easing, Img, interpolate, OffthreadVideo, Sequence, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import {Audio} from '@remotion/media';
import detailData from './data/detail.json';
import {AFACAD, CORMORANT_G, INSTRUMENT} from './fonts';

const C = {bg: '#F5EFE7', card: '#FBF8F3', plum: '#2B1016', mauve: '#6D3B54', taupe: '#7A5D63', line: '#E7DCCF', gold: '#C9A14A', chip: '#F1E8DD'};
const clamp = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'} as const;
const ease = Easing.bezier(0.16, 1, 0.3, 1);
const springy = Easing.bezier(0.2, 1.5, 0.4, 1);
const fade = (t: number, at: number, len = 0.3) => interpolate(t, [at, at + len], [0, 1], {...clamp, easing: ease});

type Seg = {a: number; b: number; o: number; rate: number};
type Word = {w: string; t: number; e: number; key: boolean};
type Ev = {t: number; ev: string; n?: number; label?: string; img?: string};
export type DetailData = {clip: string; total: number; segments: Seg[]; words: Word[]; events: Ev[]; images?: Record<string, string>; placeholders?: boolean;
	music?: {file: string; start: number; vol: number}; spot?: {x: number; y: number; r: number}};
export const DETAIL = detailData as unknown as DetailData;
export const DETAIL_END = 3.6;
export const detailTotal = (d: DetailData) => d.total + DETAIL_END;
const segLen = (s: Seg) => (s.b - s.a) / s.rate;

// stand-ins until D1–D3 arrive: a finished ring, its hidden detail, a keepsake shot
const PLACEHOLDER: Record<string, string> = {D1: 'studio2/P11.jpg', D2: 'studio2/P05.jpg', D3: 'journey/J11c.jpg'};
const imgOf = (d: DetailData, k: string) => staticFile(`img/${d.placeholders === false ? d.images?.[k] : PLACEHOLDER[k]}`);

const FRAME = {scale: 1.1, lift: 180};
const CARD_BOTTOM = 1650;

const Face: React.FC<{d: DetailData; s: Seg}> = ({d, s}) => {
	const frame = useCurrentFrame();
	const {fps} = useVideoConfig();
	const dur = segLen(s) * fps;
	const vol = interpolate(frame, [0, 2, dur - 2, dur], [0, 1, 1, 0], clamp);
	return (
		<AbsoluteFill style={{overflow: 'hidden'}}>
			<OffthreadVideo src={staticFile(`media/p7/${d.clip}.mp4`)} trimBefore={Math.round(s.a * fps)} playbackRate={s.rate} volume={vol}
				style={{position: 'absolute', width: 1080, height: 1920, scale: FRAME.scale, transformOrigin: '540px 0px', top: -FRAME.lift}} />
		</AbsoluteFill>
	);
};

const Caption: React.FC<{d: DetailData}> = ({d}) => {
	const frame = useCurrentFrame();
	const {fps} = useVideoConfig();
	const t = frame / fps;
	const groups = React.useMemo(() => {
		const out: Word[][] = [];
		let cur: Word[] = [];
		for (const w of d.words) {
			cur.push(w);
			if (cur.length === 2 || /[.,!?]$/.test(w.w)) {
				out.push(cur);
				cur = [];
			}
		}
		if (cur.length) out.push(cur);
		return out;
	}, [d.words]);
	if (t >= d.total) return null;
	const cardOn = t >= (d.events.find((e) => e.ev === 'lock')?.t ?? 1e9) - 0.3;
	const g = groups.find((x, k) => x[0].t <= t && t < Math.min(x[x.length - 1].e + 0.3, groups[k + 1]?.[0].t ?? 1e9));
	if (!g) return null;
	const text = g.filter((w) => w.t <= t).map((w) => w.w.replace(/[.,!?]+$/, '')).join(' ');
	return (
		<div style={{position: 'absolute', top: cardOn ? 985 : 1090, left: 40, width: 830, textAlign: 'center'}}>
			<span style={{fontFamily: INSTRUMENT, fontSize: 76, color: 'white', textTransform: 'lowercase',
				textShadow: '0 1px 2px rgba(0,0,0,0.6), 0 0 10px rgba(0,0,0,0.45), 0 4px 24px rgba(0,0,0,0.5), 0 0 42px rgba(0,0,0,0.3)'}}>{text}</span>
		</div>
	);
};

const Lock: React.FC<{open: number}> = ({open}) => (
	<svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
		<rect x="5" y="11" width="14" height="10" rx="2.5" fill="rgba(43,16,22,0.55)" />
		<path d={`M8 11 V7.5 a4 4 0 0 1 8 0 V${11 - 4 * open}`} transform={`translate(0 ${-2.2 * open})`} />
		<circle cx="12" cy="16" r="1.3" fill="white" />
	</svg>
);

const Card: React.FC<{d: DetailData}> = ({d}) => {
	const frame = useCurrentFrame();
	const {fps} = useVideoConfig();
	const t = frame / fps;
	const ev = d.events;
	const lock = ev.find((e) => e.ev === 'lock')!;
	const pins = ev.filter((e) => e.ev === 'pin');
	const specs = ev.filter((e) => e.ev === 'spec');
	const unlock = ev.find((e) => e.ev === 'unlock')!;
	const question = ev.find((e) => e.ev === 'question')!;
	if (t >= question.t) return null;
	const inA = fade(t, lock.t - 0.2, 0.45);
	const opened = pins.filter((p) => p.t <= t).length;
	const open = interpolate(t, [unlock.t, unlock.t + 0.35], [0, 1], {...clamp, easing: springy});
	const reveal = fade(t, unlock.t + 0.35, 0.5);
	const spot = d.spot ?? {x: 50, y: 60, r: 24};
	return (
		<div style={{position: 'absolute', left: 40, bottom: 1920 - CARD_BOTTOM, width: 830, opacity: inA, translate: `0 ${(1 - inA) * 40}px`, background: 'rgba(251,248,243,0.97)',
			borderRadius: 34, boxShadow: '0 20px 50px rgba(0,0,0,0.3)', padding: '20px 24px 22px', boxSizing: 'border-box'}}>
			<div style={{display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14}}>
				<div style={{display: 'flex', alignItems: 'center', gap: 14}}>
					<Img src={staticFile('img/studio/logo.png')} style={{height: 34}} />
					<div style={{fontFamily: AFACAD, fontSize: 21, color: C.taupe, letterSpacing: '0.12em'}}>THE DETAIL</div>
				</div>
				<div style={{fontFamily: AFACAD, fontSize: 21, color: open > 0.5 ? 'white' : C.mauve, background: open > 0.5 ? C.gold : C.chip, borderRadius: 18, padding: '5px 16px'}}>
					{open > 0.5 ? '✦ Revealed' : `🔒 ${opened}/3 unlocked`}
				</div>
			</div>
			<div style={{display: 'flex', gap: 22}}>
				{/* the ring, with the detail hidden under a blurred, locked spot */}
				<div style={{width: 300, height: 300, borderRadius: 24, overflow: 'hidden', position: 'relative', flexShrink: 0, background: C.card}}>
					<Img src={imgOf(d, 'D1')} style={{position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', opacity: 1 - reveal}} />
					<div style={{position: 'absolute', inset: 0, clipPath: `circle(${spot.r * (1 - open)}% at ${spot.x}% ${spot.y}%)`, opacity: 1 - reveal}}>
						<Img src={imgOf(d, 'D1')} style={{width: '100%', height: '100%', objectFit: 'cover', filter: 'blur(14px) brightness(1.05)', scale: 1.08}} />
					</div>
					{open < 1 ? (
						<div style={{position: 'absolute', left: `calc(${spot.x}% - 32px)`, top: `calc(${spot.y}% - 32px)`, opacity: 1 - open, scale: 1 + 0.06 * Math.sin(t * 4)}}>
							<Lock open={open} />
						</div>
					) : null}
					<Img src={imgOf(d, 'D2')} style={{position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', opacity: reveal,
						scale: interpolate(t, [unlock.t + 0.35, unlock.t + 1.4], [1.25, 1], {...clamp, easing: ease})}} />
				</div>
				<div style={{flex: 1}}>
					<div style={{fontFamily: CORMORANT_G, fontSize: 40, lineHeight: 1.04, color: C.plum}}>
						{open > 0.5 ? <>Made to hold <i>what matters</i></> : <>The detail that makes it <i>personal</i></>}
					</div>
					<div style={{marginTop: 14, display: 'flex', flexDirection: 'column', gap: 8}}>
						{['The person', 'The moment', 'What they carry'].map((l, i) => {
							const p = pins[i];
							const on = p && t >= p.t;
							return (
								<div key={l} style={{display: 'flex', alignItems: 'center', gap: 12, opacity: on ? 1 : 0.5}}>
									<div style={{width: 30, height: 30, borderRadius: 15, background: on ? C.gold : 'transparent', border: `2px solid ${on ? C.gold : C.line}`, color: 'white',
										fontFamily: AFACAD, fontSize: 18, display: 'flex', alignItems: 'center', justifyContent: 'center', scale: on ? interpolate(t, [p.t, p.t + 0.25], [0.6, 1], {...clamp, easing: springy}) : 1}}>
										{on ? '✓' : ''}
									</div>
									<div style={{fontFamily: AFACAD, fontSize: 25, color: C.plum}}>{l}</div>
								</div>
							);
						})}
					</div>
					<div style={{marginTop: 16, display: 'flex', flexWrap: 'wrap', gap: 8}}>
						{specs.filter((s) => s.t <= t).map((s) => (
							<div key={s.label} style={{fontFamily: AFACAD, fontSize: 21, color: C.mauve, background: C.chip, borderRadius: 16, padding: '5px 14px',
								opacity: fade(t, s.t, 0.2), scale: interpolate(t, [s.t, s.t + 0.22], [0.7, 1], {...clamp, easing: springy})}}>✓ {s.label}</div>
						))}
					</div>
				</div>
			</div>
		</div>
	);
};

// Instagram-style question sticker
const Question: React.FC<{d: DetailData}> = ({d}) => {
	const frame = useCurrentFrame();
	const {fps} = useVideoConfig();
	const t = frame / fps;
	const q = d.events.find((e) => e.ev === 'question')!;
	if (t < q.t || t >= d.total) return null;
	const a = interpolate(t, [q.t, q.t + 0.35], [0, 1], {...clamp, easing: springy});
	const qText = 'What detail would you build your perfect piece around?';
	return (
		<div style={{position: 'absolute', left: 40, bottom: 1920 - CARD_BOTTOM, width: 830, scale: 0.8 + 0.2 * a, opacity: Math.min(1, a * 1.4), transformOrigin: '415px 100%'}}>
			<div style={{borderRadius: 34, overflow: 'hidden', boxShadow: '0 20px 50px rgba(0,0,0,0.3)'}}>
				<div style={{background: `linear-gradient(120deg, ${C.plum}, ${C.mauve})`, padding: '26px 36px', display: 'flex', alignItems: 'center', gap: 16}}>
					<Img src={staticFile('img/studio/logo.png')} style={{height: 40, filter: 'brightness(0) invert(1)'}} />
					<div style={{fontFamily: AFACAD, fontSize: 28, color: 'rgba(255,255,255,0.9)'}}>has a question for you</div>
				</div>
				<div style={{background: 'white', padding: '28px 36px 34px'}}>
					<div style={{fontFamily: CORMORANT_G, fontSize: 52, lineHeight: 1.08, color: C.plum}}>{qText}</div>
					<div style={{marginTop: 22, background: C.chip, borderRadius: 20, padding: '18px 24px', fontFamily: AFACAD, fontSize: 28, color: '#A89A93'}}>
						Type your answer…<span style={{color: C.mauve, opacity: Math.floor(frame / 8) % 2 === 0 ? 1 : 0}}> |</span>
					</div>
				</div>
			</div>
		</div>
	);
};

const EndCard: React.FC<{d: DetailData}> = ({d}) => {
	const frame = useCurrentFrame();
	const {fps} = useVideoConfig();
	const t = frame / fps;
	const a = interpolate(frame, [0, 8], [0, 1], clamp);
	const z = interpolate(frame, [0, DETAIL_END * fps], [1.03, 1.1], clamp);
	const h = fade(t, 0.25, 0.4);
	const b = fade(t, 0.8, 0.35);
	return (
		<AbsoluteFill style={{opacity: a, backgroundColor: C.bg, alignItems: 'center'}}>
			<Img src={staticFile('img/studio/logo.png')} style={{marginTop: 270, height: 84}} />
			<div style={{marginTop: 26, textAlign: 'center', opacity: h}}>
				<span style={{fontFamily: CORMORANT_G, fontSize: 88, color: C.plum}}>Your story, </span>
				<span style={{fontFamily: CORMORANT_G, fontStyle: 'italic', fontSize: 92, color: C.mauve}}>your detail</span>
			</div>
			<div style={{marginTop: 30, width: 680, height: 600, borderRadius: 36, overflow: 'hidden', boxShadow: '0 26px 60px rgba(43,16,22,0.2)'}}>
				<Img src={imgOf(d, 'D3')} style={{width: '100%', height: '100%', objectFit: 'cover', scale: z}} />
			</div>
			<div style={{marginTop: 40, opacity: b, translate: `0 ${(1 - b) * 18}px`, display: 'flex', alignItems: 'center', gap: 18}}>
				<div style={{background: 'white', border: `1.5px solid ${C.line}`, borderRadius: 40, padding: '20px 34px', fontFamily: AFACAD, fontSize: 32, color: C.plum}}>💬 Tell us in the comments</div>
				<div style={{background: C.plum, color: 'white', borderRadius: 40, padding: '20px 34px', fontFamily: AFACAD, fontSize: 32}}>takshila.co</div>
			</div>
		</AbsoluteFill>
	);
};

// only sounds from the supplied reel pack
const Sfx: React.FC<{d: DetailData}> = ({d}) => {
	const {fps} = useVideoConfig();
	const ev = d.events;
	const one = (n: string) => ev.find((e) => e.ev === n)!;
	const hits: {t: number; f: string; v: number; len?: number}[] = [{t: one('lock').t - 0.3, f: 'whoosh', v: 0.3}];
	ev.filter((e) => e.ev === 'pin').forEach((e) => hits.push({t: e.t, f: 'tick', v: 0.45}));
	ev.filter((e) => e.ev === 'spec').forEach((e) => hits.push({t: e.t, f: 'pop', v: 0.28}));
	const u = one('unlock').t;
	hits.push({t: u - 1.5, f: 'riser', v: 0.22, len: 1.65}, {t: u, f: 'click', v: 0.55}, {t: u + 0.35, f: 'glock', v: 0.38});
	const q = one('question').t;
	hits.push({t: q - 0.1, f: 'whoosh', v: 0.3}, {t: q + 0.1, f: 'pop', v: 0.35});
	hits.push({t: d.total - 1.5, f: 'riser', v: 0.2, len: 1.65}, {t: d.total - 0.15, f: 'whoosh', v: 0.25}, {t: d.total + 0.8, f: 'click', v: 0.5});
	return (
		<>
			{hits.map((h, i) => (
				<Sequence key={`s${i}`} name={`sfx ${h.f}`} from={Math.max(0, Math.round(h.t * fps))} durationInFrames={Math.round((h.len ?? 2.2) * fps)} layout="none">
					<Audio src={staticFile(`sfx/reel/${h.f}.wav`)} volume={h.v} />
				</Sequence>
			))}
		</>
	);
};

export const DetailReel: React.FC<{d: DetailData}> = ({d}) => {
	const {fps, durationInFrames} = useVideoConfig();
	const f = (t: number) => Math.round(t * fps);
	const T = Math.min(f(d.total), durationInFrames - 30);
	return (
		<AbsoluteFill style={{backgroundColor: 'black'}}>
			{d.segments.map((s, i) => (
				<Sequence key={`f${i}`} name={`take ${s.a}`} from={f(s.o)} durationInFrames={Math.max(1, f(s.o + segLen(s)) - f(s.o))}>
					<Face d={d} s={s} />
				</Sequence>
			))}
			<AbsoluteFill style={{background: 'linear-gradient(rgba(0,0,0,0) 50%, rgba(0,0,0,0.3) 100%)'}} />
			<Caption d={d} />
			<Card d={d} />
			<Question d={d} />
			<Sequence name="end card" from={f(d.total)}>
				<EndCard d={d} />
			</Sequence>
			<Sfx d={d} />
			{d.music ? (
				<Audio name="music" src={staticFile(`media/${d.music.file}`)} trimBefore={f(d.music.start)}
					volume={(fr) => interpolate(fr, [0, 10, T, T + 8, Math.max(T + 9, durationInFrames - 20), Math.max(T + 10, durationInFrames)],
						[0, d.music!.vol, d.music!.vol, d.music!.vol * 2.2, d.music!.vol * 2.2, 0], clamp)} />
			) : null}
		</AbsoluteFill>
	);
};
