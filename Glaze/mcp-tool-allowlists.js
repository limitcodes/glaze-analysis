// main/ai-agent/mcp-tool-allowlists.ts
function getAllowedMcpTools() {
  return [...GLAZE_MCP_ALLOWED_TOOLS, ...LIVE_APP_INSPECTION_MCP_ALLOWED_TOOLS];
}
var GLAZE_MCP_ALLOWED_TOOLS, LIVE_APP_INSPECTION_MCP_ALLOWED_TOOLS, LIVE_APP_RUNTIME_MCP_TOOL_SET;
var init_mcp_tool_allowlists = __esm({
  "main/ai-agent/mcp-tool-allowlists.ts"() {
    "use strict";
    GLAZE_MCP_ALLOWED_TOOLS = [
      "mcp__Glaze__AppStatus",
      "mcp__Glaze__BuildApp",
      "mcp__Glaze__LaunchApp",
      "mcp__Glaze__UpdateBundle",
      "mcp__Glaze__RepackageBundle",
      "mcp__Glaze__GlazeTodoWrite",
      "mcp__Glaze__GetConversationHistory",
      "mcp__Glaze__ReportMigrationOutcome"
    ];
    LIVE_APP_INSPECTION_MCP_ALLOWED_TOOLS = [
      "mcp__Glaze__LiveAppInspectionStatus",
      "mcp__Glaze__LiveAppSnapshotDOM",
      "mcp__Glaze__LiveAppInspectElement",
      "mcp__Glaze__LiveAppEvaluate",
      "mcp__Glaze__LiveAppCapturePreview"
    ];
    LIVE_APP_RUNTIME_MCP_TOOL_SET = new Set(
      LIVE_APP_INSPECTION_MCP_ALLOWED_TOOLS.filter((toolName) => toolName !== "mcp__Glaze__LiveAppInspectionStatus")
    );
  }
});
