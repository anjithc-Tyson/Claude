import {Composition} from 'remotion';
import street from './data/street.json';
import jewel from './data/jewel.json';
import {Data, Interview, totalOf} from './Interview';
import {Quiz, QUIZ, quizTotal} from './Quiz';
import {BoldClaim, BOLD, boldTotal} from './BoldClaim';
import {Influencer, INFL, inflTotal} from './Influencer';
import {StudioReel, STUDIO, studioTotal} from './Studio';
import {JourneyReel, JOURNEY, journeyTotal} from './Journey';
import {DetailReel, DETAIL, detailTotal} from './Detail';

const S = street as Data;
const J = jewel as Data;

export const RemotionRoot: React.FC = () => (
	<>
		<Composition id="Street" component={Interview} defaultProps={{d: S}} durationInFrames={Math.round(totalOf(S) * 30)} fps={30} width={1080} height={1920} />
		<Composition id="Jewel" component={Interview} defaultProps={{d: J}} durationInFrames={Math.round(totalOf(J) * 30)} fps={30} width={1080} height={1920} />
		<Composition id="StreetQuiz" component={Quiz} defaultProps={{d: QUIZ as never}} durationInFrames={Math.round(quizTotal(QUIZ) * 30)} fps={30} width={1080} height={1920} />
		<Composition id="BoldClaim" component={BoldClaim} defaultProps={{d: BOLD}} durationInFrames={Math.round(boldTotal(BOLD) * 30)} fps={30} width={1080} height={1920} />
		<Composition id="BoldInfluencer" component={Influencer} defaultProps={{d: INFL}} durationInFrames={Math.round(inflTotal(INFL) * 30)} fps={30} width={1080} height={1920} />
		<Composition id="BoldInfluencer-poppins" component={Influencer} defaultProps={{d: {...INFL, font: 'poppins'}}} durationInFrames={Math.round(inflTotal(INFL) * 30)} fps={30} width={1080} height={1920} />
		<Composition id="BoldInfluencer-playfair" component={Influencer} defaultProps={{d: {...INFL, font: 'playfair'}}} durationInFrames={Math.round(inflTotal(INFL) * 30)} fps={30} width={1080} height={1920} />
		<Composition id="BoldInfluencer-instrument" component={Influencer} defaultProps={{d: {...INFL, font: 'instrument'}}} durationInFrames={Math.round(inflTotal(INFL) * 30)} fps={30} width={1080} height={1920} />
		<Composition id="Typing-laptop" component={Influencer} defaultProps={{d: {...INFL, typing: {file: 'type_laptop', vol: 0.55}}}} durationInFrames={165} fps={30} width={1080} height={1920} />
		<Composition id="Typing-mech" component={Influencer} defaultProps={{d: {...INFL, typing: {file: 'type_mech', vol: 0.55}}}} durationInFrames={165} fps={30} width={1080} height={1920} />
		<Composition id="Typing-writer" component={Influencer} defaultProps={{d: {...INFL, typing: {file: 'type_writer', vol: 0.55}}}} durationInFrames={165} fps={30} width={1080} height={1920} />
		<Composition id="Typing-none" component={Influencer} defaultProps={{d: {...INFL, typing: null}}} durationInFrames={165} fps={30} width={1080} height={1920} />
		<Composition id="Script2Studio" component={StudioReel} defaultProps={{d: STUDIO}} durationInFrames={Math.round(studioTotal(STUDIO) * 30)} fps={30} width={1080} height={1920} />
		<Composition id="Script3Journey" component={JourneyReel} defaultProps={{d: JOURNEY}} durationInFrames={Math.round(journeyTotal(JOURNEY) * 30)} fps={30} width={1080} height={1920} />
		<Composition id="Script4Detail" component={DetailReel} defaultProps={{d: DETAIL}} durationInFrames={Math.round(detailTotal(DETAIL) * 30)} fps={30} width={1080} height={1920} />
	</>
);
