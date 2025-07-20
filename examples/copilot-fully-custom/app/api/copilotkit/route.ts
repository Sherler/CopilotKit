import {
  CopilotRuntime,
  OpenAIAdapter,
  copilotRuntimeNextJSAppRouterEndpoint,
} from '@turbo-agent/copilotkit-runtime';

import { NextRequest } from 'next/server';
  
const serviceAdapter = new OpenAIAdapter();
const runtime = new CopilotRuntime();
  
export const POST = async (req: NextRequest) => {
  const { handleRequest } = copilotRuntimeNextJSAppRouterEndpoint({
    runtime,
    serviceAdapter,
    endpoint: '/api/copilotkit',
  });
  
  return handleRequest(req);
};