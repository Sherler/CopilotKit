import Vue from 'vue';
import App from './App.vue';
import { CopilotKitPlugin } from '@turbo-agent/copilotkit-vue2-core';

// Configure Vue
Vue.config.productionTip = false;

console.log('Vue2 CopilotKit Example starting...');

// Install CopilotKit plugin
Vue.use(CopilotKitPlugin, {
  runtimeUrl: process.env.VUE_APP_COPILOT_RUNTIME_URL || "/api/copilotkit/common_agent",
  showDevConsole: true
});

console.log('CopilotKit plugin installed');

// Create and mount the Vue app
new Vue({
  render: h => h(App),
}).$mount('#app');
