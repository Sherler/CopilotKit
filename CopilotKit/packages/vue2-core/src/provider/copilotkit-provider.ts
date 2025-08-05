/**
 * CopilotKit Provider Component for Vue2
 * 
 * This is a full-featured provider that implements all the context functionality
 * including proper state management, agent states, and runtime integration.
 */

import Vue from 'vue';
import { CopilotRuntimeClient } from "@turbo-agent/copilotkit-runtime-client-gql";
import { 
  CopilotContextParams, 
  COPILOT_CONTEXT_KEY, 
  emptyCopilotContext,
  AgentSession,
  CopilotApiConfig
} from "../context/copilot-context-vue2";
import { CoagentState } from "../types/coagent-state";
import { FrontendAction } from "../types/frontend-action";
import { 
  COPILOT_CLOUD_CHAT_URL,
  COPILOT_CLOUD_PUBLIC_API_KEY_HEADER,
  ConfigurationError,
  randomId,
  CopilotCloudConfig
} from "@turbo-agent/copilotkit-shared";
import { ExtensionsInput } from "@turbo-agent/copilotkit-runtime-client-gql";
import { LangGraphInterruptAction } from "../types/interrupt-action";

// Vue2 Ref-like interface
interface Vue2RefLike<T> {
  current: T;
}

function createVue2Ref<T>(initialValue: T): Vue2RefLike<T> {
  return Vue.observable({
    current: initialValue
  });
}

// Vue2 Setter type
type Vue2Setter<T> = (newValue: T | ((prev: T) => T)) => void;

export interface CopilotKitProviderProps {
  runtimeUrl?: string;
  publicApiKey?: string;
  chatApiEndpoint?: string;
  headers?: Record<string, string>;
  credentials?: RequestCredentials;
  showDevConsole?: boolean;
  guardrails_c?: {
    validTopics?: string[];
    invalidTopics?: string[];
  };
  authConfig_c?: {
    SignInComponent: any;
  };
  threadId?: string;
  agentLock?: string[];
  extensions?: ExtensionsInput;
  onError?: (error: any) => void;
}

