import type { ShotLog, Rating, BrewMethod } from '../types';
import type { SuggestedSettings } from '../lib/suggestions';
import { getBaristaTip } from '../lib/suggestions';
import { yieldLabel, formatDuration, targetTimeLabel } from '../lib/brew';
import { STRENGTHS } from '../constants';
import ExtractionCompass from './ExtractionCompass';
import Icons from './Icons';

interface SuggestionCardProps {
    lastShot: ShotLog | null;
    suggestion: SuggestedSettings | null;
    shotsForBean: ShotLog[];
    beanName: string;
    method: BrewMethod;
    ratingConfig: Record<Rating, { icon: () => React.JSX.Element; colorClass: string }>;
    ratingColors: Record<Rating, string>;
    onApply: () => void;
}

const diffLabel = (n: number) => `${n > 0 ? '+' : ''}${n}`;

export default function SuggestionCard({
    lastShot,
    suggestion,
    shotsForBean,
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
    const doseLabel = yieldLabel(lastShot.method) === 'Out (g)' ? 'Dose / Out' : 'Dose / Water';

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
                    <dl className="dial-compare__rows">
                        <div><dt>Grind</dt><dd>{lastGrind}</dd></div>
                        <div><dt>Temp</dt><dd>{lastTemp !== undefined ? `${lastTemp} °C` : '—'}</dd></div>
                        <div>
                            <dt>{doseLabel}</dt>
                            <dd>{hasDose ? `${lastShot.doseIn}g → ${lastShot.doseOut}g` : '—'}</dd>
                        </div>
                        <div>
                            <dt>Time</dt>
                            <dd>{lastShot.extractionTime !== undefined ? formatDuration(lastShot.extractionTime) : '—'}</dd>
                        </div>
                    </dl>
                </div>

                <div className="dial-compare__arrow" aria-hidden="true">&rarr;</div>

                <div className="dial-compare__col dial-compare__col--proposed">
                    <div className="dial-compare__head">
                        <span className="dial-compare__title">Try next</span>
                        <Icons.Target />
                    </div>
                    {suggestion ? (
                        <dl className="dial-compare__rows">
                            <div>
                                <dt>Grind</dt>
                                <dd>
                                    {suggestion.grindSize}
                                    {suggestion.grindDiff !== 0 && (
                                        <span className={`dial-compare__diff ${suggestion.grindDiff > 0 ? 'diff--coarser' : 'diff--finer'}`}>
                                            {diffLabel(suggestion.grindDiff)}
                                        </span>
                                    )}
                                </dd>
                            </div>
                            <div>
                                <dt>Temp</dt>
                                <dd>
                                    {suggestion.waterTempC} &deg;C
                                    {suggestion.tempDiff !== 0 && (
                                        <span className={`dial-compare__diff ${suggestion.tempDiff > 0 ? 'diff--coarser' : 'diff--finer'}`}>
                                            {diffLabel(suggestion.tempDiff)}
                                        </span>
                                    )}
                                </dd>
                            </div>
                            <div>
                                <dt>{doseLabel}</dt>
                                <dd>
                                    {hasDose
                                        ? `${lastShot.doseIn}g → ${suggestion.doseOut ?? lastShot.doseOut}g`
                                        : '—'}
                                    {suggestion.yieldDiff !== 0 && (
                                        <span className={`dial-compare__diff ${suggestion.yieldDiff > 0 ? 'diff--coarser' : 'diff--finer'}`}>
                                            {diffLabel(suggestion.yieldDiff)}
                                        </span>
                                    )}
                                </dd>
                            </div>
                            <div>
                                <dt>Time</dt>
                                <dd>{targetTimeLabel(method)}</dd>
                            </div>
                        </dl>
                    ) : (
                        <dl className="dial-compare__rows">
                            <div><dt>Grind</dt><dd>{lastGrind}</dd></div>
                            <div><dt>Temp</dt><dd>{lastTemp !== undefined ? `${lastTemp} °C` : '—'}</dd></div>
                            <div>
                                <dt>{doseLabel}</dt>
                                <dd>{hasDose ? `${lastShot.doseIn}g → ${lastShot.doseOut}g` : '—'}</dd>
                            </div>
                            <div><dt>Time</dt><dd>{targetTimeLabel(method)}</dd></div>
                        </dl>
                    )}
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

            {suggestion && (
                <button
                    className="btn-apply-suggestion"
                    onClick={onApply}
                    title="Load these settings into the form"
                    type="button"
                >
                    <Icons.Zap /> Apply to form
                </button>
            )}

            {shotsForBean.length > 1 && (
                <div className="dialin-journey">
                    <div className="dialin-journey__label">
                        <Icons.TrendingUp /> Recent Journey
                        <span className="dialin-journey__dir">oldest to newest</span>
                    </div>
                    <ExtractionCompass shots={[...shotsForBean].slice(0, 5).reverse()} />
                    <div className="journey-rows">
                        {shotsForBean.slice(0, 5).reverse().map((shot, idx) => {
                            const shotConfig = shot.rating ? ratingConfig[shot.rating] : null;
                            const strengthTone = STRENGTHS.find(x => x.value === shot.strength);
                            const parts = [`G${shot.grindSize}`];
                            if (shot.doseIn !== undefined && shot.doseOut !== undefined) {
                                parts.push(`${shot.doseIn}\u2192${shot.doseOut}g`);
                            }
                            if (shot.extractionTime !== undefined) {
                                parts.push(formatDuration(shot.extractionTime));
                            }
                            return (
                                <div key={shot.id} className="journey-row">
                                    <span className="journey-row__n">{idx + 1}</span>
                                    <span
                                        className={`journey-row__taste ${shotConfig ? `journey-row__taste--${shotConfig.colorClass}` : 'journey-row__taste--unrated'}`}
                                        style={shot.rating ? { color: ratingColors[shot.rating] } : undefined}
                                    >
                                        {shot.rating ?? 'Not rated'}
                                    </span>
                                    <span className="journey-row__tried">{parts.join(' \u00b7 ')}</span>
                                    <span className={`journey-row__strength journey-row__strength--${strengthTone?.tone ?? 'target'}`}>
                                        {strengthTone?.label}
                                    </span>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}
        </>
    );
}
