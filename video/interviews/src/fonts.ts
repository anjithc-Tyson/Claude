import {loadFont} from '@remotion/fonts';
import {staticFile} from 'remotion';

export const SERIF = 'CormorantGaramondX';
export const SANS = 'InterX';

loadFont({family: SERIF, url: staticFile('fonts/Cormorant-normal.woff2'), weight: '300 700', format: 'woff2'});
loadFont({family: SERIF, url: staticFile('fonts/Cormorant-italic.woff2'), weight: '300 700', style: 'italic', format: 'woff2'});
loadFont({family: SANS, url: staticFile('fonts/Inter-normal.woff2'), weight: '100 900', format: 'woff2'});
export const ROUND = 'MontserratX';
loadFont({family: ROUND, url: staticFile('fonts/Montserrat-normal.woff2'), weight: '100 900', format: 'woff2'});
export const POPPINS = 'PoppinsX';
export const PLAYFAIR = 'PlayfairX';
export const INSTRUMENT = 'InstrumentSerifX';
for (const w of ['500', '600', '700', '800']) loadFont({family: POPPINS, url: staticFile(`fonts/Poppins-normal-${w}.woff2`), weight: w, format: 'woff2'});
loadFont({family: PLAYFAIR, url: staticFile('fonts/PlayfairDisplay-normal-700.woff2'), weight: '400 900', format: 'woff2'});
loadFont({family: PLAYFAIR, url: staticFile('fonts/PlayfairDisplay-italic-700.woff2'), weight: '400 900', style: 'italic', format: 'woff2'});
loadFont({family: INSTRUMENT, url: staticFile('fonts/InstrumentSerif-normal-400.woff2'), weight: '400', format: 'woff2'});
loadFont({family: INSTRUMENT, url: staticFile('fonts/InstrumentSerif-italic-400.woff2'), weight: '400', style: 'italic', format: 'woff2'});
