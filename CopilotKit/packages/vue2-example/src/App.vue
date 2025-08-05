<template>
  <div id="app">
    <!-- Login form -->
    <div v-if="!isAuthenticated && !isLoadingAgents" class="login-container">
      <div class="login-form">
        <h2>Login Required</h2>
        <p>Please enter your credentials to access the CopilotKit agents</p>
        
        <form @submit.prevent="handleLogin">
          <div class="form-group">
            <label for="email">Email:</label>
            <input 
              id="email"
              v-model="loginForm.email" 
              type="email" 
              required 
              :disabled="isLoggingIn"
              class="form-input"
              placeholder="Enter your email"
            />
          </div>
          
          <div class="form-group">
            <label for="password">Password:</label>
            <input 
              id="password"
              v-model="loginForm.password" 
              type="password" 
              required 
              :disabled="isLoggingIn"
              class="form-input"
              placeholder="Enter your password"
            />
          </div>
          
          <button 
            type="submit" 
            :disabled="isLoggingIn || !loginForm.email || !loginForm.password"
            class="login-btn"
          >
            {{ isLoggingIn ? 'Logging in...' : 'Login' }}
          </button>
          
          <div v-if="loginError" class="error-message">
            {{ loginError }}
          </div>
        </form>
      </div>
    </div>
    
    <!-- Show loading state while fetching agents -->
    <div v-else-if="isLoadingAgents" class="loading-container">
      <div class="loading-spinner"></div>
      <p>Loading agents...</p>
    </div>
    
    <!-- Show CopilotKit only after agent is selected and runtime URL is valid -->
    <div v-else-if="selectedAgent && selectedAgent.id && dynamicRuntimeUrl">
      <CopilotKitProvider 
        :runtime-url="dynamicRuntimeUrl"
        agent="common_agent"
        :properties="copilotProperties"
        @hook:mounted="onCopilotKitMounted"
      >
        <div class="app-container">
          <header class="app-header">
            <div class="header-content">
              <h1>CopilotKit Vue2 Example</h1>
              <p>Agent: {{ selectedAgent.name || 'Unknown' }}</p>
              
              <!-- Logout button -->
              <button @click="handleLogout" class="logout-btn">
                Logout
              </button>
            </div>
            
            <!-- Agent selector -->
            <div class="agent-selector" v-if="assistants.length > 1">
              <label for="agent-select">Select Agent:</label>
              <select 
                id="agent-select" 
                v-model="selectedAgentId" 
                @change="changeAgent"
                class="agent-select"
              >
                <option 
                  v-for="assistant in assistants" 
                  :key="assistant.id"
                  :value="assistant.id"
                >
                  {{ assistant.name || assistant.id }}
                </option>
              </select>
            </div>
          </header>
          
          <main class="app-main">
            <!-- Context Test Component -->
            <ContextTest />
            
            <!-- CoAgent Demo Component - demonstrating shared state -->
            <CoAgentDemo />
            
            <!-- Include the custom chat interface -->
            <CustomChatInterface 
              :agent="selectedAgent"
              :runtime-url="dynamicRuntimeUrl"
            />
          </main>
        </div>
      </CopilotKitProvider>
    </div>
    
    <!-- Fallback when no agent available -->
    <div v-else class="error-container">
      <h2>No Agent Available</h2>
      <p>Unable to load agents. Please check your configuration.</p>
      <button @click="fetchAgents" class="retry-btn">Retry</button>
      <button @click="handleLogout" class="logout-btn">Back to Login</button>
    </div>
  </div>
</template>

<script>
import CustomChatInterface from './components/CustomChatInterface.vue';
import ContextTest from './components/ContextTest.vue';
import CoAgentDemo from './components/CoAgentDemo.vue';

