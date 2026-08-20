import type { ShotLog, CaffeineEntry, CaffeinePrefs } from '../types';

const CAFFEINE_MG: Record<string, number> = { 'Single': 55, 'Double': 110 };
const SHOTS_PER_BASKET: Record<string, number> = { 'Single': 1, 'Double': 2 };

export const DAILY_LIMIT = 400; // mg

export const DEFAULT_CAFFEINE_PREFS: CaffeinePrefs = {
    halfLifeHours: 5.7, // commonly cited average; varies with genetics, liver enzymes, medication
    bedtime: '22:30',
    targetMg: 40,
};

// Drinks that are not espresso shots. Espresso comes from the shot log itself.
export const INTAKE_PRESETS: { label: string; mg: number }[] = [
    { label: 'Double Espresso', mg: 110 },
    { label: 'V60 drip coffee', mg: 170 },
    { label: 'Coffee, drip (240ml)', mg: 95 },
    { label: 'Coffee, instant', mg: 62 },
    { label: 'Black tea', mg: 47 },
    { label: 'Green tea', mg: 28 },
    { label: 'Coke', mg: 34 },
    { label: 'Energy drink (250ml)', mg: 80 },
    { label: 'Dark chocolate (30g)', mg: 20 },
];

export const QUICK_ADD_PRESETS: { label: string; mg: number }[] = [
    { label: 'Double Espresso', mg: 110 },
    { label: 'V60', mg: 170 },
    { label: 'Coke', mg: 34 },
];

export function caffeineForBasket(basket: string): number {
    return CAFFEINE_MG[basket] ?? CAFFEINE_MG.Double;
}

/* ------------------------------------------------------------------ *
 * One-compartment pharmacokinetics with first-order absorption.
 *
 *   C(t) = Dose x [ka / (ka - ke)] x (e^(-ke.t) - e^(-ka.t))
 *
 * ke comes from the half-life; ka is solved so each dose peaks ~35 min
 * after it is drunk. Total level is the sum of every dose's own curve.
 * ------------------------------------------------------------------ */

const TMAX_HOURS = 35 / 60; // time to peak absorption, within the usual 30-45 min
const MS_PER_HOUR = 1000 * 60 * 60;

export interface CaffeineDose {
    mg: number;
    at: Date;
}

// Solve tmax = ln(ka/ke) / (ka - ke) for ka by bisection.
export function solveKa(ke: number, tmaxHours: number = TMAX_HOURS): number {
    let lo = ke * 1.001;
    let hi = ke * 60;
    for (let i = 0; i < 60; i++) {
        const mid = (lo + hi) / 2;
        const f = Math.log(mid / ke) / (mid - ke);
        if (f > tmaxHours) lo = mid;
        else hi = mid;
    }
    return (lo + hi) / 2;
}

// Level in mg at an absolute instant. Doses in the future contribute nothing.
export function caffeineLevelAt(doses: CaffeineDose[], at: Date, halfLifeHours: number): number {
    if (!(halfLifeHours > 0)) return 0;
    const ke = Math.log(2) / halfLifeHours;
    const ka = solveKa(ke);
    const scale = ka / (ka - ke);
    let total = 0;
    for (const dose of doses) {
        const t = (at.getTime() - dose.at.getTime()) / MS_PER_HOUR;
        if (t <= 0) continue;
        total += dose.mg * scale * (Math.exp(-ke * t) - Math.exp(-ka * t));
    }
    return Math.max(0, total);
}

export function dosesFromShots(shots: ShotLog[]): CaffeineDose[] {
    return shots.map(s => ({ mg: caffeineForBasket(s.basket), at: new Date(s.timestamp) }));
}

export function dosesFromEntries(entries: CaffeineEntry[]): CaffeineDose[] {
    return entries.map(e => ({ mg: e.mg, at: new Date(e.timestamp) }));
}

export function allDoses(shots: ShotLog[], entries: CaffeineEntry[]): CaffeineDose[] {
    return [...dosesFromShots(shots), ...dosesFromEntries(entries)];
}

// The next time the clock reads `bedtime` at or after `now`.
export function resolveBedtime(bedtime: string, now: Date): Date {
    const [h, m] = bedtime.split(':').map(Number);
    const at = new Date(now);
    at.setHours(Number.isFinite(h) ? h : 22, Number.isFinite(m) ? m : 30, 0, 0);
    if (at.getTime() < now.getTime()) at.setDate(at.getDate() + 1);
    return at;
}

export interface CurvePoint {
    at: Date;
    mg: number;
}

export interface CaffeineForecast {
    nowMg: number;
    bedtimeMg: number;
    bedtimeAt: Date;
    peakMg: number;
    peakAt: Date;
    /** When the level next falls to or below the target, or null if not within 48h. */
    underTargetAt: Date | null;
    /** True when that crossing already happened. */
    alreadyUnderTarget: boolean;
    meetsTarget: boolean;
    curve: CurvePoint[];
    targetMg: number;
}

const STEP_MIN = 5;
const SCAN_AHEAD_HOURS = 48;

