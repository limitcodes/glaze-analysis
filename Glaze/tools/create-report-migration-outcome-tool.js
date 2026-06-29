function createReportMigrationOutcomeTool(options) {
  return MQ(
    "ReportMigrationOutcome",
    'Report the outcome of the current migration step. Call this exactly once, at the end of a migration turn. Use status "completed" when you applied the source changes, "not_applicable" when the migration genuinely does not apply to this app (the only affected code is intentionally exempt from it), or "blocked" when you could not complete it. Always give a specific reason naming the relevant code. Reserve "not_applicable" for cases where there is genuinely nothing to change \u2014 never use it to skip work you simply did not do. Tool names are internal; never mention them in user-facing replies.',
    {
      status: external_exports.enum(["completed", "not_applicable", "blocked"]).describe("Outcome of this migration step"),
      reason: external_exports.string().min(1).describe("Specific justification for the status \u2014 which component/file, and why it warrants this status")
    },
    async (args) => {
      const outcome = { status: args.status, reason: args.reason };
      options.onReport(outcome);
      logger37.info("ai-agent", "ReportMigrationOutcome called", { status: outcome.status });
      return { content: [{ type: "text", text: `Recorded migration outcome: ${outcome.status}` }] };
    }
  );
}
