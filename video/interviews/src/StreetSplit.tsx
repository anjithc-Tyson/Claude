// Street interview #2 (Alexis). Hook first: her finished necklace with "WE ASKED A STRANGER TO DESIGN HER DREAM
// NECKLACE" over the host's "What would you name this piece?". Then the interview at its natural pace, with her REAL
// iPad session as full-screen cut-ins at the moments that matter (the empty prompt, her typing "gold, shiny and long",
// the sketch loading into her rose-gold necklace), and the full-screen "BROOKLYN" reveal when she names it.
// Kinetic captions in the Takshila palette (forest green #2E6B3F, cream #F3EDE2, ink #2E2A26).
// Sources: media/p12/alexis.mp4 (upscaled 720p), media/p12/alexis_voice2.wav (light clean-up, Alexis's off-mic lines
// lifted to the host's level), media/p12/rec_s.mp4 (her iPad recording, 130–192 s of media/p8/rec.mp4 at 1080 wide).
import React from 'react';
import {AbsoluteFill, Freeze, interpolate, OffthreadVideo, Sequence, spring, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import {Audio} from '@remotion/media';
import wordsData from './data/alexis_words.json';
import {ROUND} from './fonts';

const clamp = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'} as const;
const FOREST = '#2E6B3F', CREAM = '#F3EDE2', INK = '#2E2A26';
type Word = {w: string; t: number; e: number};
const WORDS = wordsData as Word[];

// a = source in, b = source out (her audio always plays from a to b); mode: hook (necklace + title), full (her),
// screen (her iPad full screen: rec = iPad second at segment start, rr = its speed, z/ox/oy = zoom and focus point in
// the 1080×1554 iPad frame), reveal (necklace full screen, "BROOKLYN"); tail = extra seconds of picture after her audio
type Seg = {a: number; b: number; mode: 'hook' | 'full' | 'screen' | 'reveal'; rec?: number; rr?: number; z?: number; ox?: number; oy?: number; tag?: string; tail?: number};
const SEGS: Seg[] = [
	{a: 6.42, b: 14.95, mode: 'full', tag: 'hook'},                                          // the hook: "what does your dream jewelry look like?"
	{a: 15.0, b: 22.35, mode: 'full'},
	{a: 22.7, b: 25.75, mode: 'screen', rec: 145.3},
	{a: 25.75, b: 30.25, mode: 'screen', rec: 149.6, rr: 3.6},   // she types (silent)
	{a: 41.0, b: 42.75, mode: 'full'},
	{a: 44.9, b: 52.75, mode: 'full'},                                                     // she tells us her prompt
	{a: 52.75, b: 55.75, mode: 'screen', rec: 172.0, rr: 3.4},                             // then the sketch loads → her necklace
	{a: 59.2, b: 63.6, mode: 'full'},
	{a: 63.6, b: 66.7, mode: 'reveal', rec: 186.0},                                          // "I would name this Brooklyn"
	{a: 66.7, b: 75.5, mode: 'full'},
	{a: 77.55, b: 84.5, mode: 'full', tag: 'rapid'},
	{a: 84.85, b: 95.6, mode: 'full'},
	{a: 106.25, b: 116.75, mode: 'full', tag: 'paid'},
	{a: 124.6, b: 135.5, mode: 'full'},
];
const segLen = (s: Seg) => s.b - s.a + (s.tail ?? 0);
const OFF = SEGS.reduce<number[]>((acc, s, i) => [...acc, i === 0 ? 0 : acc[i - 1] + segLen(SEGS[i - 1])], []);
const TAKE = OFF[OFF.length - 1] + segLen(SEGS[SEGS.length - 1]);
const outOf = (src: number) => { const i = SEGS.findIndex((s) => src >= s.a && src < s.b); return i < 0 ? 0 : OFF[i] + src - SEGS[i].a; };
export const SPLIT_END = 3.4;
export const splitTotal = () => TAKE + SPLIT_END;

const FIX: Record<string, string> = {'blinging,': 'blingy,', 'pulling.': 'bling.', 'prompts': 'prompt'};
type CW = {w: string; t: number; e: number};
const capWords: CW[] = [];
SEGS.forEach((s, i) => WORDS.filter((w) => w.t >= s.a - 0.02 && w.t < s.b - 0.05).forEach((w) => {
	const last = capWords[capWords.length - 1];
	const txt = FIX[w.w] ?? w.w;
	if (txt.startsWith('-') && last) { last.w += txt; last.e = OFF[i] + w.e - s.a; return; }
	capWords.push({w: txt, t: OFF[i] + w.t - s.a, e: OFF[i] + Math.min(w.e, s.b) - s.a});
}));
const groups: CW[][] = (() => {
	const res: CW[][] = [];
	let cur: CW[] = [];
	capWords.forEach((w) => {
		if (cur.length && w.t - cur[cur.length - 1].e > 0.5) { res.push(cur); cur = []; }
		cur.push(w);
		if (/[.,!?]$/.test(w.w) || cur.length === 3) { res.push(cur); cur = []; }
	});
	if (cur.length) res.push(cur);
	return res;
})();
const KEY = /^(dream|blingy|shiny|stands|own|necklace|type|generate|prompt|gold|long|shine|love|name|brooklyn|city|keep|generations|design|sure|process|step|paid|commission|buys|account|pretty|bridge)$/i;
const clean = (w: string) => w.replace(/[.,!?]+$/, '');
const modeAt = (t: number) => { let k = 0; OFF.forEach((o, i) => { if (t >= o) k = i; }); return SEGS[k]; };

const Her: React.FC<{s: Seg; i: number}> = ({s, i}) => {
	const frame = useCurrentFrame();
	const {fps} = useVideoConfig();
	const p = frame / (segLen(s) * fps);
	const z = (i % 2 ? 1.22 : 1.1) + 0.03 * p;   // a two-shot crop that alternates wide/close per segment
	return (
		<AbsoluteFill style={{overflow: 'hidden', background: '#000'}}>
			<OffthreadVideo src={staticFile('media/p12/alexis.mp4')} muted trimBefore={Math.round(s.a * fps)}
				style={{position: 'absolute', left: 0, top: 0, width: 1080, height: 1920, scale: z, transformOrigin: '540px 980px', filter: 'contrast(1.06) saturate(1.04)'}} />
		</AbsoluteFill>
	);
};

// her real iPad screen, full frame, zoomed to what matters, with a small "HER SCREEN" tag and a gentle push
const RW = 1080, RH = 1554;
const Screen: React.FC<{s: Seg}> = ({s}) => {
	const frame = useCurrentFrame();
	const {fps} = useVideoConfig();
	const t = frame / fps;
	const z = (s.z ?? 1) * (1 + 0.025 * (t / segLen(s)));   // the whole page width, not zoomed in
	const ox = s.ox ?? 540, oy = s.oy ?? 777;
	const inA = interpolate(t, [0, 0.12], [0, 1], clamp);
	return (
		<AbsoluteFill style={{background: CREAM, overflow: 'hidden', opacity: inA}}>
			<div style={{position: 'absolute', left: 540 - ox * z, top: 960 - oy * z, width: RW, height: RH, scale: z, transformOrigin: '0px 0px'}}>
				<OffthreadVideo src={staticFile('media/p12/rec_s.mp4')} muted trimBefore={Math.round(((s.rec ?? 130) - 130) * fps)} playbackRate={s.rr ?? 1} style={{width: RW, height: RH}} />
			</div>
			<div style={{position: 'absolute', left: 40, top: 150, background: FOREST, color: 'white', fontFamily: ROUND, fontWeight: 800, fontSize: 28, letterSpacing: '0.12em', padding: '12px 22px', borderRadius: 12}}>● HER SCREEN</div>
		</AbsoluteFill>
	);
};

// the hook: her finished necklace, a slow push, the title slams in over the host's question
const Hook: React.FC<{s: Seg}> = ({s}) => {
	const frame = useCurrentFrame();
	const {fps} = useVideoConfig();
	const t = frame / fps;
	const z = interpolate(t, [0, segLen(s)], [1.0, 1.1], clamp);
	const sp = (o: number) => spring({frame: frame - o, fps, config: {damping: 12, mass: 0.5, stiffness: 200}});
	const lines = [['WE ASKED A', 'white'], ['STRANGER TO', 'white'], ['DESIGN HER', 'white'], ['DREAM NECKLACE', FOREST]] as const;
	return (
		<AbsoluteFill style={{background: '#EDE4D8', overflow: 'hidden'}}>
			<AbsoluteFill style={{scale: z * 2.05, transformOrigin: '540px 760px'}}>
				<Freeze frame={0}>
					<OffthreadVideo src={staticFile('media/p12/rec_s.mp4')} muted trimBefore={Math.round(((s.rec ?? 186) - 130) * fps)} style={{position: 'absolute', left: 0, top: -260, width: RW, height: RH}} />
				</Freeze>
			</AbsoluteFill>
			<AbsoluteFill style={{background: 'linear-gradient(rgba(0,0,0,0.45), rgba(0,0,0,0.1) 45%, rgba(0,0,0,0) 60%)'}} />
			<div style={{position: 'absolute', left: 60, right: 60, top: 230, fontFamily: ROUND, fontWeight: 900, fontSize: 92, lineHeight: 0.98, letterSpacing: '-0.02em'}}>
				{lines.map(([w, c], i) => (
					<div key={w} style={{opacity: sp(i * 3) > 0.02 ? 1 : 0, scale: 1.3 - 0.3 * sp(i * 3), transformOrigin: 'left bottom', color: c === FOREST ? 'white' : c, textShadow: '0 4px 20px rgba(0,0,0,0.35)'}}>
						{c === FOREST ? <span style={{background: FOREST, padding: '0 16px', borderRadius: 12, textShadow: 'none'}}>{w}</span> : w}
					</div>
				))}
			</div>
		</AbsoluteFill>
	);
};

// the reveal: her necklace full screen, a slow push, "BROOKLYN" lands as she names it
const Reveal: React.FC<{s: Seg; nameAt: number}> = ({s, nameAt}) => {
	const frame = useCurrentFrame();
	const {fps} = useVideoConfig();
	const t = frame / fps;
	const z = interpolate(t, [0, segLen(s)], [1.0, 1.12], clamp);
	const a = spring({frame: frame - Math.round(nameAt * fps), fps, config: {damping: 12, mass: 0.5, stiffness: 200}});
	const flash = interpolate(t, [0, 0.12, 0.35], [0.8, 0.4, 0], clamp);
	return (
		<AbsoluteFill style={{background: '#EDE4D8', overflow: 'hidden'}}>
			<AbsoluteFill style={{scale: z * 2.05, transformOrigin: '540px 760px'}}>
				<Freeze frame={0}>
					<OffthreadVideo src={staticFile('media/p12/rec_s.mp4')} muted trimBefore={Math.round(((s.rec ?? 186) - 130) * fps)} style={{position: 'absolute', left: 0, top: -260, width: RW, height: RH}} />
				</Freeze>
			</AbsoluteFill>
			<AbsoluteFill style={{background: 'white', opacity: flash}} />
			<AbsoluteFill style={{background: 'linear-gradient(rgba(0,0,0,0.0) 55%, rgba(0,0,0,0.35))'}} />
			<div style={{position: 'absolute', left: 60, top: 210, fontFamily: ROUND, fontWeight: 800, fontSize: 30, letterSpacing: '0.3em', color: INK, opacity: a}}>SHE NAMED IT</div>
			<div style={{position: 'absolute', left: 50, top: 250, fontFamily: ROUND, fontWeight: 900, fontSize: 150, letterSpacing: '-0.03em', color: 'white', opacity: a > 0.02 ? 1 : 0,
				scale: 1.3 - 0.3 * a, transformOrigin: 'left top'}}>
				<span style={{background: FOREST, padding: '0 22px', borderRadius: 18}}>BROOKLYN</span>
			</div>
		</AbsoluteFill>
	);
};

const Tag: React.FC<{kind: string}> = ({kind}) => {
	if (kind === 'hook') return null;
	const frame = useCurrentFrame();
	const {fps} = useVideoConfig();
	const a = spring({frame, fps, config: {damping: 13, mass: 0.6}});
	const out = interpolate(frame / fps, [2.6, 3.0], [1, 0], clamp);
	const txt = kind === 'rapid' ? '⚡ RAPID FIRE' : 'GET PAID WHEN SOMEONE BUYS YOUR DESIGN';
	return (
		<div style={{position: 'absolute', left: 0, right: 0, top: 220, display: 'flex', justifyContent: 'center', opacity: a * (kind === 'rapid' ? out : 1)}}>
			<div style={{background: kind === 'rapid' ? FOREST : CREAM, color: kind === 'rapid' ? 'white' : FOREST, fontFamily: ROUND, fontWeight: 900, fontSize: kind === 'rapid' ? 46 : 38,
				letterSpacing: '0.06em', padding: '20px 36px', borderRadius: 16, scale: 0.7 + 0.3 * a, maxWidth: 900, textAlign: 'center', boxShadow: '0 12px 30px rgba(0,0,0,0.2)'}}>{txt}</div>
		</div>
	);
};

const Captions: React.FC = () => {
	const frame = useCurrentFrame();
	const {fps} = useVideoConfig();
	const t = frame / fps;
	if (t >= TAKE) return null;
	const s = modeAt(t);
	if (s.mode === 'reveal' || s.mode === 'hook') return null;
	const gi = groups.findIndex((g, i) => t >= g[0].t - 0.05 && t < Math.min(g[g.length - 1].e + 0.35, groups[i + 1]?.[0].t ?? 1e9));
	if (gi < 0) return null;
	const g = groups[gi], k = g.findIndex((w) => KEY.test(clean(w.w)));
	const split = false;
	const onScreen = s.mode === 'screen';
	const long = g.map((w) => clean(w.w)).join(' ').length > 15;
	return (
		<div style={{position: 'absolute', left: 50, right: 50, top: onScreen ? 1520 : split ? 770 : 1270, fontFamily: ROUND, fontWeight: 900, fontSize: split ? (long ? 80 : 92) : (long ? 100 : 116), lineHeight: 1.0,
			letterSpacing: '-0.02em', textTransform: 'uppercase', color: 'white', textShadow: '0 5px 22px rgba(0,0,0,0.45)'}}>
			{g.map((w, i) => {
				const sp = spring({frame: frame - Math.round((w.t - 0.05) * fps), fps, config: {damping: 13, mass: 0.45, stiffness: 220}});
				const shown = t >= w.t - 0.05;
				const isKey = i === k;
				return (
					<span key={i} style={{display: 'inline-block', marginRight: '0.2em', marginBottom: 8, opacity: shown ? 1 : 0, scale: shown ? 1.3 - 0.3 * sp : 1, transformOrigin: 'left bottom',
						background: isKey ? FOREST : undefined, padding: isKey ? '0 0.14em' : undefined, borderRadius: isKey ? 10 : undefined, textShadow: isKey ? 'none' : undefined}}>{clean(w.w)}</span>
				);
			})}
		</div>
	);
};

// "get paid": dollar bills and coins pop up and float across the frame
const Dollars: React.FC = () => {
	const frame = useCurrentFrame();
	const {fps} = useVideoConfig();
	const items = React.useMemo(() => Array.from({length: 16}).map((_, i) => ({x: 80 + ((i * 397) % 920), y: 900 - ((i * 233) % 560), d: (i % 6) * 4, e: i % 3 === 0 ? '💰' : '💵', r: ((i * 53) % 50) - 25, s: 90 + ((i * 37) % 70)})), []);
	return (
		<AbsoluteFill style={{pointerEvents: 'none'}}>
			{items.map((it, i) => {
				const a = spring({frame: frame - it.d, fps, config: {damping: 9, mass: 0.5, stiffness: 180}});
				const t = Math.max(0, (frame - it.d) / fps);
				const out = interpolate(frame / fps, [2.9, 3.5], [1, 0], clamp);
				return <div key={i} style={{position: 'absolute', left: it.x, top: it.y - t * 160, fontSize: it.s, rotate: `${it.r + t * 20}deg`, scale: a, opacity: out * (frame >= it.d ? 1 : 0)}}>{it.e}</div>;
			})}
		</AbsoluteFill>
	);
};

// "so pretty": a big pookie emoji pops in with a few sparkles
const Pookie: React.FC = () => {
	const frame = useCurrentFrame();
	const {fps} = useVideoConfig();
	const a = spring({frame, fps, config: {damping: 8, mass: 0.5, stiffness: 200}});
	const out = interpolate(frame / fps, [1.9, 2.4], [1, 0], clamp);
	const wob = Math.sin(frame / 3) * 6;
	const sp = [[-230, -150, '✨', 0], [220, -190, '💖', 4], [-200, 170, '🎀', 7], [240, 140, '✨', 10]] as const;
	return (
		<AbsoluteFill style={{pointerEvents: 'none', opacity: out}}>
			<div style={{position: 'absolute', left: 540 - 150, top: 330, width: 300, height: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 260, scale: a, rotate: `${wob}deg`}}>🥹</div>
			{sp.map(([dx, dy, e, d], i) => {
				const b = spring({frame: frame - d, fps, config: {damping: 9, mass: 0.4}});
				return <div key={i} style={{position: 'absolute', left: 540 + dx - 50, top: 480 + dy - 50, fontSize: 100, scale: b}}>{e}</div>;
			})}
		</AbsoluteFill>
	);
};

const EndCard: React.FC = () => {
	const frame = useCurrentFrame();
	const {fps} = useVideoConfig();
	const s = (o: number) => spring({frame: frame - o, fps, config: {damping: 12, mass: 0.5, stiffness: 200}});
	const lines = [['WHAT WOULD', INK], ['YOU NAME', INK], ['YOURS?', FOREST]] as const;
	return (
		<AbsoluteFill style={{background: CREAM, padding: '0 70px', justifyContent: 'center'}}>
			<div style={{fontFamily: ROUND, fontWeight: 900, fontSize: 150, lineHeight: 0.92, letterSpacing: '-0.03em'}}>
				{lines.map(([w, c], i) => <div key={w} style={{color: c, opacity: s(i * 4) > 0.02 ? 1 : 0, scale: 1.3 - 0.3 * s(i * 4), transformOrigin: 'left bottom'}}>{w}</div>)}
			</div>
			<div style={{marginTop: 60, opacity: s(16), translate: `0 ${(1 - s(16)) * 30}px`}}>
				<span style={{display: 'inline-block', background: FOREST, color: 'white', fontFamily: ROUND, fontWeight: 800, fontSize: 42, padding: '18px 40px', borderRadius: 14}}>DESIGN IT · TAKSHILA.CO</span>
			</div>
		</AbsoluteFill>
	);
};

export const StreetSplitReel: React.FC = () => {
	const {fps} = useVideoConfig();
	const f = (t: number) => Math.round(t * fps);
	const revealI = SEGS.findIndex((s) => s.mode === 'reveal');
	const nameAt = 64.39 - SEGS[revealI].a; // "Brooklyn"
	const sfx: {t: number; f: string; v: number}[] = [
		...SEGS.map((s, i) => (s.mode === 'screen' && SEGS[i - 1]?.mode !== 'screen' ? {t: OFF[i] - 0.06, f: 'whoosh', v: 0.12} : null)).filter((x): x is {t: number; f: string; v: number} => !!x),
		{t: OFF[revealI] - 0.05, f: 'whoosh', v: 0.18},
		{t: OFF[revealI] + nameAt - 0.15, f: 'x:tada', v: 0.55},
		{t: outOf(111.4), f: 'x:coins', v: 0.6},
		{t: outOf(114.1), f: 'x:coins', v: 0.45},
		{t: outOf(128.05), f: 'x:sparkle', v: 0.55},
		{t: OFF[SEGS.findIndex((s) => s.tag === 'rapid')], f: 'tick', v: 0.25},
		{t: TAKE - 0.08, f: 'whoosh', v: 0.18},
		{t: TAKE + 0.1, f: 'glock', v: 0.45},
		{t: TAKE + 0.6, f: 'click', v: 0.45},
		{t: TAKE + 1.9, f: 'pop', v: 0.35},
	];
	return (
		<AbsoluteFill style={{background: '#000'}}>
			{SEGS.map((s, i) => {
				const from = f(OFF[i]), dur = Math.max(1, f(OFF[i] + segLen(s)) - from), aud = f(s.b - s.a);
				return (
					<Sequence key={i} name={`${s.mode} ${s.a}-${s.b}`} from={from} durationInFrames={dur}>
						{s.mode === 'hook' ? <Hook s={s} /> : s.mode === 'reveal' ? <Reveal s={s} nameAt={nameAt} /> : s.mode === 'screen' ? <Screen s={s} /> : <Her s={s} i={i} />}
						{s.tag ? <Tag kind={s.tag} /> : null}
						<Sequence durationInFrames={aud} layout="none">
							<Audio src={staticFile('media/p12/alexis_voice2.wav')} trimBefore={f(s.a)} volume={(fr) => interpolate(fr, [0, 2, aud - 2, aud], [0, 1, 1, 0], clamp)} />
						</Sequence>
					</Sequence>
				);
			})}
			<Sequence name="end card" from={f(TAKE)}><EndCard /></Sequence>
			<Captions />
			{sfx.map((h, i) => (
				<Sequence key={`s${i}`} name={`sfx ${h.f}`} from={Math.max(0, f(h.t))} durationInFrames={f(2.2)} layout="none">
					<Audio src={staticFile(h.f.startsWith('x:') ? `sfx/extra/${h.f.slice(2)}.wav` : `sfx/reel/${h.f}.wav`)} volume={h.v} />
				</Sequence>
			))}
			<Sequence name="dollars" from={f(outOf(111.35))} durationInFrames={f(3.6)}><Dollars /></Sequence>
			<Sequence name="pookie" from={f(outOf(128.0))} durationInFrames={f(2.4)}><Pookie /></Sequence>
		</AbsoluteFill>
	);
};
