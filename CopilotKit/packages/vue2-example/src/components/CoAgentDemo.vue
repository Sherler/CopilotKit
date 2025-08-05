<template>
  <div class="coagent-demo">
    <div class="coagent-demo-header">
      <h2>CoAgent Demo</h2>
      <p>Demonstrating shared state between agent and UI</p>
    </div>
    
    <div class="coagent-demo-content">
      <!-- Agent State Display -->
      <div class="state-section">
        <h3>Current Agent State</h3>
        <div class="state-display">
          <div class="state-item">
            <label>Language:</label>
            <span class="state-value">{{ agentState.language }}</span>
          </div>
          <div v-if="agentState.count !== undefined" class="state-item">
            <label>Count:</label>
            <span class="state-value">{{ agentState.count }}</span>
          </div>
          <div v-if="agentState.message" class="state-item">
            <label>Message:</label>
            <span class="state-value">{{ agentState.message }}</span>
          </div>
        </div>
      </div>
      
      <!-- Agent Controls -->
      <div class="controls-section">
        <h3>Agent Controls</h3>
        <div class="control-buttons">
          
          <button 
            @click="handleStartAgent"
            :disabled="agentRunning"
            class="control-btn primary"
          >
            Start Agent
          </button>
          
          <button 
            @click="handleStopAgent"
            :disabled="!agentRunning"
            class="control-btn danger"
          >
            Stop Agent
          </button>
          
          <button 
            @click="handleRunAgent"
            :disabled="!agentRunning"
            class="control-btn secondary"
          >
            Run Agent
          </button>
        </div>
      </div>
      
      <!-- Agent Status -->
      <div class="status-section">
        <h3>Agent Status</h3>
        <div class="status-display">
          <div class="status-item">
            <label>Name:</label>
            <span>{{ agentName }}</span>
          </div>
          <div class="status-item">
            <label>Running:</label>
            <span :class="{ 'status-running': agentRunning, 'status-stopped': !agentRunning }">
              {{ agentRunning ? 'Yes' : 'No' }}
            </span>
          </div>
          <div v-if="agentNodeName" class="status-item">
            <label>Node:</label>
            <span>{{ agentNodeName }}</span>
          </div>
          <div v-if="agentThreadId" class="status-item">
            <label>Thread ID:</label>
            <span class="thread-id">{{ agentThreadId }}</span>
          </div>
        </div>
      </div>
      
      <!-- Raw State JSON (for debugging) -->
      <div class="debug-section">
        <h3>Debug: Raw State</h3>
        <pre class="state-json">{{ JSON.stringify(agentState, null, 2) }}</pre>
      </div>
    </div>
  </div>
</template>

<script>
// Import the context key for proper injection
import { COPILOT_CONTEXT_KEY, useCoAgentStateRender } from '@turbo-agent/copilotkit-vue2-core';

