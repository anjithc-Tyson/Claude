// Quiz-style cut of the street interview (reference: playful street-quiz reels), in Takshila colours.
// One word at a time, her answers pop up over her head, sharp highlight sounds, punch-ins only on the big answers.
import React from 'react';
import {AbsoluteFill, Easing, interpolate, OffthreadVideo, Sequence, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import {Audio} from '@remotion/media';
import faces from './data/street_faces.json';
import quizData from './data/street_quiz.json';
import {ROUND} from './fonts';
import {Data, NameTag, Pop, Screen, Seg, Title, END_DUR} from './Interview';
import {Img} from 'remotion';

const SAP_DARK = '#2f4a17';
const SAP_LIGHT = '#b6d68c';
const clamp = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'} as const;
const ease = Easing.bezier(0.16, 1, 0.3, 1);
const springy = Easing.bezier(0.2, 1.6, 0.4, 1);
export const QUIZ = quizData as unknown as Data;

type Q = Data & {words: {w: string; t: number; e: number; key: boolean}[]; answers: {t: number; label: string}[]; punch: number[]; coins: number[]};
const face = (i: number) => (faces as Record<string, number[] | null>)[String(i)] ?? [680, 1000, 92];
// the frame stays on the two of them (heads near the top, down to the thighs), the same for every shot
const VIEW = {z: 1.45, x: 470, y: 1090};
export const quizTotal = (d: Data) => d.total + END_DUR;

// sharp, clearly audible highlights (earshot bank + Kenney CC0), mixed above the voice
const Hit: React.FC<{t: number; file: string; vol: number; dur?: number}> = ({t, file, vol, dur = 1.1}) => {
	const {fps} = useVideoConfig();
	return (
		<Sequence name={`sfx ${file}`} from={Math.max(0, Math.round(t * fps))} durationInFrames={Math.round(dur * fps)} layout="none">
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
	const p = punch ? interpolate(frame, [0, 6], [0, 1], {...clamp, easing: ease}) : 0;
	// punch-in: zoom further and slide the centre onto her
	const z = VIEW.z * (1 + 0.3 * p);
	const cx = VIEW.x + (fx - VIEW.x) * p;
	const cy = VIEW.y + (fy + 150 - VIEW.y) * p;
	return (
		<AbsoluteFill style={{overflow: 'hidden'}}>
			<OffthreadVideo src={staticFile('media/p3/interview.mp4')} trimBefore={Math.round(seg.a * fps)} volume={fade}
				style={{position: 'absolute', width: 1080, height: 1920, left: 540 - cx, top: 960 - cy, scale: z, transformOrigin: `${cx}px ${cy}px`}} />
		</AbsoluteFill>
	);
};

// green "correct" wash on the big answers
const Flash: React.FC = () => {
	const frame = useCurrentFrame();
	const a = interpolate(frame, [0, 3, 14], [0, 0.42, 0], clamp);
	return <AbsoluteFill style={{background: 'radial-gradient(ellipse at 50% 50%, rgba(140,200,90,0.2), rgba(90,170,60,0.9))', opacity: a, mixBlendMode: 'screen'}} />;
};

const Word: React.FC<{d: Q; hide: (t: number) => boolean; onScreen: (t: number) => boolean; under: (t: number) => boolean}> = ({d, hide, onScreen, under}) => {
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
		<AbsoluteFill style={{justifyContent: 'flex-start', alignItems: 'center', top: light ? 1745 : under(t) ? 1650 : 1180}}>
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

const RingEnd: React.FC = () => {
	const frame = useCurrentFrame();
	const {fps} = useVideoConfig();
	const z = interpolate(frame, [0, END_DUR * fps], [1.02, 1.1], clamp);
	const a = interpolate(frame, [0, 6], [0, 1], clamp);
	return (
		<AbsoluteFill style={{backgroundColor: '#e9e1d4', opacity: a}}>
			<Img src={staticFile('img/street_ring_full.jpg')} style={{width: 1080, height: 1920, objectFit: 'cover', scale: z}} />
		</AbsoluteFill>
	);
};

export const Quiz: React.FC<{d: Q}> = ({d}) => {
	const {fps, durationInFrames} = useVideoConfig();
	const f = (t: number) => Math.round(t * fps);
	const screens = d.segments.filter((s) => s.overlay?.src !== undefined);
	const titled = d.segments.filter((s) => s.overlay?.title);
	const onScreen = (t: number) => screens.some((s) => t >= s.o && t < s.o + s.b - s.a);
	const hide = (t: number) => t < d.hookDur || t >= d.total || titled.some((s) => t >= s.o && t < s.o + s.b - s.a);
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
			<Word d={d} hide={hide} onScreen={onScreen} under={(t) => d.pops.some((p) => t >= p.t - 0.05 && t < p.t + 1.45)} />
			{d.pops.map((p) => (
				<Sequence key={`p${p.t}`} name={`sticker ${p.label}`} from={f(p.t - 0.05)} durationInFrames={f(1.5)}>
					<div style={{position: 'absolute', left: 0, top: 790, width: 1080, height: 1920, scale: 0.9, transformOrigin: '540px 0px'}}>
						<Pop img={p.img} label={p.label} />
					</div>
				</Sequence>
			))}
			{d.nameTag ? (
				<Sequence name="name tag" from={f(d.nameTag.t)} durationInFrames={f(3.2)}>
					<NameTag name={d.nameTag.name} sub={d.nameTag.sub} />
				</Sequence>
			) : null}
			<Sequence name="generated ring" from={f(d.total)}>
				<RingEnd />
			</Sequence>

			<Audio name="music" src={staticFile(`media/${d.music.file}`)} trimBefore={f(d.music.start)}
				volume={(fr) => interpolate(fr, [0, 12, durationInFrames - f(2), durationInFrames], [0, 0.12, 0.12, 0], clamp)} />
			{d.pops.map((p) => (
				<Hit key={`hp${p.t}`} t={p.t - 0.05} file="pop" vol={0.9} />
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
			{screens.filter((s) => s.overlay!.typing).map((s) => (
				<Hit key={`ty${s.o}`} t={s.o + 0.05} file={s.b - s.a > 3.5 ? 'typing5' : 'typing25'} vol={0.75} dur={s.b - s.a} />
			))}
			{d.coins.map((t) => (
				<Hit key={`hc${t}`} t={t} file="coin" vol={0.7} />
			))}
			<Hit t={d.total + 0.02} file="ding" vol={0.55} />
		</AbsoluteFill>
	);
};
