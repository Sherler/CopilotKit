# Vue2 CopilotKit Example

This is a demonstration project showing how to integrate CopilotKit with Vue 2 applications using the `@turbo-agent/copilotkit-vue2-core` package.

## Features

- Vue 2.7.16 with CopilotKit integration
- Custom chat interface demonstrating Vue2 patterns
- Mock AI assistant responses
- Action registration and handling
- Context management using Vue 2 provide/inject

## Project Structure

```
vue2-example/
├── src/
│   ├── components/
│   │   └── CustomChatInterface.vue  # Main chat component
│   ├── App.vue                      # Root component
│   └── main.js                      # Entry point with CopilotKit setup
├── public/
│   └── index.html                   # HTML template
├── webpack.config.js                # Webpack configuration
├── .babelrc                         # Babel configuration
└── package.json                     # Dependencies and scripts
```

## Installation

## Installation

1. Install dependencies:
```bash
pnpm install
```

2. Configure environment variables:
```bash
# Copy the example environment file
cp .env.example .env.local

# Edit .env.local with your configuration
# VUE_APP_COPILOT_RUNTIME_URL=http://localhost:3000/api/copilotkit
# VUE_APP_COPILOT_AGENT=your_agent_name
# VUE_APP_COPILOT_PUBLIC_API_KEY=your-api-key (optional)
```

3. Start the development server:
```bash
pnpm dev
```

4. Open your browser to `http://localhost:8081`

## Environment Configuration

The Vue2 example supports configuration through environment variables:

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `VUE_APP_COPILOT_RUNTIME_URL` | URL of your CopilotKit backend | `/api/copilotkit` | Yes* |
| `VUE_APP_COPILOT_AGENT` | Agent name to use | `sample_agent` | No |
| `VUE_APP_COPILOT_PUBLIC_API_KEY` | Public API key for CopilotKit Cloud | - | Yes* |

*Either `VUE_APP_COPILOT_RUNTIME_URL` or `VUE_APP_COPILOT_PUBLIC_API_KEY` is required.

### Environment Files

- `.env.example` - Template file with all available options
- `.env.local` - Local development configuration (gitignored)
- `.env` - Default environment variables (if needed)

## Vue2 CopilotKit Integration

### 1. Plugin Installation

In `main.js`, the CopilotKit plugin is installed with environment-based configuration:

```javascript
import Vue from 'vue';
import { CopilotKitPlugin } from '@turbo-agent/copilotkit-vue2-core';

// Get configuration from environment variables
const runtimeUrl = process.env.VUE_APP_COPILOT_RUNTIME_URL || "/api/copilotkit";
const agent = process.env.VUE_APP_COPILOT_AGENT || "sample_agent";
const publicApiKey = process.env.VUE_APP_COPILOT_PUBLIC_API_KEY;

// Install CopilotKit plugin with environment-based configuration
const copilotConfig = {
  runtimeUrl,
  agent,
  // Use publicApiKey if provided, otherwise use runtimeUrl
  ...(publicApiKey && { publicApiKey })
};

Vue.use(CopilotKitPlugin, copilotConfig);
```

### 2. Provider Setup

In `App.vue`, the CopilotKitProvider wraps the application:

```vue
<template>
  <CopilotKitProvider>
    <CustomChatInterface />
  </CopilotKitProvider>
</template>
```

### 3. Using CopilotKit in Components

Components can access the CopilotKit context via `this.$copilotKit`:

```javascript
export default {
  mounted() {
    // Access CopilotKit context
    if (this.$copilotKit) {
      const context = this.$copilotKit.getContext();
      
      // Register an action
      context.setAction('my-action', {
        name: 'my-action',
        description: 'Description of the action',
        parameters: [/* parameters */],
        handler: async (args) => {
          // Handle the action
          return { success: true };
        }
      });
    }
  },
  
  beforeDestroy() {
    // Clean up
    if (this.$copilotKit) {
      this.$copilotKit.getContext().removeAction('my-action');
    }
  }
}
```

## Key Vue2 Patterns Demonstrated

### 1. Context Access
- Using `this.$copilotKit` to access the CopilotKit context
- Provide/inject pattern for context sharing

### 2. Action Management
- Registering actions in `mounted()` lifecycle
- Cleaning up actions in `beforeDestroy()` lifecycle

### 3. Reactive Data
- Using Vue 2 data properties for chat state
- Computed properties for derived state

### 4. Event Handling
- Vue 2 event handlers for user interactions
- Async methods for API calls

## Mock Implementation

This example includes mock implementations to demonstrate the patterns without requiring a full CopilotKit backend:

- **Mock Messages**: Simulated chat messages and responses
- **Mock Actions**: Example action registration and execution
- **Mock Context**: Simplified context management

## Production Setup

To use this with a real CopilotKit backend:

1. Replace the mock implementations with actual CopilotKit functionality
2. Configure the `runtimeUrl` to point to your CopilotKit backend
3. Implement real actions and context providers
4. Add proper error handling and loading states

## Development

### Available Scripts

- `pnpm dev` - Start development server
- `pnpm build` - Build for production
- `pnpm serve` - Serve production build

### Development Features

- Hot reloading with webpack-dev-server
- Vue 2 single-file component support
- TypeScript support (optional)
- Babel transpilation for compatibility

## Architecture Notes

### Vue2 vs React Differences

This Vue2 implementation adapts React patterns to Vue2:

| React Pattern | Vue2 Equivalent |
|---------------|-----------------|
| `useContext()` | `this.$copilotKit` |
| `useCopilotChat()` | Component methods |
| Context Provider | `provide/inject` |
| Hooks | Lifecycle methods |

### Context Management

The Vue2 implementation uses:
- **Plugin system** for global installation
- **Provide/inject** for context sharing
- **Instance properties** for component access

This provides a natural Vue2 API while maintaining compatibility with CopilotKit concepts.

## Next Steps

1. **Add more examples**: Implement additional CopilotKit features
2. **Improve types**: Add TypeScript definitions
3. **Add tests**: Unit and integration tests
4. **Performance**: Optimize for production use
5. **Documentation**: Expand API documentation

## Contributing

1. Fork the repository
2. Create your feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

This project is licensed under the same license as CopilotKit.
