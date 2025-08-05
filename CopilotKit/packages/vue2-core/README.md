# CopilotKit Vue2 Core

CopilotKit Vue2 Core 是专为 Vue 2 应用程序设计的 AI 聊天和智能助手集成库。它提供了完整的聊天界面、CoAgent 状态管理以及与 CopilotKit 运行时的集成功能。

## 特性

- 🤖 **完整的聊天界面** - 开箱即用的聊天组件和混入
- 🔄 **CoAgent 状态管理** - 实时同步的代理状态
- 📝 **Markdown 支持** - 自动渲染 Markdown 格式的消息
- 🎯 **Vue 2 兼容** - 完全兼容 Vue 2.x 版本
- 💡 **推理内容显示** - 支持显示 AI 的思考过程
- 📊 **日志监控** - 实时显示代理活动日志
- 🛠️ **TypeScript 支持** - 完整的类型定义

## 安装

```bash
npm install @turbo-agent/copilotkit-vue2-core
# 或
yarn add @turbo-agent/copilotkit-vue2-core
# 或
pnpm add @turbo-agent/copilotkit-vue2-core
```

## 快速开始

### 1. 安装插件

```js
// main.js
import Vue from 'vue'
import CopilotKitPlugin from '@turbo-agent/copilotkit-vue2-core'

Vue.use(CopilotKitPlugin)
```

### 2. 基础聊天界面

```vue
<template>
  <div id="app">
    <CopilotKitProvider runtime-url="/copilotkit" agent="common_agent">
      <BasicChatInterface />
    </CopilotKitProvider>
  </div>
</template>

<script>
import { CopilotKitProvider, ChatMixin } from '@turbo-agent/copilotkit-vue2-core'

// 基础聊天组件
const BasicChatInterface = {
  name: 'BasicChatInterface',
  mixins: [ChatMixin],
  
  data() {
    return {
      currentMessage: ''
    }
  },
  
  template: `
    <div class="chat-container">
      <!-- 消息列表 -->
      <div class="messages">
        <div 
          v-for="message in visibleMessages" 
          :key="message.id"
          :class="['message', 'message-' + message.role]"
        >
          <div class="message-content">
            <strong>{{ message.role }}:</strong>
            <div v-html="message.content"></div>
          </div>
        </div>
        
        <!-- 加载指示器 -->
        <div v-if="isLoading" class="loading">
          AI 正在思考中...
        </div>
      </div>
      
      <!-- 输入区域 -->
      <div class="input-area">
        <input 
          v-model="currentMessage"
          @keydown.enter="handleSend"
          :disabled="isLoading"
          placeholder="输入消息..."
        />
        <button @click="handleSend" :disabled="!currentMessage.trim() || isLoading">
          发送
        </button>
      </div>
    </div>
  `,
  
  methods: {
    handleSend() {
      if (this.currentMessage.trim()) {
        this.sendMessage(this.currentMessage)
        this.currentMessage = ''
      }
    }
  }
}

export default {
  components: {
    CopilotKitProvider,
    BasicChatInterface
  }
}
</script>
```

## 核心组件

### CopilotKitProvider

CopilotKit 的根提供者组件，为子组件提供聊天上下文。

```vue
<template>
  <CopilotKitProvider 
    :runtime-url="runtimeUrl"
    :agent="agentName"
    :properties="copilotProperties"
    @hook:mounted="onProviderMounted"
  >
    <YourChatComponent />
  </CopilotKitProvider>
</template>

<script>
export default {
  data() {
    return {
      runtimeUrl: '/copilotkit',
      agentName: 'common_agent',
      copilotProperties: {
        // 可选的配置属性
      }
    }
  },
  
  methods: {
    onProviderMounted() {
      console.log('CopilotKit Provider 已挂载')
    }
  }
}
</script>
```

### ChatMixin

提供完整聊天功能的混入，包含消息管理、发送、加载状态等。

```vue
<script>
import { ChatMixin, TextMessage, Role } from '@turbo-agent/copilotkit-vue2-core'

export default {
  name: 'MyChatComponent',
  mixins: [ChatMixin],
  
  data() {
    return {
      userInput: ''
    }
  },
  
  computed: {
    // ChatMixin 提供的计算属性：
    // - copilotContext: CopilotKit 上下文
    // - visibleMessages: 可见的消息列表
    // - isLoading: 加载状态
    // - chatInitialized: 聊天是否已初始化
  },
  
  methods: {
    // ChatMixin 提供的方法：
    // - sendMessage(content): 发送消息
    // - appendMessage(message): 添加消息
    // - deleteMessage(messageId): 删除消息
    // - reloadMessages(): 重新加载消息
    // - stopGeneration(): 停止生成
    
    async handleUserMessage() {
      if (this.userInput.trim()) {
        await this.sendMessage(this.userInput)
        this.userInput = ''
      }
    },
    
    addSystemMessage() {
      this.appendMessage(new TextMessage({
        content: '这是一条系统消息',
        role: Role.System
      }))
    }
  }
}
</script>
```

