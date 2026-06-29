---
name: glaze-browser-window-recipes
description: Recipes for creating or configuring Glaze BrowserWindows. Use before writing or changing new BrowserWindow(...), loadURL targets, dragging/chrome, external web page windows, modal/floating/frameless/document windows, or window options.
---

# Glaze BrowserWindow Recipes

Use this skill before writing or changing any `new BrowserWindow(...)`.

Create and manage windows from the backend with `BrowserWindow` from `@glaze/core/backend`. Use `windowKey` for stable windows. Keep renderer work focused on HTML/CSS and drag-region markup.

**App-owned renderer examples assume:**

```ts
import { BrowserWindow } from "@glaze/core/backend";
import { getPreloadPath, getWindowUrl } from "./windows/window-paths.js";
```

## Quick Picks

- **Native translucent panel/HUD/popover**: `frame: true`, `titleBarStyle: "hidden"`, native `vibrancy`, transparent renderer backgrounds, and `setWindowButtonVisibility(false)` when traffic lights should be hidden
- **Transparent custom-shaped overlay**: `frame: false`, `transparent: true`, `backgroundColor: "#00000000"`, no `vibrancy`; use only when the renderer deliberately draws or clips every visible pixel, such as circles, pass-through widgets, or canvas/SVG shapes
- **External or third-party web page**: directly loading `https://...` needs `titleBarStyle: "default"` for a native draggable title bar, or an app-owned wrapper with a top drag region
- **Native macOS vibrancy window**: `setVibrancy("sidebar" | "hud" | "popover" | ...)`, transparent renderer backgrounds, and `frame: true` so macOS supplies the window shape
- **Frameless custom chrome (rare)**: avoid this for normal windows and panels; use `frame: false` only when the renderer deliberately owns the whole visible shape, usually with `transparent: true`
- **Floating utility window**: `alwaysOnTop: true`, often `hiddenInMissionControl: true`, sometimes `visibleOnAllWorkspaces: true`
- **Click-through overlay**: transparent window plus `setIgnoreMouseEvents(true, { forward: true })`
- **Document-style window**: `setRepresentedFilename(...)`, `setDocumentEdited(...)`, optional `accessibleTitle`
- **Parent / modal window**: pass `parent`, optionally `modal: true`, then load and show the child after the parent is ready
- **Custom titlebar buttons**: constructor option `trafficLightPosition`, plus `setWindowButtonVisibility(...)` and `setWindowButtonPosition(...)` after creation
- **Accessory/menu-bar app**: set `appConfig.macOS.activationPolicy` to `"accessory"` when the app should stay out of Dock and Cmd+Tab by default
- **Menu-bar popover app**: use `Tray` click bounds or `tray.getBounds()` to position a compact custom window under the menu-bar icon; use a native tray menu for simple command lists

## Core Rules

