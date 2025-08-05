export * from "./components";
export * from "./context";
export * from "./hooks/index-vue2";
export * from "./hooks/use-coagent"; // Explicitly export useCoAgent
export * from "./types";
export * from "./lib";
export * from "./utils";
export * from "./mixins/chat-mixin";

// Export plugin specifically
export { default as CopilotKitPlugin, CopilotKitPlugin as CopilotKitVue2Plugin } from "./plugin";

// Export the main plugin as default
export { default } from "./plugin";
