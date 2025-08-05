/**
 * Vue2 Compatible CoAgent Hook
 * 
 * This is a complete Vue2 implementation of the useCoAgent functionality,
 * equivalent to the React version but using Vue2 reactive patterns.
 * 
 * Usage in Vue2 component:
 * ```js
 * import { useCoAgent } from '@turbo-agent/copilotkit-vue2-core'
 * 
 * export default {
 *   data() {
 *     return {
 *       coAgent: null
 *     }
 *   },
 *   created() {
 *     this.coAgent = useCoAgent({
 *       name: 'my-agent',
 *       initialState: { count: 0 }
 *     }, this)
 *   }
 * }
 * ```
 */

import Vue from 'vue';
import { Message } from "@turbo-agent/copilotkit-runtime-client-gql";
import { CopilotContextParams } from "../context/copilot-context-vue2";
import { CoagentState } from "../types/coagent-state";
import { parseJson, CopilotKitAgentDiscoveryError } from "@turbo-agent/copilotkit-shared";
import { COPILOT_CONTEXT_KEY } from "../context/copilot-context-vue2";

// Vue2 Ref-like interface to mimic React useRef behavior
interface Vue2RefLike<T> {
  current: T;
}

function createVue2Ref<T>(initialValue: T): Vue2RefLike<T> {
  return {
    current: initialValue
  };
}

interface UseCoagentOptionsBase {
  /**
   * The name of the agent being used.
   */
  name: string;
  /**
   * @deprecated - use "config.configurable"
   * Config to pass to a LangGraph Agent
   */
  configurable?: Record<string, any>;
  /**
   * Config to pass to a LangGraph Agent
   */
  config?: {
    configurable?: Record<string, any>;
    [key: string]: any;
  };
}

interface WithInternalStateManagementAndInitial<T> extends UseCoagentOptionsBase {
  /**
   * The initial state of the agent.
   */
  initialState: T;
}

interface WithInternalStateManagement extends UseCoagentOptionsBase {
  /**
   * Optional initialState with default type any
   */
  initialState?: any;
}

interface WithExternalStateManagement<T> extends UseCoagentOptionsBase {
  /**
   * The current state of the agent.
   */
  state: T;
  /**
   * A function to update the state of the agent.
   */
  setState: (newState: T | ((prevState: T | undefined) => T)) => void;
}

type UseCoagentOptions<T> =
  | WithInternalStateManagementAndInitial<T>
  | WithInternalStateManagement
  | WithExternalStateManagement<T>;

export interface UseCoagentReturnType<T> {
  /**
   * The name of the agent being used.
   */
  name: string;
  /**
   * The name of the current LangGraph node.
   */
  nodeName?: string;
  /**
   * The ID of the thread the agent is running in.
   */
  threadId?: string;
  /**
   * A boolean indicating if the agent is currently running.
   */
  running: boolean;
  /**
   * The current state of the agent.
   */
  state: T;
  /**
   * A function to update the state of the agent.
   */
  setState: (newState: T | ((prevState: T | undefined) => T)) => void;
  /**
   * A function to start the agent.
   */
  start: () => void;
  /**
   * A function to stop the agent.
   */
  stop: () => void;
  /**
   * A function to re-run the agent. The hint function can be used to provide a hint to the agent
   * about why it is being re-run again.
   */
  run: (hint?: HintFunction) => Promise<void>;
}

export interface HintFunctionParams {
  /**
   * The previous state of the agent.
   */
  previousState: any;
  /**
   * The current state of the agent.
   */
  currentState: any;
}

export type HintFunction = (params: HintFunctionParams) => Message | undefined;

/**
 * Vue2 compatible implementation of useCoAgent hook
 * This function must be called from within a Vue component context
 */
