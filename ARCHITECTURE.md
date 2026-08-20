# Architecture

Chambre Noire is a single-page React app with no backend. Every byte of user
data lives in the browser's `localStorage`, and the app makes no network
requests at runtime.

- **React 19** + **TypeScript 5.9** (strict), built by **Vite 8**
- **Vitest** for tests, **ESLint 9** flat config
- Three runtime dependencies: `react`, `react-dom`, `@phosphor-icons/react`

---

## The four layers

```
  src/App.tsx          composition root: owns state wiring and handlers
        |
        v
  src/components/      presentational, props-driven, no storage access
        |
        v
  src/hooks/           React state + localStorage persistence
        |
        v
  src/lib/             pure domain logic, zero React imports
```

The rule that keeps this honest: **`src/lib` never imports React.** That is why
the whole test suite runs in a plain `node` environment with no DOM, no jsdom,
and no component harness. If a piece of logic needs a test, it belongs in
`src/lib`.

| Layer | Lines | Contains |
|---|---|---|
| `src/lib` | ~3,400 | domain rules, storage, validation, import/export |
| `src/hooks` | ~680 | one hook per persisted collection, plus UI hooks |
| `src/components` | ~3,800 | dashboard, shot form, seven lazy-loaded modals |
| `src/index.css` | ~6,200 | design tokens and every style rule |

### The App.tsx caveat

`App.tsx` is a large composition root (~900 lines). It holds the state, wires
the hooks, and defines the handlers that components call. There is no context,
no reducer and no router. This is the main structural weak point: it is the file
most likely to be touched by any change, and the place a refactor would pay off
first.

---

## Data model

Defined in `src/types.ts`. Five collections persist independently.

### ShotLog

One record per brew. The fields split into four groups.

**Identity and brew shape**

| Field | Type | Notes |
|---|---|---|
| `id` | `string` | `crypto.randomUUID()` |
| `beanName` | `string` | matched to `BeanProfile.name` by lowercased string |
| `method` | `'Espresso' \| 'V60' \| 'French Press'` | the device |
| `pourPattern?` | `'2 Pours' \| '5 Pours'` | V60 only |
| `iced?` | `boolean` | hot-brewed onto ice; **not** a cold brew |
| `iceGrams?` | `number` | part of `doseOut`, so hot water = `doseOut - iceGrams` |
| `basket` | `'Single' \| 'Double'` | espresso only |
| `timestamp` | `Date` | full instant, not a date |

**Measurements**

| Field | Type | Notes |
|---|---|---|
| `grindSize` | `number` | one continuous scale, `GRIND_MIN`..`GRIND_MAX` (1-80) |
| `waterTempC?` | `number` | degrees C, bounded per method |
| `doseIn?` | `number` | grams of coffee |
| `doseOut?` | `number` | **meaning depends on method** (see below) |
| `extractionTime?` | `number` | seconds |
| `strength` | `1 \| 2 \| 3` | legacy field, see *Known leftovers* |

**Assessment** — two independent axes, and conflating them breaks things:

| Field | Type | Means |
|---|---|---|
| `rating?` | `Very Sour \| Sour \| Balanced \| Bitter \| Very Bitter` | *which way* the extraction leaned |
| `score?` | `number` 0-5, half steps | *how good* the cup was |

A 4.5/5 says nothing about sour vs bitter. Only `rating` drives the dial-in
engine; `score` is a pure taste record. Either can be present without the other.

**Drink and notes**

| Field | Type | Notes |
|---|---|---|
| `drink?` | 7 espresso drinks | what was built on the shot |
| `milkType?` `milkMl?` `milkTempC?` `waterMl?` | | what was actually poured |
| `notes?` | `string` | short tasting note |
| `sessionLog?` | `string` | long-form: trial shots, changes, conclusions |

### Other collections

- **`BeanProfile`** — roaster, origin, roast level, process, roast date, bag
  size, price. Freshness and inventory features derive from these.
