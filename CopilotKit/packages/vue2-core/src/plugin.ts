/**
 * Vue 2 Plugin for CopilotKit
 * 
 * This plugin provides CopilotKit functionality for Vue 2 applications.
 * 
 * Usage:
 * ```js
 * import Vue from 'vue'
 * import CopilotKitPlugin from '@turbo-agent/copilotkit-vue2-core'
 * 
 * Vue.use(CopilotKitPlugin, {
 *   runtimeUrl: 'your-runtime-url',
 *   // or publicApiKey: 'your-api-key'
 * })
 * ```
 */

import Vue from 'vue';
import {
  CopilotApiConfig,
  ChatComponentsCache,
  AgentSession,
  AuthState,
  CopilotContextParams,
  COPILOT_CONTEXT_KEY,
  emptyCopilotContext,
} from "./context/copilot-context-vue2";
import { CopilotChatSuggestionConfiguration, DocumentPointer } from "./types";
import {
  COPILOT_CLOUD_CHAT_URL,
  CopilotCloudConfig,
  COPILOT_CLOUD_PUBLIC_API_KEY_HEADER,
  ConfigurationError,
} from "@turbo-agent/copilotkit-shared";
import { FrontendAction } from "./types/frontend-action";
import { CoagentState } from "./types/coagent-state";
import { CopilotRuntimeClient } from "@turbo-agent/copilotkit-runtime-client-gql";

interface CopilotKitPluginOptions {
  publicApiKey?: string;
  runtimeUrl?: string;
  headers?: Record<string, string>;
  showDevConsole?: boolean;
  guardrails_c?: {
    validTopics?: string[];
    invalidTopics?: string[];
  };
  authConfig_c?: {
    SignInComponent: any;
  };
}

// Helper function to create API config
function createCopilotApiConfig(options: {
  chatApiEndpoint?: string;
  headers?: Record<string, string>;
  publicApiKey?: string;
  credentials?: RequestCredentials;
}): CopilotApiConfig {
  return {
    chatApiEndpoint: options.chatApiEndpoint || '/api/copilotkit',
    headers: options.headers || {},
    publicApiKey: options.publicApiKey,
    credentials: options.credentials,
  };
}

class CopilotKitVue2 {
  private options: CopilotKitPluginOptions;
  private context: CopilotContextParams;

  constructor(options: CopilotKitPluginOptions) {
    this.options = options;
    this.context = this.createContext();
  }

  private createContext(): CopilotContextParams {
    const apiConfig = this.createApiConfig();
    
    // Create runtime client for GraphQL communication
    const runtimeClient = new CopilotRuntimeClient({
      url: apiConfig.chatApiEndpoint,
      headers: apiConfig.headers || {},
      publicApiKey: (apiConfig as any).publicApiKey
    });
    
    // Create reactive state holders for Vue2 - use Vue.observable for reactivity
    const coagentStates: Record<string, CoagentState> = Vue.observable({});
    const coagentStatesRef = { current: coagentStates };
    
    const setCoagentStates = (newStates: Record<string, CoagentState> | ((prev: Record<string, CoagentState>) => Record<string, CoagentState>)) => {
      console.log('Plugin: setCoagentStates called with:', newStates);
      
      let updatedStates: Record<string, CoagentState>;
      if (typeof newStates === 'function') {
        updatedStates = newStates(coagentStatesRef.current);
      } else {
        updatedStates = newStates;
      }
      
      // Clear existing states
      Object.keys(coagentStatesRef.current).forEach(key => {
        Vue.delete(coagentStatesRef.current, key);
      });
      
      // Add new states using Vue.set to trigger reactivity
      Object.keys(updatedStates).forEach(key => {
        Vue.set(coagentStatesRef.current, key, updatedStates[key]);
      });
      
      console.log('Plugin: Updated coagentStatesRef.current:', coagentStatesRef.current);
    };
    
    const setCoagentStatesWithRef = (newStates: Record<string, CoagentState> | ((prev: Record<string, CoagentState>) => Record<string, CoagentState>)) => {
      console.log('Plugin: setCoagentStatesWithRef called with:', newStates);
      setCoagentStates(newStates);
    };
    
    return {
      ...emptyCopilotContext,
      copilotApiConfig: apiConfig,
      runtimeClient: runtimeClient,
      showDevConsole: this.options.showDevConsole || false,
      authConfig_c: this.options.authConfig_c,
      actions: {},
      setAction: (id: string, action: FrontendAction<any>) => {
        this.context.actions[id] = action;
      },
      removeAction: (id: string) => {
        delete this.context.actions[id];
      },
      // Add the agent state management
      coagentStates: coagentStatesRef.current,
      setCoagentStates: setCoagentStates,
      coagentStatesRef: coagentStatesRef,
      setCoagentStatesWithRef: setCoagentStatesWithRef,
    };
  }

