import { useState } from 'react';
import type {
    Basket, Strength, BrewMethod, PourPattern, EspressoDrink, MilkType, ShotLog, SavedRecipe,
} from '../types';
import { BALANCED_RATING_INDEX } from '../constants';
import { profileFor } from '../lib/brew';

export function useShotForm() {
    const [beanName, setBeanName] = useState('');
    const [method, setMethod] = useState<BrewMethod>('Espresso');
    const [pourPattern, setPourPattern] = useState<PourPattern>('2 Pours');
    const [iced, setIced] = useState(false);
    const [iceGrams, setIceGrams] = useState<string>('');
    const [basket, setBasket] = useState<Basket>('Double');
    const [grindSize, setGrindSize] = useState(20);
    const [waterTempC, setWaterTempC] = useState(profileFor('Espresso').defaultTempC);
    const [strength, setStrength] = useState<Strength>(2);
    const [ratingIndex, setRatingIndex] = useState(BALANCED_RATING_INDEX);
    const [rated, setRated] = useState(true); // false = log without tasting, rate later
    const [score, setScore] = useState(3.5);
    const [scored, setScored] = useState(true);
    const [notes, setNotes] = useState('');
    const [sessionLog, setSessionLog] = useState('');
    const [showSessionLog, setShowSessionLog] = useState(false);

    const [showDrink, setShowDrink] = useState(false);
    const [drink, setDrink] = useState<EspressoDrink>('Latte');
    const [milkType, setMilkType] = useState<MilkType>('Dairy');
    const [milkMl, setMilkMl] = useState<string>('');
    const [milkTempC, setMilkTempC] = useState<string>('');
    const [waterMl, setWaterMl] = useState<string>('');

    const [showTimer, setShowTimer] = useState(false);
    const [showDose, setShowDose] = useState(false);
    const [manualTimeInput, setManualTimeInput] = useState(false);
    const [manualTimerValue, setManualTimerValue] = useState<string>('');
    const [doseIn, setDoseIn] = useState<string>('');
    const [doseOut, setDoseOut] = useState<string>('');

    // Switching method re-baselines the water temperature, since the sensible
    // range for espresso and for filter barely overlap.
    const changeMethod = (next: BrewMethod) => {
        setMethod(next);
        setWaterTempC(profileFor(next).defaultTempC);
        if (!profileFor(next).supportsIce) setIced(false);
        if (!profileFor(next).supportsDrink) setShowDrink(false);
    };

    const reset = () => {
        setBeanName('');
        setNotes('');
        setSessionLog('');
        setManualTimerValue('');
        setDoseIn('');
        setDoseOut('');
        setIceGrams('');
        setMilkMl('');
        setMilkTempC('');
        setWaterMl('');
        setRated(true);
        setScored(true);
    };

    const applyFromShot = (shot: ShotLog) => {
        setBeanName(shot.beanName);
        setMethod(shot.method);
        if (shot.pourPattern) setPourPattern(shot.pourPattern);
        setIced(Boolean(shot.iced));
        setIceGrams(shot.iceGrams?.toString() ?? '');
        setBasket(shot.basket);
        setGrindSize(shot.grindSize);
        setWaterTempC(shot.waterTempC ?? profileFor(shot.method).defaultTempC);
        setStrength(shot.strength);
        if (shot.drink) {
            setShowDrink(true);
            setDrink(shot.drink);
        } else {
            setShowDrink(false);
        }
        if (shot.milkType) setMilkType(shot.milkType);
        setMilkMl(shot.milkMl?.toString() ?? '');
        setMilkTempC(shot.milkTempC?.toString() ?? '');
        setWaterMl(shot.waterMl?.toString() ?? '');
        setNotes(shot.notes ?? '');
        setSessionLog(shot.sessionLog ?? '');
        setShowSessionLog(Boolean(shot.sessionLog));
        setScored(shot.score !== undefined);
        setScore(shot.score ?? 3.5);
    };

    const applyFromRecipe = (r: SavedRecipe) => {
        setRated(true);
        setBeanName(r.beanName);
        setMethod(r.method);
        if (r.pourPattern) setPourPattern(r.pourPattern);
        setIced(Boolean(r.iced));
        setBasket(r.basket);
        setGrindSize(r.grindSize);
        setWaterTempC(r.waterTempC ?? profileFor(r.method).defaultTempC);
        setStrength(r.strength);
        if (r.drink) {
            setShowDrink(true);
            setDrink(r.drink);
        } else {
            setShowDrink(false);
        }
        if (r.milkType) setMilkType(r.milkType);
        setNotes(r.notes ?? '');
    };

    return {
        beanName, setBeanName,
        method, setMethod: changeMethod,
        pourPattern, setPourPattern,
        iced, setIced,
        iceGrams, setIceGrams,
        basket, setBasket,
        grindSize, setGrindSize,
        waterTempC, setWaterTempC,
        strength, setStrength,
        ratingIndex, setRatingIndex,
        rated, setRated,
        score, setScore,
        scored, setScored,
        notes, setNotes,
        sessionLog, setSessionLog,
        showSessionLog, setShowSessionLog,
        showDrink, setShowDrink,
        drink, setDrink,
        milkType, setMilkType,
        milkMl, setMilkMl,
        milkTempC, setMilkTempC,
        waterMl, setWaterMl,
        showTimer, setShowTimer,
        showDose, setShowDose,
        manualTimeInput, setManualTimeInput,
        manualTimerValue, setManualTimerValue,
        doseIn, setDoseIn,
        doseOut, setDoseOut,
        reset,
        applyFromShot,
        applyFromRecipe,
    };
}
