/**
 * Agent Handler Types
 *
 * Defines the core interfaces for registrable agent handlers
 */

/**
 * Supported handler types
 */
export type HandlerType = 'text' | 'image' | 'video' | 'audio' | 'multimodal';

// ============================================================================
// Tool Calling Types
// ============================================================================

/**
 * JSON Schema type for tool parameters
 * Simplified version supporting common schema properties
 */
export interface JSONSchemaProperty {
  type: 'string' | 'number' | 'integer' | 'boolean' | 'array' | 'object';
  description?: string;
  enum?: (string | number | boolean)[];
  items?: JSONSchemaProperty;
  properties?: Record<string, JSONSchemaProperty>;
  required?: string[];
  default?: unknown;
}

/**
 * JSON Schema for tool parameters
 */
export interface JSONSchema {
  type: 'object';
  properties: Record<string, JSONSchemaProperty>;
  required?: string[];
  additionalProperties?: boolean;
}

/**
 * Tool definition for function calling
 * Compatible with OpenAI and Claude tool formats
 */
export interface ToolDefinition {
  /** Unique tool name (function name) */
  name: string;
  /** Human-readable description of what the tool does */
  description: string;
  /** JSON Schema defining the tool's parameters */
  parameters: JSONSchema;
}

/**
 * Tool call request from the model
 * Represents the model's request to invoke a tool
 */
export interface ToolCall {
  /** Unique identifier for this tool call */
  id: string;
  /** Name of the tool to call */
  name: string;
  /** Arguments to pass to the tool (parsed from JSON) */
  arguments: Record<string, unknown>;
}

/**
 * Tool execution result
 * Represents the result of executing a tool call
 */
export interface ToolResult {
  /** ID of the tool call this result corresponds to */
  toolCallId: string;
  /** Result content (string or structured object) */
  content: string | Record<string, unknown>;
  /** Whether the tool execution resulted in an error */
  isError?: boolean;
}

/**
 * Tool choice control
 * Controls how the model should use tools
 */
export type ToolChoice =
  | 'auto'    // Model decides whether to use tools
  | 'none'    // Model must not use tools
  | 'required' // Model must use at least one tool
  | { type: 'tool'; name: string };  // Model must use the specified tool

// ============================================================================
// Multi-modal Content Types
// ============================================================================

/**
 * Image detail level for vision models
 * - 'auto': Let the model decide based on image size
 * - 'low': Faster, lower cost, less detail (512x512 max)
 * - 'high': Slower, higher cost, more detail (up to 2048x2048)
 */
export type ImageDetail = 'auto' | 'low' | 'high';

/**
 * Media source type discriminator
 */
export type MediaSourceType = 'url' | 'base64' | 'file';

/**
 * Base interface for media sources
 */
export interface MediaSourceBase {
  /** Source type discriminator */
  type: MediaSourceType;
}

/**
 * URL-based media source
 */
export interface UrlMediaSource extends MediaSourceBase {
  type: 'url';
  /** Public URL to the media file */
  url: string;
}

/**
 * Base64-encoded media source
 */
export interface Base64MediaSource extends MediaSourceBase {
  type: 'base64';
  /** Base64-encoded data (without data URI prefix) */
  data: string;
  /** MIME type (e.g., 'image/jpeg', 'image/png', 'audio/mp3') */
  mediaType: string;
}

/**
 * File path media source (for local files)
 */
export interface FileMediaSource extends MediaSourceBase {
  type: 'file';
  /** Local file path */
  path: string;
}

/**
 * Union type for all media sources
 */
export type MediaSource = UrlMediaSource | Base64MediaSource | FileMediaSource;

/**
 * Image content with detailed configuration
 * Supports both OpenAI and Claude vision APIs
 */
export interface ImageContent {
  /** Image source (URL, base64, or file path) */
  source: MediaSource;
  /** Analysis detail level (for vision models) */
  detail?: ImageDetail;
  /** Alt text description (for accessibility) */
  altText?: string;
}

/**
 * Audio content configuration
 * Supports speech-to-text and audio input modes
 */
export interface AudioContent {
  /** Audio source */
  source: MediaSource;
  /** Audio format hint (e.g., 'mp3', 'wav', 'webm') */
  format?: string;
  /** Language hint for transcription (ISO 639-1 code) */
  language?: string;
}

/**
 * Video content configuration (future support)
 */
export interface VideoContent {
  /** Video source */
  source: MediaSource;
  /** Video format hint */
  format?: string;
  /** Extract frames for analysis (frames per second) */
  extractFramesFps?: number;
}

/**
 * File/document content configuration
 */
export interface FileContent {
  /** File source */
  source: MediaSource;
  /** Original filename */
  filename?: string;
  /** File purpose hint (e.g., 'document', 'code', 'data') */
  purpose?: string;
}

// ============================================================================
// Streaming Types
// ============================================================================

/**
 * Chunk types for streaming responses
 */
export type ChunkType = 'text' | 'delta' | 'tool_call' | 'usage' | 'done' | 'error';

/**
 * Content chunk for streaming responses
 */
export interface ContentChunk {
  /** Chunk type */
  type: ChunkType;
  /** Text content (for 'text' and 'delta' types) */
  text?: string;
  /** Tool call (for 'tool_call' type) */
  toolCall?: ToolCall;
  /** Whether this is the final chunk */
  done?: boolean;
  /** Token usage info (for 'usage' type) */
  usage?: {
    inputTokens?: number;
    outputTokens?: number;
    totalTokens?: number;
  };
  /** Error info (for 'error' type) */
  error?: {
    code: string;
    message: string;
  };
  /** Additional metadata */
  metadata?: Record<string, unknown>;
}

/**
 * Streaming handler interface extension
 * Handlers that support streaming should implement this
 */
export interface StreamingCapable {
  /**
   * Whether this handler supports streaming
   */
  readonly supportsStreaming: boolean;

  /**
   * Process input and yield chunks as they become available
   * @param input - The input payload to process
   * @returns AsyncIterable of content chunks
   */
  processStream(input: AgentInput): AsyncIterable<ContentChunk>;
}

/**
 * Input content item for agent processing
 *
 * Supports multiple content types:
 * - text: Plain text content
 * - image: Image with URL, base64, or file source
 * - audio: Audio content for speech/transcription
 * - video: Video content (future support)
 * - file: Generic file/document content
 * - tool_call: Tool invocation request
 * - tool_result: Tool execution result
 */
export interface ContentItem {
  type: 'text' | 'image' | 'video' | 'audio' | 'file' | 'tool_call' | 'tool_result';

  // Text content (type='text')
  /** Text content */
  text?: string;

  // Multi-modal content (type='image'|'audio'|'video'|'file')
  /** Image content configuration (for type='image') */
  image?: ImageContent;
  /** Audio content configuration (for type='audio') */
  audio?: AudioContent;
  /** Video content configuration (for type='video') */
  video?: VideoContent;
  /** File content configuration (for type='file') */
  file?: FileContent;

  // Legacy media fields (deprecated, use specific content types above)
  /** @deprecated Use image.source.url or file.source.url instead */
  url?: string;
  /** @deprecated Use image.source.data or audio.source.data instead */
  data?: string;
  /** @deprecated Use image.source.mediaType instead */
  mimeType?: string;

  // Tool calling (type='tool_call'|'tool_result')
  /** Tool call request (for type='tool_call') */
  toolCall?: ToolCall;
  /** Tool execution result (for type='tool_result') */
  toolResult?: ToolResult;

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
  /** Available tools for function calling */
  tools?: ToolDefinition[];
  /** Tool choice control */
  toolChoice?: ToolChoice;
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
