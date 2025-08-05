// Vue2 Chat Mixin - 提供聊天功能给 Vue2 组件 (完整复刻 use-chat.ts)
import {
  Message,
  TextMessage,
  Role,
  MessageRole,
  convertMessagesToGqlInput,
  filterAgentStateMessages,
  filterAdjacentAgentStateMessages,
  convertGqlOutputToMessages,
  CopilotRequestType,
  loadMessagesFromJsonRepresentation,
  ExtensionsInput,
  CopilotRuntimeClient,
  langGraphInterruptEvent,
  MetaEvent,
  MetaEventName,
  ActionExecutionMessage,
  CopilotKitLangGraphInterruptEvent,
  LangGraphInterruptEvent,
  MetaEventInput,
  AgentStateInput,
  ResultMessage,
  MessageStatusCode,
} from "@turbo-agent/copilotkit-runtime-client-gql";
import {
  FunctionCallHandler,
  COPILOT_CLOUD_PUBLIC_API_KEY_HEADER,
  CoAgentStateRenderHandler,
  randomId,
  parseJson,
  CopilotKitError,
  CopilotKitErrorCode,
} from "@turbo-agent/copilotkit-shared";
import { COPILOT_CONTEXT_KEY } from "../context/copilot-context-vue2";
import { processActionsForRuntimeRequest, FrontendAction } from "../types/frontend-action";
import { CoagentState } from "../types/coagent-state";
import { AgentSession } from "../context/copilot-context-vue2";
import {
  LangGraphInterruptAction,
  LangGraphInterruptActionSetter,
} from "../types/interrupt-action";

export interface ChatMixinData {
  messages: Message[];
  isLoading: boolean;
  chatInitialized: boolean;
  pendingAppends: Array<{ message: Message; followUp: boolean }>;
  executedCoAgentStateRenders: string[];
  chatAbortController: AbortController | null;
  runId: string | null;
  extensions: ExtensionsInput;
}

export interface ChatMixinMethods {
  initializeChat(): boolean;
  appendMessage(message: Message): void;
  setMessages(messages: Message[]): void;
  deleteMessage(messageId: string): void;
  sendMessage(content: string): Promise<void>;
  append(message: Message, options?: { followUp?: boolean }): Promise<void>;
  reload(messageId: string): Promise<void>;
  stop(): void;
  stopGeneration(): void;
  reloadMessages(): void;
  runChatCompletion(previousMessages?: Message[]): Promise<Message[]>;
  
  // Internal helper methods
  handleStreamingResponse(stream: ReadableStream): Promise<Message[]>;
  executeActionFromMessage(action: FrontendAction<any>, actionMessage: ActionExecutionMessage): Promise<ResultMessage>;
  constructFinalMessages(syncedMessages: Message[], previousMessages: Message[], newMessages: Message[]): Message[];
  composeAndFlushMetaEventsInput(metaEvents: (MetaEvent | undefined | null)[]): MetaEventInput[];
  getPairedFeAction(message: ActionExecutionMessage | ResultMessage): FrontendAction<any> | undefined;
  traceUIError(error: CopilotKitError, originalError?: any): Promise<void>;
}

export interface ChatMixinComputed {
  copilotContext(): any;
  visibleMessages(): Message[];
}

