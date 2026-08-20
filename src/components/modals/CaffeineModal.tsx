import { useState } from 'react';
import type { ShotLog, CaffeineEntry, CaffeinePrefs } from '../../types';
import {
    computeCaffeine, computeForecast, allDoses,
    INTAKE_PRESETS, QUICK_ADD_PRESETS,
} from '../../lib/caffeine';
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
    onClose: () => void;
}

const clock = (d: Date) =>
    `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;

function toLocalInput(d: Date): string {
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function CaffeineModal({
    open, shots, intake, prefs, setPref, onAddIntake, onDeleteIntake, onClose,
}: CaffeineModalProps) {
    const modalRef = useFocusTrap<HTMLDivElement>();
    const [addOpen, setAddOpen] = useState(false);
    const [label, setLabel] = useState(INTAKE_PRESETS[0].label);
    const [mg, setMg] = useState(String(INTAKE_PRESETS[0].mg));
    const [when, setWhen] = useState(() => toLocalInput(new Date()));

    if (!open) return null;

    const now = new Date();
    const daily = computeCaffeine(shots, intake);
    const forecast = computeForecast(allDoses(shots, intake), prefs, now);

    const quickAdd = (presetLabel: string, presetMg: number) => {
        onAddIntake({ id: generateId(), label: presetLabel, mg: presetMg, timestamp: new Date() });
    };

    const submitEntry = () => {
        const value = parseFloat(mg);
        if (!label.trim() || !Number.isFinite(value) || value < 0) return;
        const at = new Date(when);
        onAddIntake({
            id: generateId(),
            label: label.trim(),
            mg: value,
            timestamp: Number.isNaN(at.getTime()) ? new Date() : at,
        });
        setAddOpen(false);
        setWhen(toLocalInput(new Date()));
    };

    const recentIntake = [...intake]
        .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
        .slice(0, 12);

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
                            Every logged shot already counts toward the curve. Add anything else you drink here.
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
                                onClick={() => { setWhen(toLocalInput(new Date())); setAddOpen(v => !v); }}
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
                                            value={INTAKE_PRESETS.some(p => p.label === label) ? label : ''}
                                            onChange={(e) => {
                                                const preset = INTAKE_PRESETS.find(p => p.label === e.target.value);
                                                if (preset) { setLabel(preset.label); setMg(String(preset.mg)); }
                                            }}
                                        >
                                            {!INTAKE_PRESETS.some(p => p.label === label) && (
                                                <option value="">Custom</option>
                                            )}
                                            {INTAKE_PRESETS.map(p => (
                                                <option key={p.label} value={p.label}>{p.label}</option>
                                            ))}
                                        </select>
                                        <Icons.ChevronDown />
                                    </div>
                                </div>
                                <div className="form-group">
                                    <label className="form-label" htmlFor="intake-label">Label</label>
                                    <input
                                        id="intake-label"
                                        type="text"
                                        className="form-input"
                                        value={label}
                                        onChange={(e) => setLabel(e.target.value)}
                                    />
                                </div>
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
                                        <label className="form-label" htmlFor="intake-when">When</label>
                                        <input
                                            id="intake-when"
                                            type="datetime-local"
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
                                    disabled={!label.trim() || !(parseFloat(mg) >= 0)}
                                >
                                    Log drink
                                </button>
                            </div>
                        )}

                        {recentIntake.length > 0 ? (
                            <div className="caffeine-intake-list">
                                {recentIntake.map(entry => (
                                    <div key={entry.id} className="caffeine-intake-row">
                                        <span className="caffeine-intake-row__label">{entry.label}</span>
                                        <span className="caffeine-intake-row__meta">
                                            {entry.mg} mg &middot; {clock(entry.timestamp)}
                                        </span>
                                        <button
                                            className="caffeine-intake-row__delete"
                                            onClick={() => onDeleteIntake(entry.id)}
                                            title={`Remove ${entry.label}`}
                                            aria-label={`Remove ${entry.label}`}
                                        >
                                            <Icons.Trash />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="caffeine-section__note">No extra drinks logged.</p>
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
