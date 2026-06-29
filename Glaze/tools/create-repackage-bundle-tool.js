function createRepackageBundleTool(appId) {
  return MQ(
    "RepackageBundle",
    "Repackage the current app's bundle using the latest host template. This is essential for upgrades - it closes the app, deletes the old bundle, creates a fresh bundle from the latest template-app-shell.app, customizes it with the app's metadata (displayName, icon, etc.), and re-creates the glaze-runtime symlink. Call this after updating SDK dependencies and building the app to ensure the native shell is up to date. No parameters needed - it automatically uses the current app.",
    {},
    async () => {
      try {
        logger35.info("ai-agent", `repackage_bundle tool called for appId: ${appId}`);
        const result = await appHandlers.repackageApp({ appId });
        if (result.success) {
          return {
            content: [
              {
                type: "text",
                text: `Bundle repackaged successfully. The app bundle has been recreated from the latest template at: ${result.bundlePath}`
              }
            ]
          };
        } else {
          return {
            content: [
              { type: "text", text: `Failed to repackage bundle: ${result.error || "Unknown error"}` }
            ]
          };
        }
      } catch (error42) {
        return {
          content: [
            {
              type: "text",
              text: `Error repackaging bundle: ${error42 instanceof Error ? error42.message : String(error42)}`
            }
          ]
        };
      }
    }
  );
}
