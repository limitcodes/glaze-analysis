function createLaunchAppTool(sourcesDir) {
  return MQ(
    "LaunchApp",
    "Launch the current Glaze app and wait briefly for live inspection readiness. Use this after a successful build when app status reports the app is not running or no inspection session is available. Tool names are internal; never mention them in user-facing replies.",
    {},
    async () => {
      const appId = resolveAppId(sourcesDir);
      try {
        logger39.info("ai-agent", "LaunchApp tool called", { appId, sourcesDir });
        const preflightStatus = await getLiveAppInspectionStatus(sourcesDir).catch((error42) => ({
          availability: "sessionUnavailable",
          reason: error42 instanceof Error ? error42.message : String(error42)
        }));
        if (preflightStatus.availability === "notBuilt" || preflightStatus.availability === "buildRequired") {
          return {
            content: [
              {
                type: "text",
                text: JSON.stringify(
                  {
                    ok: false,
                    nextAction: "Build before launching for live inspection.",
                    status: preflightStatus
                  },
                  null,
                  2
                )
              }
            ]
          };
        }
        await appHandlers.openApp(appId, { activate: false });
        try {
          const status = await waitForLiveAppInspectionReady(sourcesDir, {
            attempts: 15,
            delayMs: 1e3
          });
          return {
            content: [
              {
                type: "text",
                text: JSON.stringify(
                  {
                    ok: true,
                    launched: true,
                    inspectionReady: true,
                    nextAction: "`inspectionReady` below reports readiness \u2014 inspect a concrete runtime hypothesis directly if needed. Don't call AppStatus separately.",
                    status
                  },
                  null,
                  2
                )
              }
            ]
          };
        } catch (inspectionError) {
          const status = await getLiveAppInspectionStatus(sourcesDir).catch((statusError) => ({
            availability: "sessionUnavailable",
            reason: statusError instanceof Error ? statusError.message : String(statusError)
          }));
          return {
            content: [
              {
                type: "text",
                text: JSON.stringify(
                  {
                    ok: true,
                    launched: true,
                    inspectionReady: false,
                    error: inspectionError instanceof Error ? inspectionError.message : String(inspectionError),
                    nextAction: "The app was launched, but live inspection is not ready. Use app status and logs to diagnose host/runtime inspection readiness before using DOM or screenshot tools.",
                    status
                  },
                  null,
                  2
                )
              }
            ]
          };
        }
      } catch (error42) {
        const status = await getLiveAppInspectionStatus(sourcesDir).catch((statusError) => ({
          availability: "sessionUnavailable",
          reason: statusError instanceof Error ? statusError.message : String(statusError)
        }));
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                {
                  ok: false,
                  launched: false,
                  inspectionReady: false,
                  error: error42 instanceof Error ? error42.message : String(error42),
                  nextAction: "The app could not be launched. Use the returned status and app logs to fix launch issues before inspecting runtime UI.",
                  status
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
