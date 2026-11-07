// One still per candidate editing style for script 4, all on her real footage, so the style can be chosen by eye.
import React from 'react';
import {AbsoluteFill, Img, OffthreadVideo, staticFile} from 'remotion';
import {AFACAD, CORMORANT_G, INSTRUMENT, POPPINS} from './fonts';

const her = (t: number, style: React.CSSProperties = {}) => (
	<OffthreadVideo src={staticFile('media/p7/20261104_160648.mp4')} muted trimBefore={Math.round(t * 30)}
		style={{position: 'absolute', width: 1080, height: 1920, scale: 1.1, transformOrigin: '540px 0px', top: -180, ...style}} />
);
const img = (k: string, style: React.CSSProperties) => <Img src={staticFile(`img/${k}`)} style={{position: 'absolute', objectFit: 'cover', ...style}} />;
const tag = (n: number, name: string) => (
	<div style={{position: 'absolute', left: 0, right: 0, top: 0, height: 120, background: 'rgba(0,0,0,0.75)', color: 'white', fontFamily: AFACAD, fontSize: 46,
		display: 'flex', alignItems: 'center', padding: '0 40px', gap: 20}}><b style={{color: '#F3DC9A'}}>{n}</b>{name}</div>
);

export const StyleSample: React.FC<{n: number}> = ({n}) => {
	if (n === 1) // Quiet luxury: warm desaturated grade, one thin serif line, gold hairline, lots of air
		return (
			<AbsoluteFill style={{background: '#000'}}>
				{her(21.5, {filter: 'saturate(0.55) sepia(0.18) contrast(1.06) brightness(0.96)'})}
				<AbsoluteFill style={{background: 'linear-gradient(rgba(0,0,0,0) 45%, rgba(20,12,6,0.55))'}} />
				<div style={{position: 'absolute', left: 80, right: 230, top: 1250, color: '#F7F0E3'}}>
					<div style={{width: 90, height: 2, background: '#C9A14A', marginBottom: 26}} />
					<div style={{fontFamily: CORMORANT_G, fontSize: 86, lineHeight: 1.02}}>We begin with<br /><i>the person.</i></div>
					<div style={{fontFamily: AFACAD, fontSize: 26, letterSpacing: '0.3em', marginTop: 28, opacity: 0.85}}>TAKSHILA · CUSTOM</div>
				</div>
				{tag(1, 'Quiet luxury')}
			</AbsoluteFill>
		);
	if (n === 2) // Dark cinematic: black, spotlight on her, ring macro inset, white tracked sans
		return (
			<AbsoluteFill style={{background: '#050403'}}>
				{her(13.0, {filter: 'contrast(1.15) saturate(0.8) brightness(0.9)'})}
				<AbsoluteFill style={{background: 'radial-gradient(ellipse 60% 42% at 50% 34%, rgba(0,0,0,0) 0%, rgba(0,0,0,0.88) 100%)'}} />
				{img('studio2/P05.jpg', {left: 80, top: 1180, width: 380, height: 380, borderRadius: 8, boxShadow: '0 0 80px rgba(201,161,74,0.35)'})}
				<div style={{position: 'absolute', left: 500, width: 360, top: 1240, color: 'white', fontFamily: POPPINS, fontWeight: 500, fontSize: 34, letterSpacing: '0.24em', lineHeight: 1.5}}>
					THE DETAIL<br /><span style={{color: '#C9A14A'}}>THAT MAKES</span><br />IT PERSONAL
				</div>
				{tag(2, 'Dark cinematic')}
			</AbsoluteFill>
		);
	if (n === 3) // Bold creator: punch-in, huge highlighted captions, emoji sticker
		return (
			<AbsoluteFill style={{background: '#000'}}>
				{her(4.6, {scale: 1.35, top: -330})}
				<div style={{position: 'absolute', left: 50, right: 200, top: 1180, textAlign: 'center', fontFamily: POPPINS, fontWeight: 800, fontSize: 104, lineHeight: 1.02,
					color: 'white', textTransform: 'uppercase', textShadow: '0 6px 0 #000, 0 0 30px rgba(0,0,0,0.6)'}}>
					this is the <span style={{background: '#F5C518', color: '#111', padding: '0 14px', borderRadius: 14}}>detail</span>
				</div>
				<div style={{position: 'absolute', left: 700, top: 980, fontSize: 120, rotate: '12deg'}}>👀</div>
				{tag(3, 'Bold creator')}
			</AbsoluteFill>
		);
	if (n === 4) // Split-screen product: her on top, macro product video/still below, label on the seam
		return (
			<AbsoluteFill style={{background: '#F5EFE7'}}>
				<div style={{position: 'absolute', left: 0, top: 0, width: 1080, height: 1010, overflow: 'hidden'}}>{her(20.0)}</div>
				{img('studio2/P11.jpg', {left: 0, top: 1010, width: 1080, height: 910})}
				<div style={{position: 'absolute', left: 60, top: 970, background: '#2B1016', color: 'white', borderRadius: 40, padding: '16px 40px', fontFamily: AFACAD, fontSize: 38}}>
					the metal · the proportions</div>
				{tag(4, 'Split-screen product')}
			</AbsoluteFill>
		);
	if (n === 5) // Scrapbook / polaroids: real photos taped on, handwritten notes
		return (
			<AbsoluteFill style={{background: '#000'}}>
				{her(12.5)}
				<div style={{position: 'absolute', left: 70, top: 1100, width: 330, background: 'white', padding: '16px 16px 60px', rotate: '-6deg', boxShadow: '0 16px 40px rgba(0,0,0,0.45)'}}>
					<Img src={staticFile('img/journey/J02.jpg')} style={{width: 298, height: 298, objectFit: 'cover'}} />
					<div style={{fontFamily: INSTRUMENT, fontStyle: 'italic', fontSize: 40, color: '#222', marginTop: 10}}>the moment</div>
				</div>
				<div style={{position: 'absolute', left: 470, top: 1180, width: 330, background: 'white', padding: '16px 16px 60px', rotate: '5deg', boxShadow: '0 16px 40px rgba(0,0,0,0.45)'}}>
					<Img src={staticFile('img/journey/J01.jpg')} style={{width: 298, height: 298, objectFit: 'cover'}} />
					<div style={{fontFamily: INSTRUMENT, fontStyle: 'italic', fontSize: 40, color: '#222', marginTop: 10}}>what they carry</div>
				</div>
				<div style={{position: 'absolute', left: 190, top: 1080, width: 120, height: 36, background: 'rgba(240,230,200,0.75)', rotate: '-12deg'}} />
				<div style={{position: 'absolute', left: 580, top: 1160, width: 120, height: 36, background: 'rgba(240,230,200,0.75)', rotate: '9deg'}} />
				{tag(5, 'Scrapbook polaroids')}
			</AbsoluteFill>
		);
	// 6 Chat story: the brief told as message bubbles beside her
	return (
		<AbsoluteFill style={{background: '#000'}}>
			{her(11.8)}
			<AbsoluteFill style={{background: 'linear-gradient(rgba(0,0,0,0) 40%, rgba(0,0,0,0.55))'}} />
			<div style={{position: 'absolute', left: 60, width: 800, top: 1080, display: 'flex', flexDirection: 'column', gap: 16, fontFamily: AFACAD, fontSize: 36}}>
				<div style={{alignSelf: 'flex-start', background: 'white', color: '#111', borderRadius: '30px 30px 30px 8px', padding: '18px 28px', maxWidth: 560}}>It's for my mum's 60th 💛</div>
				<div style={{alignSelf: 'flex-start', background: 'white', color: '#111', borderRadius: '30px 30px 30px 8px', padding: '18px 28px', maxWidth: 560}}>can it hold her initials?</div>
				<div style={{alignSelf: 'flex-end', background: '#6D3B54', color: 'white', borderRadius: '30px 30px 8px 30px', padding: '18px 28px', maxWidth: 560}}>Takshila: we'll design it around her ✨</div>
			</div>
			{tag(6, 'Chat story')}
		</AbsoluteFill>
	);
};
