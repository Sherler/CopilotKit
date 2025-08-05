<template>
  <div class="chat-interface">
    <div class="chat-header">
      <div class="header-main">
        <h2>Custom Chat Interface</h2>
        <p>Demonstrating Vue2 integration with CopilotKit</p>
      </div>
      
      <!-- Agent information -->
      <div v-if="agent" class="agent-info">
        <div class="agent-avatar">
          <img 
            v-if="agent.avatar_url" 
            :src="agent.avatar_url" 
            :alt="agent.name || 'Agent'"
            class="avatar-image"
          />
          <div v-else class="avatar-placeholder">
            {{ (agent.name || 'Agent').charAt(0).toUpperCase() }}
          </div>
        </div>
        <div class="agent-details">
          <h3>{{ agent.name || agent.id }}</h3>
          <p v-if="agent.description">{{ agent.description }}</p>
          <small>Runtime: {{ runtimeUrl }}</small>
        </div>
      </div>
    </div>
    
    <!-- Messages display -->
    <div class="messages-container" ref="messagesContainer">
      <div 
        v-for="message in visibleMessages" 
        :key="message.id"
        :class="['message', `message-${message.role}`]"
      >
        <div class="message-content">
          <div class="message-role">{{ formatRole(message.role) }}</div>
          
          <!-- Reasoning content (thinking process) for assistant messages -->
          <div 
            v-if="message.role === 'assistant' && message.reasoningContent" 
            class="reasoning-section"
          >
            <div 
              class="reasoning-toggle"
              @click="toggleReasoning(message.id)"
              :class="{ expanded: expandedReasonings[message.id] }"
            >
              <span class="reasoning-icon">🤔</span>
              <span class="reasoning-label">Thinking process</span>
              <span class="reasoning-arrow">{{ expandedReasonings[message.id] ? '▼' : '▶' }}</span>
            </div>
            
            <div 
              v-show="expandedReasonings[message.id]" 
              class="reasoning-content"
            >
              <div class="reasoning-text">{{ message.reasoningContent }}</div>
            </div>
          </div>
          
          <!-- Main message content -->
          <div class="message-text">{{ message.content }}</div>
          
          <!-- CoAgent State Render for assistant messages -->
          <div 
            v-if="message.role === 'assistant' && getCoAgentStateRender(message)"
            class="coagent-state-render"
            v-html="getCoAgentStateRender(message)"
          ></div>
          
          <!-- Show CoAgent logs for assistant messages -->
          <div 
            v-if="message.role === 'assistant' && coAgentState.logs && coAgentState.logs.length > 0"
            class="coagent-logs-section"
          >
            <div class="logs-header">
              <span class="logs-icon">📋</span>
              <span class="logs-title">Agent Logs</span>
            </div>
            <div class="logs-container">
              <div 
                v-for="(log, index) in coAgentState.logs.slice(-5)" 
                :key="index"
                :class="['log-entry', `log-${log.level}`]"
              >
                <span class="log-timestamp">{{ formatTimestamp(log.timestamp) }}</span>
                <span class="log-message">{{ log.message }}</span>
              </div>
            </div>
          </div>
        </div>
        <button 
          @click="deleteMessage(message.id)"
          class="delete-btn"
          title="Delete message"
        >
          ×
        </button>
      </div>
      
      <div v-if="isLoading" class="loading-indicator">
        <div class="loading-dots">
          <span></span>
          <span></span>
          <span></span>
        </div>
        <span>Copilot is thinking...</span>
      </div>
    </div>
    
    <!-- Input area -->
    <div class="input-area">
      <div class="input-group">
        <textarea
          v-model="currentMessage"
          @keydown.enter.prevent="handleSendMessage"
          :disabled="isLoading"
          placeholder="Type your message here... (Press Enter to send)"
          class="message-input"
          rows="3"
        ></textarea>
        <div class="input-actions">
          <button 
            @click="handleSendMessage"
            :disabled="!currentMessage.trim() || isLoading"
            class="send-btn"
          >
            Send
          </button>
          <button 
            @click="reloadMessages"
            :disabled="isLoading"
            class="reload-btn"
          >
            Reload
          </button>
          <button 
            @click="stopGeneration"
            :disabled="!isLoading"
            class="stop-btn"
          >
            Stop
          </button>
        </div>
      </div>
    </div>
    
    <!-- Debug info -->
    <div class="debug-info">
      <details>
        <summary>Debug Information</summary>
        <pre>{{ debugInfo }}</pre>
      </details>
    </div>
    
    <!-- CoAgent State Display -->
    <div class="coagent-state-section">
      <details open>
        <summary>CoAgent State Management</summary>
        <div class="coagent-controls">
          <div class="state-display">
            <h4>Current Agent State:</h4>
            <div class="state-json">
              <pre>{{ JSON.stringify(coAgentState, null, 2) }}</pre>
            </div>
          </div>
          
          <div class="state-controls">
            <h4>State Controls:</h4>
            
            <div class="control-group">
              <label>Agent Actions:</label>
              <div class="action-buttons">
                <button @click="startCoAgent" :disabled="coAgentRunning" class="action-btn start">
                  Start Agent
                </button>
                <button @click="stopCoAgent" :disabled="!coAgentRunning" class="action-btn stop">
                  Stop Agent
                </button>
                <button @click="runCoAgent" :disabled="!coAgentRunning" class="action-btn run">
                  Run Agent
                </button>
              </div>
            </div>
          </div>
          
          <div class="agent-status">
            <h4>Agent Status:</h4>
            <div class="status-items">
              <div class="status-item">
                <span class="status-label">Name:</span>
                <span class="status-value">{{ coAgentName }}</span>
              </div>
              <div class="status-item">
                <span class="status-label">Running:</span>
                <span :class="['status-value', coAgentRunning ? 'running' : 'stopped']">
                  {{ coAgentRunning ? 'Yes' : 'No' }}
                </span>
              </div>
              <div class="status-item" v-if="coAgentNodeName">
                <span class="status-label">Node:</span>
                <span class="status-value">{{ coAgentNodeName }}</span>
              </div>
              <div class="status-item" v-if="coAgentThreadId">
                <span class="status-label">Thread:</span>
                <span class="status-value thread-id">{{ coAgentThreadId }}</span>
              </div>
            </div>
          </div>
        </div>
      </details>
    </div>
  </div>