export function computeForecast(
    doses: CaffeineDose[],
    prefs: CaffeinePrefs,
    now: Date = new Date(),
): CaffeineForecast {
    const { halfLifeHours, targetMg } = prefs;
    const level = (at: Date) => caffeineLevelAt(doses, at, halfLifeHours);

    const bedtimeAt = resolveBedtime(prefs.bedtime, now);

    // Scan from the earliest dose (a morning coffee may already be past its
    // peak by evening) through 48h out, so the peak found is the real one.
    const earliest = doses.reduce<number>(
        (min, d) => Math.min(min, d.at.getTime()),
        now.getTime(),
    );
    const scanEnd = now.getTime() + SCAN_AHEAD_HOURS * MS_PER_HOUR;
    const stepMs = STEP_MIN * 60 * 1000;

    let peakAt = new Date(earliest);
    let peakMg = level(peakAt);
    for (let t = earliest; t <= scanEnd; t += stepMs) {
        const at = new Date(t);
        const mg = level(at);
        if (mg > peakMg) {
            peakMg = mg;
            peakAt = at;
        }
    }

    // First crossing below target, searched forward from the peak.
    let underTargetAt: Date | null = null;
    for (let t = peakAt.getTime(); t <= scanEnd; t += stepMs) {
        const at = new Date(t);
        if (level(at) <= targetMg) {
            underTargetAt = at;
            break;
        }
    }

    // Display window: today, extended if bedtime spills past midnight.
    const windowStart = new Date(now);
    windowStart.setHours(0, 0, 0, 0);
    const windowEnd = new Date(
        Math.max(windowStart.getTime() + 24 * MS_PER_HOUR, bedtimeAt.getTime() + MS_PER_HOUR),
    );
    const curve: CurvePoint[] = [];
    for (let t = windowStart.getTime(); t <= windowEnd.getTime(); t += stepMs) {
        const at = new Date(t);
        curve.push({ at, mg: level(at) });
    }

    const bedtimeMg = level(bedtimeAt);
    return {
        nowMg: level(now),
        bedtimeMg,
        bedtimeAt,
        peakMg,
        peakAt,
        underTargetAt,
        alreadyUnderTarget: underTargetAt !== null && underTargetAt.getTime() <= now.getTime(),
        meetsTarget: bedtimeMg <= targetMg,
        curve,
        targetMg,
    };
}

/* ------------------------------------------------------------------ *
 * Daily totals: how much was consumed today, independent of what is
 * still circulating. Complements the forecast rather than replacing it.
 * ------------------------------------------------------------------ */

export type CaffeineStatus = 'low' | 'moderate' | 'high';

export interface CaffeineStats {
    todayCaffeine: number;
    todayShotCount: number;
    avgDaily: number;
    weekShotCount: number;
    percentage: number;
    status: CaffeineStatus;
    statusText: string;
    dailyLimit: number;
}

export function computeCaffeine(shots: ShotLog[], entries: CaffeineEntry[] = []): CaffeineStats {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const isToday = (ts: Date) => {
        const d = new Date(ts);
        d.setHours(0, 0, 0, 0);
        return d.getTime() === today.getTime();
    };

    const todayShots = shots.filter(s => isToday(s.timestamp));
    const todayEntries = entries.filter(e => isToday(e.timestamp));

    const todayCaffeine =
        todayShots.reduce((sum, s) => sum + caffeineForBasket(s.basket), 0) +
        todayEntries.reduce((sum, e) => sum + e.mg, 0);
    const todayShotCount = todayShots.reduce((sum, s) =>
        sum + (SHOTS_PER_BASKET[s.basket] || 2), 0);

    const weekAgo = new Date(today);
    weekAgo.setDate(weekAgo.getDate() - 7);

    const weekShots = shots.filter(s => new Date(s.timestamp) >= weekAgo);
    const weekEntries = entries.filter(e => new Date(e.timestamp) >= weekAgo);

    const weekCaffeine =
        weekShots.reduce((sum, s) => sum + caffeineForBasket(s.basket), 0) +
        weekEntries.reduce((sum, e) => sum + e.mg, 0);
    const avgDaily = Math.round(weekCaffeine / 7);
    const weekShotCount = weekShots.reduce((sum, s) =>
        sum + (SHOTS_PER_BASKET[s.basket] || 2), 0);

    const percentage = Math.min((todayCaffeine / DAILY_LIMIT) * 100, 100);

    let status: CaffeineStatus = 'low';
    let statusText = 'Feeling fresh';
    if (todayCaffeine > 300) {
        status = 'high';
        statusText = 'Consider slowing down';
    } else if (todayCaffeine > 200) {
        status = 'moderate';
        statusText = 'Nicely caffeinated';
    } else if (todayCaffeine > 0) {
        status = 'low';
        statusText = 'Room for more';
    }

    return {
        todayCaffeine,
        todayShotCount,
        avgDaily,
        weekShotCount,
        percentage,
        status,
        statusText,
        dailyLimit: DAILY_LIMIT,
    };
}
