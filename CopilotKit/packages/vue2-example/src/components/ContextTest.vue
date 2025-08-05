<template>
  <div class="context-test">
    <h3>Context Test Component</h3>
    <div class="status">
      <div :class="['status-item', contextAvailable ? 'success' : 'error']">
        Context Available: {{ contextAvailable }}
      </div>
      <div v-if="contextAvailable" class="context-details">
        <div>Context Type: {{ typeof copilotContext }}</div>
        <div>Has API Config: {{ hasApiConfig }}</div>
        <div>API Endpoint: {{ apiEndpoint }}</div>
        <div>Context Keys: {{ contextKeys.join(', ') }}</div>
      </div>
      <div v-else class="context-debug">
        <div>Inject Config: {{ JSON.stringify($options.inject) }}</div>
        <div>Default Value: {{ copilotContext }}</div>
      </div>
    </div>
  </div>
</template>

<script>
import { COPILOT_CONTEXT_KEY } from '@turbo-agent/copilotkit-vue2-core';

export default {
  name: 'ContextTest',
  
  inject: {
    copilotContextProvider: {
      from: COPILOT_CONTEXT_KEY,
      default() {
        console.log('ContextTest: Using default value for copilotContext');
        return () => null;
      }
    }
  },
  
  computed: {
    // Get the actual context from the provider function
    copilotContext() {
      console.log('ContextTest: Getting context from provider');
      console.log('ContextTest: Provider type:', typeof this.copilotContextProvider);
      
      if (typeof this.copilotContextProvider === 'function') {
        try {
          const result = this.copilotContextProvider();
          console.log('ContextTest: Function call result:', result);
          return result;
        } catch (error) {
          console.error('ContextTest: Error calling context provider:', error);
          return null;
        }
      }
      return this.copilotContextProvider;
    },
    
    contextAvailable() {
      console.log('ContextTest: Checking context availability');
      console.log('ContextTest: Context result:', this.copilotContext);
      console.log('ContextTest: Type of context result:', typeof this.copilotContext);
      
      return !!this.copilotContext;
    },
    
    hasApiConfig() {
      console.log('ContextTest: Checking hasApiConfig');
      if (typeof this.copilotContext === 'function') {
        try {
          const result = this.copilotContext();
          return !!(result && result.copilotApiConfig);
        } catch (error) {
          console.error('ContextTest: Error in hasApiConfig function call:', error);
          return false;
        }
      }
      return !!(this.copilotContext && this.copilotContext.copilotApiConfig);
    },
    
    apiEndpoint() {
      console.log('ContextTest: Checking apiEndpoint');
      if (typeof this.copilotContext === 'function') {
        try {
          const result = this.copilotContext();
          return result ? result.simpleValue || 'No simpleValue' : 'Function returned null';
        } catch (error) {
          return 'Function error: ' + error.message;
        }
      }
      return this.copilotContext ? (this.copilotContext.simpleValue || 'No simpleValue') : 'No context';
    },
    
    contextKeys() {
      console.log('ContextTest: Getting contextKeys');
      if (typeof this.copilotContext === 'function') {
        try {
          const result = this.copilotContext();
          return result ? Object.keys(result) : [];
        } catch (error) {
          return ['Function error'];
        }
      }
      return this.copilotContext ? Object.keys(this.copilotContext) : [];
    }
  },
  
  mounted() {
    console.log('ContextTest mounted');
    console.log('ContextTest copilotContext:', this.copilotContext);
    console.log('ContextTest COPILOT_CONTEXT_KEY:', COPILOT_CONTEXT_KEY);
  },
  
  watch: {
    copilotContext: {
      handler(newValue, oldValue) {
        console.log('ContextTest: copilotContext changed');
        console.log('  Old:', oldValue);
        console.log('  New:', newValue);
      },
      immediate: true
    }
  }
};
</script>

<style scoped>
.context-test {
  border: 2px solid #ddd;
  padding: 15px;
  margin: 10px 0;
  border-radius: 8px;
  background: #f9f9f9;
}

.status-item {
  padding: 8px;
  margin: 5px 0;
  border-radius: 4px;
  font-weight: bold;
}

.status-item.success {
  background: #d4edda;
  color: #155724;
  border: 1px solid #c3e6cb;
}

.status-item.error {
  background: #f8d7da;
  color: #721c24;
  border: 1px solid #f5c6cb;
}

.context-details, .context-debug {
  margin-top: 10px;
  padding: 10px;
  background: white;
  border-radius: 4px;
  font-family: monospace;
  font-size: 12px;
}

.context-details div, .context-debug div {
  margin: 2px 0;
}
</style>
