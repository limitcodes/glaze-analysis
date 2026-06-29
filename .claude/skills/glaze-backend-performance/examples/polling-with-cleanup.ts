// Example: Polling setup with proper lifecycle cleanup.
// Demonstrates lightweight poll responses and interval management.
// Applies to: running apps, file watchers, system monitors, task trackers, etc.
// Copy and adapt for your app.

import { app, ipcMain } from "@glaze/core/backend";

// === Polling state ===

let pollInterval: ReturnType<typeof setInterval> | null = null;

// eslint-disable-next-line @typescript-eslint/no-unused-vars -- example function for agents to copy
function startPolling(intervalMs = 2000) {
  stopPolling(); // clear any existing interval first
  pollInterval = setInterval(async () => {
    try {
      const data = await fetchItems();
      // IMPORTANT: Only lightweight metadata — no images, no binary data
      ipcMain.broadcast("data:updated", data);
    } catch (err) {
      console.error("Poll error:", err);
    }
  }, intervalMs);
}

function stopPolling() {
  if (pollInterval) {
    clearInterval(pollInterval);
    pollInterval = null;
  }
}

// CRITICAL: Clean up on shutdown — leaked intervals cause resource exhaustion
app.on("before-quit", () => {
  stopPolling();
});

// === IPC handlers ===

// Lightweight poll endpoint — metadata only
ipcMain.handle("data:list", async () => {
  return fetchItems();
});

// Separate heavy-data endpoint — called once per item, cached in frontend
ipcMain.handle("data:getDetail", async (_event, { id }) => {
  return { detail: await getItemDetail(id) };
});

// === Data fetching (lightweight) ===

interface ItemInfo {
  id: string;
  name: string;
  status: string;
  // Add your domain-specific fields here (e.g., bundleId, filePath, pid)
}

async function fetchItems(): Promise<ItemInfo[]> {
  // Return only metadata — NO images, NO thumbnails, NO file contents
  // Examples:
  //   Running apps → lsappinfo list → { id, name, bundleId, pid }
  //   File watcher → fs.readdir → { id, name, size, modified }
  //   System monitor → top/ps → { id, name, cpu, memory }
  return [];
}

async function getItemDetail(_id: string): Promise<string> {
  // Fetch heavy data for a single item (icon, thumbnail, preview, etc.)
  // See examples/macos-app-icon.ts for a macOS icon implementation
  return "";
}

// === Frontend usage ===
//
// // Poll for lightweight metadata
// const { data: items } = useQuery({
//   queryKey: ["items"],
//   queryFn: () => window.glazeAPI.glaze.ipc.invoke("data:list"),
//   refetchInterval: 2000,
// });
//
// // Fetch details once per item (cached in a ref)
// const detailCache = useRef(new Map<string, string>());
//
// useEffect(() => {
//   items?.forEach(async (item) => {
//     if (!detailCache.current.has(item.id)) {
//       const { detail } = await window.glazeAPI.glaze.ipc.invoke("data:getDetail", {
//         id: item.id,
//       });
//       detailCache.current.set(item.id, detail);
//     }
//   });
// }, [items]);
