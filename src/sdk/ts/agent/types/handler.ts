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

// ============================================================================
// Video Generation Types (M4)
// ============================================================================

/**
 * Camera motion types for video generation
 */
export type CameraMotion =
  | 'static'
  | 'zoom_in'
  | 'zoom_out'
  | 'pan_left'
  | 'pan_right'
  | 'pan_up'
  | 'pan_down'
  | 'orbit'
  | 'follow';

/**
 * Video aspect ratio presets
 */
export type VideoAspectRatio = '16:9' | '9:16' | '1:1' | '4:3' | '3:4';

/**
 * Video resolution presets
 */
export type VideoResolution = '480p' | '720p' | '1080p' | '2k' | '4k';

/**
 * Parameters for video generation tasks
 * Used with AsyncTaskHandler for video generation providers
 */
export interface VideoGenerationParams {
  /** First frame image (for image-to-video) */
  firstFrame?: ImageContent;
  /** Last frame image (for controlled video generation) */
  lastFrame?: ImageContent;

  /** Video duration in seconds */
  duration?: number;
  /** Frames per second (output) */
  fps?: number;
  /** Video resolution */
  resolution?: VideoResolution;
  /** Aspect ratio */
  aspectRatio?: VideoAspectRatio;

  /** Camera motion control */
  cameraFixed?: boolean;
  /** Camera motion type */
  cameraMotion?: CameraMotion;

  /** Add watermark to output */
  watermark?: boolean;
  /** Output format */
  format?: 'mp4' | 'webm' | 'gif';

  /** Seed for reproducibility */
  seed?: number;
  /** Negative prompt (things to avoid) */
  negativePrompt?: string;

  /** Provider-specific parameters */
  providerParams?: Record<string, unknown>;
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

// ============================================================================
// Async Task Types (M4)
// ============================================================================

/**
 * Task status for async operations
 * Named AsyncTaskStatus to avoid conflict with context.ts TaskStatus
 */
export type AsyncTaskStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';

/**
 * Task information for async operations
 * Represents the state of a long-running task
 */
export interface TaskInfo {
  /** Unique task identifier */
  taskId: string;
  /** Current task status */
  status: AsyncTaskStatus;
  /** Progress percentage (0-100) */
  progress?: number;
  /** Task creation timestamp (ISO 8601) */
  createdAt: string;
  /** Last update timestamp (ISO 8601) */
  updatedAt?: string;
  /** Estimated completion time (ISO 8601) */
  estimatedCompletionAt?: string;
  /** Error information (if status='failed') */
  error?: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
  /** Result output (if status='completed') */
  result?: AgentOutput;
  /** Provider-specific metadata */
  metadata?: Record<string, unknown>;
}

/**
 * Options for polling task status
 */
export interface PollOptions {
  /** Polling interval in milliseconds (default: 5000) */
  interval?: number;
  /** Maximum wait time in milliseconds (default: 300000 = 5 minutes) */
  timeout?: number;
  /** Callback for progress updates */
  onProgress?: (info: TaskInfo) => void;
  /** Abort signal for cancellation */
  signal?: AbortSignal;
}

/**
 * Async task handler interface extension
 * Handlers that support async task operations should implement this
 */
export interface AsyncTaskCapable {
  /**
   * Whether this handler supports async task operations
   */
  readonly supportsAsyncTask: boolean;

  /**
   * Submit a new task for processing
   * @param input - The input payload to process
   * @returns Promise resolving to task info with taskId
   */
  submitTask(input: AgentInput): Promise<TaskInfo>;

  /**
   * Get the current status of a task
   * @param taskId - The task identifier
   * @returns Promise resolving to current task info
   */
  getTaskStatus(taskId: string): Promise<TaskInfo>;

  /**
   * Cancel a running task (optional)
   * @param taskId - The task identifier
   * @returns Promise resolving to updated task info
   */
  cancelTask?(taskId: string): Promise<TaskInfo>;
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

/**
 * Abstract base class for async task handlers
 *
 * Use this for long-running operations like video/image generation
 * that follow the submit → poll → get result pattern.
 *
 * @example
 * ```typescript
 * class DoubaoVideoHandler extends AsyncTaskHandler {
 *   readonly type: HandlerType = 'video';
 *   readonly name = 'doubao-video';
 *   readonly capabilities = [{ name: 'generate', description: 'Generate video' }];
 *   readonly supportsAsyncTask = true;
 *
 *   async submitTask(input: AgentInput): Promise<TaskInfo> {
 *     // Call provider API to submit task
 *     const response = await this.callProviderSubmit(input);
 *     return {
 *       taskId: response.task_id,
 *       status: 'pending',
 *       createdAt: new Date().toISOString(),
 *     };
 *   }
 *
 *   async getTaskStatus(taskId: string): Promise<TaskInfo> {
 *     // Poll provider API for status
 *     const response = await this.callProviderStatus(taskId);
 *     return this.mapProviderStatus(response);
 *   }
 * }
 * ```
 */
export abstract class AsyncTaskHandler extends BaseHandler implements AsyncTaskCapable {
  /**
   * Whether this handler supports async task operations
   */
  readonly supportsAsyncTask: boolean = true;

