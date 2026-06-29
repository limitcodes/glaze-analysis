#!/usr/bin/env bash
set -euo pipefail

if [[ $# -lt 1 ]]; then
  echo "Usage: $0 <app-name> [app-id] [target-dir]" >&2
  exit 1
fi

APP_NAME=$1
APP_ID=${2:-}
TARGET_DIR=${3:-apps}

GLAZE_SUPPORT_DIR="${GLAZE_SUPPORT_DIR:-$HOME/Library/Application Support/app.glaze.macos.main}"
TEMPLATE_DIR="/Applications/Glaze.app/Contents/Resources/template-app"
NODE_BIN="$GLAZE_SUPPORT_DIR/node/runtime/node-v24.14.1-darwin-arm64/bin/node"
NPM_BIN="$GLAZE_SUPPORT_DIR/node/runtime/node-v24.14.1-darwin-arm64/bin/npm"
SDK_CURRENT_DIR="$GLAZE_SUPPORT_DIR/sdk/current"
REPO_ROOT=$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)

if [[ ! -d "$TEMPLATE_DIR" ]]; then
  echo "Template app not found: $TEMPLATE_DIR" >&2
  exit 1
fi

if [[ ! -x "$NODE_BIN" ]]; then
  echo "Bundled Glaze node not found: $NODE_BIN" >&2
  exit 1
fi

if [[ ! -d "$SDK_CURRENT_DIR/@glaze/core" ]]; then
  echo "Glaze SDK not found: $SDK_CURRENT_DIR/@glaze/core" >&2
  exit 1
fi

slugify() {
  printf '%s' "$1" \
    | tr '[:upper:]' '[:lower:]' \
    | sed -E 's/[^a-z0-9]+/-/g; s/^-+//; s/-+$//; s/-+/-/g'
}

APP_SLUG=$(slugify "$APP_NAME")
if [[ -z "$APP_ID" ]]; then
  APP_ID="${APP_SLUG:-glaze-app}-$(LC_ALL=C tr -dc 'a-z0-9' </dev/urandom | head -c 8)"
fi

DEST_DIR="$TARGET_DIR/$APP_ID"
SRC_DIR="$DEST_DIR/.glaze-sources"
GLAZE_CORE_LINK="$DEST_DIR/glaze-core"
APP_CLAUDE_DIR="$SRC_DIR/.claude"
GLAZE_MCP_LINK="$DEST_DIR/glaze-mcp"

if [[ -e "$DEST_DIR" ]]; then
  echo "Target already exists: $DEST_DIR" >&2
  exit 1
fi

mkdir -p "$DEST_DIR"
cp -R "$TEMPLATE_DIR" "$SRC_DIR"
ln -s "$SDK_CURRENT_DIR/@glaze/core" "$GLAZE_CORE_LINK"
ln -s "$REPO_ROOT/mcp" "$GLAZE_MCP_LINK"
mkdir -p "$APP_CLAUDE_DIR"
ln -s "$REPO_ROOT/.claude/agents" "$APP_CLAUDE_DIR/agents"
ln -s "$REPO_ROOT/.claude/skills" "$APP_CLAUDE_DIR/skills"
ln -s "$REPO_ROOT/.claude/rules" "$APP_CLAUDE_DIR/rules"
cp "$REPO_ROOT/.claude/settings.json" "$APP_CLAUDE_DIR/settings.json"
cp "$REPO_ROOT/CLAUDE.md" "$SRC_DIR/CLAUDE.md"
cp "$REPO_ROOT/GLAZE-APP-GUIDE.md" "$SRC_DIR/GLAZE-APP-GUIDE.md"
cat >"$SRC_DIR/.mcp.json" <<EOF
{
  "mcpServers": {
    "Glaze": {
      "command": "${HOME}/Library/Application Support/app.glaze.macos.main/node/runtime/node-v24.14.1-darwin-arm64/bin/node",
      "args": ["../glaze-mcp/glaze-tools-server.mjs"]
    }
  }
}
EOF

cat >"$SRC_DIR/glaze.ts" <<'EOF'
#!/usr/bin/env node

import { existsSync } from "node:fs";
import { homedir } from "node:os";
import { resolve, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));

