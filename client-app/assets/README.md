# App icon & splash sources

Drop these here, then run `npm run assets:generate` (from client-app/):

- `icon-only.png`   — 1024x1024, no transparency (app icon)
- `splash.png`      — 2732x2732, logo centered on brand background
- `splash-dark.png` — 2732x2732, dark-mode variant (optional)

`@capacitor/assets` generates every iOS/Android icon + splash size from these
and writes them into the native projects. Brand assets can come from Caden.
