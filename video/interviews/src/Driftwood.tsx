// Driftwood ring story ("How do you take a memory you can't hold and turn it into something you wear forever?"):
// her take (media/p17/her.mp4) with the retakes removed, and "memory to metal" cut-ins that follow the story:
// coastline -> the couple -> salt, air and sun -> driftwood -> driftwood curve becomes the sketch -> the weathered gold
// band -> the ring on her hand -> "simple, quiet, beautiful". Stock: Mixkit (coast, couple, waves); driftwood, sketch,
// ring and hand images generated (Figma). Captions as the holiday reel: Instrument Serif, no box, the spoken word
// highlighted in the logo green. Music: La vie en rose (user's track), user's ocean waves under the beach shots.
import React from 'react';
import {AbsoluteFill, Img, interpolate, OffthreadVideo, Sequence, spring, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import {Audio} from '@remotion/media';
import wordsData from './data/drift_words.json';
import {AFACAD, INSTRUMENT} from './fonts';

const FOREST = '#2E6B3F', LOGO = '#123726', CREAM = '#F3EDE2', INK = '#2E2A26';
const clamp = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'} as const;
const M = (f: string) => staticFile(`media/p17/${f}`);
type W = {w: string; t: number; e: number};

// kept parts of her take (source seconds): drops the first "literal copy" take, the first driftwood take and
// "Seeing her hand, no, sorry"
const KEEP: [number, number][] = [[1.45, 36.1], [46.55, 55.0], [68.95, 81.85], [87.8, 112.75]];
const OFF = KEEP.reduce<number[]>((acc, k, i) => [...acc, i === 0 ? 0 : acc[i - 1] + (KEEP[i - 1][1] - KEEP[i - 1][0])], []);
const TAKE = OFF[OFF.length - 1] + KEEP[KEEP.length - 1][1] - KEEP[KEEP.length - 1][0];
const END = 3.6;
export const driftTotal = () => TAKE + END;
const out = (src: number) => {
	for (let i = KEEP.length - 1; i >= 0; i--) if (src >= KEEP[i][0]) return OFF[i] + Math.min(src, KEEP[i][1]) - KEEP[i][0];
	return 0;
};

// cut-ins, in source seconds of the kept take (mapped to output time)
type Kind = 'coast' | 'couple' | 'waves' | 'drift' | 'warmth' | 'curve' | 'band' | 'hand' | 'trio';
const INS_SRC: {a: number; b: number; kind: Kind}[] = [
	{a: 19.6, b: 23.1, kind: 'coast'},     // "a quiet stretch of the coastline"
	{a: 23.1, b: 27.35, kind: 'couple'},   // "the exact place where their love story began"
	{a: 27.35, b: 30.4, kind: 'waves'},    // "where salt, air and sun blended"
	{a: 30.4, b: 36.1, kind: 'drift'},     // "Driftwood held the quiet magic of their favorite afternoon"
	{a: 51.2, b: 55.0, kind: 'warmth'},    // "We wanted to capture the warmth of their feeling"
	{a: 68.95, b: 75.75, kind: 'curve'},   // "So we let the organic curve of the driftwood guide the gold"
	{a: 75.75, b: 81.85, kind: 'band'},    // "placing those soft weathered textures right into the band"
	{a: 87.8, b: 93.7, kind: 'hand'},      // "Seeing her hold a piece that carries her whole heart"
	{a: 93.7, b: 99.3, kind: 'trio'},      // "Disguised as simple, quiet, beautiful"
];
const INS = INS_SRC.map((s) => ({...s, a: out(s.a), b: out(s.b)}));
const insAt = (t: number) => INS.find((s) => t >= s.a && t < s.b);

// ---------- her ----------
const Her: React.FC<{from: number}> = ({from}) => {
	const frame = useCurrentFrame();
	const {fps} = useVideoConfig();
	const z = 1.05 + 0.03 * Math.sin((from + frame / fps) / 9);
	return (
		<AbsoluteFill style={{overflow: 'hidden', background: '#000'}}>
			<OffthreadVideo src={M('her.mp4')} muted trimBefore={Math.round(from * fps)}
				style={{width: 1080, height: 1920, scale: z, transformOrigin: '540px 700px', filter: 'contrast(1.05) saturate(1.04) sepia(0.05)'}} />
		</AbsoluteFill>
	);
};

// ---------- cut-ins ----------
const Clip: React.FC<{src: string; from: number; z0?: number; z1?: number; oy?: number}> = ({src, from, z0 = 1.02, z1 = 1.1, oy = 960}) => {
	const frame = useCurrentFrame();
	const {fps, durationInFrames} = useVideoConfig();
	const p = frame / Math.max(1, durationInFrames);
	return (
		<AbsoluteFill style={{overflow: 'hidden', background: '#000', opacity: interpolate(frame, [0, 6], [0, 1], clamp)}}>
			<OffthreadVideo src={M(src)} muted trimBefore={Math.round(from * fps)} style={{width: 1080, height: 1920, scale: z0 + (z1 - z0) * p, transformOrigin: `540px ${oy}px`, filter: 'contrast(1.04) saturate(1.02) sepia(0.06)'}} />
			<AbsoluteFill style={{background: 'linear-gradient(rgba(0,0,0,0) 58%, rgba(0,0,0,0.42) 80%, rgba(0,0,0,0.5))'}} />
		</AbsoluteFill>
	);
};
const Still: React.FC<{src: string; z0?: number; z1?: number; ox?: number; oy?: number; fadeIn?: number}> = ({src, z0 = 1.04, z1 = 1.16, ox = 540, oy = 960, fadeIn = 6}) => {
	const frame = useCurrentFrame();
	const {durationInFrames} = useVideoConfig();
	const p = frame / Math.max(1, durationInFrames);
	return (
		<AbsoluteFill style={{overflow: 'hidden', background: '#000', opacity: interpolate(frame, [0, fadeIn], [0, 1], clamp)}}>
			<Img src={M(src)} style={{width: 1080, height: 1920, objectFit: 'cover', scale: z0 + (z1 - z0) * p, transformOrigin: `${ox}px ${oy}px`}} />
			<AbsoluteFill style={{background: 'linear-gradient(rgba(0,0,0,0) 58%, rgba(0,0,0,0.42) 80%, rgba(0,0,0,0.5))'}} />
		</AbsoluteFill>
	);
};
const Label: React.FC<{text: string}> = ({text}) => {
	const frame = useCurrentFrame();
	const {fps} = useVideoConfig();
	const a = spring({frame: frame - 4, fps, config: {damping: 16, mass: 0.6}});
	return (
		<div style={{position: 'absolute', left: 0, right: 0, top: 200, textAlign: 'center', opacity: a, translate: `0 ${(1 - a) * 16}px`,
			fontFamily: AFACAD, fontSize: 30, letterSpacing: '0.34em', color: 'white', textShadow: '0 2px 14px rgba(0,0,0,0.5)'}}>{text}</div>
	);
};
// driftwood dissolves into the jeweler's sketch on "guide the gold"
const Curve: React.FC<{len: number}> = ({len}) => {
	const frame = useCurrentFrame();
	const {fps} = useVideoConfig();
	const t = frame / fps;
	const x = interpolate(t, [len * 0.42, len * 0.62], [0, 1], clamp);
	return (
		<AbsoluteFill>
			<Still src="driftwood.png" z0={1.18} z1={1.3} oy={1000} />
			<AbsoluteFill style={{opacity: x}}><Img src={M('sketch.png')} style={{width: 1080, height: 1920, objectFit: 'cover', scale: 1.02 + 0.05 * x}} /></AbsoluteFill>
		</AbsoluteFill>
	);
};
// "simple, quiet, beautiful": the ring, the three words settle in one by one as tracked labels
const Trio: React.FC<{times: number[]; from: number}> = ({times, from}) => {
	const frame = useCurrentFrame();
	const {fps} = useVideoConfig();
	const t = from + frame / fps;
	return (
		<AbsoluteFill>
			<Still src="ring2.png" z0={1.0} z1={1.08} oy={900} />
			<AbsoluteFill style={{background: 'linear-gradient(rgba(0,0,0,0.35), rgba(0,0,0,0) 40%)'}} />
			<div style={{position: 'absolute', left: 0, right: 0, top: 230, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 18}}>
				{['simple', 'quiet', 'beautiful'].map((w, i) => {
					const a = spring({frame: frame - Math.round((times[i] - from - 0.05) * fps), fps, config: {damping: 18, mass: 0.6}});
					return <div key={w} style={{opacity: t >= times[i] - 0.05 ? a : 0, translate: `0 ${(1 - a) * 18}px`, fontFamily: INSTRUMENT, fontStyle: 'italic', fontSize: 120, lineHeight: 1, color: CREAM, textShadow: '0 4px 24px rgba(0,0,0,0.45)'}}>{w}</div>;
				})}
			</div>
		</AbsoluteFill>
	);
};

const Insert: React.FC<{kind: Kind; len: number; from: number}> = ({kind, len, from}) => {
	switch (kind) {
	case 'coast': return <><Clip src="s44496.mp4" from={0.5} z0={1.0} z1={1.08} /><Label text="A QUIET STRETCH OF COASTLINE" /></>;
	case 'couple': return <Still src="couple.png" z0={1.02} z1={1.14} ox={440} oy={1100} />;
	case 'waves': return <Clip src="s44482.mp4" from={6.0} z0={1.0} z1={1.08} />;
	case 'drift': return <Still src="driftwood.png" z0={1.02} z1={1.18} oy={1100} />;
	case 'warmth': return <Clip src="s1925.mp4" from={8.0} z0={1.0} z1={1.08} />;
	case 'curve': return <Curve len={len} />;
	case 'band': return <><Still src="ring2.png" z0={1.08} z1={1.38} ox={540} oy={900} /><Label text="SOFT, WEATHERED TEXTURES" /></>;
	case 'hand': return <Still src="hand.png" z0={1.05} z1={1.2} ox={480} oy={900} />;
	case 'trio': return <Trio times={TRIO} from={from} />;
	}
};

// ---------- captions ----------
const RAW = wordsData as W[];
const FIXED: W[] = [];
for (let i = 0; i < RAW.length; i++) {
	const w = {...RAW[i]};
	if (w.w.startsWith('.') && FIXED.length) { FIXED[FIXED.length - 1].w += w.w; FIXED[FIXED.length - 1].e = w.e; continue; }   // Takshila + .co
	if (w.t > 9.2 && w.t < 10.4 && /^(at|does)$/.test(w.w)) continue;   // "someone at trust does a" -> "someone trusts"
	if (w.t > 10.2 && w.t < 10.4 && w.w === 'a') continue;
	if (w.w === 'trust') w.w = 'trusts';
	if (w.w === 'So' && w.t > 54.4 && w.t < 55.0) continue;   // the cut take's "So"
	if (w.w === 'drift' && w.t > 30 && w.t < 31) w.w = 'Driftwood';
	if (w.w === 'with' && w.t > 30.9 && w.t < 31.1) w.w = 'held';
	if (w.w === 'gold' && w.t > 75) w.w = 'gold,';
	if (w.w === 'facing') w.w = 'placing';
	if (w.w === 'blended') w.w = 'blended.';
	FIXED.push(w);
	if (w.w === 'of' && w.t > 53.6 && w.t < 53.8) FIXED.push({w: 'their', t: 54.02, e: 54.26}, {w: 'feeling.', t: 54.26, e: 54.76});
}
const WORDS: W[] = FIXED.filter((w) => KEEP.some(([a, b]) => w.t >= a - 0.05 && w.t < b)).map((w) => ({...w, w: w.w.replace(/^Takshila\.co/, 'takshila.co'), t: out(w.t), e: out(Math.max(w.e, w.t + 0.1))}));
const TRIO = ['simple', 'quiet', 'beautiful'].map((k) => WORDS.find((w) => w.w.toLowerCase().startsWith(k))?.t ?? 0);
const KEY = /^(memory|forever|story|coastline|love|driftwood|warmth|organic|gold|weathered|heart|takshila\.co)$/i;
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
	if (ins?.kind === 'trio') return null;
	const gi = groups.findIndex((g, i) => t >= g[0].t - 0.05 && t < Math.min(g[g.length - 1].e + 0.35, groups[i + 1]?.[0].t ?? 1e9));
	if (gi < 0) return null;
	const g = groups[gi];
	const light = ins?.kind === 'curve' && t > ins.a + (ins.b - ins.a) * 0.55;
	const a = spring({frame: frame - Math.round((g[0].t - 0.08) * fps), fps, config: {damping: 16, mass: 0.5, stiffness: 200}});
	return (
		<div style={{position: 'absolute', left: 60, right: 60, top: 1420, display: 'flex', justifyContent: 'center'}}>
			<div style={{opacity: a, translate: `0 ${(1 - a) * 12}px`, fontFamily: INSTRUMENT, fontSize: 88, lineHeight: 1.12, textAlign: 'center', maxWidth: 940}}>
				{g.map((w, i) => {
					const isKey = KEY.test(clean(w.w));
					const nextT = g[i + 1]?.t ?? groups[gi + 1]?.[0].t ?? w.e + 0.4;
					const active = t >= w.t - 0.04 && t < Math.min(nextT - 0.02, Math.max(w.e, w.t + 0.18) + 0.25);
					return (
						<span key={i} style={{display: 'inline-block', marginRight: i < g.length - 1 ? '0.12em' : 0, padding: '0 0.12em', borderRadius: 12,
							background: active ? LOGO : 'transparent', color: active ? CREAM : light ? INK : 'white', fontStyle: isKey ? 'italic' : 'normal',
							textShadow: active || light ? 'none' : '0 2px 3px rgba(0,0,0,0.55), 0 0 22px rgba(0,0,0,0.45)'}}>{clean(w.w).replace(/^takshila$/i, 'takshila.co')}</span>
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
			<div style={{marginTop: 70, fontFamily: INSTRUMENT, fontSize: 96, lineHeight: 1.05, color: INK}}>
				<div style={{opacity: s(6), translate: `0 ${(1 - s(6)) * 22}px`, whiteSpace: 'nowrap'}}>A memory you can hold.</div>
				<div style={{opacity: s(12), translate: `0 ${(1 - s(12)) * 22}px`, fontStyle: 'italic', color: FOREST}}>Forever.</div>
			</div>
			<div style={{marginTop: 64, opacity: s(20), translate: `0 ${(1 - s(20)) * 22}px`}}>
				<span style={{display: 'inline-block', background: LOGO, color: CREAM, fontFamily: AFACAD, fontSize: 32, letterSpacing: '0.24em', padding: '20px 44px', borderRadius: 999}}>DESIGN YOURS · TAKSHILA.CO</span>
			</div>
		</AbsoluteFill>
	);
};

export const DriftwoodReel: React.FC = () => {
	const {fps, durationInFrames} = useVideoConfig();
	const f = (t: number) => Math.round(t * fps);
	const beach = INS.filter((s) => ['coast', 'couple', 'waves', 'drift', 'warmth'].includes(s.kind));
	const sfx: {t: number; f: string; v: number}[] = [
		...INS.map((s) => ({t: s.a - 0.15, f: 'whoosh', v: 0.07})),
		{t: TAKE - 0.1, f: 'whoosh', v: 0.1},
		{t: TAKE + 0.5, f: 'glock', v: 0.12},
	];
	return (
		<AbsoluteFill style={{background: '#000'}}>
			{KEEP.map(([a, b], i) => (
				<Sequence key={i} name={`take ${a}-${b}`} from={f(OFF[i])} durationInFrames={f(OFF[i] + b - a) - f(OFF[i])}>
					<Her from={a} />
					<Audio src={M('her.mp4')} trimBefore={f(a)} volume={(fr) => interpolate(fr, [0, 3, f(b - a) - 3, f(b - a)], [0, 1, 1, 0], clamp)} />
				</Sequence>
			))}
			{INS.map((s, i) => (
				<Sequence key={`i${i}`} name={`insert ${s.kind}`} from={f(s.a)} durationInFrames={f(s.b) - f(s.a)}><Insert kind={s.kind} len={s.b - s.a} from={s.a} /></Sequence>
			))}
			<Captions />
			<Sequence name="end card" from={f(TAKE)}><EndCard /></Sequence>
			{/* La vie en rose (user's track) from the top: piano intro under the hook, the trumpet melody enters at 0:18 with the coastline */}
			<Audio name="music" src={M('lavie.mp3')}
				volume={(fr) => interpolate(fr, [0, f(0.6), f(TAKE - 0.5), f(TAKE + 0.4), durationInFrames - f(1.2), durationInFrames], [0, 0.06, 0.06, 0.32, 0.32, 0], clamp)} />
			{beach.map((s, i) => (
				<Sequence key={`sea${i}`} name="sea" from={f(s.a)} durationInFrames={f(s.b) - f(s.a)} layout="none">
					<Audio src={M('waves_user.mp3')} trimBefore={f((i * 3.1) % 9)} volume={(fr) => interpolate(fr, [0, 8, f(s.b - s.a) - 8, f(s.b - s.a)], [0, 0.09, 0.09, 0], clamp)} />
				</Sequence>
			))}
			{sfx.map((h, i) => (
				<Sequence key={`s${i}`} name={`sfx ${h.f}`} from={Math.max(0, f(h.t))} durationInFrames={f(2.2)} layout="none">
					<Audio src={staticFile(`sfx/reel/${h.f}.wav`)} volume={h.v} />
				</Sequence>
			))}
		</AbsoluteFill>
	);
};
