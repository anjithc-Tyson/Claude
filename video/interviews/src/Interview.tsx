// Takshila street-interview edit, shared by both videos (data in src/data/*.json, built by build_edl.py).
// Framing stays fixed and centred; the Design Studio recording is shown whole (never cropped).
import React from 'react';
import {AbsoluteFill, Easing, Img, interpolate, OffthreadVideo, Sequence, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import {Audio} from '@remotion/media';
import {SERIF, SANS} from './fonts';

export const SAP = '#507d2a';
const SAP_LIGHT = '#a9c98a';
const CREAM = '#f5f0e6';
const INK = '#1f241b';
const clamp = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'} as const;
const ease = Easing.bezier(0.16, 1, 0.3, 1);
const SHADOW = '0 2px 2px rgba(0,0,0,0.8), 0 0 10px rgba(0,0,0,0.6), 0 0 30px rgba(0,0,0,0.45)';

type Overlay = {src?: number; rate?: number; reveal?: boolean; title?: string; keep_video?: boolean; phone?: boolean};
type Seg = {a: number; b: number; o: number; chapter?: string; overlay?: Overlay};
type Cap = {t: number; e: number; words: string[]; key: number};
export type Data = {
	name: string;
	total: number;
	hook: string[];
	hookDur: number;
	music: {file: string; start: number; credit: string};
	segments: Seg[];
	captions: Cap[];
	pops: {t: number; img: string; label: string}[];
	end: {top: string; brand: string; sub: string};
	nameTag: {t: number; name: string; sub: string} | null;
};

export const PHONE_DUR = 2.2;
export const END_DUR = 3.2;
export const totalOf = (d: Data) => d.total + (d.segments.some((s) => s.overlay?.phone) ? PHONE_DUR : 0) + END_DUR;

const Sfx: React.FC<{d: Data; t: number; file: string; vol?: number}> = ({d, t, file, vol = 0.6}) => {
	const {fps} = useVideoConfig();
	return (
		<Sequence name={`sfx ${file}`} from={Math.max(0, Math.round(t * fps))} durationInFrames={Math.round(1.2 * fps)} layout="none">
			<Audio src={staticFile(`sfx/${d.name}/${file}.wav`)} volume={vol} />
		</Sequence>
	);
};

// ------------------------------------------------------------------ the interview: one fixed, centred frame
const Shot: React.FC<{d: Data; seg: Seg}> = ({d, seg}) => {
	const frame = useCurrentFrame();
	const {fps} = useVideoConfig();
	const dur = (seg.b - seg.a) * fps;
	const fade = interpolate(frame, [0, 2, dur - 2, dur], [0, 1, 1, 0], clamp);
	return (
		<AbsoluteFill>
			<OffthreadVideo src={staticFile(`media/${d.name === 'street' ? 'p3' : 'p1'}/interview.mp4`)} trimBefore={Math.round(seg.a * fps)} volume={fade} style={{width: 1080, height: 1920}} />
		</AbsoluteFill>
	);
};

// ------------------------------------------------------------------ Design Studio recording, shown whole on cream
const Screen: React.FC<{seg: Seg}> = ({seg}) => {
	const frame = useCurrentFrame();
	const {fps} = useVideoConfig();
	const ov = seg.overlay!;
	const enter = interpolate(frame, [0, 9], [0, 1], {...clamp, easing: ease});
	const h = 2360 * (1080 / 1640); // 1554 px: full width, nothing cropped
	return (
		<AbsoluteFill style={{background: `linear-gradient(180deg, ${CREAM} 0%, #ece5d6 100%)`, opacity: interpolate(frame, [0, 4], [0, 1], clamp)}}>
			<div style={{position: 'absolute', left: 0, top: (1920 - h) / 2 - 40, width: 1080, height: h, translate: `0px ${(1 - enter) * 90}px`, boxShadow: '0 30px 70px rgba(40,50,30,0.22)'}}>
				<OffthreadVideo src={staticFile('media/p3/screen.mp4')} muted trimBefore={Math.round(ov.src! * fps)} playbackRate={ov.rate} style={{width: 1080, height: h}} />
			</div>
			{ov.title ? <Title text={ov.title} /> : null}
		</AbsoluteFill>
	);
};

const Title: React.FC<{text: string}> = ({text}) => {
	const frame = useCurrentFrame();
	const a = interpolate(frame, [2, 14], [0, 1], {...clamp, easing: ease});
	return (
		<div style={{position: 'absolute', left: 0, right: 0, top: 1712, textAlign: 'center', opacity: a, translate: `0px ${(1 - a) * 24}px`}}>
			<div style={{fontFamily: SANS, fontWeight: 600, fontSize: 24, letterSpacing: '0.42em', color: SAP}}>HER DESIGN, NAMED</div>
			<div style={{fontFamily: SERIF, fontStyle: 'italic', fontWeight: 700, fontSize: 116, lineHeight: 1, color: INK}}>{text}</div>
		</div>
	);
};

// ------------------------------------------------------------------ hook: the opening question over the first shot
const Hook: React.FC<{d: Data}> = ({d}) => {
	const frame = useCurrentFrame();
	const {fps} = useVideoConfig();
	const l1 = interpolate(frame, [3, 15], [0, 1], {...clamp, easing: ease});
	const l2 = interpolate(frame, [12, 26], [0, 1], {...clamp, easing: ease});
	const out = interpolate(frame, [d.hookDur * fps - 6, d.hookDur * fps], [1, 0], clamp);
	const [a, b] = d.hook;
	const last = b.split(' ');
	const tail = last.slice(-2).join(' ');
	const head = last.slice(0, -2).join(' ');
	return (
		<AbsoluteFill>
			<Img src={staticFile(`img/${d.name}_hook.jpg`)} style={{width: 1080, height: 1920, filter: 'brightness(0.62) saturate(0.9)'}} />
			<AbsoluteFill style={{background: 'radial-gradient(ellipse at 50% 42%, rgba(20,24,16,0.1), rgba(20,24,16,0.55))'}} />
			<AbsoluteFill style={{justifyContent: 'center', alignItems: 'center', textAlign: 'center', opacity: out, paddingBottom: 180}}>
				<div style={{fontFamily: SANS, fontWeight: 600, fontSize: 30, letterSpacing: '0.5em', color: SAP_LIGHT, marginBottom: 26, opacity: l1}}>STREET INTERVIEW</div>
				<div style={{fontFamily: SERIF, fontWeight: 700, fontSize: 122, lineHeight: 1.02, color: CREAM, opacity: l1, translate: `0px ${(1 - l1) * 30}px`, textShadow: '0 4px 24px rgba(0,0,0,0.45)'}}>{a}</div>
				<div style={{fontFamily: SERIF, fontWeight: 700, fontSize: 122, lineHeight: 1.02, color: CREAM, opacity: l2, translate: `0px ${(1 - l2) * 30}px`, textShadow: '0 4px 24px rgba(0,0,0,0.45)'}}>
					{head} <span style={{fontStyle: 'italic', color: SAP_LIGHT}}>{tail}</span>
				</div>
			</AbsoluteFill>
		</AbsoluteFill>
	);
};

// ------------------------------------------------------------------ chapter tag (RAPID FIRE / HER DREAM PIECE / THE DESIGN)
const Chapter: React.FC<{text: string}> = ({text}) => {
	const frame = useCurrentFrame();
	const {fps} = useVideoConfig();
	const a = interpolate(frame, [0, 10, 1.9 * fps - 8, 1.9 * fps], [0, 1, 1, 0], clamp);
	const w = interpolate(frame, [0, 14], [0.6, 1], {...clamp, easing: ease});
	return (
		<div style={{position: 'absolute', left: 0, right: 0, top: 150, display: 'flex', justifyContent: 'center', opacity: a}}>
			<div style={{display: 'flex', alignItems: 'center', gap: 22, padding: '16px 36px', borderRadius: 999, background: 'rgba(31,36,27,0.55)', border: `1.5px solid ${SAP_LIGHT}`, backdropFilter: 'blur(8px)', scale: w}}>
				<div style={{width: 10, height: 10, borderRadius: 5, background: SAP_LIGHT}} />
				<div style={{fontFamily: SANS, fontWeight: 650, fontSize: 32, letterSpacing: '0.36em', color: CREAM}}>{text}</div>
			</div>
		</div>
	);
};

// ------------------------------------------------------------------ captions: bold serif phrases, one highlighted word
const Captions: React.FC<{d: Data; hide: (t: number) => boolean; onScreen: (t: number) => boolean}> = ({d, hide, onScreen}) => {
	const frame = useCurrentFrame();
	const {fps} = useVideoConfig();
	const t = frame / fps;
	if (hide(t)) return null;
	const c = d.captions.find((x) => x.t <= t && t < x.e);
	if (!c) return null;
	const age = t - c.t;
	const a = interpolate(age, [0, 0.08], [0, 1], clamp);
	const y = interpolate(age, [0, 0.16], [14, 0], {...clamp, easing: ease});
	const light = onScreen(t);
	const plain = light ? {color: INK} : {color: '#fffdf8', textShadow: SHADOW};
	const hi = light ? {fontStyle: 'italic' as const, color: SAP} : {fontStyle: 'italic' as const, color: SAP_LIGHT, textShadow: SHADOW};
	return (
		<AbsoluteFill style={{justifyContent: 'flex-start', alignItems: 'center', top: light ? 1742 : 1300}}>
			<div style={{fontFamily: SERIF, fontWeight: 700, fontSize: light ? 84 : 96, lineHeight: 1.0, letterSpacing: '-0.01em', textAlign: 'center', maxWidth: 960, opacity: a, translate: `0px ${y}px`}}>
				{c.words.map((w, i) => (
					<span
						key={i}
						style={i === c.key ? hi : plain}
					>
						{w}
						{i < c.words.length - 1 ? ' ' : ''}
					</span>
				))}
			</div>
		</AbsoluteFill>
	);
};

// ------------------------------------------------------------------ product pop-up: framed photo above their heads
const Pop: React.FC<{img: string; label: string}> = ({img, label}) => {
	const frame = useCurrentFrame();
	const {durationInFrames: dur} = useVideoConfig();
	const s = interpolate(frame, [0, 10], [0.7, 1], {...clamp, easing: Easing.bezier(0.2, 1.5, 0.4, 1)});
	const a = interpolate(frame, [0, 5, dur - 6, dur], [0, 1, 1, 0], clamp);
	const r = interpolate(frame, [0, 12], [-6, -2], {...clamp, easing: ease});
	return (
		<div style={{position: 'absolute', left: 0, right: 0, top: 250, display: 'flex', justifyContent: 'center', opacity: a}}>
			<div style={{background: CREAM, padding: '16px 16px 0', borderRadius: 18, scale: s, rotate: `${r}deg`, boxShadow: '0 26px 50px rgba(0,0,0,0.35)'}}>
				<Img src={staticFile(`img/${img}`)} style={{width: 430, height: 430, objectFit: 'cover', borderRadius: 10, display: 'block'}} />
				<div style={{fontFamily: SERIF, fontStyle: 'italic', fontWeight: 600, fontSize: 52, color: INK, textAlign: 'center', padding: '8px 0 14px'}}>{label}</div>
			</div>
		</div>
	);
};

const NameTag: React.FC<{name: string; sub: string}> = ({name, sub}) => {
	const frame = useCurrentFrame();
	const {fps, durationInFrames} = useVideoConfig();
	const a = interpolate(frame, [0, 10, durationInFrames - 10, durationInFrames], [0, 1, 1, 0], clamp);
	const line = interpolate(frame, [0, 0.6 * fps], [0, 1], {...clamp, easing: ease});
	return (
		<div style={{position: 'absolute', left: 80, top: 1530, opacity: a}}>
			<div style={{height: 3, width: 280 * line, background: SAP_LIGHT, marginBottom: 14}} />
			<div style={{fontFamily: SERIF, fontStyle: 'italic', fontWeight: 700, fontSize: 96, lineHeight: 1, color: '#fffdf8', textShadow: '0 3px 4px rgba(0,0,0,0.5), 0 0 20px rgba(0,0,0,0.4)'}}>{name}</div>
			<div style={{fontFamily: SANS, fontWeight: 600, fontSize: 32, letterSpacing: '0.26em', color: '#f6f2e8', marginTop: 12, textShadow: '0 1px 3px rgba(0,0,0,0.6), 0 0 12px rgba(0,0,0,0.45)'}}>{sub}</div>
		</div>
	);
};

// ------------------------------------------------------------------ jewel: hold on the phone showing the result
const PhoneReveal: React.FC<{d: Data}> = () => {
	const frame = useCurrentFrame();
	const {fps} = useVideoConfig();
	const z = interpolate(frame, [0, PHONE_DUR * fps], [1, 1.06], clamp);
	const t = interpolate(frame, [6, 18], [0, 1], {...clamp, easing: ease});
	return (
		<AbsoluteFill style={{overflow: 'hidden', backgroundColor: '#111'}}>
			{/* the phone already fills the shot here: play into it, then hold */}
			<Sequence durationInFrames={Math.round(0.7 * fps)} layout="none">
				<OffthreadVideo src={staticFile('media/p1/interview.mp4')} muted trimBefore={Math.round(223.5 * fps)} style={{width: 1080, height: 1920, scale: z}} />
			</Sequence>
			<Sequence from={Math.round(0.7 * fps)} layout="none">
				<Img src={staticFile('img/jewel_phone.jpg')} style={{width: 1080, height: 1920, scale: z}} />
			</Sequence>
			<AbsoluteFill style={{background: 'linear-gradient(180deg, transparent 62%, rgba(20,24,16,0.65) 100%)'}} />
			<div style={{position: 'absolute', left: 0, right: 0, top: 1600, textAlign: 'center', opacity: t, translate: `0px ${(1 - t) * 20}px`}}>
				<div style={{fontFamily: SANS, fontWeight: 600, fontSize: 30, letterSpacing: '0.42em', color: SAP_LIGHT}}>THEIR DESIGN</div>
				<div style={{fontFamily: SERIF, fontStyle: 'italic', fontWeight: 700, fontSize: 110, color: '#fffdf8', textShadow: SHADOW}}>Cross necklace</div>
			</div>
		</AbsoluteFill>
	);
};

const EndCard: React.FC<{d: Data}> = ({d}) => {
	const frame = useCurrentFrame();
	const {fps} = useVideoConfig();
	const a = interpolate(frame, [0, 10], [0, 1], clamp);
	const b = interpolate(frame, [8, 22], [0, 1], {...clamp, easing: ease});
	const c = interpolate(frame, [18, 32], [0, 1], {...clamp, easing: ease});
	const z = interpolate(frame, [0, END_DUR * fps], [1, 1.05], clamp);
	return (
		<AbsoluteFill style={{background: `radial-gradient(ellipse at 50% 38%, #fbf8f1 0%, ${CREAM} 60%, #e6dfcf 100%)`, opacity: a}}>
			<div style={{position: 'absolute', inset: 46, border: `2px solid ${SAP}`, opacity: 0.5}} />
			<div style={{position: 'absolute', left: 290, top: 300, width: 500, height: 640, borderRadius: '250px 250px 0 0', overflow: 'hidden', boxShadow: '0 30px 60px rgba(40,50,30,0.25)'}}>
				{d.name === 'street' ? (
					<Img src={staticFile('img/street_result.jpg')} style={{width: '100%', height: '100%', objectFit: 'cover', scale: z}} />
				) : (
					<Img src={staticFile('img/jewel_result.jpg')} style={{width: '100%', height: '100%', objectFit: 'cover', scale: z}} />
				)}
			</div>
			<AbsoluteFill style={{alignItems: 'center', top: 1030, textAlign: 'center'}}>
				<div style={{fontFamily: SANS, fontWeight: 600, fontSize: 30, letterSpacing: '0.44em', color: SAP, opacity: b}}>{d.end.top}</div>
				<div style={{fontFamily: SERIF, fontWeight: 700, fontSize: 176, color: SAP, lineHeight: 1.02, opacity: b, translate: `0px ${(1 - b) * 22}px`}}>{d.end.brand}</div>
				<div style={{fontFamily: SERIF, fontStyle: 'italic', fontWeight: 600, fontSize: 56, color: '#6b5b45', marginTop: 8, opacity: c}}>{d.end.sub}</div>
			</AbsoluteFill>
		</AbsoluteFill>
	);
};

// ------------------------------------------------------------------ composition
export const Interview: React.FC<{d: Data}> = ({d}) => {
	const {fps, durationInFrames} = useVideoConfig();
	const f = (t: number) => Math.round(t * fps);
	const hasPhone = d.segments.some((s) => s.overlay?.phone);
	const endAt = d.total + (hasPhone ? PHONE_DUR : 0);
	const screens = d.segments.filter((s) => s.overlay?.src !== undefined);
	const titled = d.segments.filter((s) => s.overlay?.title);
	// a pop-up ends before the next chapter tag (they share the top of the frame)
	const popDur = (t: number) => {
		const next = d.segments.filter((s) => s.chapter && s.o > t).map((s) => s.o)[0] ?? 1e9;
		return f(Math.max(0.9, Math.min(1.8, next - t - 0.1)));
	};
	const hide = (t: number) => t < d.hookDur || t >= d.total || titled.some((s) => t >= s.o && t < s.o + s.b - s.a);
	return (
		<AbsoluteFill style={{backgroundColor: 'black'}}>
			{d.segments.map((s, i) => (
				<Sequence key={`s${i}`} name={`shot ${s.a}-${s.b}`} from={f(s.o)} durationInFrames={f(s.b - s.a)}>
					<Shot d={d} seg={s} />
				</Sequence>
			))}
			{screens.map((s) => (
				<Sequence key={`sc${s.o}`} name="Design Studio" from={f(s.o)} durationInFrames={f(s.b - s.a)}>
					<Screen seg={s} />
				</Sequence>
			))}
			{titled.filter((s) => s.overlay!.src === undefined).map((s) => (
				<Sequence key={`ti${s.o}`} name="title" from={f(s.o)} durationInFrames={f(s.b - s.a)}>
					<AbsoluteFill style={{background: 'linear-gradient(180deg, transparent 55%, rgba(245,240,230,0.92) 80%)'}} />
					<Title text={s.overlay!.title!} />
				</Sequence>
			))}
			<Captions d={d} hide={hide} onScreen={(t) => screens.some((s) => t >= s.o && t < s.o + s.b - s.a)} />
			{d.segments.filter((s) => s.chapter).map((s) => (
				<Sequence key={`c${s.o}`} name={`chapter ${s.chapter}`} from={f(s.o)} durationInFrames={f(1.9)}>
					<Chapter text={s.chapter!} />
				</Sequence>
			))}
			{d.pops.map((p) => (
				<Sequence key={`p${p.t}`} name={`pop ${p.label}`} from={f(p.t - 0.05)} durationInFrames={popDur(p.t)}>
					<Pop img={p.img} label={p.label} />
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
			{hasPhone ? (
				<Sequence name="phone reveal" from={f(d.total)} durationInFrames={f(PHONE_DUR)}>
					<PhoneReveal d={d} />
				</Sequence>
			) : null}
			<Sequence name="end card" from={f(endAt)}>
				<EndCard d={d} />
			</Sequence>

			{/* sound: one music bed + a few measured effects */}
			<Audio
				name="music"
				src={staticFile(`media/${d.music.file}`)}
				trimBefore={f(d.music.start)}
				volume={(fr) => interpolate(fr, [0, f(0.6), f(d.hookDur), f(d.hookDur) + 12, durationInFrames - f(2), durationInFrames], [0, 0.32, 0.32, 0.13, 0.13, 0], clamp)}
			/>
			<Sfx d={d} t={0.1} file="hook" vol={0.4} />
			{d.segments.filter((s) => s.chapter).map((s) => (
				<Sfx key={`ct${s.o}`} d={d} t={s.o} file="tag" vol={0.55} />
			))}
			{d.pops.map((p) => (
				<Sfx key={`ps${p.t}`} d={d} t={p.t - 0.05} file="pop" vol={0.4} />
			))}
			{screens.filter((s, i) => i === 0 || s.overlay!.reveal).map((s) => (
				<Sfx key={`sw${s.o}`} d={d} t={s.o - 0.05} file={s.overlay!.reveal ? 'sparkle' : 'swish'} vol={s.overlay!.reveal ? 0.36 : 0.32} />
			))}
			{titled.map((s) => (
				<Sfx key={`tt${s.o}`} d={d} t={s.o + 0.1} file="sparkle" vol={0.36} />
			))}
			{hasPhone ? <Sfx d={d} t={d.total + 0.02} file="sparkle" vol={0.36} /> : null}
			<Sfx d={d} t={endAt + 0.02} file="end" vol={0.4} />
		</AbsoluteFill>
	);
};
