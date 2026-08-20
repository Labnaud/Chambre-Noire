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
    );
}