  /**
   * Submit a new task for processing
   * @param input - The input payload to process
   * @returns Promise resolving to task info with taskId
   */
  abstract submitTask(input: AgentInput): Promise<TaskInfo>;

  /**
   * Get the current status of a task
   * @param taskId - The task identifier
   * @returns Promise resolving to current task info
   */
  abstract getTaskStatus(taskId: string): Promise<TaskInfo>;

  /**
   * Cancel a running task (optional, override if supported)
   * @param taskId - The task identifier
   * @returns Promise resolving to updated task info
   */
  async cancelTask(taskId: string): Promise<TaskInfo> {
    return {
      taskId,
      status: 'failed',
      createdAt: new Date().toISOString(),
      error: {
        code: 'CANCEL_NOT_SUPPORTED',
        message: 'This handler does not support task cancellation',
      },
    };
  }

  /**
   * Default implementation of process() for async handlers
   * Uses processWithPolling internally
   */
  async process(input: AgentInput): Promise<AgentOutput> {
    return this.processWithPolling(input);
  }

  /**
   * Submit task and poll until completion
   *
   * Convenience method that handles the full async task lifecycle:
   * 1. Submit the task
   * 2. Poll for status updates
   * 3. Return the final result
   *
   * @param input - The input payload to process
   * @param options - Polling options (interval, timeout, callbacks)
   * @returns Promise resolving to the final output
   */
  async processWithPolling(
    input: AgentInput,
    options: PollOptions = {}
  ): Promise<AgentOutput> {
    const {
      interval = 5000,
      timeout = 300000,
      onProgress,
      signal,
    } = options;

    // Submit the task
    let taskInfo = await this.submitTask(input);

    if (onProgress) {
      onProgress(taskInfo);
    }

    // Poll until completion or timeout
    const startTime = Date.now();

    while (
      taskInfo.status !== 'completed' &&
      taskInfo.status !== 'failed' &&
      taskInfo.status !== 'cancelled'
    ) {
      // Check timeout
      if (Date.now() - startTime > timeout) {
        return this.createErrorOutput(
          input.requestId,
          'TIMEOUT',
          `Task ${taskInfo.taskId} timed out after ${timeout}ms`,
          { taskId: taskInfo.taskId, lastStatus: taskInfo.status }
        );
      }

      // Check abort signal
      if (signal?.aborted) {
        // Try to cancel the task
        await this.cancelTask(taskInfo.taskId).catch(() => {});
        return this.createErrorOutput(
          input.requestId,
          'ABORTED',
          'Task was aborted by user',
          { taskId: taskInfo.taskId }
        );
      }

      // Wait for next poll
      await this.sleep(interval);

      // Get updated status
      taskInfo = await this.getTaskStatus(taskInfo.taskId);

      if (onProgress) {
        onProgress(taskInfo);
      }
    }

    // Handle final status
    if (taskInfo.status === 'completed' && taskInfo.result) {
      return taskInfo.result;
    }

    if (taskInfo.status === 'failed') {
      return this.createErrorOutput(
        input.requestId,
        taskInfo.error?.code ?? 'TASK_FAILED',
        taskInfo.error?.message ?? 'Task failed',
        { taskId: taskInfo.taskId, ...taskInfo.error?.details }
      );
    }

    if (taskInfo.status === 'cancelled') {
      return this.createErrorOutput(
        input.requestId,
        'TASK_CANCELLED',
        'Task was cancelled',
        { taskId: taskInfo.taskId }
      );
    }

    // Shouldn't reach here, but handle gracefully
    return this.createErrorOutput(
      input.requestId,
      'UNKNOWN_STATUS',
      `Task ended with unexpected status: ${taskInfo.status}`,
      { taskId: taskInfo.taskId }
    );
  }

  /**
   * Helper to create a TaskInfo for pending status
   */
  protected createPendingTask(taskId: string, metadata?: Record<string, unknown>): TaskInfo {
    return {
      taskId,
      status: 'pending',
      createdAt: new Date().toISOString(),
      metadata,
    };
  }

  /**
   * Helper to create a TaskInfo for completed status
   */
  protected createCompletedTask(
    taskId: string,
    result: AgentOutput,
    metadata?: Record<string, unknown>
  ): TaskInfo {
    return {
      taskId,
      status: 'completed',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      progress: 100,
      result,
      metadata,
    };
  }

  /**
   * Helper to create a TaskInfo for failed status
   */
  protected createFailedTask(
    taskId: string,
    code: string,
    message: string,
    details?: Record<string, unknown>
  ): TaskInfo {
    return {
      taskId,
      status: 'failed',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      error: { code, message, details },
    };
  }

  /**
   * Sleep helper for polling
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
