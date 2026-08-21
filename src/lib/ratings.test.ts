import { describe, it, expect } from 'vitest';
import { extractionLabel, RATING_COLOR_CLASS } from './ratings';
import { RATINGS } from '../constants';

describe('extractionLabel', () => {
    it('names the cause behind the taste, not the taste', () => {
        expect(extractionLabel('Very Sour')).toBe('Under-extracted');
        expect(extractionLabel('Sour')).toBe('Under-extracted');
        expect(extractionLabel('Balanced')).toBe('Sweet spot');
        expect(extractionLabel('Bitter')).toBe('Over-extracted');
        expect(extractionLabel('Very Bitter')).toBe('Over-extracted');
    });

    it('covers every rating on the scale', () => {
        for (const r of RATINGS) {
            expect(extractionLabel(r)).toBeTruthy();
            expect(RATING_COLOR_CLASS[r]).toBeTruthy();
        }
    });
});
