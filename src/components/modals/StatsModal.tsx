import type { ShotLog, BeanProfile, CaffeineEntry } from '../../types';
import { RATINGS, RATING_COLORS } from '../../constants';
import { computeStats } from '../../lib/stats';
import { formatDuration } from '../../lib/brew';
import { useFocusTrap } from '../../hooks';
import Icons from '../Icons';

interface StatsModalProps {
    open: boolean;
    shots: ShotLog[];
    beans: BeanProfile[];
    intake: CaffeineEntry[];
    onClose: () => void;
}

const kg = (g: number) => (g >= 1000 ? `${(g / 1000).toFixed(2)} kg` : `${Math.round(g)} g`);
// Caffeine is stored in milligrams; a lifetime total runs to grams.
const caffeine = (mg: number) => (mg >= 1000 ? `${(mg / 1000).toFixed(1)} g` : `${Math.round(mg)} mg`);

export default function StatsModal({ open, shots, beans, intake, onClose }: StatsModalProps) {
    const modalRef = useFocusTrap<HTMLDivElement>();
    if (!open) return null;
    const stats = computeStats(shots, beans, intake);

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div
                ref={modalRef}
                className="modal modal--large"
                onClick={(e) => e.stopPropagation()}
                role="dialog"
                aria-modal="true"
                aria-labelledby="stats-modal-title"
            >
                <div className="modal__header">
                    <h3 id="stats-modal-title"><Icons.PieChart /> Statistics</h3>
                    <button className="modal__close" aria-label="Close" onClick={onClose}>
                        <Icons.X />
                    </button>
                </div>
                <div className="modal__body">
                    {stats.totalShots === 0 ? (
                        <div className="empty-state">
                            <Icons.BarChart />
                            <p className="empty-state__text">Log some shots to see your statistics!</p>
                        </div>
                    ) : (
                        <>
                            {stats.medianShotsToDialIn !== null && (
                                <div className="stat-hero">
                                    <div className="stat-hero__value">{stats.medianShotsToDialIn}</div>
                                    <div className="stat-hero__label">Shots to dial in</div>
                                    <div className="stat-hero__context">
                                        median across {stats.dialInSamples} bean and method pairing
                                        {stats.dialInSamples === 1 ? '' : 's'} you have dialled in
                                    </div>
                                </div>
                            )}

                            <div className="stats-summary">
                                <div className="stat-card">
                                    <div className="stat-card__value">{stats.totalShots}</div>
                                    <div className="stat-card__label">Total Brews</div>
                                </div>
                                <div className="stat-card">
                                    <div className="stat-card__value">{kg(stats.totalGroundG)}</div>
                                    <div className="stat-card__label">Coffee Ground</div>
                                </div>
                                <div className="stat-card">
                                    <div className="stat-card__value">{caffeine(stats.totalCaffeineMg)}</div>
                                    <div className="stat-card__label">Caffeine</div>
                                </div>
                                {stats.avgScore !== null && (
                                    <div className="stat-card stat-card--accent">
                                        <div className="stat-card__value">{stats.avgScore}</div>
                                        <div className="stat-card__label">Avg Score / 5</div>
                                    </div>
                                )}
                                <div className="stat-card">
                                    <div className="stat-card__value">{stats.sweetSpotRate}%</div>
                                    <div className="stat-card__label">Sweet Spot Rate</div>
                                </div>
                                <div className="stat-card">
                                    <div className="stat-card__value">{stats.shotsThisWeek}</div>
                                    <div className="stat-card__label">This Week</div>
                                </div>
                            </div>

                            {stats.shotsMissingDose > 0 && (
                                <p className="stats-caveat">
                                    {stats.shotsMissingDose} brew{stats.shotsMissingDose === 1 ? '' : 's'} carry
                                    no dose, so the coffee-ground total is a floor, not the whole story.
                                </p>
                            )}

                            {stats.windows.length > 0 && (
                                <div className="stats-section">
                                    <h4>Your sweet spot, per method</h4>
                                    <p className="stats-section__note">
                                        From the brews you rated Balanced. Grind is one continuous scale, so
                                        these are kept apart rather than averaged into a setting for neither.
                                    </p>
                                    <div className="scroll-x">
                                        <table className="guide__table">
                                            <thead>
                                                <tr>
                                                    <th>Method</th><th>n</th><th>Grind</th><th>Ratio</th><th>Time</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {stats.windows.map(w => (
                                                    <tr key={w.method}>
                                                        <td>{w.method}</td>
                                                        <td>{w.balanced}</td>
                                                        <td>
                                                            {w.grindTypical}
                                                            {w.grind && w.grind[0] !== w.grind[1] && (
                                                                <span className="stats-range"> {w.grind[0]}&ndash;{w.grind[1]}</span>
                                                            )}
                                                        </td>
                                                        <td>
                                                            {w.ratioTypical !== null ? `1:${w.ratioTypical.toFixed(1)}` : '—'}
                                                        </td>
                                                        <td>
                                                            {w.timeTypical !== null ? formatDuration(w.timeTypical) : '—'}
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )}

                            {stats.bestBeans.length > 0 && (
                                <div className="stats-section">
                                    <h4>Best rated beans</h4>
                                    <p className="stats-section__note">Average score, two brews minimum.</p>
                                    <div className="bar-chart">
                                        {stats.bestBeans.map(b => (
                                            <div key={b.bean} className="bar-chart__row">
                                                <div className="bar-chart__label bar-chart__label--bean">{b.bean}</div>
                                                <div className="bar-chart__bar-wrap">
                                                    <div
                                                        className="bar-chart__bar bar-chart__bar--caramel"
                                                        style={{ width: `${(b.avgScore / 5) * 100}%` }}
                                                    />
                                                </div>
                                                <div className="bar-chart__value">{b.avgScore}</div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {stats.bestRoasters.length > 0 && (
                                <div className="stats-section">
                                    <h4>Roasters by average score</h4>
                                    <div className="bar-chart">
                                        {stats.bestRoasters.map(r => (
                                            <div key={r.bean} className="bar-chart__row">
                                                <div className="bar-chart__label bar-chart__label--bean">
                                                    {r.bean} <span className="stats-range">{r.shots}</span>
                                                </div>
                                                <div className="bar-chart__bar-wrap">
                                                    <div
                                                        className="bar-chart__bar bar-chart__bar--muted"
                                                        style={{ width: `${(r.avgScore / 5) * 100}%` }}
                                                    />
                                                </div>
                                                <div className="bar-chart__value">{r.avgScore}</div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {stats.topBeans.length > 0 && (
                                <div className="stats-section">
                                    <h4>Most brewed</h4>
                                    <div className="bar-chart bar-chart--beans">
                                        {stats.topBeans.map(([bean, count]) => (
                                            <div key={bean} className="bar-chart__row">
                                                <div className="bar-chart__label bar-chart__label--bean">{bean}</div>
                                                <div className="bar-chart__bar-wrap">
                                                    <div
                                                        className="bar-chart__bar bar-chart__bar--caramel"
                                                        style={{ width: `${(count / stats.maxBeanCount) * 100}%` }}
                                                    />
                                                </div>
                                                <div className="bar-chart__value">{count}</div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            <div className="stats-section">
                                <h4>Taste distribution</h4>
                                <div className="bar-chart">
                                    {RATINGS.map((r) => (
                                        <div key={r} className="bar-chart__row">
                                            <div className="bar-chart__label">{r}</div>
                                            <div className="bar-chart__bar-wrap">
                                                <div
                                                    className="bar-chart__bar"
                                                    style={{
                                                        width: `${(stats.ratingCounts[r] / stats.maxRatingCount) * 100}%`,
                                                        backgroundColor: RATING_COLORS[r],
                                                    }}
                                                />
                                            </div>
                                            <div className="bar-chart__value">{stats.ratingCounts[r]}</div>
                                        </div>
                                    ))}
                                </div>
                                <p className="stats-section__note">
                                    {stats.successRate}% of your {stats.ratedShots} rated brews landed Balanced.
                                    {' '}{stats.sweetSpotRate}% were Balanced <em>and</em> the strength you wanted.
                                </p>
                            </div>

                            {stats.avgTimeByMethod.length > 0 && (
                                <div className="stats-section">
                                    <h4>Average brew time</h4>
                                    <div className="stats-inline">
                                        {stats.avgTimeByMethod.map(([method, secs]) => (
                                            <span key={method}>
                                                <strong>{method}</strong> {formatDuration(secs)}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {stats.showBrewBreakdown && (
                                <div className="stats-section">
                                    <h4>Brews by type</h4>
                                    <div className="bar-chart">
                                        {stats.brewEntries.map(([brew, count]) => (
                                            <div key={brew} className="bar-chart__row">
                                                <div className="bar-chart__label">{brew}</div>
                                                <div className="bar-chart__bar-wrap">
                                                    <div
                                                        className="bar-chart__bar bar-chart__bar--muted"
                                                        style={{ width: `${(count / stats.maxBrewCount) * 100}%` }}
                                                    />
                                                </div>
                                                <div className="bar-chart__value">{count}</div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {stats.hasWeekData && (
                                <div className="stats-section">
                                    <h4>Last 7 days</h4>
                                    <div className="success-chart">
                                        {stats.days.map((d, idx) => (
                                            <div key={idx} className="success-chart__day">
                                                <div className="success-chart__bars">
                                                    <div
                                                        className="success-chart__bar success-chart__bar--total"
                                                        style={{ height: `${(d.total / stats.maxDayTotal) * 100}%` }}
                                                        title={`${d.total} total`}
                                                    />
                                                    <div
                                                        className="success-chart__bar success-chart__bar--balanced"
                                                        style={{ height: `${(d.balanced / stats.maxDayTotal) * 100}%` }}
                                                        title={`${d.balanced} balanced`}
                                                    />
                                                </div>
                                                <span className="success-chart__label">{d.date}</span>
                                                <span className="success-chart__rate">
                                                    {d.total > 0 ? Math.round((d.balanced / d.total) * 100) : 0}%
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
