import {Composition} from 'remotion';
import street from './data/street.json';
import jewel from './data/jewel.json';
import {Data, Interview, totalOf} from './Interview';
import {Quiz, quizTotal} from './Quiz';

const S = street as Data;
const J = jewel as Data;

export const RemotionRoot: React.FC = () => (
	<>
		<Composition id="Street" component={Interview} defaultProps={{d: S}} durationInFrames={Math.round(totalOf(S) * 30)} fps={30} width={1080} height={1920} />
		<Composition id="Jewel" component={Interview} defaultProps={{d: J}} durationInFrames={Math.round(totalOf(J) * 30)} fps={30} width={1080} height={1920} />
		<Composition id="StreetQuiz" component={Quiz} defaultProps={{d: S as never}} durationInFrames={Math.round(quizTotal(S) * 30)} fps={30} width={1080} height={1920} />
	</>
);