## CoAgent 状态管理

### useCoAgent Hook

用于管理 CoAgent 状态的核心 Hook。

```vue
<template>
  <div class="coagent-demo">
    <h3>CoAgent 状态管理</h3>
    
    <!-- 状态显示 -->
    <div class="state-display">
      <p>代理状态: {{ agentRunning ? '运行中' : '已停止' }}</p>
      <p>计数器: {{ agentState.count || 0 }}</p>
      <p>语言: {{ agentState.language || '未设置' }}</p>
      <p>消息: {{ agentState.message || '无' }}</p>
    </div>
    
    <!-- 控制按钮 -->
    <div class="controls">
      <button @click="startAgent" :disabled="agentRunning">启动代理</button>
      <button @click="stopAgent" :disabled="!agentRunning">停止代理</button>
      <button @click="runAgent" :disabled="!agentRunning">执行代理</button>
    </div>
    
    <!-- 状态更新 -->
    <div class="state-controls">
      <input v-model="newCount" type="number" placeholder="新计数值" />
      <button @click="updateCount">更新计数</button>
      
      <input v-model="newMessage" placeholder="新消息" />
      <button @click="updateMessage">更新消息</button>
    </div>
  </div>
</template>

<script>
import { useCoAgent } from '@turbo-agent/copilotkit-vue2-core'

export default {
  name: 'CoAgentDemo',
  
  data() {
    return {
      coAgent: null,
      newCount: 0,
      newMessage: ''
    }
  },
  
  computed: {
    agentState() {
      return this.coAgent ? this.coAgent.state : {}
    },
    
    agentRunning() {
      return this.coAgent ? this.coAgent.running : false
    }
  },
  
  created() {
    // 初始化 CoAgent
    this.coAgent = useCoAgent({
      name: 'demo-agent',
      initialState: {
        count: 0,
        language: 'zh-CN',
        message: '欢迎使用 CoAgent'
      }
    }, this)
  },
  
  methods: {
    startAgent() {
      if (this.coAgent && this.coAgent.start) {
        this.coAgent.start()
      }
    },
    
    stopAgent() {
      if (this.coAgent && this.coAgent.stop) {
        this.coAgent.stop()
      }
    },
    
    runAgent() {
      if (this.coAgent && this.coAgent.run) {
        this.coAgent.run()
      }
    },
    
    updateCount() {
      if (this.coAgent && this.coAgent.setState) {
        this.coAgent.setState({
          count: parseInt(this.newCount)
        })
      }
    },
    
    updateMessage() {
      if (this.coAgent && this.coAgent.setState) {
        this.coAgent.setState({
          message: this.newMessage
        })
        this.newMessage = ''
      }
    }
  }
}
</script>
```

## 高级聊天界面

### 带推理内容和日志的完整聊天界面

