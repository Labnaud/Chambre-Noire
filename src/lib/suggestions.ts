import type { Rating, ShotLog, RoastLevel, Strength } from '../types';
import { GRIND_MIN, GRIND_MAX, TARGET_STRENGTH } from '../constants';
import { profileFor } from './brew';

export function getBaristaTip(rating: Rating): { message: string; adjustment: 'large' | 'small' | 'none' } {
    switch (rating) {
        case 'Very Sour':
            return { message: 'Heavily under-extracted. Extraction runs sour, sweet, bitter; this one stopped short.', adjustment: 'large' };
        case 'Sour':
            return { message: 'Slightly under-extracted. A touch more extraction should bring the sweetness forward.', adjustment: 'small' };
        case 'Balanced':
            return { message: 'Sweet spot. Save these settings for this bean.', adjustment: 'none' };
        case 'Bitter':
            return { message: 'Slightly over-extracted. Pull back a little to stop before the bitterness.', adjustment: 'small' };
        case 'Very Bitter':
            return { message: 'Heavily over-extracted. Extraction ran well past the sweet spot.', adjustment: 'large' };
    }
}

export interface SuggestedSettings {
    grindSize: number;
    waterTempC: number;
    /** Proposed yield in grams, set when yield is the lever. */
    doseOut?: number;
    adjustmentType: 'grind' | 'temp' | 'both' | 'yield';
    grindDiff: number;
    tempDiff: number;
    yieldDiff: number;
    /** Why this lever was chosen. */
    reason?: string;
    /** Guidance that is not a settable parameter (temperature, technique). */
    advice?: string;
}

/* ------------------------------------------------------------------ *
 * Espresso
 *
 * Golden rule: one parameter at a time, in order.
 *   1. Flow    (grind)     - absolute priority
 *   2. Taste   (yield)     - once the shot runs in an acceptable time
 *   3. Body    (yield)     - once taste is balanced
 *
 * Temperature is NOT an adjusted parameter here. It only appears as a
 * diagnostic when the flow is right and the cup still reads wrong.
 * Dose stays anchored at ~18g; refinement goes through yield.
 * ------------------------------------------------------------------ */

// Flow bands in seconds. Target is 28-32; 33-40 is close enough that yield,
// not grind, does the refining; beyond 40 or under 20 needs a big jump.
const FLOW_FAR_FAST = 20;
const FLOW_FAST = 28;
const FLOW_SLOW = 40;

const GRIND_STEP_NORMAL = 1;
const GRIND_STEP_BIG = 2; // "grand saut de 2 crans minimum"

// Yield refinement, within the documented 2-4g range.
const YIELD_STEP_SMALL = 2;
const YIELD_STEP_LARGE = 4;
const YIELD_STEP_BODY = 3;
// Below this a yield change is noise, not an adjustment.
const MIN_YIELD_MOVE_G = 0.5;

// The ratio window from the archived sweet spots: 1:1.67 to 1:2.33.
const RATIO_MIN = 1.67;
const RATIO_MAX = 2.33;

const clampGrind = (g: number) => Math.max(GRIND_MIN, Math.min(GRIND_MAX, g));

function carry(shot: ShotLog): Pick<SuggestedSettings, 'grindSize' | 'waterTempC'> {
    return {
        grindSize: shot.grindSize,
        waterTempC: shot.waterTempC ?? profileFor(shot.method).defaultTempC,
    };
}

function grindMove(shot: ShotLog, steps: number, reason: string, advice?: string): SuggestedSettings {
    const grindSize = clampGrind(shot.grindSize + steps);
    return {
        ...carry(shot),
        grindSize,
        adjustmentType: 'grind',
        grindDiff: grindSize - shot.grindSize,
        tempDiff: 0,
        yieldDiff: 0,
        reason,
        advice,
    };
}