export default {
  name: 'App',
  components: {
    CustomChatInterface,
    ContextTest,
    CoAgentDemo
  },
  
  data() {
    return {
      assistants: [],
      selectedAgent: null,
      selectedAgentId: null,
      isLoadingAgents: false,
      isAuthenticated: false,
      isLoggingIn: false,
      
      // Token storage - 保存在对象中，不用localStorage
      accessToken: null,
      refreshToken: null,
      
      // Login form data
      loginForm: {
        email: '',
        password: ''
      },
      loginError: '',
      
      // Configuration from environment/URL params
      basePath: process.env.VUE_APP_BASE_PATH || '',
      assistantId: this.getUrlParam('assistant_id'),
      userId: this.getUrlParam('user_id'),
      authorization: null,
      mode: this.getUrlParam('mode') || 'default',
      model: this.getUrlParam('model') || 'default'
    };
  },
  
  computed: {
    dynamicRuntimeUrl() {
      if (!this.selectedAgent || !this.selectedAgent.id) {
        console.warn('No selected agent available for runtime URL');
        return null; // Return null instead of invalid URL
      }

      // 构建正确的runtime URL路径，使用代理路径避免CORS
      let baseUrl = `/copilotkit/${this.selectedAgent.id}`;
      
      console.log('Generated runtime URL:', baseUrl);
      return baseUrl;
    },
    
    copilotProperties() {
      return {
        agent: this.selectedAgent,
        mode: this.mode,
        model: this.model
      };
    }
  },
  
  methods: {
    getUrlParam(name) {
      const urlParams = new URLSearchParams(window.location.search);
      return urlParams.get(name);
    },
    
    // 登录方法
    async handleLogin() {
      this.isLoggingIn = true;
      this.loginError = '';
      
      try {
        const response = await fetch('/api/v2/user/auth_token/get_token', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include', // 重要：确保cookies被包含在请求中
          body: JSON.stringify({
            email: this.loginForm.email,
            password: this.loginForm.password,
          }),
        });
        
        if (!response.ok) {
          throw new Error(`Login failed: ${response.status} ${response.statusText}`);
        }
        
        const data = await response.json();
        
        // 检查服务器是否设置了HttpOnly cookie
        const setCookieHeader = response.headers.get('Set-Cookie');
        console.log('Set-Cookie header:', setCookieHeader);
        
        // 如果服务器返回了access_token，保存到组件数据中作为备用
        if (data.access_token) {
          this.accessToken = data.access_token;
          this.refreshToken = data.refresh_token;
          console.log('Login successful, tokens received and saved');
        } else {
          // 如果没有返回token但登录成功，说明使用的是HttpOnly cookie
          console.log('Login successful, using HttpOnly cookie authentication');
        }
        
        this.isAuthenticated = true;
        this.loginError = '';
        
        // 登录成功后立即获取agent列表
        await this.fetchAgents();
        
      } catch (error) {
        console.error('Login error:', error);
        this.loginError = error.message || 'Login failed. Please check your credentials.';
        this.isAuthenticated = false;
      } finally {
        this.isLoggingIn = false;
      }
    },
    
    // 登出方法
    handleLogout() {
      // 清除token（从data对象中移除，不操作localStorage）
      this.accessToken = null;
      this.refreshToken = null;
      this.isAuthenticated = false;
      this.assistants = [];
      this.selectedAgent = null;
      this.selectedAgentId = null;
      this.loginForm.email = '';
      this.loginForm.password = '';
      this.loginError = '';
      console.log('Logged out successfully');
    },
    
    // 检查是否已登录
    checkAuthentication() {
      // 对于HttpOnly cookie，我们无法直接检查cookie
      // 但可以通过尝试调用需要认证的API来验证
      // 这里我们假设如果有accessToken或者之前登录成功过就认为已认证
      if (this.accessToken || this.isAuthenticated) {
        this.isAuthenticated = true;
        return true;
      }
      this.isAuthenticated = false;
      return false;
    },
    
    async fetchAgents() {
      if (!this.isAuthenticated) {
        console.warn('Not authenticated, cannot fetch agents');
        return;
      }
      
      this.isLoadingAgents = true;
      
      try {
        let baseUrl = '/api/user/resources/suggestion_assistant';
        
        if (this.assistantId) {
          baseUrl += `?assistant_id=${this.assistantId}`;
          
          if (this.userId && this.userId !== "null" && this.authorization && this.authorization !== "null") {
            baseUrl += `&user_id=${this.userId}&Authorization=${this.authorization}`;
          }
        }
        
        console.log('Fetching agents from:', baseUrl);
        
        // 构建请求配置
        const requestConfig = {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include' // 确保HttpOnly cookies被自动包含
        };
        
        // 如果有access_token作为备用，也添加到Cookie头中
        if (this.accessToken) {
          console.log('Adding authorization token to request');
          requestConfig.headers['Cookie'] = `AuthorizationToken=${this.accessToken}`;
        }
        
        const response = await fetch(baseUrl, requestConfig);
        
        if (!response.ok) {
          if (response.status === 401) {
            // Token过期，需要重新登录
            this.handleLogout();
            throw new Error('Authentication expired. Please login again.');
          }
          throw new Error(`Failed to fetch agents: ${response.status} ${response.statusText}`);
        }
        
        const result = await response.json();
        console.log('Agents response:', result);
        
        let agent = undefined;
        
        // Find specific agent if assistantId is provided
        if (this.assistantId && result.assistants) {
          agent = result.assistants.find(item => item.id == this.assistantId);
          console.log("Setting specific agent:", agent);
        }
        
        // Fallback to first agent if no specific agent found
        if (!agent && result.assistants && result.assistants.length > 0) {
          agent = result.assistants[0];
          console.log("Setting default agent:", agent);
        }
        
        if (agent) {
          // Process agent data similar to React version
          let avatar_url = agent.avatar_url;
          let description = agent.description;
          
          if (agent.asCharacterDefault) {
            avatar_url = agent.asCharacterDefault?.avatar_url;
            description = agent.asCharacterDefault.description;
          } else if (agent?.asModelDefault) {
            avatar_url = agent?.asModelDefault.space?.image_url;
          }
          
          const processedAgent = {
            ...agent,
            avatar_url,
            description
          };
          
          console.log("Chosen assistant:", processedAgent);
          
          this.assistants = result.assistants || [];
          this.selectedAgent = processedAgent;
          this.selectedAgentId = processedAgent.id;
        } else {
          console.warn('No agents available');
          this.assistants = [];
          this.selectedAgent = null;
        }
        
      } catch (error) {
        console.error('Error fetching agents:', error);
        this.assistants = [];
        this.selectedAgent = null;
        
        // 如果是认证错误，显示登录表单
        if (error.message.includes('Authentication expired')) {
          this.loginError = error.message;
        }
      } finally {
        this.isLoadingAgents = false;
      }
    },
    
    changeAgent() {
      const newAgent = this.assistants.find(agent => agent.id === this.selectedAgentId);
      if (newAgent) {
        console.log('Changing agent to:', newAgent);
        this.selectedAgent = newAgent;
        
        // Note: agent is always "common_agent" - no need to update it
        // Update CopilotKit configuration with new runtime URL only
        if (this.$copilotKit) {
          const context = this.$copilotKit.getContext();
          context.updateConfig({
            runtimeUrl: this.dynamicRuntimeUrl,
            properties: this.copilotProperties
          });
        }
      }
    },
    
    onCopilotKitMounted() {
      console.log('=== CopilotKit component mounted ===');
      console.log('CopilotKit is providing context now');
      
      // Add a small delay to ensure CustomChatInterface gets the context
      this.$nextTick(() => {
        console.log('CopilotKit context should be available to children now');
      });
    }
  },
  
  async mounted() {
    console.log('=== App mounted ===');
    console.log('1. CopilotKitProvider component should be available via plugin');
    console.log('2. Dynamic runtime URL:', this.dynamicRuntimeUrl);
    console.log('3. Selected agent:', this.selectedAgent);
    console.log('4. Should show CopilotKit:', !!(this.selectedAgent && this.selectedAgent.id && this.dynamicRuntimeUrl));
    
    // 检查是否已经登录
    if (this.checkAuthentication()) {
      console.log('5. Found existing authentication, fetching agents...');
      await this.fetchAgents();
    } else {
      console.log('5. No authentication found, showing login form');
    }
  }
};
</script>

