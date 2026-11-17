// Day 17: four candidate editing directions, one still each on her real footage, so a new look can be picked by eye.
import React from 'react';
import {AbsoluteFill, OffthreadVideo, staticFile} from 'remotion';
import {AFACAD, INSTRUMENT, ROUND, SANS} from './fonts';

const her = (t: number, style: React.CSSProperties = {}) => (
	<OffthreadVideo src={staticFile('media/p11/day17.mp4')} muted trimBefore={Math.round(t * 30)}
		style={{position: 'absolute', left: 0, top: 0, width: 1080, height: 1920, ...style}} />
);
const tag = (n: number, name: string) => (
	<div style={{position: 'absolute', left: 0, right: 0, top: 0, height: 110, background: 'rgba(0,0,0,0.72)', color: 'white', fontFamily: AFACAD, fontSize: 44,
		display: 'flex', alignItems: 'center', padding: '0 40px', gap: 18, zIndex: 9}}><b style={{color: '#F3DC9A'}}>{n}</b>{name}</div>
);

export const Day17Sample: React.FC<{n: number}> = ({n}) => {
	if (n === 1) // Quiet luxury film: 4:5 window on cream, warm film grade, small lowercase serif subtitle, one italic word
		return (
			<AbsoluteFill style={{background: '#EFE7DA'}}>
				<div style={{position: 'absolute', left: 60, top: 230, width: 960, height: 1200, overflow: 'hidden', borderRadius: 6}}>
					{her(22.0, {width: 1080, height: 1920, left: -60, top: -300, filter: 'sepia(0.18) saturate(0.85) contrast(1.06) brightness(1.02)'})}
				</div>
				<div style={{position: 'absolute', left: 60, top: 160, fontFamily: AFACAD, fontSize: 26, letterSpacing: '0.4em', color: '#7A6A58'}}>DAY 17 · THE SECRET</div>
				<div style={{position: 'absolute', left: 60, right: 60, top: 1480, fontFamily: INSTRUMENT, fontSize: 64, lineHeight: 1.1, color: '#2E2A26'}}>
					she wanted to keep it <i style={{color: '#B3563E'}}>a secret.</i>
				</div>
				<div style={{position: 'absolute', left: 60, top: 1690, fontFamily: AFACAD, fontSize: 26, letterSpacing: '0.3em', color: '#7A6A58'}}>TAKSHILA.CO</div>
				{tag(1, 'Quiet luxury film')}
			</AbsoluteFill>
		);
	if (n === 2) // Bold kinetic type: full-frame, huge stacked words that slam in, white + one accent, hard punch-in
		return (
			<AbsoluteFill style={{background: '#000'}}>
				{her(22.0, {scale: 1.18, transformOrigin: '540px 600px', filter: 'contrast(1.1) saturate(1.05)'})}
				<AbsoluteFill style={{background: 'linear-gradient(rgba(0,0,0,0) 50%, rgba(0,0,0,0.55))'}} />
				<div style={{position: 'absolute', left: 60, right: 60, top: 1160, fontFamily: ROUND, fontWeight: 900, fontSize: 150, lineHeight: 0.9, color: 'white', textTransform: 'uppercase', letterSpacing: '-0.02em'}}>
					keep it<br /><span style={{color: '#FFD23F'}}>a secret</span>
				</div>
				{tag(2, 'Bold kinetic type')}
			</AbsoluteFill>
		);
	if (n === 3) // Documentary interview: cinematic 2.39 bars, off-centre framing, small film subtitles, lower-third name
		return (
			<AbsoluteFill style={{background: '#0B0B0B'}}>
				<div style={{position: 'absolute', left: 0, top: 500, width: 1080, height: 920, overflow: 'hidden'}}>
					{her(22.0, {width: 1080 * 1.25, height: 1920 * 1.25, left: -300, top: -520, filter: 'contrast(1.08) saturate(0.8) brightness(0.95)'})}
				</div>
				<div style={{position: 'absolute', left: 60, top: 1300, color: 'white'}}>
					<div style={{fontFamily: SANS, fontWeight: 600, fontSize: 34}}>Susanna</div>
					<div style={{fontFamily: SANS, fontWeight: 400, fontSize: 24, opacity: 0.7, letterSpacing: '0.12em'}}>DESIGNER · TAKSHILA</div>
				</div>
				<div style={{position: 'absolute', left: 80, right: 80, top: 1500, textAlign: 'center', fontFamily: SANS, fontWeight: 500, fontSize: 40, color: '#F2F2F2'}}>
					She said she wanted to keep it a secret.
				</div>
				<div style={{position: 'absolute', left: 0, right: 0, top: 340, textAlign: 'center', fontFamily: INSTRUMENT, fontSize: 70, color: 'white'}}>the part nobody sees</div>
				{tag(3, 'Documentary interview')}
			</AbsoluteFill>
		);
	// 4 Glass captions: modern frosted pill, one phrase at a time, active word bold; clean full-frame look
	return (
		<AbsoluteFill style={{background: '#000'}}>
			{her(22.0, {filter: 'contrast(1.04) saturate(1.02)'})}
			<div style={{position: 'absolute', left: 0, right: 0, top: 1380, display: 'flex', justifyContent: 'center'}}>
				<div style={{background: 'rgba(255,255,255,0.22)', backdropFilter: 'blur(18px)', WebkitBackdropFilter: 'blur(18px)', border: '1px solid rgba(255,255,255,0.4)',
					borderRadius: 999, padding: '22px 46px', fontFamily: SANS, fontSize: 52, color: 'rgba(255,255,255,0.75)', boxShadow: '0 10px 40px rgba(0,0,0,0.18)'}}>
					keep it a <b style={{color: 'white', fontWeight: 700}}>secret</b>
				</div>
			</div>
			{tag(4, 'Glass captions')}
		</AbsoluteFill>
	);
};
