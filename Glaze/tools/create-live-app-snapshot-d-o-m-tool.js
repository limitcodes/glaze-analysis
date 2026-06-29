function createLiveAppSnapshotDOMTool(sourcesDir) {
  return MQ(
    "LiveAppSnapshotDOM",
    "Capture a structured JSON snapshot of the DOM for an already-built, already-running Glaze app. This tool will not launch the app for you. Use LiveAppInspectionStatus first, and only call this when availability is ready. Prefer this over screenshots for runtime/UI validation, especially text, title, label, state, and component presence checks. Returns structure, text, roles, and visibility per node by default; computed styles and layout rects are opt-in (includeStyles / includeLayout) for visual or layout debugging only \u2014 leave them off for text/state/presence checks.",
    {
      selector: external_exports.string().optional().describe("Optional CSS selector for the root element to snapshot"),
      windowId: external_exports.string().optional().describe("Optional Glaze windowId from LiveAppInspectionStatus"),
      maxDepth: external_exports.number().int().min(0).max(6).optional().describe("Maximum DOM depth to include"),
      includeStyles: external_exports.boolean().optional().describe(
        "Include computed styles (display, color, font, \u2026) per node. Default false \u2014 enable only for visual/style debugging."
      ),
      includeLayout: external_exports.boolean().optional().describe(
        "Include bounding-rect coordinates per node. Default false \u2014 enable only for layout/overlap debugging."
      )
    },
    async (args) => {
      try {
        const snapshot = await getLiveAppDomSnapshot(sourcesDir, args);
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(snapshot)
            }
          ]
        };
      } catch (error42) {
        return {
          content: [
            {
              type: "text",
              text: `Error capturing live app DOM snapshot: ${error42 instanceof Error ? error42.message : String(error42)}`
            }
          ]
        };
      }
    }
  );
}
