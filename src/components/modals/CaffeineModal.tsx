import { useState } from 'react';
import type { ShotLog, CaffeineEntry, CaffeinePrefs } from '../../types';
import {
    computeCaffeine, computeForecast, allDoses, includedShots,
    caffeineForBasket, resolveTimeToday,
    INTAKE_PRESETS, QUICK_ADD_PRESETS,
} from '../../lib/caffeine';
import { describeBrew } from '../../lib/brew';
import { generateId } from '../../lib/format';
import { useFocusTrap } from '../../hooks';
import CaffeineCurve from '../CaffeineCurve';
import Icons from '../Icons';

interface CaffeineModalProps {
    open: boolean;
    shots: ShotLog[];
    intake: CaffeineEntry[];
    prefs: CaffeinePrefs;
    setPref: <K extends keyof CaffeinePrefs>(key: K, value: CaffeinePrefs[K]) => void;
    onAddIntake: (entry: CaffeineEntry) => void;
    onDeleteIntake: (id: string) => void;
    onUpdateIntake: (entry: CaffeineEntry) => void;
    excludedShots: Set<string>;
    onExcludeShot: (id: string) => void;
    onRestoreShot: (id: string) => void;
    onClose: () => void;
}

// One row in the intake list: either a logged shot or a manual drink.
interface DoseRow {
    key: string;
    kind: 'shot' | 'entry';
    id: string;
    label: string;
    mg: number;
    at: Date;
}

// Sentinel for the "type your own" option in the drink dropdown.
const CUSTOM = '__custom__';

// The list shows what is still moving the curve. A brew from last week is
// pharmacologically gone and belongs in Shot History, not here; with a whole
// logbook imported it would otherwise bury today's drinks entirely.
const RECENT_HOURS = 24;

