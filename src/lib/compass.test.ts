import { describe, it, expect } from 'vitest';
import { RATINGS, STRENGTHS, TARGET_STRENGTH, BALANCED_RATING_INDEX } from '../constants';

// The compass axes are the two scales the app already records, so the grid
// geometry has to stay in step with them.
describe('compass axes', () => {
    it('extraction runs sour to bitter with balanced in the middle', () => {
        expect(RATINGS[0]).toBe('Very Sour');
        expect(RATINGS[RATINGS.length - 1]).toBe('Very Bitter');
        expect(RATINGS[BALANCED_RATING_INDEX]).toBe('Balanced');
    });

    it('strength runs weak to overwhelming with the target in the middle', () => {
        expect(STRENGTHS.map(s => s.label)).toEqual(['Weak', 'Strong', 'Overwhelming']);
        expect(STRENGTHS[TARGET_STRENGTH - 1].tone).toBe('target');
    });

    // Overwhelming must sit at the top of the plot, Weak at the bottom.
    it('maps strength to a row with the strongest on top', () => {
        const rowFor = (strength: number) => STRENGTHS.length - strength;
        expect(rowFor(3)).toBe(0);
        expect(rowFor(TARGET_STRENGTH)).toBe(1);
        expect(rowFor(1)).toBe(2);
    });

    it('puts the sweet cell at the centre of both axes', () => {
        expect(BALANCED_RATING_INDEX).toBe((RATINGS.length - 1) / 2);
        expect(STRENGTHS.length - TARGET_STRENGTH).toBe((STRENGTHS.length - 1) / 2);
    });
});
