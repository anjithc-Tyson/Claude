// Street interview #2 (Alexis), "Live split-screen": Alexis on the street on top, her REAL iPad session underneath,
// synced to what she is doing (category grid → typing "gold, shiny and long with more shine" → sketch loading → her
// rose-gold necklace). When she names it "Brooklyn" the necklace takes the full screen. Natural pace (no speed changes
// on her), Day-17 kinetic captions in the Takshila palette (forest green #2E6B3F, cream #F3EDE2, ink #2E2A26).
// Sources: media/p12/alexis.mp4 (upscaled 720p), media/p12/alexis_voice.wav (denoised), media/p12/rec_s.mp4 (her iPad recording, 130–192 s of media/p8/rec.mp4 at 1080 wide).
import React from 'react';
import {AbsoluteFill, Freeze, interpolate, OffthreadVideo, Sequence, spring, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import {Audio} from '@remotion/media';
import wordsData from './data/alexis_words.json';
import {ROUND} from './fonts';

const clamp = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'} as const;
const FOREST = '#2E6B3F', CREAM = '#F3EDE2', INK = '#2E2A26';
type Word = {w: string; t: number; e: number};
const WORDS = wordsData as Word[];

// a = source in, b = source out; mode: full (her only), split (her + iPad), reveal (necklace full screen)
// rec = iPad source second at the start of the segment, rr = iPad playback rate, ry = how far down the iPad page to show
type Seg = {a: number; b: number; mode: 'full' | 'split' | 'reveal'; rec?: number; rr?: number; ry?: number; rz?: number; tag?: string};
const SEGS: Seg[] = [
	{a: 6.0, b: 14.95, mode: 'full'},
	{a: 15.0, b: 22.35, mode: 'split', rec: 135.6, ry: 170},
	{a: 22.7, b: 25.75, mode: 'split', rec: 145.3, ry: 170, rz: 1.7},
	{a: 25.75, b: 30.25, mode: 'split', rec: 149.6, rr: 3.6, ry: 170, rz: 1.7},  // she types (silent): her prompt on the iPad
	{a: 41.0, b: 42.75, mode: 'split', rec: 166.0, rr: 1.4, ry: 170, rz: 1.7},
	{a: 44.9, b: 52.75, mode: 'split', rec: 168.6, rr: 1.72, ry: 330},           // the sketch loads → her necklace appears
	{a: 59.2, b: 63.6, mode: 'split', rec: 182.0, ry: 260},
	{a: 63.6, b: 66.7, mode: 'reveal', rec: 186.0},                             // "I would name this Brooklyn"
	{a: 66.7, b: 75.5, mode: 'full'},
	{a: 77.55, b: 84.5, mode: 'full', tag: 'rapid'},
	{a: 84.85, b: 95.6, mode: 'full'},
	{a: 106.25, b: 116.75, mode: 'full', tag: 'paid'},
	{a: 124.6, b: 135.5, mode: 'full'},
];
const OFF = SEGS.reduce<number[]>((acc, s, i) => [...acc, i === 0 ? 0 : acc[i - 1] + (SEGS[i - 1].b - SEGS[i - 1].a)], []);
const TAKE = OFF[OFF.length - 1] + SEGS[SEGS.length - 1].b - SEGS[SEGS.length - 1].a;
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

const SPLIT_H = 1010;
const Her: React.FC<{s: Seg; i: number}> = ({s, i}) => {
	const frame = useCurrentFrame();
	const {fps} = useVideoConfig();
	const p = frame / ((s.b - s.a) * fps);
	const split = s.mode === 'split';
	// full frame: a two-shot crop that alternates wide/close per segment; split: the top panel
	const z = split ? 1.05 : (i % 2 ? 1.22 : 1.1) + 0.03 * p;
	return (
		<AbsoluteFill style={{overflow: 'hidden', background: '#000', height: split ? SPLIT_H : 1920}}>
			<OffthreadVideo src={staticFile('media/p12/alexis.mp4')} muted trimBefore={Math.round(s.a * fps)}
				style={{position: 'absolute', left: 0, top: split ? -520 : 0, width: 1080, height: 1920, scale: z, transformOrigin: split ? '540px 1000px' : '540px 980px',
					filter: 'contrast(1.06) saturate(1.04)'}} />
		</AbsoluteFill>
	);
};

// her real iPad session in the lower panel, cropped to the part of the page that matters
const RW = 1080, RH = Math.round(1080 * 2360 / 1640);
const IPad: React.FC<{s: Seg; inFrom: boolean}> = ({s, inFrom}) => {
	const frame = useCurrentFrame();
	const {fps} = useVideoConfig();
	const enter = inFrom ? spring({frame, fps, config: {damping: 16, mass: 0.6}}) : 1;
	return (
		<div style={{position: 'absolute', left: 0, top: SPLIT_H, width: 1080, height: 1920 - SPLIT_H, overflow: 'hidden', background: CREAM}}>
			<div style={{position: 'absolute', left: 0, top: -(s.ry ?? 170), width: RW, height: RH, translate: `0 ${(1 - enter) * 900}px`, scale: s.rz ?? 1, transformOrigin: '20px 330px'}}>
				<OffthreadVideo src={staticFile('media/p12/rec_s.mp4')} muted trimBefore={Math.round(((s.rec ?? 130) - 130) * fps)} playbackRate={s.rr ?? 1} style={{width: RW, height: RH}} />
			</div>
			<div style={{position: 'absolute', left: 0, right: 0, top: 0, height: 6, background: FOREST}} />
			<div style={{position: 'absolute', left: 30, top: 24, background: FOREST, color: 'white', fontFamily: ROUND, fontWeight: 800, fontSize: 26, letterSpacing: '0.12em', padding: '10px 20px', borderRadius: 10,
				opacity: enter}}>● HER SCREEN · LIVE</div>
		</div>
	);
};

// the reveal: her necklace full screen, a slow push, "BROOKLYN" lands as she names it
const Reveal: React.FC<{s: Seg; nameAt: number}> = ({s, nameAt}) => {
	const frame = useCurrentFrame();
	const {fps} = useVideoConfig();
	const t = frame / fps;
	const z = interpolate(t, [0, s.b - s.a], [1.0, 1.12], clamp);
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
	if (s.mode === 'reveal') return null;
	const gi = groups.findIndex((g, i) => t >= g[0].t - 0.05 && t < Math.min(g[g.length - 1].e + 0.35, groups[i + 1]?.[0].t ?? 1e9));
	if (gi < 0) return null;
	const g = groups[gi], k = g.findIndex((w) => KEY.test(clean(w.w)));
	const split = s.mode === 'split';
	const long = g.map((w) => clean(w.w)).join(' ').length > 15;
	return (
		<div style={{position: 'absolute', left: 50, right: 50, top: split ? 770 : 1270, fontFamily: ROUND, fontWeight: 900, fontSize: split ? (long ? 80 : 92) : (long ? 100 : 116), lineHeight: 1.0,
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
	const {fps, durationInFrames} = useVideoConfig();
	const f = (t: number) => Math.round(t * fps);
	const revealI = SEGS.findIndex((s) => s.mode === 'reveal');
	const nameAt = 64.39 - SEGS[revealI].a; // "Brooklyn"
	const sfx: {t: number; f: string; v: number}[] = [
		{t: OFF[1] - 0.1, f: 'whoosh', v: 0.15},
		{t: OFF[revealI] - 0.05, f: 'whoosh', v: 0.18},
		{t: OFF[revealI] + nameAt, f: 'pop', v: 0.16},
		{t: OFF[SEGS.findIndex((s) => s.tag === 'rapid')], f: 'tick', v: 0.25},
		{t: TAKE - 0.08, f: 'whoosh', v: 0.18},
		{t: TAKE + 0.6, f: 'click', v: 0.45},
		{t: TAKE + 0.1, f: 'glock', v: 0.45},
		{t: TAKE + 1.9, f: 'pop', v: 0.35},
	];
	return (
		<AbsoluteFill style={{background: '#000'}}>
			{SEGS.map((s, i) => {
				const from = f(OFF[i]), dur = Math.max(1, f(OFF[i] + s.b - s.a) - from);
				return (
					<Sequence key={i} name={`${s.mode} ${s.a}-${s.b}`} from={from} durationInFrames={dur}>
						{s.mode === 'reveal' ? <Reveal s={s} nameAt={nameAt} /> : <Her s={s} i={i} />}
						{s.mode === 'split' ? <IPad s={s} inFrom={SEGS[i - 1]?.mode !== 'split'} /> : null}
						{s.tag ? <Tag kind={s.tag} /> : null}
						<Audio src={staticFile('media/p12/alexis_voice.wav')} trimBefore={f(s.a)} volume={(fr) => interpolate(fr, [0, 2, dur - 2, dur], [0, 1, 1, 0], clamp)} />
					</Sequence>
				);
			})}
			<Sequence name="end card" from={f(TAKE)}><EndCard /></Sequence>
			<Captions />
			{sfx.map((h, i) => (
				<Sequence key={`s${i}`} name={`sfx ${h.f}`} from={Math.max(0, f(h.t))} durationInFrames={f(2.2)} layout="none">
					<Audio src={staticFile(`sfx/reel/${h.f}.wav`)} volume={h.v} />
				</Sequence>
			))}
			<Audio name="music" src={staticFile('media/p11/night_sky.mp3')}
				volume={(fr) => interpolate(fr, [0, 10, f(TAKE) - 10, f(TAKE) + 6, durationInFrames - 6, durationInFrames], [0, 0.04, 0.04, 0.6, 0.6, 0], clamp)} />
		</AbsoluteFill>
	);
};