</template>

<script>
// Import CopilotKit types and use vue2-core ChatMixin
import { TextMessage, Role } from '@turbo-agent/copilotkit-runtime-client-gql';
import { ChatMixin } from '@turbo-agent/copilotkit-vue2-core';
import { useCoAgent } from '@turbo-agent/copilotkit-vue2-core';

export default {
  name: 'CustomChatInterface',
  
  // Use ChatMixin from vue2-core for all chat functionality
  mixins: [ChatMixin],
  
  props: {
    agent: {
      type: Object,
      default: null
    },
    runtimeUrl: {
      type: String,
      default: '/copilotkit'
    }
  },
  
  data() {
    return {
      currentMessage: '',
      // Track expanded state for reasoning content
      expandedReasonings: {},
      // CoAgent instance
      coAgent: null,
      // messages, isLoading, chatInitialized are provided by ChatMixin
    };
  },
  
  computed: {
    // copilotContext and visibleMessages are provided by ChatMixin
    
    // CoAgent computed properties
    coAgentState() {
      return this.coAgent ? this.coAgent.state : {};
    },
    
    coAgentName() {
      return this.coAgent ? this.coAgent.name : 'No Agent';
    },
    
    coAgentRunning() {
      return this.coAgent ? this.coAgent.running : false;
    },
    
    coAgentNodeName() {
      return this.coAgent ? this.coAgent.nodeName : null;
    },
    
    coAgentThreadId() {
      return this.coAgent ? this.coAgent.threadId : null;
    },
    
    debugInfo() {
      const lastMessage = this.visibleMessages[this.visibleMessages.length - 1];
      return {
        messageCount: this.visibleMessages.length,
        isLoading: this.isLoading,
        copilotContext: this.copilotContext ? 'Available' : 'Not Available',
        copilotContextType: typeof this.copilotContext,
        copilotContextKeys: this.copilotContext ? Object.keys(this.copilotContext) : [],
        lastMessage: lastMessage ? {
          id: lastMessage.id,
          role: lastMessage.role,
          content: lastMessage.content?.substring(0, 100) + (lastMessage.content?.length > 100 ? '...' : ''),
          hasReasoningContent: !!lastMessage.reasoningContent,
          reasoningContentLength: lastMessage.reasoningContent ? lastMessage.reasoningContent.length : 0
        } : null,
        messagesWithReasoning: this.visibleMessages.filter(m => m.reasoningContent).length,
        expandedReasonings: Object.keys(this.expandedReasonings).filter(id => this.expandedReasonings[id]).length,
        currentAgent: this.agent ? this.agent.name || this.agent.id : 'No agent',
        runtimeUrl: this.runtimeUrl,
        chatInitialized: this.chatInitialized,
        apiConfig: this.copilotContext?.copilotApiConfig ? 'Available' : 'Not Available',
        apiConfigDetails: this.copilotContext?.copilotApiConfig ? {
          chatApiEndpoint: this.copilotContext.copilotApiConfig.chatApiEndpoint,
          hasHeaders: !!this.copilotContext.copilotApiConfig.headers
        } : null,
        runtimeClient: this.copilotContext?.runtimeClient ? 'Available' : 'Not Available',
        // Enhanced CoAgent debug info
        coAgent: {
          name: this.coAgentName,
          running: this.coAgentRunning,
          state: this.coAgentState,
          nodeName: this.coAgentNodeName,
          threadId: this.coAgentThreadId
        },
        // Context states debug info
        contextCoagentStates: this.copilotContext?.coagentStates || {},
        contextCoagentStatesRef: this.copilotContext?.coagentStatesRef?.current || {},
        contextCoagentStatesCount: this.copilotContext?.coagentStatesRef?.current ? 
          Object.keys(this.copilotContext.coagentStatesRef.current).length : 0
      };
    }
  },
  
  methods: {
    // Most chat methods are provided by ChatMixin
    // We only need to add UI-specific methods
    
    // Handle send message button/enter key
    handleSendMessage() {
      if (this.currentMessage.trim() && !this.isLoading) {
        this.sendMessage(this.currentMessage); // from ChatMixin
        this.currentMessage = '';
      }
    },
    
    // Toggle reasoning content visibility
    toggleReasoning(messageId) {
      this.$set(this.expandedReasonings, messageId, !this.expandedReasonings[messageId]);
    },
    
    // Format role for display
    formatRole(role) {
      return role.charAt(0).toUpperCase() + role.slice(1);
    },
    
    // Format timestamp for logs
    formatTimestamp(timestamp) {
      if (!timestamp) return '';
      const date = new Date(timestamp);
      return date.toLocaleTimeString();
    },
    
    // Scroll to bottom of messages
    scrollToBottom() {
      const container = this.$refs.messagesContainer;
      if (container) {
        container.scrollTop = container.scrollHeight;
      }
    },
    
    // Get CoAgent state render content for a specific message
    getCoAgentStateRender(message) {
      try {
        if (!this.copilotContext || !this.copilotContext.chatComponentsCache) {
          return null;
        }
        
        const cache = this.copilotContext.chatComponentsCache.current;
        if (!cache || !cache.coAgentStateRenders) {
          return null;
        }
        
        // Look for render function for common_agent
        const agentName = "common_agent";
        const key = `${agentName}-global`;
        const renderFn = cache.coAgentStateRenders[key];
        
        if (!renderFn || typeof renderFn !== 'function') {
          return null;
        }
        
        // Get current agent state
        const agentState = this.copilotContext.coagentStatesRef?.current?.[agentName];
        if (!agentState) {
          return null;
        }
        
        // Call render function with current state
        const renderProps = {
          state: agentState.state,
          status: agentState.running ? 'inProgress' : 'complete',
          nodeName: agentState.nodeName || 'default'
        };
        
        console.log('Rendering CoAgent state:', { renderProps, agentState });
        
        return renderFn(renderProps);
      } catch (error) {
        console.error('Error rendering CoAgent state:', error);
        return null;
      }
    },
    
    startCoAgent() {
      if (this.coAgent && this.coAgent.start) {
        this.coAgent.start();
        console.log('Started CoAgent');
      }
    },
    
    stopCoAgent() {
      if (this.coAgent && this.coAgent.stop) {
        this.coAgent.stop();
        console.log('Stopped CoAgent');
      }
    },
    
    runCoAgent() {
      if (this.coAgent && this.coAgent.run) {
        this.coAgent.run();
        console.log('Running CoAgent');
      }
    },
    
    // Initialize CoAgent
    initializeCoAgent() {
      if (this.copilotContext) {
        try {
          this.coAgent = useCoAgent({
            name: 'common_agent', // Fixed name to match chat-mixin.ts agentSession
            initialState: {
              initialized: true
            }
          }, this); // Pass Vue instance as second parameter
          
          console.log('CoAgent initialized:', this.coAgent);
          
          // No local state initialization needed for removed fields
          
        } catch (error) {
          console.error('Failed to initialize CoAgent:', error);
        }
      } else {
        console.log('Cannot initialize CoAgent - context not available');
        console.log('- copilotContext:', !!this.copilotContext);
      }
    }
  },
  
  mounted() {
    console.log('=== CustomChatInterface mounted ===');
    console.log('1. Initial copilotContext:', this.copilotContext);
    console.log('2. CopilotContext keys:', this.copilotContext ? Object.keys(this.copilotContext) : 'null');
    console.log('3. CopilotContext type:', typeof this.copilotContext);
    console.log('4. CopilotContext is null:', this.copilotContext === null);
    console.log('5. CopilotContext is undefined:', this.copilotContext === undefined);
    
    // Check inject configuration
    console.log('6. Inject configuration:', this.$options.inject);
    console.log('7. All injected values:', {
      copilotContext: this.copilotContext
    });
    
    // Initialize CoAgent
    this.initializeCoAgent();
    
    // Register demo action if vue2-core context is available
    if (this.copilotContext && this.copilotContext.setAction) {
      this.copilotContext.setAction('demo-action', {
        name: 'demo-action',
        description: 'A demo action for the Vue2 example',
        parameters: [
          {
            name: 'message',
            type: 'string',
            description: 'A message to display'
          }
        ],
        handler: async (args) => {
          this.appendMessage(new TextMessage({
            content: `Action executed with message: ${args.message}`,
            role: Role.Assistant
          }));
          return { success: true };
        }
      });
      
      console.log('9. Demo action registered with vue2-core');
    } else {
      console.log('9. Cannot register demo action - context or setAction not available');
      console.log('   - copilotContext:', !!this.copilotContext);
      console.log('   - setAction:', this.copilotContext ? !!this.copilotContext.setAction : false);
    }
  },
  
  beforeDestroy() {
    // Clean up action when component is destroyed
    if (this.copilotContext && this.copilotContext.removeAction) {
      this.copilotContext.removeAction('demo-action');
    }
  },
  
  watch: {
    // Reinitialize when agent changes
    agent() {
      if (this.chatInitialized) {
        console.log('Agent changed, updating chat context');
      }
    },
    
    // Update when runtime URL changes
    runtimeUrl() {
      if (this.chatInitialized) {
        console.log('Runtime URL changed:', this.runtimeUrl);
      }
    }
  }
};
</script>

