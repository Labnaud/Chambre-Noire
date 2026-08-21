import type { ShotLog, Rating, BrewMethod } from '../types';
import type { SuggestedSettings } from '../lib/suggestions';
import { getBaristaTip } from '../lib/suggestions';
import { describeBrew, profileFor, formatDuration, targetTimeLabel } from '../lib/brew';
import Icons from './Icons';

interface SuggestionCardProps {
    lastShot: ShotLog | null;
    suggestion: SuggestedSettings | null;
    beanName: string;
    method: BrewMethod;
    ratingConfig: Record<Rating, { icon: () => React.JSX.Element; colorClass: string }>;
    ratingColors: Record<Rating, string>;
    onApply: () => void;
}

const diffLabel = (n: number) => `${n > 0 ? '+' : ''}${n}`;

interface RowSpec {
    label: string;
    value: React.ReactNode;
}

function CompareRows({ rows }: { rows: RowSpec[] }) {
    return (
        <dl className="dial-compare__rows">
            {rows.map(({ label, value }) => (
                <div key={label}><dt>{label}</dt><dd>{value}</dd></div>
            ))}
        </dl>
    );
}

function diffTag(delta: number) {
    if (delta === 0) return null;
    return (
        <span className={`dial-compare__diff ${delta > 0 ? 'diff--coarser' : 'diff--finer'}`}>
            {diffLabel(delta)}
        </span>
    );
}

export default function SuggestionCard({
    lastShot,
    suggestion,
    beanName,
    method,
    ratingConfig,
    ratingColors,
    onApply,
}: SuggestionCardProps) {
    if (!lastShot) {
        return (
            <div className="empty-state empty-state--small">
                <Icons.Lightbulb />
                <p className="empty-state__title">
                    {beanName.trim() ? `No ${method} history for "${beanName}" yet` : 'Dial in with the Smart Barista'}
                </p>
                <p className="empty-state__text">
                    {beanName.trim()
                        ? `Log a ${method} with this bean and your next-shot tips will appear here.`
                        : 'Enter a bean name and your last shot will guide the next one, from sour toward balanced.'}
                </p>
            </div>
        );
    }

    if (!lastShot.rating) {
        return (
            <div className="barista-tip barista-tip--unrated">
                <span className="barista-tip__icon">
                    <Icons.Lightbulb />
                </span>
                <div className="barista-tip__content">
                    <h4>Rate your last "{lastShot.beanName}" shot</h4>
                    <p>Open it from your history and tap a taste rating. Once it's rated, your next-shot tip appears here.</p>
                </div>
            </div>
        );
    }

    const config = ratingConfig[lastShot.rating];
    const tip = getBaristaTip(lastShot.rating);
    const TipIcon = config.icon;

    // What was actually tried, so the proposal has something to sit against.
    const lastGrind = lastShot.grindSize;
    const lastTemp = lastShot.waterTempC;
    const hasDose = lastShot.doseIn !== undefined && lastShot.doseOut !== undefined;
    const profile = profileFor(method);

    // Espresso yields liquid; a filter brew's figure is the water going in.
    const outLabel = profile.yieldMeans === 'liquid' ? 'Output' : 'Water';

    // Which protocol produced this, so a sweet spot records the recipe and not
    // just the numbers. Espresso has no pour pattern, so there is nothing to name.
    const recipeLabel = method === 'Espresso' ? null : describeBrew(lastShot);

    // Temperature is only shown where the engine can actually move it. On
    // espresso it is never an adjustment, so a row that never changes is noise.
    const tempIsLever = profile.ratioStyle === 'filter';

    const grams = (n: number | undefined) => (n === undefined ? '\u2014' : `${n}g`);

    const lastRows: RowSpec[] = [
        { label: 'Dose', value: grams(lastShot.doseIn) },
        { label: 'Grind', value: lastGrind },
        { label: outLabel, value: grams(lastShot.doseOut) },
        { label: 'Time', value: lastShot.extractionTime !== undefined ? formatDuration(lastShot.extractionTime) : '\u2014' },
    ];
    if (tempIsLever) {
        lastRows.push({ label: 'Temp', value: lastTemp !== undefined ? `${lastTemp} \u00b0C` : '\u2014' });
    }

    const nextRows: RowSpec[] = suggestion ? [
        { label: 'Dose', value: grams(lastShot.doseIn) },
        { label: 'Grind', value: <>{suggestion.grindSize}{diffTag(suggestion.grindDiff)}</> },
        { label: outLabel, value: <>{hasDose ? grams(suggestion.doseOut ?? lastShot.doseOut) : '\u2014'}{diffTag(suggestion.yieldDiff)}</> },
        { label: 'Time', value: targetTimeLabel(method) },
    ] : [];
    if (suggestion && tempIsLever) {
        nextRows.push({ label: 'Temp', value: <>{suggestion.waterTempC} &deg;C{diffTag(suggestion.tempDiff)}</> });
    }

    // No suggestion means the last shot landed in the sweet spot, so "try next"
    // is the recipe to repeat rather than a change.
    const repeatRows: RowSpec[] = [...lastRows.slice(0, 3), { label: 'Time', value: targetTimeLabel(method) },
        ...(tempIsLever ? [lastRows[4]] : [])];

    return (
        <>
            <div className={`barista-tip barista-tip--${config.colorClass}`}>
                <span className="barista-tip__icon">
                    <TipIcon />
                </span>
                <div className="barista-tip__content">
                    <h4>
                        Tip for "{lastShot.beanName}"
                        {tip.adjustment !== 'none' && (
                            <span className={`adjustment-badge adjustment-badge--${tip.adjustment}`}>
                                {tip.adjustment === 'large' ? 'Major Adj.' : 'Minor Adj.'}
                            </span>
                        )}
                    </h4>
                    <p>{tip.message}</p>
                </div>
            </div>

            {recipeLabel && (
                <p className="dial-compare__recipe">
                    <span className="dial-compare__recipe-label">Recipe</span>
                    {recipeLabel}
                </p>
            )}

            <div className="dial-compare">
                <div className="dial-compare__col">
                    <div className="dial-compare__head">
                        <span className="dial-compare__title">Last tried</span>
                        <span
                            className="dial-compare__rating"
                            style={{ color: ratingColors[lastShot.rating] }}
                        >
                            {lastShot.rating}
                        </span>
                    </div>
                    <CompareRows rows={lastRows} />
                </div>

                <div className="dial-compare__arrow" aria-hidden="true">&rarr;</div>

                <div className="dial-compare__col dial-compare__col--proposed">
                    <div className="dial-compare__head">
                        <span className="dial-compare__title">Try next</span>
                        <Icons.Target />
                    </div>
                    <CompareRows rows={suggestion ? nextRows : repeatRows} />
                </div>
            </div>

            {suggestion?.reason && (
                <p className="suggested-settings__reason">{suggestion.reason}</p>
            )}

            {suggestion?.advice && (
                <p className="suggested-settings__advice">
                    <Icons.Lightbulb /> {suggestion.advice}
                </p>
            )}
            {!suggestion && (
                <p className="suggested-settings__reason">
                    That one landed balanced at the strength you wanted. Repeat these settings.
                </p>
            )}

            {/* The form is filled automatically when a bean and method are
                chosen; this is the way back after fiddling with the dials. It
                shows at a sweet spot too, where there is no suggestion but the
                settings to repeat are exactly the ones above. */}
            <button
                className="btn-apply-suggestion"
                onClick={onApply}
                title="Load these settings into the form"
                type="button"
            >
                <Icons.Zap /> {suggestion ? 'Apply to form' : 'Reload these settings'}
            </button>

        </>
    );
}
