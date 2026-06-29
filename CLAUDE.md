# CLAUDE.md

Context for building Glaze apps. Only non-obvious, can't-infer-from-code guidance lives here — task recipes are in `GLAZE-APP-GUIDE.md` (read on demand) and the skills.

## Architecture

Frontend (React/Vite, `.glaze-sources/renderer/`) renders in a macOS WebView and talks to the Backend (Node.js, `.glaze-sources/main/`, which calls Swift host APIs) over a native bridge + IPC (JSON-RPC 2.0). The Glaze SDK mirrors most of Electron's API surface — use Electron knowledge as a starting point, but verify each API/option is actually implemented here before relying on it.

Edit source in `.glaze-sources/` (sibling to the runtime-output `.glaze/`):

```
.glaze-sources/
├── main/          ← Backend (handlers/, services/)
├── renderer/      ← Frontend (main/home-view.tsx, main/router.tsx, components/)
├── package.json   ← Add deps here
└── .glaze_memory/ ← PROJECT-CONTEXT.md
```

## Constraints

<critical>
- Edit only in `.glaze-sources/`. **NEVER edit or create files in `.glaze/`** — it is build output; change `glaze.config.ts` instead.
- `@glaze/core` is the framework SDK — **never modify it and never `npm install` it** (it's resolved via tsconfig paths + ESM hooks). The `glaze` CLI is on PATH automatically — never install it from node_modules.
- **Forbidden imports (cause runtime breakage):** `backendNativeBridge`, `@glaze/core/backend/internal`, `GlazeIPCServer`, `GlazeLifecycle`, `registerNativeApiHandlers`, `wireProtocolHandlers`. Use public `@glaze/core/backend` exports instead (`dialog`, `shell`, `clipboard`, `Notification`, `Menu`, `Tray`, …). Do not suppress `no-restricted-imports`; if an API isn't exported (e.g. `powerMonitor`), tell the user it's unavailable.
- **The Glaze-managed `.npmrc` is OFF-LIMITS** (`~/Library/Application Support/app.glaze.macos.main*/.npmrc`, passed to every install via `NPM_CONFIG_USERCONFIG`). Never read, edit, move, copy, or recreate it, never touch `NPM_CONFIG_USERCONFIG`, and never set its keys — `min-release-age`, `before`, `allow-git`, `registry`, `ignore-scripts` — in a project `.npmrc`. If `npm install` fails because a version is too new, pin `package.json` to an older version rather than weakening the policy. Before installing, strip any of those forbidden keys from an existing `.glaze-sources/.npmrc` (other keys like `legacy-peer-deps` are fine to keep).
- **Protected — do not modify:** `@glaze/core/**`, `../../../sdk/current/@glaze/core/**`, `build/**`. Customize shared components via wrappers in `renderer/components/`.
- **IPC security:** only `renderer/preload.ts` imports `ipcRenderer`; renderer code uses `window.glazeAPI` (exposed via contextBridge). Sensitive APIs (clipboard, `shell.openExternal`) are off by default — enable them in `preload.ts` only when needed. The SDK type surface is broader than the default preload surface: before calling any `window.glazeAPI.<namespace>` from renderer code, check the symbol's `defaultPreload` metadata and confirm `renderer/preload.ts` exposes the exact namespace/method. If it says `partial` or `requires-wiring`, add a minimal preload wrapper or route through a backend IPC handler first. For renderer-triggered window control, prefer backend `BrowserWindow` APIs behind a narrow app IPC handler.
- **Window surfaces:** never use CSS/WebKit blur (`backdrop-filter`, `-webkit-backdrop-filter`, Tailwind `backdrop-blur-*`) as a window background. For frosted/glass HUDs, popovers, panels, or windows, use native `BrowserWindow` vibrancy with `frame: true`; hide traffic lights with `setWindowButtonVisibility(false)`. Use `frame: false` only for true transparent/custom-shaped overlays where the renderer deliberately draws or clips every visible pixel.
</critical>

## Conventions

- Use `Grep`/`Glob`/`Read` for search and reads; reserve Bash for what those can't do (`ls`/`find`/`cat`/`sed` via Bash waste tokens and trigger macOS permission popups on Application Support paths). Don't run broad searches like `find /` or `find ~` — stay within `.glaze-sources/`, the log directory, or `<runtime_context>` paths.
- **Surgical edits only** — every changed line traces to the user's request; don't refactor working code or comment unchanged code.
- **Minimize round trips** — read all files for a change in one turn and batch independent greps/edits; only sequence a call when its input depends on a previous result.
- Never ship mock or placeholder data — use real APIs or user input.
- For exact SDK exports / `window.glazeAPI` / type signatures, read the `SDK Symbol Map`, `SDK Symbol Lines`, and `SDK API Reference` paths from `<runtime_context>` (don't enumerate or grep the SDK directory).
- Styling is Tailwind v4 utilities + the design system (semantic colors, `Text` variants, `rounded-*` roles) — see the `glaze-component-patterns` skill. Don't hand-roll CSS files or use the raw Tailwind color palette.

## Commands

- Install deps with `npm install --include=dev` from `.glaze-sources/` (NODE_ENV=production prunes devDeps otherwise).
- Use the `BuildApp` tool to build or get a current bundle for runtime validation — **never run `glaze build` through Bash**.

## Patterns

- **Invoke the relevant skill BEFORE writing code** when touching UI components, IPC handlers, data storage, external APIs, native permissions, window management, CLI tools, file handling, or performance-sensitive code. For any `BrowserWindow` work, invoke `glaze-browser-window-recipes`. Skip skills for docs, color/spacing tweaks, comments, or single-line fixes.
- For task recipes — adding backend handlers, windows, tray, notifications, global shortcuts, settings; bundling native modules; debugging runtime errors — see `GLAZE-APP-GUIDE.md`.
