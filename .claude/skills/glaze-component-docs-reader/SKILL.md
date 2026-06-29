---
name: glaze-component-docs-reader
description: Fetch usage docs for one or more @glaze/core design-system components WITHOUT loading the full files into your context. The caller passes the absolute path to each component's .md; this skill reads only those exact files in an isolated context and returns a condensed API reference (import, props, variants, one canonical snippet, pitfalls). Use this instead of Read-ing component .md files directly. Triggers on "read the docs for <component>", "component docs", or before implementing UI with @glaze/core components.
context: fork
model: haiku
agent: Explore
effort: medium
allowed-tools: Read
argument-hint: '"<absolute paths to component .md files>" "<task description>"'
arguments:
  - components
  - task
---

Return a task-focused usage reference for the @glaze/core components whose `.md` docs are at these absolute paths: $components

Task the caller is implementing: $task

Raw invocation arguments: $ARGUMENTS

Use the task to decide what is relevant. Lead with the props, variants, composition, and snippet the task actually needs, and tailor the canonical snippet to the task. If `$task` is empty, return the general condensed API instead.

## What to read

`$components` is the set of **absolute paths** to the component `.md` files the caller wants. Read **only** those exact paths, in a single batch.

- You have **only** the `Read` tool — no `Glob`, `Grep`, or `Bash`. Do not search the filesystem, do not list directories, and do not run `find`. Never look in home directories, iCloud, OneDrive, or anywhere outside the paths you were given (broad scans can trigger macOS privacy prompts).
- If a given path doesn't exist or can't be read, list it under "Not found" and continue — never hunt for it elsewhere, guess another location, or invent its API.

## What to extract per component

Read each `.md` and distill it for **$task**. Cut prose, rationale, and redundant examples — but **never cut API surface**. The token win comes from dropping prose and extra snippets, not from dropping props; a full prop table is only ~100–300 tokens, while a silently-omitted prop has no recovery path (the caller cannot read the source) and may be reused for a later task it was never trimmed for.

- **Import** — the exact import line.
- **Props** — the **complete** prop table for **every exported part**: name, type, default, whether required. Do **not** omit props, even ones that look unrelated to the current task. You may order the most task-relevant props first, but every prop must be present.
- **Variants / sizes** — **all** allowed values for each variant/size prop. Never list a subset.
- **Composition** — required sub-components and their nesting (e.g. `SelectTrigger`/`SelectContent` inside `Select`).
- **One canonical usage snippet** — the smallest correct example, tailored to the task. Drop any additional examples.
- **Pitfalls** — the "don't do this" / common-mistake notes that bear on the task.

The goal is that the caller can write correct code for the task from your output alone, at a fraction of the tokens of the raw file. Tailor the **snippet and emphasis** to the task; keep the **prop tables and variant lists complete** regardless of task.

## Output Format

For each component:

```
### <Component> (<file>.md)
Import: <import line>
Props:
- <prop>: <type> — <default; required?>
Variants: <...>   Sizes: <...>
Composition: <required sub-components / nesting, or "none">
Usage:
<smallest correct snippet>
Pitfalls:
- <bullet>
```

If any passed path could not be read, end with:

```
### Not found
- <path>: file does not exist or could not be read
```

## Rules

1. Return **every** prop of **every exported part**, with exact names and types — the caller relies on these to write correct code and cannot read the source to recover an omitted one. Trim prose, rationale, and extra examples; never trim props or variant values.
2. One usage snippet per component. No duplicate or variant-only examples.
3. Report the API; do not editorialize or recommend architecture.
4. Read only the exact `.md` paths passed in `$components` — nothing else.
5. Never search the filesystem. You have only the `Read` tool — no `Glob`, `Grep`, or `Bash`, so `find` and broad scans cannot run. Don't look in home directories, iCloud, OneDrive, or any path you weren't given; if a passed path is wrong or missing, report it as Not found instead of searching for the right one.
