import fs from "node:fs/promises";
import path from "node:path";
import { spawn } from "node:child_process";
import { pathToFileURL } from "node:url";
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
const templateShellPath = "/Applications/Glaze.app/Contents/Resources/template-app-shell.app";

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
      stdio: ["pipe", "pipe", "pipe"]
    });

    let stdout = "";
    let stderr = "";

    child.stdout.on("data", (chunk) => {
      stdout += chunk.toString();
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });
    if (options.input) {
      child.stdin.write(options.input);
      child.stdin.end();
    } else {
      child.stdin.end();
    }
    child.on("close", (code) => {
      resolve({ code: code ?? 1, stdout, stderr });
    });
  });
}

async function runOrThrow(command, args, options = {}) {
  const result = await run(command, args, options);
  if (result.code !== 0) {
    throw new Error(
      `${command} ${args.join(" ")} failed with exit code ${result.code}\n${result.stderr || result.stdout}`.trim()
    );
  }
  return result;
}

async function getPackageJson() {
  return readJson(path.join(sourcesDir, "package.json"));
}

function resolveDisplayName(pkg) {
  return pkg.productName || pkg.displayName || pkg.name || "Glaze App";
}

function resolveBundleIdentifier(pkg) {
  return `app.glaze.macos.${pkg.id}-local`;
}

function resolveActivationPolicy(pkg) {
  return pkg.appConfig?.macOS?.activationPolicy ?? "regular";
}

function normalizeExtensions(value) {
  const list = Array.isArray(value) ? value : [value];
  return list
    .filter(Boolean)
    .map((entry) => String(entry).replace(/^\./, ""))
    .filter(Boolean);
}

function normalizeContentTypes(value) {
  const list = Array.isArray(value) ? value : value ? [value] : [];
  return list.map((entry) => String(entry)).filter(Boolean);
}

function resolveFileAssociations(pkg) {
  return Array.isArray(pkg.appConfig?.fileAssociations) ? pkg.appConfig.fileAssociations : [];
}

function safeBundleName(displayName) {
  return `${displayName.replace(/\//g, "-")}.app`;
}

function currentBundlePathForPackage(pkg) {
  return path.join(appRoot, safeBundleName(resolveDisplayName(pkg)));
}

