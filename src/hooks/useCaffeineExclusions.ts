import { useState, useEffect } from 'react';
import { loadCaffeineExcluded, saveCaffeineExcluded } from '../lib/storage';

// Shot ids the user removed from the caffeine calculation. Excluding is
// deliberately not deleting: the shot stays in the log, it just stops counting.
export function useCaffeineExclusions() {
    const [excluded, setExcluded] = useState<Set<string>>(() => new Set(loadCaffeineExcluded()));

    useEffect(() => { saveCaffeineExcluded([...excluded]); }, [excluded]);

    const exclude = (shotId: string) =>
        setExcluded(prev => new Set(prev).add(shotId));

    const restore = (shotId: string) =>
        setExcluded(prev => {
            const next = new Set(prev);
            next.delete(shotId);
            return next;
        });

    const replaceAll = (ids: string[]) => setExcluded(new Set(ids));

    return { excluded, exclude, restore, replaceAll };
}
