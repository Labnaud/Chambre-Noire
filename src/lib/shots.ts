import type { ShotLog, BrewMethod } from '../types';

export function filterShots(
    shots: ShotLog[],
    beanFilter: string,
    notesSearch: string,
    hiddenBeanNames?: Set<string>,
): ShotLog[] {
    const search = notesSearch.toLowerCase().trim();
    // Filtering or searching is an explicit request, so it reaches shots from
    // inactive beans too. Only the unfiltered list hides them.
    const browsing = beanFilter === '' && search === '';
    return shots.filter(shot => {
        if (beanFilter && shot.beanName !== beanFilter) return false;
        if (search && !(shot.notes ?? '').toLowerCase().includes(search)) return false;
        if (browsing && hiddenBeanNames?.has(shot.beanName.trim().toLowerCase())) return false;
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