<style>
/* Global styles for dynamic height */
html, body {
  height: 100%;
  margin: 0;
  padding: 0;
}

#app {
  min-height: 100vh;
  height: auto;
}

/* Login form styles */
.login-container {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  background: #f8f9fa;
  padding: 20px;
}

.login-form {
  background: white;
  padding: 40px;
  border-radius: 12px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
  width: 100%;
  max-width: 400px;
}

.login-form h2 {
  text-align: center;
  color: #2c3e50;
  margin-bottom: 10px;
  font-size: 1.8rem;
}

.login-form > p {
  text-align: center;
  color: #6c757d;
  margin-bottom: 30px;
  font-size: 0.9rem;
  line-height: 1.4;
}

.form-group {
  margin-bottom: 20px;
}

.form-group label {
  display: block;
  margin-bottom: 8px;
  color: #2c3e50;
  font-weight: 600;
  font-size: 0.9rem;
}

.form-input {
  width: 100%;
  padding: 12px 16px;
  border: 1px solid #ced4da;
  border-radius: 8px;
  font-size: 14px;
  color: #2c3e50;
  background: #fff;
  transition: border-color 0.2s, box-shadow 0.2s;
  box-sizing: border-box;
}

.form-input:focus {
  outline: none;
  border-color: #007bff;
  box-shadow: 0 0 0 2px rgba(0, 123, 255, 0.25);
}