1. App-owned renderer page: load via `getWindowUrl()`; attach `webPreferences.preload` when it needs `window.glazeAPI`.
2. External web page: load the `https://...` URL directly; omit the app preload unless a restricted bridge is explicitly required.
3. Use `show: false` + `ready-to-show` event to prevent a white flash while content loads.
4. `frame: false` automatically sets `toolbarStyle: "none"` — specifying both is redundant.
5. `toolbarStyle: "none"` removes the toolbar area but does not hide the traffic lights. Use `setWindowButtonVisibility(false)` to hide them.
6. Transparent windows still need renderer CSS to be transparent — add `class="no-background"` to the `<html>` element (disables the design system's window background gradient) plus the transparent background CSS below.
7. Every movable window needs a top drag affordance: `<Toolbar>` or top `.drag-region` for app-owned pages; `titleBarStyle: "default"` or an app-owned wrapper for external pages.
8. Exceptions: tray/menu-bar anchored panels, click-through/passive overlays, or windows explicitly meant to stay fixed.
9. Interactive elements inside draggable regions must use `.no-drag`, or live inside a component that already applies it.
10. Prefer Glaze primitives when they already encode window behavior. `<Toolbar>` already renders a drag region.
11. `toolbarStyle` accepts `"none"`, `"unified"` (default), or `"unifiedCompact"`.
12. Use `parent` for attached child windows. Add `modal: true` when the child should appear as a native sheet on macOS.
13. `setVibrancy()` is the macOS-native translucency API for translucent materials like `"sidebar"`, `"hud"`, and `"popover"`.
14. Never use WebKit/CSS blur (`backdrop-filter`, `-webkit-backdrop-filter`, Tailwind `backdrop-blur-*`) as the background surface for a window. Use native `vibrancy` for frosted/glass window materials.
15. Vibrancy is only a material, not a shape. Visible panel-style windows should keep `frame: true`; the native frame supplies rounded window corners. Hide traffic lights with `setWindowButtonVisibility(false)` instead of switching to `frame: false`.
16. Do not combine `frame: false` with `vibrancy` for HUDs, popovers, menu-bar panels, palettes, or other visible rectangular panels. It produces square translucent rectangles. If the renderer owns the shape, use `transparent: true` and no `vibrancy`.
17. Do not use `frame: false` just to hide traffic lights or remove the title bar. Use `frame: true`, `titleBarStyle: "hidden"`, `toolbarStyle: "none"`, and `setWindowButtonVisibility(false)` instead.
18. `screen.getPrimaryDisplay()` and the other backend `screen` getters are synchronous. Use the plain getters unless you explicitly need a legacy `*Async()` alias.
19. When positioning relative to a display `workArea`, include both the size and the origin: use `workArea.x + ...` and `workArea.y + ...`, not just `workArea.width` or `workArea.height`.
20. When adding a renderer subdirectory for a new window or panel, add it to `renderer/styles.css` with an `@source` directive so Tailwind scans its class names.

## Surface Rules

Native window appearance has two separate layers:

- **Material**: `vibrancy` paints the macOS translucent material.
- **Shape**: the native frame supplies the rounded window outline for normal panels.

For frosted/glass windows, use native vibrancy and keep the native frame. Make the renderer transparent so the material shows through; do not add root-level cards with `bg-black/60`, `backdrop-blur-*`, or raw `backdrop-filter` to fake glass.

Use `frame: false` only when the content itself is the window shape, such as a circular timer, a pass-through overlay, a custom canvas/SVG shape, or a fully renderer-drawn widget. In that case use `transparent: true`, avoid `vibrancy`, and deliberately provide the renderer-owned shape, clipping, and shadow. If a panel's corners are square, the window implementation is wrong unless the user explicitly asked for square corners.

## Accessory Apps

Use this only for menu-bar, background monitor, HUD, overlay, or global-shortcut apps whose normal state should not appear in Dock or Cmd+Tab:

```json
{
  "appConfig": {
    "macOS": {
      "activationPolicy": "accessory"
    }
  }
}
```

Do not use it for primary-window, document, editor, or settings-first apps. If an accessory app intentionally needs a temporary Dock tile for an About or Settings window, `await app.dock.show()` before showing or focusing that window, then call `app.dock.hide()` when it closes.

For menu-bar apps whose main UI is a panel or popover, show a native tray menu for simple commands or a compact custom window anchored under the tray icon. Do not build a persistent floating top-right HUD toggled by Show/Hide menu items unless the user explicitly asked for an overlay/HUD. If the panel has search, text input, or keyboard navigation, make it focusable and close it on blur or Escape; do not force `focusable: false` just because the app is accessory.

Do not use `app.on("activate", () => showHud())` or similar unconditional activation handlers when the app has a Hide HUD action. Track user intent so activation does not reopen a window the user explicitly hid.

## Recipe: Native macOS Vibrancy Window

Use this when you want a native translucent material like a sidebar, HUD, popover, menu-bar panel, or floating palette.

```ts
const win = new BrowserWindow({
  windowKey: "vibrant-window",
  width: 520,
  height: 360,
  frame: true,
  titleBarStyle: "hidden",
  toolbarStyle: "none",
  backgroundColor: "#00000000",
  vibrancy: "sidebar",
  visualEffectState: "active", // for non-focusable HUDs/panels; omit when focus state should drive the material
  show: false,
  webPreferences: { preload: getPreloadPath() },
});

win.setWindowButtonVisibility(false);
win.once("ready-to-show", () => win.showInactive());
await win.loadURL(await getWindowUrl("vibrant-window.html"));
```

Renderer CSS:

```html
<!-- index.html: opt out of the design system's window background gradient -->
<html class="no-background"></html>
```

```css
html,
body,
#root {
  background: transparent;
}
```

Notes:

- Use `setVibrancy()` or the constructor `vibrancy` option for macOS-native materials.
- Use `visualEffectState: "active"` for non-focusable HUDs or panels that should keep the lively active material while not becoming key.
- Keep `frame: true` for visible panels so macOS supplies native rounded corners. Use `titleBarStyle: "hidden"` and `setWindowButtonVisibility(false)` for a chromeless panel without traffic lights.
- Do not use CSS `backdrop-filter` / `backdrop-blur-*` as the window background. The renderer should stay transparent and let the native material show through.
- Deprecated AppKit materials like `"light"` or `"dark"` are intentionally unsupported.

## Recipe: Transparent Overlay

Use this only for custom-shaped HUDs, pass-through widgets, or overlays where the renderer intentionally draws and clips the whole visible shape. Do not use this for normal frosted panels, menu-bar popovers, palettes, or HUD cards; use the native vibrancy recipe instead.

```ts
const win = new BrowserWindow({
  windowKey: "overlay",
  width: 420,
  height: 240,
  frame: false,
  transparent: true,
  backgroundColor: "#00000000",
  hasShadow: false,
  alwaysOnTop: true,
  show: false,
  webPreferences: { preload: getPreloadPath() },
});

win.once("ready-to-show", () => win.show());
await win.loadURL(await getWindowUrl("overlay-window.html"));
```

Renderer CSS:

```html
<!-- index.html: opt out of the design system's window background gradient -->
<html class="no-background"></html>
```

```css
html,
body,
#root {
  background: transparent;
}
```

Notes:

- If the window still shows a solid background, check `transparent: true`, `backgroundColor: "#00000000"`, and transparent renderer backgrounds first.
- If you want native macOS translucency rather than a fully transparent custom-shaped overlay, use the vibrancy recipe above instead of this one.
- Do not add root-level `backdrop-blur-*` or `backdrop-filter` to simulate a frosted window background.
- Use `hasShadow: false` for a clean overlay look. Keep it `true` if you want separation from the desktop.

## Recipe: Rare Frameless Custom-Shaped Window

Avoid this for normal windows, HUDs, popovers, panels, and palettes. Use it only when the user explicitly needs a transparent/custom-shaped overlay and the renderer will draw or clip every visible pixel. For custom top layouts with native rounded corners, keep `frame: true`, use `titleBarStyle: "hidden"`, and hide traffic lights with `setWindowButtonVisibility(false)` instead.

```ts
const win = new BrowserWindow({
  windowKey: "custom-shape",
  width: 220,
  height: 220,
  frame: false,
  transparent: true,
  backgroundColor: "#00000000",
  hasShadow: false,
  show: false,
  webPreferences: { preload: getPreloadPath() },
});

win.once("ready-to-show", () => win.show());
await win.loadURL(await getWindowUrl("custom-window.html"));
```

Renderer:

```tsx
import { Button } from "@glaze/core/components";

export function CustomShapeSurface() {
  return (
    <div className="drag-region size-full overflow-hidden rounded-full bg-control">
      <Button className="no-drag">Action</Button>
    </div>
  );
}
```

Frameless windows have raw rectangular native bounds. If the surface is visible, the renderer must provide the shape and clipping deliberately. Do not pair `frame: false` with `vibrancy` for a panel; the vibrancy material will paint into square corners.

If shared styles are unavailable, write the CSS directly:

```css
.drag-region {
  -webkit-app-region: drag;
  app-region: drag;
}

.no-drag {
  -webkit-app-region: no-drag;
  app-region: no-drag;
}
```

## Recipe: Keep Native Buttons But Reposition Or Hide Them

Use this when you keep a native frame but want a custom top layout.

```ts
const win = new BrowserWindow({
  windowKey: "titled",
  width: 960,
  height: 720,
  frame: true,
  toolbarStyle: "unified",
  trafficLightPosition: { x: 18, y: 18 },
  show: false,
  webPreferences: { preload: getPreloadPath() },
});

win.once("ready-to-show", () => win.show());
await win.loadURL(await getWindowUrl("main-window.html"));
```

Or update after creation:

```ts
win.setWindowButtonPosition({ x: 18, y: 18 });
win.setWindowButtonVisibility(false);
```

Notes:

- Hiding buttons is separate from toolbar style.
- In constructor options, use `trafficLightPosition`; the older `windowButtonPosition` option is deprecated. After creation, use `setWindowButtonPosition()`.
- If you hide native buttons, provide your own close/minimize/fullscreen affordances if the design still needs them.

## Recipe: Floating Utility Window

Use this for inspectors, compact tools, and mini-panels.

```ts
const win = new BrowserWindow({
  windowKey: "utility",
  width: 360,
  height: 420,
  frame: true,
  alwaysOnTop: true,
  hiddenInMissionControl: true,
  visibleOnAllWorkspaces: true,
  hasShadow: true,
  show: false,
  webPreferences: { preload: getPreloadPath() },
});

win.once("ready-to-show", () => win.show());
await win.loadURL(await getWindowUrl("utility-window.html"));
```

Common follow-ups:

- `win.setAlwaysOnTop(true, "floating")` for a stronger floating level
- `win.setFocusable(false)` if it should behave like a passive overlay
- `win.setSkipTaskbar(true)` if it should stay out of the Dock/task switcher

## Recipe: Click-Through Overlay

Use this for passive overlays that should not intercept clicks.

```ts
const win = new BrowserWindow({
  windowKey: "pass-through",
  width: 500,
  height: 300,
  frame: false,
  transparent: true,
  backgroundColor: "#00000000",
  alwaysOnTop: true,
  show: false,
  webPreferences: { preload: getPreloadPath() },
});

win.setIgnoreMouseEvents(true, { forward: true });
win.once("ready-to-show", () => win.show());
await win.loadURL(await getWindowUrl("passthrough-window.html"));
```

Notes:

- `forward` is accepted for API compatibility. On macOS it does not map to a separate native mode, so do not rely on it for distinct behavior.
- Turn ignored mouse events off before expecting drag, hover, or button clicks to work again.

## Recipe: Document Window

Use this when the window represents a file and should show document state in native chrome.

```ts
const win = new BrowserWindow({
  windowKey: "editor",
  width: 1000,
  height: 720,
  title: "Notes",
  show: false,
  webPreferences: { preload: getPreloadPath() },
});

win.setRepresentedFilename("/Users/me/Documents/notes.md");
win.setDocumentEdited(true);
win.accessibleTitle = "Notes document window";
win.once("ready-to-show", () => win.show());
await win.loadURL(await getWindowUrl("editor-window.html"));
```

Use `accessibleTitle` when the visible title is too short or ambiguous for assistive technologies.

## Recipe: Parent Window With Modal Sheet

Use this when a secondary window should stay attached to a primary window or appear as a sheet.

```ts
const parent = new BrowserWindow({
  windowKey: "editor",
  width: 1000,
  height: 720,
  title: "Editor",
  show: false,
  webPreferences: { preload: getPreloadPath() },
});

const child = new BrowserWindow({
  windowKey: "editor-inspector",
  parent,
  modal: true,
  width: 420,
  height: 320,
  title: "Inspector",
  show: false,
  webPreferences: { preload: getPreloadPath() },
});

parent.once("ready-to-show", () => parent.show());
await parent.loadURL(await getWindowUrl("editor-window.html"));

child.once("ready-to-show", () => child.show());
await child.loadURL(await getWindowUrl("inspector-window.html"));
```

Notes:

- Omit `modal: true` if you want a regular attached child window instead of a sheet.
- Use `child.setParentWindow(null)` to detach a child and let it float independently.
- `child.getParentWindow()`, `parent.getChildWindows()`, and `child.isModal()` reflect the current relationship in JS.

## Dragging Guidance

- Prefer `.drag-region` and `.no-drag` classes from shared styles.
- `<Toolbar>` from `@glaze/core/components` already renders a drag region.
- Buttons, inputs, selects, links, and textareas are already treated as non-draggable by the shared styles.
- Without a `Toolbar`, add a deliberate top `.drag-region`; do not rely on empty padding.
- Keep custom drag regions at the top. Avoid full-root drag regions unless nothing interactive can be trapped.
- External pages need `titleBarStyle: "default"` or an app-owned wrapper.

## Troubleshooting

**The custom-shaped transparent overlay is still opaque**

- Check `transparent: true`
- Check `backgroundColor: "#00000000"`
- Check renderer root backgrounds (`html`, `body`, `#root`)

**The vibrancy window is covered by a solid fill**

- Keep the native vibrancy setup: `frame: true`, `vibrancy`, and transparent renderer roots.
- Do not add `transparent: true` unless this is a custom-shaped/pass-through overlay.
- Check `backgroundColor: "#00000000"` and the `<html class="no-background">` opt-out.
- Remove root/full-window renderer fills that cover the native material.

**The window is not using macOS vibrancy**

- Use `setVibrancy("sidebar" | "hud" | "popover" | ...)` or the constructor `vibrancy` option
- Keep `frame: true` for panel-style vibrancy windows so the native frame supplies rounded corners
- Check renderer root backgrounds (`html`, `body`, `#root`)

**Traffic lights are still visible**

- `toolbarStyle: "none"` is not enough
- Use `win.setWindowButtonVisibility(false)`

**The window does not drag**

- Add a top `.drag-region`, or render a `<Toolbar>`
- Add `.no-drag` to nested controls
- If using `<Toolbar>`, keep controls inside components that already opt out of drag behavior
- External page: use `titleBarStyle: "default"` or an app-owned wrapper

**Controls inside the header are not clickable**

- They are probably inheriting drag behavior from a parent
- Add `.no-drag` to the interactive container or control

**The window looks wrong in transparent mode**

- Remove unintended translucency settings
- Remove unintended renderer background colors
- Decide explicitly whether the overlay should keep a shadow

**`window.glazeAPI` is undefined in the new window**

- This is expected for external or third-party pages when no preload is attached
- Check that `webPreferences: { preload: getPreloadPath() }` is set in the constructor options
- The preload script must be a built JS file — run a build if it hasn't been generated yet

## Good Defaults

- Use `windowKey`, not deprecated `id`
- Use `show: false` with `win.once("ready-to-show", () => win.show())` to prevent flicker
- Use `showInactive()` when the window should appear without stealing focus
- App-owned page: attach preload when it needs `window.glazeAPI`
- External page: omit app preload and choose a drag strategy
- Load app-owned HTML via `await win.loadURL(await getWindowUrl("your-window.html"))` for dev/prod compatibility
- Keep `frame: true` unless you need a transparent custom-shaped overlay whose shape is fully renderer-owned
- `frame: false` automatically implies `toolbarStyle: "none"` — no need to set both
- Use `toolbarStyle: "unified"` (default) for standard titled windows, `"unifiedCompact"` for shorter toolbars
- Use native `vibrancy` for frosted/glass materials; use transparent window configuration only for custom-shaped or pass-through overlays
- In constructor options, use `trafficLightPosition`; the older `windowButtonPosition` option is deprecated
- `setTrafficLightPosition()` is deprecated — use `setWindowButtonPosition()` instead

## Reference Paths

- `packages/glaze-core/src/backend/browser-window.ts`
- `packages/glaze-core/global.d.ts`
- `packages/glaze-core/src/components/styles.css`
- `packages/glaze-core/src/components/toolbar.tsx`
- `packages/main-app/renderer/main/pages/design-system/examples/browser-window-examples.tsx`
