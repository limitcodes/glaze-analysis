---
name: glaze-app-lifecycle
description: Patterns for quitting apps, menubar apps, and graceful shutdown
---

# App Lifecycle Patterns

Guidelines for managing macOS app lifecycle, quit behavior, and menubar apps.

## Quitting the App

**CRITICAL**: Use the correct method to terminate your app:

| Method        | Effect                                                       | Use When                 |
| ------------- | ------------------------------------------------------------ | ------------------------ |
| `app.quit()`  | Gracefully terminates the app, firing quit lifecycle events  | User wants to fully quit |
| `app.exit(0)` | Immediately terminates the app without quit lifecycle events | Emergency or force quit  |

### Common Mistake

```typescript
// Prefer graceful app termination.
app.quit();

// Use only when lifecycle handlers must be skipped.
app.exit(0);
```

### Implementation Pattern

```typescript
import { app } from "@glaze/core/backend";

// In your menu or quit handler:
function handleQuit() {
  app.quit();
}
```

## Menubar Apps (LSUIElement)

For apps that run in the menu bar with a hidden dock icon:

### Key Points

- Dock icon is hidden via `LSUIElement=true` in Info.plist
- Prefer `app.quit()` for quit actions so lifecycle handlers run before the app terminates.
- Use `app.exit(0)` only when the app must terminate immediately.

### Dock Icon Shows on Re-activate

**Problem**: Clicking "Open app" while running shows dock icon unexpectedly.

**Cause**: macOS shows dock on activate, but `app.dock.hide()` is only called at startup.

**Solution**: Call `app.dock.hide()` in the `activate` event handler too:

```typescript
import { app } from "@glaze/core/backend";

app.on("activate", () => {
  app.dock.hide(); // Keep dock hidden on re-activate
});
```

### Tray Menu Quit Handler

Prefer SF Symbol names for tray/menu icons; use PNG paths only for custom brand or user-provided artwork.

```typescript
import { app, Tray, Menu } from "@glaze/core/backend";

const tray = new Tray("hammer.fill");
const contextMenu = Menu.buildFromTemplate([
  { label: "Settings", click: openSettings },
  { type: "separator" },
  {
    label: "Quit",
    click: () => app.quit(),
  },
]);
tray.setContextMenu(contextMenu);
```

## Graceful Shutdown

The app monitors for shutdown via multiple mechanisms:

| Signal               | Source                        |
| -------------------- | ----------------------------- |
| `SIGINT`             | Ctrl+C in terminal            |
| `SIGTERM`            | System shutdown               |
| `SIGQUIT`            | Quit request                  |
| `SIGHUP`             | Terminal hangup               |
| stdin closure        | Primary shutdown mechanism    |
| Parent process death | Reparented to launchd (PID 1) |

**Timeout**: 5 seconds before force termination.

### Handling Shutdown Events

```typescript
import { app } from "@glaze/core/backend";

app.on("before-quit", () => {
  // Save state, close connections
  saveApplicationState();
});

app.on("will-quit", () => {
  // Final cleanup
  cleanupResources();
});
```

## Checklist

Before implementing quit/exit functionality:

- [ ] Using `app.quit()` for user-initiated quit
- [ ] Using `app.exit(0)` only when lifecycle events should be skipped
- [ ] Cleanup code in `before-quit` or `will-quit` handlers
- [ ] No blocking operations in quit handlers (5s timeout)