// Vue2 Mixin for Chat functionality (完整复刻 use-chat.ts)
export const ChatMixin = {
  inject: {
    copilotContextProvider: {
      from: COPILOT_CONTEXT_KEY,
      default() {
        console.warn('CopilotContext not provided - returning null function');
        return () => null;
      }
    }
  },

  data(): ChatMixinData {
    return {
      messages: [],
      isLoading: false,
      chatInitialized: false,
      pendingAppends: [],
      executedCoAgentStateRenders: [],
      chatAbortController: null,
      runId: null,
      extensions: {},
    };
  },

  computed: {
    copilotContext(this: any) {
      if (typeof this.copilotContextProvider === 'function') {
        const context = this.copilotContextProvider();
        // Add debug logging
        console.log('ChatMixin: Context from function:', !!context);
        if (context) {
          console.log('ChatMixin: Context properties:', {
            hasRuntimeClient: !!context.runtimeClient,
            hasApiConfig: !!context.copilotApiConfig,
            hasMakeSystemMessage: !!context.makeSystemMessage
          });
        }
        return context;
      }
      // Handle direct context object
      console.log('ChatMixin: Direct context:', !!this.copilotContextProvider);
      if (this.copilotContextProvider) {
        console.log('ChatMixin: Direct context properties:', {
          hasRuntimeClient: !!this.copilotContextProvider.runtimeClient,
          hasApiConfig: !!this.copilotContextProvider.copilotApiConfig,
          hasMakeSystemMessage: !!this.copilotContextProvider.makeSystemMessage
        });
      }
      return this.copilotContextProvider;
    },

    visibleMessages(this: any): Message[] {
      // Filter out adjacent agent state messages like in React version
      // First convert to proper Message type if needed, then filter
      return this.messages.filter((message: any) => {
        // Skip agent state messages to avoid duplicates
        return !message.isAgentStateMessage || !message.isAgentStateMessage();
      });
    },
  },

  methods: {
    // Initialize chat functionality using vue2-core context
    initializeChat(this: any): boolean {
      console.log('ChatMixin: Attempting to initialize chat...');
      console.log('ChatMixin: copilotContextProvider type:', typeof this.copilotContextProvider);
      console.log('ChatMixin: CopilotContext:', this.copilotContext);
      
      if (!this.copilotContext) {
        console.error('ChatMixin: CopilotKit context not available');
        console.log('ChatMixin: Available context provider:', this.copilotContextProvider);
        return false;
      }
      
      console.log('ChatMixin: Context structure:', {
        hasApiConfig: !!this.copilotContext.copilotApiConfig,
        hasRuntimeClient: !!this.copilotContext.runtimeClient,
        hasMakeSystemMessage: !!this.copilotContext.makeSystemMessage,
        hasActions: !!this.copilotContext.actions,
        hasSetAction: !!this.copilotContext.setAction
      });
      
      if (!this.copilotContext.copilotApiConfig) {
        console.error('ChatMixin: CopilotKit API config not available in context');
        console.log('ChatMixin: Context keys:', Object.keys(this.copilotContext || {}));
        return false;
      }

      if (!this.copilotContext.runtimeClient) {
        console.error('ChatMixin: Runtime client not available in context');
        console.log('ChatMixin: Context keys:', Object.keys(this.copilotContext || {}));
        return false;
      }
      
      this.chatInitialized = true;
      console.log('ChatMixin: Chat initialized successfully');
      
      // Add initial assistant message if no messages exist
      if (this.messages.length === 0) {
        this.appendMessage(new TextMessage({
          content: "Hello! I'm your AI assistant powered by CopilotKit. How can I help you today?",
          role: Role.Assistant
        }));
      }
      
      return true;
    },

    // Append a message to the chat
    appendMessage(this: any, message: Message): void {
      // Ensure message has an ID
      if (!message.id) {
        message.id = Date.now().toString() + Math.random().toString();
      }
      
      this.messages.push(message);
      
      // Auto-scroll to bottom on next tick if method exists
      if (this.$nextTick && this.scrollToBottom) {
        this.$nextTick(() => {
          this.scrollToBottom();
        });
      }
    },

    // Set all chat messages
    setMessages(this: any, messages: Message[]): void {
      this.messages = messages;
    },

    // Delete a specific message
    deleteMessage(this: any, messageId: string): void {
      const index = this.messages.findIndex((msg: Message) => msg.id === messageId);
      if (index !== -1) {
        this.messages.splice(index, 1);
      }
    },

    // Send a message - simplified interface
    async sendMessage(this: any, content: string): Promise<void> {
      if (!content.trim() || this.isLoading) {
        return;
      }
      
      console.log('ChatMixin: Attempting to send message...');

      if (!this.chatInitialized || !this.copilotContext) {
        console.error('ChatMixin: Chat not initialized or context not available');
        
        // Try to initialize if context is available but chat isn't initialized
        if (this.copilotContext && !this.chatInitialized) {
          const initialized = this.initializeChat();
          if (!initialized) {
            return;
          }
        } else {
          return;
        }
      }

      // Create user message
      const userMessage = new TextMessage({
        content: content.trim(),
        role: Role.User
      });
      
      // Use the append method which handles the full flow
      await this.append(userMessage);
    },

    // Append a user message and run chat completion (复刻 use-chat append)
    async append(this: any, message: Message, options?: { followUp?: boolean }): Promise<void> {
      const followUp = options?.followUp ?? true;
      if (this.isLoading) {
        this.pendingAppends.push({ message, followUp });
        return;
      }

      const newMessages = [...this.messages, message];
      this.setMessages(newMessages);
      if (followUp) {
        await this.runChatCompletion(newMessages);
      }
    },

    // Reload a specific message (复刻 use-chat reload)
    async reload(this: any, messageId: string): Promise<void> {
      if (this.isLoading || this.messages.length === 0) {
        return;
      }

      const reloadMessageIndex = this.messages.findIndex((msg: Message) => msg.id === messageId);
      if (reloadMessageIndex === -1) {
        console.warn(`Message with id ${messageId} not found`);
        return;
      }

      const reloadMessageRole = (this.messages[reloadMessageIndex] as any).role;
      if (reloadMessageRole !== MessageRole.Assistant) {
        console.warn(`Regenerate cannot be performed on ${reloadMessageRole} role`);
        return;
      }

      let historyCutoff: Message[] = [];
      if (this.messages.length > 2) {
        // Find the closest user message before the reload message
        const lastUserMessageBeforeRegenerate = this.messages
          .slice(0, reloadMessageIndex)
          .reverse()
          .find((msg: Message) => (msg as any).role === MessageRole.User);
        
        if (lastUserMessageBeforeRegenerate) {
          const indexOfLastUserMessageBeforeRegenerate = this.messages.findIndex(
            (msg: Message) => msg.id === lastUserMessageBeforeRegenerate.id,
          );
          // Include the user message, remove everything after it
          historyCutoff = this.messages.slice(0, indexOfLastUserMessageBeforeRegenerate + 1);
        }
      }

      this.setMessages(historyCutoff);
      await this.runChatCompletion(historyCutoff);
    },

    // Stop generation
    stop(this: any): void {
      this.chatAbortController?.abort("Stop was called");
    },

    // Stop generation (alias for compatibility)
    stopGeneration(this: any): void {
      this.stop();
    },

    // Reload messages (simple version)
    reloadMessages(this: any): void {
      this.messages = [];
      this.isLoading = false;
      
      // Add initial message after reload
      setTimeout(() => {
        this.appendMessage(new TextMessage({
          content: "Chat reloaded! Hello again! How can I help you?",
          role: Role.Assistant
        }));
      }, 100);
    },

    // Main chat completion method (复刻 use-chat runChatCompletion)
    async runChatCompletion(this: any, previousMessages?: Message[]): Promise<Message[]> {
      const messagesToUse = previousMessages || this.messages;
      this.isLoading = true;
      
      // Validate CopilotKit context is properly initialized
      if (!this.copilotContext) {
        const error = new Error("CopilotKit not initialized - context is null");
        console.error('ChatMixin: Error in runChatCompletion:', error);
        this.isLoading = false;
        throw error;
      }
      
      if (!this.copilotContext.runtimeClient) {
        const error = new Error("CopilotKit not initialized - runtime client is null");
        console.error('ChatMixin: Error in runChatCompletion:', error);
        this.isLoading = false;
        throw error;
      }
      
      if (!this.copilotContext.copilotApiConfig) {
        const error = new Error("CopilotKit not initialized - API config is null");
        console.error('ChatMixin: Error in runChatCompletion:', error);
        this.isLoading = false;
        throw error;
      }
      
      // Check for interrupt event constraints
      const interruptEvent = this.copilotContext.langGraphInterruptAction?.event;
      if (
        interruptEvent?.name === MetaEventName.LangGraphInterruptEvent &&
        interruptEvent?.value &&
        !interruptEvent?.response &&
        this.copilotContext.agentSession
      ) {
        console.error("A message was sent while interrupt is active. This will cause failure on the agent side");
        this.isLoading = false;
        return [];
      }

      // Placeholder message - will be replaced by actual response
      let newMessages: Message[] = [
        new TextMessage({
          content: "",
          role: Role.Assistant,
          id: "placeholder-" + randomId(), // Add placeholder identifier
        }),
      ];

      this.chatAbortController = new AbortController();
      this.setMessages([...messagesToUse, ...newMessages]);

      // Build system message and context
      const systemMessage = this.copilotContext.makeSystemMessage ? 
        this.copilotContext.makeSystemMessage() : 
        new TextMessage({ content: "", role: Role.System });
      
      const initialMessages = this.copilotContext.initialMessages || [];
      const messagesWithContext = [systemMessage, ...initialMessages, ...messagesToUse];

      // Handle MCP servers in properties
      const finalProperties = { ...(this.copilotContext.copilotApiConfig.properties || {}) };
      
      let mcpServersToUse = null;
      if (
        this.copilotContext.copilotApiConfig.mcpServers &&
        Array.isArray(this.copilotContext.copilotApiConfig.mcpServers) &&
        this.copilotContext.copilotApiConfig.mcpServers.length > 0
      ) {
        mcpServersToUse = this.copilotContext.copilotApiConfig.mcpServers;
      } else if (
        this.copilotContext.copilotApiConfig.properties?.mcpServers &&
        Array.isArray(this.copilotContext.copilotApiConfig.properties.mcpServers) &&
        this.copilotContext.copilotApiConfig.properties.mcpServers.length > 0
      ) {
        mcpServersToUse = this.copilotContext.copilotApiConfig.properties.mcpServers;
      }

      if (mcpServersToUse) {
        finalProperties.mcpServers = mcpServersToUse;
        this.copilotContext.copilotApiConfig.mcpServers = mcpServersToUse;
      }

      const isAgentRun = this.copilotContext.agentSession !== null;

      try {
        // Create GraphQL stream
        console.log('ChatMixin: Preparing request data...');
        console.log('ChatMixin: coagentStatesRef.current:', this.copilotContext.coagentStatesRef?.current);
        console.log('ChatMixin: agentSession will be:', { agentName: "common_agent" });

        const stream = this.copilotContext.runtimeClient.asStream(
          this.copilotContext.runtimeClient.generateCopilotResponse({
            data: {
              frontend: {
                actions: this.copilotContext.actions ? 
                  processActionsForRuntimeRequest(Object.values(this.copilotContext.actions)) : [],
                url: typeof window !== 'undefined' ? window.location.href : '',
              },
              threadId: this.copilotContext.threadId,
              runId: this.runId,
              extensions: this.extensions,
              metaEvents: this.composeAndFlushMetaEventsInput([this.copilotContext.langGraphInterruptAction?.event]),
              messages: convertMessagesToGqlInput(filterAgentStateMessages(messagesWithContext)),
              ...(this.copilotContext.copilotApiConfig.cloud ? {
                cloud: {
                  ...(this.copilotContext.copilotApiConfig.cloud.guardrails?.input?.restrictToTopic?.enabled ? {
                    guardrails: {
                      inputValidationRules: {
                        allowList: this.copilotContext.copilotApiConfig.cloud.guardrails.input.restrictToTopic.validTopics,
                        denyList: this.copilotContext.copilotApiConfig.cloud.guardrails.input.restrictToTopic.invalidTopics,
                      },
                    },
                  } : {}),
                },
              } : {}),
              metadata: {
                requestType: CopilotRequestType.Chat,
              },
              // Always use "common_agent" as the agent name
              agentSession: {
                agentName: "common_agent"
              },
              agentStates: this.copilotContext.coagentStatesRef?.current ? 
                Object.values(this.copilotContext.coagentStatesRef.current).map((state: any) => {
                  console.log('ChatMixin: Including agent state in request:', { agentName: state.name, state: state.state });
                  const stateObject: AgentStateInput = {
                    agentName: state.name,
                    state: JSON.stringify(state.state),
                  };
                  if (state.config !== undefined) {
                    stateObject.config = JSON.stringify(state.config);
                  }
                  return stateObject;
                }) : [],
              forwardedParameters: this.copilotContext.forwardedParameters || {},
            },
            properties: finalProperties,
            signal: this.chatAbortController?.signal,
          }),
        );

        return await this.handleStreamingResponse(stream, messagesToUse, newMessages, isAgentRun);
      } catch (error) {
        console.error('ChatMixin: Error in runChatCompletion:', error);
        this.appendMessage(new TextMessage({
          content: `Error: ${(error as Error).message}`,
          role: Role.Assistant
        }));
        return [];
      } finally {
        this.isLoading = false;
      }
    },

    // Handle streaming response (复刻 use-chat stream handling)
    async handleStreamingResponse(this: any, stream: ReadableStream, previousMessages: Message[], newMessages: Message[], isAgentRun: boolean): Promise<Message[]> {
      const guardrailsEnabled = this.copilotContext.copilotApiConfig.cloud?.guardrails?.input?.restrictToTopic.enabled || false;
      const reader = stream.getReader();

      this.executedCoAgentStateRenders = [];
      let followUp: FrontendAction["followUp"] = undefined;
      let messages: Message[] = [];
      let syncedMessages: Message[] = [];
      let interruptMessages: Message[] = [];

      try {
        while (true) {
          let done, value;

          try {
            const readResult = await reader.read();
            done = readResult.done;
            value = readResult.value;
          } catch (readError) {
            break;
          }

          if (done) {
            if (this.chatAbortController?.signal.aborted) {
              return [];
            }
            break;
          }

          if (!value?.generateCopilotResponse) {
            continue;
          }

          this.runId = value.generateCopilotResponse.runId || null;
          this.extensions = CopilotRuntimeClient.removeGraphQLTypename(
            value.generateCopilotResponse.extensions || {},
          );

          // Update context state
          if (this.copilotContext.setRunId) {
            this.copilotContext.setRunId(this.runId);
          }
          if (this.copilotContext.setExtensions) {
            this.copilotContext.setExtensions(this.extensions);
          }

          let rawMessagesResponse = value.generateCopilotResponse.messages;

          // Handle meta events
          const metaEvents: MetaEvent[] | undefined = value.generateCopilotResponse?.metaEvents ?? [];
          (metaEvents ?? []).forEach((ev) => {
            if (ev.name === MetaEventName.LangGraphInterruptEvent) {
              let eventValue = langGraphInterruptEvent(ev as LangGraphInterruptEvent).value;
              eventValue = parseJson(eventValue, eventValue);
              if (this.copilotContext.setLangGraphInterruptAction) {
                this.copilotContext.setLangGraphInterruptAction({
                  event: {
                    ...langGraphInterruptEvent(ev as LangGraphInterruptEvent),
                    value: eventValue,
                  },
                });
              }
            }
            if (ev.name === MetaEventName.CopilotKitLangGraphInterruptEvent) {
              const data = (ev as CopilotKitLangGraphInterruptEvent).data;
              rawMessagesResponse = [...rawMessagesResponse, ...data.messages];
              interruptMessages = convertGqlOutputToMessages(
                filterAdjacentAgentStateMessages(data.messages as any),
              );
            }
          });

          messages = convertGqlOutputToMessages(
            filterAdjacentAgentStateMessages(rawMessagesResponse),
          );

          newMessages = [];

          // Handle error statuses
          if (
            value.generateCopilotResponse.status?.__typename === "FailedResponseStatus" &&
            value.generateCopilotResponse.status.reason === "GUARDRAILS_VALIDATION_FAILED"
          ) {
            const guardrailsReason = value.generateCopilotResponse.status.details?.guardrailsReason || "";
            newMessages = [
              new TextMessage({
                role: MessageRole.Assistant,
                content: guardrailsReason,
              }),
            ];

            const guardrailsError = new CopilotKitError({
              message: `Guardrails validation failed: ${guardrailsReason}`,
              code: CopilotKitErrorCode.MISUSE,
            });
            await this.traceUIError(guardrailsError, {
              statusReason: value.generateCopilotResponse.status.reason,
              statusDetails: value.generateCopilotResponse.status.details,
            });

            this.setMessages([...previousMessages, ...newMessages]);
            break;
          }

          // Handle UNKNOWN_ERROR failures
          if (
            value.generateCopilotResponse.status?.__typename === "FailedResponseStatus" &&
            value.generateCopilotResponse.status.reason === "UNKNOWN_ERROR"
          ) {
            const errorMessage = value.generateCopilotResponse.status.details?.description || "An unknown error occurred";
            const statusDetails = value.generateCopilotResponse.status.details;
            const originalError = statusDetails?.originalError || statusDetails?.error;
            const originalCode = originalError?.code || originalError?.extensions?.code;
            const originalSeverity = originalError?.severity || originalError?.extensions?.severity;
            const originalVisibility = originalError?.visibility || originalError?.extensions?.visibility;

            let errorCode = CopilotKitErrorCode.NETWORK_ERROR;
            if (originalCode && Object.values(CopilotKitErrorCode).includes(originalCode)) {
              errorCode = originalCode;
            }

            const structuredError = new CopilotKitError({
              message: errorMessage,
              code: errorCode,
              severity: originalSeverity,
              visibility: originalVisibility,
            });

            // Display banner error if available
            if (this.copilotContext.setBannerError) {
              this.copilotContext.setBannerError(structuredError);
            }

            await this.traceUIError(structuredError, {
              statusReason: value.generateCopilotResponse.status.reason,
              statusDetails: value.generateCopilotResponse.status.details,
              originalErrorCode: originalCode,
              preservedStructure: !!originalCode,
            });

            this.isLoading = false;
            break;
          }

          // Process messages
          else if (messages.length > 0) {
            newMessages = [...messages];

            for (const message of messages) {
              // Execute onCoAgentStateRender handler
              if (
                message.isAgentStateMessage() &&
                !message.active &&
                !this.executedCoAgentStateRenders.includes(message.id) &&
                this.copilotContext.onCoAgentStateRender
              ) {
                // Do not execute a coagent action if guardrails are enabled but the status is not known
                if (guardrailsEnabled && value.generateCopilotResponse.status === undefined) {
                  break;
                }
                // Execute coagent action
                await this.copilotContext.onCoAgentStateRender({
                  name: message.agentName,
                  nodeName: message.nodeName,
                  state: message.state,
                });
                this.executedCoAgentStateRenders.push(message.id);
              }
            }

            // Handle agent state messages
            const lastAgentStateMessage = [...messages]
              .reverse()
              .find((message) => message.isAgentStateMessage());

            if (lastAgentStateMessage) {
              if (
                lastAgentStateMessage.state.messages &&
                lastAgentStateMessage.state.messages.length > 0
              ) {
                syncedMessages = loadMessagesFromJsonRepresentation(
                  lastAgentStateMessage.state.messages,
                );
              }
              
              // Update coagent states
              if (this.copilotContext.setCoagentStatesWithRef) {
                this.copilotContext.setCoagentStatesWithRef((prevAgentStates: Record<string, CoagentState>) => {
                  const prevState = prevAgentStates[lastAgentStateMessage.agentName];
                  const newState = {
                    name: lastAgentStateMessage.agentName,
                    // Merge all state fields from backend, including workset, logs, etc.
                    state: {
                      ...prevState?.state,
                      ...lastAgentStateMessage.state,
                    },
                    running: lastAgentStateMessage.running,
                    active: lastAgentStateMessage.active,
                    threadId: lastAgentStateMessage.threadId,
                    nodeName: lastAgentStateMessage.nodeName,
                    runId: lastAgentStateMessage.runId,
                    config: prevState?.config,
                  };
                  
                  console.log('ChatMixin: Updating agent state:', {
                    agentName: lastAgentStateMessage.agentName,
                    newState,
                    receivedState: lastAgentStateMessage.state
                  });
                  
                  return {
                    ...prevAgentStates,
                    [lastAgentStateMessage.agentName]: newState,
                  };
                });
              }
              
              // Update agent session
              if (lastAgentStateMessage.running) {
                if (this.copilotContext.setAgentSession) {
                  this.copilotContext.setAgentSession({
                    threadId: lastAgentStateMessage.threadId,
                    agentName: lastAgentStateMessage.agentName,
                    nodeName: lastAgentStateMessage.nodeName,
                  });
                }
              } else {
                if (this.copilotContext.agentLock) {
                  if (this.copilotContext.setAgentSession) {
                    this.copilotContext.setAgentSession({
                      threadId: randomId(),
                      agentName: this.copilotContext.agentLock,
                      nodeName: undefined,
                    });
                  }
                } else {
                  if (this.copilotContext.setAgentSession) {
                    this.copilotContext.setAgentSession(null);
                  }
                }
              }
            }
          }

          if (newMessages.length > 0) {
            // Update message state
            this.setMessages([...previousMessages, ...newMessages]);
          }
        }

        // Construct final messages
        let finalMessages = this.constructFinalMessages(
          [...syncedMessages, ...interruptMessages],
          previousMessages,
          newMessages,
        );

        let didExecuteAction = false;

        // Execute actions if onFunctionCall is available
        if (this.copilotContext.onFunctionCall) {
          // Find consecutive action execution messages at the end
          const lastMessages = [];

          for (let i = finalMessages.length - 1; i >= 0; i--) {
            const message = finalMessages[i];
            if (
              (message.isActionExecutionMessage() || message.isResultMessage()) &&
              message.status.code !== MessageStatusCode.Pending
            ) {
              lastMessages.unshift(message);
            } else if (!message.isAgentStateMessage()) {
              break;
            }
          }

          for (const message of lastMessages) {
            // Update message state before calling handler
            this.setMessages(finalMessages);

            const action = this.copilotContext.actions ? 
              Object.values(this.copilotContext.actions).find(
                (action: any) => action.name === (message as ActionExecutionMessage).name,
              ) : null;
            
            if (action && (action as any).available === "frontend") {
              // Never execute frontend actions
              continue;
            }
            
            const currentResultMessagePairedFeAction = message.isResultMessage()
              ? this.getPairedFeAction(message)
              : null;

            // Execute action
            if (action && message.isActionExecutionMessage()) {
              const isRenderAndWaitAction = (action as any)?._isRenderAndWait || false;
              const alreadyProcessed =
                isRenderAndWaitAction &&
                finalMessages.some(
                  (fm: any) => fm.isResultMessage() && fm.actionExecutionId === message.id,
                );

              if (!alreadyProcessed) {
                const resultMessage = await this.executeActionFromMessage(action, message as ActionExecutionMessage);
                const pairedFeAction = this.getPairedFeAction(resultMessage);

                if (pairedFeAction) {
                  const newExecutionMessage = new ActionExecutionMessage({
                    name: pairedFeAction.name,
                    arguments: parseJson(resultMessage.result, resultMessage.result),
                    status: message.status,
                    createdAt: message.createdAt,
                    parentMessageId: message.parentMessageId,
                  });
                  await this.executeActionFromMessage(pairedFeAction, newExecutionMessage);
                }
              }
            } else if (message.isResultMessage() && currentResultMessagePairedFeAction) {
              const newExecutionMessage = new ActionExecutionMessage({
                name: currentResultMessagePairedFeAction.name,
                arguments: parseJson(message.result, message.result),
                status: message.status,
                createdAt: message.createdAt,
              });
              finalMessages.push(newExecutionMessage);
              await this.executeActionFromMessage(currentResultMessagePairedFeAction, newExecutionMessage);
            }
          }

          this.setMessages(finalMessages);
        }

        // Conditionally run chat completion again if followUp
        if (
          followUp !== false &&
          (didExecuteAction ||
            (!isAgentRun &&
              finalMessages.length &&
              finalMessages[finalMessages.length - 1].isResultMessage())) &&
          !this.chatAbortController?.signal.aborted
        ) {
          // Wait for next tick
          await new Promise((resolve) => setTimeout(resolve, 10));
          return await this.runChatCompletion(finalMessages);
        } else if (this.chatAbortController?.signal.aborted) {
          // Filter out incomplete action execution messages
          const repairedMessages = finalMessages.filter((message: any, actionExecutionIndex: number) => {
            if (message.isActionExecutionMessage()) {
              return finalMessages.find(
                (msg: any, resultIndex: number) =>
                  msg.isResultMessage() &&
                  msg.actionExecutionId === message.id &&
                  resultIndex === actionExecutionIndex + 1,
              );
            }
            return true;
          });
          const repairedMessageIds = repairedMessages.map((message: any) => message.id);
          this.setMessages(repairedMessages);

          // Handle agent session for LangGraph
          if (this.copilotContext.agentSession?.nodeName && this.copilotContext.setAgentSession) {
            this.copilotContext.setAgentSession({
              threadId: this.copilotContext.agentSession.threadId,
              agentName: this.copilotContext.agentSession.agentName,
              nodeName: "__end__",
            });
          }
          // Filter out empty placeholder messages and messages with placeholder IDs
          const filteredMessages = newMessages.filter((message) => {
            if (repairedMessageIds.includes(message.id)) {
              // Skip empty messages or placeholder messages
              if (message.isTextMessage && message.isTextMessage()) {
                const textMsg = message as any;
                return !(textMsg.content === "" || textMsg.id?.startsWith("placeholder-"));
              }
              return true;
            }
            return false;
          });
          return filteredMessages;
        } else {
          // Filter out empty placeholder messages
          const filteredMessages = newMessages.filter((message) => {
            if (message.isTextMessage && message.isTextMessage()) {
              const textMsg = message as any;
              return !(textMsg.content === "" || textMsg.id?.startsWith("placeholder-"));
            }
            return true;
          });
          return filteredMessages;
        }
      } finally {
        this.isLoading = false;
      }
    },

    // Execute action from message (复刻 executeAction)
    async executeActionFromMessage(this: any, currentAction: FrontendAction<any>, actionMessage: ActionExecutionMessage): Promise<ResultMessage> {
      const isInterruptAction = false; // Simplified for now
      const followUp = currentAction?.followUp ?? !isInterruptAction;

      // Call _setActivatingMessageId before executing the action
      if ((currentAction as any)?._setActivatingMessageId) {
        (currentAction as any)._setActivatingMessageId(actionMessage.id);
      }

      let result: any;
      let error: Error | null = null;

      // Get current messages for handler
      const currentMessagesForHandler = this.messages;

      // Execute the action handler
      try {
        if (this.copilotContext.onFunctionCall) {
          const handlerReturnedPromise = this.copilotContext.onFunctionCall({
            messages: currentMessagesForHandler,
            name: actionMessage.name,
            args: actionMessage.arguments,
          });

          // For HITL actions, update UI immediately
          if ((currentAction as any)?._isRenderAndWait) {
            this.setMessages([...this.messages]);
          }

          result = await Promise.race([
            handlerReturnedPromise,
            new Promise((resolve) =>
              this.chatAbortController?.signal.addEventListener("abort", () =>
                resolve("Operation was aborted by the user"),
              ),
            ),
            new Promise((resolve) => {
              if (this.chatAbortController?.signal.aborted) {
                resolve("Operation was aborted by the user");
              }
            }),
          ]);
        }
      } catch (e) {
        error = e as Error;
        console.error(`Failed to execute action ${actionMessage.name}: ${error}`);
      }

      // Clear _setActivatingMessageId after the action is done
      if ((currentAction as any)?._setActivatingMessageId) {
        (currentAction as any)._setActivatingMessageId(null);
      }

      return new ResultMessage({
        id: "result-" + actionMessage.id,
        result: ResultMessage.encodeResult(
          error
            ? {
                content: result,
                error: JSON.parse(JSON.stringify(error, Object.getOwnPropertyNames(error))),
              }
            : result,
        ),
        actionExecutionId: actionMessage.id,
        actionName: actionMessage.name,
      });
    },

    // Construct final messages (复刻 constructFinalMessages)
    constructFinalMessages(this: any, syncedMessages: Message[], previousMessages: Message[], newMessages: Message[]): Message[] {
      const finalMessages = syncedMessages.length > 0 ? [...syncedMessages] : [...previousMessages, ...newMessages];

      if (syncedMessages.length > 0) {
        const messagesWithAgentState = [...previousMessages, ...newMessages];
        let previousMessageId: string | undefined = undefined;

        for (const message of messagesWithAgentState) {
          if (message.isAgentStateMessage()) {
            // Insert this message into finalMessages after the position of previousMessageId
            const index = finalMessages.findIndex((msg) => msg.id === previousMessageId);
            if (index !== -1) {
              finalMessages.splice(index + 1, 0, message);
            }
          }
          previousMessageId = message.id;
        }
      }

      return finalMessages;
    },

    // Compose and flush meta events input (复刻 composeAndFlushMetaEventsInput)
    composeAndFlushMetaEventsInput(this: any, metaEvents: (MetaEvent | undefined | null)[]): MetaEventInput[] {
      return metaEvents.reduce((acc: MetaEventInput[], event) => {
        if (!event) return acc;

        switch (event.name) {
          case MetaEventName.LangGraphInterruptEvent:
            if (event.response) {
              // Flush interrupt event from state
              if (this.copilotContext.setLangGraphInterruptAction) {
                this.copilotContext.setLangGraphInterruptAction(null);
              }
              const value = (event as LangGraphInterruptEvent).value;
              return [
                ...acc,
                {
                  name: event.name,
                  value: typeof value === "string" ? value : JSON.stringify(value),
                  response:
                    typeof event.response === "string"
                      ? event.response
                      : JSON.stringify(event.response),
                },
              ];
            }
            return acc;
          default:
            return acc;
        }
      }, []);
    },

    // Get paired FE action (复刻 getPairedFeAction)
    getPairedFeAction(this: any, message: ActionExecutionMessage | ResultMessage): FrontendAction<any> | undefined {
      let actionName = null;
      if (message.isActionExecutionMessage()) {
        actionName = message.name;
      } else if (message.isResultMessage()) {
        actionName = message.actionName;
      }
      
      if (!this.copilotContext.actions || !actionName) {
        return undefined;
      }
      
      return Object.values(this.copilotContext.actions).find(
        (action: any) =>
          (action.name === actionName && action.available === "frontend") ||
          action.pairedAction === actionName,
      ) as FrontendAction<any> | undefined;
    },

    // Trace UI error (复刻 traceUIError)
    async traceUIError(this: any, error: CopilotKitError, originalError?: any): Promise<void> {
      // Just check if onError and publicApiKey are defined
      if (!this.copilotContext.onError || !this.copilotContext.copilotApiConfig?.publicApiKey) return;

      try {
        const traceEvent = {
          type: "error" as const,
          timestamp: Date.now(),
          context: {
            source: "ui" as const,
            request: {
              operation: "useChatCompletion",
              url: this.copilotContext.copilotApiConfig.chatApiEndpoint,
              startTime: Date.now(),
            },
            technical: {
              environment: "browser",
              userAgent: typeof navigator !== "undefined" ? navigator.userAgent : undefined,
              stackTrace: originalError instanceof Error ? originalError.stack : undefined,
            },
          },
          error,
        };

        await this.copilotContext.onError(traceEvent);
      } catch (traceError) {
        console.error("Error in ChatMixin onError handler:", traceError);
      }
    },
  },

  mounted(this: any) {
    console.log('ChatMixin: Component mounted, initializing chat...');
    
    // Initialize chat when component mounts
    if (this.$nextTick) {
      this.$nextTick(() => {
        this.initializeChat();
      });
    } else {
      this.initializeChat();
    }
  },

  watch: {
    // Watch for copilotContext changes
    copilotContext: {
      handler(this: any, newContext: any) {
        if (newContext && !this.chatInitialized) {
          this.initializeChat();
        }
      },
      immediate: true
    },

    // Handle pending appends when not loading
    isLoading: {
      handler(this: any, newIsLoading: boolean) {
        if (!newIsLoading && this.pendingAppends.length > 0) {
          const pending = this.pendingAppends.splice(0);
          const followUp = pending.some((p: any) => p.followUp);
          const newMessages = [...this.messages, ...pending.map((p: any) => p.message)];
          this.setMessages(newMessages);
          if (followUp) {
            this.runChatCompletion(newMessages);
          }
        }
      },
    }
  }
};

export default ChatMixin;