```vue
<template>
  <div class="advanced-chat">
    <!-- 消息容器 -->
    <div class="messages-container" ref="messagesContainer">
      <div 
        v-for="message in visibleMessages" 
        :key="message.id"
        :class="['message', `message-${message.role}`]"
      >
        <div class="message-content">
          <div class="message-role">{{ formatRole(message.role) }}</div>
          
          <!-- 推理内容（AI 的思考过程） -->
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
              <span class="reasoning-label">思考过程</span>
              <span class="reasoning-arrow">{{ expandedReasonings[message.id] ? '▼' : '▶' }}</span>
            </div>
            
            <div 
              v-show="expandedReasonings[message.id]" 
              class="reasoning-content"
            >
              <div class="reasoning-text">{{ message.reasoningContent }}</div>
            </div>
          </div>
          
          <!-- 消息内容（支持 Markdown） -->
          <div 
            class="message-text markdown-content"
            v-html="renderMarkdown(message.content)"
          ></div>
        </div>
        
        <button 
          @click="deleteMessage(message.id)"
          class="delete-btn"
          title="删除消息"
        >
          ×
        </button>
      </div>
      
      <!-- 加载指示器和日志 -->
      <div v-if="isLoading" class="loading-indicator">
        <div class="loading-content">
          <div class="loading-dots">
            <span></span><span></span><span></span>
          </div>
          <span>AI 正在思考中...</span>
        </div>
        
        <!-- 实时日志显示 -->
        <div v-if="getCurrentCoAgentLogs().length > 0" class="loading-logs">
          <div class="logs-header">
            <span class="logs-icon">📋</span>
            <span class="logs-title">代理活动</span>
          </div>
          <div class="logs-container">
            <div 
              v-for="(log, index) in getCurrentCoAgentLogs()" 
              :key="index"
              :class="['log-entry', `log-${log.level || 'info'}`]"
            >
              <span class="log-timestamp">{{ formatTimestamp(log.timestamp) }}</span>
              <span class="log-message">{{ log.message }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
    
    <!-- 输入区域 -->
    <div class="input-area">
      <div class="input-group">
        <textarea
          v-model="currentMessage"
          @keydown.enter.prevent="handleSendMessage"
          :disabled="isLoading"
          placeholder="输入您的消息... (按 Enter 发送)"
          class="message-input"
          rows="3"
        ></textarea>
        <div class="input-actions">
          <button 
            @click="handleSendMessage"
            :disabled="!currentMessage.trim() || isLoading"
            class="send-btn"
          >
            发送
          </button>
          <button 
            @click="reloadMessages"
            :disabled="isLoading"
            class="reload-btn"
          >
            重新加载
          </button>
          <button 
            @click="stopGeneration"
            :disabled="!isLoading"
            class="stop-btn"
          >
            停止
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { ChatMixin, useCoAgent } from '@turbo-agent/copilotkit-vue2-core'
import { marked } from 'marked'

export default {
  name: 'AdvancedChatInterface',
  mixins: [ChatMixin],
  
  data() {
    return {
      currentMessage: '',
      expandedReasonings: {},
      coAgent: null
    }
  },
  
  created() {
    // 初始化 CoAgent 用于日志监控
    this.coAgent = useCoAgent({
      name: 'common_agent',
      initialState: { initialized: true }
    }, this)
  },
  
  methods: {
    handleSendMessage() {
      if (this.currentMessage.trim() && !this.isLoading) {
        this.sendMessage(this.currentMessage)
        this.currentMessage = ''
      }
    },
    
    toggleReasoning(messageId) {
      this.$set(this.expandedReasonings, messageId, !this.expandedReasonings[messageId])
    },
    
    formatRole(role) {
      const roleMap = {
        'user': '用户',
        'assistant': '助手',
        'system': '系统'
      }
      return roleMap[role] || role
    },
    
    renderMarkdown(content) {
      if (!content) return ''
      try {
        marked.setOptions({
          breaks: true,
          gfm: true,
          headerIds: false,
          mangle: false
        })
        return marked(content)
      } catch (error) {
        console.error('Markdown 渲染错误:', error)
        return content.replace(/\n/g, '<br>')
      }
    },
    
    formatTimestamp(timestamp) {
      if (!timestamp) return ''
      const date = new Date(timestamp)
      return date.toLocaleTimeString()
    },
    
    getCurrentCoAgentLogs() {
      try {
        if (!this.copilotContext || !this.copilotContext.coagentStatesRef) {
          return []
        }
        
        const agentName = 'common_agent'
        const agentState = this.copilotContext.coagentStatesRef.current?.[agentName]
        
        if (!agentState) return []
        
        // 查找日志数据
        let logs = agentState.logs
        if (!logs && agentState.state && agentState.state.logs) {
          logs = agentState.state.logs
        }
        
        if (!logs || !Array.isArray(logs)) return []
        
        return logs.slice(-5) // 返回最近的5条日志
      } catch (error) {
        console.error('获取 CoAgent 日志错误:', error)
        return []
      }
    }
  }
}
</script>
```

## 上下文测试组件

用于检测 CopilotKit 上下文是否正常工作：

```vue
<template>
  <div class="context-test">
    <h3>上下文状态检测</h3>
    <div class="status">
      <div :class="['status-item', contextAvailable ? 'success' : 'error']">
        上下文可用性: {{ contextAvailable ? '✅ 可用' : '❌ 不可用' }}
      </div>
      <div v-if="contextAvailable" class="context-details">
        <div>上下文类型: {{ typeof copilotContext }}</div>
        <div>API 配置: {{ hasApiConfig ? '✅ 已配置' : '❌ 未配置' }}</div>
        <div>API 端点: {{ apiEndpoint }}</div>
        <div>可用功能: {{ contextKeys.join(', ') }}</div>
      </div>
    </div>
  </div>
</template>

<script>
import { COPILOT_CONTEXT_KEY } from '@turbo-agent/copilotkit-vue2-core'

export default {
  name: 'ContextTest',
  
  inject: {
    copilotContextProvider: {
      from: COPILOT_CONTEXT_KEY,
      default() {
        return () => null
      }
    }
  },
  
  computed: {
    copilotContext() {
      if (typeof this.copilotContextProvider === 'function') {
        try {
          return this.copilotContextProvider()
        } catch (error) {
          console.error('获取上下文失败:', error)
          return null
        }
      }
      return this.copilotContextProvider
    },
    
    contextAvailable() {
      return this.copilotContext !== null && this.copilotContext !== undefined
    },
    
    hasApiConfig() {
      return !!(this.copilotContext && this.copilotContext.copilotApiConfig)
    },
    
    apiEndpoint() {
      return this.copilotContext?.copilotApiConfig?.chatApiEndpoint || '未配置'
    },
    
    contextKeys() {
      return this.copilotContext ? Object.keys(this.copilotContext) : []
    }
  }
}
</script>
```

