---
name: glaze-theming
description: Theme a Glaze app's colors when the user asks for a color scheme, brand colors, or a visual vibe ("make it soft yellow", "cyberpunk dark", "match my brand"). Covers seed-variable overrides, the light-mode saturation rule, and integrating with the app's appearance setting (replace it or extend it with selectable themes).
---

# Glaze App Theming

Glaze's entire color system derives from a handful of **seed variables**. Theme an app by overriding the seeds — every ramp, semantic token (`text-secondary`, `bg-control`, `border-separator`), and icon color recomputes automatically. Never theme by scattering color classes on components.

## Choose the approach from the user's intent

| User asks for | Approach |
| --- | --- |
| One look — "make it soft yellow", "brand colors", "cyberpunk" | **A. Seed overrides** in the app stylesheet. The default system/light/dark setting keeps working. |
| Selectable looks — "let me choose themes", "add a forest theme" | **B. Theme picker** — typed `Theme` objects injected at runtime, extending the settings window. |

## The seeds

| Seed | Drives |
| --- | --- |
| `--bg`, `--bg-secondary` | Window background gradient (top → bottom) and all `bg-*` ramps |
| `--fg` | All text/border/control ramps (`text-secondary` = fg at 60%, `bg-control` = fg at 10%, …) |
| `--theme-accent` | Accent (buttons, selection highlights). Leave `--accent` itself alone — it chains the user's macOS system accent over the theme accent |
| `--selection`, `--loader` | Text selection tint, loaders |
| `--red --orange --yellow --green --blue --purple --magenta` | Support colors (status text, badges) |

## A. Seed overrides (the common case)

Add overrides to the app's stylesheet (after the `@glaze/core` import). Theme **both appearances** so the existing system/light/dark setting keeps working:

```css
/* Soft-yellow brand theme */
:root {
  --bg: #ffe8a3; /* see the saturation rule below — NOT a literal pastel */
  --bg-secondary: #ffd97a;
  --fg: #3a2f14;
  --theme-accent: #b8860b;
}
.dark {
  --bg: #1c1607;
  --bg-secondary: #241c08;
  --fg: #f4e8c8;
  --theme-accent: #e8b339;
}
```

Only override what the theme needs — seeds you don't set keep their defaults (support colors usually stay).

### The light-mode saturation rule (critical)

The window composites `--bg` at **40% opacity over the native window material**, so light seeds wash out hard: a literal pastel (`#fdf6e3`) renders as plain white. **Author light seeds at roughly 2.5× the intended saturation** — pick the color you want, then push its chroma until it looks garish as a swatch; composited it lands where you intended. Dark seeds render as-authored.

### Single-appearance themes

If the look only works in one appearance ("always-dark cyberpunk"), default the app to it in `main/index.ts` (`nativeTheme.themeSource = "dark"` before windows are created) and remove the appearance radio from the settings window — don't leave a control that breaks the look.

## B. Selectable themes

For user-switchable themes, use the typed theming API from `@glaze/core/components`:

```ts
import { type Theme, injectActiveTheme, clearActiveTheme } from "@glaze/core/components";
```

- Define each theme as a `Theme` object (the type is the checklist — appearance, seeds, support colors). Author light-theme seeds with the same saturation rule as above.
- Persist the chosen theme id with the app's settings storage; broadcast changes so all windows update (`ipcMain.broadcast` pattern — see common-tasks rules).
- Apply with `injectActiveTheme(theme)` on selection AND at each window's startup, as early as possible in the renderer entry (before first paint) to avoid a default-colors flash.
- A theme implies its appearance: call `nativeTheme.setThemeSource(theme.appearance)` when applying so native chrome matches. Structure the settings picker grouped by appearance (Auto, then Light themes, then Dark themes) replacing the plain radio.
- "Default" choice = `clearActiveTheme()` + `setThemeSource("system")`.

## Don'ts

- Don't theme with Tailwind palette classes (`bg-yellow-100` on containers) — it bypasses the system, breaks dark mode, and fights every component.
- Don't redefine semantic tokens (`--color-text-secondary`, `--color-surface-control`) directly — override seeds and let them derive.
- Don't read ramp tokens as raw `var(--color-accent-40)` in inline styles / canvas / JS — those `--color-*` ramp aliases are utility-only and resolve to nothing. Use a `bg-*`/`text-*` utility, or the seed defined in `:root`: `var(--accent-40)`, `var(--support-red-40)`, `var(--gray-4)`, `var(--fg-40)`, `var(--selection-10)`. Semantic role tokens (`--color-text-*`, `--color-surface-*`, `--color-border-*`) ARE var-safe.
- Don't fight elevated-surface neutrality: popovers/dialogs deliberately take only a hint of the seed tint so menus stay readable. That's by design, not a bug in your theme.

## Verify

- Run the app in BOTH appearances (unless single-appearance) — check text contrast, control hover/press states, selection color, and a menu/dialog.
- Light theme looking white/washed out? Saturation rule — push the seeds harder.