- **`SavedRecipe`** — a reusable set of brew settings; mirrors the shot brew shape.
- **`CaffeineEntry`** — caffeine from something that is not a logged brew.
- **`MaintenanceEvent`** — a cleaning or descale, with the shot count at the time.
- **`FavoritesMap`** — lowercased bean name to the id of its target shot.

---

## Brew profiles

`src/lib/brew.ts` is the single place that answers *what does this method
support*. Before it existed, those answers were spread across two arrays: one
listing which brews hid the temperature control, another listing which brews got
espresso ratio labels. Both were lookup tables pretending to be lists, and
neither could describe a hot brew served over ice.

```ts
BREW_PROFILES[method] = {
  hasWaterTemp, tempRangeC, defaultTempC, tempStepC,
  yieldMeans,        // 'liquid' | 'water'
  ratioStyle,        // 'espresso' | 'filter'
  typicalRatio,
  hasPourPattern, supportsIce, supportsDrink,
}
```

**`yieldMeans` is the important one.** For espresso, `doseOut` is liquid in the
cup and the ratio is about 1:2. For filter, `doseOut` is *total brew water* and
the ratio is about 1:16.6. The same column, two quantities. The UI relabels the
field from the profile (`yieldLabel()`), the CSV export writes an explicit
`Yield Means` column, and `getRatioLabel()` returns `null` for anything whose
`ratioStyle` is not `'espresso'` so no filter brew is ever labelled a lungo.

An **iced** brew is `method: 'V60', iced: true`. It keeps its water temperature,
because ice is orthogonal to how the coffee was brewed. `hotWaterGrams()`
derives the hot pour by subtracting the ice from total water.

`describeBrew()` produces the display label: `Espresso`, `V60 5 Pours`,
`Iced V60 2 Pours`, or the drink name when one was built on the shot.

---

## Dial-in engine

`src/lib/suggestions.ts` reads the last rated shot for the current bean **on
the current method** and proposes the next one.

**Espresso** follows one parameter at a time, in a fixed order:

1. **Flow, through grind.** Absolute priority. Under 20s or over 40s takes a
   2-step jump; 20-28s takes 1 step; 28-40s is workable and the grind is left
   alone.
2. **Taste, through yield.** Only once flow is in range, so a grind change
   cannot undo a shot time that was already right. 2g normally, 4g at the
   extremes, clamped to the 1:1.67-1:2.33 ratio window.
3. **Body, through yield.** Only once taste is Balanced. Dose stays anchored
   at 18g; refinement goes through yield.

**Temperature is not an adjusted parameter on espresso.** It surfaces only as
advice when the flow is right and the cup still reads wrong: burnt at a correct
time means cool-flush the group, residual sourness with the grind in range means
purge first. `SuggestedSettings.advice` carries that, separately from `reason`.

**Filter keeps temperature as a real lever**, since its order is grind, then
temperature, then ratio and agitation.

A bean with no history on the current method gets the documented starting point
for its roast level instead. Without a roast level there is no starting point
and the card says so rather than guessing.

- **Grind is the primary lever**, moving 1 step for Sour/Bitter and 3 for
  Very Sour/Very Bitter. Those step sizes are deliberately **not** scaled to the
  width of the grind range: a dial-in move is a few clicks within one
  bean and recipe, not a fraction of the scale.
- **Temperature is the secondary lever**, stepped by the method's `tempStepC`
  (1 degree for espresso, 2 for filter) and clamped to the method's range.
- **With an extraction time on an espresso pull**, flow rate picks the lever
  instead of taste alone: a sour shot that ran fast wants a finer grind, while a
  sour shot that already pulled on time wants more heat. When a temperature
  lever has no headroom it falls back to grind.

`src/lib/dialIn.ts` holds ratio labels, best-dial-in recall (closest to
Balanced, most recent wins ties) and the grind progression behind the sparkline.

---

## Caffeine model

`src/lib/caffeine.ts` runs a one-compartment pharmacokinetic model with
first-order absorption:

```
C(t) = Dose * [ka / (ka - ke)] * (e^(-ke*t) - e^(-ka*t))
```

