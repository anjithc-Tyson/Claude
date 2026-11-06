// Script 2 as a live takshila.co Design Studio walkthrough: she talks in the top half; the bottom half is the studio
// (Describe → Direct → Refine → Finalize), restyled from takshila.framer.website/design-studio, reacting to her words.
import React from 'react';
import {AbsoluteFill, Easing, Img, interpolate, OffthreadVideo, Sequence, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import {Audio} from '@remotion/media';
import studioData from './data/studio.json';
import studioFaces from './data/studio_faces.json';
import {AFACAD, CORMORANT_G, INSTRUMENT} from './fonts';

// palette taken from the live site
const C = {bg: '#F5EFE7', card: '#FBF8F3', plum: '#2B1016', mauve: '#6D3B54', taupe: '#7A5D63', btn: '#6B5157', line: '#E7DCCF', gold: '#C9A14A', chip: '#F1E8DD'};
const clamp = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'} as const;
const ease = Easing.bezier(0.16, 1, 0.3, 1);
const springy = Easing.bezier(0.2, 1.5, 0.4, 1);
const PANEL_TOP = 960;

type Seg = {clip: string; a: number; b: number; o: number; rate: number};
type Word = {w: string; t: number; e: number; key: boolean};
type Ev = {t: number; ev: string; chip?: string; text?: string; img?: string; metal?: string; stone?: string; detail?: string; imgs?: string[]; pick?: number; sketch?: string};
export type StudioData = {total: number; segments: Seg[]; words: Word[]; events: Ev[]; hookEnd: number; cta: {t: number; text: string};
	music?: {file: string; start: number; vol: number}; clicks?: string[]; images?: Record<string, string>};
export const STUDIO = studioData as unknown as StudioData;
export const STUDIO_END = 3.0;
export const studioTotal = (d: StudioData) => d.total + STUDIO_END;
const segLen = (s: Seg) => (s.b - s.a) / s.rate;
// same face size and position in every take: face centred at (540, 430), about 330 px wide, frame always filled
const frameOf = (clip: string): React.CSSProperties => {
	const [fx, fy, fw] = (studioFaces as Record<string, number[]>)[clip] ?? [540, 800, 300];
	const z = Math.min(1.35, Math.max(1.12, 330 / fw));
	const left = Math.min(0, Math.max(1080 - 1080 * z, 540 - fx * z));
	const top = Math.min(0, Math.max(PANEL_TOP + 40 - 1920 * z, 430 - fy * z));
	return {scale: z, left, top};
};

// until her generated images arrive, the preview uses the script-1 stills
const PLACEHOLDER: Record<string, string> = {P02: 'infl2/12.jpg', P03: 'infl2/07.jpg', P04: 'infl2/09.jpg', P05: 'infl2/14.jpg', P06: 'infl2/01.jpg',
	P07: 'infl2/03.jpg', P08: 'infl2/04.jpg', P09: 'infl2/15.jpg', P10: 'infl2/13.jpg', P11: 'infl2/15.jpg', P12: 'infl2/05.jpg'};
const imgOf = (d: StudioData, k?: string) => (k ? staticFile(`img/${d.images?.[k] ?? PLACEHOLDER[k]}`) : '');

const Face: React.FC<{s: Seg}> = ({s}) => {
	const frame = useCurrentFrame();
	const {fps} = useVideoConfig();
	const dur = segLen(s) * fps;
	const vol = interpolate(frame, [0, 2, dur - 2, dur], [0, 1, 1, 0], clamp);
	return (
		<OffthreadVideo src={staticFile(`media/p5/${s.clip}.mp4`)} trimBefore={Math.round(s.a * fps)} playbackRate={s.rate} volume={vol}
			style={{position: 'absolute', width: 1080, height: 1920, transformOrigin: '0 0', ...frameOf(s.clip)}} />
	);
};

const Caption: React.FC<{d: StudioData}> = ({d}) => {
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
		<div style={{position: 'absolute', top: 790, width: 1080, textAlign: 'center'}}>
			<span style={{fontFamily: INSTRUMENT, fontSize: 76, color: 'white', textTransform: 'lowercase',
				textShadow: '0 1px 2px rgba(0,0,0,0.6), 0 0 10px rgba(0,0,0,0.45), 0 4px 24px rgba(0,0,0,0.5), 0 0 42px rgba(0,0,0,0.3)'}}>
				{text.replace(/takshila\.co/i, 'takshila.co')}
			</span>
		</div>
	);
};

