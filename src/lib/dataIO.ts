import type { ShotLog, BeanProfile, FavoritesMap, MaintenanceEvent, CaffeineEntry } from '../types';
import {
    reviveShot,
    reviveBean,
    reviveIntake,
    validShotRecord,
    validBeanRecord,
    validMaintenanceRecord,
    validIntakeRecord,
} from './storage';
import { describeBrew, hotWaterGrams, yieldLabel } from './brew';

export interface BackupPayload {
    version: number;
    exportedAt: string;
    shots: ShotLog[];
    favorites: FavoritesMap;
    beans: BeanProfile[];
    maintenance: MaintenanceEvent[];
    intake: CaffeineEntry[];
}

export interface ImportResult {
    shots: ShotLog[];
    beans: BeanProfile[];
    favorites: FavoritesMap;
    maintenance: MaintenanceEvent[];
    intake: CaffeineEntry[];
    skipped: { shots: number; beans: number; maintenance: number; intake: number };
}

export function buildBackupObject(
    shots: ShotLog[],
    beans: BeanProfile[],
    favorites: FavoritesMap,
    maintenance: MaintenanceEvent[],
    intake: CaffeineEntry[],
): BackupPayload {
    return {
        version: 3,
        exportedAt: new Date().toISOString(),
        shots,
        favorites,
        beans,
        maintenance,
        intake,
    };
}

export function buildJSONBackup(
    shots: ShotLog[],
    beans: BeanProfile[],
    favorites: FavoritesMap,
    maintenance: MaintenanceEvent[],
    intake: CaffeineEntry[],
): string {
    return JSON.stringify(buildBackupObject(shots, beans, favorites, maintenance, intake), null, 2);
}

// quote a free-text cell, doubling quotes and neutralizing spreadsheet formula injection (CWE-1236)
function csvCell(value: string): string {
    const neutralized = /^[=+\-@\t\r]/.test(value) ? `'${value}` : value;
    return `"${neutralized.replace(/"/g, '""')}"`;
}

export function buildCSV(shots: ShotLog[]): string {
    const headers = ['Date', 'Bean', 'Brew', 'Method', 'Pour Pattern', 'Iced', 'Basket', 'Grind', 'Water Temp (C)', 'Strength', 'Rating', 'Score', 'Extraction Time', 'Dose In (g)', 'Yield (g)', 'Yield Means', 'Ice (g)', 'Hot Water (g)', 'Ratio', 'Drink', 'Milk Type', 'Milk (mL)', 'Milk Temp (C)', 'Water (mL)', 'Notes'];
    const csvRows = [headers.join(',')];

    shots.forEach(shot => {
        const ratio = shot.doseIn && shot.doseOut ? `1:${(shot.doseOut / shot.doseIn).toFixed(1)}` : '';
        const row = [
            new Date(shot.timestamp).toLocaleString(),
            csvCell(shot.beanName),
            csvCell(describeBrew(shot)),
            shot.method,
            shot.pourPattern || '',
            shot.iced ? 'yes' : '',
            shot.basket,
            shot.grindSize,
            shot.waterTempC ?? '',
            shot.strength ?? '',
            shot.rating || '',
            shot.score ?? '',
            shot.extractionTime || '',
            shot.doseIn || '',
            shot.doseOut || '',
            yieldLabel(shot.method) === 'Out (g)' ? 'liquid out' : 'total water',
            shot.iceGrams ?? '',
            hotWaterGrams(shot) ?? '',
            ratio,
            shot.drink || '',
            shot.milkType || '',
            shot.milkMl ?? '',
            shot.milkTempC ?? '',
            shot.waterMl ?? '',
            csvCell(shot.notes || ''),
        ];
        csvRows.push(row.join(','));
    });

    return csvRows.join('\n');
}

export function downloadFile(filename: string, content: string, mime: string): void {
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

function isRecord(v: unknown): v is Record<string, unknown> {
    return typeof v === 'object' && v !== null && !Array.isArray(v);
}

// keep every well-formed record, drop and count the rest (a damaged backup still restores)
function collect<T>(
    arr: unknown,
    valid: (x: unknown) => x is T,
    revive: (x: T) => T = (x) => x,
    identity?: (item: T) => string,
): { items: T[]; skipped: number } {
    if (!Array.isArray(arr)) return { items: [], skipped: 0 };
    const items: T[] = [];
    const seen = new Set<string>();
    let skipped = 0;
    for (const el of arr) {
        if (!valid(el)) {
            skipped++;
            continue;
        }
        const id = identity?.(el);
        if (id !== undefined && seen.has(id)) {
            skipped++;
            continue;
        }
        if (id !== undefined) seen.add(id);
        items.push(revive(el));
    }
    return { items, skipped };
}

export function parseBackup(text: string): ImportResult {
    const data: unknown = JSON.parse(text);
    if (!isRecord(data) || !Array.isArray(data.shots)) {
        throw new Error('Invalid backup file: missing shots data');
    }

    const shots = collect<ShotLog>(data.shots, validShotRecord, reviveShot, (shot) => shot.id);
    const beans = collect<BeanProfile>(data.beans, validBeanRecord, reviveBean, (bean) => bean.id);
    // older backups predate maintenance, default to empty
    const maintenance = collect<MaintenanceEvent>(data.maintenance, validMaintenanceRecord);
    // backups older than version 3 predate the caffeine intake log
    const intake = collect<CaffeineEntry>(data.intake, validIntakeRecord, reviveIntake, (entry) => entry.id);

    const favorites: FavoritesMap = isRecord(data.favorites)
        ? Object.fromEntries(Object.entries(data.favorites).filter(([, v]) => typeof v === 'string')) as FavoritesMap
        : {};

    return {
        shots: shots.items,
        beans: beans.items,
        favorites,
        maintenance: maintenance.items,
        intake: intake.items,
        skipped: { shots: shots.skipped, beans: beans.skipped, maintenance: maintenance.skipped, intake: intake.skipped },
    };
}

export function parseImportFile(file: File): Promise<ImportResult> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                resolve(parseBackup(e.target?.result as string));
            } catch (err) {
                reject(err instanceof Error ? err : new Error('Failed to import file'));
            }
        };
        reader.onerror = () => reject(new Error('Failed to read file'));
        reader.readAsText(file);
    });
}
