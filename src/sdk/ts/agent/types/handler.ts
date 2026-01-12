/**
 * Agent Handler Types
 *
 * Defines the core interfaces for registrable agent handlers
 */

/**
 * Supported handler types
 */
export type HandlerType = 'text' | 'image' | 'video' | 'audio' | 'multimodal';

/**
 * Input content item for agent processing
 */
export interface ContentItem {
  type: 'text' | 'image' | 'video' | 'audio' | 'file';
  /** Text content (for type='text') */
  text?: string;
  /** URL or file path (for media types) */
  url?: string;
  /** Base64 encoded data */
  data?: string;
  /** MIME type */
  mimeType?: string;
  /** Additional metadata */
  metadata?: Record<string, unknown>;
}

/**
 * Agent input payload
 */
export interface AgentInput {
  /** Unique request ID */
  requestId: string;
  /** Primary task/capability being requested */
  task: string;
  /** Input content items */
  content: ContentItem[];
  /** Task-specific parameters */
  params?: Record<string, unknown>;
  /** Conversation context (for multi-turn) */
  context?: {
    conversationId?: string;
    history?: Array<{
      role: 'user' | 'assistant' | 'system';
      content: ContentItem[];
    }>;
  };
}

/**
 * Agent output result
 */
export interface AgentOutput {
  /** Echo back request ID */
  requestId: string;
  /** Whether processing succeeded */
  success: boolean;
  /** Output content items */
  content: ContentItem[];
  /** Error information (if success=false) */
  error?: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
  /** Processing metadata */
  metadata?: {
    /** Processing time in ms */
    processingTimeMs?: number;
    /** Model/service used */
    model?: string;
    /** Token usage (for LLM handlers) */
    usage?: {
      inputTokens?: number;
      outputTokens?: number;
      totalTokens?: number;
    };
    /** Additional info */
    [key: string]: unknown;
  };
}

/**
 * Handler capability descriptor
 */
export interface HandlerCapability {
  /** Capability name (e.g., 'generate', 'analyze', 'transform') */
  name: string;
  /** Human-readable description */
  description?: string;
  /** Supported input types for this capability */
  inputTypes?: ContentItem['type'][];
  /** Output types this capability produces */
  outputTypes?: ContentItem['type'][];
}

/**
 * Handler configuration options
 */
export interface HandlerConfig {
  /** API endpoint base URL */
  apiBase?: string;
  /** API key */
  apiKey?: string;
  /** Model identifier */
  model?: string;
  /** Request timeout in ms */
  timeout?: number;
  /** Maximum retries */
  maxRetries?: number;
  /** Additional provider-specific options */
  [key: string]: unknown;
}

/**
 * Agent Handler interface
 *
 * Implement this interface to create a new handler that can be
 * registered with the AgentRegistry.
 *
 * @example
 * ```typescript
 * class GeminiTextHandler implements AgentHandler {
 *   type: HandlerType = 'text';
 *   name = 'gemini-3-preview';
 *   capabilities = [
 *     { name: 'generate', description: 'Generate text responses' },
 *     { name: 'analyze', description: 'Analyze input content' }
 *   ];
 *
 *   async process(input: AgentInput): Promise<AgentOutput> {
 *     // Implementation
 *   }
 * }
 * ```
 */
export interface AgentHandler {
  /** Handler type category */
  readonly type: HandlerType;

  /** Unique handler name */
  readonly name: string;

  /** List of capabilities this handler supports */
  readonly capabilities: HandlerCapability[];

  /**
   * Process an input request
   * @param input - The input payload to process
   * @returns Promise resolving to the output result
   */
  process(input: AgentInput): Promise<AgentOutput>;

  /**
   * Optional initialization (called when handler is registered)
   */
  initialize?(): Promise<void>;

  /**
   * Optional cleanup (called when handler is unregistered)
   */
  dispose?(): Promise<void>;

  /**
   * Optional health check
   * @returns true if handler is healthy and ready
   */
  healthCheck?(): Promise<boolean>;
}

/**
 * Base class for implementing handlers
 * Provides common functionality and sensible defaults
 */
export abstract class BaseHandler implements AgentHandler {
  abstract readonly type: HandlerType;
  abstract readonly name: string;
  abstract readonly capabilities: HandlerCapability[];

  protected config: HandlerConfig;

  constructor(config: HandlerConfig = {}) {
    this.config = {
      timeout: 30000,
      maxRetries: 3,
      ...config,
    };
  }

  abstract process(input: AgentInput): Promise<AgentOutput>;

  async initialize(): Promise<void> {
    // Default: no-op
  }

  async dispose(): Promise<void> {
    // Default: no-op
  }

  async healthCheck(): Promise<boolean> {
    return true;
  }

  /**
   * Helper to create a successful output
   */
  protected createOutput(
    requestId: string,
    content: ContentItem[],
    metadata?: AgentOutput['metadata']
  ): AgentOutput {
    return {
      requestId,
      success: true,
      content,
      metadata,
    };
  }

  /**
   * Helper to create an error output
   */
  protected createErrorOutput(
    requestId: string,
    code: string,
    message: string,
    details?: Record<string, unknown>
  ): AgentOutput {
    return {
      requestId,
      success: false,
      content: [],
      error: { code, message, details },
    };
  }
}
