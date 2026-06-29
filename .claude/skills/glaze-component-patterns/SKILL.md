---
name: glaze-component-patterns
description: Patterns and best practices for building native macOS-style layouts using Glaze's design system components.
---

# Glaze Component Patterns

Glaze apps look like native macOS — Mail, Notes, Finder, System Settings: **flat surfaces, separation by structure not decoration, design-system components over custom markup, semantic tokens over raw values.** Build to that bar.

## The Gate (every UI element)

1. **Find it in the Component Reference below.** If it's there, use it — never hand-roll a pattern the system already ships.
2. **Read its doc before writing it.** Use `glaze-component-docs-reader` for props, variants, composition, and pitfalls. Never guess props or structure — components handle window dragging, native styling, keyboard nav, and accessibility, and guessing breaks those.
3. **Not in the table?** Grep `SDK Symbol Lines` (from `<runtime_context>`) for `"name":"<Component>"` to confirm; its `doc` field points at the usage guide. Zero hits → it genuinely isn't in the system → only _then_ write custom, and only with semantic tokens (see Custom Styling). Writing custom for something that has a component is a defect.

## Import Structure

```typescript
import { Button, Dialog, Sidebar, Panel } from "@glaze/core/components"; // UI
import { useTheme, useConnection, useEnvironment } from "@glaze/core/hooks"; // hooks
import { cn, initLogging } from "@glaze/core/utils"; // utils (no React)
```

## Component Reference

The allowlist. Import every component from `@glaze/core/components`; read the linked doc before use.

| Pattern | Component(s) | Doc |
| --- | --- | --- |
| **Layout** |  |  |
| App shell (sidebar / list / primary / inspector) | `SplitView` | `split-view.md` |
| Custom resizable panels (escape hatch) | `PanelGroup`, `Panel` | `panel.md` |
| Application sidebar | `Sidebar`, `SidebarList`, `SidebarListItem`, `SidebarListGroup`, `SidebarFooter`, `SidebarListItemContent/Title/Subtitle/Accessory` | `sidebar.md` |
| Top/bottom toolbar | `Toolbar`, `ToolbarRow`, `ToolbarActions`, `ToolbarContent`, `ToolbarTitle`, `ToolbarDescription` | `toolbar.md` |
| Toolbar search | `ToolbarSearchButton` | `toolbar.md` |
| Detail-page back button (icon-only) | `ToolbarBackButton` — or `ScrollArea`'s `leading` prop | `toolbar.md` |
| Scrollable container | `ScrollArea` | `scroll-area.md` |
| Grid with keyboard nav | `Grid.Root`, `Grid.Item` | `grid.md` |
| Vertical list with selection | `List.Root`, `List.Item`, `List.ItemTitle` | `list.md` |
| Inspector / detail panel | `Inspector`, `InspectorRow`, `InspectorSection`, `InspectorToggle` | `inspector.md` |
| Disclosure / expandable section | `CollapsibleRoot`, `CollapsibleTrigger`, `CollapsibleContent`, `CollapsibleChevron` | `collapsible.md` |
| Visual divider | `Separator` | `separator.md` |
| **Forms** |  |  |
| Text input | `Input` | `input.md` |
| Multi-line text | `Textarea` | `textarea.md` |
| Numeric input | `NumberInput` | `number-input.md` |
| Date / time picker | `NativeDatePickerRoot`, `NativeDatePickerTrigger`, `NativeDatePickerValue` | `date-picker.md` |
| Color picker | `ColorWell` | `color-well.md` |
| Dropdown select | `Select`, `SelectTrigger`, `SelectContent`, `SelectItem` | `select.md` |
| Dropdown select (custom children) | `CustomSelect`, …`Trigger/Content/Item` | `custom-select.md` |
| Boolean toggle (checkbox) | `Checkbox` | `checkbox.md` |
| Boolean toggle (switch) | `Switch` | `switch.md` |
| Radio button group | `RadioGroup`, `RadioGroupItem` | `radio-group.md` |
| Range slider | `Slider` | `slider.md` |
| Form field wrapper | `FieldSet`, `Field` | `field.md` |
| Form label | `Label` | `label.md` |
| **Actions** |  |  |
| Clickable button | `Button` | `button.md` |
| Grouped buttons | `ButtonGroup`, `ButtonGroupSeparator` | `button-group.md` |
| Back/forward navigation | `NavigationButtonGroup` | `button-group.md` |
| Toggle button (pressed state) | `ToggleButton` | `toggle-button.md` |
| Dropdown menu | `DropdownMenu`, `DropdownMenuTrigger`, `DropdownMenuContent`, `DropdownMenuItem` | `dropdown-menu.md` |
| Dropdown menu (custom children) | `CustomDropdownMenu`, …`Trigger/Content/Item` | `custom-dropdown-menu.md` |
| Command palette | `Command`, `CommandDialog`, `CommandInput`, `CommandList`, `CommandItem` | `command.md` |
| Right-click menu | `ContextMenu`, `ContextMenuTrigger`, `ContextMenuContent`, `ContextMenuItem` | `context-menu.md` |
| Right-click menu (custom children) | `CustomContextMenu`, …`Trigger/Content/Item` | `custom-context-menu.md` |
| **Dialogs & Overlays** |  |  |
| Modal dialog | `Dialog` (+ primitives `DialogContent/Header/Title/Description/Body/Footer/Trigger/Close`) | `dialog.md` |
| Alert (must-decide) dialog | `AlertDialog` | `alert-dialog.md` |
| Hover tooltip | `Tooltip`, `TooltipTrigger`, `TooltipContent`, `TooltipProvider` | `tooltip.md` |
| **Feedback** |  |  |
| Toast notifications | `Toaster` + `toast()` | `sonner.md` |
| Live status indicator | `Status` | `status.md` |
| Inline notice or banner | `Callout` | `callout.md` |
| Empty content placeholder | `EmptyState`, `EmptyStateTitle/Description/Actions/Media` | `empty-state.md` |
| Error fallback view | `ErrorBoundaryView` | `error-boundary-view.md` |
| Edge blur effect | `ProgressiveBlur` | `progressive-blur.md` |
| **Data Display** |  |  |
| Any text (labels, titles, descriptions, code) | `Text` | `text.md` |
| Avatar (incl. stacks) | `Avatar`, `AvatarImage`, `AvatarFallback`, `AvatarBadge`, `AvatarStack` | `avatar.md` |
| Static label / tag / count badge (use `Status` for live state) | `Badge` | `badge.md` |
| Data table | `Table`, `TableHeader`, `TableBody`, `TableRow`, `TableHead`, `TableCell` | `table.md` |
| Tabbed content | `TabsRoot`, `Tabs`, `TabsTrigger`, `TabsSeparator`, `TabsContent` | `tabs.md` |
| Segmented control (mode switch) | `SegmentedControl`, `SegmentedControlItem`, `SegmentedControlSeparator` | `segmented-control.md` |
| Keyboard shortcut hint | `Key`, `KeyGroup` | `key.md` |