<style scoped>
.chat-interface {
  display: flex;
  flex-direction: column;
  min-height: 100vh; /* Use full viewport height as minimum */
  background: #ffffff;
}

.chat-header {
  padding: 20px;
  border-bottom: 1px solid #e1e5e9;
  background: #f8f9fa;
}

.header-main h2 {
  margin: 0 0 5px 0;
  color: #2c3e50;
  font-size: 1.5rem;
}

.header-main p {
  margin: 0 0 15px 0;
  color: #6c757d;
  font-size: 0.9rem;
}

.agent-info {
  display: flex;
  align-items: center;
  gap: 15px;
  padding: 15px;
  background: white;
  border-radius: 8px;
  border: 1px solid #e1e5e9;
}

.agent-avatar {
  flex-shrink: 0;
}

.avatar-image {
  width: 50px;
  height: 50px;
  border-radius: 50%;
  object-fit: cover;
  border: 2px solid #e1e5e9;
}

.avatar-placeholder {
  width: 50px;
  height: 50px;
  border-radius: 50%;
  background: #007bff;
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
  font-weight: bold;
}

.agent-details {
  flex: 1;
}

.agent-details h3 {
  margin: 0 0 5px 0;
  color: #2c3e50;
  font-size: 1.1rem;
}

.agent-details p {
  margin: 0 0 8px 0;
  color: #6c757d;
  font-size: 0.9rem;
  line-height: 1.4;
}

