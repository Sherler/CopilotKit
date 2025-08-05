# Vue2 CopilotKit Authentication Implementation

## 实现功能

### 1. 登录认证流程
- 用户输入email和password
- 调用 `${basePath}/api/v2/user/auth_token/get_token` API获取token
- 将access_token和refresh_token保存在Vue组件的data对象中（**不使用localStorage**）
- 登录成功后自动获取agent列表

### 2. Token管理
- **Token存储**: 保存在Vue组件的data属性中
  ```javascript
  data() {
    return {
      accessToken: null,
      refreshToken: null,
      // ...
    }
  }
  ```

- **Token使用**: 在获取agent列表时，在Cookie头中添加AuthorizationToken
  ```javascript
  headers: {
    'Content-Type': 'application/json',
    'Cookie': `AuthorizationToken=${this.accessToken}`
  },
  credentials: 'include'
  ```

### 3. Agent列表获取
- 需要先完成登录认证
- 使用access_token作为AuthorizationToken在cookies中发送
- 支持按assistant_id筛选特定agent
- 自动处理agent数据（avatar、description等）

### 4. 状态管理
- `isAuthenticated`: 认证状态
- `isLoggingIn`: 登录过程状态
- `isLoadingAgents`: 加载agent状态
- `loginError`: 登录错误信息

### 5. UI组件
- **登录表单**: email/password输入，提交按钮
- **加载状态**: 登录和获取agent时的loading界面
- **Agent选择器**: 多个agent时显示下拉选择
- **错误处理**: 登录失败、token过期等错误提示

## 使用方法

### 环境配置
在 `.env.local` 中设置：
```bash
VUE_APP_BASE_PATH=http://your-backend-url
```

### URL参数支持
- `assistant_id`: 指定特定的assistant
- `user_id`: 用户ID
- `mode`: 模式设置
- `model`: 模型设置

示例URL：
```
http://localhost:8081?assistant_id=123&user_id=456&mode=production
```

## API调用流程

1. **登录认证**
   ```
   POST ${basePath}/api/v2/user/auth_token/get_token
   Body: { email, password }
   Response: { access_token, refresh_token }
   ```

2. **获取Agent列表**
   ```
   GET ${basePath}/api/user/resources/suggestion_assistant
   Headers: Cookie: AuthorizationToken=${access_token}
   Response: { assistants: [...] }
   ```

3. **动态RuntimeURL构建**
   ```
   ${basePath}/api/copilotkit/${agent.id}?Authorization=${Authorization}&user_id=${user_id}
   ```

## 安全特性

- ✅ Token不存储在localStorage中
- ✅ 每次刷新页面需要重新登录
- ✅ Token过期自动退出到登录页面
- ✅ 支持手动登出清除所有状态
- ✅ 错误处理和用户反馈

## 与React版本的对应关系

| React 功能 | Vue2 实现 |
|------------|-----------|
| `useEffect(() => {...}, [])` | `mounted()` |
| `useState(...)` | `data() { return {...} }` |
| `fetch()` in useEffect | `methods: { async fetchAgents() {...} }` |
| localStorage | Vue data属性 |
| Context Provider | CopilotKitProvider组件 |
| Props传递 | Vue props |

这样实现确保了与原React版本功能的完全一致性，同时符合Vue2的最佳实践。
