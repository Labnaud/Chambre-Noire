import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
    computeCaffeine, DAILY_LIMIT, caffeineLevelAt, solveKa, resolveBedtime,
    computeForecast, dosesFromShots, allDoses,
} from './caffeine';
import type { ShotLog, Basket } from '../types';

const NOW = new Date('2026-05-12T12:00:00Z');

beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
});

afterEach(() => {
    vi.useRealTimers();
});

const shot = (basket: Basket, daysAgo = 0): ShotLog => ({
    id: Math.random().toString(),
    beanName: 'Ethiopia',
    method: 'Espresso',
    basket,
    grindSize: 12,
    strength: 2,
    rating: 'Balanced',
    timestamp: new Date(NOW.getTime() - daysAgo * 24 * 60 * 60 * 1000),
});

describe('computeCaffeine', () => {
    it('returns all zeros for an empty shot list', () => {
        const stats = computeCaffeine([]);
        expect(stats.todayCaffeine).toBe(0);
        expect(stats.todayShotCount).toBe(0);
        expect(stats.avgDaily).toBe(0);
        expect(stats.percentage).toBe(0);
        expect(stats.statusText).toBe('Feeling fresh');
    });

    it('sums caffeine by basket size for today only', () => {
        const stats = computeCaffeine([
            shot('Single'),
            shot('Double'),
            shot('Double', 3),
        ]);
        expect(stats.todayCaffeine).toBe(55 + 110);
        expect(stats.todayShotCount).toBe(1 + 2);
    });

    it('computes average daily caffeine over the past week', () => {
        const stats = computeCaffeine([
            shot('Double', 0),
            shot('Double', 1),
            shot('Double', 2),
            shot('Double', 8),
        ]);
        expect(stats.avgDaily).toBe(Math.round((110 * 3) / 7));
    });

    it('flags low status under 200mg', () => {
        const stats = computeCaffeine([shot('Single'), shot('Single')]);
        expect(stats.status).toBe('low');
        expect(stats.statusText).toBe('Room for more');
    });

    it('flags moderate status between 200 and 300mg', () => {
        const stats = computeCaffeine([shot('Double'), shot('Double')]);
        expect(stats.todayCaffeine).toBe(220);
        expect(stats.status).toBe('moderate');
    });

    it('flags high status above 300mg', () => {
        const stats = computeCaffeine([shot('Double'), shot('Double'), shot('Double')]);
        expect(stats.todayCaffeine).toBe(330);
        expect(stats.status).toBe('high');
    });

    it('caps percentage at 100', () => {
        const stats = computeCaffeine(Array.from({ length: 10 }, () => shot('Double')));
        expect(stats.percentage).toBe(100);
    });

    it('reports DAILY_LIMIT in the result', () => {
        expect(computeCaffeine([]).dailyLimit).toBe(DAILY_LIMIT);
    });
});

describe('pharmacokinetic model', () => {
    const HL = 5.7;
    const at = (h: number, m = 0) => { const d = new Date(2026, 4, 1, h, m, 0, 0); return d; };

    it('is zero before the dose is taken', () => {
        const doses = [{ mg: 100, at: at(8) }];
        expect(caffeineLevelAt(doses, at(7), HL)).toBe(0);
        expect(caffeineLevelAt(doses, at(8), HL)).toBe(0);
    });

    it('peaks about 35 minutes after the dose', () => {
        const doses = [{ mg: 100, at: at(8) }];
        const peak = caffeineLevelAt(doses, at(8, 35), HL);
        expect(peak).toBeGreaterThan(caffeineLevelAt(doses, at(8, 15), HL));
        expect(peak).toBeGreaterThan(caffeineLevelAt(doses, at(9, 15), HL));
    });

    it('recovers close to the full dose at peak', () => {
        // absorption is much faster than elimination, so the peak lands just
        // under the dose itself
        const peak = caffeineLevelAt([{ mg: 100, at: at(8) }], at(8, 35), HL);
        expect(peak).toBeGreaterThan(80);
        expect(peak).toBeLessThan(100);
    });

    it('halves roughly every half-life once absorption is done', () => {
        const doses = [{ mg: 200, at: at(0) }];
        const early = at(6);
        // offset in ms: the Date constructor truncates a fractional hour
        const later = new Date(early.getTime() + HL * 60 * 60 * 1000);
        expect(caffeineLevelAt(doses, later, HL) / caffeineLevelAt(doses, early, HL))
            .toBeCloseTo(0.5, 2);
    });

    it('sums independent doses', () => {
        const one = [{ mg: 100, at: at(8) }];
        const two = [{ mg: 100, at: at(8) }, { mg: 50, at: at(12) }];
        expect(caffeineLevelAt(two, at(16), HL))
            .toBeCloseTo(caffeineLevelAt(one, at(16), HL) + caffeineLevelAt([two[1]], at(16), HL), 6);
    });

    it('scales linearly with dose', () => {
        const single = caffeineLevelAt([{ mg: 50, at: at(8) }], at(14), HL);
        const double = caffeineLevelAt([{ mg: 100, at: at(8) }], at(14), HL);
        expect(double).toBeCloseTo(single * 2, 6);
    });

    it('a longer half-life leaves more in the system', () => {
        const doses = [{ mg: 100, at: at(8) }];
        expect(caffeineLevelAt(doses, at(20), 8)).toBeGreaterThan(caffeineLevelAt(doses, at(20), 4));
    });

    it('guards against a non-positive half-life', () => {
        expect(caffeineLevelAt([{ mg: 100, at: at(8) }], at(12), 0)).toBe(0);
    });

    it('solves ka above ke', () => {
        const ke = Math.log(2) / HL;
        expect(solveKa(ke)).toBeGreaterThan(ke);
    });
});