.agent-details small {
  color: #868e96;
  font-size: 0.8rem;
}

.messages-container {
  flex: 1;
  padding: 20px;
  overflow-y: auto;
  background: #ffffff;
  min-height: 300px; /* Minimum height for messages */
  max-height: 60vh; /* Maximum height relative to viewport */
}

.message {
  display: flex;
  align-items: flex-start;
  margin-bottom: 16px;
  gap: 10px;
}

.message-content {
  flex: 1;
  background: #f8f9fa;
  padding: 12px 16px;
  border-radius: 12px;
  border: 1px solid #e1e5e9;
}

.message-user .message-content {
  background: #007bff;
  color: white;
  margin-left: auto;
  margin-right: 0;
}

.message-assistant .message-content {
  background: #f8f9fa;
  color: #2c3e50;
}

.message-role {
  font-weight: 600;
  font-size: 0.8rem;
  margin-bottom: 4px;
  opacity: 0.8;
}

.message-text {
  line-height: 1.4;
}

.reasoning-section {
  margin-bottom: 12px;
  border: 1px solid #e1e5e9;
  border-radius: 8px;
  overflow: hidden;
  background: rgba(0, 123, 255, 0.03);
}

.reasoning-toggle {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  cursor: pointer;
  background: rgba(0, 123, 255, 0.08);
  transition: background-color 0.2s;
  user-select: none;
}

