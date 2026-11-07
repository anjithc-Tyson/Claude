// Script 4: detail-first hook + match cuts. Opens silent on the engraving macro (D01) with a slow push and a soft
// daylight band gliding over the gold, then her take (media/p7/edit.mp4) with full-screen product cut-aways on the words
// they illustrate while her voice carries on. Every product shot keeps the subject where her face sits, so the cuts
// land in the same spot. Natural colour, clean small captions, minimal sound.
import React from 'react';
import {AbsoluteFill, Easing, Img, interpolate, OffthreadVideo, Sequence, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import {Audio} from '@remotion/media';
import magData from './data/magazine.json';
import {AFACAD, INSTRUMENT} from './fonts';

const clamp = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'} as const;
const ease = Easing.bezier(0.16, 1, 0.3, 1);
type Word = {w: string; t: number; e: number};
type D = {total: number; words: Word[]};
export const MATCH = magData as unknown as D;
export const HOOK = 1.5;          // silent detail before she speaks
export const MATCH_END = 3.3;     // end card after her last word
export const matchTotal = (d: D) => HOOK + d.total + MATCH_END;

// cut-aways in take time (seconds of edit.mp4): image, push direction
type Cut = {a: number; b: number; img: string; z0?: number; z1?: number; ox?: number; oy?: number};
const CUTS: Cut[] = [
	{a: 0.0, b: 2.55, img: 'D02'},
	{a: 4.2, b: 5.65, img: 'D01', z0: 1.12, z1: 1.2},
	{a: 8.95, b: 10.4, img: 'D03', z0: 1.0, z1: 1.05},
	{a: 11.5, b: 12.6, img: 'D04'},
	{a: 12.6, b: 14.25, img: 'D05'},
	{a: 14.25, b: 16.3, img: 'D06'},
	{a: 17.8, b: 19.75, img: 'D07'},
	{a: 19.75, b: 21.05, img: 'D08'},
	{a: 21.05, b: 22.5, img: 'D09'},
	{a: 25.3, b: 26.7, img: 'D10'},
	{a: 26.7, b: 28.2, img: 'D11'},
	{a: 34.3, b: 35.85, img: 'D02', z0: 1.15, z1: 1.22},
	{a: 37.4, b: 40.9, img: 'D12'},
];
const END_AT = 47.2;   // D13 end card from "perfect piece around?"

const Shot: React.FC<{img: string; dur: number; z0?: number; z1?: number; ox?: number; oy?: number}> = ({img, dur, z0 = 1.0, z1 = 1.07, ox = 540, oy = 730}) => {
	const frame = useCurrentFrame();
	const {fps} = useVideoConfig();
	const z = interpolate(frame, [0, dur * fps], [z0, z1], clamp);
	return (
		<AbsoluteFill style={{overflow: 'hidden', backgroundColor: '#EDE6DA'}}>
			<Img src={staticFile(`img/match/${img}.jpg`)} style={{width: 1080, height: 1920, scale: z, transformOrigin: `${ox}px ${oy}px`}} />
		</AbsoluteFill>
	);
};

// the hook: the engraving, a slow push and one soft band of daylight across the gold
const Hook: React.FC = () => {
	const frame = useCurrentFrame();
	const {fps} = useVideoConfig();
	const t = frame / fps;
	const z = interpolate(t, [0, HOOK], [1.0, 1.1], {...clamp, easing: Easing.out(Easing.quad)});
	const sweep = interpolate(t, [0.1, HOOK + 0.2], [-500, 1300], clamp);
	return (
		<AbsoluteFill style={{overflow: 'hidden', backgroundColor: '#EDE6DA'}}>
			<AbsoluteFill style={{scale: z, transformOrigin: '540px 700px'}}>
				<Img src={staticFile('img/match/D01.jpg')} style={{width: 1080, height: 1920}} />
				<div style={{position: 'absolute', top: 0, bottom: 0, left: sweep, width: 380, rotate: '14deg', mixBlendMode: 'soft-light',
					background: 'linear-gradient(90deg, rgba(255,250,240,0) 0%, rgba(255,250,240,0.55) 50%, rgba(255,250,240,0) 100%)'}} />
			</AbsoluteFill>
		</AbsoluteFill>
	);
};

// her take; each sentence alternates between a wide and a closer framing (a clean jump cut), with a slow drift
const Her: React.FC<{sentences: number[]}> = ({sentences}) => {
	const frame = useCurrentFrame();
	const {fps} = useVideoConfig();
	const v = frame / fps;
	let k = 0;
	for (let i = 0; i < sentences.length; i++) if (v >= sentences[i]) k = i;
	const base = k % 2 === 0 ? 1.0 : 1.12;
	const s0 = sentences[k], s1 = sentences[k + 1] ?? s0 + 6;
	const drift = interpolate(v, [s0, s1], [0, 0.03], clamp);
	return (
		<AbsoluteFill style={{overflow: 'hidden', backgroundColor: '#EDE6DA'}}>
			<OffthreadVideo src={staticFile('media/p7/edit.mp4')} muted
				style={{width: 1080, height: 1920, scale: base + drift, transformOrigin: '540px 560px', filter: 'contrast(1.03) saturate(1.04)'}} />
		</AbsoluteFill>
	);
};

const groupsOf = (words: Word[]) => {
	const out: Word[][] = [];
	let cur: Word[] = [];
	for (const w of words) {
		cur.push(w);
		if (/[.,!?]$/.test(w.w) || cur.length === 4) {
			out.push(cur);
			cur = [];
		}
	}
	if (cur.length) out.push(cur);
	return out;
};

// small, clean captions: a few words at a time, the spoken word fully white, the rest slightly dim
const Captions: React.FC<{d: D}> = ({d}) => {
	const frame = useCurrentFrame();
	const {fps} = useVideoConfig();
	const v = frame / fps;
	const groups = React.useMemo(() => groupsOf(d.words), [d.words]);
	const g = groups.find((x, i) => v >= x[0].t - 0.05 && v < (groups[i + 1]?.[0].t ?? x[x.length - 1].e + 0.5) - 0.05);
	if (!g || v >= END_AT) return null;
	const a = interpolate(v, [g[0].t - 0.05, g[0].t + 0.1], [0, 1], clamp);
	return (
		<div style={{position: 'absolute', left: 90, right: 90, top: 1330, textAlign: 'center', opacity: a, translate: `0 ${(1 - a) * 8}px`,
			fontFamily: AFACAD, fontWeight: 500, fontSize: 62, lineHeight: 1.15, color: 'white', textShadow: '0 2px 14px rgba(0,0,0,0.45), 0 1px 3px rgba(0,0,0,0.35)'}}>
			{g.map((w, i) => (
				<span key={i} style={{opacity: v >= w.t - 0.03 ? 1 : 0.55}}>{w.w.replace(/[,.]$/, '')}{i < g.length - 1 ? ' ' : ''}</span>
			))}
		</div>
	);
};

const EndCard: React.FC<{d: D}> = ({d}) => {
	const frame = useCurrentFrame();
	const {fps} = useVideoConfig();
	const t = frame / fps;
	const qa = interpolate(t, [0.15, 0.7], [0, 1], {...clamp, easing: ease});
	const ba = interpolate(t, [d.total - END_AT + 0.4, d.total - END_AT + 1.0], [0, 1], {...clamp, easing: ease});
	return (
		<AbsoluteFill>
			<Shot img="D13" dur={6} z0={1.0} z1={1.04} oy={1100} />
			<div style={{position: 'absolute', left: 80, right: 80, top: 300, textAlign: 'center', color: '#3A2A1E', opacity: qa, translate: `0 ${(1 - qa) * 14}px`}}>
				<div style={{fontFamily: INSTRUMENT, fontSize: 98, lineHeight: 1.02}}>What detail would you<br />build <i>yours</i> around?</div>
			</div>
			<div style={{position: 'absolute', left: 0, right: 0, top: 640, textAlign: 'center', opacity: ba, fontFamily: AFACAD, fontWeight: 500, fontSize: 34, letterSpacing: '0.32em', color: '#6B5440'}}>
				TAKSHILA.CO
				<div style={{fontSize: 30, letterSpacing: '0.04em', fontWeight: 400, marginTop: 18, color: '#3A2A1E'}}>tell us in the comments</div>
			</div>
		</AbsoluteFill>
	);
};

export const MatchCutReel: React.FC<{d: D}> = ({d}) => {
	const {fps, durationInFrames} = useVideoConfig();
	const f = (t: number) => Math.round(t * fps);
	const sentences = React.useMemo(() => {
		const out = [0];
		d.words.forEach((w, i) => { if (i > 0 && /[.?!]$/.test(d.words[i - 1].w)) out.push(w.t - 0.08); });
		return out;
	}, [d.words]);
	const sfx: {t: number; f: string; v: number; len?: number}[] = [
		{t: HOOK - 0.25, f: 'whoosh', v: 0.16},
		{t: HOOK + END_AT - 0.05, f: 'glock', v: 0.22},
		{t: HOOK + d.total + 0.4, f: 'click', v: 0.3},
	];
	const T = f(HOOK + d.total);
	return (
		<AbsoluteFill style={{backgroundColor: '#EDE6DA'}}>
			<Sequence name="hook" durationInFrames={f(HOOK)}><Hook /></Sequence>
			<Sequence name="take" from={f(HOOK)}>
				<Her sentences={sentences} />
				{CUTS.map((c, i) => (
					<Sequence key={i} name={`cut ${c.img}`} from={f(c.a)} durationInFrames={f(c.b) - f(c.a)}>
						<Shot img={c.img} dur={c.b - c.a} z0={c.z0} z1={c.z1} ox={c.ox} oy={c.oy} />
					</Sequence>
				))}
				<Sequence name="end card" from={f(END_AT)}><EndCard d={d} /></Sequence>
				<Captions d={d} />
				<Audio name="voice" src={staticFile('media/p7/edit.mp4')} />
			</Sequence>
			{sfx.map((h, i) => (
				<Sequence key={`s${i}`} name={`sfx ${h.f}`} from={Math.max(0, f(h.t))} durationInFrames={f(h.len ?? 2.2)} layout="none">
					<Audio src={staticFile(`sfx/reel/${h.f}.wav`)} volume={h.v} />
				</Sequence>
			))}
			<Audio name="music" src={staticFile('media/p5/parampampam.mp3')} trimBefore={f(27)}
				volume={(fr) => interpolate(fr, [0, 12, T, T + 10, durationInFrames - 20, durationInFrames], [0, 0.1, 0.1, 0.2, 0.2, 0], clamp)} />
		</AbsoluteFill>
	);
};
