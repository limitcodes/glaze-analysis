---
name: glaze-icon-usage
description: Guidelines for using icons in Glaze apps. Use semantic text colors — the system renders them solid on icons automatically.
---

# Glaze Icon Usage

This skill covers how to correctly use icons in Glaze applications.

**For extracting macOS app icons** (e.g., showing icons of running apps), see the `glaze-backend-performance` skill — it covers `NSWorkspace.iconForFile()` via JXA, maxBuffer safety, and caching patterns.

## Icon Library

Use **lucide-react** for all icons. Import icons directly with the `Icon` suffix:

```typescript
import { PlusIcon, SettingsIcon, ChevronLeftIcon } from "lucide-react";
```

## Icon Sizing

Size icons using Tailwind's width/height utilities via `className`:

| Context                      | Class      | Size |
| ---------------------------- | ---------- | ---- |
| Small UI controls            | `size-3.5` | 14px |
| Standard (buttons, lists)    | `size-4`   | 16px |
| Medium (toolbar icons)       | `size-5`   | 20px |
| Large (display/empty states) | `size-8`   | 32px |

## Icon Colors: Use the Semantic Text Colors

Color icons with the same semantic colors as text — `text-secondary`, `text-tertiary`, `text-quaternary` for grays, `text-support-{red,orange,yellow,green,blue,purple,magenta}` for status colors, `text-accent` for the accent.

```typescript
<PlusIcon className="size-4 text-secondary" />
<CheckCircle2Icon className="size-4 text-support-green" />
<AlertTriangleIcon className="size-4 text-support-red" />
<Loader2Icon className="size-4 animate-spin text-tertiary" />
```

Lucide icons are stroke-based with overlapping strokes, and translucent colors would double up where paths overlap — but the design system handles this for you: when a semantic gray lands on an `<svg>` (directly, or inherited from an ancestor through plain wrappers), it automatically renders as its solid equivalent. You do not need to think about alpha vs solid — just use the semantic colors everywhere, for text and icons alike.

Inheriting from a colored parent also works:

```typescript
// The icon picks up solid tertiary from the wrapper automatically
<div className="flex items-center gap-1.5 text-tertiary">
  <ClockIcon className="size-3.5" />
  <span>Updated 5 minutes ago</span>
</div>
```

Explicit colors on the icon always win — support colors, accent, and one-off colors are never overridden by the automatic handling.

## Close Buttons: Never Use Unicode "X"

**Never use the unicode characters `×`, `✕`, or `x` for close buttons.** Their metrics vary across fonts, breaking alignment and sizing — you will end up fighting `font-bold`, `-mt-px`, and other nudges with no reliable result.

Use `XIcon` from `lucide-react` instead — it's an inline SVG with a fixed viewBox, so it centers perfectly inside any flex container.

```typescript
// WRONG — unicode character, font-dependent metrics
<button className="...">×</button>

// CORRECT — inline SVG, predictable centering
import { XIcon } from "lucide-react";
<button className="flex items-center justify-center ...">
  <XIcon className="size-3 text-secondary" />
</button>
```

## Usage Patterns

### In Buttons

```typescript
<Button variant="transparent" iconOnly>
  <ChevronLeftIcon className="size-5" />
</Button>

<Button className="gap-2">
  <PlusIcon className="size-4" />
  Add Item
</Button>
```

### Status Indicators

```typescript
<CheckCircle2Icon className="size-4 text-support-green" />
<AlertTriangleIcon className="size-4 text-support-red" />
<ArrowDownCircleIcon className="size-4 text-support-blue" />
```

### Loading States

```typescript
<Loader2Icon className="size-5 animate-spin text-tertiary" />
```

### Hover States

```typescript
<ImagePlusIcon className="size-4 text-tertiary hover:text-primary transition-colors" />
```

## Checklist

- [ ] Icons imported from `lucide-react` with `Icon` suffix
- [ ] Sized with Tailwind `size-*` utilities
- [ ] Colored with semantic colors (`text-secondary`/`text-tertiary`/`text-support-*`) — never raw gray scales
- [ ] No direct `color`, `fill`, or `stroke` props — use `className` only
