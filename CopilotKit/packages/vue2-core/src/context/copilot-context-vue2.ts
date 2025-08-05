import { CopilotCloudConfig, FunctionCallHandler, CopilotErrorHandler } from "@turbo-agent/copilotkit-shared";
import {
  ActionRenderProps,
  CatchAllActionRenderProps,
  FrontendAction,
} from "../types/frontend-action";
import { TreeNodeId, Tree } from "../hooks/use-tree";
import { DocumentPointer } from "../types";
import { CopilotChatSuggestionConfiguration } from "../types/chat-suggestion-configuration";
import { CoAgentStateRender, CoAgentStateRenderProps } from "../types/coagent-action";
import { CoagentState } from "../types/coagent-state";
import {
  CopilotRuntimeClient,
  ExtensionsInput,
  ForwardedParametersInput,
} from "@turbo-agent/copilotkit-runtime-client-gql";
import { Agent } from "@turbo-agent/copilotkit-runtime-client-gql";
import {
  LangGraphInterruptAction,
  LangGraphInterruptActionSetter,
} from "../types/interrupt-action";

/**
 * Interface for the configuration of the Copilot API.
 */
export interface CopilotApiConfig {
  /**
   * The public API key for Copilot Cloud.
   */
  publicApiKey?: string;

  /**
   * The configuration for Copilot Cloud.
   */
  cloud?: CopilotCloudConfig;

  /**
   * The endpoint for the chat API.
   */
  chatApiEndpoint: string;

  /**
   * The endpoint for the Copilot transcribe audio service.
   */
  transcribeAudioUrl?: string;

  /**
   * The endpoint for the Copilot text to speech service.
   */
  textToSpeechUrl?: string;

  /**
   * additional headers to be sent with the request
   * @default {}
   * @example
   * ```
   * {
   *   'Authorization': 'Bearer your_token_here'
   * }
   * ```
   */
  headers: Record<string, string>;

  /**
   * Custom properties to be sent with the request
   * @default {}
   * @example
   * ```
   * {
   *   'user_id': 'user_id'
   * }
   * ```
   */
  properties?: Record<string, any>;

  /**
   * Indicates whether the user agent should send or receive cookies from the other domain
   * in the case of cross-origin requests.
   */
  credentials?: RequestCredentials;

  /**
   * Optional configuration for connecting to Model Context Protocol (MCP) servers.
   * This is typically derived from the CopilotKitProps and used internally.
   * @experimental
   */
  mcpServers?: Array<{ endpoint: string; apiKey?: string }>;
}

export type InChatRenderFunction<TProps = ActionRenderProps<any> | CatchAllActionRenderProps<any>> =
  (props: TProps) => string;
export type CoagentInChatRenderFunction = (
  props: CoAgentStateRenderProps<any>,
) => string | undefined | null;

// Vue2 compatible ref-like object for chat components cache
export interface Vue2RefLike<T> {
  current: T;
}

export interface ChatComponentsCache {
  actions: Record<string, InChatRenderFunction | string>;
  coAgentStateRenders: Record<string, CoagentInChatRenderFunction | string>;
}

export interface AgentSession {
  agentName: string;
  threadId?: string;
  nodeName?: string;
}

export interface AuthState {
  status: "authenticated" | "unauthenticated";
  authHeaders: Record<string, string>;
  userId?: string;
  metadata?: Record<string, any>;
}

export type ActionName = string;
export type ContextTree = Tree;

// Vue2 compatible setter function types
export type Vue2Setter<T> = (value: T | ((prev: T) => T)) => void;

export interface CopilotContextParams {
  // function-calling
  actions: Record<string, FrontendAction<any>>;
  setAction: (id: string, action: FrontendAction<any>) => void;
  removeAction: (id: string) => void;

  // coagent actions
  coAgentStateRenders: Record<string, CoAgentStateRender<any>>;
  setCoAgentStateRender: (id: string, stateRender: CoAgentStateRender<any>) => void;
  removeCoAgentStateRender: (id: string) => void;

  chatComponentsCache: Vue2RefLike<ChatComponentsCache>;

  getFunctionCallHandler: (
    customEntryPoints?: Record<string, FrontendAction<any>>,
  ) => FunctionCallHandler;

  // text context
  addContext: (context: string, parentId?: string, categories?: string[]) => TreeNodeId;
  removeContext: (id: TreeNodeId) => void;
  getAllContext: () => Tree;
  getContextString: (documents: DocumentPointer[], categories: string[]) => string;

  // document context
  addDocumentContext: (documentPointer: DocumentPointer, categories?: string[]) => TreeNodeId;
  removeDocumentContext: (documentId: string) => void;
  getDocumentsContext: (categories: string[]) => DocumentPointer[];

  isLoading: boolean;
  setIsLoading: Vue2Setter<boolean>;

  chatSuggestionConfiguration: { [key: string]: CopilotChatSuggestionConfiguration };
  addChatSuggestionConfiguration: (
    id: string,
    suggestion: CopilotChatSuggestionConfiguration,
  ) => void;
  removeChatSuggestionConfiguration: (id: string) => void;

  chatInstructions: string;
  setChatInstructions: Vue2Setter<string>;

