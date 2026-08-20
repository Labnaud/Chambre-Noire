import { describe, it, expect } from 'vitest';
import { getBaristaTip, getSuggestedSettings } from './suggestions';
import type { ShotLog, Rating } from '../types';
import { GRIND_MAX } from '../constants';
import { profileFor } from './brew';

const ESPRESSO = profileFor('Espresso');
const [TEMP_MIN, TEMP_MAX] = ESPRESSO.tempRangeC;
const TEMP_MID = ESPRESSO.defaultTempC;
const STEP = ESPRESSO.tempStepC;

const shot = (rating: Rating, grindSize: number, waterTempC: number = TEMP_MID): ShotLog => ({
    id: '1',
    beanName: 'Ethiopia',
    method: 'Espresso',
    basket: 'Double',
    grindSize,
    waterTempC,
    strength: 2,
    rating,
    timestamp: new Date(),
});

describe('getBaristaTip', () => {
    it('returns large adjustment for Very Sour', () => {
        expect(getBaristaTip('Very Sour').adjustment).toBe('large');
    });

    it('returns small adjustment for Sour', () => {
        expect(getBaristaTip('Sour').adjustment).toBe('small');
    });

    it('returns no adjustment for Balanced', () => {
        const tip = getBaristaTip('Balanced');
        expect(tip.adjustment).toBe('none');
        expect(tip.message).toMatch(/Perfect/);
    });

    it('returns small adjustment for Bitter', () => {
        expect(getBaristaTip('Bitter').adjustment).toBe('small');
    });

    it('returns large adjustment for Very Bitter', () => {
        expect(getBaristaTip('Very Bitter').adjustment).toBe('large');
    });
});

describe('getSuggestedSettings', () => {
    it('returns null when there is no last shot', () => {
        expect(getSuggestedSettings(null)).toBeNull();
        expect(getSuggestedSettings(undefined)).toBeNull();
    });

    it('returns null when the last shot has no rating yet', () => {
        // A logged-but-untasted shot carries no taste signal, so there is
        // nothing to dial toward; the UI prompts to rate it instead.
        expect(getSuggestedSettings({ ...shot('Balanced', 12), rating: undefined })).toBeNull();
    });

    it('returns null for a Balanced last shot', () => {
        expect(getSuggestedSettings(shot('Balanced', 12))).toBeNull();
    });

    it('Very Sour drops grind by 3 and raises temperature', () => {
        const out = getSuggestedSettings(shot('Very Sour', 12));
        expect(out).toEqual({
            grindSize: 9,
            waterTempC: TEMP_MID + STEP,
            adjustmentType: 'both',
            grindDiff: -3,
            tempDiff: STEP,
            yieldDiff: 0,
        });
    });

    it('Sour drops grind by 1 and keeps temperature', () => {
        const out = getSuggestedSettings(shot('Sour', 12));
        expect(out?.grindSize).toBe(11);
        expect(out?.waterTempC).toBe(TEMP_MID);
        expect(out?.adjustmentType).toBe('grind');
    });

    it('Bitter raises grind by 1', () => {
        const out = getSuggestedSettings(shot('Bitter', 12));
        expect(out?.grindSize).toBe(13);
        expect(out?.adjustmentType).toBe('grind');
    });

    it('Very Bitter raises grind by 3 and lowers temperature', () => {
        const out = getSuggestedSettings(shot('Very Bitter', 12));
        expect(out).toEqual({
            grindSize: 15,
            waterTempC: TEMP_MID - STEP,
            adjustmentType: 'both',
            grindDiff: 3,
            tempDiff: -STEP,
            yieldDiff: 0,
        });
    });

    it('clamps grind to floor of 1 for Very Sour at minimum', () => {
        const out = getSuggestedSettings(shot('Very Sour', 2));
        expect(out?.grindSize).toBe(1);
    });

    it('clamps grind to the ceiling for Very Bitter at maximum', () => {
        const out = getSuggestedSettings(shot('Very Bitter', GRIND_MAX - 1));
        expect(out?.grindSize).toBe(GRIND_MAX);
    });

    // The scale widened for filter grinds, but a dial-in move is still a
    // handful of clicks within one bean/recipe, not a fraction of the range.
    it('keeps step sizes small on the wide scale', () => {
        expect(getSuggestedSettings(shot('Sour', 50))?.grindSize).toBe(49);
        expect(getSuggestedSettings(shot('Very Bitter', 50))?.grindSize).toBe(53);
    });

    it('does not raise temperature past the method ceiling', () => {
        const out = getSuggestedSettings(shot('Very Sour', 12, TEMP_MAX));
        expect(out?.waterTempC).toBe(TEMP_MAX);
    });

    it('does not lower temperature past the method floor', () => {
        const out = getSuggestedSettings(shot('Very Bitter', 12, TEMP_MIN));
        expect(out?.waterTempC).toBe(TEMP_MIN);
    });

    it('falls back to the method default when no temperature was recorded', () => {
        const out = getSuggestedSettings({ ...shot('Very Sour', 12), waterTempC: undefined });
        expect(out?.waterTempC).toBe(TEMP_MID + STEP);
    });
});