export function useCoAgent<T = any>(
  options: UseCoagentOptions<T>, 
  vueInstance: Vue
): UseCoagentReturnType<T> {
  const { name } = options;
  
  // Get context from Vue2 inject system
  const context = vueInstance.$parent ? 
    getContextFromVueInstance(vueInstance) : 
    null;
  
  if (!context) {
    console.error('useCoAgent: No CopilotKit context found. Make sure to use CopilotKitProvider.');
    // Return a mock implementation for graceful degradation
    return createMockCoAgent(options);
  }

  // Vue2 refs to replace React useRef
  const lastLoadedThreadId = createVue2Ref<string | undefined>(undefined);
  const lastLoadedState = createVue2Ref<any>(undefined);

  // Agent validation - equivalent to React useEffect with availableAgents dependency
  const validateAgent = () => {
    const { availableAgents } = context;
    if (availableAgents?.length && !availableAgents.some((a) => a.name === name)) {
      const message = `(useCoAgent): Agent "${name}" not found. Make sure the agent exists and is properly configured.`;
      console.warn(message);

      // Create banner error
      const agentError = new CopilotKitAgentDiscoveryError({
        agentName: name,
        availableAgents: availableAgents.map((a) => ({ name: a.name, id: a.id })),
      });
      
      // In Vue2, we'll emit this as an event or handle it through context
      if (context.setBannerError) {
        context.setBannerError(agentError);
      } else {
        console.error('Banner error handler not available:', agentError);
      }
    }
  };

  // Initial validation
  validateAgent();

  // Watch for availableAgents changes - equivalent to React useEffect
  const unwatchAvailableAgents = vueInstance.$watch(
    () => context.availableAgents,
    () => validateAgent(),
    { immediate: true }
  );

  // State setter function
  const setState = (newState: T | ((prevState: T | undefined) => T)) => {
    const coagentState: CoagentState = getCoagentState({ 
      coagentStates: context.coagentStatesRef.current, 
      name, 
      options 
    });
    
    const updatedState = typeof newState === "function" 
      ? (newState as Function)(coagentState.state) 
      : newState;

    context.setCoagentStatesWithRef({
      ...context.coagentStatesRef.current,
      [name]: {
        ...coagentState,
        state: updatedState,
      },
    });
  };

  // Thread change handler - equivalent to React useEffect with threadId dependency
  const handleThreadChange = async (newThreadId: string | null) => {
    if (!newThreadId || newThreadId === lastLoadedThreadId.current) return;

    try {
      const result = await context.runtimeClient?.loadAgentState({
        threadId: newThreadId,
        agentName: name,
      });

      // Handle errors
      if (result?.error) {
        console.error('Failed to load agent state:', result.error);
        return;
      }

      const newState = result?.data?.loadAgentState?.state;
      if (newState === lastLoadedState.current) return;

      if (result?.data?.loadAgentState?.threadExists && newState && newState !== "{}") {
        lastLoadedState.current = newState;
        lastLoadedThreadId.current = newThreadId;
        const fetchedState = parseJson(newState, {});
        
        if (isExternalStateManagement(options)) {
          options.setState(fetchedState);
        } else {
          setState(fetchedState);
        }
      }
    } catch (error) {
      console.error('Error loading agent state:', error);
    }
  };

  // Watch threadId changes
  const unwatchThreadId = vueInstance.$watch(
    () => context.threadId,
    handleThreadChange,
    { immediate: true }
  );

  // State synchronization for external state management
  if (isExternalStateManagement(options)) {
    const unwatchExternalState = vueInstance.$watch(
      () => JSON.stringify(options.state),
      () => {
        setState(options.state);
      },
      { immediate: true }
    );
  } else {
    // Initialize internal state if not exists
    const unwatchInternalState = vueInstance.$watch(
      () => context.coagentStatesRef.current[name] === undefined,
      (isUndefined) => {
        if (isUndefined) {
          setState(options.initialState === undefined ? {} : options.initialState);
        }
      },
      { immediate: true }
    );
  }

  // Config synchronization - equivalent to React useEffect with config dependency
  const handleConfigChange = () => {
    const newConfig = options.config
      ? options.config
      : options.configurable
        ? { configurable: options.configurable }
        : undefined;

    if (newConfig === undefined) return;

    const prev = context.coagentStatesRef.current;
    const existing = prev[name] ?? {
      name,
      state: isInternalStateManagementWithInitial(options) ? options.initialState : {},
      config: {},
      running: false,
      active: false,
      threadId: undefined,
      nodeName: undefined,
      runId: undefined,
    };

    if (JSON.stringify(existing.config) === JSON.stringify(newConfig)) {
      return;
    }

    context.setCoagentStatesWithRef({
      ...prev,
      [name]: {
        ...existing,
        config: newConfig,
      },
    });
  };

  // Watch config changes
  const unwatchConfig = vueInstance.$watch(
    () => {
      const newConfig = options.config
        ? options.config
        : options.configurable
          ? { configurable: options.configurable }
          : undefined;
      return JSON.stringify(newConfig);
    },
    handleConfigChange,
    { immediate: true }
  );

  // Agent control functions
  const start = () => {
    startAgent(name, context);
  };

  const stop = () => {
    stopAgent(name, context);
  };

  const run = async (hint?: HintFunction) => {
    await runAgent(name, context, hint);
  };

  // Cleanup function - called when component is destroyed
  const cleanup = () => {
    unwatchAvailableAgents();
    unwatchThreadId();
    unwatchConfig();
  };

  // Register cleanup on Vue instance destruction
  vueInstance.$once('hook:beforeDestroy', cleanup);

  // Create reactive computed property for the return value
  const coagentData = Vue.computed(() => {
    const coagentState = getCoagentState({ 
      coagentStates: context.coagentStatesRef.current, 
      name, 
      options 
    });
    
    return {
      name,
      nodeName: coagentState.nodeName,
      threadId: coagentState.threadId,
      running: coagentState.running,
      state: coagentState.state,
      setState: isExternalStateManagement(options) ? options.setState : setState,
      start,
      stop,
      run,
    };
  });

  return coagentData.value;
}

