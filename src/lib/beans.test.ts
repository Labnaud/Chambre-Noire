import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
    getDaysSinceRoast,
    getFreshnessStatus,
    getUniqueBeans,
    getFreshnessAlert,
    isDialedIn,
    activeShots,
    inactiveBeanNames,
} from './beans';
import type { ShotLog, BeanProfile } from '../types';

const NOW = new Date('2026-05-12T12:00:00Z');

beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
});

afterEach(() => {
    vi.useRealTimers();
});

describe('getDaysSinceRoast', () => {
    it('returns null when roast date is undefined', () => {
        expect(getDaysSinceRoast(undefined)).toBeNull();
    });

    it('returns whole days elapsed since the roast date', () => {
        expect(getDaysSinceRoast('2026-05-01T12:00:00Z')).toBe(11);
        expect(getDaysSinceRoast('2026-05-12T12:00:00Z')).toBe(0);
    });
});

describe('getFreshnessStatus', () => {
    it('returns Unknown for null', () => {
        expect(getFreshnessStatus(null).label).toBe('Unknown');
    });

    it('returns Resting under 7 days', () => {
        expect(getFreshnessStatus(0).label).toBe('Resting');
        expect(getFreshnessStatus(6).label).toBe('Resting');
    });

    it('returns Peak between 7 and 21 days inclusive', () => {
        expect(getFreshnessStatus(7).label).toBe('Peak');
        expect(getFreshnessStatus(21).label).toBe('Peak');
    });

    it('returns Fading between 22 and 35 days inclusive', () => {
        expect(getFreshnessStatus(22).label).toBe('Fading');
        expect(getFreshnessStatus(35).label).toBe('Fading');
    });

    it('returns Stale past 35 days', () => {
        expect(getFreshnessStatus(36).label).toBe('Stale');
        expect(getFreshnessStatus(120).label).toBe('Stale');
    });
});

describe('getUniqueBeans', () => {
    it('returns sorted unique bean names', () => {
        const shots = [
            { beanName: 'Colombia' },
            { beanName: 'Ethiopia' },
            { beanName: 'Colombia' },
            { beanName: 'Brazil' },
        ] as ShotLog[];
        expect(getUniqueBeans(shots)).toEqual(['Brazil', 'Colombia', 'Ethiopia']);
    });

    it('returns empty array for no shots', () => {
        expect(getUniqueBeans([])).toEqual([]);
    });
});

