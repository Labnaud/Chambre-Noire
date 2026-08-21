import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

// Guards the design-token layer in index.css. A mechanical hex -> token
// migration once rewrote `--color-sour: #D4915C` into `--color-sour:
// var(--color-sour)`, a circular definition that silently resolved to
// transparent in the default theme. These checks make that class of bug fail
// the suite instead of shipping.
const css = readFileSync(
    fileURLToPath(new URL('../index.css', import.meta.url)),
    'utf8',
);

describe('design tokens in index.css', () => {
    it('has no circular custom-property definitions', () => {
        const circular: string[] = [];
        const re = /(--[a-z0-9-]+)\s*:\s*var\((--[a-z0-9-]+)[\s,)]/g;
        for (const m of css.matchAll(re)) {
            if (m[1] === m[2]) circular.push(m[1]);
        }
        expect(circular).toEqual([]);
    });

    it('references no custom property that is never defined', () => {
        // var(--color-sage) once slipped in for a button, a token that does not
        // exist in any theme; an undefined property resolves to nothing and the
        // control renders with no colour at all. Typos in a token name are
        // invisible until someone looks at the right screen in the right theme.
        const defined = new Set<string>();
        for (const m of css.matchAll(/(--[a-z0-9-]+)\s*:/g)) defined.add(m[1]);

        const referenced = new Set<string>();
        for (const m of css.matchAll(/var\(\s*(--[a-z0-9-]+)/g)) referenced.add(m[1]);

        // Set from JS as an inline style, so it is legitimately absent here.
        const setAtRuntime = new Set(['--rating-color']);

        const undefinedTokens = [...referenced]
            .filter(t => !defined.has(t) && !setAtRuntime.has(t))
            .sort();
        expect(undefinedTokens).toEqual([]);
    });

    it('leaves no raw rating/accent hex literals in rules (tokens only)', () => {
        // The six themes own these colors; a literal here is right in one
        // theme and wrong in the other five.
        const offenders = ['#D4915C', '#7A9E6D', '#B85C5C', '#E8A045', '#C04545', '#FFD700'];
        const body = css.slice(css.indexOf('/* Reset & Base */'));
        const found = offenders.filter(hex => body.toUpperCase().includes(hex));
        expect(found).toEqual([]);
    });
});

describe('mobile touch targets in index.css', () => {
    it('only enlarges pointer:coarse selectors that still exist in markup', () => {
        // A renamed/removed class leaves a dead selector in the coarse-pointer
        // block, so the touch enlargement silently stops applying. `.grind-slider`
        // and `.froth-toggle` both rotted this way after refactors. Tie every
        // coarse selector back to a live className so the next rename fails here.
        const start = css.indexOf('@media (pointer: coarse)');
        const block = css.slice(start, css.indexOf('\n}', css.indexOf('}', start)) + 2);
        const selectors = [...new Set([...block.matchAll(/\.[a-z][\w-]*/g)].map(m => m[0].slice(1)))];

        const srcDir = fileURLToPath(new URL('..', import.meta.url));
        const markup = readdirSync(srcDir, { recursive: true })
            .filter((f): f is string => typeof f === 'string' && f.endsWith('.tsx'))
            .map(f => readFileSync(new URL(`../${f}`, import.meta.url), 'utf8'))
            .join('\n');

        const dead = selectors.filter(cls => !new RegExp(`(?<![\\w-])${cls}(?![\\w-])`).test(markup));
        expect(dead).toEqual([]);
    });
});
