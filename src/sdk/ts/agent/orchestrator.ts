/**
 * Agent Orchestrator
 *
 * Manages agent lifecycle, inbox polling, and message routing.
 * Connects handlers to the CCCC daemon via SDK.
 */

import { CCCCClient } from '../client.js';
import type { InboxMessage } from '../types/message.js';
import { AgentRegistry } from './registry.js';
import type {
  AgentHandler,
  AgentInput,
  AgentOutput,
  HandlerType,
  ContentItem,
} from './types/handler.js';

/**
 * Message protocol for agent communication
 */
export interface AgentMessage {
  /** Message type indicator */
  type: 'agent_request' | 'agent_response' | 'plain';
  /** Target handler type */
  handlerType?: HandlerType;
  /** Target handler name (optional, uses first matching handler if not specified) */
  handlerName?: string;
  /** Requested capability/task */
  task?: string;
  /** Request payload */
  payload?: AgentInput;
  /** Response payload */
  response?: AgentOutput;
}

/**
 * Orchestrator configuration
 */
export interface OrchestratorConfig {
  /** CCCC client instance */
  client: CCCCClient;
  /** Group ID to operate in */
  groupId: string;
  /** Actor ID for this orchestrator */
  actorId: string;
  /** Handler registry */
  registry: AgentRegistry;
  /** Inbox polling interval in ms (default: 1000) */
  pollInterval?: number;
  /** Whether to auto-acknowledge processed messages (default: true) */
  autoAck?: boolean;
  /** Message handler for non-agent messages */
  onMessage?: (message: InboxMessage) => Promise<void>;
  /** Error handler */
  onError?: (error: Error, message?: InboxMessage) => void;
}

/**
 * Orchestrator state
 */
export type OrchestratorState = 'stopped' | 'starting' | 'running' | 'stopping';

/**
 * Orchestrator events
 */
export type OrchestratorEventType =
  | 'started'
  | 'stopped'
  | 'message_received'
  | 'message_processed'
  | 'error';

export interface OrchestratorEvent {
  type: OrchestratorEventType;
  timestamp: Date;
  data?: Record<string, unknown>;
}

export type OrchestratorEventListener = (event: OrchestratorEvent) => void;

/**
 * Agent Orchestrator
 *
 * Main entry point for running an agent that communicates with CCCC.
 * Handles inbox polling, message parsing, handler routing, and response sending.
 *
 * @example
 * ```typescript
 * const client = new CCCCClient();
 * const registry = new AgentRegistry();
 *
 * // Register handlers
 * registry.register(new GeminiTextHandler({ apiKey: '...' }));
 *
 * // Create orchestrator
 * const orchestrator = new AgentOrchestrator({
 *   client,
 *   groupId: 'g_xxx',
 *   actorId: 'my-agent',
 *   registry,
 * });
 *
 * // Start polling
 * await orchestrator.start();
 *
 * // Stop when done
 * await orchestrator.stop();
 * ```
 */
export class AgentOrchestrator {
  private config: Required<OrchestratorConfig>;
  private state: OrchestratorState = 'stopped';
  private pollTimer: ReturnType<typeof setTimeout> | null = null;
  private listeners: Set<OrchestratorEventListener> = new Set();
  private processing = false;

  constructor(config: OrchestratorConfig) {
    this.config = {
      pollInterval: 1000,
      autoAck: true,
      onMessage: async () => {},
      onError: (err) => console.error('Orchestrator error:', err),
      ...config,
    };
  }

  /**
   * Get current state
   */
  getState(): OrchestratorState {
    return this.state;
  }

  /**
   * Get registry
   */
  getRegistry(): AgentRegistry {
    return this.config.registry;
  }

