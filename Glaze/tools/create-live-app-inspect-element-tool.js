function createLiveAppInspectElementTool(sourcesDir) {
  return MQ(
    "LiveAppInspectElement",
    "Inspect a specific DOM element in an already-built, already-running Glaze app and return a structured JSON description, including bounds, attributes, styles, and an HTML snippet. selector is required. Use LiveAppInspectionStatus first, and only call this when availability is ready.",
    {
      selector: external_exports.string().describe("CSS selector for the element to inspect"),
      windowId: external_exports.string().optional().describe("Optional Glaze windowId from LiveAppInspectionStatus")
    },
    async (args) => {
      try {
        const inspection = await inspectLiveAppElement(sourcesDir, args);
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(inspection, null, 2)
            }
          ]
        };
      } catch (error42) {
        return {
          content: [
            {
              type: "text",
              text: `Error inspecting live app element: ${error42 instanceof Error ? error42.message : String(error42)}`
            }
          ]
        };
      }
    }
  );
}