`ke` comes from the half-life; `ka` is solved by bisection so each dose peaks
about 35 minutes in. Total level is the sum of every dose's own curve.

Doses are **absolute instants**, not clock times. Logged brews become doses
automatically via `dosesFromShots()` (basket to mg at the shot's timestamp), so
the shot log doubles as the intake log; `CaffeineEntry` covers everything else.

Every dose has a visible row in the intake list. Removing a shot row **excludes**
it (its id goes into `chambre-noire-caffeine-excluded`) rather than deleting the
shot: a caffeine screen should not destroy a brewing record. Exclusions are
reversible from the same list.

The forecast reports current level, level at bedtime, peak, and when the level
next falls below the target. The older daily-total view is kept alongside it as
a separate "consumed today" figure rather than being replaced.

---

## Storage and validation

`src/lib/storage.ts` owns every read and write. It is deliberately defensive,
because there is no server to fall back on.

- Every record is checked by a hand-written type guard on load. Anything that
  fails is dropped and counted, not silently coerced.
- Duplicate ids are rejected, so one edit cannot affect two records.
- Unparseable JSON is copied to `<key>:corrupt` before the key is reset, so a
  bad write never destroys recoverable data.
- A failed write (quota, private mode) dispatches `chambre-noire:storage-error`
  rather than throwing, and the app surfaces a toast.

**Keys**

```
chambre-noire-shots            chambre-noire-intake
chambre-noire-beans            chambre-noire-caffeine-prefs
chambre-noire-recipes          chambre-noire-maintenance
chambre-noire-favorites        chambre-noire-pinned-recipes
chambre-noire-theme            chambre-noire-24hour
chambre-noire-show-shortcuts   chambre-noire-caffeine-excluded
```

`src/lib/dataIO.ts` handles backup and export. The JSON backup is at **schema
version 3**; older backups load with missing collections defaulting to empty.
Import reuses the same validators as load, reports how many entries it skipped,
and App keeps a snapshot so the whole import can be undone in one click.

CSV export quotes free-text cells and neutralises spreadsheet formula injection
(CWE-1236) by prefixing a leading `=`, `+`, `-` or `@`.

---

## Styling

One stylesheet, `src/index.css`, organised as design tokens plus rules. Six
themes are pure CSS custom properties on `[data-theme]`; no component hardcodes
a themed colour.

`src/lib/cssTokens.test.ts` guards two failure modes that have actually shipped
before: a custom property defined circularly in terms of itself (which silently
resolves to transparent), and a dead selector left in the `@media (pointer:
coarse)` block after a class rename, which quietly stops enlarging touch
targets. Both now fail the suite.

Charts are inline SVG rather than canvas, so they inherit theme tokens and stay
crisp.

---

## Testing

228 tests across 14 files, all in `src/lib`, all in a `node` environment.

Notable guards worth not deleting:

- **Caffeine parity** — two values (32.2 mg and 75.4 mg) verified against the
  reference implementation this model was ported from. They pin the maths
  against a refactor of `solveKa` or the curve.
- **Grind step sizes** — asserts a dial-in move stays 1 to 3 steps even though
  the scale spans 1-80.
- **Storage round-trips** — malformed, duplicate and out-of-range records.
- **CSS tokens** — the two failure modes above.

> [!NOTE]
> **There are no component or hook tests.** `tsc` proves the props line up and
> nothing more. Any UI change should be looked at in a browser before it is
> trusted. Note also that `tsconfig.app.json` **excludes test files**, so a
> signature change will not be caught by `tsc` in a test file, only by Vitest.

---

## Known leftovers

- **`strength` (1-3)** is a preset from the machine the upstream project was
  built for. Nothing in the current workflow produces it, and it is a candidate
  for removal.
- **Pour-stage detail** (bloom mass, bloom time, per-pour schedule and timings)
  is not modelled. Only the pour *pattern* is recorded.
- **No Content-Security-Policy**, and the service worker is cache-first with a
  `CACHE_NAME` that must be bumped per release. Both are deliberately deferred
  while the app runs locally; see [SECURITY.md](SECURITY.md).
