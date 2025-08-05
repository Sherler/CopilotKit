# Vue2 Example 代理配置说明

## 问题描述

在前端直接请求外部 API（如 `http://localhost:3000`）时会遇到 CORS（跨域资源共享）问题。为了解决这个问题，我们配置了 webpack dev server 代理，使前端请求同域名服务，然后代理转发到相应的后端接口。

## 代理配置

### Webpack 配置 (`webpack.config.js`)

```javascript
devServer: {
  static: './dist',
  hot: true,
  port: 8081,
  proxy: {
    // 代理所有 /api 请求到后端
    '/api': {
      target: env.PROXY_API_TARGET || 'http://localhost:3000',
      changeOrigin: true,
      secure: false,
      logLevel: 'debug',
      onProxyReq: (proxyReq, req, res) => {
        console.log(`[PROXY] ${req.method} ${req.url} -> ${proxyReq.path}`);
      },
      onError: (err, req, res) => {
        console.error('[PROXY ERROR]', err.message);
      }
    },
    // 代理 CopilotKit runtime 请求
    '/copilotkit': {
      target: env.PROXY_COPILOT_TARGET || 'http://localhost:3000',
      changeOrigin: true,
      secure: false,
      logLevel: 'debug',
      pathRewrite: {
        '^/copilotkit': '/api/copilotkit' // 重写路径
      },
      onProxyReq: (proxyReq, req, res) => {
        console.log(`[COPILOT PROXY] ${req.method} ${req.url} -> ${proxyReq.path}`);
      },
      onError: (err, req, res) => {
        console.error('[COPILOT PROXY ERROR]', err.message);
      }
    }
  },
}
```

### 环境变量配置 (`.env.local`)

```bash
# 前端使用的路径（相对路径，通过代理）
VUE_APP_BASE_PATH=
VUE_APP_COPILOT_RUNTIME_URL=/copilotkit
VUE_APP_COPILOT_AGENT=common_agent

# 代理目标服务器地址
PROXY_API_TARGET=http://localhost:3000
PROXY_COPILOT_TARGET=http://localhost:3000
```

## 路径映射

### 认证 API 路径映射

| 前端请求路径 | 代理目标 | 最终后端路径 |
|-------------|----------|-------------|
| `/api/v2/user/auth_token/get_token` | `http://localhost:3000` | `/api/v2/user/auth_token/get_token` |
| `/api/user/resources/suggestion_assistant` | `http://localhost:3000` | `/api/user/resources/suggestion_assistant` |

### CopilotKit API 路径映射

| 前端请求路径 | 代理目标 | 路径重写 | 最终后端路径 |
|-------------|----------|----------|-------------|
| `/copilotkit/agent_123` | `http://localhost:3000` | `^/copilotkit` → `/api/copilotkit` | `/api/copilotkit/agent_123` |
| `/copilotkit/common_agent` | `http://localhost:3000` | `^/copilotkit` → `/api/copilotkit` | `/api/copilotkit/common_agent` |

## 代码修改

### App.vue 修改

**之前（直接请求外部 URL）:**
```javascript
// 登录 API
const response = await fetch(`${this.basePath}/api/v2/user/auth_token/get_token`, {

// 获取代理 API  
let baseUrl = `${this.basePath}/api/user/resources/suggestion_assistant`;

// CopilotKit Runtime URL
dynamicRuntimeUrl() {
  return `${this.basePath}/api/copilotkit/${this.selectedAgent.id}`;
}
```

**之后（使用代理路径）:**
```javascript
// 登录 API
const response = await fetch('/api/v2/user/auth_token/get_token', {

// 获取代理 API
let baseUrl = '/api/user/resources/suggestion_assistant';

// CopilotKit Runtime URL
dynamicRuntimeUrl() {
  return `/copilotkit/${this.selectedAgent.id}`;
}
```

## 工作流程

### 1. 认证流程
```
浏览器 -> POST /api/v2/user/auth_token/get_token 
       -> webpack proxy 
       -> http://localhost:3000/api/v2/user/auth_token/get_token
```

### 2. 获取代理列表
```
浏览器 -> GET /api/user/resources/suggestion_assistant
       -> webpack proxy 
       -> http://localhost:3000/api/user/resources/suggestion_assistant
```

### 3. CopilotKit 聊天
```
浏览器 -> POST /copilotkit/agent_123
       -> webpack proxy + pathRewrite 
       -> http://localhost:3000/api/copilotkit/agent_123
```

## 调试功能

### 代理日志

webpack 代理配置包含详细的日志记录：

```javascript
onProxyReq: (proxyReq, req, res) => {
  console.log(`[PROXY] ${req.method} ${req.url} -> ${proxyReq.path}`);
},
onError: (err, req, res) => {
  console.error('[PROXY ERROR]', err.message);
}
```

### 浏览器调试

1. **Network 标签**: 查看请求路径，应该显示相对路径（如 `/api/...`, `/copilotkit/...`）
2. **Console 日志**: 查看代理日志输出
3. **Response Headers**: 确认没有 CORS 错误

## 生产环境配置

### 方案 1: Nginx 代理

```nginx
server {
    listen 80;
    server_name your-domain.com;
    
    # 前端静态文件
    location / {
        root /path/to/dist;
        try_files $uri $uri/ /index.html;
    }
    
    # API 代理
    location /api/ {
        proxy_pass http://backend-server:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
    
    # CopilotKit 代理
    location /copilotkit/ {
        rewrite ^/copilotkit/(.*) /api/copilotkit/$1 break;
        proxy_pass http://backend-server:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

### 方案 2: 更新环境变量

生产环境中，可以配置环境变量指向同域名：

```bash
# 生产环境 .env.production
VUE_APP_BASE_PATH=
VUE_APP_COPILOT_RUNTIME_URL=/copilotkit
```

## 测试验证

### 启动开发服务器

```bash
cd packages/vue2-example
npm run dev
```

### 验证步骤

1. **打开浏览器**: `http://localhost:8081`
2. **检查 Network 标签**: 确认请求路径为相对路径
3. **查看控制台**: 确认代理日志正常输出
4. **测试登录**: 验证认证 API 工作正常
5. **测试聊天**: 验证 CopilotKit API 工作正常

### 预期结果

- ✅ 无 CORS 错误
- ✅ 认证请求成功
- ✅ 代理列表加载成功  
- ✅ 聊天功能正常工作
- ✅ 代理日志显示正确的路径转换

## 故障排除

### 常见问题

1. **仍有 CORS 错误**
   - 检查是否还有硬编码的外部 URL
   - 确认代理配置正确加载

2. **代理不工作**
   - 检查 `.env.local` 文件配置
   - 重启开发服务器
   - 查看控制台错误信息

3. **认证失败**
   - 确认后端服务器运行正常
   - 检查代理目标地址正确

4. **CopilotKit 请求失败**
   - 检查路径重写规则
   - 确认后端支持重写后的路径
