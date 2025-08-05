# Vue2 CopilotKit Real Integration

This document explains the real CopilotKit integration implementation, replacing the previous mock implementation.

## Overview

The `CustomChatInterface.vue` component now uses actual CopilotKit functionality through:

1. **CopilotChatMixin**: A Vue2 mixin that provides chat functionality similar to React's `useCopilotChat` hook
2. **Real API Integration**: Connects to actual CopilotKit runtime endpoints
3. **Authentication Support**: Includes token-based authentication with cookie headers
4. **Streaming Support**: Handles both streaming and JSON API responses

## Architecture

### CopilotChatMixin (`src/mixins/copilot-chat-mixin.js`)

This mixin provides the core chat functionality:

**Data Properties:**
- `chatMessages`: Array of chat messages
- `chatLoading`: Loading state
- `chatAbortController`: For canceling requests
- `chatInitialized`: Initialization status

**Key Methods:**
- `initializeChat()`: Initialize chat with CopilotKit context
- `sendChatMessage(content, options)`: Send message to API
- `appendChatMessage(message)`: Add message to chat
- `stopChatGeneration()`: Cancel ongoing requests
- `handleStreamingChatResponse(response)`: Process streaming responses

### CustomChatInterface Component

The component now uses the mixin and provides:

**Template Compatibility:**
- Maps mixin properties to expected template variables
- `visibleMessages` → `chatMessages`
- `isLoading` → `chatLoading`

**Real Functionality:**
- Actual API requests to CopilotKit runtime
- Authentication header inclusion
- Error handling and fallbacks
- Action registration and management

## API Integration

### Request Format

The integration sends requests to the CopilotKit runtime with this structure:

```javascript
{
  messages: [
    { id: "msg_id", role: "user", content: "Hello" },
    { id: "msg_id", role: "assistant", content: "Hi there!" }
  ],
  actions: [], // Available CopilotKit actions
  agent: "agent_name_id", // Current agent
  threadId: "thread_id", // Conversation thread
  runId: "run_id" // Current run
}
```

### Authentication

Requests include authentication through:

1. **Cookie Header**: `Cookie: AuthorizationToken=${accessToken}`
2. **Credentials**: `credentials: 'include'` for HttpOnly cookies
3. **Custom Headers**: From CopilotKit API config

### Response Handling

The integration supports multiple response formats:

**Streaming Response:**
```
Content-Type: text/plain
Body: [streaming text chunks]
```

**JSON Response:**
```json
{
  "message": "Assistant response",
  "choices": [{"message": {"content": "OpenAI format"}}],
  "messages": [{"content": "Multiple messages"}]
}
```

## Usage Example

```vue
<template>
  <CustomChatInterface 
    :agent="selectedAgent"
    :runtime-url="dynamicRuntimeUrl"
  />
</template>

<script>
import CustomChatInterface from './components/CustomChatInterface.vue';

export default {
  components: { CustomChatInterface },
  data() {
    return {
      selectedAgent: { name_id: 'my-agent', name: 'My Agent' },
      dynamicRuntimeUrl: '/api/copilotkit/agent_id'
    };
  }
};
</script>
```

## Features

### 1. Real-time Messaging
- Send user messages to CopilotKit runtime
- Receive assistant responses
- Support for streaming responses
- Message history management

### 2. Action Integration
- Register CopilotKit actions
- Actions are included in API requests
- Automatic cleanup on component destroy

### 3. Agent Support
- Agent information passed to API
- Dynamic agent switching
- Agent-specific configurations

### 4. Error Handling
- Network error recovery
- API error messages
- Request cancellation
- Fallback responses

### 5. Authentication
- Token-based authentication
- Cookie support for HttpOnly tokens
- Credential inclusion for cross-origin requests

## Configuration

### Environment Variables

```bash
# Backend API base path
VUE_APP_BASE_PATH=https://your-api-domain.com
```

### CopilotKit Provider Setup

```vue
<CopilotKitProvider 
  :runtime-url="dynamicRuntimeUrl"
  :agent="selectedAgent.name_id"
  :properties="copilotProperties"
>
  <CustomChatInterface :agent="selectedAgent" />
</CopilotKitProvider>
```

## Debugging

### Console Logs

The implementation includes detailed logging:

```javascript
console.log('Chat initialized with context:', this.copilotContext);
console.log('Sending chat request to:', endpoint);
console.log('Demo action registered');
```

### Debug Information

The component provides a debug panel showing:
- Message count
- Loading state
- CopilotKit context availability
- Chat initialization status
- API configuration status

## Comparison with React Implementation

| Feature | React (`useCopilotChat`) | Vue2 (Mixin) |
|---------|-------------------------|---------------|
| State Management | React hooks | Vue data properties |
| Lifecycle | useEffect | Vue lifecycle hooks |
| API Calls | fetch with hooks | fetch with methods |
| Streaming | Async iterators | ReadableStream |
| Actions | useAction hook | Context methods |
| Cleanup | useEffect cleanup | beforeDestroy |

## Testing

### Manual Testing Steps

1. **Start Development Server:**
   ```bash
   cd packages/vue2-example
   npm run dev
   ```

2. **Login and Select Agent:**
   - Enter credentials in login form
   - Select an agent from the dropdown

3. **Test Chat Functionality:**
   - Send a message: "Hello, how are you?"
   - Verify API request in Network tab
   - Check for proper authentication headers
   - Confirm assistant response appears

4. **Test Error Handling:**
   - Disconnect network
   - Send a message
   - Verify error message appears

### Backend Requirements

Your CopilotKit runtime should:

1. **Accept POST requests** to the chat endpoint
2. **Handle authentication** via Cookie or Authorization headers
3. **Return responses** in JSON or streaming format
4. **Support CORS** for browser requests
5. **Process actions** included in requests

## Troubleshooting

### Common Issues

**1. "Chat context not available"**
- Ensure CopilotKitProvider wraps the component
- Check console for CopilotKit initialization errors

**2. "API request failed: 401"**
- Verify authentication token is valid
- Check cookie header format
- Confirm backend accepts the authentication method

**3. "No assistant response"**
- Check network tab for API request/response
- Verify backend is returning proper response format
- Look for parsing errors in console

**4. Streaming not working**
- Confirm backend sends `Content-Type: text/plain`
- Check if ReadableStream is supported
- Verify network doesn't buffer the response

### Debug Commands

```javascript
// Check CopilotKit context
console.log(this.$copilotKit.getContext());

// Check API configuration
console.log(this.chatApiConfig);

// Check authentication
console.log(this.$parent.accessToken);

// Check current messages
console.log(this.chatMessages);
```

## Next Steps

1. **Test with Real Backend**: Connect to your actual CopilotKit runtime
2. **Add More Actions**: Register additional CopilotKit actions
3. **Enhance Error Handling**: Add retry logic and better error messages
4. **Optimize Performance**: Implement message pagination and caching
5. **Add Features**: Include file upload, message reactions, or typing indicators