// ---------- studio pieces ----------
const fade = (t: number, at: number, len = 0.25) => interpolate(t, [at, at + len], [0, 1], {...clamp, easing: ease});

const Tap: React.FC<{t: number; at: number; x: number; y: number}> = ({t, at, x, y}) => {
	const p = interpolate(t, [at, at + 0.45], [0, 1], clamp);
	if (p <= 0 || p >= 1) return null;
	return <div style={{position: 'absolute', left: x - 40, top: y - 40, width: 80, height: 80, borderRadius: 40, background: 'rgba(43,16,22,0.18)',
		scale: 0.4 + p, opacity: 1 - p, pointerEvents: 'none'}} />;
};

const Chip: React.FC<{label: string; on: number; t: number; at?: number}> = ({label, on, t, at}) => {
	const pop = at !== undefined ? interpolate(t, [at, at + 0.2], [0.85, 1], {...clamp, easing: springy}) : 1;
	return (
		<div style={{display: 'inline-flex', alignItems: 'center', height: 58, padding: '0 26px', marginRight: 12, marginBottom: 12, borderRadius: 29,
			fontFamily: AFACAD, fontSize: 27, color: on > 0.5 ? 'white' : C.plum, background: on > 0.5 ? C.mauve : C.card,
			border: `1.5px solid ${on > 0.5 ? C.mauve : C.line}`, scale: pop, transition: 'none'}}>
			{label}
		</div>
	);
};

