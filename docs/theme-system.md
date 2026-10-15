# Flight Desk theme foundation

Light mode is the default. The public landing page, shared brand/navigation/menu,
public Roadmap and Roadmap workspace use semantic Tailwind color names backed by
CSS variables in `app/globals.css`.

- `page`, `surface`, `surface-muted`: pure white page and cards; neutral gray accents.
- `ink`, `muted`, `subtle`: primary and secondary text.
- `brand`, `brand-hover`, `brand-soft`, `on-brand`: purple interactions and contrast text.
- `line`, `line-strong`: silver gray dividers, outlines and input borders.
- `panel`, `on-panel`, `panel-muted`, `panel-accent`: black aviation/demo panels.
- `completed-*`, `progress-*`, `planned-*`, `hold-*`: semantic status colors.
- `danger-*`: errors and destructive controls, independent of the brand color.

Use classes such as `bg-surface text-ink border-line hover:text-brand` rather than
adding hex values to components. SVGs use the same variables. Existing token names
should keep their semantic role, even when the palette changes.

## Future mode selection

Each adaptive variable uses CSS `light-dark()` and the root `color-scheme`:

- No attribute or `data-theme="light"`: light.
- `data-theme="dark"`: dark surfaces, light text and lighter purple actions.
- `data-theme="system"`: follow the OS light/dark preference.

No switch, saved preference, auto-activation or extra theme library is introduced
in this release. A future selector can set one attribute on `<html>`; it does not
need component-by-component color toggles. `light-dark()` requires a modern
browser (Chrome/Edge 123+, Firefox 120+, Safari 17.5+).

Remaining private flight/auth/settings screens still contain legacy hardcoded
colors and will need a focused token migration before dark mode is offered
globally. Their flows and layouts have not been redesigned in this release.

## Verification

Check pure-white page backgrounds, black headings, purple buttons/links/focus,
readable text contrast and distinct status badges. Preview at mobile, tablet and
desktop sizes. Check the default stays light even with an OS dark preference;
the explicit root dark/system attributes are development verification only.
