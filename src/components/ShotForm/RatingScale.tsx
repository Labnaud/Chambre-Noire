import { RATINGS, RATING_COLORS } from '../../constants';

interface RatingScaleProps {
    ratingIndex: number;
    onChange: (index: number) => void;
}

export default function RatingScale({ ratingIndex, onChange }: RatingScaleProps) {
    const rating = RATINGS[ratingIndex];
    return (
        <div className="form-group">
            <div className="rating-header">
                <label className="form-label" htmlFor="shot-rating">Taste Rating</label>
            </div>
            {(
                <div className="rating-slider">
                    <div
                        className="rating-slider__label"
                        style={{ color: RATING_COLORS[rating] }}
                    >
                        {rating}
                    </div>
                    <div className="rating-slider__track">
                        <input
                            id="shot-rating"
                            type="range"
                            className="rating-slider__input"
                            min={0}
                            max={4}
                            step={1}
                            value={ratingIndex}
                            onChange={(e) => onChange(Number(e.target.value))}
                            aria-valuetext={rating}
                            style={{
                                '--rating-color': RATING_COLORS[rating],
                            } as React.CSSProperties}
                        />
                    </div>
                    <div className="rating-slider__scale">
                        <span>Sour</span>
                        <span>Bitter</span>
                    </div>
                </div>
            )}
        </div>
    );
}
