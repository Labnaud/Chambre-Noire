import type { ShotLog, FavoritesMap, BeanProfile, MaintenanceEvent, CaffeineEntry, CaffeinePrefs } from '../types';
import {
    BASKETS,
    MILK_TYPES,
    PROCESS_METHODS,
    REPURCHASE_OPTIONS,
    RATINGS,
    ROAST_LEVELS,
    POUR_PATTERNS,
    SCORE_MAX,
    SCORE_MIN,
    STRENGTHS,
} from '../constants';
import { BREW_METHODS, ESPRESSO_DRINKS } from './brew';

const STORAGE_KEY = 'chambre-noire-shots';
const FAVORITES_KEY = 'chambre-noire-favorites';
const BEANS_KEY = 'chambre-noire-beans';
const MAINTENANCE_KEY = 'chambre-noire-maintenance';
const INTAKE_KEY = 'chambre-noire-intake';
const CAFFEINE_PREFS_KEY = 'chambre-noire-caffeine-prefs';
const CAFFEINE_EXCLUDED_KEY = 'chambre-noire-caffeine-excluded';

// Date revival, shared with the import path in dataIO.ts
export const reviveShot = (s: ShotLog): ShotLog => ({ ...s, timestamp: new Date(s.timestamp) });
export const reviveBean = (b: BeanProfile): BeanProfile => ({ ...b, createdAt: new Date(b.createdAt) });
export const reviveIntake = (e: CaffeineEntry): CaffeineEntry => ({ ...e, timestamp: new Date(e.timestamp) });

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isNonEmptyString(value: unknown): value is string {
    return typeof value === 'string' && value.trim() !== '';
}

function isOptionalString(value: unknown): boolean {
    return value === undefined || typeof value === 'string';
}

function isOptionalFiniteNumber(value: unknown): boolean {
    return value === undefined || (typeof value === 'number' && Number.isFinite(value));
}

function parsesToValidDate(value: unknown): boolean {
    if (typeof value !== 'string' && typeof value !== 'number' && !(value instanceof Date)) return false;
    return !Number.isNaN(new Date(value).getTime());
}

function isOneOf(value: unknown, options: readonly unknown[]): boolean {
    return options.includes(value);
}

// Shared by shots and recipes: method plus its optional modifiers.
function validBrewShape(value: Record<string, unknown>): boolean {
    if (!isOneOf(value.method, BREW_METHODS)) return false;
    if (value.pourPattern !== undefined && !isOneOf(value.pourPattern, POUR_PATTERNS)) return false;
    if (value.iced !== undefined && typeof value.iced !== 'boolean') return false;
    if (!isOptionalFiniteNumber(value.waterTempC)) return false;
    if (value.drink !== undefined && !isOneOf(value.drink, ESPRESSO_DRINKS)) return false;
    if (value.milkType !== undefined && !isOneOf(value.milkType, MILK_TYPES)) return false;
    return true;
}

export function validShotRecord(value: unknown): value is ShotLog {
    if (!isRecord(value)) return false;
    if (!isNonEmptyString(value.id) || !isNonEmptyString(value.beanName)) return false;
    if (!validBrewShape(value) || !isOneOf(value.basket, BASKETS)) return false;
    if (typeof value.grindSize !== 'number' || !Number.isFinite(value.grindSize)) return false;
    if (!STRENGTHS.some(({ value: strength }) => strength === value.strength)) return false;
    if (value.rating !== undefined && !isOneOf(value.rating, RATINGS)) return false;
    if (value.score !== undefined
        && (typeof value.score !== 'number' || !Number.isFinite(value.score)
            || value.score < SCORE_MIN || value.score > SCORE_MAX)) return false;
    if (!isOptionalString(value.notes) || !isOptionalFiniteNumber(value.extractionTime)
        || !isOptionalFiniteNumber(value.doseIn) || !isOptionalFiniteNumber(value.doseOut)
        || !isOptionalFiniteNumber(value.iceGrams) || !isOptionalFiniteNumber(value.milkMl)
        || !isOptionalFiniteNumber(value.milkTempC) || !isOptionalFiniteNumber(value.waterMl)) return false;
    return parsesToValidDate(value.timestamp);
}

export function validBeanRecord(value: unknown): value is BeanProfile {
    if (!isRecord(value)) return false;
    if (!isNonEmptyString(value.id) || !isNonEmptyString(value.name) || typeof value.isActive !== 'boolean') return false;
    if (value.repurchase !== undefined && !isOneOf(value.repurchase, REPURCHASE_OPTIONS)) return false;
    if (!isOptionalString(value.variety)) return false;
    if (!isOptionalString(value.roaster) || !isOptionalString(value.origin) || !isOptionalString(value.roastDate)
        || !isOptionalString(value.flavorNotes) || !isOptionalFiniteNumber(value.bagSizeGrams)
        || !isOptionalFiniteNumber(value.pricePaid)) return false;
    if (value.methodNotes !== undefined) {
        if (!isRecord(value.methodNotes)) return false;
        for (const [method, note] of Object.entries(value.methodNotes)) {
            if (!isOneOf(method, BREW_METHODS) || typeof note !== 'string') return false;
        }
    }
    if (value.roastLevel !== undefined && !isOneOf(value.roastLevel, ROAST_LEVELS)) return false;
    if (value.processMethod !== undefined && !isOneOf(value.processMethod, PROCESS_METHODS)) return false;
    return parsesToValidDate(value.createdAt);
}

export function validIntakeRecord(value: unknown): value is CaffeineEntry {
    if (!isRecord(value)) return false;
    if (!isNonEmptyString(value.id) || !isNonEmptyString(value.label)) return false;
    if (typeof value.mg !== 'number' || !Number.isFinite(value.mg) || value.mg < 0) return false;
    return parsesToValidDate(value.timestamp);
}

