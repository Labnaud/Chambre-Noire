import { useState } from 'react';
import type { BeanProfile, RoastLevel } from '../../types';
import {
    BREW_PROTOCOLS, V60_ROAST_SETTINGS, V60_DIAL_IN, stepForDose,
} from '../../lib/protocols';
import type { ProtocolId } from '../../lib/protocols';
import { formatDuration } from '../../lib/brew';
import { useFocusTrap } from '../../hooks';
import Icons from '../Icons';

interface BrewGuideModalProps {
    open: boolean;
    /** The bean selected in the form, so its roast row can be highlighted. */
    bean: BeanProfile | undefined;
    /** The dose currently in the form, used to pick the table row. */
    doseIn: number;
    onApply: (dose: number, grind: number) => void;
    onClose: () => void;
}

const DOSES = [12, 13, 14, 15, 16, 17, 18, 19, 20];

export default function BrewGuideModal({ open, bean, doseIn, onApply, onClose }: BrewGuideModalProps) {
    const modalRef = useFocusTrap<HTMLDivElement>();
    const [id, setId] = useState<ProtocolId>('v60-2-pours');
    const [dose, setDose] = useState(() => (DOSES.includes(Math.round(doseIn)) ? Math.round(doseIn) : 15));

    if (!open) return null;

    const protocol = BREW_PROTOCOLS.find(p => p.id === id)!;
    const step = stepForDose(protocol, dose);
    const roastRow = bean?.roastLevel
        ? V60_ROAST_SETTINGS.find(r => r.level === (bean.roastLevel as RoastLevel))
        : undefined;

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div
                ref={modalRef}
                className="modal modal--large"
                onClick={(e) => e.stopPropagation()}
                role="dialog"
                aria-modal="true"
                aria-labelledby="brew-guide-title"
            >
                <div className="modal__header">
                    <h3 id="brew-guide-title"><Icons.Book /> Brew Guide</h3>
                    <button className="modal__close" aria-label="Close" onClick={onClose}>
                        <Icons.X />
                    </button>
                </div>

                <div className="modal__body">
                    <div className="pill-group pill-group--wrap" role="group" aria-label="Protocol">
                        {BREW_PROTOCOLS.map(p => (
                            <button
                                key={p.id}
                                type="button"
                                className={`pill-btn pill-btn--sm ${id === p.id ? 'pill-btn--active' : ''}`}
                                onClick={() => setId(p.id)}
                                aria-pressed={id === p.id}
                            >
                                {p.name}
                            </button>
                        ))}
                    </div>

                    <p className="guide__summary">{protocol.summary}</p>
                    <p className="guide__meta">
                        <span>Ratio {protocol.ratio}</span>
                        <span>Drawdown {protocol.drawdown}</span>
                    </p>

                    <div className="guide__section">
                        <h4>Dose</h4>
                        <div className="pill-group pill-group--wrap" role="group" aria-label="Dose">
                            {DOSES.filter(d => protocol.steps.some(s => s.dose === d)).map(d => (
                                <button
                                    key={d}
                                    type="button"
                                    className={`pill-btn pill-btn--sm ${step.dose === d ? 'pill-btn--active' : ''}`}
                                    onClick={() => setDose(d)}
                                    aria-pressed={step.dose === d}
                                >
                                    {d}g
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="guide__section">
                        <h4>Pour schedule &mdash; {step.dose}g</h4>
                        <ol className="pour-schedule">
                            {step.pours.map((p, i) => (
                                <li key={p.label} className="pour-step">
                                    <span className="pour-step__at">
                                        {p.at === null ? '—' : formatDuration(p.at)}
                                    </span>
                                    <span className="pour-step__label">{p.label}</span>
                                    <span className="pour-step__water">
                                        {i === 0 && step.bloomRange
                                            ? `${step.bloomRange[0]}-${step.bloomRange[1]}g`
                                            : `${p.cumulative}g`}
                                    </span>
                                </li>
                            ))}
                        </ol>
                        {step.ice !== undefined && (
                            <p className="guide__note">
                                {step.ice}g ice in the carafe, {step.hotWater}g hot water poured over it.
                                Ice counts inside the total.
                            </p>
                        )}
                    </div>

                    <div className="guide__section">
                        <h4>Temperature &amp; grind by roast</h4>
                        <div className="scroll-x">
                            <table className="guide__table">
                                <thead>
                                    <tr><th>Roast</th><th>&deg;C</th><th>Grind</th></tr>
                                </thead>
                                <tbody>
                                    {V60_ROAST_SETTINGS.map(r => (
                                        <tr key={r.roast} className={roastRow === r ? 'guide__table-row--match' : ''}>
                                            <td>{r.roast}</td>
                                            <td>{r.tempC}</td>
                                            <td>{r.grind}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        {roastRow ? (
                            <button
                                type="button"
                                className="btn-apply-suggestion"
                                onClick={() => { onApply(step.dose, roastRow.grind); onClose(); }}
                            >
                                <Icons.Zap /> Use {step.dose}g at grind {roastRow.grind}
                            </button>
                        ) : (
                            <p className="guide__note">
                                {bean
                                    ? `Add a roast level to ${bean.name} to match a row.`
                                    : 'Pick a bean from your library to match a row.'}
                            </p>
                        )}
                    </div>

                    <div className="guide__section">
                        <h4>Method</h4>
                        <ol className="guide__method">
                            {protocol.method.map(s => <li key={s}>{s}</li>)}
                        </ol>
                        {protocol.note && <p className="guide__note">{protocol.note}</p>}
                    </div>

                    <p className="guide__dialin"><Icons.Lightbulb /> {V60_DIAL_IN}</p>
                </div>
            </div>
        </div>
    );
}
