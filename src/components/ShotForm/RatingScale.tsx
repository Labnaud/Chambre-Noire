import { RATINGS, RATING_COLORS, BALANCED_RATING_INDEX } from '../../constants';

interface RatingScaleProps {
    ratingIndex: number;
    onChange: (index: number) => void;
    rated: boolean;
    setRated: (v: boolean) => void;
}

// Five discrete values, so these are buttons rather than a range slider.
// A slider has to be dragged to a precise stop on a phone, and dragging one
// then releasing is what was bouncing focus into the next text field and
// opening the keyboard. A tap cannot do that, and it matches the Strength
// control: a target in the middle, a problem at either end.
export default function RatingScale({ ratingIndex, onChange, rated, setRated }: RatingScaleProps) {
    return (
        <div className="form-group">
            <div className="rating-header">
                <span className="form-label" id="shot-rating-label">Taste Rating</span>
                <button
                    type="button"
                    className="rating-later-toggle"
                    onClick={() => setRated(!rated)}
                    aria-pressed={!rated}
                >
                    {rated ? 'Taste later' : 'Rate now'}
                </button>
            </div>
            {rated ? (
                <>
                    <div className="pill-group pill-group--wrap rating-pills" role="group" aria-labelledby="shot-rating-label">
                        {RATINGS.map((r, index) => {
                            const active = index === ratingIndex;
                            return (
                                <button
                                    key={r}
                                    type="button"
                                    className={`pill-btn pill-btn--sm rating-pill ${active ? 'pill-btn--active rating-pill--active' : ''}`}
                                    style={active ? { background: RATING_COLORS[r], borderColor: RATING_COLORS[r] } : undefined}
                                    onClick={() => onChange(index)}
                                    aria-pressed={active}
                                >
                                    {r}
                                </button>
                            );
                        })}
                    </div>
                    <p className="rating-hint">
                        {RATINGS[BALANCED_RATING_INDEX]} is the target. Extraction runs sour, then sweet, then bitter.
                    </p>
                </>
            ) : (
                <p className="rating-later-hint">
                    Logging without a rating. Tap the shot in your history to rate it once you&apos;ve tasted it.
                </p>
            )}
        </div>
    );
}