// With a recorded extraction time on an espresso pull, taste alone no longer
// picks the lever: a fast sour shot is mechanically under-extracted (grind),
// while a sour shot that already pulled on time needs heat, not a finer grind.
describe('getSuggestedSettings with extraction time', () => {
    it('grinds finer when a sour shot ran fast', () => {
        const out = getSuggestedSettings({ ...shot('Sour', 12), extractionTime: 20 });
        expect(out?.grindSize).toBe(11);
        expect(out?.grindDiff).toBe(-1);
        expect(out?.adjustmentType).toBe('grind');
        expect(out?.waterTempC).toBe(TEMP_MID);
        expect(out?.reason).toMatch(/finer/i);
    });

    it('raises temperature (not grind) when a sour shot already pulled on time', () => {
        const out = getSuggestedSettings({ ...shot('Sour', 12), extractionTime: 29 });
        expect(out?.grindSize).toBe(12);
        expect(out?.grindDiff).toBe(0);
        expect(out?.adjustmentType).toBe('temp');
        expect(out?.waterTempC).toBe(TEMP_MID + STEP);
        expect(out?.reason).toMatch(/temperature/i);
    });

    it('grinds coarser when a bitter shot ran long', () => {
        const out = getSuggestedSettings({ ...shot('Bitter', 12), extractionTime: 36 });
        expect(out?.grindSize).toBe(13);
        expect(out?.grindDiff).toBe(1);
        expect(out?.adjustmentType).toBe('grind');
        expect(out?.waterTempC).toBe(TEMP_MID);
    });

    it('lowers temperature (not grind) when a bitter shot did not run long', () => {
        const out = getSuggestedSettings({ ...shot('Very Bitter', 12), extractionTime: 22 });
        expect(out?.grindSize).toBe(12);
        expect(out?.adjustmentType).toBe('temp');
        expect(out?.waterTempC).toBe(TEMP_MID - STEP);
        expect(out?.reason).toMatch(/temperature/i);
    });

    it('ignores time for non-espresso brews and keeps rating-only behavior', () => {
        const out = getSuggestedSettings({ ...shot('Sour', 12), method: 'V60', extractionTime: 20 });
        expect(out?.grindSize).toBe(11);
        expect(out?.adjustmentType).toBe('grind');
        expect(out?.reason).toBeUndefined();
    });

    it('falls back to grinding finer when the temperature is already maxed', () => {
        const out = getSuggestedSettings({ ...shot('Sour', 12, TEMP_MAX), extractionTime: 29 });
        expect(out?.grindSize).toBe(11);
        expect(out?.adjustmentType).toBe('grind');
        expect(out?.waterTempC).toBe(TEMP_MAX);
        expect(out?.reason).toMatch(/finer|grind/i);
    });
});

// Strength is a second axis. Yield moves concentration, but it moves
// extraction too, so it only gets a turn once taste is already balanced.
describe('strength drives yield, after taste is dialled in', () => {
    const espresso = (over: Partial<ShotLog>): ShotLog => ({
        id: '1', beanName: 'Ethiopia', method: 'Espresso', basket: 'Double',
        grindSize: 22, waterTempC: TEMP_MID, strength: 2, rating: 'Balanced',
        doseIn: 18, doseOut: 36, timestamp: new Date(), ...over,
    });

    it('says nothing when taste and strength are both on target', () => {
        expect(getSuggestedSettings(espresso({}))).toBeNull();
    });

    it('lengthens the shot when balanced but overwhelming', () => {
        const out = getSuggestedSettings(espresso({ strength: 3 }));
        expect(out?.adjustmentType).toBe('yield');
        expect(out?.doseOut).toBe(39);
        expect(out?.yieldDiff).toBe(3);
        expect(out?.grindDiff).toBe(0);
        expect(out?.reason).toMatch(/dilute/i);
    });

    it('shortens the shot when balanced but weak', () => {
        const out = getSuggestedSettings(espresso({ strength: 1 }));
        expect(out?.doseOut).toBe(33);
        expect(out?.yieldDiff).toBe(-3);
        expect(out?.reason).toMatch(/concentrated/i);
    });

    it('leaves grind and temperature alone when yield is the lever', () => {
        const out = getSuggestedSettings(espresso({ strength: 3 }));
        expect(out?.grindSize).toBe(22);
        expect(out?.waterTempC).toBe(TEMP_MID);
    });

    // One variable at a time: a sour shot gets its grind fixed first, even if
    // the strength is also off.
    it('fixes taste before strength', () => {
        const out = getSuggestedSettings(espresso({ rating: 'Sour', strength: 3 }));
        expect(out?.adjustmentType).not.toBe('yield');
        expect(out?.yieldDiff).toBe(0);
        expect(out?.grindDiff).toBeLessThan(0);
    });

    it('will not walk the ratio past a lungo', () => {
        const out = getSuggestedSettings(espresso({ strength: 3, doseOut: 44 })); // 1:2.44
        expect(out?.doseOut).toBe(45); // clamped at 1:2.5
    });

    it('will not walk the ratio below a ristretto', () => {
        const out = getSuggestedSettings(espresso({ strength: 1, doseOut: 28 })); // 1:1.56
        expect(out?.doseOut).toBe(27); // clamped at 1:1.5
    });

    it('does nothing without dose data to work from', () => {
        expect(getSuggestedSettings(espresso({ strength: 3, doseIn: undefined }))).toBeNull();
    });

    // On filter the yield number is total brew water, a different quantity.
    it('stays out of it for filter brews', () => {
        expect(getSuggestedSettings(espresso({ method: 'V60', strength: 3 }))).toBeNull();
    });
});
