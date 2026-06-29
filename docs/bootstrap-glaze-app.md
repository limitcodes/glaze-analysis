# Bootstrap Glaze Apps Outside Glaze

This repo now includes `scripts/bootstrap-glaze-app.sh` to reproduce Glaze's app-folder bootstrap without using the Glaze desktop chat UI.

## What It Does

- copies `/Applications/Glaze.app/Contents/Resources/template-app`
- creates a `.glaze-sources/` workspace
- links shared `.claude/agents`, `.claude/skills`, and `.claude/rules` into the app workspace
- copies `.claude/settings.json`, `CLAUDE.md`, and `GLAZE-APP-GUIDE.md` into the app workspace
- patches `glaze.ts` to resolve the SDK from `~/Library/Application Support/app.glaze.macos.main/sdk/current`
- creates a sibling `glaze-core` symlink to the installed SDK
- updates `package.json` metadata
- initializes git

## Usage

Default target is repo-local `apps/`:

```bash
./scripts/bootstrap-glaze-app.sh "My Glaze App"
```

Optional app id:

```bash
./scripts/bootstrap-glaze-app.sh "My Glaze App" my-glaze-app-test
```

Optional custom target dir:

```bash
./scripts/bootstrap-glaze-app.sh "My Glaze App" my-glaze-app-test /tmp
```

## Build Environment

Glaze ships its own Node runtime. Put it on `PATH` before running scripts:

```bash
export PATH="$HOME/Library/Application Support/app.glaze.macos.main/node/runtime/node-v24.14.1-darwin-arm64/bin:$PATH"
```

Then inside the generated `.glaze-sources/` directory:

```bash
npm install --include=dev
node glaze.ts type-check
node glaze.ts lint
node glaze.ts build
node glaze.ts dev
```

## Claude Code Workflow

For multiple apps, keep each generated app under `apps/<app-id>/`.

Each generated app is self-contained enough to open directly with Claude Code.

Start Claude Code from the app you want to work on:

```bash
cd apps/<app-id>/.glaze-sources
claude --agent main-orchestrator
```

Claude Code does not need a special "open this project" flag for the normal case. Its primary project root is the directory where you launch it. If you start Claude elsewhere, you can still move the session with:

```text
/cd apps/<app-id>/.glaze-sources
```

Relevant Claude Code docs:

- CLI reference: `claude --agent <name>` exists, but there is no documented top-level "set project directory" flag for ordinary interactive sessions.
- Commands: `/cd <path>` relocates the session to a new working directory.
- Permissions: `--add-dir <path>` adds file access, but does not make that directory the main config root.

## Remaining Gap

After this bootstrap work, the main missing piece for true Glaze-app parity is the MCP/runtime tool layer.

What already works:

- prompt and agent structure
- rules and skills
- multi-app bootstrapping
- Glaze SDK CLI access
- local build/lint/type-check workflow

What is still not replicated:

- Glaze host MCP tools such as build-status orchestration, app launching, live inspection, screenshots, and Glaze conversation-history recall
