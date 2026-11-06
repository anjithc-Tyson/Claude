// Script 3 as a journey tracker: she talks full screen; a Takshila "your piece" tracker card in the lower third checks
// off Your idea → Your choices → Crafting → Ready on her words, with a photo for each stage (site look and fonts).
import React from 'react';
import {AbsoluteFill, Easing, Img, interpolate, OffthreadVideo, Sequence, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import {Audio} from '@remotion/media';
import journeyData from './data/journey.json';
import {AFACAD, CORMORANT_G, INSTRUMENT} from './fonts';

const C = {bg: '#F5EFE7', card: '#FBF8F3', plum: '#2B1016', mauve: '#6D3B54', taupe: '#7A5D63', line: '#E7DCCF', gold: '#C9A14A', chip: '#F1E8DD'};
const clamp = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'} as const;
const ease = Easing.bezier(0.16, 1, 0.3, 1);
const springy = Easing.bezier(0.2, 1.5, 0.4, 1);

type Seg = {a: number; b: number; o: number; rate: number};
type Word = {w: string; t: number; e: number; key: boolean};
type Ev = {t: number; ev: string; step?: number; img?: string; label?: string};
export type JourneyData = {clip: string; total: number; segments: Seg[]; words: Word[]; events: Ev[]; images?: Record<string, string>;
	music?: {file: string; start: number; vol: number}; sfx?: boolean; placeholders?: boolean};
export const JOURNEY = journeyData as unknown as JourneyData;
export const JOURNEY_END = 3.2;
export const journeyTotal = (d: JourneyData) => d.total + JOURNEY_END;
const segLen = (s: Seg) => (s.b - s.a) / s.rate;

// stand-ins until the J01–J11 images arrive
const PLACEHOLDER: Record<string, string> = {J01: 'studio2/P03.jpg', J02: 'infl2/10.jpg', J03: 'studio2/P02.jpg', J04: 'studio2/P08.jpg', J05: 'infl2/08.jpg',
	J06: 'studio2/P05.jpg', J07: 'infl2/14.jpg', J08: 'infl2/14.jpg', J09: 'studio2/P09.jpg', J10: 'studio2/P11.jpg', J11: 'infl2/13.jpg'};
const imgOf = (d: JourneyData, k: string) => staticFile(`img/${d.placeholders === false ? d.images?.[k] : PLACEHOLDER[k]}`);
const fade = (t: number, at: number, len = 0.3) => interpolate(t, [at, at + len], [0, 1], {...clamp, easing: ease});

const Face: React.FC<{d: JourneyData; s: Seg}> = ({d, s}) => {
	const frame = useCurrentFrame();
	const {fps} = useVideoConfig();
	const dur = segLen(s) * fps;
	const vol = interpolate(frame, [0, 2, dur - 2, dur], [0, 1, 1, 0], clamp);
	return <OffthreadVideo src={staticFile(`media/p6/${d.clip}.mp4`)} trimBefore={Math.round(s.a * fps)} playbackRate={s.rate} volume={vol} style={{width: 1080, height: 1920}} />;
};

const Caption: React.FC<{d: JourneyData}> = ({d}) => {
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
	const g = groups.find((x, k) => x[0].t <= t && t < Math.min(x[x.length - 1].e + 0.3, groups[k + 1]?.[0].t ?? 1e9));
	if (!g) return null;
	const text = g.filter((w) => w.t <= t).map((w) => w.w.replace(/[.,!?]+$/, '')).join(' ');
	return (
		<div style={{position: 'absolute', top: 1040, width: 1080, textAlign: 'center'}}>
			<span style={{fontFamily: INSTRUMENT, fontSize: 76, color: 'white', textTransform: 'lowercase',
				textShadow: '0 1px 2px rgba(0,0,0,0.6), 0 0 10px rgba(0,0,0,0.45), 0 4px 24px rgba(0,0,0,0.5), 0 0 42px rgba(0,0,0,0.3)'}}>{text}</span>
		</div>
	);
};

const STEPS = [
	{title: 'Your idea', sub: 'A meaningful stone, a special date, a design'},
	{title: 'Your choices', sub: 'Metal · stone · details'},
	{title: 'Crafting', sub: 'Shape · set · polish · refine'},
	{title: 'Ready', sub: 'Made just for you'},
];

const Node: React.FC<{state: 'done' | 'active' | 'todo'; t: number; at: number}> = ({state, t, at}) => {
	const pop = interpolate(t, [at, at + 0.25], [0.6, 1], {...clamp, easing: springy});
	const pulse = 1 + 0.08 * Math.sin(t * 5);
	if (state === 'done') {
		return (
			<div style={{width: 46, height: 46, borderRadius: 23, background: C.gold, color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center',
				fontFamily: AFACAD, fontSize: 26, scale: pop}}>✓</div>
		);
	}
	return (
		<div style={{width: 46, height: 46, borderRadius: 23, border: `3px solid ${state === 'active' ? C.plum : C.line}`, background: C.card,
			display: 'flex', alignItems: 'center', justifyContent: 'center', scale: state === 'active' ? pulse : 1}}>
			<div style={{width: 16, height: 16, borderRadius: 8, background: state === 'active' ? C.plum : C.line}} />
		</div>
	);
};

const Tracker: React.FC<{d: JourneyData}> = ({d}) => {
	const frame = useCurrentFrame();
	const {fps} = useVideoConfig();
	const t = frame / fps;
	const steps = d.events.filter((e) => e.ev === 'step');
	const stepAt = (i: number) => steps[i]?.t ?? 1e9;
	const reveal = d.events.find((e) => e.ev === 'reveal')!;
	const cta = d.events.find((e) => e.ev === 'cta')!;
	const refine = d.events.find((e) => e.ev === 'refine')!;
	const cur = t < stepAt(0) ? -1 : steps.filter((s) => s.t <= t).length - 1;
	const thumbs = d.events.filter((e) => e.ev === 'thumb');
	const inA = interpolate(t, [Math.max(0, stepAt(0) - 0.6), stepAt(0) - 0.1], [0, 1], {...clamp, easing: ease});
	const doneAll = t >= reveal.t;
	const status = doneAll ? 'Ready' : cur >= 2 ? 'Crafting' : 'In progress';
	return (
		<div style={{position: 'absolute', left: 50, top: 1180, width: 980, opacity: inA, translate: `0 ${(1 - inA) * 60}px`, background: 'rgba(251,248,243,0.97)',
			borderRadius: 38, boxShadow: '0 24px 60px rgba(0,0,0,0.35)', padding: '26px 34px 30px', boxSizing: 'border-box'}}>
			<div style={{display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18}}>
				<div style={{display: 'flex', alignItems: 'center', gap: 16}}>
					<Img src={staticFile('img/studio/logo.png')} style={{height: 38}} />
					<div style={{fontFamily: AFACAD, fontSize: 24, color: C.taupe, letterSpacing: '0.12em'}}>YOUR PIECE</div>
				</div>
				<div style={{fontFamily: AFACAD, fontSize: 22, color: doneAll ? 'white' : C.mauve, background: doneAll ? C.gold : C.chip, borderRadius: 20, padding: '6px 18px'}}>
					{doneAll ? '✦ ' : '● '}{status}
				</div>
			</div>
			{doneAll ? (
				// Ready: the finished piece takes over the card
				<div style={{display: 'flex', gap: 26, alignItems: 'center', opacity: fade(t, reveal.t)}}>
					<div style={{width: 400, height: 400, borderRadius: 28, overflow: 'hidden', flexShrink: 0, scale: interpolate(t, [reveal.t, reveal.t + 0.4], [0.85, 1], {...clamp, easing: springy})}}>
						<Img src={imgOf(d, 'J10')} style={{width: '100%', height: '100%', objectFit: 'cover'}} />
					</div>
					<div>
						<div style={{display: 'flex', gap: 8, marginBottom: 16}}>
							{STEPS.map((s) => <div key={s.title} style={{width: 34, height: 34, borderRadius: 17, background: C.gold, color: 'white', fontSize: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: AFACAD}}>✓</div>)}
						</div>
						<div style={{fontFamily: CORMORANT_G, fontSize: 54, lineHeight: 1.02, color: C.plum}}>Made for <i>no one else</i></div>
						<div style={{fontFamily: AFACAD, fontSize: 25, color: C.taupe, marginTop: 12}}>From a blank canvas to your piece.</div>
						{t >= cta.t ? (
							<div style={{display: 'inline-block', marginTop: 26, background: C.plum, color: 'white', borderRadius: 32, padding: '16px 34px', fontFamily: AFACAD, fontSize: 27,
								scale: interpolate(t, [cta.t, cta.t + 0.25], [0.85, 1], {...clamp, easing: springy}), opacity: fade(t, cta.t, 0.2)}}>Start yours at takshila.co</div>
						) : null}
					</div>
				</div>
			) : (
				STEPS.map((s, i) => {
					const state = i < cur ? 'done' : i === cur ? 'active' : 'todo';
					const mine = thumbs.filter((e) => e.t >= stepAt(i) - 0.01 && e.t < stepAt(i + 1));
					const open = state === 'active';
					return (
						<div key={s.title} style={{display: 'flex', gap: 22, position: 'relative', paddingBottom: i < 3 ? 14 : 0}}>
							<div style={{display: 'flex', flexDirection: 'column', alignItems: 'center'}}>
								<Node state={state} t={t} at={state === 'done' ? stepAt(i + 1) : stepAt(i)} />
								{i < 3 ? <div style={{width: 3, flex: 1, minHeight: 14, background: i < cur ? C.gold : C.line, marginTop: 6}} /> : null}
							</div>
							<div style={{flex: 1, paddingTop: 4}}>
								<div style={{display: 'flex', alignItems: 'baseline', gap: 14}}>
									<div style={{fontFamily: CORMORANT_G, fontSize: open ? 44 : 34, color: state === 'todo' ? '#B5A79F' : C.plum}}>{s.title}</div>
									{state === 'done' ? <div style={{fontFamily: AFACAD, fontSize: 20, color: C.gold}}>Done</div> : null}
								</div>
								{open ? (
									<>
										<div style={{fontFamily: AFACAD, fontSize: 24, color: C.taupe, marginTop: 2}}>
											{i === 2 ? ['Shape', 'Set', 'Polish', 'Refine'].map((x, k) => {
												const at = k < 3 ? mine[k]?.t ?? 1e9 : refine.t;
												return <span key={x} style={{color: t >= at ? C.plum : '#B5A79F', marginRight: 14}}>{t >= at ? '✓ ' : ''}{x}</span>;
											}) : s.sub}
										</div>
										<div style={{display: 'flex', gap: 14, marginTop: 14, minHeight: 150}}>
											{mine.filter((e) => e.t <= t).map((e) => (
												<div key={e.img} style={{width: 190, opacity: fade(t, e.t, 0.2), scale: interpolate(t, [e.t, e.t + 0.25], [0.7, 1], {...clamp, easing: springy})}}>
													<div style={{width: 190, height: 150, borderRadius: 18, overflow: 'hidden', boxShadow: '0 6px 16px rgba(0,0,0,0.15)'}}>
														<Img src={imgOf(d, e.img!)} style={{width: '100%', height: '100%', objectFit: 'cover'}} />
													</div>
													<div style={{fontFamily: AFACAD, fontSize: 20, color: C.taupe, marginTop: 6, textAlign: 'center'}}>{e.label}</div>
												</div>
											))}
										</div>
									</>
								) : state === 'done' ? (
									<div style={{display: 'flex', gap: 8, marginTop: 4}}>
										{mine.map((e) => (
											<div key={e.img} style={{width: 46, height: 46, borderRadius: 10, overflow: 'hidden'}}>
												<Img src={imgOf(d, e.img!)} style={{width: '100%', height: '100%', objectFit: 'cover'}} />
											</div>
										))}
									</div>
								) : null}
							</div>
						</div>
					);
				})
			)}
		</div>
	);
};

const EndCard: React.FC<{d: JourneyData}> = ({d}) => {
	const frame = useCurrentFrame();
	const {fps} = useVideoConfig();
	const a = interpolate(frame, [0, 8], [0, 1], clamp);
	const z = interpolate(frame, [0, JOURNEY_END * fps], [1.02, 1.08], clamp);
	const t1 = interpolate(frame, [6, 18], [0, 1], {...clamp, easing: ease});
	return (
		<AbsoluteFill style={{opacity: a, background: C.bg, alignItems: 'center'}}>
			<div style={{marginTop: 280, width: 780, height: 780, borderRadius: 40, overflow: 'hidden', boxShadow: '0 30px 70px rgba(43,16,22,0.18)'}}>
				<Img src={imgOf(d, 'J11')} style={{width: '100%', height: '100%', objectFit: 'cover', scale: z}} />
			</div>
			<Img src={staticFile('img/studio/logo.png')} style={{height: 96, marginTop: 70, opacity: t1}} />
			<div style={{fontFamily: CORMORANT_G, fontStyle: 'italic', fontSize: 58, color: C.plum, marginTop: 18, opacity: t1}}>Something to keep forever</div>
			<div style={{marginTop: 34, background: C.plum, color: 'white', borderRadius: 40, padding: '20px 54px', fontFamily: AFACAD, fontSize: 36, opacity: t1}}>takshila.co</div>
		</AbsoluteFill>
	);
};

// only sounds from the supplied reel pack
const Sfx: React.FC<{d: JourneyData}> = ({d}) => {
	const {fps} = useVideoConfig();
	if (d.sfx === false) return null;
	const ev = d.events;
	const hits: {t: number; f: string; v: number; len?: number}[] = [];
	const steps = ev.filter((e) => e.ev === 'step');
	hits.push({t: steps[0].t - 0.4, f: 'whoosh', v: 0.3});
	steps.slice(1).forEach((s) => hits.push({t: s.t, f: 'tick', v: 0.45}));
	ev.filter((e) => e.ev === 'thumb').forEach((e) => hits.push({t: e.t, f: 'pop', v: 0.28}));
	const refine = ev.find((e) => e.ev === 'refine')!;
	hits.push({t: refine.t, f: 'tick2', v: 0.35});
	const reveal = ev.find((e) => e.ev === 'reveal')!;
	hits.push({t: reveal.t - 1.5, f: 'riser', v: 0.22, len: 1.65}, {t: reveal.t, f: 'glock', v: 0.4});
	const cta = ev.find((e) => e.ev === 'cta')!;
	hits.push({t: cta.t, f: 'click', v: 0.4});
	hits.push({t: d.total - 1.5, f: 'riser', v: 0.22, len: 1.65}, {t: d.total + 0.25, f: 'ding', v: 0.35});
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

export const JourneyReel: React.FC<{d: JourneyData}> = ({d}) => {
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
			<AbsoluteFill style={{background: 'linear-gradient(rgba(0,0,0,0) 52%, rgba(0,0,0,0.35) 100%)'}} />
			<Caption d={d} />
			<Tracker d={d} />
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
