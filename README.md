# Chambre Noire

> [!WARNING]
> **Personal project, heavy AI assistance.** This is a hobby web app. It is not production software. Use at your own discretion.

A small web app for logging espresso shots and dialing in beans. Everything runs in your browser: no account, no backend, no telemetry.

> Your data is saved in your browser's localStorage. Clearing browser data or switching browsers will erase it. Use Export Backup in Settings to save a copy.

## Features

- Log shots with bean, brew type, grind, basket, temperature, strength, and a 5-point taste rating
- Bean Library with bag tracking, best dial-in recall, and grind trends
- Quick Recipes for one-click form auto-fill
- Stats: rating distribution, top beans, weekly success rate
- Caffeine tracker with daily total and 400 mg limit warning
- Maintenance reminders for cleaning (every 200 shots) and descaling (every 90 days)
- Optional shot timer and dose/yield ratio with ristretto, normale, and lungo labels
- Next-shot tips based on taste and extraction time
- Export to JSON or CSV; import from JSON
- 6 themes; 12 or 24-hour time format

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| Ctrl+Enter | Log the current shot |
| Ctrl+B | Toggle Bean Library |
| Ctrl+D | Cycle theme |
| Esc | Close any open modal |

## Development

```bash
npm install
npm run dev      # Vite dev server
npm test         # Vitest
npm run lint
npm run build
```

## Credits

Chambre Noire is a fork of [Luxe Cafe Dashboard](https://github.com/Arishawke/luxe_cafe_dashboard)
by [Arishawke](https://github.com/Arishawke), which is copyright © 2026 Arishawke and
licensed under the GNU General Public License v3.

Changes in this fork include removing the one-time cross-domain data-migration
module, dropping bundled analytics, and generalising the shot model away from the
Ninja Luxe Cafe Pro's specific basket, froth, and strength presets.

## License

[GPL v3](LICENSE). Original work © 2026 Arishawke. Modifications © 2026 Labnaud.
