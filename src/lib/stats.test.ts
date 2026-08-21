import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { computeStats } from './stats';
import type { ShotLog, Rating, BeanProfile } from '../types';

const NOW = new Date('2026-05-12T12:00:00Z');

beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
});

afterEach(() => {
    vi.useRealTimers();
});

const shot = (over: Partial<ShotLog> & { rating?: Rating }): ShotLog => ({
    id: Math.random().toString(),
    beanName: 'Ethiopia',
    method: 'Espresso',
    basket: 'Double',
    grindSize: 12,
    strength: 2,
    rating: 'Balanced',
    timestamp: NOW,
    ...over,
});

describe('computeStats', () => {
    it('returns empty defaults for no shots', () => {
        const s = computeStats([]);
        expect(s.totalShots).toBe(0);
        expect(s.successRate).toBe(0);
        expect(s.shotsThisWeek).toBe(0);
        expect(s.hasWeekData).toBe(false);
    });

    it('counts shots per rating', () => {
        const s = computeStats([
            shot({ rating: 'Balanced' }),
            shot({ rating: 'Balanced' }),
            shot({ rating: 'Sour' }),
            shot({ rating: 'Bitter' }),
        ]);
        expect(s.ratingCounts['Balanced']).toBe(2);
        expect(s.ratingCounts['Sour']).toBe(1);
        expect(s.ratingCounts['Bitter']).toBe(1);
        expect(s.ratingCounts['Very Sour']).toBe(0);
    });

    it('ranks topBeans by shot count, descending, max 5', () => {
        const beans = ['A', 'A', 'A', 'B', 'B', 'C', 'D', 'E', 'F', 'G'];
        const s = computeStats(beans.map(b => shot({ beanName: b })));
        expect(s.topBeans).toHaveLength(5);
        expect(s.topBeans[0]).toEqual(['A', 3]);
        expect(s.topBeans[1]).toEqual(['B', 2]);
    });


    it('rounds successRate to a percentage', () => {
        const s = computeStats([
            shot({ rating: 'Balanced' }),
            shot({ rating: 'Balanced' }),
            shot({ rating: 'Sour' }),
        ]);
        expect(s.successRate).toBe(67);
    });

    it('excludes unrated shots from the balanced rate denominator', () => {
        // Two balanced, two not-yet-tasted. A shot you never rated must not
        // count as a miss, or "save first, rate later" would tank the rate.
        const s = computeStats([
            shot({ rating: 'Balanced' }),
            shot({ rating: 'Balanced' }),
            shot({ rating: undefined }),
            shot({ rating: undefined }),
        ]);
        expect(s.totalShots).toBe(4);
        expect(s.ratedShots).toBe(2);
        expect(s.successRate).toBe(100);
    });

    it('counts shotsThisWeek over the last 7 days only', () => {
        const dayAgo = (d: number) => new Date(NOW.getTime() - d * 24 * 60 * 60 * 1000);
        const s = computeStats([
            shot({ timestamp: dayAgo(0) }),
            shot({ timestamp: dayAgo(3) }),
            shot({ timestamp: dayAgo(6) }),
            shot({ timestamp: dayAgo(10) }),
        ]);
        expect(s.shotsThisWeek).toBe(3);
    });

    it('builds a 7-day window in the days array', () => {
        const s = computeStats([shot({})]);
        expect(s.days).toHaveLength(7);
        expect(s.hasWeekData).toBe(true);
    });

    it('hides the brew breakdown when only one brew type is present', () => {
        const s = computeStats([shot({}), shot({})]);
        expect(s.showBrewBreakdown).toBe(false);
    });

    it('shows the brew breakdown when multiple brew types are present', () => {
        const s = computeStats([
            shot({ method: 'Espresso' }),
            shot({ method: 'V60' }),
        ]);
        expect(s.showBrewBreakdown).toBe(true);
    });
});

describe('sweet-spot windows are kept per method', () => {
    const mk = (over: Partial<ShotLog>): ShotLog => ({
        id: Math.random().toString(), beanName: 'Ethiopia', method: 'Espresso',
        basket: 'Double', grindSize: 21, strength: 2, rating: 'Balanced',
        doseIn: 18, doseOut: 36, extractionTime: 30, timestamp: new Date(), ...over,
    });

    // Grind is one continuous scale: espresso near 21, V60 near 66. Averaging
    // them produced 31, a setting that matches neither brew.
    it('never mixes espresso and filter grind into one figure', () => {
        const stats = computeStats([
            mk({ grindSize: 20 }), mk({ grindSize: 22 }),
            mk({ method: 'V60', grindSize: 60, doseOut: 250, extractionTime: 200 }),
            mk({ method: 'V60', grindSize: 70, doseOut: 250, extractionTime: 200 }),
        ]);
        const esp = stats.windows.find(w => w.method === 'Espresso')!;
        const v60 = stats.windows.find(w => w.method === 'V60')!;
        expect(esp.grindTypical).toBe(21);
        expect(v60.grindTypical).toBe(65);
        expect(esp.grind).toEqual([20, 22]);
        expect(v60.grind).toEqual([60, 70]);
    });

    it('reports the ratio and time each method actually lands on', () => {
        const stats = computeStats([mk({}), mk({ method: 'V60', doseIn: 15, doseOut: 250, extractionTime: 210 })]);
        expect(stats.windows.find(w => w.method === 'Espresso')!.ratioTypical).toBe(2);
        expect(stats.windows.find(w => w.method === 'V60')!.ratioTypical).toBeCloseTo(16.67, 1);
    });

    it('only counts Balanced brews', () => {
        expect(computeStats([mk({ rating: 'Bitter' })]).windows).toEqual([]);
    });
});

