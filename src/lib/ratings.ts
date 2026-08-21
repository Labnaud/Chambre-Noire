import type { Rating } from '../types';

export const RATING_COLOR_CLASS: Record<Rating, string> = {
    'Very Sour': 'very-sour',
    'Sour': 'sour',
    'Balanced': 'balanced',
    'Bitter': 'bitter',
    'Very Bitter': 'very-bitter',
};

/**
 * The badge wording for where an extraction landed. The rating scale is the
 * taste you noticed (sour, bitter); this is the cause behind it, which is what
 * a one-word status has to say to be worth reading at a glance.
 */
export function extractionLabel(rating: Rating): string {
    switch (rating) {
        case 'Very Sour':
        case 'Sour':
            return 'Under-extracted';
        case 'Balanced':
            return 'Sweet spot';
        case 'Bitter':
        case 'Very Bitter':
            return 'Over-extracted';
    }
}