.form-input:disabled {
  background: #f8f9fa;
  color: #6c757d;
  cursor: not-allowed;
}

.login-btn {
  width: 100%;
  padding: 12px 20px;
  background: #007bff;
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: background-color 0.2s;
  margin-bottom: 20px;
}

.login-btn:hover:not(:disabled) {
  background: #0056b3;
}

.login-btn:disabled {
  background: #6c757d;
  cursor: not-allowed;
}

.error-message {
  background: #f8d7da;
  color: #721c24;
  padding: 12px 16px;
  border-radius: 6px;
  border: 1px solid #f5c6cb;
  font-size: 0.9rem;
  text-align: center;
}

.app-container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 20px;
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

.app-header {
  text-align: center;
  margin-bottom: 40px;
  padding: 40px 0;
  background: white;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.header-content {
  position: relative;
}

.header-content h1 {
  color: #2c3e50;
  margin: 0 0 10px 0;
  font-size: 2.5rem;
}

.header-content p {
  color: #7f8c8d;
  margin: 0;
  font-size: 1.1rem;
}

.logout-btn {
  position: absolute;
  top: 0;
  right: 20px;
  background: #dc3545;
  color: white;
  border: none;
  padding: 8px 16px;
  border-radius: 6px;
  font-size: 14px;
  cursor: pointer;
  transition: background-color 0.2s;
}

.logout-btn:hover {
  background: #c82333;
}

.app-main {
  background: white;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  overflow: hidden;
  flex: 1;
  display: flex;
  flex-direction: column;
}

/* Loading styles */
.loading-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100vh;
  background: #f8f9fa;
}

.loading-spinner {
  width: 40px;
  height: 40px;
  border: 4px solid #e1e5e9;
  border-top: 4px solid #007bff;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-bottom: 20px;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

/* Agent selector styles */
.agent-selector {
  margin-top: 15px;
  padding: 15px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  backdrop-filter: blur(10px);
}

.agent-selector label {
  display: block;
  margin-bottom: 8px;
  font-weight: 600;
  color: #2c3e50;
}

.agent-select {
  width: 100%;
  padding: 8px 12px;
  border: 1px solid #ced4da;
  border-radius: 6px;
  background: white;
  font-size: 14px;
  color: #2c3e50;
}

.agent-select:focus {
  outline: none;
  border-color: #007bff;
  box-shadow: 0 0 0 2px rgba(0, 123, 255, 0.25);
}

/* Error container styles */
.error-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100vh;
  background: #f8f9fa;
  text-align: center;
  padding: 40px;
}

.error-container h2 {
  color: #dc3545;
  margin-bottom: 15px;
}

.error-container p {
  color: #6c757d;
  margin-bottom: 25px;
  font-size: 1.1rem;
}

.retry-btn {
  background: #007bff;
  color: white;
  border: none;
  padding: 12px 24px;
  border-radius: 6px;
  font-size: 16px;
  cursor: pointer;
  transition: background-color 0.2s;
  margin-right: 10px;
}

.retry-btn:hover {
  background: #0056b3;
}
</style>
