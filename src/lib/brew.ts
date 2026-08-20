import type { BrewMethod, ShotLog, SavedRecipe, EspressoDrink } from '../types';

// One place that answers "what does this brewing method actually support".
// Previously these questions were spread across a COLD_BREW_TYPES list (which
// really meant "hide the temperature control") and an ESPRESSO_STYLE_BREWS list
// (which meant "ratio labels apply"). Both were lists pretending to be lookup
// tables, and neither could describe a hot brew served over ice.
export interface BrewProfile {
    /** Does brew water temperature apply at all. */
    hasWaterTemp: boolean;
    tempRangeC: [number, number];
    defaultTempC: number;
    /** How far the dial-in engine moves temperature in one step. */
    tempStepC: number;
    /** What the yield number means: liquid in the cup, or total brew water. */
    yieldMeans: 'liquid' | 'water';
    /** Ristretto/Normale/Lungo only make sense for espresso-style pulls. */
    ratioStyle: 'espresso' | 'filter';
    /** Typical brew ratio, used for guidance copy. */
    typicalRatio: number;
    hasPourPattern: boolean;
    supportsIce: boolean;
    /** Can a milk or water drink be built on it. */
    supportsDrink: boolean;
}

export const BREW_METHODS: BrewMethod[] = ['Espresso', 'V60', 'French Press'];

export const BREW_PROFILES: Record<BrewMethod, BrewProfile> = {
    'Espresso': {
        hasWaterTemp: true,
        tempRangeC: [88, 96],
        defaultTempC: 93,
        tempStepC: 1,
        yieldMeans: 'liquid',
        ratioStyle: 'espresso',
        typicalRatio: 2,
        hasPourPattern: false,
        supportsIce: false,
        supportsDrink: true,
    },
    'V60': {
        hasWaterTemp: true,
        tempRangeC: [80, 96],
        defaultTempC: 92,
        tempStepC: 2,
        yieldMeans: 'water',
        ratioStyle: 'filter',
        typicalRatio: 16.6,
        hasPourPattern: true,
        supportsIce: true,
        supportsDrink: false,
    },
    'French Press': {
        hasWaterTemp: true,
        tempRangeC: [88, 96],
        defaultTempC: 93,
        tempStepC: 2,
        yieldMeans: 'water',
        ratioStyle: 'filter',
        typicalRatio: 16,
        hasPourPattern: false,
        supportsIce: false,
        supportsDrink: false,
    },
};

export function profileFor(method: BrewMethod): BrewProfile {
    return BREW_PROFILES[method];
}

/** Label for the yield field, which means different things per method. */
export function yieldLabel(method: BrewMethod): string {
    return profileFor(method).yieldMeans === 'liquid' ? 'Out (g)' : 'Total water (g)';
}

/** Hot water actually poured: for an iced brew the ice is part of total water. */
export function hotWaterGrams(shot: Pick<ShotLog, 'doseOut' | 'iced' | 'iceGrams'>): number | null {
    if (shot.doseOut === undefined) return null;
    if (!shot.iced) return shot.doseOut;
    return Math.max(0, shot.doseOut - (shot.iceGrams ?? 0));
}

type BrewShape = Pick<ShotLog, 'method' | 'pourPattern' | 'iced' | 'drink'>;

/** How a brew reads in history and stats: "Iced V60 2 Pours", "Latte", "Espresso". */
export function describeBrew(shot: BrewShape | SavedRecipe): string {
    if (shot.drink) return shot.drink;
    const parts: string[] = [];
    if (shot.iced) parts.push('Iced');
    parts.push(shot.method);
    if (shot.pourPattern) parts.push(shot.pourPattern);
    return parts.join(' ');
}

/* ------------------------------------------------------------------ *
 * Drink reference targets.
 *
 * These are what a drink *should* be, not what was poured. They drive
 * guidance next to the input; the per-shot milkMl / milkTempC / waterMl
 * fields record what actually happened.
 * ------------------------------------------------------------------ */

export interface DrinkSpec {
    drink: EspressoDrink;
    milkMl: [number, number] | null;
    waterMl: [number, number] | null;
    foam: string;
    totalMl: [number, number];
    ratio: string;
    milkTempC: [number, number] | null;
    note?: string;
}

export const DRINK_SPECS: DrinkSpec[] = [
    {
        drink: 'Latte',
        milkMl: [240, 300], waterMl: null, foam: 'Thin layer',
        totalMl: [300, 360], ratio: '1:4-5', milkTempC: [65, 68],
    },
    {
        drink: 'Macchiato',
        milkMl: null, waterMl: null, foam: 'One dollop',
        totalMl: [60, 90], ratio: '1:0.25', milkTempC: null,
        note: 'A dash of milk only.',
    },
    {
        drink: 'Cortado',
        milkMl: [60, 60], waterMl: null, foam: 'Minimal',
        totalMl: [120, 120], ratio: '1:1', milkTempC: [54, 60],
    },
    {
        drink: 'Flat White',
        milkMl: [120, 120], waterMl: null, foam: 'Fine microfoam',
        totalMl: [180, 180], ratio: '1:2', milkTempC: [60, 65],
    },
    {
        drink: 'Cappuccino',
        milkMl: [60, 60], waterMl: null, foam: '60 mL foam',
        totalMl: [180, 180], ratio: '1:1:1', milkTempC: [65, 68],
    },
    {
        drink: 'Mocha',
        milkMl: [180, 180], waterMl: null, foam: 'Thin layer',
        totalMl: [240, 240], ratio: '1:3 + chocolate', milkTempC: [65, 68],
        note: 'Milk plus chocolate.',
    },
    {
        drink: 'Americano',
        milkMl: null, waterMl: [120, 180], foam: '-',
        totalMl: [180, 240], ratio: '1:2-3 water', milkTempC: null,
        note: 'Pour the espresso over the hot water, not the reverse.',
    },
];

export const ESPRESSO_DRINKS: EspressoDrink[] = DRINK_SPECS.map(d => d.drink);

export function drinkSpec(drink: EspressoDrink): DrinkSpec | undefined {
    return DRINK_SPECS.find(d => d.drink === drink);
}

export function formatRange(range: [number, number] | null, unit: string): string {
    if (!range) return '-';
    return range[0] === range[1] ? `${range[0]} ${unit}` : `${range[0]}-${range[1]} ${unit}`;
}
