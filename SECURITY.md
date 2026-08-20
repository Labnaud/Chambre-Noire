# Security Policy

Chambre Noire is a client-side web app. It has no backend, no accounts and no
telemetry: data is stored in the browser's `localStorage` and never leaves the
device. At runtime the app makes no network requests of its own.

## Reporting a vulnerability

Report privately through GitHub's Private Vulnerability Reporting (the "Report a
vulnerability" button on the repository's Security tab). If that is unavailable,
open a regular [issue](https://github.com/Labnaud/Chambre-Noire/issues) and leave
out sensitive details.

This is a hobby project maintained in spare time, so there is no formal response
time. Fixes are best-effort against the latest version.

## Threat model

The data at risk is a personal brewing logbook. There are no credentials, no
payment details and no personal records. The realistic worst case is that a
user's own log is destroyed or corrupted.

Because there is no server, the defences that matter are all client-side:

- **Every record is validated on load.** Malformed entries are dropped and
  counted rather than trusted, and duplicate ids are rejected so one edit cannot
  affect two records.
- **Corrupt data is preserved, not overwritten.** Unparseable JSON is copied to
  `<key>:corrupt` before the key resets.
- **Imported files go through the same validators as stored data**, report what
  they skipped, and can be undone in one click.
- **CSV export neutralises spreadsheet formula injection** (CWE-1236) by
  prefixing cells that begin with `=`, `+`, `-` or `@`.

## Known accepted risks

The app currently runs locally only. Two hardening items are deliberately
deferred until it is deployed to a real host:

- **No Content-Security-Policy.** There are no XSS sinks in the codebase today
  (no `dangerouslySetInnerHTML`, no `innerHTML`, no `eval`), and no user data
  reaches an `href`, `src` or `style` value. A CSP should still be added as a
  web-server response header before any public deployment, as defence against a
  future mistake.
- **Service-worker cache versioning.** `public/sw.js` serves cache-first and
  never evicts entries from the current cache. Bump `CACHE_NAME` on each release
  so clients pick up changes, including security fixes, promptly.

## Development dependencies

`npm audit` may report advisories in build-time packages. Check whether they
reach the shipped bundle before treating one as urgent:

```bash
npm audit --omit=dev    # what actually ships
```
