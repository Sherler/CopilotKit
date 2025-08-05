/**
 * Vue2 Hooks Placeholder
 * 
 * In Vue2, these would be implemented as mixins or instance methods
 * rather than composition functions
 */

// Placeholder for Vue2 hooks
export function useCopilotAction() {
  throw new Error("useCopilotAction should be implemented as Vue2 mixin or instance method");
}

export function useCopilotChat() {
  throw new Error("useCopilotChat should be implemented as Vue2 mixin or instance method");
}

export function useCopilotReadable() {
  throw new Error("useCopilotReadable should be implemented as Vue2 mixin or instance method");
}

// Export CoAgent state render hook
export { useCoAgentStateRender } from "./use-coagent-state-render";

// Export useCoAgent for Vue2
export * from "./use-coagent";

// Re-export original hooks for backward compatibility (they will need to be adapted for Vue2)
export * from "./use-tree";
