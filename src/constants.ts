import type { Rating, Basket, Strength, MilkType, PourPattern, ProcessMethod, RoastLevel } from './types';

export const RATINGS: Rating[] = ['Very Sour', 'Sour', 'Balanced', 'Bitter', 'Very Bitter'];

// CSS custom properties so inline styles re-skin across all six themes
export const RATING_COLORS: Record<Rating, string> = {
    'Very Sour': 'var(--color-very-sour)',
    'Sour': 'var(--color-sour)',
    'Balanced': 'var(--color-balanced)',
    'Bitter': 'var(--color-bitter)',
    'Very Bitter': 'var(--color-very-bitter)',
};

export const BASKETS: Basket[] = ['Single', 'Double'];
export const POUR_PATTERNS: PourPattern[] = ['2 Pours', '5 Pours'];
export const STRENGTHS: { value: Strength; label: string }[] = [
    { value: 1, label: '1 Mild' },
    { value: 2, label: '2 Medium' },
    { value: 3, label: '3 Strong' },
];
export const MILK_TYPES: MilkType[] = ['Dairy', 'Plant'];
export const PROCESS_METHODS: ProcessMethod[] = ['Washed', 'Natural', 'Honey', 'Anaerobic', 'Other'];
export const ROAST_LEVELS: RoastLevel[] = ['Light', 'Medium', 'Medium-Dark', 'Dark'];

export const BALANCED_RATING_INDEX = 2;

// One continuous grinder scale covering espresso (finer) through filter
// (coarser), so a single setting is comparable across brew methods.
export const GRIND_MIN = 1;
export const GRIND_MAX = 80;

// Quality score, separate from the sour <-> bitter rating axis.
export const SCORE_MIN = 0;
export const SCORE_MAX = 5;
export const SCORE_STEP = 0.5;
