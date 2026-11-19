// Holiday gift reel ("create something for them instead of just buying it"): her single take (media/p14/gift.mp4) with
// a cut-in for every step she names. The app screens are built here (prompt typing, concept cards from the real rings
// in media/p15), the stone / bench / ring shots are the user's own clips.
// Instrument Serif captions in a forest green box (spoken word highlighted cream), forest/cream/ink palette, Takshila logo.
import React from 'react';
import {AbsoluteFill, Img, interpolate, OffthreadVideo, Sequence, spring, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import {Audio} from '@remotion/media';
import wordsData from './data/gift_words.json';
import {AFACAD, INSTRUMENT, ROUND, SANS} from './fonts';

const FOREST = '#2E6B3F', TERRA = '#B8553A', LOGO = '#123726', CREAM = '#F3EDE2', INK = '#2E2A26';
const clamp = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'} as const;
const M = (f: string) => staticFile(`media/${f}`);
type W = {w: string; t: number; e: number};
const TAKE = 41.75;
const END = 3.2;
export const giftTotal = () => TAKE + END;

// cut-ins (output seconds = take seconds, the take plays straight through)
type Ins = {a: number; b: number; kind: 'prompt' | 'stone' | 'concepts' | 'shot' | 'send' | 'bench' | 'gloves' | 'hand'};
const INS: Ins[] = [
	{a: 8.05, b: 10.85, kind: 'prompt'},
	{a: 10.85, b: 12.95, kind: 'stone'},
	{a: 12.95, b: 17.95, kind: 'concepts'},
	{a: 19.1, b: 20.45, kind: 'shot'},
	{a: 20.45, b: 21.72, kind: 'send'},
	{a: 21.72, b: 27.05, kind: 'bench'},
	{a: 29.5, b: 31.05, kind: 'gloves'},
	{a: 33.8, b: 38.7, kind: 'hand'},
];
const insAt = (t: number) => INS.find((s) => t >= s.a && t < s.b);

const CONCEPTS = ['p15/oval_top.jpg', 'p15/art_top.jpg', 'p15/art_side_ang.jpg', 'p15/oval_side.jpg'];
const PICK = 0;   // the oval: it is the ring that carries through to the screenshot, the send and the hand shot

// ---------- her ----------
const Her: React.FC = () => {
	const frame = useCurrentFrame();
	const {fps} = useVideoConfig();
	const z = 1.04 + 0.04 * (frame / fps) / TAKE;
	return (
		<AbsoluteFill style={{overflow: 'hidden', background: '#000'}}>
			<OffthreadVideo src={M('p14/gift.mp4')} muted style={{width: 1080, height: 1920, scale: z, transformOrigin: '540px 760px', filter: 'contrast(1.05) saturate(1.03) brightness(1.01)'}} />
		</AbsoluteFill>
	);
};

// ---------- app screens ----------
const Wordmark: React.FC = () => (
	<div style={{position: 'absolute', left: 70, right: 70, top: 150, display: 'flex', alignItems: 'center', justifyContent: 'space-between'}}>
		<Img src={staticFile('takshila_logo.png')} style={{height: 62}} />
		<div style={{fontFamily: AFACAD, fontSize: 26, letterSpacing: '0.3em', color: FOREST}}>HOLIDAY EDIT</div>
	</div>
);
const PROMPT = [
	{at: 8.14, text: 'Our first snowy night in Paris'},
	{at: 9.62, text: ', warm and cozy'},
	{at: 10.85, text: ', an oval diamond'},
];
const typed = (t: number) => {
	let s = '';
	for (const p of PROMPT) {
		if (t < p.at) break;
		const n = Math.floor((t - p.at) * 26);
		s += p.text.slice(0, n);
	}
	return s;
};
const Chip: React.FC<{label: string; at: number; t: number; fps: number; frame: number}> = ({label, at, t, fps, frame}) => {
	if (t < at) return null;
	const a = spring({frame: frame - Math.round(at * fps), fps, config: {damping: 11, mass: 0.4, stiffness: 220}});
	return <span style={{display: 'inline-block', marginRight: 14, padding: '12px 26px', borderRadius: 999, background: FOREST, color: 'white', fontFamily: SANS, fontWeight: 600, fontSize: 30, scale: a}}>{label}</span>;
};
const PromptCard: React.FC<{t: number; generating?: boolean}> = ({t, generating}) => {
	const frame = useCurrentFrame();
	const {fps} = useVideoConfig();
	const txt = typed(t);
	const caret = Math.floor(frame / 8) % 2 === 0;
	return (
		<div style={{position: 'absolute', left: 60, right: 60, top: 270, background: 'white', borderRadius: 34, padding: '40px 44px', boxShadow: '0 18px 50px rgba(46,42,38,0.12)'}}>
			<div style={{fontFamily: AFACAD, fontSize: 24, letterSpacing: '0.28em', color: '#8A7F72'}}>DESCRIBE THE ONE YOU LOVE</div>
			<div style={{marginTop: 18, minHeight: 150, fontFamily: SANS, fontSize: 46, lineHeight: 1.25, color: INK}}>
				{txt}<span style={{opacity: caret && !generating ? 1 : 0, color: FOREST}}>|</span>
			</div>
			<div style={{marginTop: 20, minHeight: 60}}>
				<Chip label="Memory" at={8.56} t={t} fps={fps} frame={frame} />
				<Chip label="Mood" at={9.92} t={t} fps={fps} frame={frame} />
				<Chip label="Stone" at={11.24} t={t} fps={fps} frame={frame} />
			</div>
			<div style={{marginTop: 28, display: 'flex', justifyContent: 'flex-end'}}>
				<span style={{padding: '18px 40px', borderRadius: 16, background: generating ? INK : FOREST, color: 'white', fontFamily: ROUND, fontWeight: 800, fontSize: 30, letterSpacing: '0.04em'}}>
					{generating ? 'CREATING…' : 'CREATE'}
				</span>
			</div>
		</div>
	);
};
const PromptScreen: React.FC<{from: number}> = ({from}) => {
	const frame = useCurrentFrame();
	const {fps} = useVideoConfig();
	const t = from + frame / fps;
	const a = spring({frame, fps, config: {damping: 16, mass: 0.6}});
	return (
		<AbsoluteFill style={{background: CREAM, translate: `0 ${(1 - a) * 80}px`}}>
			<Wordmark />
			<PromptCard t={t} />
		</AbsoluteFill>
	);
};
const ConceptScreen: React.FC<{from: number}> = ({from}) => {
	const frame = useCurrentFrame();
	const {fps} = useVideoConfig();
	const t = from + frame / fps;
	const T0 = 13.5;   // cards land from "concepts"
	const pickAt = 16.45;
	const pickP = spring({frame: frame - Math.round((pickAt - from) * fps), fps, config: {damping: 14, mass: 0.6}});
	const loading = t < T0;
	return (
		<AbsoluteFill style={{background: CREAM}}>
			<Wordmark />
			<div style={{position: 'absolute', left: 60, right: 60, top: 270, fontFamily: AFACAD, fontSize: 30, letterSpacing: '0.24em', color: '#8A7F72'}}>
				{loading ? 'CREATING CONCEPTS…' : `4 CONCEPTS · ${Math.min(t - 12.95, 2.4).toFixed(1)}s`}
			</div>
			{loading && <div style={{position: 'absolute', left: 60, top: 330, height: 8, width: 960 * Math.min(1, (t - from) / (T0 - from)), background: FOREST, borderRadius: 4}} />}
			{CONCEPTS.map((src, i) => {
				const at = T0 + i * 0.32;
				if (t < at) return null;
				const a = spring({frame: frame - Math.round((at - from) * fps), fps, config: {damping: 11, mass: 0.45, stiffness: 200}});
				const col = i % 2, row = Math.floor(i / 2);
				const picked = i === PICK;
				const dim = !picked && pickP > 0.01 ? 1 - 0.55 * pickP : 1;
				const s = picked ? 1 + 0.06 * pickP : 1;
				return (
					<div key={src} style={{position: 'absolute', left: 60 + col * 490, top: 380 + row * 640, width: 470, height: 620, borderRadius: 28, overflow: 'hidden', background: 'white',
						scale: a * s, opacity: dim, zIndex: picked ? 2 : 1, boxShadow: picked && pickP > 0.01 ? `0 0 0 ${10 * pickP}px ${FOREST}, 0 24px 60px rgba(0,0,0,0.25)` : '0 12px 34px rgba(46,42,38,0.14)'}}>
						<Img src={M(src)} style={{width: '100%', height: '100%', objectFit: 'cover'}} />
						<div style={{position: 'absolute', left: 20, bottom: 18, padding: '8px 18px', borderRadius: 999, background: 'rgba(255,255,255,0.9)', fontFamily: AFACAD, fontSize: 22, letterSpacing: '0.18em', color: INK}}>CONCEPT {i + 1}</div>
					</div>
				);
			})}
		</AbsoluteFill>
	);
};

// "screenshot it": the picked concept full screen, a white flash, then it shrinks into the corner like an iOS screenshot
const ShotScreen: React.FC = () => {
	const frame = useCurrentFrame();
	const {fps} = useVideoConfig();
	const t = frame / fps;
	const flashAt = 0.14;
	const flash = interpolate(t, [flashAt, flashAt + 0.04, flashAt + 0.3], [0, 1, 0], clamp);
	const sh = spring({frame: frame - Math.round((flashAt + 0.2) * fps), fps, config: {damping: 15, mass: 0.6}});
	const sc = 1 - 0.62 * sh;
	return (
		<AbsoluteFill style={{background: '#111'}}>
			<div style={{position: 'absolute', left: 0, top: 0, width: 1080, height: 1920, scale: sc, translate: `${sh * -270}px ${sh * 420}px`, borderRadius: 40 * sh, overflow: 'hidden', boxShadow: sh > 0.01 ? '0 20px 60px rgba(0,0,0,0.5)' : 'none', border: sh > 0.01 ? `${8 * sh}px solid white` : 'none'}}>
				<Img src={M(CONCEPTS[PICK])} style={{width: '100%', height: '100%', objectFit: 'cover', scale: 1.02 + 0.03 * t}} />
			</div>
			<AbsoluteFill style={{background: 'white', opacity: flash}} />
		</AbsoluteFill>
	);
};

// "send it to them": a message thread, the concept goes out as a photo with a short note
const SendScreen: React.FC = () => {
	const frame = useCurrentFrame();
	const {fps} = useVideoConfig();
	const a = spring({frame: frame - 2, fps, config: {damping: 13, mass: 0.5, stiffness: 180}});
	const b = spring({frame: frame - 14, fps, config: {damping: 13, mass: 0.5, stiffness: 180}});
	const d = interpolate(frame, [26, 32], [0, 1], clamp);
	return (
		<AbsoluteFill style={{background: CREAM}}>
			<div style={{position: 'absolute', left: 0, right: 0, top: 0, height: 250, background: 'white', borderBottom: '1px solid #E6DFD3', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end', paddingBottom: 28}}>
				<div style={{width: 96, height: 96, borderRadius: 48, background: FOREST, color: 'white', fontFamily: ROUND, fontWeight: 800, fontSize: 42, display: 'flex', alignItems: 'center', justifyContent: 'center'}}>M</div>
				<div style={{marginTop: 10, fontFamily: SANS, fontWeight: 600, fontSize: 30, color: INK}}>Maya</div>
			</div>
			<div style={{position: 'absolute', right: 50, top: 340, width: 600, scale: a, transformOrigin: 'right bottom', borderTopLeftRadius: 34, borderTopRightRadius: 34, overflow: 'hidden', boxShadow: '0 12px 30px rgba(0,0,0,0.12)'}}>
				<Img src={M(CONCEPTS[PICK])} style={{width: 600, height: 720, objectFit: 'cover', display: 'block'}} />
			</div>
			<div style={{position: 'absolute', right: 50, top: 340 + 720, width: 600, scale: a, transformOrigin: 'right top', background: 'white', borderBottomLeftRadius: 34, borderBottomRightRadius: 34,
				padding: '22px 30px 26px', boxShadow: '0 12px 30px rgba(0,0,0,0.10)'}}>
				<Img src={staticFile('takshila_logo.png')} style={{height: 40}} />
				<div style={{marginTop: 10, fontFamily: SANS, fontSize: 26, color: '#8A7F72'}}>takshila.co · design it together</div>
			</div>
			<div style={{position: 'absolute', right: 50, top: 1270, maxWidth: 640, padding: '26px 36px', borderRadius: 36, borderBottomRightRadius: 10, background: FOREST, color: 'white', fontFamily: SANS, fontSize: 40, lineHeight: 1.25, scale: b, transformOrigin: 'right bottom'}}>
				made this thinking of us. design it with me?
			</div>
			<div style={{position: 'absolute', right: 60, top: 1420, fontFamily: SANS, fontSize: 24, color: '#8A7F72', opacity: d}}>Delivered</div>
		</AbsoluteFill>
	);
};

// real footage cut-ins with a slow push
const Clip: React.FC<{src: string; from: number; z0?: number; z1?: number; oy?: number}> = ({src, from, z0 = 1.04, z1 = 1.12, oy = 960}) => {
	const frame = useCurrentFrame();
	const {fps, durationInFrames} = useVideoConfig();
	const p = frame / Math.max(1, durationInFrames);
	return (
		<AbsoluteFill style={{overflow: 'hidden', background: '#000'}}>
			<OffthreadVideo src={M(src)} muted trimBefore={Math.round(from * fps)} style={{width: 1080, height: 1920, scale: z0 + (z1 - z0) * p, transformOrigin: `540px ${oy}px`, filter: 'contrast(1.05) saturate(1.05)'}} />
		</AbsoluteFill>
	);
};
// "shape it together with designers and artisans": the craft on the actual ring (no ring-making footage exists in the
// assets; the bench clip was a bracelet): macro pushes over the hand-engraved band photos, then the engraved shank turning
const Photo: React.FC<{src: string; z0: number; z1: number; ox: number; oy: number}> = ({src, z0, z1, ox, oy}) => {
	const frame = useCurrentFrame();
	const {durationInFrames} = useVideoConfig();
	const p = frame / Math.max(1, durationInFrames);
	const fade = interpolate(frame, [0, 5], [0, 1], clamp);
	return (
		<AbsoluteFill style={{overflow: 'hidden', background: '#000', opacity: fade}}>
			<Img src={M(src)} style={{width: 1080, height: 1920, objectFit: 'cover', scale: z0 + (z1 - z0) * p, transformOrigin: `${ox}px ${oy}px`, filter: 'contrast(1.05) saturate(1.05)'}} />
		</AbsoluteFill>
	);
};
const Craft: React.FC = () => {
	const {fps} = useVideoConfig();
	const f = (t: number) => Math.round(t * fps);
	return (
		<AbsoluteFill>
			<Sequence durationInFrames={f(1.75)}><Photo src="p15/art_side.jpg" z0={1.08} z1={1.28} ox={540} oy={1000} /></Sequence>
			<Sequence from={f(1.75)} durationInFrames={f(1.75)}><Photo src="p15/art_side_ang.jpg" z0={1.12} z1={1.32} ox={560} oy={900} /></Sequence>
			<Sequence from={f(3.5)}><Clip src="p15/art_reveal_v.mp4" from={37.0} z0={1.15} z1={1.25} oy={1060} /></Sequence>
		</AbsoluteFill>
	);
};

const Tag: React.FC<{text: string}> = ({text}) => {
	const frame = useCurrentFrame();
	const {fps} = useVideoConfig();
	const a = spring({frame: frame - 3, fps, config: {damping: 14, mass: 0.5}});
	return (
		<div style={{position: 'absolute', left: 60, top: 170, opacity: a, translate: `${(1 - a) * -40}px 0`, padding: '12px 26px', borderRadius: 10, background: 'rgba(243,237,226,0.94)',
			fontFamily: AFACAD, fontSize: 28, letterSpacing: '0.26em', color: FOREST}}>{text}</div>
	);
};

const Insert: React.FC<{s: Ins}> = ({s}) => {
	switch (s.kind) {
	case 'prompt': return <PromptScreen from={s.a} />;
	case 'stone': return <><Clip src="p15/art_v3_v.mp4" from={7.2} z0={1.1} z1={1.22} /><Tag text="A STONE THEY LOVE" /></>;
	case 'concepts': return <ConceptScreen from={s.a} />;
	case 'shot': return <ShotScreen />;
	case 'send': return <SendScreen />;
	case 'bench': return <><Craft /><Tag text="HAND-ENGRAVED BY OUR ARTISANS" /></>;
	case 'gloves': return <Clip src="p15/art_reveal_v.mp4" from={45.6} z0={1.1} z1={1.2} oy={1060} />;
	case 'hand': return <Clip src="p15/oval_r3_v.mp4" from={1.0} z0={1.04} z1={1.12} />;
	}
};

// ---------- captions ----------
const FIX: Record<string, string> = {'Taksula': 'TAKSHILA.CO', '.com.': '', 'this who': ''};
const KEY = /^(holiday|create|memory|mood|stone|seconds|pick|screenshot|send|designers|artisans|takshila\.co|gift|finished|story|created)$/i;
const WORDS: W[] = (wordsData as W[]).map((w) => ({...w, w: FIX[w.w] ?? w.w})).filter((w) => w.w);
// "Send this who" -> "Send this to who"
{const i = WORDS.findIndex((w) => w.w === 'who'); if (i > 0) WORDS.splice(i, 0, {w: 'to', t: WORDS[i].t - 0.05, e: WORDS[i].t});}
const clean = (s: string) => s.replace(/[.,!?]$/, '');
const groups: W[][] = (() => {
	const res: W[][] = []; let cur: W[] = [];
	WORDS.forEach((w) => {
		if (cur.length && w.t - cur[cur.length - 1].e > 0.6) { res.push(cur); cur = []; }
		cur.push(w);
		const len = cur.map((x) => x.w).join(' ').length;
		if (/[.,!?]$/.test(w.w) || cur.length === 6 || len > 30) { res.push(cur); cur = []; }
	});
	if (cur.length) res.push(cur);
	// never leave a single word on its own when it continues the previous phrase
	for (let i = res.length - 1; i > 0; i--) {
		const prev = res[i - 1];
		if (res[i].length === 1 && !/[.,!?]$/.test(prev[prev.length - 1].w) && res[i][0].t - prev[prev.length - 1].e < 0.6) { prev.push(...res[i]); res.splice(i, 1); }
	}
	return res;
})();
// elegant captions: Instrument Serif, sentence case, no box (white with a soft shadow on footage, ink on the cream app
// screens), key words in italic; the phrase appears whole and only the word being spoken is highlighted in the
// logo's forest green (#123726) with cream text
const Captions: React.FC = () => {
	const frame = useCurrentFrame();
	const {fps} = useVideoConfig();
	const t = frame / fps;
	if (t >= TAKE) return null;
	const ins = insAt(t);
	if (ins?.kind === 'shot') return null;
	const gi = groups.findIndex((g, i) => t >= g[0].t - 0.05 && t < Math.min(g[g.length - 1].e + 0.35, groups[i + 1]?.[0].t ?? 1e9));
	if (gi < 0) return null;
	const g = groups[gi];
	const top = ins ? (ins.kind === 'concepts' ? 1700 : ins.kind === 'send' ? 1560 : ins.kind === 'prompt' ? 1120 : 1480) : 1380;
	const box = spring({frame: frame - Math.round((g[0].t - 0.08) * fps), fps, config: {damping: 16, mass: 0.5, stiffness: 200}});
	const shown = g;   // the whole phrase at once, softly
	const light = !!ins && ['prompt', 'concepts', 'send'].includes(ins.kind);
	return (
		<div style={{position: 'absolute', left: 60, right: 60, top, display: 'flex', justifyContent: 'center'}}>
			<div style={{opacity: box, translate: `0 ${(1 - box) * 12}px`, fontFamily: INSTRUMENT, fontSize: 88, lineHeight: 1.12, textAlign: 'center', maxWidth: 940}}>
				{shown.map((w, i) => {
					const sp = 1;
					const isKey = KEY.test(clean(w.w));
					const strike = /^finished$/i.test(clean(w.w));
					const st = interpolate(t, [w.t + 0.25, w.t + 0.5], [0, 1], clamp);
					const word = clean(w.w).replace(/^TAKSHILA\.CO$/, 'takshila.co');
					const nextT = shown[i + 1]?.t ?? groups[gi + 1]?.[0].t ?? w.e + 0.4;
					const active = t >= w.t - 0.04 && t < Math.min(nextT - 0.02, Math.max(w.e, w.t + 0.18) + 0.25);
					return (
						<span key={i} style={{position: 'relative', display: 'inline-block', marginRight: i < shown.length - 1 ? '0.12em' : 0, opacity: sp, padding: '0 0.12em', borderRadius: 12,
							background: active ? LOGO : 'transparent', color: active ? CREAM : light ? INK : 'white', fontStyle: isKey ? 'italic' : 'normal',
							textShadow: active || light ? 'none' : '0 2px 3px rgba(0,0,0,0.55), 0 0 22px rgba(0,0,0,0.45)'}}>
							{word}
							{strike && <span style={{position: 'absolute', left: -4, top: '56%', height: 5, width: `calc(${st * 100}% + ${8 * st}px)`, background: active ? CREAM : light ? INK : 'white', borderRadius: 3}} />}
						</span>
					);
				})}
			</div>
		</div>
	);
};

// "Send this to who…": a send pill pops above her shoulder
const SendPill: React.FC = () => {
	const frame = useCurrentFrame();
	const {fps} = useVideoConfig();
	const a = spring({frame, fps, config: {damping: 10, mass: 0.45, stiffness: 200}});
	const tap = spring({frame: frame - 34, fps, config: {damping: 12, mass: 0.4}});
	return (
		<div style={{position: 'absolute', left: 540, top: 230, translate: '-50% 0', scale: a * (1 - 0.08 * Math.sin(Math.min(1, tap) * Math.PI)), display: 'flex', alignItems: 'center', gap: 22,
			padding: '26px 52px', borderRadius: 999, background: tap > 0.5 ? TERRA : CREAM, color: tap > 0.5 ? 'white' : FOREST, boxShadow: '0 14px 40px rgba(0,0,0,0.25)', fontFamily: INSTRUMENT, fontSize: 64}}>
			<svg width={52} height={52} viewBox="0 0 24 24"><path d="M3 11.5 21 3l-8.5 18-2-7.5L3 11.5z" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinejoin="round" /></svg>
			{tap > 0.5 ? 'Sent' : <i>Send this</i>}
		</div>
	);
};

const EndCard: React.FC = () => {
	const frame = useCurrentFrame();
	const {fps} = useVideoConfig();
	const s = (o: number) => spring({frame: frame - o, fps, config: {damping: 16, mass: 0.6, stiffness: 160}});
	return (
		<AbsoluteFill style={{background: CREAM, padding: '0 80px', justifyContent: 'center', alignItems: 'center', textAlign: 'center'}}>
			<div style={{fontFamily: AFACAD, fontSize: 30, letterSpacing: '0.34em', color: FOREST, opacity: s(0)}}>THIS HOLIDAY</div>
			<div style={{marginTop: 30, fontFamily: INSTRUMENT, fontSize: 132, lineHeight: 1.0, color: INK}}>
				<div style={{opacity: s(4), translate: `0 ${(1 - s(4)) * 24}px`}}>Don’t buy the gift.</div>
				<div style={{opacity: s(10), translate: `0 ${(1 - s(10)) * 24}px`, fontStyle: 'italic', color: FOREST}}>Create it.</div>
			</div>
			<div style={{marginTop: 64, opacity: s(18), translate: `0 ${(1 - s(18)) * 24}px`}}>
				<span style={{display: 'inline-block', background: FOREST, color: CREAM, fontFamily: AFACAD, fontSize: 34, letterSpacing: '0.24em', padding: '20px 44px', borderRadius: 999}}>DESIGN IT · TAKSHILA.CO</span>
			</div>
		</AbsoluteFill>
	);
};


export const GiftStepsReel: React.FC = () => {
	const {fps, durationInFrames} = useVideoConfig();
	const f = (t: number) => Math.round(t * fps);
	const typing = [8.14, 9.62, 10.85];
	const sfx: {t: number; f: string; v: number; len?: number}[] = [
		...INS.filter((s) => s.kind !== 'send' && s.kind !== 'stone').map((s) => ({t: s.a - 0.12, f: 'whoosh', v: 0.14})),
		...typing.map((t) => ({t, f: 'typing', v: 0.16, len: 1.1})),
		{t: 9.92, f: 'pop', v: 0.2}, {t: 11.24, f: 'pop', v: 0.2},
		{t: 13.0, f: 'click', v: 0.3},
		...[0, 1, 2, 3].map((i) => ({t: 13.5 + i * 0.32, f: 'pop', v: 0.18})),
		{t: 16.45, f: 'click', v: 0.3},
		{t: 19.22, f: 'sms:shutter', v: 1.0},                 // screenshot
		{t: 20.45, f: 'whoosh', v: 0.14},                     // message goes out
		{t: 20.52, f: 'sms:bubble', v: 0.34},                 // photo bubble
		{t: 20.92, f: 'sms:bubble', v: 0.3},                  // text bubble
		{t: 21.3, f: 'sms:received', v: 0.3},                // delivered
		{t: 29.7, f: 'glock', v: 0.16},
		{t: 38.88, f: 'sms:bubble', v: 0.3},                  // send pill pops
		{t: 39.95, f: 'sms:received', v: 0.34},               // tapped: sent
		{t: TAKE - 0.1, f: 'whoosh', v: 0.18},
		{t: TAKE + 0.6, f: 'pop', v: 0.2},
	];
	return (
		<AbsoluteFill style={{background: '#000'}}>
			<Sequence name="her" durationInFrames={f(TAKE)}><Her /></Sequence>
			{INS.map((s, i) => (
				<Sequence key={i} name={`insert ${s.kind}`} from={f(s.a)} durationInFrames={f(s.b) - f(s.a)}><Insert s={s} /></Sequence>
			))}
			<Sequence name="send pill" from={f(38.85)} durationInFrames={f(TAKE - 38.85)}><SendPill /></Sequence>
			<Captions />
			<Sequence name="end card" from={f(TAKE)}><EndCard /></Sequence>
			<Sequence name="voice" durationInFrames={f(TAKE)} layout="none">
				<Audio src={M('p14/gift.mp4')} volume={(fr) => interpolate(fr, [0, 3, f(TAKE) - 6, f(TAKE)], [0, 1, 1, 0], clamp)} />
			</Sequence>
			{/* user's track (instrumental) from the top: the beat drops at 28.13 s, on "So the gift…" */}
			<Audio name="music" src={M('p16/music.mp3')}
				volume={(fr) => interpolate(fr, [0, f(0.5), f(27.9), f(28.4), f(TAKE - 0.3), f(TAKE + 0.4), durationInFrames - f(0.9), durationInFrames], [0, 0.085, 0.085, 0.055, 0.055, 0.2, 0.2, 0], clamp)} />
			{sfx.map((h, i) => (
				<Sequence key={`s${i}`} name={`sfx ${h.f}`} from={Math.max(0, f(h.t))} durationInFrames={f(h.len ?? 2.2)} layout="none">
					<Audio src={staticFile(h.f.startsWith('sms:') ? `sfx/sms/${h.f.slice(4)}.wav` : `sfx/reel/${h.f}.wav`)} volume={h.v} />
				</Sequence>
			))}
		</AbsoluteFill>
	);
};