describe('resolveBedtime', () => {
    it('uses today when the bedtime is still ahead', () => {
        const now = new Date(2026, 4, 1, 20, 0);
        expect(resolveBedtime('22:30', now).getDate()).toBe(1);
    });

    it('rolls to tomorrow when the bedtime has passed', () => {
        const now = new Date(2026, 4, 1, 23, 0);
        const bed = resolveBedtime('22:30', now);
        expect(bed.getDate()).toBe(2);
        expect(bed.getHours()).toBe(22);
    });
});

describe('computeForecast', () => {
    const prefs = { halfLifeHours: 5.7, bedtime: '22:30', targetMg: 40 };

    it('reports a morning coffee as cleared by bedtime', () => {
        const now = new Date(2026, 4, 1, 9, 0);
        const f = computeForecast([{ mg: 110, at: new Date(2026, 4, 1, 7, 0) }], prefs, now);
        expect(f.meetsTarget).toBe(true);
        expect(f.bedtimeMg).toBeLessThan(40);
        expect(f.peakMg).toBeGreaterThan(90);
    });

    it('flags a late afternoon coffee as still active at bedtime', () => {
        const now = new Date(2026, 4, 1, 17, 0);
        const f = computeForecast([{ mg: 170, at: new Date(2026, 4, 1, 16, 0) }], prefs, now);
        expect(f.meetsTarget).toBe(false);
        expect(f.bedtimeMg).toBeGreaterThan(40);
        expect(f.underTargetAt).not.toBeNull();
        expect(f.underTargetAt!.getTime()).toBeGreaterThan(f.bedtimeAt.getTime());
    });

    it('finds a peak that is already in the past', () => {
        const now = new Date(2026, 4, 1, 20, 0);
        const f = computeForecast([{ mg: 200, at: new Date(2026, 4, 1, 7, 0) }], prefs, now);
        expect(f.peakAt.getTime()).toBeLessThan(now.getTime());
        expect(f.alreadyUnderTarget).toBe(false);
    });

    it('marks an already-cleared day as under target', () => {
        const now = new Date(2026, 4, 1, 21, 0);
        const f = computeForecast([{ mg: 60, at: new Date(2026, 4, 1, 6, 0) }], prefs, now);
        expect(f.alreadyUnderTarget).toBe(true);
        expect(f.meetsTarget).toBe(true);
    });

    it('is all zeroes with no doses', () => {
        const f = computeForecast([], prefs, new Date(2026, 4, 1, 12, 0));
        expect(f.nowMg).toBe(0);
        expect(f.peakMg).toBe(0);
        expect(f.bedtimeMg).toBe(0);
        expect(f.meetsTarget).toBe(true);
    });

    it('produces a curve covering the whole display window', () => {
        const f = computeForecast([{ mg: 100, at: new Date(2026, 4, 1, 8, 0) }], prefs, new Date(2026, 4, 1, 12, 0));
        expect(f.curve.length).toBeGreaterThan(200);
        expect(f.curve[0].at.getHours()).toBe(0);
        expect(f.curve[0].mg).toBe(0);
    });
});

describe('doses from shots and entries', () => {
    it('maps baskets to their caffeine content', () => {
        const doses = dosesFromShots([shot('Single'), shot('Double')]);
        expect(doses.map(d => d.mg)).toEqual([55, 110]);
    });

    it('combines shots and manual intake', () => {
        const entries = [{ id: 'e1', label: 'Coke', mg: 34, timestamp: new Date() }];
        expect(allDoses([shot('Double')], entries).map(d => d.mg)).toEqual([110, 34]);
    });
});

// Parity with the reference implementation this model was ported from
// (Labnaud/Caffeine-intake). Both produce these values to 0.1 mg; the guard is
// here so a refactor of solveKa or the curve cannot drift the numbers silently.
describe('parity with the reference half-life calculator', () => {
    const HL = 5.7;
    const d = (h: number, m = 0) => new Date(2026, 4, 1, h, m);

    it('two 95mg coffees at 08:00/08:30 leave 32.2mg at 23:00', () => {
        const doses = [{ mg: 95, at: d(8) }, { mg: 95, at: d(8, 30) }];
        expect(caffeineLevelAt(doses, d(23), HL)).toBeCloseTo(32.2, 1);
    });

    it('the same coffees at 16:00/16:30 leave 75.4mg at midnight', () => {
        const doses = [{ mg: 95, at: d(16) }, { mg: 95, at: d(16, 30) }];
        expect(caffeineLevelAt(doses, new Date(2026, 4, 2, 0, 0), HL)).toBeCloseTo(75.4, 1);
    });
});