function yieldMove(shot: ShotLog, grams: number, reason: string, advice?: string): SuggestedSettings | null {
    const { doseIn, doseOut } = shot;
    if (!doseIn || doseIn <= 0 || !doseOut || doseOut <= 0) return null;

    const clamped = Math.min(doseIn * RATIO_MAX, Math.max(doseIn * RATIO_MIN, doseOut + grams));
    const next = Math.round(clamped * 10) / 10;
    const move = Math.round((next - doseOut) * 10) / 10;

    // Clamping can leave a move that is negligible, or that points the wrong
    // way when the shot already sits outside the ratio window. Either means
    // yield has no room left, not that a 0.1g nudge is the right advice.
    if (Math.abs(move) < MIN_YIELD_MOVE_G || Math.sign(move) !== Math.sign(grams)) return null;

    return {
        ...carry(shot),
        doseOut: next,
        adjustmentType: 'yield',
        grindDiff: 0,
        tempDiff: 0,
        yieldDiff: move,
        reason,
        advice,
    };
}

// Temperature is a diagnostic, never a proposal: it only comes up when the
// flow is already right and the cup still reads wrong.
function tempDiagnostic(rating: Rating): string | undefined {
    if (rating === 'Very Bitter') {
        return 'If it reads burnt rather than simply over-extracted, the water is too hot. Cool-flush the group before the next shot.';
    }
    if (rating === 'Very Sour' || rating === 'Sour') {
        return 'If it stays sour with the grind in range, the water is too cool. Purge the group for 5s before pulling.';
    }
    return undefined;
}

function tasteYieldStep(rating: Exclude<Rating, 'Balanced'>): number {
    switch (rating) {
        case 'Very Sour': return YIELD_STEP_LARGE;
        case 'Sour': return YIELD_STEP_SMALL;
        case 'Bitter': return -YIELD_STEP_SMALL;
        case 'Very Bitter': return -YIELD_STEP_LARGE;
    }
}

function bodySuggestion(shot: ShotLog): SuggestedSettings | null {
    // Untasted shots carry no strength, and an absent judgement must not be
    // read as "weak" -- that would propose a change nobody asked for.
    if (shot.strength === undefined || shot.strength === TARGET_STRENGTH) return null;
    const tooStrong = shot.strength > TARGET_STRENGTH;
    return yieldMove(
        shot,
        tooStrong ? YIELD_STEP_BODY : -YIELD_STEP_BODY,
        tooStrong
            ? 'Balanced but overwhelming, so pull longer to dilute it. Keep the dose at 18g.'
            : 'Balanced but weak, so stop shorter for a more concentrated shot. Keep the dose at 18g.',
    );
}

function espressoSuggestion(shot: ShotLog, rating: Rating): SuggestedSettings | null {
    const time = shot.extractionTime;

    // 1. Flow first, and nothing else until it is in range.
    if (typeof time === 'number') {
        if (time < FLOW_FAR_FAST) {
            return grindMove(shot, -GRIND_STEP_BIG, `Ran ${time}s, far under the 28-32s target, so jump ${GRIND_STEP_BIG} steps finer.`);
        }
        if (time > FLOW_SLOW) {
            return grindMove(shot, GRIND_STEP_BIG, `Ran ${time}s, far over the 28-32s target, so jump ${GRIND_STEP_BIG} steps coarser.`);
        }
        if (time < FLOW_FAST) {
            return grindMove(shot, -GRIND_STEP_NORMAL, `Ran ${time}s, a little fast, so go ${GRIND_STEP_NORMAL} step finer.`);
        }
        // 28-40s: flow is workable, so refine on yield and leave the grind alone.
    }

    // 2. Taste, through yield.
    if (rating !== 'Balanced') {
        const step = tasteYieldStep(rating);
        const longer = step > 0;
        const yieldSuggestion = yieldMove(
            shot,
            step,
            longer
                ? `Flow is in range, so extract further by pulling ${Math.abs(step)}g longer rather than touching the grind.`
                : `Flow is in range, so stop ${Math.abs(step)}g shorter rather than touching the grind.`,
            tempDiagnostic(rating),
        );
        if (yieldSuggestion) return yieldSuggestion;

        // No dose data, or the ratio window is exhausted: fall back to grind.
        const steps = rating === 'Very Sour' || rating === 'Very Bitter' ? GRIND_STEP_BIG : GRIND_STEP_NORMAL;
        const finer = rating === 'Very Sour' || rating === 'Sour';
        return grindMove(
            shot,
            finer ? -steps : steps,
            finer
                ? 'No room left on yield, so grind finer to extract more.'
                : 'No room left on yield, so grind coarser to extract less.',
            tempDiagnostic(rating),
        );
    }

    // 3. Body, once taste is balanced.
    return bodySuggestion(shot);
}

