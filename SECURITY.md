# Security Policy

Chambre Noire is a small client-side web app. It has no backend and no accounts: your data is stored locally in your browser's localStorage and never leaves your device.

## Reporting a vulnerability

If you find a security issue, please report it privately through GitHub's Private Vulnerability Reporting (the "Report a vulnerability" button on the repository's Security tab). If that is not available, open a regular [issue](https://github.com/Labnaud/Chambre-Noire/issues) and leave out sensitive details.

This is a hobby project maintained in spare time, so there is no formal response time. Fixes are made on a best-effort basis to the latest version.

## Known accepted risks

The app is currently run locally only. Two hardening items are deliberately deferred until it is deployed to a real host:

- **No Content-Security-Policy.** There are no XSS sinks in the codebase today, but a CSP should be added as a web-server response header before any public deployment.
- **Service-worker cache versioning.** `public/sw.js` serves cache-first. Bump `CACHE_NAME` on each release so clients pick up changes promptly.
