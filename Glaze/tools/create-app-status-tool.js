function createAppStatusTool(sourcesDir) {
  return MQ(
    "AppStatus",
    "Check build freshness, launch state, and live inspection readiness for the current Glaze app. Use this after building or launching, or when deciding the next validation step. This tool is cheap and does not launch the app. Tool names are internal; never mention them in user-facing replies.",
    {},
    async () => {
      try {
        const status = await getLiveAppInspectionStatus(sourcesDir);
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                {
                  ok: status.availability === "ready",
                  nextAction: status.availability === "ready" ? "Use a live inspection tool only for a concrete runtime hypothesis." : status.availability === "notBuilt" || status.availability === "buildRequired" ? "Build before inspecting runtime state." : status.availability === "notRunning" ? "Launch before inspecting runtime state." : "Wait briefly, use logs, or launch if the app should be running.",
                  status
                },
                null,
                2
              )
            }
          ]
        };
      } catch (error42) {
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                {
                  ok: false,
                  error: error42 instanceof Error ? error42.message : String(error42),
                  nextAction: "Use logs or build output to resolve the app status issue."
                },
                null,
                2
              )
            }
          ]
        };
      }
    }
  );
}
