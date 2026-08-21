import { describe, it, expect } from 'vitest';
import {
    getBaristaTip, getSuggestedSettings,
    getEspressoStartingPoint, getFreshnessGrindNote,
} from './suggestions';
import type { ShotLog, Rating } from '../types';

// 18g / 36g / 30s, the empirical centre of the archived sweet spots.
const shot = (over: Partial<ShotLog> = {}): ShotLog => ({
    id: '1', beanName: 'Ethiopia', method: 'Espresso', basket: 'Double',
    grindSize: 21, waterTempC: 93, strength: 2, rating: 'Balanced',
    doseIn: 18, doseOut: 36, extractionTime: 30,
    timestamp: new Date(), ...over,
});

describe('an untasted shot', () => {
    it('proposes no body change, because absent strength is not weakness', () => {
        // Logged straight off the machine: balanced on taste but never drunk,
        // so there is no strength judgement to act on. Reading undefined as
        // "weak" would have suggested shortening the shot unprompted.
        const untasted = shot({ rating: 'Balanced', strength: undefined });
        expect(getSuggestedSettings(untasted)).toBeNull();
    });

    it('still guides on taste once only the strength is missing', () => {
        const sour = shot({ rating: 'Sour', strength: undefined });
        expect(getSuggestedSettings(sour)).not.toBeNull();
    });
});

describe('getBaristaTip', () => {
    it('scales the adjustment with how far off the taste is', () => {
        expect(getBaristaTip('Very Sour').adjustment).toBe('large');
        expect(getBaristaTip('Sour').adjustment).toBe('small');
        expect(getBaristaTip('Balanced').adjustment).toBe('none');
        expect(getBaristaTip('Bitter').adjustment).toBe('small');
        expect(getBaristaTip('Very Bitter').adjustment).toBe('large');
    });
});

describe('espresso: temperature is never a proposed parameter', () => {
    const ratings: Rating[] = ['Very Sour', 'Sour', 'Bitter', 'Very Bitter'];

    it('never moves the temperature, whatever the taste or flow', () => {
        for (const rating of ratings) {
            for (const extractionTime of [15, 24, 30, 36, 45]) {
                const out = getSuggestedSettings(shot({ rating, extractionTime }));
                expect(out?.tempDiff).toBe(0);
                expect(out?.waterTempC).toBe(93);
            }
        }
    });

    it('offers temperature only as advice when flow is right and taste is not', () => {
        expect(getSuggestedSettings(shot({ rating: 'Very Bitter', extractionTime: 30 }))?.advice)
            .toMatch(/too hot|cool-flush/i);
        expect(getSuggestedSettings(shot({ rating: 'Sour', extractionTime: 30 }))?.advice)
            .toMatch(/too cool|purge/i);
    });

    it('gives no temperature advice while flow is still the problem', () => {
        expect(getSuggestedSettings(shot({ rating: 'Sour', extractionTime: 15 }))?.advice).toBeUndefined();
    });
});

// Flow is the absolute priority: nothing else moves until it is in range.
describe('espresso step 1: flow', () => {
    it('jumps 2 steps finer under 20s', () => {
        const out = getSuggestedSettings(shot({ extractionTime: 18, rating: 'Sour' }));
        expect(out?.adjustmentType).toBe('grind');
        expect(out?.grindDiff).toBe(-2);
    });

    it('jumps 2 steps coarser over 40s', () => {
        const out = getSuggestedSettings(shot({ extractionTime: 45, rating: 'Bitter' }));
        expect(out?.grindDiff).toBe(2);
    });

    it('moves 1 step finer between 20 and 28s', () => {
        const out = getSuggestedSettings(shot({ extractionTime: 24, rating: 'Bitter' }));
        expect(out?.grindDiff).toBe(-1);
    });

    it('leaves the grind alone once the shot runs 28-40s', () => {
        for (const extractionTime of [28, 32, 36, 40]) {
            expect(getSuggestedSettings(shot({ extractionTime, rating: 'Sour' }))?.grindDiff).toBe(0);
        }
    });

    // Flow outranks taste: a fast shot gets its grind fixed even when the
    // taste would point at yield.
    it('fixes flow before taste', () => {
        const out = getSuggestedSettings(shot({ extractionTime: 18, rating: 'Bitter' }));
        expect(out?.adjustmentType).toBe('grind');
        expect(out?.yieldDiff).toBe(0);
    });
});

