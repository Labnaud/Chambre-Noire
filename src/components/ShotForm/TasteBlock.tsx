interface TasteBlockProps {
    rated: boolean;
    setRated: (v: boolean) => void;
    children: React.ReactNode;
}

/**
 * Strength, taste rating and score are all judgements about a cup that has been
 * drunk. Logging a shot the moment it is pulled means none of them are known
 * yet, so they are collapsed together behind one toggle rather than each
 * carrying a default that would record an opinion nobody formed.
 */
export default function TasteBlock({ rated, setRated, children }: TasteBlockProps) {
    return (
        <div className="taste-block">
            <div className="taste-block__header">
                <span className="form-label">Taste</span>
                <button
                    type="button"
                    className="rating-later-toggle"
                    onClick={() => setRated(!rated)}
                    aria-pressed={!rated}
                >
                    {rated ? 'Taste later' : 'Rate now'}
                </button>
            </div>
            {rated ? children : (
                <p className="rating-later-hint">
                    Logging the brew without tasting it. Strength, rating and score are
                    skipped &mdash; tap the shot in your history to fill them in once
                    you&apos;ve drunk it.
                </p>
            )}
        </div>
    );
}
