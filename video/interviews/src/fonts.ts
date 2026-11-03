import {loadFont} from '@remotion/fonts';
import {staticFile} from 'remotion';

export const SERIF = 'CormorantGaramondX';
export const SANS = 'InterX';

loadFont({family: SERIF, url: staticFile('fonts/Cormorant-normal.woff2'), weight: '300 700', format: 'woff2'});
loadFont({family: SERIF, url: staticFile('fonts/Cormorant-italic.woff2'), weight: '300 700', style: 'italic', format: 'woff2'});
loadFont({family: SANS, url: staticFile('fonts/Inter-normal.woff2'), weight: '100 900', format: 'woff2'});
