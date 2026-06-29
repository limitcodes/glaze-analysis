function createUpdateBundleTool(appId) {
  return MQ(
    "UpdateBundle",
    "Update the current app's bundle metadata from package.json. Call this after modifying appConfig.fileAssociations or appConfig.macOS.activationPolicy and running BuildApp. This will close the app, update Info.plist, re-sign the bundle, and restart the app. No parameters needed - it automatically uses the current app.",
    {},
    async () => {
      try {
        logger34.info("ai-agent", `update_bundle tool called for appId: ${appId}`);
        const result = await appHandlers.updateBundle({ appId });
        if (result.success) {
          return {
            content: [
              {
                type: "text",
                text: "Bundle updated successfully. The app has been restarted with the new bundle metadata."
              }
            ]
          };
        } else {
          return {
            content: [{ type: "text", text: `Failed to update bundle: ${result.error || "Unknown error"}` }]
          };
        }
      } catch (error42) {
        return {
          content: [
            {
              type: "text",
              text: `Error updating bundle: ${error42 instanceof Error ? error42.message : String(error42)}`
            }
          ]
        };
      }
    }
  );
}