.reasoning-toggle:hover {
  background: rgba(0, 123, 255, 0.12);
}

.reasoning-toggle.expanded {
  border-bottom: 1px solid #e1e5e9;
}

.reasoning-icon {
  font-size: 14px;
}

.reasoning-label {
  flex: 1;
  font-size: 13px;
  font-weight: 500;
  color: #495057;
}

.reasoning-arrow {
  font-size: 12px;
  color: #6c757d;
  transition: transform 0.2s;
}

.reasoning-toggle.expanded .reasoning-arrow {
  transform: rotate(0deg);
}

.reasoning-content {
  padding: 12px;
  background: rgba(0, 123, 255, 0.02);
}

.reasoning-text {
  font-size: 13px;
  line-height: 1.5;
  color: #495057;
  font-style: italic;
  white-space: pre-wrap;
  word-wrap: break-word;
  background: white;
  padding: 8px 12px;
  border-radius: 4px;
  border: 1px solid #e9ecef;
}

/* CoAgent Logs Styles */
.coagent-logs-section {
  margin-top: 12px;
  border: 1px solid #e1e5e9;
  border-radius: 8px;
  overflow: hidden;
  background: rgba(0, 123, 255, 0.02);
}

.logs-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  background: rgba(0, 123, 255, 0.08);
  border-bottom: 1px solid #e1e5e9;
}

.logs-icon {
  font-size: 14px;
}

.logs-title {
  font-size: 13px;
  font-weight: 500;
  color: #495057;
}

.logs-container {
  padding: 8px;
  max-height: 150px;
  overflow-y: auto;
}

.log-entry {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  padding: 4px 8px;
  margin-bottom: 4px;
  border-radius: 4px;
  font-size: 12px;
  line-height: 1.4;
}

.log-entry:last-child {
  margin-bottom: 0;
}

.log-entry.log-info {
  background: rgba(0, 123, 255, 0.05);
  border-left: 3px solid #007bff;
}

