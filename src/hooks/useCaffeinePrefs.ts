import { useState, useEffect } from 'react';
import type { CaffeinePrefs } from '../types';
import { loadCaffeinePrefs, saveCaffeinePrefs } from '../lib/storage';
import { DEFAULT_CAFFEINE_PREFS } from '../lib/caffeine';

export function useCaffeinePrefs() {
    const [prefs, setPrefs] = useState<CaffeinePrefs>(() => loadCaffeinePrefs(DEFAULT_CAFFEINE_PREFS));

    useEffect(() => { saveCaffeinePrefs(prefs); }, [prefs]);

    const setPref = <K extends keyof CaffeinePrefs>(key: K, value: CaffeinePrefs[K]) =>
        setPrefs(prev => ({ ...prev, [key]: value }));

    const reset = () => setPrefs(DEFAULT_CAFFEINE_PREFS);

    return { prefs, setPref, reset };
}