// Helper function to get context from Vue instance
function getContextFromVueInstance(vueInstance: Vue): CopilotContextParams | null {
  // Try to get context through Vue2 inject system
  let currentInstance: Vue | null = vueInstance;
  
  while (currentInstance) {
    // Check if this instance provides the context
    const provided = (currentInstance as any).$options.provide;
    
    if (provided && provided[COPILOT_CONTEXT_KEY]) {
      const context = typeof provided[COPILOT_CONTEXT_KEY] === 'function' 
        ? provided[COPILOT_CONTEXT_KEY]() 
        : provided[COPILOT_CONTEXT_KEY];
      
      if (context) return context;
    }
    
    // Move up the component tree
    currentInstance = currentInstance.$parent;
  }
  
  // Try global $copilotKit as fallback
  if ((vueInstance as any).$copilotKit) {
    return (vueInstance as any).$copilotKit.getContext();
  }
  
  return null;
}

// Mock implementation for graceful degradation
function createMockCoAgent<T>(options: UseCoagentOptions<T>): UseCoagentReturnType<T> {
  const mockState = isInternalStateManagementWithInitial(options) 
    ? options.initialState 
    : isExternalStateManagement(options)
      ? options.state
      : {};

  return {
    name: options.name,
    nodeName: undefined,
    threadId: null,
    running: false,
    state: mockState,
    setState: (newState: T | ((prevState: T | undefined) => T)) => {
      console.warn('useCoAgent: setState called but no context available');
    },
    start: () => {
      console.warn('useCoAgent: start called but no context available');
    },
    stop: () => {
      console.warn('useCoAgent: stop called but no context available');
    },
    run: async (hint?: HintFunction) => {
      console.warn('useCoAgent: run called but no context available');
    },
  };
}

// Agent management functions
export function startAgent(name: string, context: CopilotContextParams) {
  if (context.setAgentSession) {
    context.setAgentSession({
      agentName: name,
    });
  } else {
    console.warn('setAgentSession not available in context');
  }
}

export function stopAgent(name: string, context: CopilotContextParams) {
  const { agentSession, setAgentSession, setCoagentStates } = context;
  
  if (agentSession && agentSession.agentName === name) {
    if (setAgentSession) {
      setAgentSession(null);
    }
    
    if (setCoagentStates) {
      setCoagentStates((prevAgentStates: Record<string, CoagentState>) => {
        return {
          ...prevAgentStates,
          [name]: {
            ...prevAgentStates[name],
            running: false,
            active: false,
            threadId: undefined,
            nodeName: undefined,
            runId: undefined,
          },
        };
      });
    }
  } else {
    console.warn(`No agent session found for ${name}`);
  }
}

export async function runAgent(
  name: string,
  context: CopilotContextParams,
  hint?: HintFunction,
) {
  const { agentSession, setAgentSession } = context;
  
  if (!agentSession || agentSession.agentName !== name) {
    if (setAgentSession) {
      setAgentSession({
        agentName: name,
      });
    }
  }

  // Get previous state from coagent states
  let previousState: any = null;
  const currentCoagentState = context.coagentStatesRef.current?.[name];
  if (currentCoagentState) {
    previousState = currentCoagentState.state;
  }

  let state = context.coagentStatesRef.current?.[name]?.state || {};

  if (hint) {
    const hintMessage = hint({ previousState, currentState: state });
    if (hintMessage) {
      if (context.appendMessage) {
        await context.appendMessage(hintMessage);
      }
    } else {
      if (context.runChatCompletion) {
        await context.runChatCompletion();
      }
    }
  } else {
    if (context.runChatCompletion) {
      await context.runChatCompletion();
    }
  }
}

// Helper type guards
const isExternalStateManagement = <T>(
  options: UseCoagentOptions<T>,
): options is WithExternalStateManagement<T> => {
  return "state" in options && "setState" in options;
};

const isInternalStateManagementWithInitial = <T>(
  options: UseCoagentOptions<T>,
): options is WithInternalStateManagementAndInitial<T> => {
  return "initialState" in options;
};

const getCoagentState = <T>({
  coagentStates,
  name,
  options,
}: {
  coagentStates: Record<string, CoagentState>;
  name: string;
  options: UseCoagentOptions<T>;
}) => {
  if (coagentStates[name]) {
    return coagentStates[name];
  } else {
    return {
      name,
      state: isInternalStateManagementWithInitial<T>(options) ? options.initialState : {},
      config: options.config
        ? options.config
        : options.configurable
          ? { configurable: options.configurable }
          : {},
      running: false,
      active: false,
      threadId: undefined,
      nodeName: undefined,
      runId: undefined,
    };
  }
};
