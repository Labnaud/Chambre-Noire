import type { Rating, ShotLog } from '../types';
import { GRIND_MIN, GRIND_MAX } from '../constants';
import { profileFor } from './brew';
// Target espresso window in seconds. Faster than MIN reads as under-extracted
// flow, slower than MAX as over-extracted.
const TIME_TARGET_MIN = 25;
const TIME_TARGET_MAX = 32;

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
    adjustmentType: 'grind' | 'temp' | 'both';
    grindDiff: number;
    tempDiff: number;
    reason?: string; // set when extraction time drove the lever choice
}
const GRIND_STEP: Record<Exclude<Rating, 'Balanced'>, number> = {
    'Very Sour': -3,
    'Sour': -1,
    'Bitter': 1,
    'Very Bitter': 3,
};

export function getSuggestedSettings(lastShot: ShotLog | null | undefined): SuggestedSettings | null {
    if (!lastShot || !lastShot.rating || lastShot.rating === 'Balanced') return null;

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
            reason,
        };
    };

    // Time-aware path: on an espresso pull with a recorded time, let the flow
    // rate pick the lever instead of taste alone.
    const time = lastShot.extractionTime;
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
    };
}
