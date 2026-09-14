# Landing page (static)

Production-refined static version of the public homepage.

## Run

```
cd dashboard
node server.js
```

Open http://localhost:3456 (set `PORT` to change the port).

## Files

- `index.html` — page markup (Armenian content, no inline styles or behaviour).
- `assets/css/claudeweb_root.css`, `assets/css/claudeweb_home.css` — compiled design system and homepage components from the Next build.
- `assets/css/landing.css` — production layer: light/dark page tokens, glass surfaces, background field, header/menu, buttons, reveal, responsive rules.
- `assets/js/landing.js` — showcase modes, slider, viewer (loads the model only when opened), fullscreen, theme toggle, mobile menu, scroll reveal, point-field background.
- `assets/media/*.woff2` — self-hosted fonts referenced by the compiled CSS.
- `/brand`, `/demo` — served from `assets/brand` and `assets/demo` by the dashboard server.

## Theme

`<html data-theme="light|dark">`, chosen from the `theme` cookie / localStorage, otherwise `prefers-color-scheme`. All page tokens live in `landing.css` under `:root` and `:root[data-theme="dark"]`.
