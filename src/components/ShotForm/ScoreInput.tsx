import { SCORE_MAX, SCORE_MIN, SCORE_STEP } from '../../constants';
import Icons from '../Icons';

interface ScoreInputProps {
    score: number;
    setScore: (v: number) => void;
    scored: boolean;
    setScored: (v: boolean) => void;
}

// How good the cup was, 0-5 in half steps. Deliberately separate from the
// sour <-> bitter rating: a 4.5 says nothing about which way the shot leaned,
// and the dial-in engine reads only the rating axis.
export default function ScoreInput({ score, setScore, scored, setScored }: ScoreInputProps) {
    const stars = [];
    for (let i = 1; i <= SCORE_MAX; i++) {
        const filled = score >= i;
        const half = !filled && score >= i - 0.5;
        stars.push(
            <span key={i} className={`score-stars__star ${filled ? 'score-stars__star--full' : half ? 'score-stars__star--half' : ''}`}>
                <Icons.Star filled={filled || half} />
            </span>,
        );
    }

    return (
        <div className="form-group">
            <div className="rating-header">
                <label className="form-label" htmlFor="shot-score">Score</label>
                <button
                    type="button"
                    className="rating-later-toggle"
                    onClick={() => setScored(!scored)}
                    aria-pressed={!scored}
                >
                    {scored ? 'Not scored' : 'Score it'}
                </button>
            </div>
            {scored ? (
                <div className="score-input">
                    <div className="score-input__head">
                        <span className="score-stars" aria-hidden="true">{stars}</span>
                        <span className="score-input__value">{score.toFixed(1)}<span className="score-input__max"> / {SCORE_MAX}</span></span>
                    </div>
                    <input
                        id="shot-score"
                        type="range"
                        className="slider slider--thick"
                        min={SCORE_MIN}
                        max={SCORE_MAX}
                        step={SCORE_STEP}
                        value={score}
                        onChange={(e) => setScore(Number(e.target.value))}
                        aria-valuetext={`${score} out of ${SCORE_MAX}`}
                    />
                </div>
            ) : (
                <p className="rating-later-hint">
                    Logging without a score. Open the shot from your history to score it once you&apos;ve tasted it.
                </p>
            )}
        </div>
    );
}