export default {
  name: 'CoAgentDemo',
  
  inject: {
    copilotContext: {
      from: COPILOT_CONTEXT_KEY,
      default: null
    }
  },
  
  data() {
    return {
      // Agent configuration - Fixed name to match chat-mixin.ts
      agentName: "common_agent",
      
      // Initialize with a default state including logs for demonstration
      initialAgentState: {
        message: "Hello from CoAgent!",
        logs: [
          { 
            timestamp: Date.now() - 5000, 
            message: "Agent initialized", 
            level: "info" 
          },
          { 
            timestamp: Date.now() - 3000, 
            message: "Loading configuration...", 
            level: "info" 
          },
          { 
            timestamp: Date.now() - 1000, 
            message: "Ready to receive commands", 
            level: "success" 
          }
        ]
      },
      
      // Local state to track the agent
      localAgentState: {
        message: "Hello from CoAgent!",
        logs: [
          { 
            timestamp: Date.now() - 5000, 
            message: "Agent initialized", 
            level: "info" 
          },
          { 
            timestamp: Date.now() - 3000, 
            message: "Loading configuration...", 
            level: "info" 
          },
          { 
            timestamp: Date.now() - 1000, 
            message: "Ready to receive commands", 
            level: "success" 
          }
        ]
      },
      
      // Agent status
      agentRunning: false,
      agentNodeName: null,
      agentThreadId: null
    };
  },
  
  computed: {
    // Get context from CopilotKit
    copilotContext() {
      try {
        // Access context through injection or global plugin
        return this.$copilotContext || this.$copilotKit?.getContext();
      } catch (error) {
        console.error('Error accessing CopilotKit context:', error);
        return null;
      }
    },
    
    agentState() {
      // Return the current agent state from context or local state
      if (this.copilotContext && this.copilotContext.coagentStates[this.agentName]) {
        return this.copilotContext.coagentStates[this.agentName].state || this.localAgentState;
      }
      return this.localAgentState;
    }
  },
  
  watch: {
    // Watch for changes in the context agent states
    'copilotContext.coagentStates': {
      handler(newStates) {
        if (newStates && newStates[this.agentName]) {
          const agentState = newStates[this.agentName];
          this.localAgentState = agentState.state || this.initialAgentState;
          this.agentRunning = agentState.running || false;
          this.agentNodeName = agentState.nodeName || null;
          this.agentThreadId = agentState.threadId || null;
        }
      },
      deep: true,
      immediate: true
    }
  },
  
  created() {
    // Initialize the agent state in the context when component is created
    this.initializeAgent();
    
    // Register CoAgentStateRender to display agent progress/logs
    this.initializeStateRender();
  },
  
  methods: {
    initializeAgent() {
      if (!this.copilotContext) {
        console.warn('CopilotKit context not available');
        return;
      }
      
      // Set initial agent state in context
      try {
        if (this.copilotContext.setCoagentStatesWithRef) {
          this.copilotContext.setCoagentStatesWithRef({
            ...this.copilotContext.coagentStatesRef.current,
            [this.agentName]: {
              name: this.agentName,
              state: this.initialAgentState,
              config: {},
              running: false,
              active: false,
              threadId: undefined,
              nodeName: undefined,
              runId: undefined,
            }
          });
        }
      } catch (error) {
        console.error('Error initializing agent:', error);
      }
    },
    
    initializeStateRender() {
      if (!this.copilotContext) {
        console.warn('CopilotKit context not available for state render');
        return;
      }
      
      // Use useCoAgentStateRender to render agent progress
      try {
        useCoAgentStateRender({
          name: "common_agent",
          render: ({ state, status, nodeName }) => {
            // Check if agent has logs to display
            if (!state.logs || state.logs.length === 0) {
              return null;
            }
            
            // Create a progress display based on logs
            const logsHtml = state.logs.map(log => `
              <div class="log-entry ${log.level || 'info'}">
                <span class="log-timestamp">[${new Date(log.timestamp || Date.now()).toLocaleTimeString()}]</span>
                <span class="log-message">${log.message || log}</span>
              </div>
            `).join('');
            
            return `
              <div class="agent-progress-render">
                <div class="progress-header">
                  <h4>🤖 Agent Progress</h4>
                  <span class="progress-status ${status}">${status}</span>
                  ${nodeName ? `<span class="progress-node">Node: ${nodeName}</span>` : ''}
                </div>
                <div class="progress-logs">
                  ${logsHtml}
                </div>
              </div>
            `;
          },
        }, this); // Pass Vue instance as second parameter
        
        console.log('useCoAgentStateRender initialized for common_agent');
      } catch (error) {
        console.error('Error initializing state render:', error);
      }
    },
    
    updateAgentState(newState) {
      if (!this.copilotContext) {
        // Fallback to local state if context not available
        this.localAgentState = { ...this.localAgentState, ...newState };
        return;
      }
      
      try {
        const currentState = this.copilotContext.coagentStatesRef.current[this.agentName];
        if (this.copilotContext.setCoagentStatesWithRef) {
          this.copilotContext.setCoagentStatesWithRef({
            ...this.copilotContext.coagentStatesRef.current,
            [this.agentName]: {
              ...currentState,
              state: typeof newState === 'function' ? newState(currentState?.state) : newState,
            }
          });
        }
      } catch (error) {
        console.error('Error updating agent state:', error);
        // Fallback to local state
        this.localAgentState = typeof newState === 'function' ? newState(this.localAgentState) : newState;
      }
    },
    
    addLogEntry(message, level = 'info') {
      const currentState = this.agentState;
      const newLogs = [...(currentState.logs || []), {
        timestamp: Date.now(),
        message: message,
        level: level
      }];
      
      // Keep only last 10 logs to prevent excessive growth
      if (newLogs.length > 10) {
        newLogs.splice(0, newLogs.length - 10);
      }
      
      this.updateAgentState({
        ...currentState,
        logs: newLogs
      });
    },
    
    handleStartAgent() {
      if (!this.copilotContext) {
        console.warn('CopilotKit context not available');
        return;
      }
      
      try {
        this.addLogEntry('Starting agent...', 'info');
        if (this.copilotContext.setAgentSession) {
          this.copilotContext.setAgentSession({
            agentName: this.agentName,
          });
        }
        this.addLogEntry('Agent started successfully', 'success');
        console.log('Agent started');
      } catch (error) {
        this.addLogEntry(`Failed to start agent: ${error.message}`, 'error');
        console.error('Error starting agent:', error);
      }
    },
    
    handleStopAgent() {
      if (!this.copilotContext) {
        console.warn('CopilotKit context not available');
        return;
      }
      
      try {
        this.addLogEntry('Stopping agent...', 'info');
        const { agentSession } = this.copilotContext;
        if (agentSession && agentSession.agentName === this.agentName) {
          if (this.copilotContext.setAgentSession) {
            this.copilotContext.setAgentSession(null);
          }
          if (this.copilotContext.setCoagentStates) {
            this.copilotContext.setCoagentStates((prevAgentStates) => ({
              ...prevAgentStates,
              [this.agentName]: {
                ...prevAgentStates[this.agentName],
                running: false,
                active: false,
                threadId: undefined,
                nodeName: undefined,
                runId: undefined,
              },
            }));
          }
        }
        this.addLogEntry('Agent stopped successfully', 'success');
        console.log('Agent stopped');
      } catch (error) {
        this.addLogEntry(`Failed to stop agent: ${error.message}`, 'error');
        console.error('Error stopping agent:', error);
      }
    },
    
    async handleRunAgent() {
      if (!this.copilotContext) {
        console.warn('CopilotKit context not available');
        return;
      }
      
      try {
        this.addLogEntry('Running agent task...', 'info');
        // This is a simplified version - in a real implementation,
        // this would trigger the agent to run through the chat system
        
        // Simulate some processing steps
        setTimeout(() => {
          this.addLogEntry('Processing step 1/3: Analyzing input', 'info');
        }, 500);
        
        setTimeout(() => {
          this.addLogEntry('Processing step 2/3: Generating response', 'info');
        }, 1000);
        
        setTimeout(() => {
          this.addLogEntry('Processing step 3/3: Finalizing output', 'info');
        }, 1500);
        
        setTimeout(() => {
          this.addLogEntry('Agent task completed successfully', 'success');
        }, 2000);
        
        console.log('Agent run completed (simplified version)');
      } catch (error) {
        this.addLogEntry(`Agent run failed: ${error.message}`, 'error');
        console.error('Error running agent:', error);
      }
    }
  }
};
</script>

