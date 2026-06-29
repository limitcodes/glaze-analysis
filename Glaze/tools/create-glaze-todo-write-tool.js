function createGlazeTodoWriteTool() {
  return MQ(
    "GlazeTodoWrite",
    "Create and update a task list displayed in a persistent header UI. Do NOT announce the task list in your message text (e.g., never write 'Here\\'s my to-do list' or similar) \u2014 just call this tool directly and continue working. The UI automatically renders the task list in a fixed header above the chat. IMPORTANT: Call this tool to update task statuses as you work. When you finish ALL tasks, you MUST call this tool one final time with all tasks marked as 'completed' status. This ensures the UI properly shows completion.",
    {
      todos: external_exports.array(
        external_exports.object({
          content: external_exports.string().describe("Task description"),
          status: external_exports.enum(["pending", "in_progress", "completed"]).describe("Task status"),
          activeForm: external_exports.string().optional().describe("Active form of task description (e.g., 'Building feature X')")
        })
      ).describe("Array of todo items"),
      title: external_exports.string().optional().describe("Optional header title for the task list (e.g., 'Build first version of app')")
    },
    async (args) => {
      const { todos, title } = args;
      const stats = {
        total: todos.length,
        pending: todos.filter((t) => t.status === "pending").length,
        in_progress: todos.filter((t) => t.status === "in_progress").length,
        completed: todos.filter((t) => t.status === "completed").length
      };
      const statusText = title ? `${title}: ${stats.completed}/${stats.total} tasks completed` : `${stats.completed}/${stats.total} tasks completed`;
      logger36.info("ai-agent", "GlazeTodoWrite called", {
        title: title || "(no title)",
        total: stats.total,
        completed: stats.completed
      });
      return { content: [{ type: "text", text: statusText }] };
    }
  );
}
