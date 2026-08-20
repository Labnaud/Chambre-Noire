import type { Basket, BrewMethod, PourPattern } from '../../types';
import { BASKETS, POUR_PATTERNS } from '../../constants';
import { BREW_METHODS, profileFor } from '../../lib/brew';

interface BrewShapeControlsProps {
    method: BrewMethod;
    setMethod: (m: BrewMethod) => void;
    pourPattern: PourPattern;
    setPourPattern: (p: PourPattern) => void;
    iced: boolean;
    setIced: (v: boolean) => void;
    iceGrams: string;
    setIceGrams: (v: string) => void;
    basket: Basket;
    setBasket: (b: Basket) => void;
}

// What is being brewed: method, its protocol, and the vessel. These come
// before Smart Barista, because the guidance depends on them.
export default function BrewShapeControls({
    method, setMethod,
    pourPattern, setPourPattern,
    iced, setIced,
    iceGrams, setIceGrams,
    basket, setBasket,
}: BrewShapeControlsProps) {
    const profile = profileFor(method);

    return (
        <>
            <div className="form-group">
                <span className="form-label" id="shot-method-label">Method</span>
                <div className="pill-group" role="group" aria-labelledby="shot-method-label">
                    {BREW_METHODS.map((m) => (
                        <button
                            key={m}
                            type="button"
                            className={`pill-btn ${method === m ? 'pill-btn--active' : ''}`}
                            onClick={() => setMethod(m)}
                            aria-pressed={method === m}
                        >
                            {m}
                        </button>
                    ))}
                </div>
            </div>

            {profile.hasPourPattern && (
                <div className="form-group">
                    <span className="form-label" id="shot-pour-label">Pour Pattern</span>
                    <div className="pill-group" role="group" aria-labelledby="shot-pour-label">
                        {POUR_PATTERNS.map((p) => (
                            <button
                                key={p}
                                type="button"
                                className={`pill-btn ${pourPattern === p ? 'pill-btn--active' : ''}`}
                                onClick={() => setPourPattern(p)}
                                aria-pressed={pourPattern === p}
                            >
                                {p}
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {profile.supportsIce && (
                <div className="form-group">
                    <div className="rating-header">
                        <span className="form-label" id="shot-iced-label">Served over ice</span>
                        <button
                            type="button"
                            className="rating-later-toggle"
                            onClick={() => setIced(!iced)}
                            aria-pressed={iced}
                            aria-labelledby="shot-iced-label"
                        >
                            {iced ? 'Iced' : 'Hot'}
                        </button>
                    </div>
                    {iced && (
                        <div className="ice-field">
                            <label className="form-label" htmlFor="shot-ice">Ice (g)</label>
                            <input
                                id="shot-ice"
                                type="number"
                                inputMode="decimal"
                                min="0"
                                step="5"
                                className="form-input form-input--sm"
                                placeholder="100"
                                value={iceGrams}
                                onChange={(e) => setIceGrams(e.target.value)}
                            />
                            <span className="ice-field__hint">
                                Counts inside total water, so hot water = total &minus; ice.
                            </span>
                        </div>
                    )}
                </div>
            )}

            {method === 'Espresso' && (
                <div className="form-group">
                    <span className="form-label" id="shot-basket-label">Basket Size</span>
                    <div className="pill-group" role="group" aria-labelledby="shot-basket-label">
                        {BASKETS.map((b) => (
                            <button
                                key={b}
                                type="button"
                                className={`pill-btn ${basket === b ? 'pill-btn--active' : ''}`}
                                onClick={() => setBasket(b)}
                                aria-pressed={basket === b}
                            >
                                {b}
                            </button>
                        ))}
                    </div>
                </div>
            )}
        </>
    );
}