<style scoped>
.coagent-demo {
  max-width: 800px;
  margin: 0 auto;
  padding: 20px;
  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
}

.coagent-demo-header {
  text-align: center;
  margin-bottom: 30px;
  padding-bottom: 20px;
  border-bottom: 2px solid #e0e0e0;
}

.coagent-demo-header h2 {
  color: #333;
  margin-bottom: 10px;
}

.coagent-demo-header p {
  color: #666;
  font-size: 14px;
}

.coagent-demo-content {
  display: grid;
  gap: 25px;
}

.state-section, .controls-section, .status-section, .debug-section {
  background: #f8f9fa;
  border: 1px solid #e9ecef;
  border-radius: 8px;
  padding: 20px;
}

.state-section h3, .controls-section h3, .status-section h3, .debug-section h3 {
  margin: 0 0 15px 0;
  color: #495057;
  font-size: 16px;
  font-weight: 600;
}

.state-display, .status-display {
  display: grid;
  gap: 10px;
}

.state-item, .status-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 12px;
  background: white;
  border-radius: 4px;
  border: 1px solid #dee2e6;
}

.state-item label, .status-item label {
  font-weight: 500;
  color: #495057;
}

.state-value {
  font-weight: 600;
  color: #007bff;
}

.status-running {
  color: #28a745;
  font-weight: 600;
}

