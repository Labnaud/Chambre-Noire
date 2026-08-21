import type { ShotLog, Rating, BeanProfile, CaffeineEntry, BrewMethod } from '../types';
import { RATINGS, TARGET_STRENGTH } from '../constants';
import { describeBrew } from './brew';
import { caffeineForBasket, CAFFEINE_MG_PER_G } from './caffeine';

export interface DayStat {
    date: string;
    balanced: number;
    total: number;
}

/** Where this method's sweet spots actually land, from your own shots. */
export interface MethodWindow {
    method: BrewMethod;
    balanced: number;
    grind: [number, number] | null;
    grindTypical: number | null;
    ratio: [number, number] | null;
    ratioTypical: number | null;
    time: [number, number] | null;
    timeTypical: number | null;
}

export interface BeanScore {
    bean: string;
    shots: number;
    avgScore: number;
}

export interface ShotStats {
    totalShots: number;
    ratedShots: number;
    scoredShots: number;
    avgScore: number | null;

    totalCaffeineMg: number;
    totalGroundG: number;
    shotsMissingDose: number;

    ratingCounts: Record<Rating, number>;
    maxRatingCount: number;
    successRate: number;
    /** Balanced *and* on-target strength: both axes right. */
    sweetSpotRate: number;

    /** Most brewed. */
    topBeans: [string, number][];
    maxBeanCount: number;
    /** Best rated, needing more than one shot to count. */
    bestBeans: BeanScore[];
    bestRoasters: BeanScore[];
    /** A bean can carry several of each, so a brew counts toward all of them. */
    bestVarieties: BeanScore[];
    bestOrigins: BeanScore[];

    windows: MethodWindow[];
    avgTimeByMethod: [BrewMethod, number][];

    /** Median shots from a bean's first log on a method to its first Balanced. */
    medianShotsToDialIn: number | null;
    dialInSamples: number;

    shotsThisWeek: number;
    days: DayStat[];
    maxDayTotal: number;
    hasWeekData: boolean;
    brewEntries: [string, number][];
    maxBrewCount: number;
    showBrewBreakdown: boolean;
}

const median = (xs: number[]): number | null => {
    if (xs.length === 0) return null;
    const s = [...xs].sort((a, b) => a - b);
    const mid = Math.floor(s.length / 2);
    return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
};

const round = (n: number, dp = 1) => Math.round(n * 10 ** dp) / 10 ** dp;
const range = (xs: number[]): [number, number] | null =>
    xs.length === 0 ? null : [Math.min(...xs), Math.max(...xs)];

const key = (s: ShotLog) => `${s.beanName.trim().toLowerCase()}|${s.method}`;

function averageBy(
    shots: ShotLog[],
    group: (s: ShotLog) => string | undefined,
    minShots: number,
): BeanScore[] {
    const buckets = new Map<string, number[]>();
    for (const s of shots) {
        if (s.score === undefined) continue;
        const g = group(s);
        if (!g) continue;
        (buckets.get(g) ?? buckets.set(g, []).get(g)!).push(s.score);
    }
    return [...buckets.entries()]
        .filter(([, scores]) => scores.length >= minShots)
        .map(([bean, scores]) => ({
            bean,
            shots: scores.length,
            avgScore: round(scores.reduce((a, b) => a + b, 0) / scores.length, 2),
        }))
        .sort((a, b) => b.avgScore - a.avgScore || b.shots - a.shots);
}

/** "Caturra, Catuai" is two varieties, not one label. */
const splitList = (value: string | undefined): string[] =>
    (value ?? '').split(',').map(v => v.trim()).filter(Boolean);

// Same as averageBy, but a brew can belong to more than one group. Totals
// across groups therefore exceed the number of brews, by design: a Caturra
// and Catuai blend really is evidence about both.
function averageByEach(
    shots: ShotLog[],
    groups: (s: ShotLog) => string[],
    minShots: number,
): BeanScore[] {
    const buckets = new Map<string, number[]>();
    for (const s of shots) {
        if (s.score === undefined) continue;
        for (const g of groups(s)) {
            (buckets.get(g) ?? buckets.set(g, []).get(g)!).push(s.score);
        }
    }
    return [...buckets.entries()]
        .filter(([, scores]) => scores.length >= minShots)
        .map(([bean, scores]) => ({
            bean,
            shots: scores.length,
            avgScore: round(scores.reduce((a, b) => a + b, 0) / scores.length, 2),
        }))
        .sort((a, b) => b.avgScore - a.avgScore || b.shots - a.shots);
}

