import type { BrewMethod } from '../../types';
import { getRatioLabel } from '../../lib/dialIn';
import { yieldLabel } from '../../lib/brew';
import Icons from '../Icons';

interface DoseYieldControlsProps {
    show: boolean;
    setShow: (v: boolean) => void;
    doseIn: string;
    setDoseIn: (v: string) => void;
    doseOut: string;
    setDoseOut: (v: string) => void;
    method: BrewMethod;
}

// A brew parameter you set before pulling, so it sits with grind and
// temperature rather than with the tasting fields.
export default function DoseYieldControls({
    show, setShow, doseIn, setDoseIn, doseOut, setDoseOut, method,
}: DoseYieldControlsProps) {
    const ratioLabel = doseIn && doseOut
        ? getRatioLabel(parseFloat(doseIn), parseFloat(doseOut), method)
        : null;

    return (
        <div className="advanced-tools">
            <div className="advanced-group">
                <button
                    type="button"
                    className={`advanced-toggle ${show ? 'advanced-toggle--active' : ''}`}
                    onClick={() => setShow(!show)}
                    aria-expanded={show}
                >
                    <Icons.Scale />
                    <span>Dose &amp; Yield</span>
                    <span className="advanced-toggle__badge">{show ? 'On' : 'Off'}</span>
                    {show ? <Icons.ChevronUp /> : <Icons.ChevronDown />}
                </button>
                <div className={`collapsible ${show ? 'collapsible--open' : ''}`}>
                    <div className="collapsible__inner" inert={!show ? true : undefined}>
                        <div className="dose-yield">
                            <div className="dose-yield__inputs">
                                <div className="dose-yield__field">
                                    <label htmlFor="shot-dose-in">In (g)</label>
                                    <input
                                        id="shot-dose-in"
                                        type="number"
                                        inputMode="decimal"
                                        step="0.1"
                                        min="0"
                                        placeholder="18.0"
                                        value={doseIn}
                                        onChange={(e) => setDoseIn(e.target.value)}
                                    />
                                </div>
                                <span className="dose-yield__arrow" aria-hidden="true">→</span>
                                <div className="dose-yield__field">
                                    <label htmlFor="shot-dose-out">{yieldLabel(method)}</label>
                                    <input
                                        id="shot-dose-out"
                                        type="number"
                                        inputMode="decimal"
                                        step="0.1"
                                        min="0"
                                        placeholder="36.0"
                                        value={doseOut}
                                        onChange={(e) => setDoseOut(e.target.value)}
                                    />
                                </div>
                            </div>
                            {doseIn && doseOut && parseFloat(doseIn) > 0 && (
                                <div className="dose-yield__ratio">
                                    <span className="dose-yield__ratio-label">Ratio</span>
                                    <span className="dose-yield__ratio-value">
                                        1:{(parseFloat(doseOut) / parseFloat(doseIn)).toFixed(1)}
                                        {ratioLabel && <span className="ratio-label">{ratioLabel}</span>}
                                    </span>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
