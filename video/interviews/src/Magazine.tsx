// Script 4 as an editorial magazine: "Takshila · The Detail Issue · No. 04". Each beat of the script is a page; pages
// turn with a 3D page flip. Her (already cut) take plays once as audio and appears in a photo frame on every page.
// Safe zones: nothing below y 1660 (Instagram caption row), no text right of x 870 between y 720 and 1650 (buttons).
import React from 'react';
import {AbsoluteFill, Easing, Img, interpolate, OffthreadVideo, Sequence, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import {Audio} from '@remotion/media';
import magData from './data/magazine.json';
import {AFACAD, CORMORANT_G} from './fonts';

const C = {paper: '#F3ECE1', ink: '#2B1016', mauve: '#6D3B54', taupe: '#7A5D63', rule: '#D9CBBA', gold: '#B8913F'};
const clamp = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'} as const;
const ease = Easing.bezier(0.16, 1, 0.3, 1);
const fade = (t: number, at: number, len = 0.35) => interpolate(t, [at, at + len], [0, 1], {...clamp, easing: ease});
const rise = (t: number, at: number) => ({opacity: fade(t, at), translate: `0 ${(1 - fade(t, at)) * 26}px`});

type Word = {w: string; t: number; e: number; key: boolean};
type Ev = {t: number; ev: string; n?: number; label?: string; img?: string};
export type MagData = {total: number; words: Word[]; events: Ev[]; pages: number[]; images?: Record<string, string>; placeholders?: boolean;
	music?: {file: string; start: number; vol: number}};
export const MAG = magData as unknown as MagData;
export const MAG_END = 3.6;
export const magTotal = (d: MagData) => d.total + MAG_END;
const FLIP = 0.6;

const PLACEHOLDER: Record<string, string> = {D1: 'studio2/P11.jpg', D2: 'studio2/P05.jpg', D3: 'journey/J11c.jpg'};
const imgOf = (d: MagData, k: string) => staticFile(`img/${d.placeholders === false ? d.images?.[k] : PLACEHOLDER[k]}`);

// paper with a faint grain
const Paper: React.FC<{children: React.ReactNode}> = ({children}) => (
	<AbsoluteFill style={{background: C.paper}}>
		<svg width="1080" height="1920" style={{position: 'absolute', inset: 0, opacity: 0.09}}>
			<filter id="grain"><feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="2" stitchTiles="stitch" /><feColorMatrix type="saturate" values="0" /></filter>
			<rect width="1080" height="1920" filter="url(#grain)" />
		</svg>
		{children}
	</AbsoluteFill>
);

const Header: React.FC<{page: number}> = ({page}) => (
	<>
		<div style={{position: 'absolute', left: 60, right: 60, top: 252, display: 'flex', justifyContent: 'space-between', alignItems: 'center',
			fontFamily: AFACAD, fontSize: 22, letterSpacing: '0.22em', color: C.taupe}}>
			<span>TAKSHILA</span><span>THE DETAIL ISSUE · NO. 04</span>
		</div>
		<div style={{position: 'absolute', left: 60, right: 60, top: 290, height: 1.5, background: C.rule}} />
		<div style={{position: 'absolute', left: 60, top: 1630, fontFamily: AFACAD, fontSize: 22, letterSpacing: '0.2em', color: C.taupe}}>{String(page).padStart(2, '0')}</div>
	</>
);

// her video in a photo frame; the face sits a little above the frame's centre
const Her: React.FC<{from: number; x: number; y: number; w: number; h: number; faceW?: number}> = ({from, x, y, w, h, faceW = 0.55}) => {
	const {fps} = useVideoConfig();
	const s = Math.max(w / 1080, h / 1920, (w * faceW) / 424);
	const left = Math.min(0, Math.max(w - 1080 * s, w / 2 - 536 * s));
	const top = Math.min(0, Math.max(h - 1920 * s, h * 0.42 - 700 * s));
	return (
		<div style={{position: 'absolute', left: x, top: y, width: w, height: h, overflow: 'hidden', boxShadow: '0 18px 40px rgba(43,16,22,0.18)'}}>
			<OffthreadVideo src={staticFile('media/p7/edit.mp4')} muted trimBefore={Math.round(from * fps)}
				style={{position: 'absolute', left, top, width: 1080 * s, height: 1920 * s}} />
		</div>
	);
};

// running caption at the foot of each page, three or four words at a time
const Caption: React.FC<{d: MagData; from: number; light?: boolean}> = ({d, from, light}) => {
	const frame = useCurrentFrame();
	const {fps} = useVideoConfig();
	const t = frame / fps + from; // pages count time from their own start
	const groups = React.useMemo(() => {
		const out: Word[][] = [];
		let cur: Word[] = [];
		for (const w of d.words) {
			cur.push(w);
			if (cur.length === 4 || /[.,!?]$/.test(w.w)) {
				out.push(cur);
				cur = [];
			}
		}
		if (cur.length) out.push(cur);
		return out;
	}, [d.words]);
	if (t >= d.total) return null;
	const g = groups.find((x, k) => x[0].t <= t && t < Math.min(x[x.length - 1].e + 0.35, groups[k + 1]?.[0].t ?? 1e9));
	if (!g) return null;
	return (
		<div style={{position: 'absolute', left: 60, width: 800, top: 1536, fontFamily: CORMORANT_G, fontStyle: 'italic', fontSize: 50, lineHeight: 1.1,
			color: light ? 'white' : C.ink, textShadow: light ? '0 2px 12px rgba(0,0,0,0.5)' : 'none'}}>
			{g.filter((w) => w.t <= t).map((w) => w.w).join(' ')}
		</div>
	);
};

// ---------------- pages ----------------
const Cover: React.FC<{d: MagData}> = ({d}) => {
	const t = useCurrentFrame() / useVideoConfig().fps;
	return (
		<Paper>
			<Her from={0} x={60} y={420} w={960} h={1080} faceW={0.5} />
			<Img src={staticFile('img/studio/logo.png')} style={{position: 'absolute', top: 250, left: 540 - 225, height: 150, ...rise(t, 0.05)}} />
			<div style={{position: 'absolute', left: 60, right: 60, top: 1180, ...rise(t, 1.0)}}>
				<div style={{fontFamily: AFACAD, fontSize: 24, letterSpacing: '0.24em', color: 'white', textShadow: '0 2px 10px rgba(0,0,0,0.5)'}}>NO. 04 · THE DETAIL ISSUE</div>
				<div style={{fontFamily: CORMORANT_G, fontSize: 104, lineHeight: 0.98, color: 'white', marginTop: 10, maxWidth: 800, textShadow: '0 4px 24px rgba(0,0,0,0.45)'}}>
					The detail that makes it <i>personal</i>
				</div>
			</div>
			<div style={{position: 'absolute', left: 60, top: 1520, width: 800, fontFamily: AFACAD, fontSize: 24, letterSpacing: '0.18em', color: C.taupe}}>
				INSIDE: WHY CUSTOM IS DIFFERENT · A HIDDEN DETAIL · A QUESTION FOR YOU
			</div>
		</Paper>
	);
};

const Template: React.FC<{d: MagData; from: number}> = ({d, from}) => {
	const t = useCurrentFrame() / useVideoConfig().fps + from;
	const pins = d.events.filter((e) => e.ev === 'pin');
	return (
		<Paper>
			<Header page={2} />
			<div style={{position: 'absolute', left: 60, right: 60, top: 330, fontFamily: CORMORANT_G, fontSize: 98, lineHeight: 0.98, color: C.ink, ...rise(t, from + 0.4)}}>
				We don't begin with a <i style={{color: C.mauve}}>template.</i>
			</div>
			<Her from={from} x={60} y={600} w={500} h={880} />
			<div style={{position: 'absolute', left: 600, width: 270, top: 640}}>
				<div style={{fontFamily: AFACAD, fontSize: 22, letterSpacing: '0.2em', color: C.taupe, ...rise(t, from + 1.2)}}>WE BEGIN WITH</div>
				{['The person', 'The moment', 'What they carry'].map((l, i) => (
					<div key={l} style={{marginTop: 34, borderTop: `1.5px solid ${C.rule}`, paddingTop: 16, ...rise(t, pins[i]?.t ?? 1e9)}}>
						<div style={{fontFamily: CORMORANT_G, fontStyle: 'italic', fontSize: 64, color: C.gold, lineHeight: 1}}>0{i + 1}</div>
						<div style={{fontFamily: CORMORANT_G, fontSize: 46, color: C.ink, lineHeight: 1.05, marginTop: 6}}>{l}</div>
					</div>
				))}
			</div>
			<Caption d={d} from={from} />
		</Paper>
	);
};

const Design: React.FC<{d: MagData; from: number}> = ({d, from}) => {
	const t = useCurrentFrame() / useVideoConfig().fps + from;
	const specs = d.events.filter((e) => e.ev === 'spec');
	const rows = [['Metal', '18k yellow gold'], ['Proportions', 'Slim, gently tapered'], ['The feel', 'Balanced · wearable · theirs']];
	return (
		<Paper>
			<Header page={3} />
			<div style={{position: 'absolute', left: 60, top: 320, width: 960, height: 560, overflow: 'hidden', ...rise(t, from + 0.2)}}>
				<Img src={imgOf(d, 'D1')} style={{width: '100%', height: '100%', objectFit: 'cover', scale: interpolate(t, [from, from + 11], [1.05, 1.0], clamp)}} />
			</div>
			<div style={{position: 'absolute', left: 60, top: 896, fontFamily: AFACAD, fontSize: 21, letterSpacing: '0.16em', color: C.taupe, ...rise(t, from + 0.6)}}>SHAPED AROUND A STORY — THE FINISHED PIECE</div>
			<Her from={from} x={60} y={960} w={380} h={540} faceW={0.6} />
			<div style={{position: 'absolute', left: 480, width: 390, top: 960}}>
				<div style={{fontFamily: CORMORANT_G, fontSize: 60, lineHeight: 1, color: C.ink, ...rise(t, from + 0.8)}}>The <i style={{color: C.mauve}}>design</i></div>
				{rows.map(([k, v], i) => (
					<div key={k} style={{marginTop: 26, borderTop: `1.5px solid ${C.rule}`, paddingTop: 12, ...rise(t, specs[i]?.t ?? 1e9)}}>
						<div style={{fontFamily: AFACAD, fontSize: 21, letterSpacing: '0.18em', color: C.taupe}}>{k.toUpperCase()}</div>
						<div style={{fontFamily: CORMORANT_G, fontSize: 40, color: C.ink, marginTop: 2}}>{v}</div>
					</div>
				))}
			</div>
			<Caption d={d} from={from} />
		</Paper>
	);
};

const Quote: React.FC<{d: MagData; from: number}> = ({d, from}) => {
	const t = useCurrentFrame() / useVideoConfig().fps + from;
	const word = (k: string) => d.words.find((w) => w.t >= from && w.w.startsWith(k))?.t ?? 1e9;
	const unlock = d.events.find((e) => e.ev === 'unlock')!.t;
	const holdT = word('hold') - 0.6;
	return (
		<Paper>
			<Header page={4} />
			<Her from={from} x={60} y={320} w={960} h={640} faceW={0.42} />
			<div style={{position: 'absolute', left: 60, width: t >= unlock ? 470 : 800, top: 1010}}>
				{t < holdT ? (
					<div style={{fontFamily: CORMORANT_G, fontSize: 76, lineHeight: 1.02, color: C.ink, ...rise(t, from + 0.3)}}>
						Not just made to <i style={{color: C.mauve}}>look beautiful.</i>
					</div>
				) : (
					<div style={{fontFamily: CORMORANT_G, fontSize: t >= unlock ? 62 : 76, lineHeight: 1.02, color: C.ink, ...rise(t, holdT)}}>
						<span style={{fontSize: 140, lineHeight: 0, color: C.gold, verticalAlign: '-0.35em'}}>“</span>Made to hold something that <i style={{color: C.mauve}}>really means everything.</i>”
					</div>
				)}
			</div>
			{t >= unlock ? (
				<div style={{position: 'absolute', left: 560, top: 1020, width: 310, background: 'white', padding: '14px 14px 18px', boxShadow: '0 16px 36px rgba(43,16,22,0.22)',
					rotate: `${interpolate(t, [unlock, unlock + 0.5], [8, 2.5], {...clamp, easing: ease})}deg`, opacity: fade(t, unlock, 0.3),
					scale: interpolate(t, [unlock, unlock + 0.5], [0.8, 1], {...clamp, easing: ease})}}>
					<div style={{width: 282, height: 282, overflow: 'hidden'}}>
						<Img src={imgOf(d, 'D2')} style={{width: '100%', height: '100%', objectFit: 'cover'}} />
					</div>
					<div style={{fontFamily: CORMORANT_G, fontStyle: 'italic', fontSize: 30, color: C.ink, marginTop: 10}}>Hidden initials, inner band</div>
				</div>
			) : null}
			<Caption d={d} from={from} />
		</Paper>
	);
};

const Letters: React.FC<{d: MagData; from: number}> = ({d, from}) => {
	const t = useCurrentFrame() / useVideoConfig().fps + from;
	const ask = d.words.find((w) => w.t >= from && w.w === 'What')?.t ?? from + 2;
	return (
		<Paper>
			<Header page={5} />
			<div style={{position: 'absolute', left: 60, top: 326, fontFamily: AFACAD, fontSize: 22, letterSpacing: '0.22em', color: C.mauve, ...rise(t, from + 0.2)}}>LETTERS · TAKSHILA.CO HAS A QUESTION</div>
			<div style={{position: 'absolute', left: 60, right: 60, top: 370, fontFamily: CORMORANT_G, fontSize: 92, lineHeight: 0.98, color: C.ink, ...rise(t, ask - 0.2)}}>
				What detail would you build your perfect piece <i style={{color: C.mauve}}>around?</i>
			</div>
			<Her from={from} x={60} y={760} w={500} h={740} />
			<div style={{position: 'absolute', left: 600, width: 270, top: 800, ...rise(t, ask + 1.2)}}>
				<div style={{fontFamily: CORMORANT_G, fontStyle: 'italic', fontSize: 50, color: C.ink, lineHeight: 1.05}}>Write to us in the comments</div>
				<div style={{fontFamily: AFACAD, fontSize: 64, color: C.gold, marginTop: 10}}>↓</div>
				<div style={{marginTop: 30, borderTop: `1.5px solid ${C.rule}`, paddingTop: 16, fontFamily: AFACAD, fontSize: 30, color: C.mauve}}>takshila.co</div>
			</div>
			<Caption d={d} from={from} />
		</Paper>
	);
};

const BackCover: React.FC<{d: MagData}> = ({d}) => {
	const frame = useCurrentFrame();
	const {fps} = useVideoConfig();
	const t = frame / fps;
	const z = interpolate(frame, [0, MAG_END * fps], [1.03, 1.1], clamp);
	return (
		<AbsoluteFill style={{background: C.ink}}>
			<Img src={imgOf(d, 'D3')} style={{width: 1080, height: 1920, objectFit: 'cover', scale: z, opacity: 0.92}} />
			<AbsoluteFill style={{background: 'linear-gradient(rgba(43,16,22,0.8) 0%, rgba(43,16,22,0.45) 32%, rgba(43,16,22,0) 50%, rgba(43,16,22,0.1) 70%, rgba(43,16,22,0.7) 88%)'}} />
			<Img src={staticFile('img/studio/logo.png')} style={{position: 'absolute', top: 260, left: 540 - 195, height: 130, filter: 'brightness(0) invert(1)', ...rise(t, 0.1)}} />
			<div style={{position: 'absolute', top: 410, width: 1080, textAlign: 'center', fontFamily: AFACAD, fontSize: 24, letterSpacing: '0.24em', color: 'rgba(255,255,255,0.85)', ...rise(t, 0.3)}}>THE DETAIL ISSUE · NO. 04</div>
			<div style={{position: 'absolute', top: 480, width: 1080, textAlign: 'center', ...rise(t, 0.5)}}>
				<span style={{fontFamily: CORMORANT_G, fontSize: 92, color: 'white'}}>Your story, </span>
				<span style={{fontFamily: CORMORANT_G, fontStyle: 'italic', fontSize: 96, color: '#F3DC9A'}}>your detail</span>
			</div>
			<div style={{position: 'absolute', top: 1500, width: 1080, display: 'flex', justifyContent: 'center', ...rise(t, 0.9)}}>
				<div style={{background: 'white', color: C.ink, borderRadius: 40, padding: '20px 56px', fontFamily: AFACAD, fontSize: 36}}>takshila.co</div>
			</div>
		</AbsoluteFill>
	);
};

// a page turns over its left edge (like a magazine page) to show the next one underneath
const Turn: React.FC<{start: number; end: number; children: React.ReactNode; last?: boolean}> = ({start, end, children, last}) => {
	const frame = useCurrentFrame();
	const {fps} = useVideoConfig();
	const t = frame / fps + start;
	const p = last ? 0 : interpolate(t, [end, end + FLIP], [0, 1], {...clamp, easing: Easing.inOut(Easing.cubic)});
	return (
		<AbsoluteFill style={{perspective: 2400}}>
			<AbsoluteFill style={{transformOrigin: '0px 960px', rotate: `y ${-100 * p}deg`, opacity: p > 0.97 ? 0 : 1, boxShadow: p > 0 ? `${30 * p}px 0 60px rgba(0,0,0,${0.35 * p})` : 'none'}}>
				{children}
				<AbsoluteFill style={{background: `linear-gradient(90deg, rgba(0,0,0,0) 40%, rgba(0,0,0,${0.35 * p}))`}} />
			</AbsoluteFill>
		</AbsoluteFill>
	);
};

const Sfx: React.FC<{d: MagData}> = ({d}) => {
	const {fps} = useVideoConfig();
	const ev = d.events;
	const hits: {t: number; f: string; v: number; len?: number}[] = [];
	d.pages.slice(1).forEach((p) => hits.push({t: p - 0.1, f: 'whoosh', v: 0.32}));
	ev.filter((e) => e.ev === 'pin').forEach((e) => hits.push({t: e.t, f: 'tick', v: 0.4}));
	ev.filter((e) => e.ev === 'spec').forEach((e) => hits.push({t: e.t, f: 'pop', v: 0.25}));
	const u = ev.find((e) => e.ev === 'unlock')!.t;
	hits.push({t: u - 1.5, f: 'riser', v: 0.2, len: 1.65}, {t: u, f: 'glock', v: 0.36});
	hits.push({t: d.total - 0.15, f: 'whoosh', v: 0.32}, {t: d.total + 0.9, f: 'click', v: 0.45});
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

export const MagazineReel: React.FC<{d: MagData}> = ({d}) => {
	const {fps, durationInFrames} = useVideoConfig();
	const f = (t: number) => Math.round(t * fps);
	const P = [...d.pages, d.total];
	const pages = [
		(from: number) => <Cover d={d} />,
		(from: number) => <Template d={d} from={from} />,
		(from: number) => <Design d={d} from={from} />,
		(from: number) => <Quote d={d} from={from} />,
		(from: number) => <Letters d={d} from={from} />,
	];
	const T = Math.min(f(d.total), durationInFrames - 30);
	return (
		<AbsoluteFill style={{backgroundColor: C.paper}}>
			<Sequence name="back cover" from={f(d.total)}>
				<BackCover d={d} />
			</Sequence>
			{/* later pages first, so each page lies on top of the next one and turns away to reveal it */}
			{pages.map((render, i) => ({render, i})).reverse().map(({render, i}) => (
				<Sequence key={`p${i}`} name={`page ${i + 1}`} from={f(P[i])} durationInFrames={f(P[i + 1] + FLIP) - f(P[i])}>
					<Turn start={P[i]} end={P[i + 1]}>{render(P[i])}</Turn>
				</Sequence>
			))}
			<Audio name="voice" src={staticFile('media/p7/edit.mp4')} />
			<Sfx d={d} />
			{d.music ? (
				<Audio name="music" src={staticFile(`media/${d.music.file}`)} trimBefore={f(d.music.start)}
					volume={(fr) => interpolate(fr, [0, 10, T, T + 8, Math.max(T + 9, durationInFrames - 20), Math.max(T + 10, durationInFrames)],
						[0, d.music!.vol, d.music!.vol, d.music!.vol * 2.2, d.music!.vol * 2.2, 0], clamp)} />
			) : null}
		</AbsoluteFill>
	);
};
