// Example: Extract macOS app icon using NSWorkspace via JXA
// Works for ALL icon formats: .icns, asset catalog (.car), and apps with no explicit icon.
// Copy and adapt for your app.

import { execFile } from "child_process";
import { promisify } from "util";

const execFileAsync = promisify(execFile);

/**
 * Extract a macOS app icon as a base64-encoded PNG.
 *
 * Uses NSWorkspace.iconForFile() via JXA, which handles:
 * - Traditional .icns files (CFBundleIconFile)
 * - Asset catalog icons (CFBundleIconName) — Calendar, Maps, etc.
 * - Default app icons when no icon is configured
 *
 * @param appPath - Absolute path to the .app bundle (e.g., "/Applications/Calendar.app")
 * @param size - Icon size in logical pixels (default 64). Larger = more bytes.
 *   Note: setSize only changes the logical size. The bitmap may still contain
 *   high-DPI representations, making the base64 output larger than expected.
 *   If icons are still too large, draw into NSBitmapImageRep at exact pixel
 *   dimensions, or write to disk and serve via protocol handler.
 * @returns Base64-encoded PNG string, or empty string on failure
 */
export async function getAppIcon(appPath: string, size = 64): Promise<string> {
  const script = `
    ObjC.import('AppKit');
    ObjC.import('Foundation');
    const ws = $.NSWorkspace.sharedWorkspace;
    const icon = ws.iconForFile(${JSON.stringify(appPath)});
    icon.setSize({ width: ${size}, height: ${size} });
    const tiff = icon.TIFFRepresentation;
    const bitmap = $.NSBitmapImageRep.imageRepWithData(tiff);
    const png = bitmap.representationUsingTypeProperties($.NSBitmapImageFileTypePNG, $());
    png.base64EncodedStringWithOptions(0).js;
  `;

  try {
    const { stdout } = await execFileAsync("/usr/bin/osascript", ["-l", "JavaScript", "-e", script], {
      maxBuffer: 10 * 1024 * 1024, // 10 MB — base64 PNG can be large
      timeout: 10_000, // 10s — icon extraction is usually fast
    });
    return stdout.trim();
  } catch (error) {
    console.error(`Failed to extract icon for ${appPath}:`, error);
    return "";
  }
}

// === Usage in an IPC handler ===
//
// import { ipcMain } from "@glaze/core/backend";
//
// // Cache icons in memory — they rarely change
// const iconCache = new Map<string, string>();
//
// ipcMain.handle("apps:getIcon", async (_event, { appPath }) => {
//   let icon = iconCache.get(appPath);
//   if (!icon) {
//     icon = await getAppIcon(appPath);
//     if (icon) iconCache.set(appPath, icon);
//   }
//   return { icon };
// });
//
// IMPORTANT: Do NOT include icon data in polling responses.
// The frontend should call apps:getIcon once per app and cache the result.
