function createGetConversationHistoryTool(projectPath) {
  return MQ(
    "GetConversationHistory",
    "Retrieve earlier messages from THIS app's conversation history (from the Glaze database). Use it to re-ground when you need to recall what the user asked or what you previously did but the current session no longer contains those turns (e.g. after a context reset). Returns the recent user and assistant message text (thinking and attachments stripped); set tool_calls to also include the tool calls you made. Tool names are internal; never mention them in user-facing replies.",
    {
      limit: external_exports.number().int().min(1).max(50).optional().describe("How many of the most recent messages to retrieve. Default 10, max 50."),
      include: external_exports.enum(["user", "both"]).optional().describe(
        "'both' = your previous assistant responses and the user's messages (default \u2014 needed to recover what a follow-up is responding to); 'user' = only the user's messages."
      ),
      tool_calls: external_exports.boolean().optional().describe(
        "When true, also include the tool calls you previously made (tool name + arguments), interleaved with messages in time order. Counts toward 'limit'. Default false."
      )
    },
    async (args) => {
      const limit = args.limit ?? 10;
      const includeAssistant = (args.include ?? "both") !== "user";
      const includeToolCalls = args.tool_calls === true;
      try {
        const recalled = await getRecentMessagesForRecall(projectPath, { limit, includeAssistant, includeToolCalls });
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                {
                  ok: true,
                  count: recalled.length,
                  ...recalled.length === 0 ? { note: "No earlier messages found for this app." } : {},
                  // Oldest first. Order conveys recency, so no timestamps.
                  messages: recalled.map(
                    (m) => m.role === "tool" ? { role: "tool", tool: m.toolName, arguments: m.toolArguments } : { role: m.role, text: m.text }
                  )
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
                { ok: false, error: error42 instanceof Error ? error42.message : String(error42) },
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
