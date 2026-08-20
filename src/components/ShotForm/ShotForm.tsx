import type { FormEvent } from 'react';
import type { ShotLog, BeanProfile } from '../../types';
import type { useShotForm } from '../../hooks/useShotForm';
import type { useTimer } from '../../hooks/useTimer';
import type { useBeanAutocomplete } from '../../hooks/useBeanAutocomplete';
import { profileFor } from '../../lib/brew';
import Icons from '../Icons';
import BeanInput from './BeanInput';
import BrewControls from './BrewControls';
import DrinkControls from './DrinkControls';
import TimerInput from './TimerInput';
import RatingScale from './RatingScale';
import ScoreInput from './ScoreInput';

interface ShotFormProps {
    form: ReturnType<typeof useShotForm>;
    timer: ReturnType<typeof useTimer>;
    onSubmit: (e: FormEvent) => void;
    onIncrementGrind: () => void;
    onDecrementGrind: () => void;
    beans: BeanProfile[];
    hasAnyBeans: boolean;
    autocomplete: ReturnType<typeof useBeanAutocomplete>;
    favoriteShot: ShotLog | null;
    editingShot: ShotLog | null;
    onCancelEdit: () => void;
    onOpenRecipeModal: () => void;
}

export default function ShotForm({
    form,
    timer,
    onSubmit,
    onIncrementGrind,
    onDecrementGrind,
    beans,
    hasAnyBeans,
    autocomplete,
    favoriteShot,
    editingShot,
    onCancelEdit,
    onOpenRecipeModal,
}: ShotFormProps) {
    return (
        <form className="shot-form" onSubmit={onSubmit}>
            <BeanInput
                beanName={form.beanName}
                setBeanName={form.setBeanName}
                autocomplete={autocomplete}
                hasAnyBeans={hasAnyBeans}
                beans={beans}
                favoriteShot={favoriteShot}
            />

            <BrewControls
                method={form.method}
                setMethod={form.setMethod}
                pourPattern={form.pourPattern}
                setPourPattern={form.setPourPattern}
                iced={form.iced}
                setIced={form.setIced}
                iceGrams={form.iceGrams}
                setIceGrams={form.setIceGrams}
                basket={form.basket}
                setBasket={form.setBasket}
                grindSize={form.grindSize}
                setGrindSize={form.setGrindSize}
                waterTempC={form.waterTempC}
                setWaterTempC={form.setWaterTempC}
                strength={form.strength}
                setStrength={form.setStrength}
                onIncrementGrind={onIncrementGrind}
                onDecrementGrind={onDecrementGrind}
            />

            <RatingScale
                ratingIndex={form.ratingIndex}
                onChange={form.setRatingIndex}
                rated={form.rated}
                setRated={form.setRated}
            />

            <ScoreInput
                score={form.score}
                setScore={form.setScore}
                scored={form.scored}
                setScored={form.setScored}
            />

            <DrinkControls
                show={form.showDrink}
                setShow={form.setShowDrink}
                drink={form.drink}
                setDrink={form.setDrink}
                milkType={form.milkType}
                setMilkType={form.setMilkType}
                milkMl={form.milkMl}
                setMilkMl={form.setMilkMl}
                milkTempC={form.milkTempC}
                setMilkTempC={form.setMilkTempC}
                waterMl={form.waterMl}
                setWaterMl={form.setWaterMl}
                supported={profileFor(form.method).supportsDrink}
            />

            <TimerInput
                showTimer={form.showTimer}
                setShowTimer={form.setShowTimer}
                showDose={form.showDose}
                setShowDose={form.setShowDose}
                manualTimeInput={form.manualTimeInput}
                setManualTimeInput={form.setManualTimeInput}
                manualTimerValue={form.manualTimerValue}
                setManualTimerValue={form.setManualTimerValue}
                doseIn={form.doseIn}
                setDoseIn={form.setDoseIn}
                doseOut={form.doseOut}
                setDoseOut={form.setDoseOut}
                method={form.method}
                timer={timer}
            />

            <div className="form-group">
                <label className="form-label" htmlFor="shot-notes">Tasting Notes</label>
                <textarea
                    id="shot-notes"
                    className="form-input form-input--textarea"
                    rows={2}
                    placeholder="e.g. Blackcurrant, syrupy, long finish"
                    value={form.notes}
                    onChange={(e) => form.setNotes(e.target.value)}
                />
            </div>

            <div className="advanced-tools">
                <div className="advanced-group">
                    <button
                        type="button"
                        className={`advanced-toggle ${form.showSessionLog ? 'advanced-toggle--active' : ''}`}
                        onClick={() => form.setShowSessionLog(!form.showSessionLog)}
                        aria-expanded={form.showSessionLog}
                    >
                        <Icons.Clipboard />
                        <span>Session Log</span>
                        <span className="advanced-toggle__badge">{form.sessionLog.trim() ? 'Written' : 'Empty'}</span>
                        {form.showSessionLog ? <Icons.ChevronUp /> : <Icons.ChevronDown />}
                    </button>
                    <div className={`collapsible ${form.showSessionLog ? 'collapsible--open' : ''}`}>
                        <div className="collapsible__inner" inert={!form.showSessionLog ? true : undefined}>
                            <div className="session-log">
                                <label className="form-label" htmlFor="shot-session-log">
                                    Trial shots, what you changed, and what you concluded
                                </label>
                                <textarea
                                    id="shot-session-log"
                                    className="form-input form-input--textarea session-log__field"
                                    rows={8}
                                    placeholder={'18g / 36g / 24s - ran fast, sour\n-> 2 steps finer\n18g / 36g / 29s - balanced, keep this'}
                                    value={form.sessionLog}
                                    onChange={(e) => form.setSessionLog(e.target.value)}
                                />
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="form-actions">
                <button type="submit" className={editingShot ? 'btn-submit btn-submit--edit' : 'btn-submit'}>
                    {editingShot ? 'Update Shot' : 'Log Shot'}
                </button>
                {editingShot ? (
                    <button
                        type="button"
                        className="btn-cancel"
                        onClick={onCancelEdit}
                    >
                        Cancel Edit
                    </button>
                ) : (
                    <button
                        type="button"
                        className="btn-save-recipe"
                        onClick={onOpenRecipeModal}
                        disabled={!form.beanName.trim()}
                    >
                        <Icons.Save /> Save as Recipe
                    </button>
                )}
            </div>
        </form>
    );
}
