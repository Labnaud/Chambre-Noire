import type { Rating, ShotLog } from '../types';
import { GRIND_MIN, GRIND_MAX, TARGET_STRENGTH } from '../constants';
import { profileFor } from './brew';
// Target espresso window in seconds. Faster than MIN reads as under-extracted
// flow, slower than MAX as over-extracted.


export function getBaristaTip(rating: Rating): { message: string; adjustment: 'large' | 'small' | 'none' } {
    switch (rating) {
        case 'Very Sour':
            return { message: 'Heavily under-extracted. Grind significantly finer (2-3 steps) or increase temperature.', adjustment: 'large' };
        case 'Sour':
            return { message: 'Slightly under-extracted. Grind a bit finer (1 step) or try a higher temperature.', adjustment: 'small' };
        case 'Balanced':
            return { message: 'Perfect extraction! Save these settings for this bean.', adjustment: 'none' };
        case 'Bitter':
            return { message: 'Slightly over-extracted. Grind a bit coarser (1 step) or try a lower temperature.', adjustment: 'small' };
        case 'Very Bitter':
            return { message: 'Heavily over-extracted. Grind significantly coarser (2-3 steps) or decrease temperature.', adjustment: 'large' };
    }
}

export interface SuggestedSettings {
    grindSize: number;
    waterTempC: number;
    /** Proposed yield in grams, set only when strength is the lever. */
    doseOut?: number;
    adjustmentType: 'grind' | 'temp' | 'both' | 'yield';
    grindDiff: number;
    tempDiff: number;
    yieldDiff: number;
    reason?: string; // set when extraction time or strength drove the lever choice
}

// Yield moves strength: the same dose through more water is a more dilute
// shot. Their own fine-tuning range is 2-4g, so one step sits in the middle.
const YIELD_STEP_G = 3;
// Keep a proposal inside a sane espresso band rather than walking off toward
// a ristretto or a lungo while chasing strength.
const RATIO_MIN = 1.5;
const RATIO_MAX = 2.5;
const GRIND_STEP: Record<Exclude<Rating, 'Balanced'>, number> = {
    'Very Sour': -3,
    'Sour': -1,
    'Bitter': 1,
    'Very Bitter': 3,
};

export function getSuggestedSettings(lastShot: ShotLog | null | undefined): SuggestedSettings | null {
    if (!lastShot || !lastShot.rating) return null;
    // Taste first. Only once it lands balanced does strength get a lever.
    if (lastShot.rating === 'Balanced') return getStrengthSuggestion(lastShot);

    const rating = lastShot.rating;
    const profile = profileFor(lastShot.method);
    const currentGrind = lastShot.grindSize;
    const currentTemp = lastShot.waterTempC ?? profile.defaultTempC;
    const [tempMin, tempMax] = profile.tempRangeC;
    const isUnderExtracted = rating === 'Very Sour' || rating === 'Sour';

    const grindLever = (reason?: string): SuggestedSettings => {
        const grindSize = Math.max(GRIND_MIN, Math.min(GRIND_MAX, currentGrind + GRIND_STEP[rating]));
        return {
            grindSize,
            waterTempC: currentTemp,
            adjustmentType: 'grind',
            grindDiff: grindSize - currentGrind,
            tempDiff: 0,
            yieldDiff: 0,
            reason,
        };
    };

    // Sour wants hotter, bitter wants cooler; step size comes from the method
    // (espresso moves 1 C at a time, filter 2).
    const tempLever = (dir: 1 | -1, reason: string, maxedReason: string): SuggestedSettings => {
        const next = currentTemp + dir * profile.tempStepC;
        if (next < tempMin || next > tempMax) return grindLever(maxedReason); // no headroom
        return {
            grindSize: currentGrind,
            waterTempC: next,
            adjustmentType: 'temp',
            grindDiff: 0,
            tempDiff: next - currentTemp,
            yieldDiff: 0,
            reason,
        };
    };

    // Time-aware path: on an espresso pull with a recorded time, let the flow
    // rate pick the lever instead of taste alone.
    const time = lastShot.extractionTime;
    const [TIME_TARGET_MIN, TIME_TARGET_MAX] = profile.targetTimeSec;
    if (profile.ratioStyle === 'espresso' && typeof time === 'number') {
        if (isUnderExtracted) {
            if (time < TIME_TARGET_MIN) {
                return grindLever(`Ran fast (${time}s) and tasted sour, so grind finer to slow the shot.`);
            }
            return tempLever(
                1,
                `Sour, but the ${time}s pull was on target, so raise temperature instead of grinding finer.`,
                `Sour with the temperature already at ${tempMax} C, so grind finer instead.`,
            );
        }
        if (time > TIME_TARGET_MAX) {
            return grindLever(`Ran long (${time}s) and tasted bitter, so grind coarser to speed it up.`);
        }
        return tempLever(
            -1,
            `Bitter, but the ${time}s pull was not long, so lower temperature instead of grinding coarser.`,
            `Bitter with the temperature already at ${tempMin} C, so grind coarser instead.`,
        );
    }

    // Rating-only path: grind is the lever, with a temperature nudge at the extremes.
    const grindSize = Math.max(GRIND_MIN, Math.min(GRIND_MAX, currentGrind + GRIND_STEP[rating]));
    const wantsTempShift = rating === 'Very Sour' || rating === 'Very Bitter';
    let waterTempC = currentTemp;
    if (wantsTempShift) {
        const shifted = currentTemp + (isUnderExtracted ? profile.tempStepC : -profile.tempStepC);
        if (shifted >= tempMin && shifted <= tempMax) waterTempC = shifted;
    }
    return {
        grindSize,
        waterTempC,
        adjustmentType: wantsTempShift && waterTempC !== currentTemp ? 'both' : 'grind',
        grindDiff: grindSize - currentGrind,
        tempDiff: waterTempC - currentTemp,
        yieldDiff: 0,
    };
}

// Strength is the second axis, and it only gets a turn once taste is dialled
// in. Their golden rule is one variable at a time, flow then taste then body,
// and yield moves extraction as well as concentration -- so changing it while
// the shot is still sour or bitter would fight the grind change.
function getStrengthSuggestion(lastShot: ShotLog): SuggestedSettings | null {
    const profile = profileFor(lastShot.method);
    if (profile.ratioStyle !== 'espresso') return null; // yield means total water on filter
    if (lastShot.strength === TARGET_STRENGTH) return null;

    const doseIn = lastShot.doseIn;
    const doseOut = lastShot.doseOut;
    if (!doseIn || doseIn <= 0 || !doseOut || doseOut <= 0) return null;

    const tooStrong = lastShot.strength > TARGET_STRENGTH;
    const target = doseOut + (tooStrong ? YIELD_STEP_G : -YIELD_STEP_G);

    const clamped = Math.min(doseIn * RATIO_MAX, Math.max(doseIn * RATIO_MIN, target));
    const next = Math.round(clamped * 10) / 10;
    if (next === doseOut) return null; // already at the edge of the band

    const ratio = (next / doseIn).toFixed(1);
    return {
        grindSize: lastShot.grindSize,
        waterTempC: lastShot.waterTempC ?? profile.defaultTempC,
        doseOut: next,
        adjustmentType: 'yield',
        grindDiff: 0,
        tempDiff: 0,
        yieldDiff: Math.round((next - doseOut) * 10) / 10,
        reason: tooStrong
            ? `Balanced but overwhelming, so pull longer to ${next}g (1:${ratio}) and dilute it.`
            : `Balanced but weak, so stop at ${next}g (1:${ratio}) for a more concentrated shot.`,
    };
}
