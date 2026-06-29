# Glaze Agent Flow Analysis

This folder is a copied analysis workspace for Glaze's local agent resources and tool wiring.

## What Happens When You Send A Message

1. The Glaze UI sends your message to the local Glaze host app.
2. The local host logs the prompt and prepares the app/session context.
3. For existing conversations, Glaze runs the `taskBoundary` classifier prompt to decide whether the message is a continuation or a new task.
4. If the message is a new task, Glaze clears/resets the Claude session folder for that app. If it is a continuation, it keeps the existing session context.
5. Glaze loads agent resources from its production resource bundle: prompts, guides, skills, and rules.
6. The visible chat/build agent uses the `mainOrchestrator` prompt and presents itself as Glaze Agent.
7. Glaze starts Claude Agent SDK with custom options: system prompt, model, tools, MCP servers, hooks, skills, settings, and session configuration.
8. Glaze registers an in-process SDK MCP server named `Glaze`.
9. Claude sees Glaze tools as `mcp__Glaze__<ToolName>` and calls them when needed.
10. Tool handlers execute locally inside the Glaze host process, then call Glaze app handlers, native host APIs, build commands, live inspection, or conversation helpers.
11. The agent edits files in the generated app's `.glaze-sources` folder, builds/launches/inspects through tools, and returns a short user-facing response.

## Prompt Roles

- `mainOrchestrator`: the main visible agent you chat with.
- `taskBoundary`: sidecar classifier that decides continuation versus new task.
- `frontendArchitect`: specialist subagent prompt for complex frontend work.
- `backendArchitect`: specialist subagent prompt for backend, services, and IPC work.
- `issueReport`: support/debug handoff report generator.

## Resource Loading

`.payload.json` is Glaze's packed resource bundle. It is not a standard Claude Agent SDK file. It contains prompt text plus copies of guides, skills, and rules.

Glaze also materializes the resources into Claude-compatible files:

- `CLAUDE.md`
- `GLAZE-APP-GUIDE.md`
- `.claude/skills/*/SKILL.md`
- `.claude/rules/*.md`

Claude Agent SDK natively understands `CLAUDE.md`, `.claude/skills`, settings, plugins, and MCP configuration. Glaze appears to combine that with programmatic SDK options.

## Local Tool Implementation

The 13 Glaze MCP tools are implemented in the bundled host file:

`/Applications/Glaze.app/Contents/Resources/main-app/build/main/index.js`

They are extracted here under:

`Glaze/tools/`

The server construction is in:

`Glaze/create-glaze-tools-server.js`

The allowlist is in:

`Glaze/mcp-tool-allowlists.js`

## Glaze MCP Tools

- `mcp__Glaze__AppStatus`
- `mcp__Glaze__BuildApp`
- `mcp__Glaze__LaunchApp`
- `mcp__Glaze__UpdateBundle`
- `mcp__Glaze__RepackageBundle`
- `mcp__Glaze__GlazeTodoWrite`
- `mcp__Glaze__GetConversationHistory`
- `mcp__Glaze__ReportMigrationOutcome`
- `mcp__Glaze__LiveAppInspectionStatus`
- `mcp__Glaze__LiveAppSnapshotDOM`
- `mcp__Glaze__LiveAppInspectElement`
- `mcp__Glaze__LiveAppEvaluate`
- `mcp__Glaze__LiveAppCapturePreview`

## Key Evidence From Local Logs

The host log showed:

- `Loaded agent resources from R2`
- `prompts: backendArchitect, frontendArchitect, issueReport, mainOrchestrator, taskBoundary`
- `Using AI proxy for API calls`
- `Configured Glaze MCP tools {"toolCount":13}`
- `UserPromptSubmit hook executing`
- `Task boundary decision` before later follow-up queries

## Important Distinction

- `.payload.json` controls agent instructions and resource content.
- `main-app/build/main/index.js` controls runtime orchestration, SDK setup, hooks, permissions, MCP server registration, and local tool handlers.