  additionalInstructions?: string[];
  setAdditionalInstructions: Vue2Setter<string[]>;

  // api endpoints
  copilotApiConfig: CopilotApiConfig;

  showDevConsole: boolean;

  // agents
  coagentStates: Record<string, CoagentState>;
  setCoagentStates: Vue2Setter<Record<string, CoagentState>>;
  coagentStatesRef: Vue2RefLike<Record<string, CoagentState>>;
  setCoagentStatesWithRef: (
    value:
      | Record<string, CoagentState>
      | ((prev: Record<string, CoagentState>) => Record<string, CoagentState>),
  ) => void;

  agentSession: AgentSession | null;
  setAgentSession: Vue2Setter<AgentSession | null>;

  agentLock: string | null;

  threadId: string;
  setThreadId: Vue2Setter<string>;

  runId: string | null;
  setRunId: Vue2Setter<string | null>;

  // The chat abort controller can be used to stop generation globally,
  // i.e. when using `stop()` from `useChat`
  chatAbortControllerRef: Vue2RefLike<AbortController | null>;

  // runtime
  runtimeClient: CopilotRuntimeClient;

  /**
   * The forwarded parameters to use for the task.
   */
  forwardedParameters?: Partial<Pick<ForwardedParametersInput, "temperature">>;
  availableAgents: Agent[];

  /**
   * The auth states for the CopilotKit.
   */
  authStates_c?: Record<ActionName, AuthState>;
  setAuthStates_c?: Vue2Setter<Record<ActionName, AuthState>>;

  /**
   * The auth config for the CopilotKit.
   */
  authConfig_c?: {
    SignInComponent: any; // Vue component
  };

  extensions: ExtensionsInput;
  setExtensions: Vue2Setter<ExtensionsInput>;

  langGraphInterruptAction: LangGraphInterruptAction | null;
  setLangGraphInterruptAction: LangGraphInterruptActionSetter;
  removeLangGraphInterruptAction: () => void;

  /**
   * Optional trace handler for comprehensive debugging and observability.
   */
  onError?: CopilotErrorHandler;
}

const emptyCopilotContext: CopilotContextParams = {
  actions: {},
  setAction: () => {},
  removeAction: () => {},

  coAgentStateRenders: {},
  setCoAgentStateRender: () => {},
  removeCoAgentStateRender: () => {},

  chatComponentsCache: { current: { actions: {}, coAgentStateRenders: {} } },
  getContextString: (documents: DocumentPointer[], categories: string[]) =>
    returnAndThrowInDebug(""),
  addContext: () => returnAndThrowInDebug(""),
  removeContext: () => {},
  getAllContext: () => returnAndThrowInDebug([]),

  getFunctionCallHandler: () => returnAndThrowInDebug(async () => {}),

  isLoading: false,
  setIsLoading: () => returnAndThrowInDebug(false),

  chatInstructions: "",
  setChatInstructions: () => returnAndThrowInDebug(""),

  additionalInstructions: [],
  setAdditionalInstructions: () => returnAndThrowInDebug([]),

  getDocumentsContext: (categories: string[]) => returnAndThrowInDebug([]),
  addDocumentContext: () => returnAndThrowInDebug(""),
  removeDocumentContext: () => {},
  runtimeClient: {} as any,

  copilotApiConfig: new (class implements CopilotApiConfig {
    get chatApiEndpoint(): string {
      throw new Error("Remember to wrap your app in a `<CopilotKit> {...} </CopilotKit>` !!!");
    }

    get headers(): Record<string, string> {
      return {};
    }
    get body(): Record<string, any> {
      return {};
    }
  })(),

  chatSuggestionConfiguration: {},
  addChatSuggestionConfiguration: () => {},
  removeChatSuggestionConfiguration: () => {},
  showDevConsole: false,
  coagentStates: {},
  setCoagentStates: () => {},
  coagentStatesRef: { current: {} },
  setCoagentStatesWithRef: () => {},
  agentSession: null,
  setAgentSession: () => {},
  forwardedParameters: {},
  agentLock: null,
  threadId: "",
  setThreadId: () => {},
  runId: null,
  setRunId: () => {},
  chatAbortControllerRef: { current: null },
  availableAgents: [],
  authStates_c: {},
  setAuthStates_c: () => {},
  authConfig_c: undefined,
  extensions: {},
  setExtensions: () => {},
  langGraphInterruptAction: null,
  setLangGraphInterruptAction: () => null,
  removeLangGraphInterruptAction: () => {},
  onError: undefined,
};

// Vue2 inject/provide key for CopilotContext
export const COPILOT_CONTEXT_KEY = Symbol('CopilotContext');

export function useCopilotContext(): CopilotContextParams {
  // In Vue2, this would be used with inject
  // This is a placeholder that should be used with Vue's inject
  // The actual implementation should check if context === emptyCopilotContext
  throw new Error("Remember to wrap your app in a `<CopilotKit> {...} </CopilotKit>` !!!");
}

function returnAndThrowInDebug<T>(_value: T): T {
  throw new Error("Remember to wrap your app in a `<CopilotKit> {...} </CopilotKit>` !!!");
}

// Export types and constants
export type { CopilotContextParams as CopilotContext };
export { emptyCopilotContext };