/* ------------------------------------------------------------------ *
 * Filter
 *
 * Order here is grind, then temperature, then ratio and agitation, so
 * temperature stays a real lever on this side.
 * ------------------------------------------------------------------ */

const FILTER_GRIND_STEP: Record<Exclude<Rating, 'Balanced'>, number> = {
    'Very Sour': -3,
    'Sour': -1,
    'Bitter': 1,
    'Very Bitter': 3,
};

function filterSuggestion(shot: ShotLog, rating: Exclude<Rating, 'Balanced'>): SuggestedSettings {
    const profile = profileFor(shot.method);
    const currentTemp = shot.waterTempC ?? profile.defaultTempC;
    const [tempMin, tempMax] = profile.tempRangeC;
    const isUnder = rating === 'Very Sour' || rating === 'Sour';

    const grindSize = clampGrind(shot.grindSize + FILTER_GRIND_STEP[rating]);
    const wantsTempShift = rating === 'Very Sour' || rating === 'Very Bitter';
    let waterTempC = currentTemp;
    if (wantsTempShift) {
        const shifted = currentTemp + (isUnder ? profile.tempStepC : -profile.tempStepC);
        if (shifted >= tempMin && shifted <= tempMax) waterTempC = shifted;
    }

    return {
        grindSize,
        waterTempC,
        adjustmentType: wantsTempShift && waterTempC !== currentTemp ? 'both' : 'grind',
        grindDiff: grindSize - shot.grindSize,
        tempDiff: waterTempC - currentTemp,
        yieldDiff: 0,
        reason: isUnder
            ? 'Sour and short, so grind finer and pour hotter.'
            : 'Bitter and harsh, so grind coarser and pour cooler.',
    };
}

export function getSuggestedSettings(lastShot: ShotLog | null | undefined): SuggestedSettings | null {
    if (!lastShot || !lastShot.rating) return null;
    const isEspresso = profileFor(lastShot.method).ratioStyle === 'espresso';

    if (isEspresso) return espressoSuggestion(lastShot, lastShot.rating);
    if (lastShot.rating === 'Balanced') return null;
    return filterSuggestion(lastShot, lastShot.rating);
}

/* ------------------------------------------------------------------ *
 * Starting points for a bean with no history.
 * Never invented: without a roast level there is no starting point.
 * ------------------------------------------------------------------ */

export interface StartingPoint {
    doseIn: number;
    doseOut: number;
    grind: [number, number];
    time: [number, number];
}

const ESPRESSO_START: Record<RoastLevel, StartingPoint> = {
    'Light': { doseIn: 18, doseOut: 36, grind: [13, 18], time: [28, 32] },
    'Medium': { doseIn: 18, doseOut: 36, grind: [18, 23], time: [28, 32] },
    'Medium-Dark': { doseIn: 17.5, doseOut: 35, grind: [20, 25], time: [27, 30] },
    'Dark': { doseIn: 17, doseOut: 34, grind: [23, 28], time: [25, 30] },
};

export function getEspressoStartingPoint(roastLevel: RoastLevel | undefined): StartingPoint | null {
    if (!roastLevel) return null;
    return ESPRESSO_START[roastLevel] ?? null;
}

/** Bean-age nudge off the starting grind, from the bean-context table. */
export function getFreshnessGrindNote(daysSinceRoast: number | null): string | null {
    if (daysSinceRoast === null) return null;
    if (daysSinceRoast < 14) return 'Fresh beans (under 2 weeks): start coarser than usual.';
    if (daysSinceRoast > 28) return 'Aged beans (over 4 weeks): start finer than usual.';
    return null;
}

export const STRENGTH_TARGET: Strength = TARGET_STRENGTH;
