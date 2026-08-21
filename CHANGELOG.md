# Changelog

Chambre Noire starts its own version numbering at 1.0.0. The `1.x` entries below
it belong to the upstream project this was forked from and are kept for
provenance; none of that numbering carries over.

## [1.2.0] - 2026-08-21

### Added
- **The form fills itself.** Choosing a bean and method loads the settings to
  brew with: the suggestion if there is one, or the sweet-spot recipe if the
  bean is dialled in. It runs once per choice, so editing the dials afterwards
  cannot be undone by it. *Apply to form* remains as the way back after fiddling.
- **Log again.** A bean's target recipe now logs a repeat in one tap, for a brew
  that is already dialled in and is being drunk rather than worked on. It copies
  the recipe's inputs -- method, pour pattern, basket, grind, temperature, dose
  and yield -- and none of its outcomes: time, taste, strength, score and notes
  describe a cup that has not been made. Dose carries over so the bag maths
  stays exact, which is usually the reason for logging such a brew at all.

### Changed
- **Smart Barista reads in the order you work.** The comparison is now Dose,
  Grind, Output, Time: weigh the coffee, grind it, pour to a yield, and time it.
  Dose and output were previously a single combined row, and grind led.
- **A filter brew names its recipe.** V60 guidance shows which protocol produced
  the shot (`Iced V60 2 Pours`), so a sweet spot records the recipe and not just
  the numbers. Espresso has no pour pattern, so nothing is shown there.
- **Temperature appears only where it is a lever.** Filter brews keep it, because
  the engine can propose changing it. Espresso no longer shows it in the
  comparison, since temperature is never proposed there and a row that cannot
  change is noise. It is still recorded, and still shown on the shot itself.
- **Recent Journey moved below the log button.** Smart Barista answers "what
  should I do next", which belongs above the controls it refers to. The journey
  reviews shots already logged, and sitting mid-form it pushed the form's own
  controls down the page.

- **Taste is recorded as one judgement.** Strength, taste rating and score are
  grouped into a single block with one *Taste later* toggle. Logging a brew the
  moment it is pulled means none of the three is known yet, so all three are
  skipped together instead of each saving a default nobody chose. `strength` is
  now optional on a shot, and the dial-in engine no longer reads its absence as
  "weak" and proposes a change on that basis.

### Fixed
- **The sweet spot can load its own settings.** Guidance is withheld once a brew
  lands Balanced, and the apply button was rendered only when there was
  guidance -- so the one case where you most want to reuse the settings was the
  one case offering no way to. The button now shows there too.
- **Loading a recipe no longer inherits the previous verdict.** Applying a shot
  to the form copied its tasting note and score along with its settings.
- **Durations read as minutes and seconds.** Shot history, the shot detail view
  and the stopwatch all printed a raw seconds count, so a V60 showed `205s`
  instead of `3:25`. They now use the shared formatter, which switches to `m:ss`
  at one minute rather than at 100 seconds, so a 90-second brew reads `1:30`.
  A brew whose target time runs past a minute is also *entered* in minutes and
  seconds rather than as a three-figure seconds count, so a V60 takes `3` and
  `25` instead of `205`. Espresso keeps a single seconds field, where a decimal
  matters and minutes do not. Seconds roll over, so `90` becomes `1 min 30`.

## [1.1.0] - 2026-08-21

### Added
- **Published to GitHub Pages** at <https://labnaud.github.io/Chambre-Noire/>,
  deployed from `main` by a workflow that runs lint, tests and the build first,
  so a red build cannot reach the live site.
- **A Content-Security-Policy**, delivered in a meta tag because Pages cannot
  set response headers. The two inline scripts are allowed by SHA-256 hash
  instead of `'unsafe-inline'`, and the hashes are generated at build time so
  they cannot fall out of step with the scripts.

### Fixed
- **The app works from a subpath.** A project Pages site is served from
  `/Chambre-Noire/`, and every asset URL was absolute from the domain root. The
  build now takes its base path from the environment, so local development stays
  at `/` and only CI switches.
- **The PWA survives that subpath.** The manifest and the service worker now
  resolve their paths relative to their own location instead of the domain root.
  This was the quiet failure: one 404 rejects `cache.addAll()`, which aborts the
  install event, so the worker would never have registered at all.
