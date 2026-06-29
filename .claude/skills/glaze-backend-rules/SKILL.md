---
name: glaze-backend-rules
description: Rules for Glaze backend, service, settings, and IPC implementation.
---

# Glaze Backend Rules

Use this before backend, service, settings, or IPC implementation.

## Task Setup

- Review the IPC contract in the task prompt before implementing.
- Invoke task-specific skills named in the task prompt before writing code governed by those skills.

## Scope And Search

- Work with provided file paths and context.
- Keep reads narrowly scoped.
- Read only directly relevant files plus files they directly import.
- If required information is missing, report it in `Issues:` instead of hunting for unrelated context.
- Batch independent reads and searches in a single turn when their parameters are known.
- File searches must stay within `.glaze-sources/`, log paths, or explicit `<runtime_context>` paths.
- Never run broad `find` commands such as `find /` or `find ~`; they can trigger macOS permission popups.
- Avoid home directories, iCloud, OneDrive, and paths outside the project.
- Use Grep/Glob/Read for file search and reads, not bash find/grep/cat/head/sed.

## Backend Rules

- Keep handlers in `main/handlers/` thin; put business logic in `main/services/`.
- Validate all IPC inputs at the boundary; use `unknown` with type guards, never `any`.
- Handler parameter and response shapes must exactly match the IPC contract.
- Use specific, actionable error messages with paths or codes when useful; log before re-throwing.
- After writing a setting, broadcast `ipcMain.broadcast("settings:<key>-changed", { value })` so all windows react.

## Checklist

- [ ] IPC contract implemented exactly as specified
- [ ] Handler parameter types explicitly defined
- [ ] Services in `main/services/`, handlers in `main/handlers/`
- [ ] Specific error messages, not generic "Failed"
- [ ] Settings mutations broadcast change events
