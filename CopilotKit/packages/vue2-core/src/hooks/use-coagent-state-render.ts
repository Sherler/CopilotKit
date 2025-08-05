/**
 * The useCoAgentStateRender hook allows you to render UI or text based components on a Agentic Copilot's state in the chat.
 * This is particularly useful for showing intermediate state or progress during Agentic Copilot operations.
 *
 * ## Usage
 *
 * ### Simple Usage (Vue2)
 *
 * ```js
 * import { useCoAgentStateRender } from "@turbo-agent/copilotkit-vue2-core";
 *
 * // In Vue2 component:
 * export default {
 *   mounted() {
 *     useCoAgentStateRender({
 *       name: "basic_agent",
 *       nodeName: "optionally_specify_a_specific_node", // optional
 *       render: ({ status, state, nodeName }) => {
 *         // Return a Vue component definition or HTML string
 *         return `<div class="agent-progress">
 *           Agent: ${nodeName}, Status: ${status}, 
 *           Progress: ${state.progress || 0}%
 *         </div>`;
 *       },
 *     }, this); // Pass Vue instance as second parameter
 *   }
 * }
 * ```
 *
 * This allows for you to render UI components or text based on what is happening within the agent.
 */

import Vue from 'vue';
import { CopilotContextParams, COPILOT_CONTEXT_KEY } from "../context/copilot-context-vue2";
import { randomId, CopilotKitAgentDiscoveryError } from "@turbo-agent/copilotkit-shared";
import { CoAgentStateRender } from "../types/coagent-action";

/**
 * Vue2 compatible implementation of useCoAgentStateRender hook
 * This function must be called from within a Vue component context
 */
export function useCoAgentStateRender<T = any>(
  action: CoAgentStateRender<T>,
  vueInstance?: Vue,
  dependencies?: any[]
): void {
  // If no Vue instance provided, try to get current instance
  let contextVueInstance = vueInstance;
  if (!contextVueInstance) {
    console.warn('useCoAgentStateRender: Vue instance not provided, using fallback implementation');
    return;
  }

  // Get context from Vue2 inject system
  const context = getContextFromVueInstance(contextVueInstance);
  
  if (!context) {
    console.error('useCoAgentStateRender: No CopilotKit context found. Make sure to use CopilotKitProvider.');
    return;
  }

  const id = randomId();

  // Agent validation
  const validateAgent = () => {
    const { availableAgents } = context;
    if (availableAgents?.length && !availableAgents.some((a) => a.name === action.name)) {
      const message = `(useCoAgentStateRender): Agent "${action.name}" not found. Make sure the agent exists and is properly configured.`;
      console.warn(message);

      // Create banner error
      const agentError = new CopilotKitAgentDiscoveryError({
        agentName: action.name,
        availableAgents: availableAgents.map((a) => ({ name: a.name, id: a.id })),
      });
      
      // Log error since we don't have setBannerError in Vue2 context yet
      console.error('Agent discovery error:', agentError);
    }
  };

  // Initial validation
  validateAgent();

  // Watch for availableAgents changes
  const unwatchAvailableAgents = contextVueInstance.$watch(
    () => context.availableAgents,
    () => validateAgent(),
    { immediate: true }
  );

  // Check for duplicates
  const checkForDuplicates = () => {
    if (!context.coAgentStateRenders) return;

    const hasDuplicate = Object.entries(context.coAgentStateRenders).some(([otherId, otherAction]) => {
      // Skip comparing with self
      if (otherId === id) return false;

      // Different agent names are never duplicates
      if (otherAction.name !== action.name) return false;

      // Same agent names:
      const hasNodeName = !!action.nodeName;
      const hasOtherNodeName = !!otherAction.nodeName;

      // If neither has nodeName, they're duplicates
      if (!hasNodeName && !hasOtherNodeName) return true;

      // If one has nodeName and other doesn't, they're not duplicates
      if (hasNodeName !== hasOtherNodeName) return false;

      // If both have nodeName, they're duplicates only if the names match
      return action.nodeName === otherAction.nodeName;
    });

    if (hasDuplicate) {
      const message = action.nodeName
        ? `Found multiple state renders for agent ${action.name} and node ${action.nodeName}. State renders might get overridden`
        : `Found multiple state renders for agent ${action.name}. State renders might get overridden`;

      console.warn(message);
    }
  };

  // Register the state render action
  const registerAction = () => {
    if (context.setCoAgentStateRender) {
      context.setCoAgentStateRender(id, action as any);
      
      // Update chat components cache if available
      if (context.chatComponentsCache?.current && action.render !== undefined) {
        const key = `${action.name}-${action.nodeName || "global"}`;
        context.chatComponentsCache.current.coAgentStateRenders[key] = action.render;
      }
      
      console.log('CoAgentStateRender registered:', { id, name: action.name, nodeName: action.nodeName });
    }
  };

  // Cleanup function
  const cleanup = () => {
    if (context.removeCoAgentStateRender) {
      context.removeCoAgentStateRender(id);
      console.log('CoAgentStateRender unregistered:', { id, name: action.name });
    }
    unwatchAvailableAgents();
  };

  // Register on next tick to ensure context is ready
  contextVueInstance.$nextTick(() => {
    checkForDuplicates();
    registerAction();
  });

  // Watch for dependencies changes if provided
  if (dependencies && dependencies.length > 0) {
    const unwatchDependencies = contextVueInstance.$watch(
      () => dependencies.map(dep => typeof dep === 'function' ? dep() : dep),
      () => {
        // Re-register when dependencies change
        registerAction();
      },
      { deep: true }
    );

    // Enhanced cleanup to include dependencies watcher
    const enhancedCleanup = () => {
      cleanup();
      unwatchDependencies();
    };

    // Register cleanup on Vue instance destruction
    contextVueInstance.$once('hook:beforeDestroy', enhancedCleanup);
  } else {
    // Register cleanup on Vue instance destruction
    contextVueInstance.$once('hook:beforeDestroy', cleanup);
  }
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
