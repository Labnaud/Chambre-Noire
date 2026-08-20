import type { FormEvent } from 'react';
import type { ShotLog, BeanProfile, Rating } from '../../types';
import type { SuggestedSettings } from '../../lib/suggestions';
import type { useShotForm } from '../../hooks/useShotForm';
import type { useTimer } from '../../hooks/useTimer';
import type { useBeanAutocomplete } from '../../hooks/useBeanAutocomplete';
import { profileFor } from '../../lib/brew';
import Icons from '../Icons';
import BeanInput from './BeanInput';
import BrewShapeControls from './BrewShapeControls';
import BrewSettingControls from './BrewSettingControls';
import SmartBarista from './SmartBarista';
import DrinkControls from './DrinkControls';
import DoseYieldControls from './DoseYieldControls';
import ShotTimerControls from './ShotTimerControls';
import StrengthControl from './StrengthControl';
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
    shots: ShotLog[];
    lastShotForBean: ShotLog | null;
    suggestion: SuggestedSettings | null;
    shotsForBean: ShotLog[];
    ratingConfig: Record<Rating, { icon: () => React.JSX.Element; colorClass: string }>;
    ratingColors: Record<Rating, string>;
    onApplySuggestion: () => void;
    onApplyStartingPoint: (doseIn: number, doseOut: number, grind: number) => void;
    onUpdateBean: (bean: BeanProfile) => void;
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
    shots,
    lastShotForBean,
    suggestion,
    shotsForBean,
    ratingConfig,
    ratingColors,
    onApplySuggestion,
    onApplyStartingPoint,
    onUpdateBean,
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

            <BrewShapeControls
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
            />

            <SmartBarista
                beanName={form.beanName}
                method={form.method}
                beans={beans}
                shots={shots}
                lastShot={lastShotForBean}
                suggestion={suggestion}
                shotsForBean={shotsForBean}
                ratingConfig={ratingConfig}
                ratingColors={ratingColors}
                onApply={onApplySuggestion}
                onApplyStartingPoint={onApplyStartingPoint}
                onUpdateBean={onUpdateBean}
            />

            <BrewSettingControls
                method={form.method}
                grindSize={form.grindSize}
                setGrindSize={form.setGrindSize}
                waterTempC={form.waterTempC}
                setWaterTempC={form.setWaterTempC}
                onIncrementGrind={onIncrementGrind}
                onDecrementGrind={onDecrementGrind}
            />

            <DoseYieldControls
                show={form.showDose}
                setShow={form.setShowDose}
                doseIn={form.doseIn}
                setDoseIn={form.setDoseIn}
                doseOut={form.doseOut}
                setDoseOut={form.setDoseOut}
                method={form.method}
            />

            <ShotTimerControls
                show={form.showTimer}
                setShow={form.setShowTimer}
                manualTimeInput={form.manualTimeInput}
                setManualTimeInput={form.setManualTimeInput}
                manualTimerValue={form.manualTimerValue}
                setManualTimerValue={form.setManualTimerValue}
                timer={timer}
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

            <StrengthControl
                strength={form.strength}
                setStrength={form.setStrength}
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