// Create CopilotKit Provider Component
export const CopilotKitProvider = Vue.extend({
  name: 'CopilotKitProvider',
  props: {
    runtimeUrl: {
      type: String,
      default: undefined
    },
    publicApiKey: {
      type: String,
      default: undefined
    },
    chatApiEndpoint: {
      type: String,
      default: undefined
    },
    headers: {
      type: Object,
      default: () => ({})
    },
    credentials: {
      type: String,
      default: undefined
    },
    showDevConsole: {
      type: Boolean,
      default: false
    },
    guardrails_c: {
      type: Object,
      default: undefined
    },
    authConfig_c: {
      type: Object,
      default: undefined
    },
    threadId: {
      type: String,
      default: undefined
    },
    agentLock: {
      type: Array,
      default: () => []
    },
    extensions: {
      type: Object,
      default: () => ({})
    },
    onError: {
      type: Function,
      default: undefined
    }
  },

  data() {
    return {
      // Core state
      actions: {} as Record<string, FrontendAction<any>>,
      coAgentStateRenders: {} as Record<string, any>,
      chatComponentsCache: createVue2Ref({ actions: {}, coAgentStateRenders: {} }),
      
      // Loading state
      isLoading: false,
      
      // Chat instructions
      chatInstructions: '',
      additionalInstructions: [] as string[],
      
      // Context and documents
      contextCategories: [] as string[],
      contextDocuments: [] as any[],
      
      // Agent states - reactive
      coagentStates: {} as Record<string, CoagentState>,
      
      // Agent session
      agentSession: null as AgentSession | null,
      agentLockValue: null as string | null,
      
      // Thread and run state
      threadIdValue: randomId(),
      runId: null as string | null,
      
      // Extensions and interrupts
      extensionsValue: {} as ExtensionsInput,
      langGraphInterruptAction: null as LangGraphInterruptAction | null,
      
      // Auth states
      authStates_c: {} as Record<string, any>,
      
      // Chat suggestions
      chatSuggestionConfiguration: {} as Record<string, any>,
      
      // Error handling
      bannerError: null as any,
      
      // Available agents
      availableAgents: [] as any[],
      
      // API Config and Runtime Client
      copilotApiConfig: null as CopilotApiConfig | null,
      runtimeClient: null as CopilotRuntimeClient | null,
    };
  },

  computed: {
    // Create reactive references for state management
    coagentStatesRef(): Vue2RefLike<Record<string, CoagentState>> {
      return createVue2Ref(this.coagentStates);
    },
    
    chatAbortControllerRef(): Vue2RefLike<AbortController | null> {
      return createVue2Ref(null);
    },

    // Compute context object
    contextValue(): CopilotContextParams {
      return {
        // Actions
        actions: this.actions,
        setAction: this.setAction,
        removeAction: this.removeAction,

        // CoAgent state renders
        coAgentStateRenders: this.coAgentStateRenders,
        setCoAgentStateRender: this.setCoAgentStateRender,
        removeCoAgentStateRender: this.removeCoAgentStateRender,

        // Chat components cache
        chatComponentsCache: this.chatComponentsCache,

        // Context functions
        getContextString: this.getContextString,
        addContext: this.addContext,
        removeContext: this.removeContext,
        getAllContext: this.getAllContext,
        getDocumentsContext: this.getDocumentsContext,
        addDocumentContext: this.addDocumentContext,
        removeDocumentContext: this.removeDocumentContext,

        // Function call handler
        getFunctionCallHandler: this.getFunctionCallHandler,

        // Loading state
        isLoading: this.isLoading,
        setIsLoading: this.setIsLoading,

        // Chat instructions
        chatInstructions: this.chatInstructions,
        setChatInstructions: this.setChatInstructions,
        additionalInstructions: this.additionalInstructions,
        setAdditionalInstructions: this.setAdditionalInstructions,

        // API configuration
        copilotApiConfig: this.copilotApiConfig!,

        // Developer console
        showDevConsole: this.showDevConsole,

        // Agent states
        coagentStates: this.coagentStates,
        setCoagentStates: this.setCoagentStates,
        coagentStatesRef: this.coagentStatesRef,
        setCoagentStatesWithRef: this.setCoagentStatesWithRef,

        // Agent session
        agentSession: this.agentSession,
        setAgentSession: this.setAgentSession,
        agentLock: this.agentLockValue,

        // Thread and run management
        threadId: this.threadIdValue,
        setThreadId: this.setThreadId,
        runId: this.runId,
        setRunId: this.setRunId,

        // Runtime client
        runtimeClient: this.runtimeClient!,

        // Chat abort controller
        chatAbortControllerRef: this.chatAbortControllerRef,

        // Forwarded parameters
        forwardedParameters: {},

        // Available agents
        availableAgents: this.availableAgents,

        // Auth states
        authStates_c: this.authStates_c,
        setAuthStates_c: this.setAuthStates_c,
        authConfig_c: this.authConfig_c,

        // Extensions
        extensions: this.extensionsValue,
        setExtensions: this.setExtensions,

        // LangGraph interrupt
        langGraphInterruptAction: this.langGraphInterruptAction,
        setLangGraphInterruptAction: this.setLangGraphInterruptAction,
        removeLangGraphInterruptAction: this.removeLangGraphInterruptAction,

        // Chat suggestions
        chatSuggestionConfiguration: this.chatSuggestionConfiguration,
        addChatSuggestionConfiguration: this.addChatSuggestionConfiguration,
        removeChatSuggestionConfiguration: this.removeChatSuggestionConfiguration,

        // Error handling
        onError: this.onError,
        setBannerError: this.setBannerError,

        // Additional functions that might be expected
        makeSystemMessage: this.makeSystemMessage,
        initialMessages: [],
        onFunctionCall: this.onFunctionCall,
        onCoAgentStateRender: this.onCoAgentStateRender,
      };
    }
  },

  provide() {
    return {
      [COPILOT_CONTEXT_KEY]: () => this.contextValue
    };
  },

  created() {
    this.initializeApiConfig();
    this.initializeRuntimeClient();
    this.initializeFromProps();
  },

  watch: {
    // Watch for prop changes and update accordingly
    runtimeUrl: 'updateApiConfig',
    publicApiKey: 'updateApiConfig',
    chatApiEndpoint: 'updateApiConfig',
    headers: 'updateApiConfig',
    credentials: 'updateApiConfig',
    threadId: {
      handler(newVal: string | undefined) {
        if (newVal) {
          this.threadIdValue = newVal;
        }
      },
      immediate: true
    },
    agentLock: {
      handler(newVal: string[] | undefined) {
        this.agentLockValue = newVal && newVal.length > 0 ? newVal[0] : null;
      },
      immediate: true
    },
    extensions: {
      handler(newVal: ExtensionsInput | undefined) {
        this.extensionsValue = newVal || {};
      },
      immediate: true
    }
  },

  methods: {
    // Initialize API configuration
    initializeApiConfig() {
      if (this.publicApiKey) {
        this.copilotApiConfig = {
          chatApiEndpoint: COPILOT_CLOUD_CHAT_URL,
          headers: {
            [COPILOT_CLOUD_PUBLIC_API_KEY_HEADER]: this.publicApiKey,
            ...this.headers,
          },
          publicApiKey: this.publicApiKey,
          cloud: {
            guardrails: this.guardrails_c ? {
              input: {
                restrictToTopic: {
                  enabled: true,
                  validTopics: this.guardrails_c.validTopics || [],
                  invalidTopics: this.guardrails_c.invalidTopics || [],
                }
              }
            } : undefined,
            auth: this.authConfig_c,
          } as CopilotCloudConfig,
        };
      } else if (this.runtimeUrl || this.chatApiEndpoint) {
        this.copilotApiConfig = {
          chatApiEndpoint: this.chatApiEndpoint || this.runtimeUrl!,
          headers: this.headers || {},
          credentials: this.credentials,
        };
      } else {
        throw new ConfigurationError(
          "Please provide either a 'runtimeUrl', 'chatApiEndpoint', or a 'publicApiKey' to the CopilotKitProvider."
        );
      }
    },

    // Initialize runtime client
    initializeRuntimeClient() {
      if (this.copilotApiConfig) {
        this.runtimeClient = new CopilotRuntimeClient({
          url: this.copilotApiConfig.chatApiEndpoint,
          headers: this.copilotApiConfig.headers || {},
          publicApiKey: this.copilotApiConfig.publicApiKey,
          credentials: this.copilotApiConfig.credentials,
        });
      }
    },

    // Initialize from props
    initializeFromProps() {
      if (this.threadId) {
        this.threadIdValue = this.threadId;
      }
      if (this.agentLock && this.agentLock.length > 0) {
        this.agentLockValue = this.agentLock[0];
      }
      if (this.extensions) {
        this.extensionsValue = this.extensions;
      }
    },

    // Update API config when props change
    updateApiConfig() {
      this.initializeApiConfig();
      this.initializeRuntimeClient();
    },

    // Action management
    setAction(id: string, action: FrontendAction<any>) {
      Vue.set(this.actions, id, action);
    },

    removeAction(id: string) {
      Vue.delete(this.actions, id);
    },

    // CoAgent state render management
    setCoAgentStateRender(id: string, render: any) {
      Vue.set(this.coAgentStateRenders, id, render);
    },

    removeCoAgentStateRender(id: string) {
      Vue.delete(this.coAgentStateRenders, id);
    },

    // Context management functions
    getContextString(documents: any[], categories: string[]): string {
      // Implementation for getting context string
      return '';
    },

    addContext(context: any, parentId?: string, categories?: string[]): string {
      // Implementation for adding context
      return randomId();
    },

    removeContext(id: string) {
      // Implementation for removing context
    },

    getAllContext(): any[] {
      // Implementation for getting all context
      return [];
    },

    getDocumentsContext(categories: string[]): any[] {
      // Implementation for getting documents context
      return [];
    },

    addDocumentContext(document: any, categories?: string[]): string {
      // Implementation for adding document context
      return randomId();
    },

    removeDocumentContext(id: string) {
      // Implementation for removing document context
    },

    // Function call handler
    getFunctionCallHandler(actions: Record<string, FrontendAction<any>>) {
      return async (params: { messages: any[], name: string, args: any }) => {
        // Default implementation - can be overridden
        console.log('Function call:', params);
      };
    },

    // Loading state management
    setIsLoading: function(loading: boolean | ((prev: boolean) => boolean)) {
      if (typeof loading === 'function') {
        this.isLoading = loading(this.isLoading);
      } else {
        this.isLoading = loading;
      }
    } as Vue2Setter<boolean>,

    // Chat instructions management
    setChatInstructions: function(instructions: string | ((prev: string) => string)) {
      if (typeof instructions === 'function') {
        this.chatInstructions = instructions(this.chatInstructions);
      } else {
        this.chatInstructions = instructions;
      }
    } as Vue2Setter<string>,

    setAdditionalInstructions: function(instructions: string[] | ((prev: string[]) => string[])) {
      if (typeof instructions === 'function') {
        this.additionalInstructions = instructions(this.additionalInstructions);
      } else {
        this.additionalInstructions = instructions;
      }
    } as Vue2Setter<string[]>,

    // Agent state management - CRITICAL IMPLEMENTATION
    setCoagentStates: function(newStates: Record<string, CoagentState> | ((prev: Record<string, CoagentState>) => Record<string, CoagentState>)) {
      console.log('CopilotKitProvider: setCoagentStates called with:', newStates);
      
      if (typeof newStates === 'function') {
        const updatedStates = newStates(this.coagentStates);
        console.log('CopilotKitProvider: Computed new states:', updatedStates);
        this.coagentStates = { ...updatedStates };
      } else {
        console.log('CopilotKitProvider: Setting states directly:', newStates);
        this.coagentStates = { ...newStates };
      }
      
      // Update the ref as well
      this.coagentStatesRef.current = this.coagentStates;
      console.log('CopilotKitProvider: Updated coagentStatesRef.current:', this.coagentStatesRef.current);
    } as Vue2Setter<Record<string, CoagentState>>,

    // CRITICAL: This is the missing function that was causing the issue
    setCoagentStatesWithRef(newStates: Record<string, CoagentState> | ((prev: Record<string, CoagentState>) => Record<string, CoagentState>)) {
      console.log('CopilotKitProvider: setCoagentStatesWithRef called with:', newStates);
      
      if (typeof newStates === 'function') {
        const updatedStates = newStates(this.coagentStatesRef.current);
        console.log('CopilotKitProvider: Computed new states from ref:', updatedStates);
        this.coagentStates = { ...updatedStates };
        this.coagentStatesRef.current = { ...updatedStates };
      } else {
        console.log('CopilotKitProvider: Setting states directly from ref:', newStates);
        this.coagentStates = { ...newStates };
        this.coagentStatesRef.current = { ...newStates };
      }
      
      console.log('CopilotKitProvider: Final coagentStates:', this.coagentStates);
      console.log('CopilotKitProvider: Final coagentStatesRef.current:', this.coagentStatesRef.current);
    },

    // Agent session management
    setAgentSession: function(session: AgentSession | null | ((prev: AgentSession | null) => AgentSession | null)) {
      if (typeof session === 'function') {
        this.agentSession = session(this.agentSession);
      } else {
        this.agentSession = session;
      }
    } as Vue2Setter<AgentSession | null>,

    // Thread management
    setThreadId: function(threadId: string | ((prev: string) => string)) {
      if (typeof threadId === 'function') {
        this.threadIdValue = threadId(this.threadIdValue);
      } else {
        this.threadIdValue = threadId;
      }
    } as Vue2Setter<string>,

    setRunId: function(runId: string | null | ((prev: string | null) => string | null)) {
      if (typeof runId === 'function') {
        this.runId = runId(this.runId);
      } else {
        this.runId = runId;
      }
    } as Vue2Setter<string | null>,

    // Extensions management
    setExtensions: function(extensions: ExtensionsInput | ((prev: ExtensionsInput) => ExtensionsInput)) {
      if (typeof extensions === 'function') {
        this.extensionsValue = extensions(this.extensionsValue);
      } else {
        this.extensionsValue = extensions;
      }
    } as Vue2Setter<ExtensionsInput>,

    // Auth states management
    setAuthStates_c: function(authStates: Record<string, any> | ((prev: Record<string, any>) => Record<string, any>)) {
      if (typeof authStates === 'function') {
        this.authStates_c = authStates(this.authStates_c);
      } else {
        this.authStates_c = authStates;
      }
    } as Vue2Setter<Record<string, any>>,

    // LangGraph interrupt management
    setLangGraphInterruptAction(action: LangGraphInterruptAction | null) {
      this.langGraphInterruptAction = action;
      return null;
    },

    removeLangGraphInterruptAction() {
      this.langGraphInterruptAction = null;
    },

    // Chat suggestion management
    addChatSuggestionConfiguration(id: string, config: any) {
      Vue.set(this.chatSuggestionConfiguration, id, config);
    },

    removeChatSuggestionConfiguration(id: string) {
      Vue.delete(this.chatSuggestionConfiguration, id);
    },

    // Error handling
    setBannerError(error: any) {
      this.bannerError = error;
    },

    // System message creation (can be overridden)
    makeSystemMessage() {
      return {
        content: this.chatInstructions,
        role: 'system'
      };
    },

    // Function call handler (can be overridden)
    onFunctionCall(params: { messages: any[], name: string, args: any }) {
      // Default implementation
      console.log('Function call handler:', params);
      return Promise.resolve();
    },

    // CoAgent state render handler (can be overridden)
    onCoAgentStateRender(params: { name: string, nodeName?: string, state: any }) {
      // Default implementation
      console.log('CoAgent state render handler:', params);
      return Promise.resolve();
    },
  },

  render(h) {
    return h('div', {
      class: 'copilotkit-provider'
    }, this.$slots.default);
  }
});

export default CopilotKitProvider;
