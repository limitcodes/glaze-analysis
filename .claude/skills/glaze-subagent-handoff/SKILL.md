---
name: glaze-subagent-handoff
description: Mechanics for delegating to glaze-frontend-architect / glaze-backend-architect sub-agents — IPC contract format, sub-agent prompt shape, handoff size, model selection, logging, and post-delegation integration. Invoke right before spawning sub-agents, after the orchestrator's delegation gate has already passed.
---

# Glaze Sub-Agent Handoff

Use this only after the delegation gate in the orchestrator has passed and you've chosen which agent(s) to spawn. It covers HOW to hand off; the WHETHER-to-delegate decision stays in the orchestrator prompt — do not re-litigate it here.

## IPC Contract Rule (when delegating to BOTH agents)

Define a complete IPC contract and pass the EXACT same contract to both sub-agents before spawning:

```
Channel: "feature-name:action"
Request: { param1: Type, param2: Type }
Response: { result: Type } | ErrorType
```

- Frontend implements: `window.glaze.invoke("channel", params)`
- Backend implements: `ipcMain.handle("channel", handler)`
- Only delegate to both agents after the contract is explicit and identical in both prompts.
- Spawn both sub-agents in PARALLEL — emit both Agent tool calls in the **same message** (two tool_use blocks in one turn). Never delegate one, wait for it, then delegate the other.

## Sub-Agent Prompts

Describe WHAT, not HOW. Include: description, exact file paths, requirements, task-specific skills to invoke, and logging guidance when runtime-sensitive. The frontend/backend prompts load their baseline rule skills — don't repeat generic frontend/backend rules in the handoff.

- **Handoff size:** Keep prompts under ~500 tokens. Pass file **paths**, never file **contents** — sub-agents read files themselves, and their Reads don't consume your context. Never paste logs, full diffs, or long histories; if you're about to paste more than ~20 lines, pass a path or a one-line summary instead.
- **Model:** Don't pass a `model` parameter — the frontend/backend architect agents already run on their configured model.
- **One task per sub-agent:** One focused goal each. Don't combine unrelated work (e.g. UI structure + API integration) in a single delegation.

## Logging (runtime-sensitive work)

Instruct sub-agents to add focused logging at integration points and uncertain paths:

- Backend: `console.log("[feature:action]", { params, result })` for new IPC handlers, service calls, and error paths where runtime failures are plausible.
- Frontend: `console.log("[Component:action]", { state })` for IPC calls, error boundaries, and key state transitions that are hard to validate statically.
- Include request/response summaries, timing, and error details when useful.
- Don't log every prop/state value or add noisy logs to deterministic visual-only edits.

## After Delegation

You remain responsible for integration. Review changed files, resolve conflicts, fix contract mismatches, run validation, and fix issues directly. Never hand work back to another sub-agent just to avoid finishing integration.