const supportDir =
  process.env.GLAZE_SUPPORT_DIR ??
  join(homedir(), "Library", "Application Support", "app.glaze.macos.main");

const candidates = [
  resolve(__dirname, "../glaze-core/cli/glaze.js"),
  resolve(__dirname, "../../../sdk/current/@glaze/core/cli/glaze.js"),
  join(supportDir, "sdk", "current", "@glaze", "core", "cli", "glaze.js"),
];

const cli = candidates.find(existsSync);
if (!cli) {
  console.error("[glaze] CLI not found. Searched:");
  candidates.forEach((p) => console.error(`  - ${p}`));
  process.exit(1);
}

await import(cli);
EOF

export APP_NAME APP_SLUG APP_ID SRC_DIR
"$NODE_BIN" <<'EOF'
const fs = require("node:fs");
const path = require("node:path");

const packageJsonPath = path.join(process.env.SRC_DIR, "package.json");
const pkg = JSON.parse(fs.readFileSync(packageJsonPath, "utf8"));

pkg.id = process.env.APP_ID;
pkg.name = process.env.APP_SLUG || "glaze-app";
pkg.productName = process.env.APP_NAME;
pkg.description = pkg.description || process.env.APP_NAME;
pkg.glaze = pkg.glaze || {};
pkg.glaze.createdAt = new Date().toISOString();
pkg.glaze.updatedAt = Date.now();
pkg.glaze.host = pkg.glaze.host || {};

fs.writeFileSync(packageJsonPath, JSON.stringify(pkg, null, 2) + "\n");
EOF

mkdir -p "$SRC_DIR/.glaze_memory"

cat >"$SRC_DIR/.glaze_memory/PROJECT-CONTEXT.md" <<EOF
# Project Context

## Overview
- App Name: $APP_NAME
- Purpose: New Glaze app bootstrapped outside the Glaze desktop UI.
- Features:
  - Default template scaffold

## Current State
- Key files:
  - \`glaze.ts\` CLI wrapper that resolves the Glaze SDK from Application Support
  - \`../glaze-core\` symlink to the installed Glaze SDK
  - \`../glaze-mcp\` symlink to the repo-local MCP server implementation
  - \`package.json\` template app metadata and scripts
  - \`.claude/\` app-local Claude config linked to the shared repo resources
- Components:
  - Template defaults only
- Data & storage:
  - None yet
- IPC channels:
  - Template defaults only
- Integrations:
  - Glaze SDK from \`$SDK_CURRENT_DIR\`
- Conventions & constraints:
  - Source of truth is \`.glaze-sources/\`

## History
### $(date +%F) - Initial bootstrap
- Goal: Create a Glaze app workspace outside the Glaze desktop app
- What was done: Copied the template app, patched \`glaze.ts\`, linked the shared Claude/MCP resources, and updated package metadata
- Key decisions: Resolve the SDK from Application Support and link Claude/MCP config so the workspace can be opened directly
- UI elements: template
- Backend elements: template
- Corrections/Lessons Learned: None
- User Frustrations & Important Remarks: None
EOF

(
  cd "$SRC_DIR"
  git init >/dev/null 2>&1
  git add .
  git commit -m "Initial Glaze app bootstrap" >/dev/null 2>&1 || true
)

cat <<EOF
Bootstrapped Glaze app:
  app dir: $DEST_DIR
  source dir: $SRC_DIR

Next:
  export PATH="$GLAZE_SUPPORT_DIR/node/runtime/node-v24.14.1-darwin-arm64/bin:\$PATH"
  cd "$SRC_DIR"
  claude --agent main-orchestrator
  npm install --include=dev
  node glaze.ts type-check
EOF
