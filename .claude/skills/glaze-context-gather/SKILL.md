---
name: glaze-context-gather
description: Gather context from project memory, guides, and codebase before implementation. Use when starting new features, complex changes, or when you need to understand existing patterns. Triggers on "gather context", "check what exists", "explore the codebase", or any task that needs codebase understanding before coding.
context: fork
model: haiku
agent: Explore
allowed-tools: Read Grep Glob Bash
argument-hint: '"<glaze-app-guide-path>" "<task description>"'
arguments:
  - guide_path
  - task
---

Gather context for this task: $task

Glaze App Guide path: `$guide_path`

Raw invocation arguments: $ARGUMENTS

## Sources (in priority order)

### 1. Project Memory

Read `.glaze_memory/PROJECT-CONTEXT.md` only when it is already known to exist. Its **`## Current State`** section is the highest-value part — a standing snapshot of key files, data/storage, IPC channels, integrations, and conventions that lets you report what already exists without re-reading the codebase; **`## History`** adds previous decisions, corrections, and user preferences. Fresh apps may not have project memory yet; do not issue a failing Read for a missing file. If the file is absent or unknown, report "No project memory yet" and continue with the guide and code.

### 2. App Guide

Read the Glaze App Guide at `$guide_path`. Use `Read` with `offset` and `limit` to read only relevant sections — never read the full guide. If `$guide_path` is missing or equals `(not found)`, report "Glaze App Guide path unavailable" and continue with project memory and code only; do not search for the guide.

**Guide section index (line numbers → use as offset):** | Section | Lines | When to read | | Critical Rules | 52-72 | Always | | Decision Trees | 73-105 | Always | | Overview / Architecture | 106-129 | Often | | Backend (handlers, services) | 130-498 | Backend tasks | | Window Management | 147-302 | Window tasks | | Adding Backend Handlers | 303-336 | New IPC handlers | | Global Shortcuts | 337-374 | Hotkey tasks | | System Notifications | 375-408 | Notification tasks | | System Tray | 409-498 | Menu bar tasks | | Frontend (components, routing) | 499-561 | UI tasks | | Configuration | 562-595 | Config tasks | | Bundling & Publishing | 596-764 | Native modules | | Static Assets | 765-1016 | Images/fonts | | App Updates | 1017-1051 | Update/auto-update tasks | | Quick Reference / Patterns | 1052-1172 | Always | | File Modification Guide | 1173-1200 | What to edit/avoid |

If a section is not at the listed offset (guide edits shift line numbers), locate its heading with Grep instead of scanning the file.

### 3. Existing Codebase

- Check existing implementations for patterns
- Look for related code that new features should integrate with

## Output Format

```
## Context for: [Task Description]

### From Project Memory
[Relevant entries, or "No relevant history"]

### From GLAZE-APP-GUIDE.md
- Section: [name] — [relevant info]

### From Existing Code
- [file path]: [what it contains/does]

### Notable Constraints
[NEVER/ALWAYS rules, forbidden patterns found]
```

## Rules

1. Report, don't decide — no architectural recommendations or package dependecies
2. Be concise — summarize, don't dump file contents
3. Prioritize project memory — the `## Current State` snapshot and previous corrections are most valuable
4. Only include relevant info — skip unrelated sections
5. Batch all independent reads in a single turn, but only include PROJECT-CONTEXT.md when it is already known to exist
6. File searches must stay within `.glaze-sources/` and the guide path ONLY. NEVER search home directories, iCloud, OneDrive, or any path outside the project. Do not run broad `find` commands such as `find /`, `find ~`, `find /Users`, or similar full-home/full-disk scans; they can trigger macOS privacy permission prompts.
7. Do NOT read `@glaze/core` component files — neither the `.md` docs nor the `.tsx`/`.ts` source under `.../sdk/current/@glaze/core/`. Component usage is out of scope here, stay within project memory, the guide, and the app's own code.
8. Output must be under 400 words
