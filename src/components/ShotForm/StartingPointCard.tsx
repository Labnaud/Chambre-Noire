import type { RoastLevel } from '../../types';
import type { StartingPoint } from '../../lib/suggestions';
import Icons from '../Icons';

interface StartingPointCardProps {
    beanName: string;
    roastLevel: RoastLevel | undefined;
    startingPoint: StartingPoint | null;
    freshnessNote: string | null;
    onApply: (doseIn: number, doseOut: number, grind: number) => void;
}

// Shown for a bean with no history on this method. Without a roast level
// there is no starting point: ask for it rather than assume one.
export default function StartingPointCard({
    beanName, roastLevel, startingPoint, freshnessNote, onApply,
}: StartingPointCardProps) {
    if (!startingPoint) {
        return (
            <div className="starting-point starting-point--unknown">
                <Icons.Target />
                <div>
                    <strong>No starting point for "{beanName}" yet.</strong>
                    <p>
                        Add a roast level to this bean in the Bean Library and the
                        matching dose, grind and yield will appear here.
                    </p>
                </div>
            </div>
        );
    }

    const { doseIn, doseOut, grind, time } = startingPoint;
    const midGrind = Math.round((grind[0] + grind[1]) / 2);

    return (
        <div className="starting-point">
            <div className="starting-point__head">
                <Icons.Target />
                <span>Starting point &mdash; {roastLevel} roast</span>
            </div>
            <dl className="starting-point__rows">
                <div><dt>Dose</dt><dd>{doseIn}g</dd></div>
                <div><dt>Yield</dt><dd>{doseOut}g</dd></div>
                <div><dt>Grind</dt><dd>{grind[0]}&ndash;{grind[1]}</dd></div>
                <div><dt>Time</dt><dd>{time[0]}&ndash;{time[1]}s</dd></div>
            </dl>
            {freshnessNote && <p className="starting-point__note">{freshnessNote}</p>}
            <button
                type="button"
                className="btn-apply-suggestion"
                onClick={() => onApply(doseIn, doseOut, midGrind)}
            >
                <Icons.Zap /> Apply to form
            </button>
        </div>
    );
}