## API 参考

### CopilotKitProvider Props

| 属性 | 类型 | 默认值 | 描述 |
|------|------|--------|------|
| `runtime-url` | `string` | 必需 | CopilotKit 运行时服务的 URL |
| `agent` | `string` | 必需 | 代理名称 |
| `properties` | `object` | `{}` | 额外的配置属性 |

### ChatMixin 提供的属性和方法

#### 计算属性
- `copilotContext` - CopilotKit 上下文对象
- `visibleMessages` - 过滤后的可见消息列表
- `isLoading` - 当前是否正在加载
- `chatInitialized` - 聊天是否已初始化

#### 方法
- `sendMessage(content: string)` - 发送消息
- `appendMessage(message: Message)` - 添加消息到列表
- `deleteMessage(messageId: string)` - 删除指定消息
- `reloadMessages()` - 重新加载所有消息
- `stopGeneration()` - 停止当前的消息生成

### useCoAgent 选项

```typescript
interface UseCoagentOptions {
  name: string                    // 代理名称
  initialState?: object          // 初始状态
  onStateChange?: (state) => void // 状态变化回调
}
```

### useCoAgent 返回值

```typescript
interface CoAgentInstance {
  name: string                   // 代理名称
  state: object                 // 当前状态
  running: boolean              // 是否运行中
  nodeName?: string            // 节点名称
  threadId?: string            // 线程 ID
  start(): void                // 启动代理
  stop(): void                 // 停止代理
  run(): void                  // 执行代理
  setState(newState: object): void // 更新状态
}
```

## 样式指南

建议使用以下 CSS 类来美化您的聊天界面：

```css
/* 消息样式 */
.message {
  display: flex;
  margin-bottom: 16px;
  gap: 10px;
}

.message-user .message-content {
  background: #007bff;
  color: white;
  margin-left: auto;
}

.message-assistant .message-content {
  background: #f8f9fa;
  color: #2c3e50;
}

.message-content {
  flex: 1;
  padding: 12px 16px;
  border-radius: 12px;
  border: 1px solid #e1e5e9;
}

/* 加载指示器 */
.loading-indicator {
  padding: 16px;
  background: rgba(0, 123, 255, 0.02);
  border: 1px solid rgba(0, 123, 255, 0.1);
  border-radius: 8px;
  margin-top: 16px;
}

/* 日志样式 */
.log-entry {
  display: flex;
  gap: 8px;
  padding: 4px 8px;
  margin-bottom: 4px;
  border-radius: 4px;
  font-size: 12px;
}

.log-entry.log-info {
  background: rgba(0, 123, 255, 0.05);
  border-left: 3px solid #007bff;
}

.log-entry.log-error {
  background: rgba(220, 53, 69, 0.05);
  border-left: 3px solid #dc3545;
}
```

## 故障排除

### 常见问题

1. **上下文不可用**
   - 确保在 `main.js` 中正确安装了插件
   - 检查 `CopilotKitProvider` 是否正确包装了您的组件

2. **消息不显示**
   - 验证 `runtime-url` 是否正确
   - 检查网络连接和后端服务状态

3. **CoAgent 状态不同步**
   - 确保代理名称在前端和后端保持一致
   - 检查代理是否正确启动

4. **日志不显示**
   - 确保后端正确发送日志数据
   - 检查 `getCurrentCoAgentLogs` 方法的日志路径

### 调试技巧

启用调试模式以查看详细信息：

```js
// 在组件中添加调试信息
mounted() {
  console.log('CopilotContext:', this.copilotContext)
  console.log('Messages:', this.visibleMessages)
  console.log('CoAgent State:', this.coAgent?.state)
}
```

## 许可证

MIT License

## 贡献

欢迎提交 Issue 和 Pull Request 来改进这个库！

---

更多详细信息和高级用法，请参考 [CopilotKit 官方文档](https://github.com/CopilotKit/CopilotKit)。
