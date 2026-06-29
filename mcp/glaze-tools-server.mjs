import fs from "node:fs/promises";
import path from "node:path";
import { spawn } from "node:child_process";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

const supportDir =
  process.env.GLAZE_SUPPORT_DIR ??
  path.join(process.env.HOME, "Library", "Application Support", "app.glaze.macos.main");
const nodeBin = path.join(
  supportDir,
  "node",
  "runtime",
  "node-v24.14.1-darwin-arm64",
  "bin",
  "node"
);
const nodeBinDir = path.dirname(nodeBin);
const sourcesDir = resolveSourcesDir(process.cwd());
const appRoot = path.dirname(sourcesDir);
const stateDir = path.join(sourcesDir, ".glaze-agent");
const todoPath = path.join(stateDir, "todos.json");
const migrationOutcomePath = path.join(stateDir, "last-migration-outcome.json");

function resolveSourcesDir(cwd) {
  if (path.basename(cwd) === ".glaze-sources") return cwd;
  return path.join(cwd, ".glaze-sources");
}

async function exists(targetPath) {
  try {
    await fs.access(targetPath);
    return true;
  } catch {
    return false;
  }
}

async function readJson(filePath) {
  return JSON.parse(await fs.readFile(filePath, "utf8"));
}

async function ensureStateDir() {
  await fs.mkdir(stateDir, { recursive: true });
}

function makeText(data) {
  return {
    content: [
      {
        type: "text",
        text: typeof data === "string" ? data : JSON.stringify(data, null, 2)
      }
    ]
  };
}

function run(command, args, options = {}) {
  return new Promise((resolve) => {
    const child = spawn(command, args, {
      cwd: options.cwd ?? sourcesDir,
      env: {
        ...process.env,
        PATH: `${nodeBinDir}:${process.env.PATH ?? ""}`
      },
      stdio: ["ignore", "pipe", "pipe"]
    });

    let stdout = "";
    let stderr = "";

    child.stdout.on("data", (chunk) => {
      stdout += chunk.toString();
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });
    child.on("close", (code) => {
      resolve({ code: code ?? 1, stdout, stderr });
    });
  });
}

async function getPackageJson() {
  return readJson(path.join(sourcesDir, "package.json"));
}

async function findAppBundle() {
  const pkg = await getPackageJson();
  const preferred = path.join(appRoot, `${pkg.productName}.app`);
  if (await exists(preferred)) return preferred;

  const entries = await fs.readdir(appRoot);
  const appEntry = entries.find((entry) => entry.endsWith(".app"));
  return appEntry ? path.join(appRoot, appEntry) : null;
}

async function isAppRunning() {
  const bundlePath = await findAppBundle();
  if (!bundlePath) return false;

  const appName = path.basename(bundlePath, ".app");
  const result = await run("pgrep", ["-x", appName], { cwd: appRoot });
  return result.code === 0;
}

async function buildStatus() {
  const pkg = await getPackageJson();
  const hasNodeModules = await exists(path.join(sourcesDir, "node_modules"));
  const hasBuild = await exists(path.join(appRoot, ".glaze", "build"));
  const hasRuntimeManifest = await exists(path.join(appRoot, ".glaze", "package.json"));
  const bundlePath = await findAppBundle();
  const running = bundlePath ? await isAppRunning() : false;

  return {
    appName: pkg.productName,
    appId: pkg.id,
    hasNodeModules,
    hasBuild,
    hasRuntimeManifest,
    bundlePath,
    running,
    inspection: {
      availability: "sessionUnavailable",
      reason: "Live app inspection tools are not implemented in this repo-local MCP server yet."
    }
  };
}

async function runGlaze(command) {
  return run(nodeBin, ["glaze.ts", command], { cwd: sourcesDir });
}

async function unavailableTool(toolName, reason) {
  return makeText({
    ok: false,
    tool: toolName,
    available: false,
    reason
  });
}

const server = new McpServer({
  name: "Glaze",
  version: "0.1.0"
});

server.registerTool(
  "AppStatus",
  {
    description: "Check build state, bundle presence, and launch state for the current Glaze app.",
    inputSchema: {}
  },
  async () => {
    const status = await buildStatus();
    const nextAction = !status.hasNodeModules
      ? "Install dependencies before building."
      : !status.hasBuild
        ? "Build the app before runtime validation."
        : status.bundlePath && !status.running
          ? "Launch the app when you need runtime validation."
          : "Use static checks or build output; live inspection is not wired yet.";

    return makeText({
      ok: status.hasBuild,
      nextAction,
      status
    });
  }
);

server.registerTool(
  "BuildApp",
  {
    description: "Run the Glaze CLI build in the current app workspace.",
    inputSchema: {}
  },
  async () => {
    const result = await runGlaze("build");
    return makeText({
      ok: result.code === 0,
      command: "node glaze.ts build",
      exitCode: result.code,
      stdout: result.stdout,
      stderr: result.stderr
    });
  }
);

