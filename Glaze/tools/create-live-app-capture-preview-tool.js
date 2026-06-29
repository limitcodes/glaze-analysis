function createLiveAppCapturePreviewTool(sourcesDir) {
  return MQ(
    "LiveAppCapturePreview",
    "Capture a PNG screenshot from an already-built, already-running Glaze app and save it to a temporary file. This is expensive and should be a last resort. Use only for clear visual investigations that DOM cannot validate well: overlap, clipping, spacing, visual regressions, colors/materials, canvas/3D/media output, or when the user explicitly asks for a screenshot/preview. Do not use this merely to confirm simple text presence, title/label changes, or straightforward component toggles. Use LiveAppInspectionStatus first, and only call this when availability is ready.",
    {
      windowId: external_exports.string().optional().describe("Optional Glaze windowId from LiveAppInspectionStatus"),
      rect: external_exports.object({
        x: external_exports.number(),
        y: external_exports.number(),
        width: external_exports.number(),
        height: external_exports.number()
      }).optional().describe("Optional rectangle to capture instead of the full visible page")
    },
    async (args) => {
      try {
        const capture = await captureLiveAppPreview(sourcesDir, args);
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(capture, null, 2)
            }
          ]
        };
      } catch (error42) {
        return {
          content: [
            {
              type: "text",
              text: `Error capturing live app preview: ${error42 instanceof Error ? error42.message : String(error42)}`
            }
          ]
        };
      }
    }
  );
}