describe('espresso step 2: taste through yield', () => {
    it('pulls longer for a sour shot that already flows well', () => {
        const out = getSuggestedSettings(shot({ rating: 'Sour', extractionTime: 30 }));
        expect(out?.adjustmentType).toBe('yield');
        expect(out?.yieldDiff).toBe(2);
        expect(out?.doseOut).toBe(38);
        expect(out?.grindDiff).toBe(0);
    });

    it('stops shorter for a bitter shot that already flows well', () => {
        const out = getSuggestedSettings(shot({ rating: 'Bitter', extractionTime: 30 }));
        expect(out?.yieldDiff).toBe(-2);
        expect(out?.doseOut).toBe(34);
    });

    it('uses the larger 4g step at the extremes', () => {
        expect(getSuggestedSettings(shot({ rating: 'Very Sour', extractionTime: 30 }))?.yieldDiff).toBe(4);
        expect(getSuggestedSettings(shot({ rating: 'Very Bitter', extractionTime: 30 }))?.yieldDiff).toBe(-4);
    });

    it('keeps the ratio inside the 1:1.67 - 1:2.33 window', () => {
        // 18g -> 42g is already 1:2.33
        expect(getSuggestedSettings(shot({ rating: 'Sour', doseOut: 42, extractionTime: 30 }))?.adjustmentType)
            .toBe('grind'); // no yield room left, so fall back
        expect(getSuggestedSettings(shot({ rating: 'Bitter', doseOut: 30.1, extractionTime: 30 }))?.adjustmentType)
            .toBe('grind');
    });

    it('falls back to grind when there is no dose data', () => {
        const out = getSuggestedSettings(shot({ rating: 'Sour', doseIn: undefined, extractionTime: 30 }));
        expect(out?.adjustmentType).toBe('grind');
        expect(out?.grindDiff).toBe(-1);
    });
});

describe('espresso step 3: body, once taste is balanced', () => {
    it('says nothing when taste and strength are both on target', () => {
        expect(getSuggestedSettings(shot())).toBeNull();
    });

    it('pulls longer when balanced but overwhelming', () => {
        const out = getSuggestedSettings(shot({ strength: 3 }));
        expect(out?.yieldDiff).toBe(3);
        expect(out?.reason).toMatch(/dose at 18g/i);
    });

    it('stops shorter when balanced but weak', () => {
        const out = getSuggestedSettings(shot({ strength: 1 }));
        expect(out?.yieldDiff).toBe(-3);
    });

    it('does not touch body while taste is still off', () => {
        const out = getSuggestedSettings(shot({ rating: 'Sour', strength: 3, extractionTime: 30 }));
        expect(out?.yieldDiff).toBe(2); // the taste step, not the body step
    });
});

describe('starting points', () => {
    it('matches the documented row for each roast level', () => {
        expect(getEspressoStartingPoint('Light')).toEqual({ doseIn: 18, doseOut: 36, grind: [13, 18], time: [28, 32] });
        expect(getEspressoStartingPoint('Medium')).toEqual({ doseIn: 18, doseOut: 36, grind: [18, 23], time: [28, 32] });
        expect(getEspressoStartingPoint('Medium-Dark')).toEqual({ doseIn: 17.5, doseOut: 35, grind: [20, 25], time: [27, 30] });
        expect(getEspressoStartingPoint('Dark')).toEqual({ doseIn: 17, doseOut: 34, grind: [23, 28], time: [25, 30] });
    });

    // Never invent: no roast level means no starting point.
    it('returns nothing without a roast level', () => {
        expect(getEspressoStartingPoint(undefined)).toBeNull();
    });

    it('nudges grind for very fresh and very old beans', () => {
        expect(getFreshnessGrindNote(5)).toMatch(/coarser/i);
        expect(getFreshnessGrindNote(40)).toMatch(/finer/i);
        expect(getFreshnessGrindNote(20)).toBeNull();
        expect(getFreshnessGrindNote(null)).toBeNull();
    });
});

describe('filter keeps temperature as a lever', () => {
    it('moves grind and temperature together at the extremes', () => {
        const out = getSuggestedSettings(shot({ method: 'V60', grindSize: 52, waterTempC: 92, rating: 'Very Sour' }));
        expect(out?.grindDiff).toBe(-3);
        expect(out?.tempDiff).toBe(2);
    });

    it('says nothing for a balanced filter brew', () => {
        expect(getSuggestedSettings(shot({ method: 'V60', rating: 'Balanced' }))).toBeNull();
    });
});
