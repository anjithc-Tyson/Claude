// Quiz-style cut of the street interview (reference: playful street-quiz reels), in Takshila colours.
// One word at a time, her answers pop up over her head, sharp highlight sounds, punch-ins only on the big answers.
import React from 'react';
import {AbsoluteFill, Easing, interpolate, OffthreadVideo, Sequence, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import {Audio} from '@remotion/media';
import faces from './data/street_faces.json';
import {ROUND} from './fonts';
import {Data, EndCard, Hook, NameTag, Pop, Screen, Seg, Title, END_DUR} from './Interview';

const SAP_DARK = '#2f4a17';
const SAP_LIGHT = '#b6d68c';
const clamp = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'} as const;
const ease = Easing.bezier(0.16, 1, 0.3, 1);
const springy = Easing.bezier(0.2, 1.6, 0.4, 1);

type Q = Data & {words: {w: string; t: number; e: number; key: boolean}[]; answers: {t: number; label: string}[]; punch: number[]; coins: number[]};
const face = (i: number) => (faces as Record<string, number[] | null>)[String(i)] ?? [680, 1000, 92];
export const quizTotal = (d: Data) => d.total + END_DUR;

// sharp, clearly audible highlights (earshot bank + Kenney CC0), mixed above the voice
const Hit: React.FC<{t: number; file: string; vol: number}> = ({t, file, vol}) => {
	const {fps} = useVideoConfig();
	return (
		<Sequence name={`sfx ${file}`} from={Math.max(0, Math.round(t * fps))} durationInFrames={Math.round(1.1 * fps)} layout="none">
			<Audio src={staticFile(`sfx/quiz/${file}.wav`)} volume={vol} />
		</Sequence>
	);
};

const Shot: React.FC<{seg: Seg; i: number; punch: boolean}> = ({seg, i, punch}) => {
	const frame = useCurrentFrame();
	const {fps} = useVideoConfig();
	const dur = (seg.b - seg.a) * fps;
	const fade = interpolate(frame, [0, 2, dur - 2, dur], [0, 1, 1, 0], clamp);
	const [fx, fy] = face(i);
	const z = punch ? interpolate(frame, [0, 6], [1, 1.45], {...clamp, easing: ease}) : 1;
	return (
		<AbsoluteFill style={{overflow: 'hidden'}}>
			<OffthreadVideo src={staticFile('media/p3/interview.mp4')} trimBefore={Math.round(seg.a * fps)} volume={fade} style={{width: 1080, height: 1920, scale: z, transformOrigin: `${fx}px ${fy + 120}px`}} />
		</AbsoluteFill>
	);
};

// green "correct" wash on the big answers
const Flash: React.FC = () => {
	const frame = useCurrentFrame();
	const a = interpolate(frame, [0, 3, 14], [0, 0.42, 0], clamp);
	return <AbsoluteFill style={{background: 'radial-gradient(ellipse at 50% 50%, rgba(140,200,90,0.2), rgba(90,170,60,0.9))', opacity: a, mixBlendMode: 'screen'}} />;
};

const Word: React.FC<{d: Q; hide: (t: number) => boolean; onScreen: (t: number) => boolean}> = ({d, hide, onScreen}) => {
	const frame = useCurrentFrame();
	const {fps} = useVideoConfig();
	const t = frame / fps;
	if (hide(t)) return null;
	const w = d.words.find((x) => x.t <= t && t < x.e);
	if (!w) return null;
	const age = t - w.t;
	const s = interpolate(age, [0, 0.1], [0.82, 1], {...clamp, easing: springy});
	const light = onScreen(t);
	return (
		<AbsoluteFill style={{justifyContent: 'flex-start', alignItems: 'center', top: light ? 1745 : 1180}}>
			<div
				style={{
					fontFamily: ROUND,
					fontWeight: 850,
					fontSize: light ? 92 : 112,
					letterSpacing: '-0.02em',
					color: w.key ? SAP_LIGHT : '#ffffff',
					WebkitTextStroke: `${light ? 10 : 14}px ${SAP_DARK}`,
					paintOrder: 'stroke fill',
					textShadow: '0 6px 14px rgba(0,0,0,0.35)',
					scale: s,
					whiteSpace: 'nowrap',
				}}
			>
				{w.w}
			</div>
		</AbsoluteFill>
	);
};

const Answer: React.FC<{label: string; x: number; y: number}> = ({label, x, y}) => {
	const frame = useCurrentFrame();
	const {durationInFrames: dur} = useVideoConfig();
	const s = interpolate(frame, [0, 7], [0.4, 1], {...clamp, easing: springy});
	const out = Math.max(4, dur - 5);
	const a = interpolate(frame, [0, 3, out, Math.max(out + 1, dur)], [0, 1, 1, 0], clamp);
	const left = Math.min(Math.max(x, 250), 830);
	return (
		<div style={{position: 'absolute', left: left - 400, width: 800, top: y - 330, textAlign: 'center', opacity: a, scale: s}}>
			<span style={{fontFamily: ROUND, fontWeight: 900, fontSize: 86, color: SAP_LIGHT, WebkitTextStroke: `14px ${SAP_DARK}`, paintOrder: 'stroke fill', textShadow: '0 6px 14px rgba(0,0,0,0.35)', whiteSpace: 'nowrap'}}>{label}</span>
		</div>
	);
};

export const Quiz: React.FC<{d: Q}> = ({d}) => {
	const {fps, durationInFrames} = useVideoConfig();
	const f = (t: number) => Math.round(t * fps);
	const screens = d.segments.filter((s) => s.overlay?.src !== undefined);
	const titled = d.segments.filter((s) => s.overlay?.title);
	const onScreen = (t: number) => screens.some((s) => t >= s.o && t < s.o + s.b - s.a);
	const hide = (t: number) => t < d.hookDur || t >= d.total || titled.some((s) => t >= s.o && t < s.o + s.b - s.a);
	const segAt = (t: number) => Math.max(0, d.segments.findIndex((s) => t >= s.o && t < s.o + s.b - s.a));
	return (
		<AbsoluteFill style={{backgroundColor: 'black'}}>
			{d.segments.map((s, i) => (
				<Sequence key={`s${i}`} name={`shot ${s.a}`} from={f(s.o)} durationInFrames={f(s.b - s.a)}>
					<Shot seg={s} i={i} punch={d.punch.includes(i)} />
				</Sequence>
			))}
			{screens.map((s) => (
				<Sequence key={`sc${s.o}`} name="Design Studio" from={f(s.o)} durationInFrames={f(s.b - s.a)}>
					<Screen seg={s} />
				</Sequence>
			))}
			{titled.filter((s) => s.overlay!.src === undefined).map((s) => (
				<Sequence key={`ti${s.o}`} from={f(s.o)} durationInFrames={f(s.b - s.a)}>
					<Title text={s.overlay!.title!} />
				</Sequence>
			))}
			{d.punch.map((i) => (
				<Sequence key={`fl${i}`} name="correct flash" from={f(d.segments[i].o) + 2} durationInFrames={16}>
					<Flash />
				</Sequence>
			))}
			<Word d={d} hide={hide} onScreen={onScreen} />
			{d.answers.map((a) => {
				const [x, y] = face(segAt(a.t));
				const seg = d.segments[segAt(a.t)];
				const left = seg.o + seg.b - seg.a - a.t;
				return (
					<Sequence key={`a${a.t}`} name={`answer ${a.label}`} from={f(a.t)} durationInFrames={Math.max(10, f(Math.min(1.6, left)))}>
						<Answer label={a.label} x={x} y={y} />
					</Sequence>
				);
			})}
			{d.pops.map((p) => (
				<Sequence key={`p${p.t}`} name={`sticker ${p.label}`} from={f(p.t - 0.05)} durationInFrames={f(1.5)}>
					<div style={{position: 'absolute', left: -250, top: -30, width: 1080, height: 1920, scale: 0.72, transformOrigin: '0px 0px'}}>
						<Pop img={p.img} label={p.label} />
					</div>
				</Sequence>
			))}
			{d.nameTag ? (
				<Sequence name="name tag" from={f(d.nameTag.t)} durationInFrames={f(3.2)}>
					<NameTag name={d.nameTag.name} sub={d.nameTag.sub} />
				</Sequence>
			) : null}
			<Sequence name="hook" durationInFrames={f(d.hookDur)}>
				<Hook d={d} />
			</Sequence>
			<Sequence name="end card" from={f(d.total)}>
				<EndCard d={d} />
			</Sequence>

			<Audio name="music" src={staticFile(`media/${d.music.file}`)} trimBefore={f(d.music.start)}
				volume={(fr) => interpolate(fr, [0, f(0.6), f(d.hookDur), f(d.hookDur) + 12, durationInFrames - f(2), durationInFrames], [0, 0.32, 0.32, 0.12, 0.12, 0], clamp)} />
			<Hit t={0.08} file="whoosh" vol={0.7} />
			{d.answers.map((a) => (
				<React.Fragment key={`h${a.t}`}>
					<Hit t={a.t} file="pop" vol={0.85} />
					<Hit t={a.t + 0.12} file="ding" vol={0.55} />
				</React.Fragment>
			))}
			{d.pops.map((p) => (
				<Hit key={`hp${p.t}`} t={p.t - 0.05} file="pop" vol={0.75} />
			))}
			{screens.filter((s, i) => i === 0 || s.overlay!.reveal).map((s) => (
				<Hit key={`hs${s.o}`} t={s.o - 0.06} file="whoosh" vol={0.7} />
			))}
			{titled.map((s) => (
				<Hit key={`ht${s.o}`} t={s.o + 0.1} file="ding" vol={0.6} />
			))}
			{d.punch.map((i) => (
				<Hit key={`hk${i}`} t={d.segments[i].o - 0.04} file="whoosh" vol={0.6} />
			))}
			{d.coins.map((t) => (
				<Hit key={`hc${t}`} t={t} file="coin" vol={0.7} />
			))}
			<Hit t={d.total + 0.02} file="ding" vol={0.55} />
		</AbsoluteFill>
	);
};