- **Releases now reach returning visitors.** The service-worker cache name is
  stamped from the package version at build time; previously it was a constant,
  so a cache-first worker could serve one build forever.

### Security
- The build deletes `public/import/` from its output. That directory stages a
  personal backup before importing it, and while it is gitignored so CI never
  sees it, a local build would otherwise have copied a real logbook into a
  publishable `dist/`.

## [1.0.0] - 2026-08-21

First release of Chambre Noire, forked from
[Luxe Cafe Dashboard](https://github.com/Arishawke/luxe_cafe_dashboard) v1.16.0.

The fork keeps the upstream storage and validation layer and replaces most of
what sits on top: the app is no longer tied to one espresso machine, it logs
filter brews as first-class records, and its dial-in guidance follows a written
notebook method rather than generic advice. Nothing leaves the browser.

### Added
- **Brew methods.** Espresso, V60, and French Press, each with its own capability
  profile: temperature range and step, whether yield means liquid out or water
  in, target time window, default dose, and whether pour pattern, ice, or milk
  drinks apply. Adding a method is a table entry, not a set of conditionals.
- **V60 pour patterns and iced brewing.** `2 Pours` and `5 Pours` as a property
  of the brew, with ice recorded separately so hot water is derived rather than
  guessed.
- **Espresso drinks.** Latte, Macchiato, Cortado, Flat White, Cappuccino, Mocha,
  and Americano, recorded as what was built on the shot. Americano carries no
  milk, which is why this replaced the old milk-settings fields.
- **A 0–5 quality score**, separate from the sour↔bitter taste rating. The rating
  drives the dial-in engine; the score drives rankings. Conflating them meant a
  balanced shot from a mediocre bean outranked a bright one from a good bean.
- **An extraction compass.** Each shot for a bean plots as a dot across taste and
  strength, with arrows connecting shots in sequence, so the walk toward the
  sweet spot is visible instead of inferred from a list.
- **V60 brew protocols**, replacing saved recipes: per-dose pour schedules,
  roast-level grind settings, and dial-in guidance.
- **Statistics rebuilt** around what the app measures: per-method dial-in windows,
  median shots to reach a sweet spot, sweet-spot rate, best beans, roasters,
  varieties, and origins (each requiring at least two shots), total caffeine,
  and total coffee ground.
- **Bean fields**: variety, buy-again, `Co-ferment` processing, and per-method
  flavour notes, so a bean can taste different through espresso than through V60.
- **Tasting notes on the sweet spot.** Reaching a sweet spot prompts for notes
  with the roaster's own description prefilled and editable. Notes before a
  recipe is established describe a profile that does not exist yet.
- **Caffeine intake is editable**: the time of a logged drink can be corrected,
  individual shots can be excluded from the curve without deleting them from
  history, and only active beans contribute.
- **JSON backup import** from the file picker, including on mobile.

### Changed
- **Renamed to Chambre Noire** throughout: PWA manifest, service-worker cache,
  and every localStorage key (`espresso-*` and `luxe-cafe-*` are now
  `chambre-noire-*`).
- **The espresso dial-in engine follows a fixed order of levers**: grind corrects
  flow first (a two-step jump under 20s or over 40s, one step from 20–28s, and
  no grind change once the shot runs 28–40s), then yield corrects taste, then
  yield adjusts body once the taste is balanced. **Temperature is never proposed
  as an espresso adjustment** — it appears only as advice, such as a cooling
  flush after a burnt shot. Filter methods keep temperature as a lever.
- **Yield, not dose, carries strength.** Dose stays where the basket wants it and
  the ratio moves, clamped to 1:1.67–1:2.33.
- **Baskets reduced to Single and Double** (55 mg and 110 mg of caffeine). The
  machine-specific Luxe basket and the Triple are gone.
- **Grind scale widened**, with suggestion steps still expressed as ±1 and ±3 so
  they stay meaningful within one recipe.
- **Water temperature is recorded in °C.**
- **One typeface across the interface.** Titles previously set in a serif now use
  the UI sans, with weight rather than family carrying hierarchy.

### Removed
- **The one-time cross-domain data-migration module.** It existed only to move
  data to the upstream author's new domain, and its landing path applied any
  `#migrate=` URL payload over the entire dataset with no host check, no
  confirmation, and no undo.
- **Bundled Vercel Web Analytics.** The app now makes no outbound requests.
- The upstream author's funding and personal links.
- **Machine-specific presets.** Froth styles and strength labels no longer mirror
  one espresso machine's controls.
- **The per-shot session log.** Every trial shot is its own record, so the dial-in
  narrative is the shot history itself; cross-shot conclusions belong on the
  bean, where per-method flavour notes now live.
- **Saved recipes**, whose slot the V60 protocols now occupy.

### Fixed
- Editing a shot now saves the extraction time. The edit form neither loaded the
  stored value nor wrote it back, so timings silently kept their original value.
- The sweet-spot prompt fires for a bean typed directly into the form. It
  previously required an existing bean profile, which is not how a bean is
  usually entered first.
- Retired beans no longer appear in the shot form's bean dropdown.
- The caffeine forecast scans a bounded 72-hour window. It previously walked from
  the start of the year in five-minute steps on every render.
- The stopwatch label fits its button.

### Security
- See `SECURITY.md` for the fork's threat model and the hardening deliberately
  deferred for local-only use.

### Documentation
- `ARCHITECTURE.md` (layer model, data model, brew profiles, dial-in and caffeine
  engines, storage and validation, testing) and `CONTRIBUTING.md` (where a change
  belongs, how to add a brew method or drink, traps worth knowing).
- `README.md` and `SECURITY.md` rewritten for the fork.

---

## Upstream history (Luxe Cafe Dashboard)

The releases below predate the fork.

## [1.16.0] - 2026-08-06

### Changed
- Smart Barista now bases next-shot guidance on the latest shot for a bean while keeping a favorite as its separate target recipe.

### Fixed
- Damaged saved data and imported backups no longer crash startup or allow duplicate IDs to make one edit or deletion affect multiple records.
- The first-run data-migration banner now keeps its controls visible on narrow phones.
- Shot history, Bean Library editing, bean suggestions, mobile navigation, and dialogs now provide improved keyboard and screen-reader behavior.
- Editing a shot without dose data no longer carries over unsaved dose values from the form.
- Malformed old-site migration links now show the recovery message instead of breaking the landing flow.

## [1.15.0] - 2026-06-30

### Added
- Ratio labels: espresso and cold-pressed shots now show whether your dose-out ratio is a ristretto, normale, or lungo, right next to the ratio readout.
- Best dial-in recall: each bean in the Bean Library shows the settings from its best-tasting shot, with a Use button that loads them straight into the shot form.
- A dial-in trend on each bean card: a small sparkline of grind size across your recent shots, colored by how each one tasted, so you can watch a bean settle toward balanced.

### Changed
- Next-shot tips now weigh your extraction time, not taste alone: a sour shot that ran fast points to a finer grind, while a sour shot that already pulled on time points to a higher temperature instead.

## [1.14.0] - 2026-06-30

### Added
- A fifth Froth Lab milk style, Extra-Thick, matching the machine's froth presets.
- A Website link at the bottom of Settings, alongside the Support and GitHub links.

## [1.13.0] - 2026-06-21

### Changed
- Switched analytics from Umami to Vercel Web Analytics.

## [1.12.0] - 2026-06-21

### Added
- One-click data move for the new site address: if you open the new site without any data, a welcome banner can bring your shots, recipes, beans, and history over from the old site in a single click, no manual export needed.

## [1.11.0] - 2026-06-12

### Added
- Tap the grind-size number to type a value directly, alongside the slider and the +/- buttons.

### Fixed
- On phones, opening a popup no longer lets the page behind it scroll or jump out of place; the background is held still and your scroll position is kept when you close it.
- Removed the pull-down bar at the top of mobile popups that looked draggable but only triggered an accidental page refresh.
- Smoother scrolling inside popups on phones.
- The Shot Timer, Dose & Yield, and Froth Lab panels now ease open instead of snapping the layout down.
- The bean icon is no longer clipped at the top.

## [1.10.0] - 2026-06-12

### Added
- A small Support (Ko-fi) link and a GitHub link at the bottom of Settings.

## [1.9.1] - 2026-06-12

### Fixed
- On phones and tablets, the grind and taste sliders and the "Taste later" and "Froth Lab" toggles now grow back to comfortable tap sizes. Some of these controls had been renamed, which had quietly switched off their touch-friendly sizing.

## [1.9.0] - 2026-06-12

### Changed
- Settings is more compact: themes are now a tidy two-column swatch grid (the selected one is ringed in the active theme's own color), and the data tools and sections are tighter so the panel fits in view instead of scrolling.
- The expanded Shot History now shows each shot's dial-in details inline, matching the dashboard, with the favorite, edit, and delete actions grouped together.
- A refreshed icon set across the whole app for a more consistent, crafted look.
- Numbers read more elegantly and now line up in columns across stats, the caffeine tracker, and dose and yield.
- Clearer controls: recipe cards have a labelled "Apply" button, a bean's active state now reads as an "Active"/"Inactive" tag, and the Strength control looks the same everywhere.

### Fixed
- The highlight on a favorited or selected shot in the history view now renders correctly in every theme.

## [1.8.0] - 2026-06-12

### Added
- A new "Fadetouched" theme: a calm, dark teal-green palette, selectable in Settings alongside the existing five.

### Changed
- A refreshed look across the whole app: a new heading typeface, calmer flat surfaces, and a decluttered shot history where each shot reads as a clean line instead of a row of boxes. The header is now just the wordmark.
- The taste-rating slider is simpler: a clean gradient with a single handle and the live "Balanced" label, with the small marker dots removed.
- Motion is quieter throughout. Things settle smoothly instead of bouncing, and a freshly logged shot gives a soft, brief tint instead of a glow.

### Fixed
- The Bag Size and Price fields no longer show the browser's mismatched up/down spinner arrows. You can still type the value or use the arrow keys.
- Secondary text like shot times and details now meets readable contrast in the Light, Catppuccin, and Rosé Pine themes.

## [1.7.0] - 2026-06-11

### Added
- Save first, taste later: you can log a shot without rating it, then add the taste from the shot's detail card once you've tried it. Unrated shots no longer count against your balanced rate.
- Bean inventory: record a bag's size and price, and the app tracks grams left, roughly how many shots remain, and the cost per shot on each bean card. A low-bag warning appears in the Smart Barista while you log.
- A quiet word of encouragement at milestone shots (your first, your 100th, your 50th of a bean), with no badges or confetti.

### Changed
- On phones, the Stats, History, and library panels now rise from the bottom as sheets within thumb's reach, and the Log Shot button stays pinned at the bottom of the form while you fill it in. Delete confirmations stay centered.
- Dose, yield, and time fields open the number pad on mobile, and the header is more compact so more of the form is visible.
- In a shot's detail view, "Brew Again" is now the primary button.
- A freshly logged shot briefly glows in your history, and the slider and bottom sheets settle with a gentle spring. Both respect your reduced-motion setting.

### Fixed
- All five themes now render their colors correctly. The favorite-shot gold is readable in the warm light theme (it was nearly invisible), the Caffeine tracker's gauge and labels display properly, and accent glows, rating colors, and danger text now follow the active theme instead of always using the dark one.
- Delete buttons and the "stale bean" label now meet readable contrast on cards.
- The keyboard-shortcuts panel starts collapsed and no longer covers your most recent shot's buttons.

## [1.6.0] - 2026-05-30

### Changed
- Visual refresh: the emoji used as icons are replaced with a single consistent icon set, the theme picker now uses a color swatch per theme, and hover and selection animations are smoother and more intentional.
- Corners and text sizes are drawn from a consistent scale across the app for a more polished, uniform look.
- The Stats panel now leads with a large Balanced Rate figure, with context, so your dial-in success stands out at a glance.

### Fixed
- The Smart Barista panel shows a clearer heading and explanation before there is any shot history for a bean, instead of a near-empty card.

## [1.5.1] - 2026-05-30

### Fixed
- CSV export now neutralizes bean names and notes that begin with `=`, `+`, `-`, or `@`, so opening the file in Excel or Google Sheets cannot run them as formulas.

## [1.5.0] - 2026-05-30

### Added
- "Undo import" button in Settings to instantly restore your previous data after an import.

### Changed
- Importing a backup now keeps every readable entry and reports how many unreadable ones were skipped, instead of refusing the whole file or letting one bad entry corrupt your data.

### Fixed
- A damaged, hand-edited, or partial backup file can no longer blank the screen on import; unreadable entries are validated out as the file is read.
- Dates that cannot be read now show "Unknown date" instead of crashing the shot list or detail view.
- When browser storage is full or unavailable (for example in private mode), the app now warns you to export a backup instead of failing silently, and no longer risks overwriting recoverable data with an empty list.

## [1.4.3] - 2026-05-13

### Changed
- Faster first paint: Google Fonts now load via preconnect from the HTML head instead of a CSS import. Lighthouse mobile LCP estimated ~1s faster.
- Initial JavaScript bundle is ~5 KB smaller (gzip) because Bean Library, Recipe Library, Stats, Caffeine, History, Settings, and Recipe Editor modals now lazy-load their code only when first opened.

### Fixed
- Dashboard root is now a semantic `<main>` element, giving screen reader users proper landmark navigation.
- Muted text in the dark theme is slightly lighter so it meets WCAG AA (4.5:1) contrast on all background tones.

## [1.4.2] - 2026-05-13

### Changed
- Every interactive button now has at least a 44x44px tap target, so phone taps are easier and meet platform accessibility minimums.

## [1.4.1] - 2026-05-13

### Changed
- Shot detail modal now closes immediately when you click Edit, Delete, or Brew Again, so the confirm dialog or the form is no longer covered by the detail behind it.

## [1.4.0] - 2026-05-13

### Changed
- Accessibility hardening pass:
  - Added a visible `:focus-visible` ring for keyboard users across all interactive elements.
  - Honored the `prefers-reduced-motion` OS preference; animations and transitions collapse when set.
  - Respected device safe areas (notches, gesture bars) on the main dashboard for installed PWA users.
  - Associated every form label with its input via `htmlFor`/`id`, so screen readers announce field names correctly.
  - Pill-group selectors (Basket, Temperature, Strength, Milk Type, Milk Style, Timer mode) now announce their selected state and group label to screen readers.
  - Added descriptive labels to every icon-only button (modal closes, grind +/-, favorite star, edit, delete, etc.) so they are no longer silent in screen readers.
  - All nine modals now identify themselves as dialogs and trap keyboard focus while open; closing a modal restores focus to where it came from.

## [1.3.1] - 2026-05-12

### Fixed
- Rose Pine and Rose Pine Moon themes had `--color-foam` and `--color-muted` collapsed to the same color, flattening the text hierarchy. Foam now uses a lighter desaturated lavender.
- Header showed two duplicate Settings buttons (one icon-only on desktop, one with text on mobile). Consolidated to a single "Settings" button shown on both.
- Several UI labels were 10px, below the readable floor. Bumped to 12px.

## [1.3.0] - 2026-05-12

### Changed
- Swapped body font from Inter to Plus Jakarta Sans for a more distinctive look.
- Removed the infinite glow pulse on the header coffee icon (subtle drop-shadow halo retained).

## [1.2.0] - 2026-05-12

### Changed
- Switched analytics from Vercel to Umami.
- Re-licensed from MIT to GPL v3.

## [1.1.0] - 2026-05-07

### Added
- Maintenance reminders for cleaning (every 200 shots) and descaling (every 90 days), with banner alerts when a task is approaching, due, or overdue.
- Settings panel section to mark cleaning or descaling as done.
- Maintenance events round-trip through JSON import/export.

## [1.0.0] - 2026-01-28

### Added
- Log espresso shots with bean, brew type, grind size, basket, temperature, strength, and a 5-point taste rating.
- Bean Library with roaster, origin, roast level, process, roast date, and flavor notes.
- Quick Recipes for one-click form auto-fill.
- Stats dashboard with rating distribution, top beans, and weekly success rate.
- Caffeine tracker with daily total and 400 mg limit warning.
- Shot timer with dose-in, dose-out, and yield ratio.
- Tips based on your last shot for the same bean.
- Expanded shot history with split-pane preview.
- Shot comparison view.
- Ability to edit past shots.
- Single shot option.
- Export to JSON or CSV; import from JSON.
- 5 color themes (dark, light, Catppuccin, Rose Pine, Rose Pine Moon); 12 or 24-hour time format.
- Keyboard shortcuts for logging shots, opening the Bean Library, cycling themes, and closing modals.
- PWA support (installable, offline-capable).

### Fixed
- "Delete everything" reliably clears all data.
- Esc closes the Recipe Library, and Ctrl+Enter no longer logs a shot while it is open.
- Mobile layout, including theme toggle on small screens.
- Stopwatch UI.
- Scrollbar issues.
