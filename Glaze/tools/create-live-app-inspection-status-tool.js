function createLiveAppInspectionStatusTool(sourcesDir) {
  return MQ(
    "LiveAppInspectionStatus",
    "Runtime readiness check for live inspection on an already-built, already-running Glaze app. This tool may attach to the running app non-launchingly to verify readiness, but it will not launch the app. Use this once before any other live inspection tool.",
    {},
    async () => {
      try {
        const status = await getLiveAppInspectionStatus(sourcesDir);
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(status, null, 2)
            }
          ]
        };
      } catch (error42) {
        return {
          content: [
            {
              type: "text",
              text: `Error resolving live app inspection status: ${error42 instanceof Error ? error42.message : String(error42)}`
            }
          ]
        };
      }
    }
  );
}
