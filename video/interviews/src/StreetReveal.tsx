// Street interview (outlet mall, two shoppers design a necklace on takshila.co), cold-open reveal edit:
// opens on the finished heart necklace held up to the camera with her line "Piece of my heart", then
// "2 minutes earlier" and the interview in order. While she picks and prompts, the iPad screen floats in as a
// tablet (the app's own category, prompt and sketch-loading screens; her typed prompt is overlaid as she said it).
// Off-message answers and dead air are cut. Source: media/p8/int.mp4 (HDR tone-mapped), media/p8/rec.mp4.
import React from 'react';
import {AbsoluteFill, Easing, Img, interpolate, OffthreadVideo, Sequence, spring, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import {Audio} from '@remotion/media';
import wordsData from './data/reveal_words.json';
import {AFACAD, INSTRUMENT, POPPINS} from './fonts';

const clamp = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'} as const;
const ease = Easing.bezier(0.16, 1, 0.3, 1);
const PINK = '#F6B9C6';
type Word = {w: string; t: number; e: number};
const WORDS = wordsData as Word[];

// v = video start in the interview, d = length, a = audio start (defaults to v)
type Seg = {v: number; d: number; a?: number; rate?: number; tab?: 'grid' | 'prompt' | 'type'; z?: [number, number]; o?: [number, number]; tag?: string};
export const SEGS: Seg[] = [
	{v: 144.7, a: 165.85, d: 2.75, rate: 0.42, z: [1.08, 1.18], o: [560, 900]},   // cold open: the necklace + "Piece of my heart"
	{v: 21.15, d: 3.8, tag: 'earlier'},
	{v: 25.85, d: 1.25, z: [1.12, 1.15]},
	{v: 35.45, d: 2.85},
	{v: 41.15, d: 2.75, z: [1.12, 1.15]},
	{v: 46.75, d: 4.2},
	{v: 51.1, d: 5.0, tab: 'grid'},
	{v: 59.6, d: 2.8, tab: 'prompt'},
	{v: 92.05, d: 3.55, tab: 'type'},
	{v: 112.4, d: 3.95, z: [1.12, 1.15]},
	{v: 134.8, d: 3.15},
	{v: 143.0, d: 3.3, z: [1.0, 1.15], o: [560, 900]},                // the reveal
	{v: 146.3, d: 3.15, z: [1.12, 1.15]},
	{v: 165.85, d: 2.75},
	{v: 176.35, d: 6.3, tag: 'rapid', z: [1.12, 1.15]},
	{v: 184.7, d: 5.65},
];
export const REVEAL_END = 3.2;
const starts = SEGS.reduce<number[]>((acc, s, i) => [...acc, i === 0 ? 0 : acc[i - 1] + SEGS[i - 1].d], []);
export const revealTotal = () => starts[starts.length - 1] + SEGS[SEGS.length - 1].d + REVEAL_END;

// transcript fixes (whisper mishearings)
const FIX: Record<string, string> = {chance: 'chain', Nomen: 'Yurman', 'Nomen.': 'Yurman.', "K's": "Kay's", love: 'know', prompts: 'prompt.', 'prompts.': 'prompt.'};
const fixWord = (w: Word) => {
	if (w.t > 49.1 && w.t < 49.5 && w.w === 'have') return '';
	if (w.w === 'never' && w.t > 49 && w.t < 50) return "I've never";
	if (w.t > 48.7 && w.t < 49.4 && (w.w === 'I' || w.w === "don't")) return '';
	if (w.w === 'love' && w.t < 188) return w.w;
	if (w.w === 'how' && w.t > 61 && w.t < 61.3) return '';
	return FIX[w.w] ?? w.w;
};

// caption words in output time
type CW = {w: string; t: number; e: number; seg: number};
const capWords: CW[] = [];
SEGS.forEach((s, i) => {
	const a = s.a ?? s.v;
	WORDS.filter((w) => w.t >= a - 0.05 && w.t < a + s.d - 0.15).forEach((w) => {
		const txt = fixWord(w);
		const last = capWords[capWords.length - 1];
		if (txt && txt.startsWith('-') && last) { last.w += txt; last.e = starts[i] + w.e - a; return; }
		if (txt) capWords.push({w: txt, t: starts[i] + w.t - a, e: starts[i] + Math.min(w.e, a + s.d) - a, seg: i});
	});
});

const Face: React.FC<{s: Seg; i: number}> = ({s, i}) => {
	const frame = useCurrentFrame();
	const {fps} = useVideoConfig();
	const p = frame / (s.d * fps);
	const [z0, z1] = s.z ?? (i % 2 ? [1.0, 1.03] : [1.06, 1.09]);
	const z = interpolate(p, [0, 1], [z0, z1], {...clamp, easing: Easing.inOut(Easing.quad)});
	const [ox, oy] = s.o ?? [540, 880];
	return (
		<AbsoluteFill style={{overflow: 'hidden', backgroundColor: 'black'}}>
			<OffthreadVideo src={staticFile('media/p8/int.mp4')} muted trimBefore={Math.round(s.v * fps)} playbackRate={s.rate ?? 1}
				style={{width: 1080, height: 1920, scale: z, transformOrigin: `${ox}px ${oy}px`}} />
		</AbsoluteFill>
	);
};

// the iPad screen floating on a blush backdrop
const TW = 860, TH = Math.round(860 * 2360 / 1640), TX = (1080 - TW) / 2, TY = 300;
const PROMPT = 'Heart-shaped diamond necklace';
const Tablet: React.FC<{s: Seg; inFrom: boolean; outTo: boolean}> = ({s, inFrom, outTo}) => {
	const frame = useCurrentFrame();
	const {fps} = useVideoConfig();
	const t = frame / fps;
	const enter = inFrom ? spring({frame, fps, config: {damping: 16, mass: 0.7}}) : 1;
	const leave = outTo ? interpolate(t, [s.d - 0.3, s.d], [0, 1], {...clamp, easing: Easing.in(Easing.cubic)}) : 0;
	const y = (1 - enter) * 900 + leave * 1000;
	const rot = (1 - enter) * 8 - leave * 6;
	const k = PROMPT.length;
	const typed = s.tab === 'type' ? Math.round(interpolate(t, [0.1, 1.9], [0, k], clamp)) : 0;
	const caret = Math.floor(t * 2.2) % 2 === 0;
	const sk = s.tab === 'type' ? interpolate(t, [2.45, 2.65], [0, 1], clamp) : 0;
	const press = s.tab === 'type' ? interpolate(t, [2.1, 2.25, 2.45], [1, 0.92, 1], clamp) : 1;
	const S = TW / 1640;
	return (
		<AbsoluteFill style={{background: 'linear-gradient(170deg, #FBEFF1 0%, #F6E3E7 55%, #F1DCD6 100%)'}}>
			<div style={{position: 'absolute', left: 0, right: 0, top: 120, textAlign: 'center', fontFamily: AFACAD, fontWeight: 500, fontSize: 30, letterSpacing: '0.34em', color: '#8A5A66', opacity: enter}}>
				LIVE ON TAKSHILA.CO
			</div>
			<div style={{position: 'absolute', left: TX - 18, top: TY - 18, width: TW + 36, height: TH + 36, borderRadius: 56, background: '#1B1B1F', translate: `0 ${y}px`, rotate: `${rot}deg`,
				boxShadow: '0 40px 90px rgba(90,40,55,0.35), 0 10px 24px rgba(0,0,0,0.25)', padding: 18}}>
				<div style={{position: 'relative', width: TW, height: TH, borderRadius: 40, overflow: 'hidden', background: '#FBF2F3'}}>
					{s.tab === 'grid' ? (
						<OffthreadVideo src={staticFile('media/p8/rec.mp4')} muted trimBefore={Math.round(135.6 * fps)} style={{width: TW, height: TH}} />
					) : (
						<>
							<Img src={staticFile('img/rec_prompt.png')} style={{width: TW, height: TH}} />
							{/* the prompt box: cover the placeholder and type her prompt */}
							<div style={{position: 'absolute', left: 70 * S, top: 715 * S, width: 1500 * S, height: 300 * S, background: 'white'}} />
							<div style={{position: 'absolute', left: 106 * S, top: 748 * S, fontFamily: AFACAD, fontSize: 64 * S, color: '#2B2024'}}>
								{s.tab === 'prompt' ? <span style={{color: '#A59A9D'}}>{caret ? '|' : ' '}</span> : <>{PROMPT.slice(0, typed)}<span style={{opacity: caret && typed < k ? 1 : 0}}>|</span></>}
							</div>
							<div style={{position: 'absolute', left: 1336 * S, top: 1062 * S, width: 198 * S, height: 82 * S, borderRadius: 41 * S, scale: press,
								background: s.tab === 'type' && t > 2.1 ? '#5C2A3E' : 'transparent', color: 'white', fontFamily: AFACAD, fontWeight: 600, fontSize: 26 * S * 1.6, letterSpacing: '0.1em',
								display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: s.tab === 'type' && t > 2.1 ? 1 : 0}}>GENERATE</div>
							{sk > 0 ? (
								<div style={{position: 'absolute', left: 0, top: 0, width: TW, height: TH, opacity: sk}}>
									<OffthreadVideo src={staticFile('media/p8/rec.mp4')} muted trimBefore={Math.round(168.4 * fps)} style={{width: TW, height: TH}} />
								</div>
							) : null}
						</>
					)}
				</div>
			</div>
		</AbsoluteFill>
	);
};

const groupsOf = (ws: CW[]) => {
	const out: CW[][] = [];
	let cur: CW[] = [];
	ws.forEach((w, i) => {
		if (cur.length && (w.seg !== cur[0].seg || w.t - cur[cur.length - 1].e > 0.6)) { out.push(cur); cur = []; }
		cur.push(w);
		if (/[.,!?]$/.test(w.w) || cur.length === 4) { out.push(cur); cur = []; }
	});
	if (cur.length) out.push(cur);
	return out;
};
const Captions: React.FC = () => {
	const frame = useCurrentFrame();
	const {fps} = useVideoConfig();
	const t = frame / fps;
	const groups = React.useMemo(() => groupsOf(capWords), []);
	const g = groups.find((x, i) => t >= x[0].t - 0.05 && t < Math.min(x[x.length - 1].e + 0.45, groups[i + 1]?.[0].t ?? 1e9));
	if (!g || g[0].seg === 0 || g[0].seg === 13) return null;
	const onTab = !!SEGS[g[0].seg].tab;
	const a = spring({frame: frame - Math.round((g[0].t - 0.05) * fps), fps, config: {damping: 14, mass: 0.5}});
	return (
		<div style={{position: 'absolute', left: 70, right: 70, top: onTab ? 1660 : 1370, textAlign: 'center', scale: 0.92 + 0.08 * a, opacity: a,
			fontFamily: POPPINS, fontWeight: 700, fontSize: 64, lineHeight: 1.12, color: onTab ? '#2B1A20' : 'white',
			textShadow: onTab ? 'none' : '0 3px 0 rgba(0,0,0,0.55), 0 0 22px rgba(0,0,0,0.45)'}}>
			{g.map((w, i) => (
				<span key={i} style={{color: t >= w.t - 0.03 ? (onTab ? '#B0476A' : PINK) : undefined}}>{w.w.replace(/[,]$/, '')}{i < g.length - 1 ? ' ' : ''}</span>
			))}
		</div>
	);
};

// the quote over the necklace (cold open and the callback)
const Quote: React.FC<{d: number; small?: boolean}> = ({d, small}) => {
	const frame = useCurrentFrame();
	const {fps} = useVideoConfig();
	const t = frame / fps;
	const a = interpolate(t, [0.05, 0.5, d - 0.25, d], [0, 1, 1, small ? 1 : 0], {...clamp, easing: ease});
	return (
		<div style={{position: 'absolute', left: 0, right: 0, top: small ? 1360 : 150, textAlign: 'center', opacity: a, translate: `0 ${(1 - a) * 20}px`, color: 'white',
			textShadow: '0 4px 30px rgba(0,0,0,0.55), 0 2px 6px rgba(0,0,0,0.45)'}}>
			<div style={{fontFamily: INSTRUMENT, fontStyle: 'italic', fontSize: small ? 112 : 132, lineHeight: 1}}>“Piece of my heart”</div>
			{small ? null : <div style={{fontFamily: AFACAD, fontWeight: 500, fontSize: 32, letterSpacing: '0.3em', marginTop: 22}}>SHE DESIGNED THIS · ON THE STREET</div>}
		</div>
	);
};

const Tag: React.FC<{kind: 'earlier' | 'rapid'}> = ({kind}) => {
	const frame = useCurrentFrame();
	const {fps} = useVideoConfig();
	const a = spring({frame, fps, config: {damping: 13, mass: 0.6}});
	const out = interpolate(frame / fps, [1.9, 2.2], [1, 0], clamp);
	const earlier = kind === 'earlier';
	return (
		<>
			{earlier ? <AbsoluteFill style={{background: 'white', opacity: interpolate(frame, [0, 5], [0.85, 0], clamp)}} /> : null}
			<div style={{position: 'absolute', left: 0, right: 0, top: 230, display: 'flex', justifyContent: 'center', opacity: (earlier ? out : 1) * a}}>
				<div style={{background: earlier ? 'rgba(20,14,16,0.78)' : '#B0476A', color: 'white', borderRadius: 60, padding: '20px 44px', fontFamily: POPPINS, fontWeight: 700,
					fontSize: 40, letterSpacing: '0.12em', scale: 0.7 + 0.3 * a, rotate: earlier ? '0deg' : '-3deg'}}>
					{earlier ? '⏪  2 MINUTES EARLIER' : '⚡ RAPID FIRE'}
				</div>
			</div>
		</>
	);
};

const EndCard: React.FC = () => {
	const frame = useCurrentFrame();
	const {fps} = useVideoConfig();
	const a = spring({frame, fps, config: {damping: 16, mass: 0.7}});
	const b = spring({frame: frame - 10, fps, config: {damping: 16, mass: 0.7}});
	return (
		<AbsoluteFill style={{background: 'linear-gradient(170deg, #FBEFF1 0%, #F6E3E7 55%, #F1DCD6 100%)', opacity: interpolate(frame, [0, 6], [0, 1], clamp)}}>
			<div style={{position: 'absolute', left: 80, right: 80, top: 640, textAlign: 'center', color: '#3A2028', opacity: a, translate: `0 ${(1 - a) * 30}px`}}>
				<div style={{fontFamily: INSTRUMENT, fontSize: 118, lineHeight: 1.0}}>What would <i>you</i><br />design?</div>
			</div>
			<div style={{position: 'absolute', left: 0, right: 0, top: 1000, textAlign: 'center', opacity: b}}>
				<div style={{display: 'inline-block', background: '#3A2028', color: 'white', borderRadius: 60, padding: '22px 52px', fontFamily: POPPINS, fontWeight: 600, fontSize: 40}}>Try it free · takshila.co</div>
				<div style={{fontFamily: AFACAD, fontSize: 36, color: '#8A5A66', marginTop: 34}}>tell us in the comments 👇</div>
			</div>
		</AbsoluteFill>
	);
};

export const StreetRevealReel: React.FC = () => {
	const {fps, durationInFrames} = useVideoConfig();
	const f = (t: number) => Math.round(t * fps);
	const total = starts[starts.length - 1] + SEGS[SEGS.length - 1].d;
	const typeIdx = SEGS.findIndex((s) => s.tab === 'type');
	const sfx: {t: number; f: string; v: number}[] = [
		{t: starts[1] - 0.15, f: 'whoosh', v: 0.26},
		{t: starts[6] - 0.1, f: 'whoosh', v: 0.2},
		...PROMPT.split(' ').map((_, k) => ({t: starts[typeIdx] + 0.1 + (k * 1.8) / 3, f: 'key', v: 0.28})),
		{t: starts[typeIdx] + 2.15, f: 'click', v: 0.35},
		{t: starts[11] - 1.0, f: 'riser', v: 0.16},
		{t: starts[11] + 1.6, f: 'glock', v: 0.26},
		{t: starts[14], f: 'tick', v: 0.35},
		{t: total, f: 'whoosh', v: 0.22},
		{t: total + 0.45, f: 'pop', v: 0.3},
	];
	return (
		<AbsoluteFill style={{backgroundColor: 'black'}}>
			{SEGS.map((s, i) => (
				<Sequence key={i} name={`seg ${i} @${s.v}`} from={f(starts[i])} durationInFrames={f(starts[i] + s.d) - f(starts[i])}>
					{s.tab ? <Tablet s={s} inFrom={!SEGS[i - 1]?.tab} outTo={!SEGS[i + 1]?.tab} /> : <Face s={s} i={i} />}
					{i === 0 ? <Quote d={s.d} /> : null}
					{i === 13 ? <Quote d={s.d} small /> : null}
					{s.tag ? <Tag kind={s.tag as 'earlier' | 'rapid'} /> : null}
					<Audio src={staticFile('media/p8/int.mp4')} trimBefore={f(s.a ?? s.v)}
						volume={(fr) => interpolate(fr, [0, 2, f(s.d) - 2, f(s.d)], [0, 1, 1, 0], clamp)} />
				</Sequence>
			))}
			<Sequence name="end card" from={f(total)}><EndCard /></Sequence>
			<Captions />
			{sfx.map((h, i) => (
				<Sequence key={`s${i}`} name={`sfx ${h.f}`} from={Math.max(0, f(h.t))} durationInFrames={f(2.2)} layout="none">
					<Audio src={staticFile(`sfx/reel/${h.f}.wav`)} volume={h.v} />
				</Sequence>
			))}
			<Audio name="music" src={staticFile('media/p4/lovelikethis.mp3')}
				volume={(fr) => interpolate(fr, [0, 15, f(total), f(total) + 10, durationInFrames - 15, durationInFrames], [0, 0.07, 0.07, 0.22, 0.22, 0], clamp)} />
		</AbsoluteFill>
	);
};
