import { useState } from 'react';
import type { Basket, Strength, BrewMethod, PourPattern } from '../../types';
import { BASKETS, STRENGTHS, POUR_PATTERNS, GRIND_MIN, GRIND_MAX } from '../../constants';
import { BREW_METHODS, profileFor } from '../../lib/brew';
import Icons from '../Icons';

interface BrewControlsProps {
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
    grindSize: number;
    setGrindSize: (g: number) => void;
    waterTempC: number;
    setWaterTempC: (t: number) => void;
    strength: Strength;
    setStrength: (s: Strength) => void;
    onIncrementGrind: () => void;
    onDecrementGrind: () => void;
}

export default function BrewControls({
    method, setMethod,
    pourPattern, setPourPattern,
    iced, setIced,
    iceGrams, setIceGrams,
    basket, setBasket,
    grindSize, setGrindSize,
    waterTempC, setWaterTempC,
    strength, setStrength,
    onIncrementGrind,
    onDecrementGrind,
}: BrewControlsProps) {
    const [editingGrind, setEditingGrind] = useState(false);
    const [grindDraft, setGrindDraft] = useState('');
    const profile = profileFor(method);

    const commitGrind = () => {
        const n = Math.round(Number(grindDraft));
        if (grindDraft.trim() !== '' && Number.isFinite(n)) {
            setGrindSize(Math.min(GRIND_MAX, Math.max(GRIND_MIN, n)));
        }
        setEditingGrind(false);
    };

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

            <div className="form-group">
                <label className="form-label" htmlFor="shot-grind-size">Grind Size</label>
                <div className="grind-control">
                    <button
                        type="button"
                        className="grind-control__btn"
                        onClick={onDecrementGrind}
                        disabled={grindSize <= GRIND_MIN}
                        aria-label="Decrease grind size"
                    >
                        <Icons.Minus />
                    </button>
                    <div className="grind-control__slider-wrap">
                        <input
                            id="shot-grind-size"
                            type="range"
                            className="slider slider--thick"
                            min={GRIND_MIN}
                            max={GRIND_MAX}
                            value={grindSize}
                            onChange={(e) => setGrindSize(Number(e.target.value))}
                        />
                        {editingGrind ? (
                            <input
                                type="number"
                                inputMode="numeric"
                                className="grind-control__value grind-control__value--input"
                                min={GRIND_MIN}
                                max={GRIND_MAX}
                                value={grindDraft}
                                autoFocus
                                aria-label="Grind size"
                                onChange={(e) => setGrindDraft(e.target.value)}
                                onBlur={commitGrind}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') { e.preventDefault(); commitGrind(); }
                                    else if (e.key === 'Escape') setEditingGrind(false);
                                }}
                            />
                        ) : (
                            <button
                                type="button"
                                className="grind-control__value"
                                onClick={() => { setGrindDraft(String(grindSize)); setEditingGrind(true); }}
                                aria-label={`Grind size ${grindSize}, tap to type a value`}
                            >
                                {grindSize}
                            </button>
                        )}
                    </div>
                    <button
                        type="button"
                        className="grind-control__btn"
                        onClick={onIncrementGrind}
                        disabled={grindSize >= GRIND_MAX}
                        aria-label="Increase grind size"
                    >
                        <Icons.Plus />
                    </button>
                </div>
                <div className="slider-labels">
                    <span>{GRIND_MIN} Fine</span>
                    <span>{GRIND_MAX} Coarse</span>
                </div>
            </div>

            {profile.hasWaterTemp && (
                <div className="form-group">
                    <div className="rating-header">
                        <label className="form-label" htmlFor="shot-water-temp">Water Temperature</label>
                        <span className="temp-readout">{waterTempC} &deg;C</span>
                    </div>
                    <input
                        id="shot-water-temp"
                        type="range"
                        className="slider slider--thick"
                        min={profile.tempRangeC[0]}
                        max={profile.tempRangeC[1]}
                        step={1}
                        value={waterTempC}
                        onChange={(e) => setWaterTempC(Number(e.target.value))}
                        aria-valuetext={`${waterTempC} degrees Celsius`}
                    />
                    <div className="slider-labels">
                        <span>{profile.tempRangeC[0]} &deg;C</span>
                        <span>{profile.tempRangeC[1]} &deg;C</span>
                    </div>
                </div>
            )}

            <div className="form-group">
                <span className="form-label" id="shot-strength-label">Strength</span>
                <div className="pill-group" role="group" aria-labelledby="shot-strength-label">
                    {STRENGTHS.map((s) => (
                        <button
                            key={s.value}
                            type="button"
                            className={`pill-btn ${strength === s.value ? 'pill-btn--active' : ''}`}
                            onClick={() => setStrength(s.value)}
                            aria-pressed={strength === s.value}
                        >
                            {s.label}
                        </button>
                    ))}
                </div>
            </div>
        </>
    );
}
