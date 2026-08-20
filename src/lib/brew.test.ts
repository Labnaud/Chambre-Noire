import { describe, it, expect } from 'vitest';
import {
    profileFor, describeBrew, hotWaterGrams, yieldLabel,
    drinkSpec, DRINK_SPECS, BREW_METHODS, formatDuration, targetTimeLabel,
} from './brew';

describe('brew profiles', () => {
    it('gives every method a profile', () => {
        for (const m of BREW_METHODS) expect(profileFor(m)).toBeDefined();
    });

    it('keeps a water temperature for V60, which is a hot brew even when iced', () => {
        expect(profileFor('V60').hasWaterTemp).toBe(true);
    });

    it('covers the documented V60 temperature range of 80-96 C', () => {
        expect(profileFor('V60').tempRangeC).toEqual([80, 96]);
    });

    it('marks espresso yield as liquid and filter yield as total water', () => {
        expect(profileFor('Espresso').yieldMeans).toBe('liquid');
        expect(profileFor('V60').yieldMeans).toBe('water');
        expect(yieldLabel('Espresso')).toBe('Out (g)');
        expect(yieldLabel('V60')).toBe('Total water (g)');
    });

    it('only lets espresso carry a drink and only V60 carry ice or pours', () => {
        expect(profileFor('Espresso').supportsDrink).toBe(true);
        expect(profileFor('V60').supportsDrink).toBe(false);
        expect(profileFor('V60').supportsIce).toBe(true);
        expect(profileFor('Espresso').supportsIce).toBe(false);
        expect(profileFor('V60').hasPourPattern).toBe(true);
    });

    it('steps espresso temperature finer than filter', () => {
        expect(profileFor('Espresso').tempStepC).toBeLessThan(profileFor('V60').tempStepC);
    });
});

describe('describeBrew', () => {
    const base = { method: 'V60' as const, pourPattern: undefined, iced: undefined, drink: undefined };

    it('names a plain espresso', () => {
        expect(describeBrew({ ...base, method: 'Espresso' })).toBe('Espresso');
    });

    it('keeps the two V60 protocols distinct', () => {
        expect(describeBrew({ ...base, pourPattern: '2 Pours' })).toBe('V60 2 Pours');
        expect(describeBrew({ ...base, pourPattern: '5 Pours' })).toBe('V60 5 Pours');
    });

    it('marks an iced brew without calling it a cold brew', () => {
        expect(describeBrew({ ...base, pourPattern: '2 Pours', iced: true })).toBe('Iced V60 2 Pours');
    });

    it('names the drink when one was built on the shot', () => {
        expect(describeBrew({ ...base, method: 'Espresso', drink: 'Flat White' })).toBe('Flat White');
    });
});

describe('hotWaterGrams', () => {
    it('is the whole yield when not iced', () => {
        expect(hotWaterGrams({ doseOut: 250, iced: false })).toBe(250);
    });

    // Ice is part of total water, so the hot pour is what is left over.
    it('subtracts the ice from total water', () => {
        expect(hotWaterGrams({ doseOut: 245, iced: true, iceGrams: 100 })).toBe(145);
    });

    it('matches the documented 15g iced recipe', () => {
        expect(hotWaterGrams({ doseOut: 245, iced: true, iceGrams: 100 })).toBe(145);
    });

    it('treats missing ice as zero', () => {
        expect(hotWaterGrams({ doseOut: 245, iced: true })).toBe(245);
    });

    it('never goes negative', () => {
        expect(hotWaterGrams({ doseOut: 50, iced: true, iceGrams: 100 })).toBe(0);
    });

    it('is null with no yield recorded', () => {
        expect(hotWaterGrams({ doseOut: undefined, iced: true, iceGrams: 100 })).toBeNull();
    });
});

describe('drink reference targets', () => {
    it('carries all seven drinks', () => {
        expect(DRINK_SPECS).toHaveLength(7);
    });

    it('records the latte target from the recipe sheet', () => {
        const latte = drinkSpec('Latte');
        expect(latte?.milkMl).toEqual([240, 300]);
        expect(latte?.milkTempC).toEqual([65, 68]);
        expect(latte?.totalMl).toEqual([300, 360]);
    });

    // Americano is why this is a drink and not a milk setting.
    it('gives Americano water and no milk', () => {
        const americano = drinkSpec('Americano');
        expect(americano?.milkMl).toBeNull();
        expect(americano?.waterMl).toEqual([120, 180]);
        expect(americano?.note).toMatch(/over the hot water/i);
    });

    it('gives Macchiato no measured milk volume', () => {
        expect(drinkSpec('Macchiato')?.milkMl).toBeNull();
    });
});

describe('brew time targets', () => {
    it('gives espresso the 25-32s window the dial-in engine uses', () => {
        expect(profileFor('Espresso').targetTimeSec).toEqual([25, 32]);
    });

    it('gives V60 the documented 3:00-3:30 drawdown', () => {
        expect(profileFor('V60').targetTimeSec).toEqual([180, 210]);
    });

    it('formats short times in seconds and long ones as m:ss', () => {
        expect(formatDuration(34)).toBe('34s');
        expect(formatDuration(29.5)).toBe('29.5s');
        expect(formatDuration(210)).toBe('3:30');
        expect(formatDuration(240)).toBe('4:00');
    });

    it('labels a window as a range and a fixed target as one value', () => {
        expect(targetTimeLabel('Espresso')).toBe('25s-32s');
        expect(targetTimeLabel('V60')).toBe('3:00-3:30');
        expect(targetTimeLabel('French Press')).toBe('4:00');
    });
});