  /**
   * Start the orchestrator
   * Begins polling inbox for messages
   */
  async start(): Promise<void> {
    if (this.state !== 'stopped') {
      throw new Error(`Cannot start: orchestrator is ${this.state}`);
    }

    this.state = 'starting';

    // Verify connection
    const connected = await this.config.client.ping();
    if (!connected) {
      this.state = 'stopped';
      throw new Error('Cannot connect to CCCC daemon');
    }

    // Set headless status
    await this.config.client.headless.setStatus(
      this.config.groupId,
      this.config.actorId,
      'working'
    );

    this.state = 'running';
    this.emit({ type: 'started', timestamp: new Date() });

    // Start polling loop
    this.schedulePoll();
  }

  /**
   * Stop the orchestrator
   * Stops polling and cleans up
   */
  async stop(): Promise<void> {
    if (this.state !== 'running') {
      return;
    }

    this.state = 'stopping';

    // Cancel scheduled poll
    if (this.pollTimer) {
      clearTimeout(this.pollTimer);
      this.pollTimer = null;
    }

    // Wait for current processing to complete
    while (this.processing) {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }

    // Set headless status
    try {
      await this.config.client.headless.setStatus(
        this.config.groupId,
        this.config.actorId,
        'stopped'
      );
    } catch {
      // Ignore errors during shutdown
    }

    this.state = 'stopped';
    this.emit({ type: 'stopped', timestamp: new Date() });
  }

  /**
   * Process a single message directly (for testing or manual dispatch)
   */
  async dispatch(message: InboxMessage): Promise<AgentOutput | null> {
    const agentMessage = this.parseMessage(message);

    if (agentMessage.type !== 'agent_request') {
      // Not an agent request, call generic handler
      await this.config.onMessage(message);
      return null;
    }

    // Find handler
    const handler = this.findHandler(agentMessage);
    if (!handler) {
      const errorOutput: AgentOutput = {
        requestId: agentMessage.payload?.requestId ?? 'unknown',
        success: false,
        content: [],
        error: {
          code: 'HANDLER_NOT_FOUND',
          message: `No handler found for type=${agentMessage.handlerType}, task=${agentMessage.task}`,
        },
      };

      await this.sendResponse(message, errorOutput);
      return errorOutput;
    }

    // Process
    const startTime = Date.now();
    let output: AgentOutput;

    try {
      output = await handler.process(agentMessage.payload!);

      // Add processing time if not already set
      if (output.metadata) {
        output.metadata.processingTimeMs ??= Date.now() - startTime;
      } else {
        output.metadata = { processingTimeMs: Date.now() - startTime };
      }
    } catch (err) {
      output = {
        requestId: agentMessage.payload?.requestId ?? 'unknown',
        success: false,
        content: [],
        error: {
          code: 'HANDLER_ERROR',
          message: err instanceof Error ? err.message : String(err),
        },
        metadata: { processingTimeMs: Date.now() - startTime },
      };
    }

    // Send response
    await this.sendResponse(message, output);

    return output;
  }