## Never Hand-Roll Raw HTML

A component exists for each of these — reaching for the raw element is a defect:

`<button>`→`Button` · `<input>`→`Input` · `<input type=checkbox>`→`Checkbox` · `<input type=radio>`→`RadioGroup` · `<input type=range>`→`Slider` · `<input type=number>`→`NumberInput` · `<select>`→`Select` · `<textarea>`→`Textarea` · `<table>`→`Table` · `<dialog>`→`Dialog` · `<ul>/<li>` (interactive)→`List` · `<nav>` (sidebar)→`Sidebar` · `<label>`→`Label` · `<fieldset>`→`Field`

## Selection Decisions

The branch points agents get wrong:

- **`SplitView` vs `PanelGroup`** — `SplitView` for the Mac app-shell shape only: columns playing sidebar / list / primary / inspector roles (any subset). Any _other_ multi-column layout — kanban, peer columns, side-by-side editors, vertical splits, fixed-size primary with a flexing column — uses raw `PanelGroup` + `Panel`. Column count doesn't decide it; whether columns map to those roles does. Nested `SplitView`s each need a unique `storageKey`. **Don't migrate existing raw `PanelGroup` shells to `SplitView`** unless asked.
- **`Dialog` vs `AlertDialog`** — ask _"if the user accidentally hits Esc, is that a safe no-op?"_ Yes → `Dialog` (forms, edit sheets, info, What's New). No → `AlertDialog` (delete, unpublish, sign-out, leave-with-unsaved). Destructiveness isn't the test — "leave without saving?" is an `AlertDialog` with an `accent` confirm. For `AlertDialog`, set `confirmVariant="destructive"` only for irreversible destructive actions; name the action in `confirmLabel` ("Delete", "Leave"), never "OK". Write specific descriptions ("8 people have this installed" beats "Are you sure?"). Mechanics in `dialog.md` / `alert-dialog.md`.
- **Sugar vs primitives** — `Dialog`/`AlertDialog`/`Field` ship a sugar API (`trigger`/`title`/`description`/`onConfirm`; `label`/`description`) that builds the standard structure. Use it by default; drop to primitives only for custom footers, multi-step wizards, or two equally-primary buttons. The component doc has the exact boundary.
- **Sidebar convenience props** — use `searchable` and `actions` on `Sidebar` (buttons auto-styled `variant="transparent" size="small"`); any component can go in `actions`. Drop to the `toolbar` prop only for a custom toolbar _layout_ (multi-row, centered) that `actions` + `searchable` can't express.
- **`SidebarListItem` / `SidebarList`** — prefer the props API (`icon`/`title`/`subtitle`/`accessory`); children mode only for structural overrides. Use managed selection (`items`/`selectedItem`/`onSelectedItemChange`/`getItemKey` + `item` per row); manual `selected`/`onClick` only for route-based nav. `SidebarListGroup` uses the `title` prop for section headers.

## Layout & Toolbar Invariants

- **Every movable app-owned window needs a `Toolbar` or top `.drag-region`** — `Sidebar` builds its own. External page windows use `glaze-browser-window-recipes`.
- **Never set `Toolbar inset` manually inside a `SplitView`** — it's resolved via `SplitViewColumnContext`. Manual `inset` is an escape hatch for the rare case outside SplitView.
- **Toolbar button sizing is mostly automatic** — `ScrollArea`'s `actions` prop styles its `Button` children `glass`/`large`; `Sidebar`'s styles them `transparent`/`small`; `ButtonGroup` and `NavigationButtonGroup` size their own children. What you still set by hand: the **icon** size in content toolbars (`size-4.5` — never automatic); `size="large"` on `ToolbarSearchButton` and `Tabs` in content areas (they default to `medium`); and `size="small" variant="transparent"` on a `NavigationButtonGroup` placed inside a sidebar (it defaults to `large`/`glass`).
- **`ToolbarTitle` only when context is needed** (active tab/file/section). Omit for simple single-view apps; avoid app-name titles unless asked.
- **One `variant="accent"` button per screen/dialog** — it's the primary action; all others use `filled` or `transparent`. Never two accent buttons visible at once.

## Forms (Field)

- **Use the `Field` sugar**, never full-width buttons: `<FieldSet title="…"><Field label="…" description="…">{control}</Field></FieldSet>` lays the row out horizontally (label left, control right) — the native settings convention. An action-only row is `<Field><Button/></Field>` with no label (intrinsic width, right-aligned).
- **Never wrap a `<Button>` in `<Field orientation="vertical">`** — vertical stretches children, making the button full-width. Use `orientation="vertical"` only for large controls that sit below the label (image pickers, in-dialog fields).
- **Multi-line / long-form text** (instructions, bios, prompts) → open a `Dialog` with a sized `Textarea`; never inline a `<Textarea>` in a settings row (breaks the grid, blows up at length). Short single-line text → inline `<Input>`, commit on blur, no Save button.
- **Keep label + description static across control states** — don't show/hide or swap description text when a toggle flips; it causes layout shift. Put changing _values_ in the control slot, not the description.

## Custom Styling (when nothing in the system fits)

These fight the model's web defaults — apply them to all custom markup.

**Avoid web-style cards.** Native macOS rarely wraps content in bordered/shadowed cards. Separate by structure instead: `SidebarList`/`List` for item lists, `SidebarListGroup` or heading + `Separator` for grouped settings, `PanelGroup` for regions, heading (`<Text variant="strong">`) + space for scroll-view sections, `Tabs` for tabbed areas. If you genuinely need a bounded container: a single `Separator`/`border-b border-separator`, a recessed well (`bg-well rounded-lg p-3`) for nested content, or a bordered group (`border border-field rounded-lg`) only when independently interactive. If you're writing `shadow-* + border + rounded-xl + p-6` on a `<div>`, stop and check for a layout component.

**Typography** — render text with the `<Text>` component, picking the `variant` that matches the role: `<Text>` alone is body copy (default `variant="regular"`); use `variant="strong"` for emphasis, `variant="small"` for captions, `variant="heading1"` etc. for titles. Variants bundle size/weight/line-height; pair with `color` (`<Text color="secondary">`) and `as="p"`/`as="h2"` for semantics. On containers that pass typography to children, use the matching variant utility directly (`text-regular`, `text-strong`, `text-small`, `text-small-strong`, `text-large-strong`, `text-heading1`, …). Never raw `text-sm`/`text-base`, and never stack `font-medium`/`font-semibold` on a size — the `-strong` variants carry the weight. Runtime-updating numbers (counters, timers, prices) need `tabular-nums`.

**Colors** — semantic only. Text by role: `text-primary` (titles, headings, content read), `text-secondary` (supporting copy, descriptions, empty states, readable-but-inactive), `text-tertiary` (hints, placeholders, metadata, decorative icons), `text-quaternary` (faintest traces only — disabled hints, watermarks). Titles/headings are never tertiary/quaternary — if a heading looks grayed out, its level is wrong. Plus `text-support-*` for status and `text-accent`. Icons use the same semantic colors (rendered solid automatically — see `glaze-icon-usage`). Surfaces: `bg-well` (recessed), `bg-control-subtle`→`bg-control`→`bg-control-active` (hover→rest→press), `bg-popover` (elevated). Borders: `border-separator` (hairlines), `border-field` (inputs), `border-secondary` (stronger outlines). Never hardcode `white`/`black` or raw palette colors, and never pair semantic tokens with `dark:` overrides — they already adapt per appearance and theme.

**Corner radius** — components carry their own; never override it. For custom chrome pick by role so corners adapt per platform (Windows squares chrome): `rounded-pill` (chips, badges, pill buttons, glass bars — never `rounded-full` for pills), `rounded-full` (true circles: avatars, dots, indicators, radio/switch parts), `rounded-control` (form-control surfaces), `rounded-panel` (floating panels), `rounded-popover` (menus), `rounded-dialog` (modals), `rounded-card` (cards, wells, grouped sections), `rounded-md`/`rounded-lg` (small inner elements ≤8px — never square below 8px). Nested in a pill track: `rounded-[calc(var(--radius-pill)-2px)]` to stay concentric.

**Layout & class hygiene** — space flex/grid children with `gap-*` on the parent, not `m*-*` on each child. Flex items with truncated/fluid content need `min-w-0`; icons and fixed-width elements need `shrink-0`. Use `size-{n}` when width == height, `p-4` not `px-4 py-4`. Don't add classes matching the element default (`block` on `<div>`), or two conflicting values for one property without a variant. Bare values where allowed (`z-50`, `opacity-75`).

## Scroll, Sticky & Z-Index

- **One scroll container** between a sticky element and the viewport. Don't put `overflow-clip`/`overflow-hidden`/`isolate` on a container with sticky children. Use `ScrollArea scrollbars="vertical"` when a child handles horizontal scroll.
- Z-index: `z-30` window chrome/toolbars · `z-20` ScrollArea toolbars · `z-10` sticky section headers · `z-auto` content.

## Verification Gate

Before submitting, check the things agents actually botch:

- [ ] No raw HTML where a component exists; all imports from `@glaze/core/{components,hooks,utils}`
- [ ] Customization via props (variant, size) before className overrides
- [ ] Every movable app-owned window has a `Toolbar` or top `.drag-region`
- [ ] One `variant="accent"` button per screen/dialog
- [ ] `SplitView` only for sidebar/list/primary/inspector shells; `PanelGroup` otherwise
- [ ] Text via `<Text variant>` (or variant utilities), not `text-sm`/`text-base`/`font-medium`
- [ ] Semantic colors and role-based radius; no web-style cards
- [ ] Flex children: `gap-*` on parent, `min-w-0` on truncating, `shrink-0` on icons; changing numbers `tabular-nums`

## Reference

| Hook                  | Purpose                 |     | Utility       | Purpose                    |
| --------------------- | ----------------------- | --- | ------------- | -------------------------- |
| `useTheme`            | Apply theme to document |     | `cn`          | Merge Tailwind classes     |
| `useConnection`       | IPC connection status   |     | `initLogging` | Initialize console logging |
| `useEnvironment`      | App environment info    |     |               |                            |
| `useWindowFocusState` | Window focus tracking   |     |               |                            |

## Related Skills

- `glaze-component-docs-reader` — fetch a component's condensed docs (props, variants, usage, pitfalls) in an isolated context instead of reading full `.md` files.
- `glaze-icon-usage`, `glaze-theming` — icon coloring and app theming.