server.registerTool(
  "LaunchApp",
  {
    description: "Open the built app bundle when one exists next to the current Glaze app workspace.",
    inputSchema: {}
  },
  async () => {
    const bundlePath = await findAppBundle();
    if (!bundlePath) {
      return makeText({
        ok: false,
        launched: false,
        reason:
          "No .app bundle was found next to this workspace. This repo-local flow can build source trees, but app launching requires a built bundle to already exist."
      });
    }

    const result = await run("open", [bundlePath], { cwd: appRoot });
    return makeText({
      ok: result.code === 0,
      launched: result.code === 0,
      bundlePath,
      inspectionReady: false,
      nextAction: "The app was opened if the OS accepted the request. Live inspection is not wired yet.",
      stdout: result.stdout,
      stderr: result.stderr
    });
  }
);

server.registerTool(
  "UpdateBundle",
  {
    description: "Placeholder for Glaze bundle metadata updates.",
    inputSchema: {}
  },
  async () =>
    unavailableTool(
      "UpdateBundle",
      "Glaze host bundle mutation is not implemented in this repo-local MCP server yet."
    )
);

server.registerTool(
  "RepackageBundle",
  {
    description: "Placeholder for Glaze bundle repackaging.",
    inputSchema: {}
  },
  async () =>
    unavailableTool(
      "RepackageBundle",
      "Glaze host repackaging is not implemented in this repo-local MCP server yet."
    )
);

server.registerTool(
  "GlazeTodoWrite",
  {
    description: "Persist a Glaze-style task list in repo-local state.",
    inputSchema: {
      todos: z.array(
        z.object({
          content: z.string(),
          status: z.enum(["pending", "in_progress", "completed"]),
          activeForm: z.string().optional()
        })
      ),
      title: z.string().optional()
    }
  },
  async ({ todos, title }) => {
    await ensureStateDir();
    const payload = {
      title: title ?? null,
      todos,
      updatedAt: new Date().toISOString()
    };
    await fs.writeFile(todoPath, JSON.stringify(payload, null, 2));
    return makeText({
      ok: true,
      statePath: todoPath,
      total: todos.length,
      completed: todos.filter((todo) => todo.status === "completed").length
    });
  }
);

server.registerTool(
  "GetConversationHistory",
  {
    description: "Placeholder for Glaze conversation-history recall.",
    inputSchema: {
      limit: z.number().int().min(1).max(50).optional(),
      include: z.enum(["user", "both"]).optional(),
      tool_calls: z.boolean().optional()
    }
  },
  async () =>
    unavailableTool(
      "GetConversationHistory",
      "Glaze conversation history lives in the desktop app database and is not exposed here yet."
    )
);

server.registerTool(
  "ReportMigrationOutcome",
  {
    description: "Persist the migration outcome in repo-local state.",
    inputSchema: {
      status: z.enum(["completed", "not_applicable", "blocked"]),
      reason: z.string().min(1)
    }
  },
  async ({ status, reason }) => {
    await ensureStateDir();
    await fs.writeFile(
      migrationOutcomePath,
      JSON.stringify(
        {
          status,
          reason,
          updatedAt: new Date().toISOString()
        },
        null,
        2
      )
    );
    return makeText({
      ok: true,
      statePath: migrationOutcomePath,
      status
    });
  }
);

server.registerTool(
  "LiveAppInspectionStatus",
  {
    description: "Report that live inspection is not yet wired in the repo-local MCP server.",
    inputSchema: {}
  },
  async () =>
    makeText({
      availability: "sessionUnavailable",
      reason: "Live inspection is not implemented in this repo-local MCP server yet."
    })
);

server.registerTool(
  "LiveAppSnapshotDOM",
  {
    description: "Placeholder for runtime DOM snapshots.",
    inputSchema: {
      selector: z.string().optional(),
      windowId: z.string().optional(),
      maxDepth: z.number().int().min(0).max(6).optional(),
      includeStyles: z.boolean().optional(),
      includeLayout: z.boolean().optional()
    }
  },
  async () =>
    unavailableTool(
      "LiveAppSnapshotDOM",
      "Live DOM snapshots require Glaze host runtime inspection, which is not wired yet."
    )
);

server.registerTool(
  "LiveAppInspectElement",
  {
    description: "Placeholder for runtime DOM element inspection.",
    inputSchema: {
      selector: z.string(),
      windowId: z.string().optional()
    }
  },
  async () =>
    unavailableTool(
      "LiveAppInspectElement",
      "Live element inspection requires Glaze host runtime inspection, which is not wired yet."
    )
);

server.registerTool(
  "LiveAppEvaluate",
  {
    description: "Placeholder for runtime script evaluation.",
    inputSchema: {
      script: z.string(),
      windowId: z.string().optional()
    }
  },
  async () =>
    unavailableTool(
      "LiveAppEvaluate",
      "Live script evaluation requires Glaze host runtime inspection, which is not wired yet."
    )
);

server.registerTool(
  "LiveAppCapturePreview",
  {
    description: "Placeholder for runtime screenshots.",
    inputSchema: {
      windowId: z.string().optional(),
      rect: z
        .object({
          x: z.number(),
          y: z.number(),
          width: z.number(),
          height: z.number()
        })
        .optional()
    }
  },
  async () =>
    unavailableTool(
      "LiveAppCapturePreview",
      "Live screenshots require Glaze host runtime inspection, which is not wired yet."
    )
);

const transport = new StdioServerTransport();
await server.connect(transport);