  /**
   * Subscribe to orchestrator events
   */
  on(listener: OrchestratorEventListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  // Private methods

  private schedulePoll(): void {
    if (this.state !== 'running') return;

    this.pollTimer = setTimeout(async () => {
      await this.poll();
      this.schedulePoll();
    }, this.config.pollInterval);
  }

  private async poll(): Promise<void> {
    if (this.state !== 'running' || this.processing) return;

    this.processing = true;

    try {
      // Fetch inbox messages
      const messages = await this.config.client.inbox.list(
        this.config.groupId,
        this.config.actorId,
        { kind_filter: 'chat', limit: 10 }
      );

      // Process each message
      for (const message of messages) {
        if (this.state !== 'running') break;

        this.emit({
          type: 'message_received',
          timestamp: new Date(),
          data: { eventId: message.event_id, by: message.by },
        });

        try {
          await this.dispatch(message);

          // Mark as read if auto-ack enabled
          if (this.config.autoAck) {
            await this.config.client.inbox.markRead(
              this.config.groupId,
              this.config.actorId,
              message.event_id
            );
          }

          this.emit({
            type: 'message_processed',
            timestamp: new Date(),
            data: { eventId: message.event_id },
          });
        } catch (err) {
          this.config.onError(err instanceof Error ? err : new Error(String(err)), message);
          this.emit({
            type: 'error',
            timestamp: new Date(),
            data: { eventId: message.event_id, error: String(err) },
          });
        }
      }
    } catch (err) {
      this.config.onError(err instanceof Error ? err : new Error(String(err)));
      this.emit({
        type: 'error',
        timestamp: new Date(),
        data: { error: String(err) },
      });
    } finally {
      this.processing = false;
    }
  }

  private parseMessage(message: InboxMessage): AgentMessage {
    const text = message.data.text.trim();

    // Try to parse as JSON agent request
    if (text.startsWith('{')) {
      try {
        const parsed = JSON.parse(text);
        if (parsed.type === 'agent_request' && parsed.handlerType) {
          return parsed as AgentMessage;
        }
      } catch {
        // Not valid JSON, treat as plain text
      }
    }

    // Check for structured command format: @handler:type task payload
    const commandMatch = text.match(/^@(\w+):(\w+)\s+(\w+)\s*(.*)/s);
    if (commandMatch) {
      const [, handlerName, handlerType, task, payloadStr] = commandMatch;
      let payload: Record<string, unknown> = {};

      if (payloadStr.trim().startsWith('{')) {
        try {
          payload = JSON.parse(payloadStr);
        } catch {
          payload = { text: payloadStr };
        }
      } else {
        payload = { text: payloadStr };
      }

      return {
        type: 'agent_request',
        handlerType: handlerType as HandlerType,
        handlerName,
        task,
        payload: {
          requestId: message.event_id,
          task,
          content: [{ type: 'text', text: payloadStr.trim() || text }],
          params: payload,
        },
      };
    }

    // Default: treat as plain text message for text handler
    return {
      type: 'plain',
    };
  }

  private findHandler(message: AgentMessage): AgentHandler | undefined {
    const { handlerType, handlerName, task } = message;

    if (!handlerType) return undefined;

    // If name specified, get exact handler
    if (handlerName) {
      return this.config.registry.get(handlerType, handlerName);
    }

    // Otherwise, find by capability
    if (task) {
      return this.config.registry.getByCapability(handlerType, task);
    }

    // Fallback: get first handler of type
    const handlers = this.config.registry.list(handlerType);
    return handlers[0];
  }

  private async sendResponse(originalMessage: InboxMessage, output: AgentOutput): Promise<void> {
    const responseMessage: AgentMessage = {
      type: 'agent_response',
      response: output,
    };

    await this.config.client.messages.reply(
      this.config.groupId,
      this.config.actorId,
      {
        event_id: originalMessage.event_id,
        text: JSON.stringify(responseMessage, null, 2),
        to: [originalMessage.by],
      }
    );
  }

  private emit(event: OrchestratorEvent): void {
    for (const listener of this.listeners) {
      try {
        listener(event);
      } catch (err) {
        console.error('Orchestrator event listener error:', err);
      }
    }
  }
}

/**
 * Helper to create agent request message
 */
export function createAgentRequest(
  handlerType: HandlerType,
  task: string,
  content: ContentItem[],
  options: {
    handlerName?: string;
    params?: Record<string, unknown>;
    requestId?: string;
  } = {}
): AgentMessage {
  return {
    type: 'agent_request',
    handlerType,
    handlerName: options.handlerName,
    task,
    payload: {
      requestId: options.requestId ?? `req_${Date.now()}_${Math.random().toString(36).slice(2)}`,
      task,
      content,
      params: options.params,
    },
  };
}

/**
 * Helper to parse agent response from message text
 */
export function parseAgentResponse(text: string): AgentOutput | null {
  try {
    const parsed = JSON.parse(text);
    if (parsed.type === 'agent_response' && parsed.response) {
      return parsed.response as AgentOutput;
    }
  } catch {
    // Not a valid response
  }
  return null;
}