async function findAppBundle() {
  const pkg = await getPackageJson();
  const preferred = currentBundlePathForPackage(pkg);
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

async function listAppWindows() {
  const pkg = await getPackageJson();
  const ownerName = resolveDisplayName(pkg);
  const script = `
import CoreGraphics
import Foundation

let ownerName = CommandLine.arguments[1]
let windowList = CGWindowListCopyWindowInfo([.optionOnScreenOnly], kCGNullWindowID) as? [[String: Any]] ?? []
var result: [[String: Any]] = []

for window in windowList {
  guard let owner = window[kCGWindowOwnerName as String] as? String, owner == ownerName else { continue }
  let number = window[kCGWindowNumber as String] as? Int ?? 0
  let name = window[kCGWindowName as String] as? String ?? ""
  let bounds = window[kCGWindowBounds as String] as? [String: Any] ?? [:]
  result.append([
    "windowId": String(number),
    "title": name,
    "bounds": [
      "x": bounds["X"] as? Double ?? 0,
      "y": bounds["Y"] as? Double ?? 0,
      "width": bounds["Width"] as? Double ?? 0,
      "height": bounds["Height"] as? Double ?? 0
    ]
  ])
}

let data = try JSONSerialization.data(withJSONObject: result, options: [.prettyPrinted])
print(String(data: data, encoding: .utf8)!)
`;
  const result = await run("swift", ["-", ownerName], { cwd: appRoot, input: script });
  if (result.code !== 0) {
    throw new Error(result.stderr || result.stdout || "Failed to enumerate app windows");
  }
  return JSON.parse(result.stdout || "[]");
}

async function killAppIfRunning(bundlePath) {
  const appName = path.basename(bundlePath, ".app");
  const result = await run("pkill", ["-x", appName], { cwd: appRoot });
  return result.code === 0;
}

async function buildStatus() {
  const pkg = await getPackageJson();
  const hasNodeModules = await exists(path.join(sourcesDir, "node_modules"));
  const hasBuild = await exists(path.join(appRoot, ".glaze", "build"));
  const hasRuntimeManifest = await exists(path.join(appRoot, ".glaze", "package.json"));
  const bundlePath = await findAppBundle();
  const running = bundlePath ? await isAppRunning() : false;
  const windows = running ? await listAppWindows().catch(() => []) : [];

  return {
    appName: pkg.productName,
    appId: pkg.id,
    hasNodeModules,
    hasBuild,
    hasRuntimeManifest,
    bundlePath,
    running,
    windows,
    inspection: {
      availability: running ? "limited" : "notRunning",
      reason: running
        ? "Window discovery is available, but DOM-level Glaze host inspection is not implemented here."
        : "The app is not running."
    }
  };
}

export async function getInspectionStatus() {
  const status = await buildStatus();
  return {
    availability: status.running ? "limited" : status.hasBuild ? "notRunning" : "notBuilt",
    bundlePath: status.bundlePath,
    windows: status.windows,
    reason: status.running
      ? "Window discovery is available. DOM-level inspection is still unavailable without Glaze host runtime hooks."
      : status.hasBuild
        ? "Build artifacts exist, but the packaged app is not running."
        : "No build artifacts found yet."
  };
}

export async function capturePreview({ windowId, rect } = {}) {
  const status = await buildStatus();
  if (!status.running) {
    return {
      ok: false,
      reason: "The app is not running."
    };
  }

  const windows = status.windows ?? [];
  const targetWindow =
    (windowId ? windows.find((window) => window.windowId === windowId) : windows[0]) ?? null;
  if (!targetWindow) {
    return {
      ok: false,
      reason: "No matching app window was found."
    };
  }

  const captureRect = rect ?? targetWindow.bounds;
  const outputPath = path.join(
    "/tmp",
    `glaze-preview-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.png`
  );
  const result = await run(
    "screencapture",
    [
      "-x",
      "-R",
      `${Math.round(captureRect.x)},${Math.round(captureRect.y)},${Math.round(captureRect.width)},${Math.round(captureRect.height)}`,
      outputPath
    ],
    { cwd: appRoot }
  );

  if (result.code !== 0) {
    await fs.rm(outputPath, { force: true }).catch(() => {});
    return {
      ok: false,
      reason:
        "Screen capture failed. On macOS this usually means the terminal or Claude host lacks Screen Recording permission.",
      stderr: result.stderr,
      stdout: result.stdout,
      window: targetWindow
    };
  }

  return {
    ok: true,
    path: outputPath,
    window: targetWindow
  };
}

async function runGlaze(command) {
  return run(nodeBin, ["glaze.ts", command], { cwd: sourcesDir });
}

async function ensureBuildArtifacts() {
  const runtimeBuildPath = path.join(appRoot, ".glaze", "build");
  if (!(await exists(runtimeBuildPath))) {
    throw new Error("No .glaze/build output found. Run BuildApp before packaging or launching.");
  }
}

async function syncRuntimeManifest(pkg) {
  const runtimeDir = path.join(appRoot, ".glaze");
  await fs.mkdir(runtimeDir, { recursive: true });
  const runtimePkgPath = path.join(runtimeDir, "package.json");
  const runtimePkg = {
    id: pkg.id,
    name: pkg.name,
    productName: resolveDisplayName(pkg),
    version: pkg.version ?? "1.0.0",
    description: pkg.description ?? "A Glaze desktop application",
    ...(pkg.iconDescription ? { iconDescription: pkg.iconDescription } : {}),
    ...(pkg.appConfig ? { appConfig: pkg.appConfig } : {}),
    glaze: {
      ...(pkg.glaze ?? {}),
      host: {
        ...(pkg.glaze?.host ?? {}),
        minVersion: pkg.glaze?.host?.minVersion ?? pkg.glaze?.sdkVersion
      }
    }
  };
  await fs.writeFile(runtimePkgPath, JSON.stringify(runtimePkg, null, 2) + "\n");
}

async function plistBuddy(plistPath, command, ignoreFailure = false) {
  const result = await run("/usr/libexec/PlistBuddy", ["-c", command, plistPath], { cwd: appRoot });
  if (!ignoreFailure && result.code !== 0) {
    throw new Error(result.stderr || result.stdout || `PlistBuddy failed: ${command}`);
  }
  return result;
}

async function plistSet(plistPath, key, type, value) {
  const serialized =
    type === "bool"
      ? value
        ? "true"
        : "false"
      : String(value).replace(/"/g, '\\"');
  const setResult = await plistBuddy(plistPath, `Set :${key} ${serialized}`, true);
  if (setResult.code !== 0) {
    await plistBuddy(plistPath, `Add :${key} ${type} ${serialized}`);
  }
}

async function plistDelete(plistPath, key) {
  await plistBuddy(plistPath, `Delete :${key}`, true);
}

async function plistRebuildDocumentTypes(plistPath, fileAssociations) {
  await plistDelete(plistPath, "CFBundleDocumentTypes");
  if (fileAssociations.length === 0) {
    await plistBuddy(plistPath, "Add :CFBundleDocumentTypes array", true);
    return;
  }

  await plistBuddy(plistPath, "Add :CFBundleDocumentTypes array");

  for (const [index, association] of fileAssociations.entries()) {
    const extList = normalizeExtensions(association.ext);
    const contentTypes = normalizeContentTypes(association.contentTypes);
    await plistBuddy(plistPath, `Add :CFBundleDocumentTypes:${index} dict`);
    await plistBuddy(
      plistPath,
      `Add :CFBundleDocumentTypes:${index}:CFBundleTypeName string ${association.name ?? "Document"}`
    );
    await plistBuddy(
      plistPath,
      `Add :CFBundleDocumentTypes:${index}:CFBundleTypeRole string ${association.role ?? "Editor"}`
    );

    if (contentTypes.length > 0) {
      await plistBuddy(plistPath, `Add :CFBundleDocumentTypes:${index}:LSItemContentTypes array`);
      for (const [contentIndex, contentType] of contentTypes.entries()) {
        await plistBuddy(
          plistPath,
          `Add :CFBundleDocumentTypes:${index}:LSItemContentTypes:${contentIndex} string ${contentType}`
        );
      }
    } else {
      await plistBuddy(plistPath, `Add :CFBundleDocumentTypes:${index}:CFBundleTypeExtensions array`);
      for (const [extIndex, ext] of extList.entries()) {
        await plistBuddy(
          plistPath,
          `Add :CFBundleDocumentTypes:${index}:CFBundleTypeExtensions:${extIndex} string ${ext}`
        );
      }
    }
  }
}

async function copyIconIntoBundle(bundlePath) {
  const iconCandidates = [
    path.join(appRoot, ".glaze", "app-icon.icns"),
    path.join(sourcesDir, "app-icon.icns")
  ];
  for (const iconPath of iconCandidates) {
    if (await exists(iconPath)) {
      await fs.copyFile(iconPath, path.join(bundlePath, "Contents", "Resources", "template-appicon.icns"));
      return iconPath;
    }
  }
  return null;
}

async function customizeBundle(bundlePath, pkg) {
  const plistPath = path.join(bundlePath, "Contents", "Info.plist");
  const macosDir = path.join(bundlePath, "Contents", "MacOS");
  const displayName = resolveDisplayName(pkg);
  const bundleIdentifier = resolveBundleIdentifier(pkg);
  const executableName = displayName;
  const activationPolicy = resolveActivationPolicy(pkg);
  const oldExecutablePath = path.join(macosDir, "Glaze Template Production");
  const executablePath = path.join(macosDir, executableName);

  if (await exists(oldExecutablePath) && oldExecutablePath !== executablePath) {
    await fs.rename(oldExecutablePath, executablePath);
  } else if (!(await exists(executablePath))) {
    const entries = await fs.readdir(macosDir);
    if (entries.length === 1) {
      await fs.rename(path.join(macosDir, entries[0]), executablePath);
    }
  }

  await copyIconIntoBundle(bundlePath);
  await plistSet(plistPath, "CFBundleDisplayName", "string", displayName);
  await plistSet(plistPath, "CFBundleName", "string", displayName);
  await plistSet(plistPath, "CFBundleExecutable", "string", executableName);
  await plistSet(plistPath, "CFBundleIdentifier", "string", bundleIdentifier);
  await plistSet(plistPath, "CFBundleShortVersionString", "string", pkg.version ?? "1.0.0");
  await plistSet(plistPath, "CFBundleVersion", "string", "0");
  await plistSet(plistPath, "CFBundleIconFile", "string", "template-appicon");
  await plistSet(plistPath, "CFBundleIconName", "string", "template-appicon");
  await plistSet(plistPath, "CFBundleURLTypes:0:CFBundleURLName", "string", bundleIdentifier);
  await plistSet(plistPath, "CFBundleURLTypes:0:CFBundleURLSchemes:0", "string", `glaze-${pkg.id}-local`);
  await plistSet(plistPath, "CFBundleURLTypes:0:CFBundleURLSchemes:1", "string", "com.glaze");

  if (activationPolicy === "accessory") {
    await plistSet(plistPath, "LSUIElement", "bool", true);
    await plistDelete(plistPath, "LSBackgroundOnly");
  } else if (activationPolicy === "prohibited") {
    await plistSet(plistPath, "LSBackgroundOnly", "bool", true);
    await plistDelete(plistPath, "LSUIElement");
  } else {
    await plistDelete(plistPath, "LSUIElement");
    await plistDelete(plistPath, "LSBackgroundOnly");
  }

  await plistRebuildDocumentTypes(plistPath, resolveFileAssociations(pkg));
  await runOrThrow("codesign", ["--force", "--deep", "--sign", "-", bundlePath], { cwd: appRoot });
}

export async function repackageBundleLifecycle() {
  const pkg = await getPackageJson();
  await ensureBuildArtifacts();
  await syncRuntimeManifest(pkg);

  const bundlePath = currentBundlePathForPackage(pkg);
  await killAppIfRunning(bundlePath);
  await fs.rm(bundlePath, { recursive: true, force: true });
  await fs.cp(templateShellPath, bundlePath, { recursive: true });

  const glazeRuntimePath = path.join(bundlePath, "Contents", "Resources", "glaze-runtime");
  await fs.rm(glazeRuntimePath, { recursive: true, force: true }).catch(() => {});
  await fs.symlink(path.join(appRoot, ".glaze"), glazeRuntimePath);
  await customizeBundle(bundlePath, pkg);

  return {
    ok: true,
    bundlePath,
    displayName: resolveDisplayName(pkg)
  };
}

export async function updateBundleLifecycle() {
  const pkg = await getPackageJson();
  await syncRuntimeManifest(pkg);
  const bundlePath = await findAppBundle();
  if (!bundlePath) {
    throw new Error("No .app bundle found. Run RepackageBundle first.");
  }

  await killAppIfRunning(bundlePath);
  await customizeBundle(bundlePath, pkg);
  return {
    ok: true,
    bundlePath,
    displayName: resolveDisplayName(pkg),
    activationPolicy: resolveActivationPolicy(pkg),
    fileAssociations: resolveFileAssociations(pkg).length
  };
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
          "No .app bundle was found next to this workspace. Run RepackageBundle after BuildApp to create one."
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
    description: "Update Info.plist metadata for the current packaged app from .glaze-sources/package.json.",
    inputSchema: {}
  },
  async () => {
    try {
      return makeText(await updateBundleLifecycle());
    } catch (error) {
      return makeText({
        ok: false,
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }
);

server.registerTool(
  "RepackageBundle",
  {
    description: "Create or recreate the current app bundle from Glaze's template shell and wire it to the local .glaze runtime.",
    inputSchema: {}
  },
  async () => {
    try {
      return makeText(await repackageBundleLifecycle());
    } catch (error) {
      return makeText({
        ok: false,
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }
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
    description: "Report runtime window readiness for repo-local Glaze apps.",
    inputSchema: {}
  },
  async () => {
    return makeText(await getInspectionStatus());
  }
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
    description: "Capture a preview image of the running Glaze app window when macOS screen capture permissions allow it.",
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
  async (args) => makeText(await capturePreview(args))
);

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}
