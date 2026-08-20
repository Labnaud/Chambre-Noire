import type { Rating, Basket, Strength, MilkType, PourPattern, ProcessMethod, RoastLevel, Repurchase } from './types';

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
export const STRENGTHS: { value: Strength; label: string; tone: 'under' | 'target' | 'over' }[] = [
    { value: 1, label: 'Weak', tone: 'under' },
    { value: 2, label: 'Strong', tone: 'target' },
    { value: 3, label: 'Overwhelming', tone: 'over' },
];

// Strong is the goal; the two ends both mean the shot needs adjusting.
export const TARGET_STRENGTH: Strength = 2;
export const MILK_TYPES: MilkType[] = ['Dairy', 'Plant'];
export const PROCESS_METHODS: ProcessMethod[] = ['Washed', 'Natural', 'Honey', 'Co-ferment', 'Anaerobic', 'Other'];
export const REPURCHASE_OPTIONS: Repurchase[] = ['Yes', 'No', 'Mixed'];
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
