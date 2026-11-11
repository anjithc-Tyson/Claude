// "Day 15": the artisanal ring, Day 14's series look with an artisan focus. Her wishes ("timeless", "personal",
// "traditional gold") as word chips; the loose oval stone on "a central, brilliant stone"; the ring catching the light;
// on "our artisans hand-wove the gold threads" a pencil sketch draws itself, then macro push-ins on the real photos of the
// hand-engraved band (labels HAND-ENGRAVED, LACE-LIKE DETAIL, AROUND THE PERFECT STONE); the ring on the finger for
// "when she finally put it on". Source: media/p10/day15.mp4 + the ring clips rv/o3 and photos in img/ring15.
import React from 'react';
import {AbsoluteFill, Easing, Img, interpolate, OffthreadVideo, Sequence, spring, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import {Audio} from '@remotion/media';
import wordsData from './data/day15_words.json';
import {AFACAD, INSTRUMENT, POPPINS} from './fonts';

const clamp = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'} as const;
const TERRA = '#E2725B', SAP = '#507D2A', INK = '#2E2A26';
type Word = {w: string; t: number; e: number};
const WORDS = wordsData as Word[];

// kept parts of the take (source seconds)
const KEEP: [number, number][] = [[0.6, 22.0], [22.1, 36.1], [36.75, 41.6], [42.8, 47.4]];
const OFF: number[] = KEEP.reduce<number[]>((acc, k, i) => [...acc, i === 0 ? 0 : acc[i - 1] + (KEEP[i - 1][1] - KEEP[i - 1][0])], []);
const TAKE = OFF[OFF.length - 1] + KEEP[KEEP.length - 1][1] - KEEP[KEEP.length - 1][0];
export const DAY15_END = 3.6;
export const day15Total = () => TAKE + DAY15_END;
// source time -> output time
const out = (src: number) => {
	for (let i = KEEP.length - 1; i >= 0; i--) if (src >= KEEP[i][0] - 0.3) return OFF[i] + Math.max(0, src - KEEP[i][0]);
	return src;
};

const FIX: Record<string, string> = {version: 'vision', of: 'of', peace: 'a piece', '-woved': '-wove', detailed: 'detail', and: 'and', dedicated: 'the delicate', lights: 'light'};
const fixAt = (w: {w: string; t: number}) => {
	if (w.t > 31.5 && w.t < 32.2 && w.w === 'and') return '';
	if (w.t > 32.5 && w.t < 32.8 && w.w === 'the') return '';
	if (w.w === 'and') return 'and';
	return FIX[w.w] ?? w.w;
};
type CW = {w: string; t: number; e: number};
const capWords: CW[] = WORDS.filter((w) => KEEP.some(([a, b]) => w.t >= a && w.t < b))
	.map((w) => ({w: fixAt(w), t: out(w.t), e: out(w.e)}))
	.filter((w) => w.w)
	.reduce<CW[]>((acc, w) => {
		const last = acc[acc.length - 1];
		if (last && w.w.startsWith('-')) { last.w += w.w; last.e = w.e; return acc; }
		return [...acc, w];
	}, []);

const GRADE = 'contrast(1.05) saturate(1.04) sepia(0.06)';
const Her: React.FC<{from: number; dur: number; k: number}> = ({from, dur, k}) => {
	const frame = useCurrentFrame();
	const {fps} = useVideoConfig();
	const z = interpolate(frame, [0, dur * fps], k % 2 ? [1.1, 1.14] : [1.0, 1.04], clamp);
	return (
		<AbsoluteFill style={{overflow: 'hidden', background: '#000'}}>
			<OffthreadVideo src={staticFile('media/p10/day15.mp4')} muted trimBefore={Math.round(from * fps)}
				style={{width: 1080, height: 1920, scale: z, transformOrigin: '540px 760px', filter: GRADE}} />
		</AbsoluteFill>
	);
};

// her three wishes as soft chips above her head
const CHIPS = [
	{text: 'timeless', at: 6.1},
	{text: 'personal', at: 7.95},
	{text: 'traditional gold ✨', at: 11.6},
];
const Chips: React.FC = () => {
	const frame = useCurrentFrame();
	const {fps} = useVideoConfig();
	const t = frame / fps;
	const end = out(14.6);
	const fade = interpolate(t, [end - 0.4, end], [1, 0], clamp);
	return (
		<div style={{position: 'absolute', left: 0, right: 0, top: 1050, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 22, opacity: fade}}>
			{CHIPS.map((c, i) => {
				const a = spring({frame: frame - Math.round(out(c.at) * fps), fps, config: {damping: 13, mass: 0.6}});
				return (
					<div key={i} style={{opacity: a, scale: 0.6 + 0.4 * a, translate: `0 ${(1 - a) * 24}px`, background: 'rgba(255,252,246,0.92)', color: INK,
						borderRadius: 60, padding: '16px 40px', fontFamily: INSTRUMENT, fontStyle: 'italic', fontSize: 62, boxShadow: '0 12px 30px rgba(40,30,20,0.18)',
						border: i === 2 ? `2px solid ${TERRA}` : '2px solid transparent'}}>{c.text}</div>
				);
			})}
		</div>
	);
};

// the pencil sketch draws itself (soft-edged wipe) with a slow push
const Sketch: React.FC<{dur: number}> = ({dur}) => {
	const frame = useCurrentFrame();
	const {fps} = useVideoConfig();
	const t = frame / fps;
	const draw = interpolate(t, [0.2, 2.3], [0, 1], {...clamp, easing: Easing.inOut(Easing.quad)});
	const edge = -10 + draw * 120;
	const z = interpolate(t, [0, dur], [1.0, 1.06], clamp);
	const inA = interpolate(t, [0, 0.2], [0, 1], clamp);
	const outA = interpolate(t, [dur - 0.3, dur], [1, 0], clamp);
	return (
		<AbsoluteFill style={{background: '#F3EDE2', opacity: inA}}>
			<AbsoluteFill style={{scale: z, transformOrigin: '540px 760px', opacity: outA}}>
				<Img src={staticFile('img/ring15/R_sketch.jpg')} style={{width: 1080, height: 1920,
					maskImage: `linear-gradient(100deg, black ${edge - 8}%, transparent ${edge + 4}%)`, WebkitMaskImage: `linear-gradient(100deg, black ${edge - 8}%, transparent ${edge + 4}%)`}} />
			</AbsoluteFill>
			<div style={{position: 'absolute', left: 0, right: 0, top: 150, textAlign: 'center', fontFamily: AFACAD, fontWeight: 500, fontSize: 30, letterSpacing: '0.34em', color: '#8B7F70'}}>THE DESIGN, ON PAPER</div>
		</AbsoluteFill>
	);
};

// the real bracelet footage (upscaled from the phone clips), slowed a touch, with a short label
type Roll = {at: number; clip: string; from: number; dur: number; label?: string};
const ROLL: Roll[] = [
	{at: 14.7, clip: 'o3', from: 6.0, dur: 4.6, label: 'THE CENTRE STONE'},
	{at: 19.35, clip: 'rv', from: 4.0, dur: 2.6, label: 'CATCHING THE LIGHT'},
];
const RATE = 0.85;
const Clip: React.FC<{r: Roll}> = ({r}) => {
	const frame = useCurrentFrame();
	const {fps} = useVideoConfig();
	const t = frame / fps;
	const z = interpolate(t, [0, r.dur], [1.04, 1.1], clamp);
	const la = interpolate(t, [0.15, 0.45, r.dur - 0.25, r.dur], [0, 1, 1, 0], clamp);
	return (
		<AbsoluteFill style={{overflow: 'hidden', background: '#000'}}>
			<OffthreadVideo src={staticFile(`media/p10/${r.clip}.mp4`)} muted trimBefore={Math.round(r.from * fps)} playbackRate={RATE}
				style={{width: 1080, height: 1920, scale: z, filter: 'contrast(1.06) saturate(0.92) brightness(1.02)'}} />
			<AbsoluteFill style={{background: 'linear-gradient(rgba(0,0,0,0.35) 0%, rgba(0,0,0,0) 22%)'}} />
			{r.label ? <div style={{position: 'absolute', left: 0, right: 0, top: 150, textAlign: 'center', fontFamily: AFACAD, fontWeight: 500, fontSize: 30, letterSpacing: '0.34em',
				color: 'white', opacity: la, textShadow: '0 2px 12px rgba(0,0,0,0.5)'}}>{r.label}</div> : null}
		</AbsoluteFill>
	);
};


// macro push-ins on the real photos of the hand-engraved band
type Pic = {at: number; img: string; dur: number; label?: string; o?: [number, number]};
const PICS: Pic[] = [
	{at: 25.0, img: 'R1', dur: 3.6, label: 'HAND-ENGRAVED', o: [520, 1000]},
	{at: 28.6, img: 'R3', dur: 3.6, label: 'LACE-LIKE DETAIL', o: [540, 1000]},
	{at: 32.2, img: 'R2', dur: 3.9, label: 'AROUND THE PERFECT STONE', o: [560, 760]},
	{at: 37.2, img: 'R6', dur: 2.45, label: 'THE FINISHED PIECE', o: [600, 760]},
];
const Pic: React.FC<{p: Pic}> = ({p}) => {
	const frame = useCurrentFrame();
	const {fps} = useVideoConfig();
	const t = frame / fps;
	const z = interpolate(t, [0, p.dur], [1.05, 1.22], {...clamp, easing: Easing.inOut(Easing.quad)});
	const la = interpolate(t, [0.15, 0.45, p.dur - 0.25, p.dur], [0, 1, 1, 0], clamp);
	const [ox, oy] = p.o ?? [540, 900];
	return (
		<AbsoluteFill style={{overflow: 'hidden', background: '#EDE7DC'}}>
			<Img src={staticFile(`img/ring15/${p.img}.jpg`)} style={{width: 1080, height: 1920, scale: z, transformOrigin: `${ox}px ${oy}px`, filter: 'contrast(1.05) saturate(1.05)'}} />
			<AbsoluteFill style={{background: 'linear-gradient(rgba(0,0,0,0.3) 0%, rgba(0,0,0,0) 20%)'}} />
			{p.label ? <div style={{position: 'absolute', left: 0, right: 0, top: 150, textAlign: 'center', fontFamily: AFACAD, fontWeight: 500, fontSize: 30, letterSpacing: '0.34em',
				color: 'white', opacity: la, textShadow: '0 2px 12px rgba(0,0,0,0.5)'}}>{p.label}</div> : null}
		</AbsoluteFill>
	);
};

const groupsOf = (ws: CW[]) => {
	const res: CW[][] = [];
	let cur: CW[] = [];
	ws.forEach((w) => {
		if (cur.length && w.t - cur[cur.length - 1].e > 0.7) { res.push(cur); cur = []; }
		cur.push(w);
		if (/[.,!?]$/.test(w.w) || cur.length === 4) { res.push(cur); cur = []; }
	});
	if (cur.length) res.push(cur);
	return res;
};
const Captions: React.FC<{light: (t: number) => boolean}> = ({light}) => {
	const frame = useCurrentFrame();
	const {fps} = useVideoConfig();
	const t = frame / fps;
	const groups = React.useMemo(() => groupsOf(capWords), []);
	const g = groups.find((x, i) => t >= x[0].t - 0.05 && t < Math.min(x[x.length - 1].e + 0.5, groups[i + 1]?.[0].t ?? 1e9));
	if (!g || t >= TAKE) return null;
	const onLight = light(t);
	const a = spring({frame: frame - Math.round((g[0].t - 0.05) * fps), fps, config: {damping: 14, mass: 0.5}});
	return (
		<div style={{position: 'absolute', left: 70, right: 70, top: 1560, textAlign: 'center', opacity: a, scale: 0.92 + 0.08 * a,
			fontFamily: POPPINS, fontWeight: 700, fontSize: 62, lineHeight: 1.12, color: onLight ? INK : 'white',
			textShadow: onLight ? '0 0 18px rgba(255,252,246,1), 0 0 34px rgba(255,252,246,0.95), 0 0 6px rgba(255,252,246,1)' : '0 3px 0 rgba(0,0,0,0.5), 0 0 22px rgba(0,0,0,0.45)'}}>
			{g.map((w, i) => (
				<span key={i} style={{color: t >= w.t - 0.03 ? (onLight ? SAP : TERRA) : undefined}}>{w.w.replace(/,$/, '')}{i < g.length - 1 ? ' ' : ''}</span>
			))}
		</div>
	);
};

const EndCard: React.FC = () => {
	const frame = useCurrentFrame();
	const {fps} = useVideoConfig();
	const a = spring({frame, fps, config: {damping: 16, mass: 0.7}});
	const b = spring({frame: frame - 10, fps, config: {damping: 16, mass: 0.7}});
	const z = interpolate(frame, [0, 4 * fps], [1.06, 1.12], clamp);
	return (
		<AbsoluteFill style={{opacity: interpolate(frame, [0, 15], [0, 1], clamp), background: '#F3EDE2'}}>
			<AbsoluteFill style={{scale: z, transformOrigin: '540px 900px'}}>
				<OffthreadVideo src={staticFile('media/p10/rv.mp4')} muted trimBefore={Math.round(8.0 * fps)} playbackRate={0.7} style={{width: 1080, height: 1920}} />
			</AbsoluteFill>
			<AbsoluteFill style={{background: 'linear-gradient(rgba(248,244,237,0.96) 0%, rgba(248,244,237,0.85) 30%, rgba(248,244,237,0) 52%)'}} />
			<div style={{position: 'absolute', left: 80, right: 80, top: 210, textAlign: 'center', color: INK, opacity: a, translate: `0 ${(1 - a) * 26}px`}}>
				<div style={{fontFamily: INSTRUMENT, fontSize: 110, lineHeight: 1.0}}>Every detail,<br /><i style={{color: TERRA}}>made by hand</i></div>
			</div>
			<div style={{position: 'absolute', left: 0, right: 0, top: 560, textAlign: 'center', opacity: b}}>
				<div style={{display: 'inline-block', background: SAP, color: 'white', borderRadius: 60, padding: '20px 50px', fontFamily: POPPINS, fontWeight: 600, fontSize: 40}}>Bring your memory · takshila.co</div>
			</div>
		</AbsoluteFill>
	);
};

export const Day15Reel: React.FC = () => {
	const {fps, durationInFrames} = useVideoConfig();
	const f = (t: number) => Math.round(t * fps);
	const sk0 = out(22.1), sk1 = out(25.0);
	const light = (t: number) => (t >= sk0 && t < sk1) || ROLL.some((r) => r.clip !== 'rv' && t >= out(r.at) && t < out(r.at) + r.dur) || PICS.some((p) => t >= out(p.at) && t < out(p.at) + p.dur);
	const sfx: {t: number; f: string; v: number; len?: number}[] = [
		...CHIPS.map((c) => ({t: out(c.at) - 0.03, f: 'pop', v: 0.09})),
		{t: sk0 - 0.15, f: 'whoosh', v: 0.16},
		{t: out(37.2) - 1.0, f: 'riser', v: 0.12, len: 1.2},
		{t: out(37.2) + 0.05, f: 'glock', v: 0.22},
		{t: TAKE - 0.1, f: 'whoosh', v: 0.2},
		{t: TAKE + 0.5, f: 'click', v: 0.35},
	];
	return (
		<AbsoluteFill style={{background: '#000'}}>
			{KEEP.map(([a, b], i) => (
				<Sequence key={i} name={`take ${a}-${b}`} from={f(OFF[i])} durationInFrames={f(OFF[i] + b - a) - f(OFF[i])}>
					<Her from={a} dur={b - a} k={i} />
					<Audio src={staticFile('media/p10/day15.mp4')} trimBefore={f(a)} volume={(fr) => interpolate(fr, [0, 3, f(b - a) - 3, f(b - a)], [0, 1, 1, 0], clamp)} />
				</Sequence>
			))}
			<Chips />
			<Sequence name="sketch" from={f(sk0)} durationInFrames={f(sk1) - f(sk0)}><Sketch dur={sk1 - sk0} /></Sequence>
			{ROLL.map((r, i) => (
				<Sequence key={`r${i}`} name={`${r.clip} @${r.at}`} from={f(out(r.at))} durationInFrames={f(out(r.at) + r.dur) - f(out(r.at))}><Clip r={r} /></Sequence>
			))}
			{PICS.map((p, i) => (
				<Sequence key={`p${i}`} name={`${p.img} @${p.at}`} from={f(out(p.at))} durationInFrames={f(out(p.at) + p.dur) - f(out(p.at))}><Pic p={p} /></Sequence>
			))}
			<Sequence name="end card" from={f(TAKE)}><EndCard /></Sequence>
			<Captions light={light} />
			{sfx.map((h, i) => (
				<Sequence key={`s${i}`} name={`sfx ${h.f}`} from={Math.max(0, f(h.t))} durationInFrames={f(h.len ?? 2.2)} layout="none">
					<Audio src={staticFile(`sfx/reel/${h.f}.wav`)} volume={h.v} />
				</Sequence>
			))}
			<Audio name="music" src={staticFile('media/p4/lovelikethis.mp3')}
				volume={(fr) => interpolate(fr, [0, 20, f(TAKE) - 20, f(TAKE) + 10, durationInFrames - 25, durationInFrames], [0, 0.12, 0.12, 0.3, 0.3, 0], clamp)} />
		</AbsoluteFill>
	);
};
