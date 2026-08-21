import type { ShotLog, Rating } from '../types';
import { STRENGTHS } from '../constants';
import { formatDuration } from '../lib/brew';
import ExtractionCompass from './ExtractionCompass';
import Icons from './Icons';

interface DialInJourneyProps {
    shotsForBean: ShotLog[];
    ratingConfig: Record<Rating, { icon: () => React.JSX.Element; colorClass: string }>;
    ratingColors: Record<Rating, string>;
}

/**
 * Sits below the log button rather than inside Smart Barista. Smart Barista
 * answers "what should I do next", which belongs above the controls it talks
 * about; this answers "where have I got to", which is a review of shots already
 * logged and would otherwise push the form's own controls down the page.
 */
export default function DialInJourney({ shotsForBean, ratingConfig, ratingColors }: DialInJourneyProps) {
    if (shotsForBean.length < 2) return null;

    const recent = shotsForBean.slice(0, 5).reverse();

    return (
        <div className="dialin-journey">
            <div className="dialin-journey__label">
                <Icons.TrendingUp /> Recent Journey
                <span className="dialin-journey__dir">oldest to newest</span>
            </div>
            <ExtractionCompass shots={recent} />
            <div className="journey-rows">
                {recent.map((shot, idx) => {
                    const shotConfig = shot.rating ? ratingConfig[shot.rating] : null;
                    const strengthTone = STRENGTHS.find(x => x.value === shot.strength);
                    const parts = [`G${shot.grindSize}`];
                    if (shot.doseIn !== undefined && shot.doseOut !== undefined) {
                        parts.push(`${shot.doseIn}→${shot.doseOut}g`);
                    }
                    if (shot.extractionTime !== undefined) {
                        parts.push(formatDuration(shot.extractionTime));
                    }
                    return (
                        <div key={shot.id} className="journey-row">
                            <span className="journey-row__n">{idx + 1}</span>
                            <span
                                className={`journey-row__taste ${shotConfig ? `journey-row__taste--${shotConfig.colorClass}` : 'journey-row__taste--unrated'}`}
                                style={shot.rating ? { color: ratingColors[shot.rating] } : undefined}
                            >
                                {shot.rating ?? 'Not rated'}
                            </span>
                            <span className="journey-row__tried">{parts.join(' · ')}</span>
                            <span className={`journey-row__strength journey-row__strength--${strengthTone?.tone ?? 'target'}`}>
                                {strengthTone?.label ?? '\u2014'}
                            </span>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
