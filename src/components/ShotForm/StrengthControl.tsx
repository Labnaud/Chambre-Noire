import type { Strength } from '../../types';
import { STRENGTHS } from '../../constants';

interface StrengthControlProps {
    strength: Strength;
    setStrength: (s: Strength) => void;
}

export default function StrengthControl({ strength, setStrength }: StrengthControlProps) {
    return (
        <div className="form-group">
            <span className="form-label" id="shot-strength-label">Strength</span>
            <div className="pill-group pill-group--wrap" role="group" aria-labelledby="shot-strength-label">
                {STRENGTHS.map((s) => (
                    <button
                        key={s.value}
                        type="button"
                        className={`pill-btn pill-btn--tone-${s.tone} ${strength === s.value ? 'pill-btn--active' : ''}`}
                        onClick={() => setStrength(s.value)}
                        aria-pressed={strength === s.value}
                    >
                        {s.label}
                    </button>
                ))}
            </div>
            <p className="strength-hint">
                Strong is the target. Weak or overwhelming both mean the shot needs adjusting.
            </p>
        </div>
    );
}
