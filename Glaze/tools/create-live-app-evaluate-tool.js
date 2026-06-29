function createLiveAppEvaluateTool(sourcesDir) {
  return MQ(
    "LiveAppEvaluate",
    "Run a JavaScript snippet inside an already-built, already-running Glaze app page as an escape hatch when the structured live inspection tools are insufficient. Use LiveAppInspectionStatus first, and only call this when availability is ready. Prefer the structured DOM tools before using this.",
    {
      script: external_exports.string().describe("JavaScript to evaluate in the running app page. Prefer a self-contained expression or IIFE."),
      windowId: external_exports.string().optional().describe("Optional Glaze windowId from LiveAppInspectionStatus")
    },
    async (args) => {
      try {
        const result = await evaluateLiveAppScript(sourcesDir, args);
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(result, null, 2)
            }
          ]
        };
      } catch (error42) {
        return {
          content: [
            {
              type: "text",
              text: `Error evaluating live app script: ${error42 instanceof Error ? error42.message : String(error42)}`
            }
          ]
        };
      }
    }
  );
}
