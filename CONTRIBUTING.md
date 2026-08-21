# Working on Chambre Noire

Conventions for making changes here. Read [ARCHITECTURE.md](ARCHITECTURE.md)
first for how the layers fit together.

---

## The loop

```bash
npm install          # once
npm run dev          # hot reload on http://localhost:5173

# before committing
npm run lint
npm test
npm run build        # runs tsc -b first, so it type-checks too
```

All three must pass. CI runs exactly these on Node 22.

---

## Where a change belongs

| If the change is... | It goes in | And gets |
|---|---|---|
| a rule, calculation or transform | `src/lib/` | a test |
| persisted state | `src/hooks/` | validation in `src/lib/storage.ts` |
| how something looks | `src/components/` + `src/index.css` | a look in the browser |
| wiring between them | `src/App.tsx` | care, it is the busiest file |

The single most useful habit: **push logic down into `src/lib` and keep
components dumb.** Anything in `src/lib` is testable without a DOM, which is why
288 tests run in about a second. Logic that ends up in a component is logic that
will not be tested, because there is no component test harness.

`src/lib` must never import React.

---

## Adding things

### A brew method

1. Add it to `BrewMethod` in `src/types.ts`.
2. Add its entry to `BREW_PROFILES` in `src/lib/brew.ts` — this declares
   whether it has a water temperature and in what range, whether its yield is
   liquid or total water, whether ratio labels apply, and whether it supports
   pours, ice or a drink.
3. That is usually it. The form, the yield label, the ratio logic and the
   suggestion engine all read the profile.

**Do not** add a new array listing "methods that do X". That is the pattern the
profile table replaced. Add a field to the profile instead.

### A drink

Add a `DrinkSpec` to `DRINK_SPECS` in `src/lib/brew.ts`. Its reference values
(milk volume, temperature, ratio, foam) are **targets shown as guidance**, not
logged data. What the user actually poured goes in the per-shot `milkMl`,
`milkTempC` and `waterMl` fields. Keep that separation — it is the difference
between a recipe and a record.

### A persisted field

1. Add it to the interface in `src/types.ts`.
2. Extend the matching guard in `src/lib/storage.ts` so a malformed value is
   rejected rather than trusted.
3. If it belongs in a backup, add it to `src/lib/dataIO.ts` — the payload, the
   `ImportResult`, and the skip counts.
4. If it belongs in CSV, add both a header and a cell. Free text goes through
   `csvCell()`.
5. Add a test for the guard.

### A persisted collection

As above, plus a `use*` hook following the existing shape
(`useState(() => loadX())` with a `useEffect` that saves), an entry in
`src/hooks/index.ts`, and wiring in `App.tsx` for import, undo and Clear All.

---

## Conventions

**Storage keys** are all prefixed `chambre-noire-`. Renaming one orphans
existing user data, so treat it as a breaking change.

**Colours** come from CSS custom properties. Never hardcode a themed colour in a
component or in a rule — there are six themes, and a literal is right in one of
them and wrong in five. `src/lib/cssTokens.test.ts` enforces this.

**Charts** are inline SVG, not canvas, so they pick up theme tokens.

**Comments** explain *why*, not *what*. The valuable ones here record a
constraint that is not obvious from the code — why grind steps stay small on a
wide scale, why ice is orthogonal to brew method, why two rating axes exist.

---

## Traps worth knowing

**`tsconfig.app.json` excludes test files.** A changed function signature will
type-check clean and then fail in Vitest. Run the tests, not just the build.

**Two rating axes.** `rating` is direction (sour to bitter) and drives all
guidance; `score` is quality (0-5) and drives none of it. They are not
convertible. Do not collapse them.

**`doseOut` means different things per method** — liquid out for espresso, total
brew water for filter. Always ask `profileFor(method).yieldMeans` before doing
arithmetic on it. For an iced brew, ice is *inside* that number; use
`hotWaterGrams()`.

**Grind step sizes are not proportional to the range.** The scale spans 1-80 but
a suggested move is still 1 to 3 steps. A test pins this.

**Changing a validator is a breaking change** for anyone with existing data.
Records that no longer validate are dropped on load and backed up to
`<key>:corrupt`.

---

## Commits

- Conventional-ish prefixes: `feat:`, `fix:`, `chore:`, `docs:`.
- Explain *why* in the body when the change is not self-evident.
- Do not commit personal data. There is no backend, so nothing user-specific
  should ever reach the repo — no exported backups, no real logbook content, no
  machine-specific paths or addresses.
- Check `git config user.email` before your first commit in a fresh clone. If it
  is unset, git invents `user@hostname` and writes it permanently into history.
  Use a GitHub noreply address.

---

## License

GPL v3. This is a fork; the upstream copyright notice in `LICENSE` and the
attribution in `README.md` must stay. See [ARCHITECTURE.md](ARCHITECTURE.md) and
[CHANGELOG.md](CHANGELOG.md) for what this fork changed.