export function computeStats(
    shots: ShotLog[],
    beans: BeanProfile[] = [],
    intake: CaffeineEntry[] = [],
): ShotStats {
    const totalShots = shots.length;

    const ratingCounts = RATINGS.reduce((acc, r) => {
        acc[r] = shots.filter(s => s.rating === r).length;
        return acc;
    }, {} as Record<Rating, number>);
    const maxRatingCount = Math.max(...Object.values(ratingCounts), 1);

    const ratedShots = shots.filter(s => s.rating).length;
    const balancedShots = shots.filter(s => s.rating === 'Balanced');
    const successRate = ratedShots > 0
        ? Math.round((balancedShots.length / ratedShots) * 100) : 0;
    // Both axes right, which is what the engine calls done.
    const sweetSpotRate = ratedShots > 0
        ? Math.round((balancedShots.filter(s => s.strength === TARGET_STRENGTH).length / ratedShots) * 100) : 0;

    const scores = shots.map(s => s.score).filter((n): n is number => n !== undefined);
    const avgScore = scores.length ? round(scores.reduce((a, b) => a + b, 0) / scores.length, 2) : null;

    // Coffee drunk without an individual brew record: most of a bag, once it is
    // dialled in and there is nothing left to learn from logging each one.
    const unloggedG = beans.reduce((sum, b) => sum + Math.max(0, b.unloggedGrams ?? 0), 0);

    // Caffeine and coffee actually consumed.
    const totalCaffeineMg = Math.round(
        shots.reduce((sum, s) => sum + caffeineForBasket(s.basket), 0)
        + unloggedG * CAFFEINE_MG_PER_G
        + intake.reduce((sum, e) => sum + e.mg, 0),
    );
    const withDose = shots.filter(s => s.doseIn !== undefined && s.doseIn > 0);
    const totalGroundG = round(withDose.reduce((sum, s) => sum + s.doseIn!, 0) + unloggedG, 0);

    // Most brewed.
    const beanCounts = shots.reduce((acc, s) => {
        acc[s.beanName] = (acc[s.beanName] || 0) + 1;
        return acc;
    }, {} as Record<string, number>);
    const topBeans = Object.entries(beanCounts).sort((a, b) => b[1] - a[1]).slice(0, 5);
    const maxBeanCount = Math.max(...topBeans.map(([, c]) => c), 1);

    // Best rated. One shot is an anecdote, so two is the floor.
    const bestBeans = averageBy(shots, s => s.beanName, 2).slice(0, 5);

    const roasterOf = new Map(
        beans.filter(b => b.roaster).map(b => [b.name.trim().toLowerCase(), b.roaster!]),
    );
    const bestRoasters = averageBy(shots, s => roasterOf.get(s.beanName.trim().toLowerCase()), 2).slice(0, 5);

    const beanByName = new Map(beans.map(b => [b.name.trim().toLowerCase(), b]));
    const lookup = (s: ShotLog) => beanByName.get(s.beanName.trim().toLowerCase());
    const bestVarieties = averageByEach(shots, s => splitList(lookup(s)?.variety), 2).slice(0, 8);
    const bestOrigins = averageByEach(shots, s => splitList(lookup(s)?.origin), 2).slice(0, 8);

    // Sweet-spot windows, per method. Grind on one continuous scale means
    // averaging espresso and filter together produces a setting for neither.
    const methods = [...new Set(shots.map(s => s.method))];
    const windows: MethodWindow[] = methods.map(method => {
        const bal = balancedShots.filter(s => s.method === method);
        const grinds = bal.map(s => s.grindSize);
        const ratios = bal
            .filter(s => s.doseIn && s.doseIn > 0 && s.doseOut)
            .map(s => round(s.doseOut! / s.doseIn!, 2));
        const times = bal.map(s => s.extractionTime).filter((n): n is number => n !== undefined);
        return {
            method,
            balanced: bal.length,
            grind: range(grinds),
            grindTypical: median(grinds),
            ratio: range(ratios),
            ratioTypical: median(ratios),
            time: range(times),
            timeTypical: median(times),
        };
    }).filter(w => w.balanced > 0);

    const avgTimeByMethod: [BrewMethod, number][] = methods
        .map((method): [BrewMethod, number] => {
            const times = shots
                .filter(s => s.method === method)
                .map(s => s.extractionTime)
                .filter((n): n is number => n !== undefined);
            const avg = times.length ? Math.round(times.reduce((a, b) => a + b, 0) / times.length) : 0;
            return [method, avg];
        })
        .filter(([, t]) => t > 0);

    // How many shots it takes to find the sweet spot: from a bean's first shot
    // on a method to its first Balanced one. Pairings never dialled in are
    // excluded rather than counted as a failure of unknown length.
    const groups = new Map<string, ShotLog[]>();
    for (const s of shots) {
        (groups.get(key(s)) ?? groups.set(key(s), []).get(key(s))!).push(s);
    }
    const dialIns: number[] = [];
    for (const g of groups.values()) {
        const ordered = [...g].sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
        const idx = ordered.findIndex(s => s.rating === 'Balanced');
        if (idx >= 0) dialIns.push(idx + 1);
    }

    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    const shotsThisWeek = shots.filter(s => s.timestamp >= weekAgo).length;

    const days: DayStat[] = [];
    for (let i = 6; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const dayShots = shots.filter(s => new Date(s.timestamp).toDateString() === date.toDateString());
        days.push({
            date: date.toLocaleDateString('en-US', { weekday: 'short' }),
            balanced: dayShots.filter(s => s.rating === 'Balanced').length,
            total: dayShots.length,
        });
    }
    const maxDayTotal = Math.max(...days.map(d => d.total), 1);

    const brewCounts = shots.reduce((acc, s) => {
        const label = describeBrew(s);
        acc[label] = (acc[label] || 0) + 1;
        return acc;
    }, {} as Record<string, number>);
    const brewEntries = Object.entries(brewCounts).sort((a, b) => b[1] - a[1]);

    return {
        totalShots,
        ratedShots,
        scoredShots: scores.length,
        avgScore,
        totalCaffeineMg,
        totalGroundG,
        shotsMissingDose: totalShots - withDose.length,
        ratingCounts,
        maxRatingCount,
        successRate,
        sweetSpotRate,
        topBeans,
        maxBeanCount,
        bestBeans,
        bestRoasters,
        bestVarieties,
        bestOrigins,
        windows,
        avgTimeByMethod,
        medianShotsToDialIn: median(dialIns),
        dialInSamples: dialIns.length,
        shotsThisWeek,
        days,
        maxDayTotal,
        hasWeekData: !days.every(d => d.total === 0),
        brewEntries,
        maxBrewCount: Math.max(...brewEntries.map(([, c]) => c), 1),
        showBrewBreakdown: brewEntries.length > 1,
    };
}
