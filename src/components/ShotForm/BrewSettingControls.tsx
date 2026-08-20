import { useState } from 'react';
import type { Strength, BrewMethod } from '../../types';
import { STRENGTHS, GRIND_MIN, GRIND_MAX } from '../../constants';
import { profileFor } from '../../lib/brew';
import Icons from '../Icons';

interface BrewSettingControlsProps {
    method: BrewMethod;
    grindSize: number;
    setGrindSize: (g: number) => void;
    waterTempC: number;
    setWaterTempC: (t: number) => void;
    strength: Strength;
    setStrength: (s: Strength) => void;
    onIncrementGrind: () => void;
    onDecrementGrind: () => void;
}

// The dials you actually turn. These sit after Smart Barista so its
// suggestion is visible while you set them.
export default function BrewSettingControls({
    method,
    grindSize, setGrindSize,
    waterTempC, setWaterTempC,
    strength, setStrength,
    onIncrementGrind, onDecrementGrind,
}: BrewSettingControlsProps) {
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