const clock = (d: Date) =>
    `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;

// Same day label the curve uses, so a row from yesterday is obvious.
const dayLabel = (d: Date, now: Date): string => {
    const a = new Date(d); a.setHours(0, 0, 0, 0);
    const b = new Date(now); b.setHours(0, 0, 0, 0);
    const days = Math.round((b.getTime() - a.getTime()) / 86_400_000);
    if (days === 0) return '';
    if (days === 1) return 'yesterday';
    return `${days}d ago`;
};

export default function CaffeineModal({
    open, shots, intake, prefs, setPref, onAddIntake, onDeleteIntake, onUpdateIntake,
    excludedShots, onExcludeShot, onRestoreShot, onClose,
}: CaffeineModalProps) {
    const modalRef = useFocusTrap<HTMLDivElement>();
    const [addOpen, setAddOpen] = useState(false);
    const [preset, setPreset] = useState<string>(INTAKE_PRESETS[0].label); // CUSTOM = own drink
    const [customLabel, setCustomLabel] = useState('');
    const [mg, setMg] = useState(String(INTAKE_PRESETS[0].mg));
    const [when, setWhen] = useState(() => clock(new Date()));
    const [showExcluded, setShowExcluded] = useState(false);
    const [showOlder, setShowOlder] = useState(false);
    const [editingTime, setEditingTime] = useState<string | null>(null);
    const [timeDraft, setTimeDraft] = useState('');

    if (!open) return null;

    const now = new Date();
    const counted = includedShots(shots, excludedShots);
    const daily = computeCaffeine(counted, intake);
    const forecast = computeForecast(allDoses(counted, intake), prefs, now);

    const quickAdd = (presetLabel: string, presetMg: number) => {
        onAddIntake({ id: generateId(), label: presetLabel, mg: presetMg, timestamp: new Date() });
    };

    const isCustom = preset === CUSTOM;
    const entryLabel = isCustom ? customLabel.trim() : preset;
    const mgValue = parseFloat(mg);
    const canSubmit = entryLabel !== '' && Number.isFinite(mgValue) && mgValue >= 0;

    const submitEntry = () => {
        if (!canSubmit) return;
        onAddIntake({
            id: generateId(),
            label: entryLabel,
            mg: mgValue,
            timestamp: resolveTimeToday(when, new Date()),
        });
        setAddOpen(false);
        setCustomLabel('');
        setWhen(clock(new Date()));
    };

    // Only a manual drink's time is editable here. A shot's time belongs to the
    // shot itself, and is changed by editing it from the history.
    const commitTime = (id: string) => {
        const entry = intake.find(e => e.id === id);
        if (entry && /^\d{1,2}:\d{2}$/.test(timeDraft)) {
            const at = resolveTimeToday(timeDraft, new Date());
            if (at.getTime() !== entry.timestamp.getTime()) {
                onUpdateIntake({ ...entry, timestamp: at });
            }
        }
        setEditingTime(null);
    };

    // Shots and manual drinks in one list, newest first, so everything feeding
    // the curve has a visible row.
    const shotRows: DoseRow[] = shots
        .filter(s => !excludedShots.has(s.id))
        .map(s => ({
            key: `shot:${s.id}`,
            kind: 'shot' as const,
            id: s.id,
            label: `${s.beanName} (${describeBrew(s)})`,
            mg: caffeineForBasket(s.basket),
            at: new Date(s.timestamp),
        }));

    const entryRows: DoseRow[] = intake.map(e => ({
        key: `entry:${e.id}`,
        kind: 'entry' as const,
        id: e.id,
        label: e.label,
        mg: e.mg,
        at: new Date(e.timestamp),
    }));

    const ordered = [...shotRows, ...entryRows].sort((a, b) => b.at.getTime() - a.at.getTime());
    const cutoff = now.getTime() - RECENT_HOURS * 60 * 60 * 1000;
    const rows = ordered.filter(r => r.at.getTime() >= cutoff);
    const olderRows = ordered.filter(r => r.at.getTime() < cutoff).slice(0, 20);
    const olderCount = ordered.length - rows.length;

    const excludedRows = shots
        .filter(s => excludedShots.has(s.id))
        .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div
                ref={modalRef}
                className="modal modal--caffeine"
                onClick={e => e.stopPropagation()}
                role="dialog"
                aria-modal="true"
                aria-labelledby="caffeine-modal-title"
            >
                <div className="modal__header">
                    <h2 id="caffeine-modal-title"><Icons.Caffeine /> Caffeine</h2>
                    <button className="modal__close" aria-label="Close" onClick={onClose}>
                        <Icons.X />
                    </button>
                </div>
                <div className="modal__body">
                    <div className={`caffeine-banner caffeine-banner--${forecast.meetsTarget ? 'ok' : 'alert'}`}>
                        <span className="caffeine-banner__icon" aria-hidden="true">
                            {forecast.meetsTarget ? '✓' : '!'}
                        </span>
                        <span>
                            {forecast.meetsTarget ? (
                                <>
                                    You&apos;ll be at <strong>{Math.round(forecast.bedtimeMg)} mg</strong> at bedtime,
                                    under your {prefs.targetMg} mg target
                                    {forecast.alreadyUnderTarget && forecast.underTargetAt
                                        ? ` (already dropped below at ${clock(forecast.underTargetAt)})`
                                        : ''}.
                                </>
                            ) : (
                                <>
                                    You&apos;ll still have <strong>{Math.round(forecast.bedtimeMg)} mg</strong> at bedtime,
                                    above your {prefs.targetMg} mg target
                                    {forecast.underTargetAt
                                        ? <> &mdash; it drops below around <strong>{clock(forecast.underTargetAt)}</strong>.</>
                                        : <> &mdash; it won&apos;t clear within 48h.</>}
                                </>
                            )}
                        </span>
                    </div>

                    <div className="caffeine-forecast">
                        <div className="caffeine-forecast__stat">
                            <span className="caffeine-forecast__value">{Math.round(forecast.nowMg)}</span>
                            <span className="caffeine-forecast__label">In system now (mg)</span>
                        </div>
                        <div className={`caffeine-forecast__stat ${forecast.meetsTarget ? 'caffeine-forecast__stat--ok' : 'caffeine-forecast__stat--alert'}`}>
                            <span className="caffeine-forecast__value">{Math.round(forecast.bedtimeMg)}</span>
                            <span className="caffeine-forecast__label">At bedtime (mg)</span>
                        </div>
                        <div className="caffeine-forecast__stat">
                            <span className="caffeine-forecast__value">
                                {forecast.underTargetAt ? clock(forecast.underTargetAt) : '—'}
                            </span>
                            <span className="caffeine-forecast__label">Under target by</span>
                        </div>
                        <div className="caffeine-forecast__stat">
                            <span className="caffeine-forecast__value">{Math.round(forecast.peakMg)}</span>
                            <span className="caffeine-forecast__label">Peak level (mg)</span>
                        </div>
                    </div>

                    <CaffeineCurve
                        curve={forecast.curve}
                        targetMg={prefs.targetMg}
                        bedtimeAt={forecast.bedtimeAt}
                        now={now}
                    />
                    <div className="caffeine-legend">
                        <span><i className="caffeine-legend__swatch caffeine-legend__swatch--level" /> Level</span>
                        <span><i className="caffeine-legend__swatch caffeine-legend__swatch--target" /> Target</span>
                        <span><i className="caffeine-legend__swatch caffeine-legend__swatch--bedtime" /> Bedtime</span>
                        <span><i className="caffeine-legend__swatch caffeine-legend__swatch--now" /> Now</span>
                    </div>

                    <div className="caffeine-section">
                        <h3>Parameters</h3>
                        <div className="caffeine-params">
                            <div className="form-group">
                                <label className="form-label" htmlFor="caffeine-halflife">Half-life (h)</label>
                                <input
                                    id="caffeine-halflife"
                                    type="number"
                                    inputMode="decimal"
                                    min="1"
                                    max="24"
                                    step="0.1"
                                    className="form-input form-input--sm"
                                    value={prefs.halfLifeHours}
                                    onChange={(e) => {
                                        const v = parseFloat(e.target.value);
                                        if (Number.isFinite(v) && v > 0) setPref('halfLifeHours', v);
                                    }}
                                />
                            </div>
                            <div className="form-group">
                                <label className="form-label" htmlFor="caffeine-bedtime">Bedtime</label>
                                <input
                                    id="caffeine-bedtime"
                                    type="time"
                                    className="form-input form-input--sm"
                                    value={prefs.bedtime}
                                    onChange={(e) => e.target.value && setPref('bedtime', e.target.value)}
                                />
                            </div>
                            <div className="form-group">
                                <label className="form-label" htmlFor="caffeine-target">Target at bedtime (mg)</label>
                                <input
                                    id="caffeine-target"
                                    type="number"
                                    inputMode="numeric"
                                    min="0"
                                    step="5"
                                    className="form-input form-input--sm"
                                    value={prefs.targetMg}
                                    onChange={(e) => {
                                        const v = parseFloat(e.target.value);
                                        if (Number.isFinite(v) && v >= 0) setPref('targetMg', v);
                                    }}
                                />
                            </div>
                        </div>
                    </div>

                    <div className="caffeine-section">
                        <h3>Intake</h3>
                        <p className="caffeine-section__note">
                            The last {RECENT_HOURS} hours, which is what still moves the curve.
                            Logged brews appear automatically; removing one stops it counting
                            toward caffeine and leaves the shot in your history.
                        </p>

                        <div className="caffeine-quick">
                            {QUICK_ADD_PRESETS.map(q => (
                                <button
                                    key={q.label}
                                    type="button"
                                    className="caffeine-quick__btn"
                                    onClick={() => quickAdd(q.label, q.mg)}
                                >
                                    {q.label}
                                    <span className="caffeine-quick__mg">{q.mg} mg &middot; now</span>
                                </button>
                            ))}
                            <button
                                type="button"
                                className="caffeine-quick__btn caffeine-quick__btn--ghost"
                                onClick={() => { setWhen(clock(new Date())); setAddOpen(v => !v); }}
                                aria-expanded={addOpen}
                            >
                                {addOpen ? 'Cancel' : '+ Add drink'}
                            </button>
                        </div>

                        {addOpen && (
                            <div className="caffeine-add">
                                <div className="form-group">
                                    <label className="form-label" htmlFor="intake-preset">Drink</label>
                                    <div className="select-wrap">
                                        <select
                                            id="intake-preset"
                                            className="form-select"
                                            value={preset}
                                            onChange={(e) => {
                                                const next = e.target.value;
                                                setPreset(next);
                                                const found = INTAKE_PRESETS.find(p => p.label === next);
                                                if (found) setMg(String(found.mg));
                                            }}
                                        >
                                            {INTAKE_PRESETS.map(p => (
                                                <option key={p.label} value={p.label}>{p.label}</option>
                                            ))}
                                            <option value={CUSTOM}>Custom&hellip;</option>
                                        </select>
                                        <Icons.ChevronDown />
                                    </div>
                                </div>

                                {isCustom && (
                                    <div className="form-group">
                                        <label className="form-label" htmlFor="intake-custom">Drink name</label>
                                        <input
                                            id="intake-custom"
                                            type="text"
                                            className="form-input"
                                            placeholder="e.g. Matcha latte"
                                            value={customLabel}
                                            onChange={(e) => setCustomLabel(e.target.value)}
                                            autoFocus
                                        />
                                    </div>
                                )}
                                <div className="caffeine-add__row">
                                    <div className="form-group">
                                        <label className="form-label" htmlFor="intake-mg">Caffeine (mg)</label>
                                        <input
                                            id="intake-mg"
                                            type="number"
                                            inputMode="decimal"
                                            min="0"
                                            step="5"
                                            className="form-input form-input--sm"
                                            value={mg}
                                            onChange={(e) => setMg(e.target.value)}
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label" htmlFor="intake-when">Time</label>
                                        <input
                                            id="intake-when"
                                            type="time"
                                            className="form-input form-input--sm"
                                            value={when}
                                            onChange={(e) => setWhen(e.target.value)}
                                        />
                                    </div>
                                </div>
                                <button
                                    type="button"
                                    className="btn-submit"
                                    onClick={submitEntry}
                                    disabled={!canSubmit}
                                >
                                    Log drink
                                </button>
                            </div>
                        )}

                        {rows.length > 0 ? (
                            <div className="caffeine-intake-list">
                                {rows.map(row => {
                                    const day = dayLabel(row.at, now);
                                    return (
                                        <div key={row.key} className="caffeine-intake-row">
                                            {row.kind === 'shot' && (
                                                <span className="caffeine-intake-row__tag" title="From your shot log">
                                                    Shot
                                                </span>
                                            )}
                                            <span className="caffeine-intake-row__label">{row.label}</span>
                                            <span className="caffeine-intake-row__meta">
                                                {row.mg} mg &middot;{' '}
                                                {row.kind === 'entry' && editingTime === row.id ? (
                                                    <input
                                                        type="time"
                                                        className="caffeine-intake-row__time-input"
                                                        value={timeDraft}
                                                        autoFocus
                                                        aria-label={`Time for ${row.label}`}
                                                        onChange={(e) => setTimeDraft(e.target.value)}
                                                        onBlur={() => commitTime(row.id)}
                                                        onKeyDown={(e) => {
                                                            if (e.key === 'Enter') { e.preventDefault(); commitTime(row.id); }
                                                            else if (e.key === 'Escape') setEditingTime(null);
                                                        }}
                                                    />
                                                ) : row.kind === 'entry' ? (
                                                    <button
                                                        type="button"
                                                        className="caffeine-intake-row__time"
                                                        onClick={() => { setTimeDraft(clock(row.at)); setEditingTime(row.id); }}
                                                        title="Change the time"
                                                    >
                                                        {clock(row.at)}
                                                    </button>
                                                ) : clock(row.at)}
                                                {day && <span className="caffeine-intake-row__day"> {day}</span>}
                                            </span>
                                            <button
                                                className="caffeine-intake-row__delete"
                                                onClick={() => row.kind === 'shot'
                                                    ? onExcludeShot(row.id)
                                                    : onDeleteIntake(row.id)}
                                                title={row.kind === 'shot'
                                                    ? 'Stop counting this shot toward caffeine'
                                                    : `Remove ${row.label}`}
                                                aria-label={row.kind === 'shot'
                                                    ? `Stop counting ${row.label} toward caffeine`
                                                    : `Remove ${row.label}`}
                                            >
                                                <Icons.Trash />
                                            </button>
                                        </div>
                                    );
                                })}
                            </div>
                        ) : (
                            <p className="caffeine-section__note">
                                {olderCount > 0
                                    ? `Nothing in the last ${RECENT_HOURS} hours.`
                                    : 'Nothing counting toward caffeine yet.'}
                            </p>
                        )}

                        {olderCount > 0 && (
                            <div className="caffeine-excluded">
                                <button
                                    type="button"
                                    className="caffeine-excluded__toggle"
                                    onClick={() => setShowOlder(v => !v)}
                                    aria-expanded={showOlder}
                                >
                                    {olderCount} earlier brew{olderCount === 1 ? '' : 's'}, no longer in your system
                                    <span className="caffeine-excluded__chev">{showOlder ? 'Hide' : 'Show'}</span>
                                </button>
                                {showOlder && (
                                    <div className="caffeine-intake-list">
                                        {olderRows.map(row => (
                                            <div key={row.key} className="caffeine-intake-row caffeine-intake-row--excluded">
                                                <span className="caffeine-intake-row__label">{row.label}</span>
                                                <span className="caffeine-intake-row__meta">
                                                    {row.mg} mg &middot; {dayLabel(row.at, now) || clock(row.at)}
                                                </span>
                                            </div>
                                        ))}
                                        {olderCount > olderRows.length && (
                                            <p className="caffeine-section__note">
                                                and {olderCount - olderRows.length} more, in Shot History.
                                            </p>
                                        )}
                                    </div>
                                )}
                            </div>
                        )}

                        {excludedRows.length > 0 && (
                            <div className="caffeine-excluded">
                                <button
                                    type="button"
                                    className="caffeine-excluded__toggle"
                                    onClick={() => setShowExcluded(v => !v)}
                                    aria-expanded={showExcluded}
                                >
                                    {excludedRows.length} shot{excludedRows.length === 1 ? '' : 's'} not counted
                                    <span className="caffeine-excluded__chev">{showExcluded ? 'Hide' : 'Show'}</span>
                                </button>
                                {showExcluded && (
                                    <div className="caffeine-intake-list">
                                        {excludedRows.map(s => (
                                            <div key={s.id} className="caffeine-intake-row caffeine-intake-row--excluded">
                                                <span className="caffeine-intake-row__label">
                                                    {s.beanName} ({describeBrew(s)})
                                                </span>
                                                <span className="caffeine-intake-row__meta">
                                                    {caffeineForBasket(s.basket)} mg &middot; {clock(s.timestamp)}
                                                </span>
                                                <button
                                                    className="caffeine-intake-row__restore"
                                                    onClick={() => onRestoreShot(s.id)}
                                                    title="Count this shot again"
                                                >
                                                    Restore
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    <div className="caffeine-section">
                        <h3>Today</h3>
                        <div className="caffeine-stats">
                            <div className="caffeine-stat">
                                <span className="caffeine-stat__value">{daily.todayCaffeine}</span>
                                <span className="caffeine-stat__label">Consumed (mg)</span>
                            </div>
                            <div className="caffeine-stat">
                                <span className="caffeine-stat__value">{daily.todayShotCount}</span>
                                <span className="caffeine-stat__label">Shots Today</span>
                            </div>
                            <div className="caffeine-stat">
                                <span className="caffeine-stat__value">{daily.avgDaily}</span>
                                <span className="caffeine-stat__label">Daily Avg (mg)</span>
                            </div>
                        </div>
                        <p className="caffeine-limit">
                            {daily.statusText}. Recommended daily limit: <strong>{daily.dailyLimit} mg</strong>.
                        </p>
                    </div>

                    <p className="caffeine-disclaimer">
                        Estimates only. Caffeine metabolism varies with genetics, liver enzyme activity,
                        pregnancy, smoking, and medication. Not medical advice.
                    </p>
                </div>
            </div>
        </div>
    );
}
