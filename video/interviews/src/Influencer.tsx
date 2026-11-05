// Bold Claim script in the reference's influencer style: she talks to camera; on product lines the picture cuts to
// full-screen B-roll with her cut-out in the lower corner (never covering her face). One small white word at a time,
// a bold title + yellow subtitle to open, voice-first sound with only a few soft accents.
import React from 'react';
import {AbsoluteFill, Easing, Img, interpolate, OffthreadVideo, Sequence, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import {Audio} from '@remotion/media';
import inflData from './data/infl.json';
import {SANS} from './fonts';

const YELLOW = '#ffd84a';
const clamp = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'} as const;
const springy = Easing.bezier(0.2, 1.5, 0.4, 1);
const SHADOW = '0 2px 3px rgba(0,0,0,0.6), 0 4px 18px rgba(0,0,0,0.45)';

type Seg = {clip: string; a: number; b: number; o: number};
type Word = {w: string; t: number; e: number; key: boolean};
type Broll = {t: number; e: number; media: string; fit: 'cover' | 'fit'};
export type Infl = {total: number; segments: Seg[]; words: Word[]; broll: Broll[]; title: {top: string; sub: string};
	cta: {t: number; text: string}; music?: {file: string; start: number; vol: number}};
export const INFL = inflData as unknown as Infl;
export const INFL_END = 2.8;
export const inflTotal = (d: Infl) => d.total + INFL_END;
const TITLE_DUR = 4.2;

const Hit: React.FC<{t: number; file: string; vol: number; dur?: number}> = ({t, file, vol, dur = 2.5}) => {
	const {fps} = useVideoConfig();
	return (
		<Sequence name={`sfx ${file}`} from={Math.max(0, Math.round(t * fps))} durationInFrames={Math.round(dur * fps)} layout="none">
			<Audio src={staticFile(`sfx/infl/${file}.wav`)} volume={vol} />
		</Sequence>
	);
};

const Face: React.FC<{s: Seg}> = ({s}) => {
	const frame = useCurrentFrame();
	const {fps} = useVideoConfig();
	const dur = (s.b - s.a) * fps;
	const vol = interpolate(frame, [0, 2, dur - 2, dur], [0, 1, 1, 0], clamp);
	return <OffthreadVideo src={staticFile(`media/p4/${s.clip}.mp4`)} trimBefore={Math.round(s.a * fps)} volume={vol} style={{width: 1080, height: 1920}} />;
};

const Media: React.FC<{b: Broll}> = ({b}) => {
	const frame = useCurrentFrame();
	const {fps} = useVideoConfig();
	const len = (b.e - b.t) * fps;
	const push = interpolate(frame, [0, len], [1.0, 1.07], clamp);
	const isImg = b.media.startsWith('img:');
	const src = isImg ? staticFile(`img/${b.media.slice(4)}`) : staticFile(`media/p4/${b.media}`);
	const el = (style: React.CSSProperties) =>
		isImg ? <Img src={src} style={style} /> : <OffthreadVideo src={src} muted trimBefore={Math.round(0.6 * fps)} style={style} />;
	if (b.fit === 'fit') {
		return (
			<AbsoluteFill style={{backgroundColor: '#111'}}>
				{el({width: 1080, height: 1920, objectFit: 'cover', filter: 'blur(40px) brightness(0.7)', scale: 1.2})}
				<div style={{position: 'absolute', top: 330, width: 1080, height: 608 * 1.25, overflow: 'hidden'}}>
					{el({width: 1080 * 1.25, height: 608 * 1.25, objectFit: 'cover', marginLeft: -135, scale: push})}
				</div>
			</AbsoluteFill>
		);
	}
	return <AbsoluteFill style={{backgroundColor: '#111'}}>{el({width: 1080, height: 1920, objectFit: 'cover', scale: push})}</AbsoluteFill>;
};

// her cut-out, lower right, playing in sync with the voice
const Cutout: React.FC<{clip: string; src: number}> = ({clip, src}) => {
	const {fps} = useVideoConfig();
	return (
		<AbsoluteFill>
			<OffthreadVideo src={staticFile(`media/p4/cut/${clip}.webm`)} transparent muted trimBefore={Math.round(src * fps)}
				style={{width: 1080, height: 1920, scale: 0.58, transformOrigin: '1080px 1920px', translate: '60px 0px',
					filter: 'drop-shadow(0 12px 28px rgba(0,0,0,0.35))'}} />
		</AbsoluteFill>
	);
};

const Title: React.FC<{top: string; sub: string}> = ({top, sub}) => {
	const frame = useCurrentFrame();
	const {fps} = useVideoConfig();
	const a = interpolate(frame, [0, 4, TITLE_DUR * fps - 6, TITLE_DUR * fps], [0, 1, 1, 0], clamp);
	const s = interpolate(frame, [0, 8], [0.9, 1], {...clamp, easing: springy});
	return (
		<div style={{position: 'absolute', top: 1010, width: 1080, textAlign: 'center', opacity: a, scale: s, padding: '0 90px', boxSizing: 'border-box'}}>
			<div style={{fontFamily: SANS, fontWeight: 800, fontSize: 74, lineHeight: 1.08, color: 'white', letterSpacing: '-0.01em', textShadow: SHADOW}}>{top}</div>
			<div style={{fontFamily: SANS, fontWeight: 700, fontSize: 46, color: YELLOW, marginTop: 14, textShadow: SHADOW}}>{sub}</div>
		</div>
	);
};

const Caption: React.FC<{d: Infl}> = ({d}) => {
	const frame = useCurrentFrame();
	const {fps} = useVideoConfig();
	const t = frame / fps;
	if (t < TITLE_DUR || t >= d.total) return null;
	const i = d.words.findIndex((w, k) => w.t <= t && t < Math.min(w.e + 0.2, d.words[k + 1]?.t ?? 1e9));
	if (i < 0) return null;
	const w = d.words[i];
	const s = interpolate(t - w.t, [0, 0.09], [0.85, 1], {...clamp, easing: springy});
	return (
		<div style={{position: 'absolute', top: 1300, width: 1080, textAlign: 'center'}}>
			<span style={{display: 'inline-block', scale: s, fontFamily: SANS, fontWeight: 700, fontSize: 54, color: w.key ? YELLOW : 'white', textShadow: SHADOW}}>
				{w.w.replace(/[.,!?]+$/, '')}
			</span>
		</div>
	);
};

const Cta: React.FC<{text: string}> = ({text}) => {
	const frame = useCurrentFrame();
	const s = interpolate(frame, [0, 9], [0.5, 1], {...clamp, easing: springy});
	return (
		<div style={{position: 'absolute', top: 1440, width: 1080, display: 'flex', justifyContent: 'center'}}>
			<div style={{scale: s, background: 'white', borderRadius: 999, padding: '18px 48px', fontFamily: SANS, fontWeight: 800, fontSize: 56, color: '#1d1d1d',
				boxShadow: '0 10px 30px rgba(0,0,0,0.35)'}}>
				🔗 {text}
			</div>
		</div>
	);
};

const EndCard: React.FC = () => {
	const frame = useCurrentFrame();
	const {fps} = useVideoConfig();
	const z = interpolate(frame, [0, INFL_END * fps], [1.04, 1.12], clamp);
	const a = interpolate(frame, [0, 6], [0, 1], clamp);
	const t = interpolate(frame, [6, 16], [0, 1], {...clamp, easing: springy});
	return (
		<AbsoluteFill style={{opacity: a, backgroundColor: '#000'}}>
			<Img src={staticFile('img/infl/box.jpg')} style={{width: 1080, height: 1920, objectFit: 'cover', scale: z}} />
			<AbsoluteFill style={{background: 'linear-gradient(rgba(0,0,0,0) 45%, rgba(0,0,0,0.55))'}} />
			<div style={{position: 'absolute', top: 1360, width: 1080, textAlign: 'center', scale: 0.9 + 0.1 * t, opacity: t}}>
				<div style={{fontFamily: SANS, fontWeight: 800, fontSize: 76, color: 'white', textShadow: SHADOW}}>Start your custom design</div>
				<div style={{fontFamily: SANS, fontWeight: 800, fontSize: 60, color: YELLOW, marginTop: 14, textShadow: SHADOW}}>takshila.co</div>
			</div>
		</AbsoluteFill>
	);
};

export const Influencer: React.FC<{d: Infl}> = ({d}) => {
	const {fps, durationInFrames} = useVideoConfig();
	const f = (t: number) => Math.round(t * fps);
	// pieces of each take that sit under a B-roll beat get her cut-out
	const cuts: {from: number; to: number; clip: string; src: number}[] = [];
	for (const b of d.broll) {
		for (const s of d.segments) {
			const from = Math.max(b.t, s.o);
			const to = Math.min(b.e, s.o + s.b - s.a);
			if (to - from > 0.04) cuts.push({from, to, clip: s.clip, src: s.a + (from - s.o)});
		}
	}
	const sectionStarts = d.broll.filter((b, i) => i === 0 || d.broll[i - 1].e < b.t - 0.5);
	return (
		<AbsoluteFill style={{backgroundColor: 'black'}}>
			{d.segments.map((s, i) => (
				<Sequence key={`f${i}`} name={`${s.clip} ${s.a}`} from={f(s.o)} durationInFrames={Math.max(1, f(s.o + s.b - s.a) - f(s.o))}>
					<Face s={s} />
				</Sequence>
			))}
			{d.broll.map((b, i) => (
				<Sequence key={`b${i}`} name={`broll ${b.media}`} from={f(b.t)} durationInFrames={Math.max(1, f(b.e) - f(b.t))}>
					<Media b={b} />
				</Sequence>
			))}
			{cuts.map((c, i) => (
				<Sequence key={`c${i}`} name={`cutout ${c.clip}`} from={f(c.from)} durationInFrames={Math.max(1, f(c.to) - f(c.from))}>
					<Cutout clip={c.clip} src={c.src} />
				</Sequence>
			))}
			<Sequence name="title" from={0} durationInFrames={f(TITLE_DUR)}>
				<Title top={d.title.top} sub={d.title.sub} />
			</Sequence>
			<Caption d={d} />
			<Sequence name="cta" from={f(d.cta.t)} durationInFrames={f(d.total - d.cta.t)}>
				<Cta text={d.cta.text} />
			</Sequence>
			<Sequence name="end card" from={f(d.total)}>
				<EndCard />
			</Sequence>

			{d.music ? (
				<Audio name="music" src={staticFile(`media/${d.music.file}`)} trimBefore={f(d.music.start)}
					volume={(fr) => interpolate(fr, [0, 10, f(d.total), f(d.total) + 8, durationInFrames - 20, durationInFrames],
						[0, d.music!.vol, d.music!.vol, d.music!.vol * 2.2, d.music!.vol * 2.2, 0], clamp)} />
			) : null}
			<Hit t={0.05} file="pop" vol={0.45} />
			{sectionStarts.map((b) => (
				<Hit key={`w${b.t}`} t={b.t - 0.7} file="swoosh" vol={0.28} />
			))}
			<Hit t={d.broll.find((b) => b.media.includes('box'))!.t - 0.05} file="sparkle" vol={0.3} />
			<Hit t={d.cta.t - 0.03} file="pop" vol={0.5} />
			<Hit t={d.total - 0.7} file="swoosh" vol={0.3} />
		</AbsoluteFill>
	);
};