.log-entry.log-success {
  background: rgba(40, 167, 69, 0.05);
  border-left: 3px solid #28a745;
}

.log-entry.log-error {
  background: rgba(220, 53, 69, 0.05);
  border-left: 3px solid #dc3545;
}

.log-entry.log-warning {
  background: rgba(255, 193, 7, 0.05);
  border-left: 3px solid #ffc107;
}

.log-timestamp {
  flex-shrink: 0;
  color: #6c757d;
  font-weight: 500;
  min-width: 60px;
}

.log-message {
  flex: 1;
  color: #495057;
  word-break: break-word;
}

.delete-btn {
  background: #dc3545;
  color: white;
  border: none;
  border-radius: 50%;
  width: 24px;
  height: 24px;
  cursor: pointer;
  font-size: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0.7;
  transition: opacity 0.2s;
}

.delete-btn:hover {
  opacity: 1;
}

.loading-indicator {
  display: flex;
  align-items: center;
  gap: 10px;
  color: #6c757d;
  font-style: italic;
}

.loading-dots {
  display: flex;
  gap: 4px;
}

.loading-dots span {
  width: 6px;
  height: 6px;
  background: #6c757d;
  border-radius: 50%;
  animation: loading 1.4s infinite;
}

.loading-dots span:nth-child(2) {
  animation-delay: 0.2s;
}

.loading-dots span:nth-child(3) {
  animation-delay: 0.4s;
}

@keyframes loading {
  0%, 80%, 100% {
    transform: scale(0.8);
    opacity: 0.5;
  }
  40% {
    transform: scale(1);
    opacity: 1;
  }
}

.input-area {
  padding: 20px;
  border-top: 1px solid #e1e5e9;
  background: #f8f9fa;
}

