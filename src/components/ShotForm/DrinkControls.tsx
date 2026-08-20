import type { EspressoDrink, MilkType } from '../../types';
import { MILK_TYPES } from '../../constants';
import { ESPRESSO_DRINKS, drinkSpec, formatRange } from '../../lib/brew';
import Icons from '../Icons';

interface DrinkControlsProps {
    show: boolean;
    setShow: (v: boolean) => void;
    drink: EspressoDrink;
    setDrink: (d: EspressoDrink) => void;
    milkType: MilkType;
    setMilkType: (t: MilkType) => void;
    milkMl: string;
    setMilkMl: (v: string) => void;
    milkTempC: string;
    setMilkTempC: (v: string) => void;
    waterMl: string;
    setWaterMl: (v: string) => void;
    supported: boolean;
}

// What was built on the shot. The reference targets shown here are what the
// drink *should* be; the inputs record what was actually poured.
export default function DrinkControls({
    show, setShow,
    drink, setDrink,
    milkType, setMilkType,
    milkMl, setMilkMl,
    milkTempC, setMilkTempC,
    waterMl, setWaterMl,
    supported,
}: DrinkControlsProps) {
    if (!supported) return null;
    const spec = drinkSpec(drink);
    const isWaterDrink = spec?.waterMl != null;

    return (
        <div className="advanced-tools">
            <div className="advanced-group">
                <button
                    type="button"
                    className={`advanced-toggle ${show ? 'advanced-toggle--active' : ''}`}
                    onClick={() => setShow(!show)}
                    aria-expanded={show}
                >
                    <Icons.Milk />
                    <span>Drink</span>
                    <span className="advanced-toggle__badge">{show ? drink : 'Straight'}</span>
                    {show ? <Icons.ChevronUp /> : <Icons.ChevronDown />}
                </button>

                <div className={`collapsible ${show ? 'collapsible--open' : ''}`}>
                    <div className="collapsible__inner" inert={!show ? true : undefined}>
                        <div className="drink-panel">
                            <div className="pill-group pill-group--wrap" role="group" aria-label="Drink">
                                {ESPRESSO_DRINKS.map((d) => (
                                    <button
                                        key={d}
                                        type="button"
                                        className={`pill-btn pill-btn--sm ${drink === d ? 'pill-btn--active' : ''}`}
                                        onClick={() => setDrink(d)}
                                        aria-pressed={drink === d}
                                    >
                                        {d}
                                    </button>
                                ))}
                            </div>

                            {spec && (
                                <div className="drink-target">
                                    <span className="drink-target__label">Target</span>
                                    <div className="drink-target__rows">
                                        {spec.milkMl && (
                                            <span>Milk {formatRange(spec.milkMl, 'mL')}</span>
                                        )}
                                        {spec.waterMl && (
                                            <span>Water {formatRange(spec.waterMl, 'mL')}</span>
                                        )}
                                        <span>Total {formatRange(spec.totalMl, 'mL')}</span>
                                        <span>Ratio {spec.ratio}</span>
                                        {spec.milkTempC && (
                                            <span>Milk {formatRange(spec.milkTempC, '°C')}</span>
                                        )}
                                        <span>Foam: {spec.foam}</span>
                                    </div>
                                    {spec.note && <p className="drink-target__note">{spec.note}</p>}
                                </div>
                            )}

                            {!isWaterDrink && (
                                <div className="drink-panel__row">
                                    <span className="form-label" id="shot-milk-type-label">Milk Type</span>
                                    <div className="pill-group pill-group--wrap" role="group" aria-labelledby="shot-milk-type-label">
                                        {MILK_TYPES.map((type) => (
                                            <button
                                                key={type}
                                                type="button"
                                                className={`pill-btn pill-btn--sm ${milkType === type ? 'pill-btn--active' : ''}`}
                                                onClick={() => setMilkType(type)}
                                                aria-pressed={milkType === type}
                                            >
                                                {type}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}

                            <div className="drink-panel__inputs">
                                {isWaterDrink ? (
                                    <div className="form-group">
                                        <label className="form-label" htmlFor="shot-water-ml">Water (mL)</label>
                                        <input
                                            id="shot-water-ml"
                                            type="number"
                                            inputMode="decimal"
                                            min="0"
                                            step="10"
                                            className="form-input form-input--sm"
                                            value={waterMl}
                                            onChange={(e) => setWaterMl(e.target.value)}
                                        />
                                    </div>
                                ) : (
                                    <>
                                        <div className="form-group">
                                            <label className="form-label" htmlFor="shot-milk-ml">Milk (mL)</label>
                                            <input
                                                id="shot-milk-ml"
                                                type="number"
                                                inputMode="decimal"
                                                min="0"
                                                step="10"
                                                className="form-input form-input--sm"
                                                value={milkMl}
                                                onChange={(e) => setMilkMl(e.target.value)}
                                            />
                                        </div>
                                        <div className="form-group">
                                            <label className="form-label" htmlFor="shot-milk-temp">Milk Temp (&deg;C)</label>
                                            <input
                                                id="shot-milk-temp"
                                                type="number"
                                                inputMode="decimal"
                                                min="0"
                                                step="1"
                                                className="form-input form-input--sm"
                                                value={milkTempC}
                                                onChange={(e) => setMilkTempC(e.target.value)}
                                            />
                                        </div>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
