/**
 * CopilotKit component for Vue 2
 * 
 * This component provides CopilotKit functionality as a Vue component with props support.
 * It acts as a wrapper around the CopilotKitProvider component registered by the plugin.
 */

import { CopilotKitProps } from "./copilotkit-props";
import { CopilotContextParams, COPILOT_CONTEXT_KEY, emptyCopilotContext, CopilotApiConfig } from "../../context/copilot-context-vue2";
import { 
  COPILOT_CLOUD_CHAT_URL,
  COPILOT_CLOUD_PUBLIC_API_KEY_HEADER,
  ConfigurationError,
  CopilotCloudConfig
} from "@turbo-agent/copilotkit-shared";

// Default categories for context
export const defaultCopilotContextCategories = ["global"];

// Helper function to create API config from props
function createApiConfigFromProps(props: any): CopilotApiConfig {
  if (props.publicApiKey) {
    return {
      chatApiEndpoint: COPILOT_CLOUD_CHAT_URL,
      headers: {
        [COPILOT_CLOUD_PUBLIC_API_KEY_HEADER]: props.publicApiKey,
        ...props.headers,
      },
      publicApiKey: props.publicApiKey,
      cloud: {
        guardrails: props.guardrails_c ? {
          input: {
            restrictToTopic: {
              enabled: true,
              validTopics: props.guardrails_c.validTopics || [],
              invalidTopics: props.guardrails_c.invalidTopics || [],
            }
          }
        } : undefined,
        auth: props.authConfig_c,
      } as CopilotCloudConfig,
    };
  } else if (props.runtimeUrl) {
    return {
      chatApiEndpoint: props.runtimeUrl,
      headers: props.headers || {},
    };
  } else {
    throw new ConfigurationError(
      "Please provide either a 'runtimeUrl' or a 'publicApiKey' to the CopilotKit component."
    );
  }
}

// Helper function to create context from props
function createContextFromProps(props: any): CopilotContextParams {
  const apiConfig = createApiConfigFromProps(props);
  
  return {
    ...emptyCopilotContext,
    copilotApiConfig: apiConfig,
    showDevConsole: props.showDevConsole || false,
    authConfig_c: props.authConfig_c,
    actions: {},
    setAction: (id: string, action: any) => {
      // This will be handled by the context instance
    },
    removeAction: (id: string) => {
      // This will be handled by the context instance
    },
  };
}

// CopilotKit Vue component definition
export const CopilotKit = {
  name: 'CopilotKit',
  props: {
    // Core configuration
    runtimeUrl: {
      type: String,
      default: undefined
    },
    publicApiKey: {
      type: String,
      default: undefined
    },
    headers: {
      type: Object,
      default: () => ({})
    },
    
    // UI configuration
    showDevConsole: {
      type: Boolean,
      default: false
    },
    
    // Properties
    properties: {
      type: Object,
      default: () => ({})
    },
    
    // Cloud features
    guardrails_c: {
      type: Object,
      default: undefined
    },
    authConfig_c: {
      type: Object,
      default: undefined
    },
    
    // Thread management
    threadId: {
      type: String,
      default: undefined
    },
    
    // Agent lock
    agentLock: {
      type: Array,
      default: () => []
    },
    
    // Extensions
    extensions: {
      type: Object,
      default: () => ({})
    },
    
    // Error handling
    onError: {
      type: Function,
      default: undefined
    }
  },
  
  data() {
    return {
      copilotContext: null as CopilotContextParams | null
    };
  },
  
  created(this: any) {
    // Create context from props when component is created
    try {
      this.copilotContext = createContextFromProps(this.$props);
    } catch (error) {
      console.error('CopilotKit: Failed to create context:', error);
      this.copilotContext = null;
    }
  },
  
  provide(this: any) {
    // Provide the context to child components
    return {
      [COPILOT_CONTEXT_KEY]: this.copilotContext
    };
  },
  
  watch: {
    // Watch for prop changes and recreate context
    '$props': {
      handler(this: any) {
        try {
          this.copilotContext = createContextFromProps(this.$props);
        } catch (error) {
          console.error('CopilotKit: Failed to update context:', error);
          this.copilotContext = null;
        }
      },
      deep: true
    }
  },
  
  render(this: any, h: any) {
    // Render children with context
    return h('div', {
      class: 'copilotkit-provider'
    }, this.$slots.default);
  }
};