.input-group {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.message-input {
  width: 100%;
  padding: 12px;
  border: 1px solid #ced4da;
  border-radius: 8px;
  font-family: inherit;
  font-size: 14px;
  resize: vertical;
  min-height: 60px;
}

.message-input:focus {
  outline: none;
  border-color: #007bff;
  box-shadow: 0 0 0 2px rgba(0, 123, 255, 0.25);
}

.input-actions {
  display: flex;
  gap: 8px;
  justify-content: flex-end;
}

.send-btn, .reload-btn, .stop-btn {
  padding: 8px 16px;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
  transition: background-color 0.2s;
}

.send-btn {
  background: #007bff;
  color: white;
}

.send-btn:hover:not(:disabled) {
  background: #0056b3;
}

.reload-btn {
  background: #6c757d;
  color: white;
}

.reload-btn:hover:not(:disabled) {
  background: #545b62;
}

.stop-btn {
  background: #dc3545;
  color: white;
}

.stop-btn:hover:not(:disabled) {
  background: #c82333;
}

.send-btn:disabled, .reload-btn:disabled, .stop-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.debug-info {
  padding: 20px;
  border-top: 1px solid #e1e5e9;
  background: #f8f9fa;
}

.debug-info details {
  cursor: pointer;
}

.debug-info summary {
  font-weight: 600;
  color: #6c757d;
  margin-bottom: 10px;
}

.debug-info pre {
  background: #ffffff;
  padding: 12px;
  border-radius: 6px;
  border: 1px solid #e1e5e9;
  font-size: 12px;
  overflow-x: auto;
  margin: 0;
}

/* CoAgent State Styles */
.coagent-state-section {
  padding: 20px;
  border-top: 1px solid #e1e5e9;
  background: #f0f8ff;
  min-height: auto; /* Allow content to determine height */
}

.coagent-state-section details {
  cursor: pointer;
}

.coagent-state-section summary {
  font-weight: 600;
  color: #007bff;
  margin-bottom: 15px;
  font-size: 1.1rem;
}

.coagent-controls {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  gap: 20px;
  margin-top: 15px;
  align-items: start; /* Align items to start for better layout */
}

.state-display {
  background: white;
  padding: 15px;
  border-radius: 8px;
  border: 1px solid #e1e5e9;
  height: fit-content; /* Allow content to determine height */
}

.state-display h4 {
  margin: 0 0 10px 0;
  color: #2c3e50;
  font-size: 1rem;
}

.state-json {
  background: #f8f9fa;
  border: 1px solid #e9ecef;
  border-radius: 4px;
  overflow-x: auto;
  max-height: 300px; /* Limit max height with scroll for large state objects */
  overflow-y: auto;
}

.state-json pre {
  margin: 0;
  padding: 10px;
  font-size: 12px;
  color: #495057;
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
  white-space: pre-wrap; /* Allow wrapping for better readability */
  word-break: break-word; /* Break long words if needed */
}

.state-controls {
  background: white;
  padding: 15px;
  border-radius: 8px;
  border: 1px solid #e1e5e9;
  height: fit-content; /* Allow content to determine height */
}

.state-controls h4 {
  margin: 0 0 15px 0;
  color: #2c3e50;
  font-size: 1rem;
}

.control-group {
  margin-bottom: 15px;
}

.control-group:last-child {
  margin-bottom: 0; /* Remove bottom margin from last control group */
}

.control-group label {
  display: block;
  margin-bottom: 5px;
  font-weight: 500;
  color: #495057;
  font-size: 0.9rem;
}

.control-group select,
.control-group .message-input {
  width: 100%;
  padding: 8px;
  border: 1px solid #ced4da;
  border-radius: 4px;
  font-size: 14px;
}

.control-group select:focus,
.control-group .message-input:focus {
  outline: none;
  border-color: #007bff;
  box-shadow: 0 0 0 2px rgba(0, 123, 255, 0.25);
}

.action-buttons {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.action-btn {
  padding: 8px 12px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 13px;
  font-weight: 500;
  transition: background-color 0.2s;
}

.action-btn.start {
  background: #28a745;
  color: white;
}

.action-btn.start:hover:not(:disabled) {
  background: #218838;
}

.action-btn.stop {
  background: #dc3545;
  color: white;
}

.action-btn.stop:hover:not(:disabled) {
  background: #c82333;
}

.action-btn.run {
  background: #007bff;
  color: white;
}

.action-btn.run:hover:not(:disabled) {
  background: #0056b3;
}

.action-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.agent-status {
  background: white;
  padding: 15px;
  border-radius: 8px;
  border: 1px solid #e1e5e9;
  height: fit-content; /* Allow content to determine height */
}

.agent-status h4 {
  margin: 0 0 15px 0;
  color: #2c3e50;
  font-size: 1rem;
}

.status-items {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.status-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 6px 0;
  border-bottom: 1px solid #f8f9fa;
}

.status-item:last-child {
  border-bottom: none;
}

.status-label {
  font-weight: 500;
  color: #6c757d;
  font-size: 0.9rem;
}

.status-value {
  font-weight: 600;
  color: #2c3e50;
  font-size: 0.9rem;
}

.status-value.running {
  color: #28a745;
}

.status-value.stopped {
  color: #dc3545;
}

.status-value.thread-id {
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
  font-size: 0.8rem;
  background: #f8f9fa;
  padding: 2px 6px;
  border-radius: 3px;
  max-width: 120px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

@media (max-width: 768px) {
  .coagent-controls {
    grid-template-columns: 1fr;
    gap: 15px;
  }
  
  .action-buttons {
    justify-content: center;
  }
  
  .counter-controls {
    justify-content: center;
  }
  
  .chat-interface {
    min-height: 100vh;
  }
  
  .messages-container {
    max-height: 50vh; /* Reduce max height on mobile */
  }
  
  .state-json {
    max-height: 200px; /* Reduce max height on mobile */
  }
}

@media (max-width: 480px) {
  .coagent-state-section {
    padding: 15px;
  }
  
  .state-display,
  .state-controls,
  .agent-status {
    padding: 12px;
  }
  
  .messages-container {
    padding: 15px;
    max-height: 40vh;
  }
  
  .debug-info {
    padding: 15px;
  }
}

/* Additional utility classes for better layout */
.full-height {
  height: 100%;
}

.auto-height {
  height: auto;
}

.scroll-container {
  overflow-y: auto;
  max-height: 80vh;
}
</style>
