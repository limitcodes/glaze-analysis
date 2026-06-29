createGlazeToolsServer() {
        const appId = path41.basename(path41.dirname(this.sourcesDir));
        const sourcesDir = this.sourcesDir;
        const tools = [
          createAppStatusTool(sourcesDir),
          createBuildAppTool(sourcesDir, {
            onSuccessfulBuild: () => this.markSuccessfulAgentBuild(),
            isCancelled: () => this.isCancelled
          }),
          createLaunchAppTool(sourcesDir),
          createUpdateBundleTool(appId),
          createRepackageBundleTool(appId),
          createGlazeTodoWriteTool(),
          createReportMigrationOutcomeTool({
            onReport: (outcome) => {
              this.lastMigrationOutcome = outcome;
            }
          }),
          createGetConversationHistoryTool(this.config.workspaceRoot),
          createLiveAppInspectionStatusTool(sourcesDir),
          createLiveAppSnapshotDOMTool(sourcesDir),
          createLiveAppInspectElementTool(sourcesDir),
          createLiveAppEvaluateTool(sourcesDir),
          createLiveAppCapturePreviewTool(sourcesDir)
        ];
        logger40.info("ai-agent", "Configured Glaze MCP tools", {
          buildFlavor: getCurrentBuildFlavor(),
          toolCount: tools.length
        });
        return DQ({
          name: "Glaze",
          version: "1.0.0",
          tools
        });
      }
