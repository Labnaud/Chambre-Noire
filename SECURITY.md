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

## Deployment hardening

The app is published to GitHub Pages, which serves static files and **cannot set
response headers**. The hardening that would normally live in a header is
therefore done differently:

- **Content-Security-Policy** travels in a `<meta http-equiv>` tag. The two
  inline scripts (the theme applied before first paint, and the service-worker
  registration) are allowed **by SHA-256 hash rather than `'unsafe-inline'`**,
  and the hashes are computed at build time by a Vite plugin so they cannot
  drift out of date with the scripts they authorise. `style-src` still needs
  `'unsafe-inline'`, because React writes style attributes at runtime and a
  runtime value cannot be hashed in advance.
- **`frame-ancestors` is deliberately absent.** It is ignored in a meta tag and
  only works as a real header, so listing it would suggest a protection that is
  not there. Framing protection needs a host that can send headers.
- **Service-worker cache versioning** is automatic. `CACHE_NAME` is stamped from
  the `package.json` version at build time, so a release evicts the previous
  cache instead of serving it indefinitely. The worker is stale-while-revalidate,
  so a returning visitor still runs the previous build for one load before the
  new one takes effect.
- **Staged personal data cannot ship.** `public/import/` is where a backup is
  placed before importing it into the app. It is gitignored, so CI never sees
  it, and the build additionally deletes it from the output, so a local build
  cannot publish a real logbook by accident.

Everything the app stores stays in the visitor's own browser. Publishing it
exposes the code, not anyone's data.

## Development dependencies

`npm audit` may report advisories in build-time packages. Check whether they
reach the shipped bundle before treating one as urgent:

```bash
npm audit --omit=dev    # what actually ships
```