const Stepper: React.FC<{step: number}> = ({step}) => {
	const steps = ['Describe', 'Direct', 'Refine', 'Finalize'];
	return (
		<div style={{display: 'flex', alignItems: 'center', gap: 10}}>
			{steps.map((s, i) => (
				<React.Fragment key={s}>
					<div style={{display: 'flex', alignItems: 'center', gap: 8, opacity: i <= step ? 1 : 0.45}}>
						<div style={{width: 30, height: 30, borderRadius: 15, background: i === step ? C.plum : 'transparent', border: `1.5px solid ${i === step ? C.plum : C.taupe}`,
							color: i === step ? 'white' : C.taupe, fontFamily: AFACAD, fontSize: 17, display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
							{i < step ? '✓' : i + 1}
						</div>
						<div style={{fontFamily: AFACAD, fontSize: 22, color: i === step ? C.plum : C.taupe, fontWeight: i === step ? 600 : 400}}>{s}</div>
					</div>
					{i < steps.length - 1 ? <div style={{width: 22, height: 1.5, background: C.line}} /> : null}
				</React.Fragment>
			))}
		</div>
	);
};

const Preview: React.FC<{src: string; key2: string; t: number; at: number; empty?: boolean}> = ({src, t, at, empty}) => {
	const a = fade(t, at, 0.35);
	const z = interpolate(t, [at, at + 0.6], [1.06, 1], {...clamp, easing: ease});
	return (
		<div style={{position: 'absolute', inset: 0, borderRadius: 26, overflow: 'hidden', background: C.card}}>
			{empty ? (
				<div style={{position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center'}}>
					<div style={{fontFamily: AFACAD, fontSize: 32, color: C.plum}}>Your design will appear here</div>
					<div style={{fontFamily: AFACAD, fontSize: 22, color: C.taupe, marginTop: 10}}>A blank canvas, just for you.</div>
				</div>
			) : (
				<Img src={src} style={{width: '100%', height: '100%', objectFit: 'cover', opacity: a, scale: z}} />
			)}
		</div>
	);
};

const Studio: React.FC<{d: StudioData}> = ({d}) => {
	const frame = useCurrentFrame();
	const {fps} = useVideoConfig();
	const t = frame / fps;
	const ev = d.events;
	const at = (name: string, i = 0) => ev.filter((e) => e.ev === name)[i]?.t ?? 1e9;
	const ideas = ev.filter((e) => e.ev === 'idea');
	const metals = ev.filter((e) => e.ev === 'metal');
	const gen = at('generate');
	const direct = ev.find((e) => e.ev === 'direct')!;
	const refine = at('refine');
	const worn = ev.find((e) => e.ev === 'worn')!;
	const final = ev.find((e) => e.ev === 'final')!;
	const stoneEv = ev.find((e) => e.ev === 'stone')!;
	const detailEv = ev.find((e) => e.ev === 'detail')!;
	const step = t < direct.t ? 0 : t < refine ? 1 : t < final.t ? 2 : 3;
	// what the preview shows right now
	const shown = [...ev].filter((e) => e.t <= t && (e.img || e.ev === 'describe')).pop();
	const panelIn = interpolate(t, [0, 0.5], [120, 0], {...clamp, easing: ease});
	// prompt box text: typed in word by word as each idea is added
	const typed = ideas.filter((e) => e.t <= t).map((e, i, arr) => {
		const full = e.text ?? '';
		const n = i === arr.length - 1 ? Math.ceil(interpolate(t, [e.t, e.t + 0.6], [0, full.length], clamp)) : full.length;
		return full.slice(0, n);
	}).join('');
	const genPress = interpolate(t, [gen - 0.05, gen + 0.1, gen + 0.3], [1, 0.92, 1], clamp);
	const loading = t >= gen && t < gen + 0.9;

	const left = (() => {
		if (t < gen) {
			return (
				<>
					<div style={{fontFamily: AFACAD, fontSize: 17, letterSpacing: '0.2em', color: C.taupe}}>YOUR PERSONAL DESIGN ASSISTANT</div>
					<div style={{fontFamily: CORMORANT_G, fontSize: 64, lineHeight: 1.02, color: C.plum, marginTop: 12}}>
						What shall we <i>make for you?</i>
					</div>
					<div style={{marginTop: 26}}>
						{['A shape I love', 'A stone with a story', 'A symbol', 'A hidden detail'].map((c) => {
							const e = ideas.find((x) => x.chip === c);
							return <Chip key={c} label={c} on={e && t >= e.t ? 1 : 0} t={t} at={e?.t} />;
						})}
					</div>
					<div style={{position: 'absolute', left: 0, right: 0, bottom: 0, background: C.card, borderRadius: 24, border: `1.5px solid ${C.line}`, padding: '22px 24px',
						boxShadow: '0 10px 30px rgba(43,16,22,0.08)'}}>
						<div style={{fontFamily: AFACAD, fontSize: 26, lineHeight: 1.35, color: typed ? C.plum : '#A89A93', minHeight: 72}}>
							{typed || 'Describe your piece, e.g. an oval diamond ring in yellow gold…'}
							{typed && Math.floor(frame / 8) % 2 === 0 ? <span style={{color: C.mauve}}>|</span> : null}
						</div>
						<div style={{display: 'flex', justifyContent: 'flex-end', marginTop: 10}}>
							<div style={{background: typed ? C.btn : C.chip, color: typed ? 'white' : '#A89A93', borderRadius: 30, padding: '12px 34px', fontFamily: AFACAD, fontSize: 24, scale: genPress}}>Generate</div>
						</div>
					</div>
				</>
			);
		}
		if (t < direct.t) {
			const metalOn = metals.filter((m) => m.t <= t).pop()?.metal;
			const sw: Record<string, string> = {Gold: 'linear-gradient(135deg,#f3d27a,#b8862f)', Silver: 'linear-gradient(135deg,#f4f4f4,#a9adb3)', Platinum: 'linear-gradient(135deg,#e6e7ea,#8d9096)'};
			return (
				<div style={{opacity: fade(t, gen + 0.6)}}>
					<div style={{fontFamily: AFACAD, fontSize: 17, letterSpacing: '0.2em', color: C.taupe}}>DESCRIBE · THE FOUNDATION</div>
					<div style={{fontFamily: CORMORANT_G, fontSize: 56, color: C.plum, marginTop: 8}}>Choose your <i>metal</i></div>
					<div style={{display: 'flex', gap: 22, marginTop: 18}}>
						{['Gold', 'Silver', 'Platinum'].map((m) => (
							<div key={m} style={{textAlign: 'center'}}>
								<div style={{width: 84, height: 84, borderRadius: 42, background: sw[m], border: `4px solid ${metalOn === m ? C.plum : 'white'}`,
									boxShadow: metalOn === m ? `0 0 0 3px ${C.gold}` : '0 2px 8px rgba(0,0,0,0.12)'}} />
								<div style={{fontFamily: AFACAD, fontSize: 22, color: C.plum, marginTop: 8}}>{m}</div>
							</div>
						))}
					</div>
					<div style={{fontFamily: CORMORANT_G, fontSize: 44, color: C.plum, marginTop: 30, opacity: fade(t, stoneEv.t)}}>Stone &amp; <i>details</i></div>
					<div style={{marginTop: 12, opacity: fade(t, stoneEv.t)}}>
						{['Diamond', 'Sapphire', 'Emerald'].map((s) => <Chip key={s} label={s} on={t >= stoneEv.t && s === stoneEv.stone ? 1 : 0} t={t} at={s === stoneEv.stone ? stoneEv.t : undefined} />)}
						<Chip label="Pavé band" on={t >= detailEv.t ? 1 : 0} t={t} at={detailEv.t} />
					</div>
				</div>
			);
		}
		if (t < final.t) {
			const isRefine = t >= refine;
			const prop = interpolate(t, [refine + 0.3, refine + 1.4], [0.35, 0.72], {...clamp, easing: ease});
			return (
				<div style={{opacity: fade(t, direct.t)}}>
					<div style={{fontFamily: AFACAD, fontSize: 17, letterSpacing: '0.2em', color: C.taupe}}>{isRefine ? 'REFINE · VERSION 2' : 'DIRECT · PICK ONE OF THREE'}</div>
					<div style={{fontFamily: CORMORANT_G, fontSize: 56, color: C.plum, marginTop: 8}}>{isRefine ? <>Shape every <i>detail</i></> : <>Your choices, <i>designed</i></>}</div>
					{isRefine ? (
						<div style={{marginTop: 30}}>
							{[['Proportions', prop], ['Band width', 0.4], ['Setting height', interpolate(t, [refine + 0.8, refine + 1.8], [0.5, 0.78], {...clamp, easing: ease})]].map(([l, v]) => (
								<div key={l as string} style={{marginBottom: 26}}>
									<div style={{fontFamily: AFACAD, fontSize: 24, color: C.plum, marginBottom: 10}}>{l as string}</div>
									<div style={{height: 8, borderRadius: 4, background: C.line, position: 'relative'}}>
										<div style={{position: 'absolute', left: 0, top: 0, bottom: 0, width: `${(v as number) * 100}%`, borderRadius: 4, background: C.mauve}} />
										<div style={{position: 'absolute', top: -11, left: `calc(${(v as number) * 100}% - 15px)`, width: 30, height: 30, borderRadius: 15, background: 'white', border: `3px solid ${C.mauve}`}} />
									</div>
								</div>
							))}
						</div>
					) : (
						<div style={{display: 'flex', gap: 14, marginTop: 24}}>
							{(direct.imgs ?? []).map((k, i) => {
								const picked = i === direct.pick && t >= direct.t + 1.0;
								return (
									<div key={k + i} style={{width: 130, height: 130, borderRadius: 18, overflow: 'hidden', border: `4px solid ${picked ? C.plum : 'white'}`,
										opacity: fade(t, direct.t + 0.15 * i), boxShadow: '0 6px 16px rgba(0,0,0,0.12)'}}>
										<Img src={imgOf(d, k)} style={{width: '100%', height: '100%', objectFit: 'cover'}} />
									</div>
								);
							})}
						</div>
					)}
					{!isRefine ? <div style={{fontFamily: AFACAD, fontSize: 22, color: C.taupe, marginTop: 18}}>Every change is saved as a new version.</div> : null}
				</div>
			);
		}
		return (
			<div style={{opacity: fade(t, final.t)}}>
				<div style={{fontFamily: AFACAD, fontSize: 17, letterSpacing: '0.2em', color: C.taupe}}>FROM A BLANK CANVAS</div>
				<div style={{fontFamily: CORMORANT_G, fontSize: 60, lineHeight: 1.02, color: C.plum, marginTop: 8}}>Your idea, <i>brought to life</i></div>
				<div style={{display: 'inline-block', marginTop: 34, background: C.plum, color: 'white', borderRadius: 34, padding: '18px 40px', fontFamily: AFACAD, fontSize: 28,
					scale: interpolate(t, [final.t + 0.5, final.t + 0.75], [0.9, 1], {...clamp, easing: springy})}}>Start yours at takshila.co</div>
			</div>
		);
	})();

	// preview window (right)
	const previewKey = t >= final.t ? 'final' : shown?.img ?? 'empty';
	return (
		<div style={{position: 'absolute', left: 0, top: PANEL_TOP, width: 1080, height: 1920 - PANEL_TOP, translate: `0 ${panelIn}px`, background: C.bg,
			borderTopLeftRadius: 40, borderTopRightRadius: 40, boxShadow: '0 -18px 50px rgba(0,0,0,0.25)', overflow: 'hidden'}}>
			<div style={{height: 92, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 36px', borderBottom: `1.5px solid ${C.line}`}}>
				<Img src={staticFile('img/studio/logo.png')} style={{height: 46}} />
				<Stepper step={step} />
			</div>
			<div style={{position: 'absolute', left: 40, top: 136, width: 470, bottom: 64}}>{left}</div>
			<div style={{position: 'absolute', left: 540, top: 126, width: 500, height: 770}}>
				{t >= final.t ? (
					<div style={{position: 'absolute', inset: 0, display: 'flex', gap: 14}}>
						{[final.sketch, final.img].map((k, i) => (
							<div key={i} style={{flex: 1, borderRadius: 22, overflow: 'hidden', position: 'relative', opacity: fade(t, final.t + 0.2 * i)}}>
								<Img src={imgOf(d, k)} style={{width: '100%', height: '100%', objectFit: 'cover'}} />
								<div style={{position: 'absolute', left: 0, right: 0, bottom: 16, textAlign: 'center', fontFamily: AFACAD, fontSize: 22, color: 'white',
									textShadow: '0 2px 10px rgba(0,0,0,0.6)'}}>{i === 0 ? 'Your sketch' : 'Your piece'}</div>
							</div>
						))}
					</div>
				) : (
					<Preview key={previewKey} key2={previewKey} src={imgOf(d, shown?.img)} t={t} at={shown?.t ?? 0} empty={!shown?.img} />
				)}
				{loading ? (
					<div style={{position: 'absolute', inset: 0, borderRadius: 26, background: 'rgba(251,248,243,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center',
						fontFamily: AFACAD, fontSize: 28, color: C.mauve}}>Designing your piece…</div>
				) : null}
				{t >= worn.t && t < final.t ? (
					<div style={{position: 'absolute', left: 16, top: 16, background: 'rgba(43,16,22,0.8)', color: 'white', borderRadius: 18, padding: '6px 16px', fontFamily: AFACAD, fontSize: 20}}>Worn every day</div>
				) : null}
			</div>
			{/* tap ripples where she "presses" */}
			{ideas.map((e, i) => <Tap key={`ti${i}`} t={t} at={e.t} x={40 + [110, 360, 90, 300][i]} y={130 + 160 + (i < 2 ? 30 : 100)} />)}
			<Tap t={t} at={gen - 0.05} x={40 + 400} y={1920 - PANEL_TOP - 90} />
			{metals.map((m, i) => <Tap key={`tm${i}`} t={t} at={m.t} x={40 + 42 + i * 106} y={130 + 140} />)}
		</div>
	);
};

const EndCard: React.FC<{d: StudioData}> = ({d}) => {
	const frame = useCurrentFrame();
	const {fps} = useVideoConfig();
	const a = interpolate(frame, [0, 8], [0, 1], clamp);
	const z = interpolate(frame, [0, STUDIO_END * fps], [1.02, 1.08], clamp);
	const t1 = interpolate(frame, [6, 18], [0, 1], {...clamp, easing: ease});
	return (
		<AbsoluteFill style={{opacity: a, background: C.bg, alignItems: 'center'}}>
			<div style={{marginTop: 300, width: 760, height: 760, borderRadius: 40, overflow: 'hidden', boxShadow: '0 30px 70px rgba(43,16,22,0.18)'}}>
				<Img src={imgOf(d, 'P11')} style={{width: '100%', height: '100%', objectFit: 'cover', scale: z}} />
			</div>
			<Img src={staticFile('img/studio/logo.png')} style={{height: 96, marginTop: 70, opacity: t1}} />
			<div style={{fontFamily: CORMORANT_G, fontStyle: 'italic', fontSize: 58, color: C.plum, marginTop: 18, opacity: t1}}>What would you create?</div>
			<div style={{marginTop: 34, background: C.plum, color: 'white', borderRadius: 40, padding: '20px 54px', fontFamily: AFACAD, fontSize: 36, opacity: t1}}>takshila.co</div>
		</AbsoluteFill>
	);
};

const Clicks: React.FC<{d: StudioData}> = ({d}) => {
	const {fps} = useVideoConfig();
	if (!d.clicks) return null;
	// one crisp click per hook word, plus one per tap in the studio
	const hits = [...d.words.filter((w) => w.t < d.hookEnd).map((w) => ({t: w.t, v: 0.6})),
		...d.events.filter((e) => ['idea', 'generate', 'metal', 'stone', 'detail'].includes(e.ev)).map((e) => ({t: e.t, v: 0.45}))];
	return (
		<>
			{hits.map((h, i) => (
				<Sequence key={`c${i}`} name="click" from={Math.round(h.t * fps)} durationInFrames={5} layout="none">
					<Audio src={staticFile(`sfx/infl/${d.clicks![i % d.clicks!.length]}.wav`)} volume={h.v * (0.88 + 0.12 * (((i * 7) % 5) / 4))} />
				</Sequence>
			))}
		</>
	);
};

export const StudioReel: React.FC<{d: StudioData}> = ({d}) => {
	const {fps, durationInFrames} = useVideoConfig();
	const f = (t: number) => Math.round(t * fps);
	const T = Math.min(f(d.total), durationInFrames - 30);
	return (
		<AbsoluteFill style={{backgroundColor: C.bg}}>
			{d.segments.map((s, i) => (
				<Sequence key={`f${i}`} name={`${s.clip} ${s.a}`} from={f(s.o)} durationInFrames={Math.max(1, f(s.o + segLen(s)) - f(s.o))}>
					<Face s={s} />
				</Sequence>
			))}
			<Caption d={d} />
			<Studio d={d} />
			<Sequence name="end card" from={f(d.total)}>
				<EndCard d={d} />
			</Sequence>
			<Clicks d={d} />
			{d.music ? (
				<Audio name="music" src={staticFile(`media/${d.music.file}`)} trimBefore={f(d.music.start)}
					volume={(fr) => interpolate(fr, [0, 10, T, T + 8, Math.max(T + 9, durationInFrames - 20), Math.max(T + 10, durationInFrames)],
						[0, d.music!.vol, d.music!.vol, d.music!.vol * 2.2, d.music!.vol * 2.2, 0], clamp)} />
			) : null}
		</AbsoluteFill>
	);
};
