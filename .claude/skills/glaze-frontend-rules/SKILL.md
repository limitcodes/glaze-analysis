---
name: glaze-frontend-rules
description: Rules for Glaze frontend implementation with React, TanStack Router, React Query, and @glaze/core components.
---

# Glaze Frontend Rules

Use this before frontend implementation.

## Task Setup

- If an IPC contract is provided in the task, use it for backend calls.
- Invoke task-specific skills named in the task prompt before writing code governed by those skills.
- Before writing UI components, also invoke `glaze-component-patterns` — it's the authoritative reference for design-system components, layout shells, and Tailwind/token rules.

## Scope And Search

- Work with provided file paths and context.
- Keep reads narrowly scoped.
- Read only directly relevant files plus files they directly import.
- If required information is missing, report it in `Issues:` instead of hunting for unrelated context.
- Minimize round trips: batch independent reads, searches, and edits into a single turn — read all the files you'll touch together, then apply all independent edits together. Only sequence when a call's input depends on a prior result.
- Never `Read` `@glaze/core` component files directly — neither the `.md` docs nor the `.tsx`/`.ts` source (it's hard-blocked on the main thread anyway). Get component docs via the `glaze-component-docs-reader` skill — **one** call for **all** the components you need, passing the **absolute path** to each component's `.md`. The path is `<SDK Path>/@glaze/core/src/components/<kebab-name>.md` (e.g. `SplitView` → `<SDK Path>/@glaze/core/src/components/split-view.md`), where `<SDK Path>` is the `SDK Path` value from runtime_context — or use the exact `doc` path from the SDK Symbol Map joined to `SDK Path`. It reads only the exact paths you give it and never searches the filesystem, so they must be correct. **Fire it in the background — in the same turn as your other independent work.** Emit the skill call alongside your other independent tool calls (reading the app's own files, exploring routes/state, scaffolding code that doesn't need the components yet) so its forked extraction runs concurrently instead of as a blocking wait. Don't spend a turn just waiting on it; keep doing the non-component work and only block on its result at the step where you actually write the component code.
- File searches must stay within `.glaze-sources/`, log paths, or explicit `<runtime_context>` paths.
- Never run broad `find` commands such as `find /` or `find ~`; they can trigger macOS permission popups.
- Avoid home directories, iCloud, OneDrive, and paths outside the project.
- Use Grep/Glob/Read for file search and reads, not bash find/grep/cat/head/sed.

## Frontend Rules

- Use URL-driven state with TanStack Router `useParams` / `useNavigate`; do not use local `useState` for routed selection.
- Use React Query for data fetching; prefer derived state over `useEffect`.
- Use design system components from `@glaze/core/components`; do not build raw HTML sidebars, panels, or lists.
- Do not use `any`; use explicit types or `unknown` with guards.
- Use lucide icons only; do not use emojis as UI icons.
- Render skeleton placeholders with exact dimensions; avoid layout shift and avoid returning `null` while loading.
- Never use CSS/WebKit blur (`backdrop-filter`, `-webkit-backdrop-filter`, Tailwind `backdrop-blur-*`) as a window background or root/full-window glass surface. For frosted HUDs, panels, popovers, or translucent windows, the backend must use native `BrowserWindow` vibrancy and the renderer root should stay transparent.
- `backdrop-blur-*` is acceptable only for localized inner UI effects inside normal opaque content, never on `html`, `body`, `#root`, root shells, full-window cards, HUD cards, menu-bar panels, or anything acting as the window material.

## Checklist

- [ ] URL-driven state, no local `useState` for routed selection
- [ ] React Query for data fetching
- [ ] Design system components for layout
- [ ] No CSS/WebKit blur used as a window background or full-window glass surface
- [ ] Template or placeholder code removed

## Related Skills

- `glaze-component-patterns` — design-system component reference, layout shells, and Tailwind/token rules; invoke before writing UI.
- `glaze-component-docs-reader` — fetch condensed docs for one or more components (props, variants, usage, pitfalls) in an isolated context, in a single call, instead of reading the `.md`/source files directly (which is blocked on the main thread).
