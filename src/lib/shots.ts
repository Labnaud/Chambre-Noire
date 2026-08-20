import type { ShotLog, BrewMethod } from '../types';

export function filterShots(shots: ShotLog[], beanFilter: string, notesSearch: string): ShotLog[] {
    const search = notesSearch.toLowerCase().trim();
    return shots.filter(shot => {
        if (beanFilter && shot.beanName !== beanFilter) return false;
        if (search && !(shot.notes ?? '').toLowerCase().includes(search)) return false;
        return true;
    });
}

// Scoped to a method when one is given: an espresso grind and a V60 grind sit
// at opposite ends of the same scale, so mixing them produces nonsense advice.
export function getRecentShotsForBean(
    shots: ShotLog[],
    beanName: string,
    limit?: number,
    method?: BrewMethod,
): ShotLog[] {
    const key = beanName.trim().toLowerCase();
    if (!key) return [];
    const matching = shots
        .filter(shot => shot.beanName.trim().toLowerCase() === key)
        .filter(shot => method === undefined || shot.method === method)
        .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
    return limit === undefined ? matching : matching.slice(0, limit);
}