  private createApiConfig(): CopilotApiConfig {
    if (this.options.publicApiKey) {
      return {
        chatApiEndpoint: COPILOT_CLOUD_CHAT_URL,
        headers: {
          [COPILOT_CLOUD_PUBLIC_API_KEY_HEADER]: this.options.publicApiKey,
          ...this.options.headers,
        },
        publicApiKey: this.options.publicApiKey,
        cloud: {
          guardrails: this.options.guardrails_c ? {
            input: {
              restrictToTopic: {
                enabled: true,
                validTopics: this.options.guardrails_c.validTopics || [],
                invalidTopics: this.options.guardrails_c.invalidTopics || [],
              }
            }
          } : undefined,
          auth: this.options.authConfig_c,
        } as CopilotCloudConfig,
      };
    } else if (this.options.runtimeUrl) {
      return {
        chatApiEndpoint: this.options.runtimeUrl,
        headers: this.options.headers || {},
      };
    } else {
      throw new ConfigurationError(
        "Please provide either a 'runtimeUrl' or a 'publicApiKey' to the CopilotKit plugin."
      );
    }
  }

  getContext(): CopilotContextParams {
    return this.context;
  }
}

const CopilotKitPlugin = {
  install(Vue: any, options: CopilotKitPluginOptions) {
    if (!options) {
      throw new Error('CopilotKit plugin requires options');
    }

    const copilotKit = new CopilotKitVue2(options);

    // Add global property
    Vue.prototype.$copilotKit = copilotKit;

    // Add global mixin to provide context
    Vue.mixin({
      provide() {
        if (this.$options._isCopilotRoot) {
          return {
            [COPILOT_CONTEXT_KEY]: copilotKit.getContext()
          };
        }
        return {};
      }
    });

    // Add a root component marker
    Vue.component('CopilotKitProvider', {
      name: 'CopilotKitProvider',
      _isCopilotRoot: true,
      props: {
        runtimeUrl: String,
        publicApiKey: String,
        chatApiEndpoint: String,
        headers: Object,
        credentials: String,
        showDevConsole: Boolean,
        authConfig_c: Object,
      },
      data() {
        return {
          localContext: null
        };
      },
      provide() {
        // Provide a reactive object that will be updated
        return {
          [COPILOT_CONTEXT_KEY]: () => this.localContext
        };
      },
      methods: {
        createApiConfigFromProps(this: any) {
          return createCopilotApiConfig({
            chatApiEndpoint: this.chatApiEndpoint || this.runtimeUrl,
            headers: this.headers,
            publicApiKey: this.publicApiKey,
            credentials: this.credentials
          });
        }
      },
      created(this: any) {
        // Create context with props if provided, otherwise use global context
        if (this.runtimeUrl || this.publicApiKey) {
          try {
            const apiConfig = this.createApiConfigFromProps();
            // Create runtime client for GraphQL communication
            const runtimeClient = new CopilotRuntimeClient({
              url: apiConfig.chatApiEndpoint,
              headers: apiConfig.headers || {},
              publicApiKey: (apiConfig as any).publicApiKey
            });
            this.localContext = {
              ...copilotKit.getContext(),
              copilotApiConfig: apiConfig,
              runtimeClient: runtimeClient,
              showDevConsole: this.showDevConsole || false,
              authConfig_c: this.authConfig_c,
            };
          } catch (error) {
            console.error('CopilotKitProvider: Failed to create context:', error);
            this.localContext = copilotKit.getContext();
          }
        } else {
          this.localContext = copilotKit.getContext();
        }
      },
      render() {
        return this.$slots.default;
      }
    });
  }
};

// Composable function for Vue 2 (similar to hooks)
export function useCopilotContext() {
  // This would need to be implemented differently in each component
  // since Vue 2 doesn't have the Composition API by default
  throw new Error(
    'useCopilotContext must be used within a component with CopilotKit context. ' +
    'Use this.$copilotKit to access the context instead.'
  );
}

export function useCopilotAction(action: FrontendAction<any>) {
  // This would be implemented as a mixin or within component methods
  throw new Error(
    'useCopilotAction should be used as a mixin or implemented in component methods. ' +
    'Use this.$copilotKit.getContext().setAction() instead.'
  );
}

export default CopilotKitPlugin;
export { CopilotKitPlugin };
export * from "./types";
export * from "./context/copilot-context-vue2";
export * from "./hooks/use-coagent";
export * from "./mixins/chat-mixin";