.status-stopped {
  color: #dc3545;
  font-weight: 600;
}

.thread-id {
  font-family: monospace;
  font-size: 12px;
  background: #e9ecef;
  padding: 2px 6px;
  border-radius: 3px;
}

.control-buttons {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 10px;
}

.control-btn {
  padding: 10px 16px;
  border: none;
  border-radius: 4px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  background: #6c757d;
  color: white;
}

.control-btn:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

.control-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.control-btn.primary {
  background: #007bff;
}

.control-btn.primary:hover:not(:disabled) {
  background: #0056b3;
}

.control-btn.danger {
  background: #dc3545;
}

.control-btn.danger:hover:not(:disabled) {
  background: #c82333;
}

.control-btn.secondary {
  background: #6f42c1;
}

.control-btn.secondary:hover:not(:disabled) {
  background: #5a32a3;
}

.state-json {
  background: #2d3748;
  color: #e2e8f0;
  padding: 15px;
  border-radius: 4px;
  font-size: 12px;
  line-height: 1.4;
  overflow-x: auto;
  margin: 0;
}

/* Agent Progress Render Styles */
.agent-progress-render {
  background: #f8f9fa;
  border: 1px solid #e9ecef;
  border-radius: 8px;
  padding: 20px;
  margin-top: 20px;
}

.agent-progress-render h3 {
  margin: 0 0 15px 0;
  color: #495057;
  font-size: 16px;
  font-weight: 600;
}

.agent-logs {
  max-height: 400px;
  overflow-y: auto;
  border: 1px solid #dee2e6;
  border-radius: 4px;
  background-color: #ffffff;
}

.log-entry {
  padding: 8px 12px;
  border-bottom: 1px solid #f1f3f4;
  font-family: 'Courier New', Monaco, monospace;
  font-size: 12px;
  display: flex;
  align-items: flex-start;
  line-height: 1.4;
}

.log-entry:last-child {
  border-bottom: none;
}

.log-entry:hover {
  background-color: #f8f9fa;
}

.log-timestamp {
  color: #6c757d;
  margin-right: 10px;
  min-width: 80px;
  font-size: 11px;
  flex-shrink: 0;
}

.log-level {
  margin-right: 10px;
  padding: 2px 6px;
  border-radius: 3px;
  font-size: 10px;
  font-weight: bold;
  text-transform: uppercase;
  min-width: 50px;
  text-align: center;
  flex-shrink: 0;
}

.log-level.info {
  background-color: #cce5ff;
  color: #0056b3;
  border: 1px solid #99d1ff;
}

.log-level.success {
  background-color: #d1f2d1;
  color: #155724;
  border: 1px solid #a3e4a3;
}

.log-level.error {
  background-color: #f8d7da;
  color: #721c24;
  border: 1px solid #f1b0b7;
}

.log-level.warn {
  background-color: #fff3cd;
  color: #856404;
  border: 1px solid #ffeaa7;
}

.log-message {
  flex: 1;
  color: #333;
  word-break: break-word;
}

.no-logs {
  padding: 30px;
  text-align: center;
  color: #6c757d;
  font-style: italic;
  background-color: #f8f9fa;
}

.agent-info {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 10px;
  margin-bottom: 15px;
}

.info-item {
  padding: 10px;
  background-color: #ffffff;
  border-radius: 4px;
  border-left: 3px solid #007bff;
  border: 1px solid #dee2e6;
}

.info-label {
  font-weight: 600;
  color: #495057;
  font-size: 11px;
  text-transform: uppercase;
  margin-bottom: 4px;
  letter-spacing: 0.5px;
}

.info-value {
  color: #212529;
  font-family: 'Courier New', Monaco, monospace;
  font-size: 13px;
  word-break: break-all;
}

@media (max-width: 768px) {
  .coagent-demo {
    padding: 15px;
  }
  
  .control-buttons {
    grid-template-columns: 1fr;
  }
  
  .agent-info {
    grid-template-columns: 1fr;
  }
  
  .log-entry {
    flex-direction: column;
    align-items: flex-start;
  }
  
  .log-timestamp, .log-level {
    margin-bottom: 4px;
  }
}
</style>