describe('getFreshnessAlert', () => {
    const makeBean = (over: Partial<BeanProfile>): BeanProfile => ({
        id: '1',
        name: 'Ethiopia',
        isActive: true,
        createdAt: new Date(),
        ...over,
    });

    it('returns null for empty bean name', () => {
        expect(getFreshnessAlert('   ', [makeBean({})])).toBeNull();
    });

    it('returns null when no matching bean profile', () => {
        expect(getFreshnessAlert('Mystery', [makeBean({ name: 'Ethiopia' })])).toBeNull();
    });

    it('returns null when matching bean has no roast date', () => {
        expect(getFreshnessAlert('Ethiopia', [makeBean({})])).toBeNull();
    });

    const roastedDaysAgo = (d: number) =>
        new Date(NOW.getTime() - d * 24 * 60 * 60 * 1000).toISOString();

    it('reports resting while the bean is still degassing', () => {
        const alert = getFreshnessAlert('Ethiopia', [makeBean({ roastDate: roastedDaysAgo(3) })]);
        expect(alert?.variant).toBe('resting');
        expect(alert?.label).toBe('Resting');
        expect(alert?.text).toMatch(/degassing/);
    });

    it('reports peak through the best window, including its last day', () => {
        for (const d of [7, 14, 21]) {
            const alert = getFreshnessAlert('Ethiopia', [makeBean({ roastDate: roastedDaysAgo(d) })]);
            expect(alert?.variant).toBe('peak');
            expect(alert?.label).toBe('Peak');
        }
    });

    it('says "today" and speaks of one day in the singular', () => {
        expect(getFreshnessAlert('Ethiopia', [makeBean({ roastDate: roastedDaysAgo(0) })])?.text)
            .toMatch(/was roasted today/);
        expect(getFreshnessAlert('Ethiopia', [makeBean({ roastDate: roastedDaysAgo(1) })])?.text)
            .toMatch(/1 day ago/);
    });

    it('returns fading variant between 22 and 35 days', () => {
        const roast30 = new Date(NOW.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
        const alert = getFreshnessAlert('Ethiopia', [makeBean({ roastDate: roast30 })]);
        expect(alert?.variant).toBe('fading');
        expect(alert?.text).toMatch(/30 days/);
    });

    it('returns stale variant past 35 days', () => {
        const roast50 = new Date(NOW.getTime() - 50 * 24 * 60 * 60 * 1000).toISOString();
        const alert = getFreshnessAlert('Ethiopia', [makeBean({ roastDate: roast50 })]);
        expect(alert?.variant).toBe('stale');
        expect(alert?.text).toMatch(/grind finer/);
    });

    it('matches bean name case-insensitively', () => {
        const roast40 = new Date(NOW.getTime() - 40 * 24 * 60 * 60 * 1000).toISOString();
        const alert = getFreshnessAlert('ETHIOPIA', [makeBean({ name: 'Ethiopia', roastDate: roast40 })]);
        expect(alert).not.toBeNull();
    });
});

// A flavour note only means something once the pairing is established; before
// that it describes a bad extraction rather than the bean.
describe('isDialedIn', () => {
    const mk = (over: Partial<ShotLog>): ShotLog => ({
        id: 'x', beanName: 'Ethiopia', method: 'Espresso', basket: 'Double',
        grindSize: 21, strength: 2, timestamp: new Date(), ...over,
    });

    it('is true once a Balanced shot exists for that bean and method', () => {
        expect(isDialedIn('Ethiopia', [mk({ rating: 'Balanced' })], 'Espresso')).toBe(true);
    });

    it('is false while the pairing has only off-target shots', () => {
        expect(isDialedIn('Ethiopia', [mk({ rating: 'Sour' }), mk({ rating: 'Bitter' })], 'Espresso')).toBe(false);
    });

    it('is false when the Balanced shot was a different method', () => {
        expect(isDialedIn('Ethiopia', [mk({ rating: 'Balanced', method: 'V60' })], 'Espresso')).toBe(false);
    });

    it('is false for a different bean', () => {
        expect(isDialedIn('Colombia', [mk({ rating: 'Balanced' })], 'Espresso')).toBe(false);
    });

    it('ignores unrated shots and an empty bean name', () => {
        expect(isDialedIn('Ethiopia', [mk({})], 'Espresso')).toBe(false);
        expect(isDialedIn('   ', [mk({ rating: 'Balanced' })], 'Espresso')).toBe(false);
    });
});

describe('activeShots', () => {
    const bean = (name: string, isActive: boolean): BeanProfile =>
        ({ id: name, name, isActive, createdAt: new Date() });
    const shot = (beanName: string): ShotLog =>
        ({ id: beanName, beanName, method: 'Espresso', basket: 'Double',
           grindSize: 21, strength: 2, timestamp: new Date() });

    it('drops shots whose bean is switched off', () => {
        const out = activeShots([shot('Ethiopia'), shot('Colombia')],
            [bean('Ethiopia', true), bean('Colombia', false)]);
        expect(out.map(s => s.beanName)).toEqual(['Ethiopia']);
    });

    it('keeps shots for beans absent from the library', () => {
        expect(activeShots([shot('Unlisted')], [bean('Colombia', false)])).toHaveLength(1);
    });

    it('is a no-op when nothing is switched off', () => {
        expect(activeShots([shot('Ethiopia')], [bean('Ethiopia', true)])).toHaveLength(1);
    });

    it('matches bean names case-insensitively', () => {
        expect(inactiveBeanNames([bean('Ethiopia', false)]).has('ethiopia')).toBe(true);
    });
});
