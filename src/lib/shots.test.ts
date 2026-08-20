import { describe, it, expect } from 'vitest';
import { filterShots, getRecentShotsForBean } from './shots';
import type { ShotLog } from '../types';

const baseShot = (over: Partial<ShotLog>): ShotLog => ({
    id: 'a',
    beanName: 'Ethiopia Yirgacheffe',
    method: 'Espresso',
    basket: 'Double',
    grindSize: 12,
    strength: 2,
    rating: 'Balanced',
    timestamp: new Date('2026-05-01'),
    ...over,
});

describe('filterShots', () => {
    const shots: ShotLog[] = [
        baseShot({ id: '1', beanName: 'Ethiopia', notes: 'Bright and floral' }),
        baseShot({ id: '2', beanName: 'Colombia', notes: 'Chocolate finish' }),
        baseShot({ id: '3', beanName: 'Ethiopia', notes: undefined }),
    ];

    it('returns all shots when filters are empty', () => {
        expect(filterShots(shots, '', '')).toHaveLength(3);
    });

    it('filters by exact bean name', () => {
        const out = filterShots(shots, 'Ethiopia', '');
        expect(out.map(s => s.id)).toEqual(['1', '3']);
    });

    it('searches notes case-insensitively', () => {
        expect(filterShots(shots, '', 'CHOCOLATE').map(s => s.id)).toEqual(['2']);
    });

    it('treats shots with undefined notes as no match for a notes search', () => {
        expect(filterShots(shots, '', 'bright').map(s => s.id)).toEqual(['1']);
    });

    it('combines bean and notes filters', () => {
        expect(filterShots(shots, 'Ethiopia', 'floral').map(s => s.id)).toEqual(['1']);
    });
});

describe('getRecentShotsForBean', () => {
    it('matches normalized names and returns newest shots first', () => {
        const shots = [
            baseShot({ id: 'old', beanName: 'Ethiopia', timestamp: new Date('2026-05-01') }),
            baseShot({ id: 'other', beanName: 'Colombia', timestamp: new Date('2026-05-03') }),
            baseShot({ id: 'new', beanName: ' ETHIOPIA ', timestamp: new Date('2026-05-02') }),
        ];
        expect(getRecentShotsForBean(shots, 'ethiopia').map(shot => shot.id)).toEqual(['new', 'old']);
        expect(getRecentShotsForBean(shots, 'ethiopia', 1).map(shot => shot.id)).toEqual(['new']);
    });
});

describe('getRecentShotsForBean scoped by method', () => {
    const BEAN = 'Ethiopia Yirgacheffe';
    const at = (h: number) => new Date(2026, 4, 1, h);
    const mk = (id: string, method: 'Espresso' | 'V60', grindSize: number, h: number) =>
        baseShot({ id, method, grindSize, timestamp: at(h) });

    // An espresso grind and a V60 grind sit at opposite ends of one scale, so
    // advice built from the wrong method is worse than no advice.
    it('only returns shots brewed the same way', () => {
        const shots = [mk('e1', 'Espresso', 20, 8), mk('v1', 'V60', 55, 9)];
        expect(getRecentShotsForBean(shots, BEAN, 5, 'V60').map(s => s.id)).toEqual(['v1']);
        expect(getRecentShotsForBean(shots, BEAN, 5, 'Espresso').map(s => s.id)).toEqual(['e1']);
    });

    it('returns every method when none is given', () => {
        const shots = [mk('e1', 'Espresso', 20, 8), mk('v1', 'V60', 55, 9)];
        expect(getRecentShotsForBean(shots, BEAN, 5)).toHaveLength(2);
    });

    it('still returns newest first within a method', () => {
        const shots = [mk('v1', 'V60', 55, 8), mk('v2', 'V60', 54, 12)];
        expect(getRecentShotsForBean(shots, BEAN, 5, 'V60').map(s => s.id)).toEqual(['v2', 'v1']);
    });

    it('is empty when the bean has no shots on that method', () => {
        expect(getRecentShotsForBean([mk('e1', 'Espresso', 20, 8)], BEAN, 5, 'V60')).toEqual([]);
    });
});

describe('hiding shots from inactive beans', () => {
    const mk = (id: string, beanName: string, notes?: string) =>
        baseShot({ id, beanName, notes });
    const shots = [mk('a', 'Ethiopia', 'blueberry'), mk('b', 'Colombia', 'nutty')];
    const hidden = new Set(['colombia']);

    it('drops them from the plain browsing list', () => {
        expect(filterShots(shots, '', '', hidden).map(s => s.id)).toEqual(['a']);
    });

    // Filtering or searching is an explicit request for that bean.
    it('still finds them when the bean is picked', () => {
        expect(filterShots(shots, 'Colombia', '', hidden).map(s => s.id)).toEqual(['b']);
    });

    it('still finds them by notes search', () => {
        expect(filterShots(shots, '', 'nutty', hidden).map(s => s.id)).toEqual(['b']);
    });

    it('shows everything when no bean is switched off', () => {
        expect(filterShots(shots, '', '', new Set())).toHaveLength(2);
    });

    // A bean typed into the form without a library entry is not "inactive".
    it('keeps shots for beans that are not in the library at all', () => {
        expect(filterShots([mk('c', 'Unlisted')], '', '', hidden).map(s => s.id)).toEqual(['c']);
    });
});