export function validMaintenanceRecord(value: unknown): value is MaintenanceEvent {
    if (!isRecord(value)) return false;
    if (value.task !== 'cleaning' && value.task !== 'descaling') return false;
    return typeof value.shotCountAtTime === 'number'
        && Number.isFinite(value.shotCountAtTime)
        && parsesToValidDate(value.performedAt);
}

function backupRaw(key: string): void {
    const stored = localStorage.getItem(key);
    if (stored === null) return;
    try { localStorage.setItem(`${key}:corrupt`, stored); } catch { /* best effort */ }
}

function readParsed(key: string): unknown {
    const stored = localStorage.getItem(key);
    if (stored === null) return undefined;
    try {
        return JSON.parse(stored);
    } catch (e) {
        // keep the unreadable value so a save does not silently overwrite recoverable data
        console.warn(`Corrupt data in ${key}, backing up and resetting`, e);
        backupRaw(key);
        return undefined;
    }
}

function loadArray<T>(
    key: string,
    valid: (item: unknown) => item is T,
    revive: (item: T) => T = (item) => item,
    identity?: (item: T) => string,
): T[] {
    const parsed = readParsed(key);
    if (!Array.isArray(parsed)) {
        if (parsed !== undefined && parsed !== null) {
            console.warn(`Expected an array in ${key}, resetting`);
            backupRaw(key);
        }
        return [];
    }
    const items: T[] = [];
    const seen = new Set<string>();
    let rejected = false;
    for (const item of parsed) {
        if (!valid(item)) {
            rejected = true;
            continue;
        }
        const id = identity?.(item);
        if (id !== undefined && seen.has(id)) {
            rejected = true;
            continue;
        }
        if (id !== undefined) seen.add(id);
        items.push(revive(item));
    }
    if (rejected) {
        console.warn(`Invalid entries in ${key}, backing up and skipping them`);
        backupRaw(key);
    }
    return items;
}

function loadRecord<T extends object>(key: string, fallback: T): T {
    const parsed = readParsed(key);
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
        if (parsed !== undefined && parsed !== null) console.warn(`Expected an object in ${key}, resetting`);
        return fallback;
    }
    return parsed as T;
}

export function saveStorageValue(key: string, value: string): void {
    try {
        localStorage.setItem(key, value);
    } catch (e) {
        // quota exceeded or storage disabled (private mode); never crash the render
        console.warn(`Failed to save ${key}`, e);
        if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('chambre-noire:storage-error'));
        }
    }
}

function saveJSON(key: string, value: unknown): void {
    saveStorageValue(key, JSON.stringify(value));
}

export function loadStringArray(key: string): string[] {
    return loadArray(key, isNonEmptyString, (value) => value, (value) => value);
}

export function saveStringArray(key: string, values: string[]): void {
    saveJSON(key, values);
}

export function loadShots(): ShotLog[] { return loadArray(STORAGE_KEY, validShotRecord, reviveShot, (shot) => shot.id); }
export function saveShots(shots: ShotLog[]): void { saveJSON(STORAGE_KEY, shots); }

export function loadFavorites(): FavoritesMap { return loadRecord<FavoritesMap>(FAVORITES_KEY, {}); }
export function saveFavorites(favorites: FavoritesMap): void { saveJSON(FAVORITES_KEY, favorites); }

export function loadBeans(): BeanProfile[] { return loadArray(BEANS_KEY, validBeanRecord, reviveBean, (bean) => bean.id); }
export function saveBeans(beans: BeanProfile[]): void { saveJSON(BEANS_KEY, beans); }

export function loadMaintenance(): MaintenanceEvent[] { return loadArray(MAINTENANCE_KEY, validMaintenanceRecord); }
export function saveMaintenance(events: MaintenanceEvent[]): void { saveJSON(MAINTENANCE_KEY, events); }

export function loadIntake(): CaffeineEntry[] { return loadArray(INTAKE_KEY, validIntakeRecord, reviveIntake, (entry) => entry.id); }
export function saveIntake(entries: CaffeineEntry[]): void { saveJSON(INTAKE_KEY, entries); }

// Prefs are a single record, so fall back field by field rather than rejecting
// the whole object when one value is unusable.
export function loadCaffeinePrefs(fallback: CaffeinePrefs): CaffeinePrefs {
    const stored = loadRecord<Partial<CaffeinePrefs>>(CAFFEINE_PREFS_KEY, {});
    const halfLifeHours = typeof stored.halfLifeHours === 'number'
        && Number.isFinite(stored.halfLifeHours) && stored.halfLifeHours > 0
        ? stored.halfLifeHours : fallback.halfLifeHours;
    const targetMg = typeof stored.targetMg === 'number'
        && Number.isFinite(stored.targetMg) && stored.targetMg >= 0
        ? stored.targetMg : fallback.targetMg;
    const bedtime = typeof stored.bedtime === 'string' && /^\d{1,2}:\d{2}$/.test(stored.bedtime)
        ? stored.bedtime : fallback.bedtime;
    return { halfLifeHours, bedtime, targetMg };
}
export function saveCaffeinePrefs(prefs: CaffeinePrefs): void { saveJSON(CAFFEINE_PREFS_KEY, prefs); }

// Shot ids excluded from the caffeine calculation.
export function loadCaffeineExcluded(): string[] { return loadStringArray(CAFFEINE_EXCLUDED_KEY); }
export function saveCaffeineExcluded(ids: string[]): void { saveStringArray(CAFFEINE_EXCLUDED_KEY, ids); }