describe('totals and rankings', () => {
    const mk = (over: Partial<ShotLog>): ShotLog => ({
        id: Math.random().toString(), beanName: 'Ethiopia', method: 'Espresso',
        basket: 'Double', grindSize: 21, strength: 2, timestamp: new Date(), ...over,
    });

    it('totals caffeine from brews and manual drinks together', () => {
        const stats = computeStats(
            [mk({}), mk({ basket: 'Single' })], [],
            [{ id: 'i', label: 'Coke', mg: 34, timestamp: new Date() }],
        );
        expect(stats.totalCaffeineMg).toBe(110 + 55 + 34);
    });

    it('totals only the coffee actually weighed, and says how much was not', () => {
        const stats = computeStats([mk({ doseIn: 18 }), mk({ doseIn: 15 }), mk({})]);
        expect(stats.totalGroundG).toBe(33);
        expect(stats.shotsMissingDose).toBe(1);
    });

    // One shot is an anecdote, so a bean needs two before it can be ranked.
    it('ranks beans by score, ignoring one-offs', () => {
        const stats = computeStats([
            mk({ beanName: 'Good', score: 5 }), mk({ beanName: 'Good', score: 4 }),
            mk({ beanName: 'Meh', score: 2 }), mk({ beanName: 'Meh', score: 3 }),
            mk({ beanName: 'Once', score: 5 }),
        ]);
        expect(stats.bestBeans.map(b => b.bean)).toEqual(['Good', 'Meh']);
        expect(stats.bestBeans[0].avgScore).toBe(4.5);
    });

    it('ranks roasters using the bean library', () => {
        const beans: BeanProfile[] = [
            { id: '1', name: 'Ethiopia', roaster: 'Zab', isActive: true, createdAt: new Date() },
            { id: '2', name: 'Kenya', roaster: 'Canal', isActive: true, createdAt: new Date() },
        ];
        const stats = computeStats([
            mk({ beanName: 'Ethiopia', score: 5 }), mk({ beanName: 'Ethiopia', score: 4 }),
            mk({ beanName: 'Kenya', score: 3 }), mk({ beanName: 'Kenya', score: 3 }),
        ], beans);
        expect(stats.bestRoasters.map(r => r.bean)).toEqual(['Zab', 'Canal']);
    });

    it('separates Balanced from Balanced-and-the-right-strength', () => {
        const stats = computeStats([
            mk({ rating: 'Balanced', strength: 2 }),
            mk({ rating: 'Balanced', strength: 3 }),
        ]);
        expect(stats.successRate).toBe(100);
        expect(stats.sweetSpotRate).toBe(50);
    });
});

describe('shots to dial in', () => {
    const at = (d: number) => new Date(2026, 4, d);
    const mk = (bean: string, day: number, rating?: ShotLog['rating'], method: ShotLog['method'] = 'Espresso'): ShotLog => ({
        id: `${bean}-${day}-${method}`, beanName: bean, method, basket: 'Double',
        grindSize: 21, strength: 2, rating, timestamp: at(day),
    });

    it('counts from the first brew to the first Balanced one', () => {
        const stats = computeStats([
            mk('A', 1, 'Sour'), mk('A', 2, 'Bitter'), mk('A', 3, 'Balanced'),
        ]);
        expect(stats.medianShotsToDialIn).toBe(3);
    });

    it('counts each bean and method pairing separately', () => {
        const stats = computeStats([
            mk('A', 1, 'Balanced'),
            mk('A', 1, 'Sour', 'V60'), mk('A', 2, 'Balanced', 'V60'),
        ]);
        expect(stats.dialInSamples).toBe(2);
        expect(stats.medianShotsToDialIn).toBe(1.5);
    });

    // A pairing that never landed has no known length, so counting it would
    // invent a number rather than report one.
    it('ignores pairings that never reached Balanced', () => {
        const stats = computeStats([mk('A', 1, 'Sour'), mk('A', 2, 'Bitter')]);
        expect(stats.medianShotsToDialIn).toBeNull();
        expect(stats.dialInSamples).toBe(0);
    });
});
