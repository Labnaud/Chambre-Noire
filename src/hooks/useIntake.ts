import { useState, useEffect } from 'react';
import type { CaffeineEntry } from '../types';
import { loadIntake, saveIntake } from '../lib/storage';

export function useIntake() {
    const [entries, setEntries] = useState<CaffeineEntry[]>(() => loadIntake());

    useEffect(() => { saveIntake(entries); }, [entries]);

    const addEntry = (entry: CaffeineEntry) => setEntries(prev => [entry, ...prev]);
    const updateEntry = (updated: CaffeineEntry) =>
        setEntries(prev => prev.map(e => (e.id === updated.id ? updated : e)));
    const deleteEntry = (id: string) => setEntries(prev => prev.filter(e => e.id !== id));
    const replaceAll = (next: CaffeineEntry[]) => setEntries(next);

    return { entries, addEntry, updateEntry, deleteEntry, replaceAll };
}
