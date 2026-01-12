/**
 * Claude Text Handler
 *
 * Handler for Anthropic Claude text generation models.
 * Supports custom API base URL for proxy configurations.
 */

import {
  BaseHandler,
  type HandlerType,
  type HandlerCapability,
  type AgentInput,
  type AgentOutput,
  type HandlerConfig,
  type ContentItem,
  type ContentChunk,
  type ToolDefinition,
  type ToolCall,
  type ToolChoice,
  type ToolResult,
  type JSONSchema,
  type ImageContent,
} from '../types/handler.js';
import { StreamingHandler } from '../streaming.js';

/**
 * Claude-specific configuration
 */
export interface ClaudeHandlerConfig extends HandlerConfig {
  /** API key for Claude */
  apiKey: string;
  /** Model to use (default: claude-sonnet-4-5-20250929) */
  model?: string;
  /** Custom API base URL (for proxy) */
  apiBase?: string;
  /** Anthropic API version (default: 2023-06-01) */
  apiVersion?: string;
  /** Request timeout in ms (default: 30000) */
  timeout?: number;
  /** Default temperature (0-1, default: 1.0) */
  temperature?: number;
  /** Default max tokens (required for Claude API) */
  maxTokens?: number;
}

/**
 * Claude API response types
 */
interface ClaudeTextBlock {
  type: 'text';
  text: string;
}

interface ClaudeToolUseBlock {
  type: 'tool_use';
  id: string;
  name: string;
  input: Record<string, unknown>;
}

type ClaudeContentBlock = ClaudeTextBlock | ClaudeToolUseBlock;

/**
 * Claude tool definition format
 */
interface ClaudeTool {
  name: string;
  description: string;
  input_schema: JSONSchema;
}

/**
 * Claude message content types
 */
interface ClaudeTextContent {
  type: 'text';
  text: string;
}

interface ClaudeToolResultContent {
  type: 'tool_result';
  tool_use_id: string;
  content: string;
  is_error?: boolean;
}

interface ClaudeToolUseContent {
  type: 'tool_use';
  id: string;
  name: string;
  input: Record<string, unknown>;
}

/**
 * Claude image content types for Vision
 */
interface ClaudeImageBase64Source {
  type: 'base64';
  media_type: string;
  data: string;
}

interface ClaudeImageUrlSource {
  type: 'url';
  url: string;
}

type ClaudeImageSource = ClaudeImageBase64Source | ClaudeImageUrlSource;

interface ClaudeImageContent {
  type: 'image';
  source: ClaudeImageSource;
}

type ClaudeMessageContent =
  | ClaudeTextContent
  | ClaudeToolResultContent
  | ClaudeToolUseContent
  | ClaudeImageContent;

interface ClaudeUsage {
  input_tokens: number;
  output_tokens: number;
}

interface ClaudeResponse {
  id: string;
  type: 'message';
  role: 'assistant';
  content: ClaudeContentBlock[];
  model: string;
  stop_reason: string;
  usage: ClaudeUsage;
}

interface ClaudeErrorResponse {
  type: 'error';
  error?: {
    type: string;
    message: string;
  };
}

interface ClaudeMessage {
  role: 'user' | 'assistant';
  content: string | ClaudeMessageContent[];
}

/**
 * Default Claude API base URL
 */
const DEFAULT_CLAUDE_API_BASE = 'https://api.anthropic.com/v1';

/**
 * Default Anthropic API version
 */
const DEFAULT_ANTHROPIC_VERSION = '2023-06-01';

/**
 * Convert ToolDefinition to Claude tool format
 */
function convertToClaudeTools(tools: ToolDefinition[]): ClaudeTool[] {
  return tools.map((tool) => ({
    name: tool.name,
    description: tool.description,
    input_schema: tool.parameters,
  }));
}

/**
 * Convert ToolChoice to Claude tool_choice format
 */
function convertToClaudeToolChoice(
  choice: ToolChoice
): { type: 'auto' | 'any' | 'tool'; name?: string } | undefined {
  if (choice === 'auto') return { type: 'auto' };
  if (choice === 'none') return undefined; // Claude doesn't support 'none', just omit tools
  if (choice === 'required') return { type: 'any' };
  if (typeof choice === 'object' && choice.type === 'tool') {
    return { type: 'tool', name: choice.name };
  }
  return undefined;
}

/**
 * Parse Claude tool_use blocks to ToolCall[]
 */
function parseClaudeToolUse(blocks: ClaudeContentBlock[]): ToolCall[] {
  return blocks
    .filter((block): block is ClaudeToolUseBlock => block.type === 'tool_use')
    .map((block) => ({
      id: block.id,
      name: block.name,
      arguments: block.input,
    }));
}

/**
 * Convert ToolResult to Claude message content format
 */
function convertToolResultToContent(result: ToolResult): ClaudeToolResultContent {
  const content =
    typeof result.content === 'string' ? result.content : JSON.stringify(result.content);
  return {
    type: 'tool_result',
    tool_use_id: result.toolCallId,
    content: result.isError ? `Error: ${content}` : content,
    is_error: result.isError,
  };
}

/**
 * Convert ToolCall to Claude assistant message content
 */
function convertToolCallToContent(toolCall: ToolCall): ClaudeToolUseContent {
  return {
    type: 'tool_use',
    id: toolCall.id,
    name: toolCall.name,
    input: toolCall.arguments,
  };
}

/**
 * Convert ImageContent to Claude image format
 */
function convertImageToClaude(image: ImageContent): ClaudeImageContent {
  // Handle different source types
  if (image.source.type === 'url') {
    return {
      type: 'image',
      source: {
        type: 'url',
        url: image.source.url,
      },
    };
  } else if (image.source.type === 'base64') {
    return {
      type: 'image',
      source: {
        type: 'base64',
        media_type: image.source.mediaType,
        data: image.source.data,
      },
    };
  } else if (image.source.type === 'file') {
    // File paths need to be converted to base64 by the caller
    throw new Error('File-based images must be converted to base64 before processing');
  }

  throw new Error('Unknown image source type');
}

/**
 * Convert ContentItem[] to Claude content format (for vision)
 * Returns string for text-only content, or array for multimodal content
 */
function convertContentToClaude(items: ContentItem[]): string | ClaudeMessageContent[] {
  // Check if we have any images
  const hasImages = items.some((item) => item.type === 'image');

  // If no images, return simple text string
  if (!hasImages) {
    return items
      .filter((item) => item.type === 'text' && item.text)
      .map((item) => item.text!)
      .join('\n');
  }

  // Build multimodal content array
  const parts: ClaudeMessageContent[] = [];

  for (const item of items) {
    if (item.type === 'text' && item.text) {
      parts.push({ type: 'text', text: item.text });
    } else if (item.type === 'image' && item.image) {
      parts.push(convertImageToClaude(item.image));
    } else if (item.type === 'image' && (item.url || item.data)) {
      // Legacy format support
      if (item.url) {
        parts.push({
          type: 'image',
          source: {
            type: 'url',
            url: item.url,
          },
        });
      } else if (item.data && item.mimeType) {
        parts.push({
          type: 'image',
          source: {
            type: 'base64',
            media_type: item.mimeType,
            data: item.data,
          },
        });
      }
    }
  }

  return parts.length > 0 ? parts : '';
}

/**
 * ClaudeTextHandler
 *
 * Implements text generation using Anthropic Claude Messages API.
 * Supports custom API base URL for proxy configurations.
 *
 * @example
 * ```typescript
 * const handler = new ClaudeTextHandler({
 *   apiKey: process.env.ANTHROPIC_API_KEY!,
 *   apiBase: 'https://my-proxy.com/v1',  // Optional custom proxy
 *   model: 'claude-sonnet-4-5-20250929',
 *   maxTokens: 1024,
 * });
 *
 * const output = await handler.process({
 *   requestId: 'req-1',
 *   task: 'generate',
 *   content: [{ type: 'text', text: 'Hello, how are you?' }],
 * });
 * ```
 */
export class ClaudeTextHandler extends BaseHandler {
  readonly type: HandlerType = 'text';
  readonly name: string;
  readonly capabilities: HandlerCapability[] = [
    { name: 'generate', description: 'Generate text responses' },
    { name: 'chat', description: 'Multi-turn conversation' },
    { name: 'analyze', description: 'Analyze and summarize text' },
    { name: 'tool_call', description: 'Function calling / tool use' },
    { name: 'vision', description: 'Analyze images (claude-3 models)' },
  ];

  private claudeConfig: ClaudeHandlerConfig;
  private apiBase: string;

  constructor(config: ClaudeHandlerConfig) {
    super(config);

    if (!config.apiKey) {
      throw new Error('ClaudeTextHandler requires apiKey');
    }

    this.claudeConfig = {
      model: 'claude-sonnet-4-5-20250929',
      apiVersion: DEFAULT_ANTHROPIC_VERSION,
      timeout: 30000,
      temperature: 1.0,
      maxTokens: 1024,
      ...config,
    };

    this.name = this.claudeConfig.model!;
    this.apiBase = config.apiBase || DEFAULT_CLAUDE_API_BASE;
  }

  /**
   * Process an agent input request
   */
  async process(input: AgentInput): Promise<AgentOutput> {
    const startTime = Date.now();

    try {
      const requestBody = this.buildRequestBody(input);
      const response = await this.callClaudeAPI(requestBody);
      return this.parseResponse(input.requestId, response, startTime);
    } catch (error) {
      return this.handleError(input.requestId, error, startTime);
    }
  }

  /**
   * Health check - verify API connectivity
   */
  async healthCheck(): Promise<boolean> {
    try {
      const testBody = {
        model: this.claudeConfig.model,
        max_tokens: 5,
        messages: [{ role: 'user', content: 'Hi' }],
      };

      const response = await this.callClaudeAPI(testBody);
      return !!response.content && response.content.length > 0;
    } catch {
      return false;
    }
  }

  /**
   * Build Claude API request body
   */
  private buildRequestBody(input: AgentInput): Record<string, unknown> {
    // Build messages array
    const messages: ClaudeMessage[] = [];

    // Add conversation history if provided
    if (input.context?.history) {
      for (const msg of input.context.history) {
        // Check for tool_call content (assistant message with tool calls)
        const toolCallItems = msg.content.filter((c) => c.type === 'tool_call' && c.toolCall);
        if (toolCallItems.length > 0 && msg.role === 'assistant') {
          const contentArray: ClaudeMessageContent[] = [];
          for (const c of msg.content) {
            if (c.type === 'text' && c.text) {
              contentArray.push({ type: 'text', text: c.text });
            } else if (c.type === 'tool_call' && c.toolCall) {
              contentArray.push(convertToolCallToContent(c.toolCall));
            }
          }
          messages.push({ role: 'assistant', content: contentArray });
          continue;
        }

        // Check for tool_result content
        const toolResultItems = msg.content.filter(
          (c) => c.type === 'tool_result' && c.toolResult
        );
        if (toolResultItems.length > 0) {
          const contentArray: ClaudeMessageContent[] = toolResultItems.map((item) =>
            convertToolResultToContent(item.toolResult!)
          );
          messages.push({ role: 'user', content: contentArray });
          continue;
        }

        // Regular text/image content (for user messages that may have images)
        if (msg.role === 'user') {
          const content = convertContentToClaude(msg.content);
          if (content && (typeof content === 'string' ? content.length > 0 : content.length > 0)) {
            messages.push({ role: 'user', content });
          }
        } else {
          // Assistant messages - text only in history
          const textContent = msg.content
            .filter((c) => c.type === 'text' && c.text)
            .map((c) => c.text!)
            .join('\n');

          if (textContent) {
            messages.push({ role: 'assistant', content: textContent });
          }
        }
      }
    }

    // Handle current content - could be text, image, or tool_result
    const toolResultItems = input.content.filter((c) => c.type === 'tool_result' && c.toolResult);
    if (toolResultItems.length > 0) {
      const contentArray: ClaudeMessageContent[] = toolResultItems.map((item) =>
        convertToolResultToContent(item.toolResult!)
      );
      messages.push({ role: 'user', content: contentArray });
    } else {
      // Convert content (text and images) for user message
      const content = convertContentToClaude(input.content);

      if (content && (typeof content === 'string' ? content.length > 0 : content.length > 0)) {
        messages.push({ role: 'user', content });
      }
    }

    // Ensure we have at least one message
    if (messages.length === 0) {
      throw new Error('No content provided');
    }

    // Build request body
    const body: Record<string, unknown> = {
      model: this.claudeConfig.model,
      messages,
      max_tokens: input.params?.maxTokens ?? this.claudeConfig.maxTokens,
    };

    // Add tools if provided
    if (input.tools && input.tools.length > 0) {
      body.tools = convertToClaudeTools(input.tools);
    }

    // Add tool_choice if provided
    if (input.toolChoice) {
      const toolChoice = convertToClaudeToolChoice(input.toolChoice);
      if (toolChoice) {
        body.tool_choice = toolChoice;
      }
    }

    // Add temperature
    const temperature = input.params?.temperature ?? this.claudeConfig.temperature;
    if (temperature !== undefined) {
      body.temperature = temperature;
    }

    // Add system instruction if provided
    if (input.params?.systemInstruction) {
      body.system = input.params.systemInstruction;
    }

    // Add stop sequences if provided
    if (input.params?.stop) {
      body.stop_sequences = input.params.stop;
    }

    return body;
  }

  /**
   * Call Claude API using fetch
   */
  private async callClaudeAPI(body: Record<string, unknown>): Promise<ClaudeResponse> {
    const url = `${this.apiBase}/messages`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.claudeConfig.timeout);

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': this.claudeConfig.apiKey,
          'anthropic-version': this.claudeConfig.apiVersion!,
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorData = (await response.json().catch(() => ({}))) as ClaudeErrorResponse;
        const errorMessage = errorData.error?.message || `HTTP ${response.status}`;
        const errorCode = this.mapHttpStatusToErrorCode(response.status);
        throw new ClaudeAPIError(errorCode, errorMessage, response.status);
      }

      return (await response.json()) as ClaudeResponse;
    } catch (error) {
      clearTimeout(timeoutId);

      if (error instanceof ClaudeAPIError) {
        throw error;
      }

      if (error instanceof Error && error.name === 'AbortError') {
        throw new ClaudeAPIError('TIMEOUT', `Request timed out after ${this.claudeConfig.timeout}ms`);
      }

      throw new ClaudeAPIError('NETWORK_ERROR', error instanceof Error ? error.message : 'Unknown error');
    }
  }

  /**
   * Parse Claude API response to AgentOutput
   */
  private parseResponse(requestId: string, response: ClaudeResponse, startTime: number): AgentOutput {
    const contentBlocks = response.content || [];

    if (contentBlocks.length === 0) {
      return this.createErrorOutput(requestId, 'NO_RESPONSE', 'No content returned from API');
    }

    const content: ContentItem[] = [];

    // Process all content blocks
    for (const block of contentBlocks) {
      if (block.type === 'text') {
        content.push({ type: 'text', text: (block as ClaudeTextBlock).text });
      } else if (block.type === 'tool_use') {
        const toolBlock = block as ClaudeToolUseBlock;
        const toolCall: ToolCall = {
          id: toolBlock.id,
          name: toolBlock.name,
          arguments: toolBlock.input,
        };
        content.push({ type: 'tool_call', toolCall });
      }
    }

    // Ensure we have at least some content
    if (content.length === 0) {
      content.push({ type: 'text', text: '' });
    }

    return this.createOutput(requestId, content, {
      processingTimeMs: Date.now() - startTime,
      model: response.model,
      finishReason: response.stop_reason,
      usage: response.usage
        ? {
            inputTokens: response.usage.input_tokens,
            outputTokens: response.usage.output_tokens,
            totalTokens: response.usage.input_tokens + response.usage.output_tokens,
          }
        : undefined,
    });
  }

  /**
   * Handle errors and convert to AgentOutput
   */
  private handleError(requestId: string, error: unknown, startTime: number): AgentOutput {
    const processingTimeMs = Date.now() - startTime;

    if (error instanceof ClaudeAPIError) {
      return {
        requestId,
        success: false,
        content: [],
        error: {
          code: error.code,
          message: error.message,
          details: { httpStatus: error.httpStatus },
        },
        metadata: { processingTimeMs, model: this.claudeConfig.model },
      };
    }

    return {
      requestId,
      success: false,
      content: [],
      error: {
        code: 'UNKNOWN_ERROR',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      metadata: { processingTimeMs, model: this.claudeConfig.model },
    };
  }

  /**
   * Map HTTP status code to error code
   */
  private mapHttpStatusToErrorCode(status: number): string {
    switch (status) {
      case 400:
        return 'INVALID_REQUEST';
      case 401:
        return 'AUTHENTICATION_ERROR';
      case 403:
        return 'PERMISSION_DENIED';
      case 404:
        return 'MODEL_NOT_FOUND';
      case 429:
        return 'RATE_LIMIT_EXCEEDED';
      case 500:
      case 502:
      case 503:
        return 'SERVER_ERROR';
      case 529:
        return 'OVERLOADED';
      default:
        return 'API_ERROR';
    }
  }
}

/**
 * Custom error class for Claude API errors
 */
export class ClaudeAPIError extends Error {
  constructor(
    public code: string,
    message: string,
    public httpStatus?: number
  ) {
    super(message);
    this.name = 'ClaudeAPIError';
  }
}

/**
 * Claude SSE stream event types
 */
interface ClaudeStreamEvent {
  type: string;
  message?: {
    id: string;
    type: string;
    role: string;
    model: string;
    usage?: {
      input_tokens: number;
      output_tokens: number;
    };
  };
  index?: number;
  content_block?: {
    type: string;
    text?: string;
    // For tool_use blocks
    id?: string;
    name?: string;
    input?: Record<string, unknown>;
  };
  delta?: {
    type: string;
    text?: string;
    stop_reason?: string;
    stop_sequence?: string;
    // For tool_use input deltas
    partial_json?: string;
  };
  usage?: {
    output_tokens: number;
  };
}

/**
 * ClaudeStreamingHandler
 *
 * Implements streaming text generation using Anthropic Claude Messages API.
 * Supports custom API base URL for proxy configurations.
 *
 * @example
 * ```typescript
 * const handler = new ClaudeStreamingHandler({
 *   apiKey: process.env.ANTHROPIC_API_KEY!,
 *   model: 'claude-sonnet-4-5-20250929',
 * });
 *
 * // Use with streaming
 * for await (const chunk of handler.processStream(input)) {
 *   if (chunk.type === 'delta') {
 *     process.stdout.write(chunk.text!);
 *   }
 * }
 *
 * // Or use non-streaming (collects all chunks)
 * const output = await handler.process(input);
 * ```
 */
export class ClaudeStreamingHandler extends StreamingHandler {
  readonly type: HandlerType = 'text';
  readonly name: string;
  readonly capabilities: HandlerCapability[] = [
    { name: 'generate', description: 'Generate text responses (streaming)' },
    { name: 'chat', description: 'Multi-turn conversation (streaming)' },
    { name: 'analyze', description: 'Analyze and summarize text (streaming)' },
    { name: 'tool_call', description: 'Function calling / tool use (streaming)' },
    { name: 'vision', description: 'Analyze images (streaming, claude-3 models)' },
  ];

  private claudeConfig: ClaudeHandlerConfig;
  private apiBase: string;

  constructor(config: ClaudeHandlerConfig) {
    super(config);

    if (!config.apiKey) {
      throw new Error('ClaudeStreamingHandler requires apiKey');
    }

    this.claudeConfig = {
      model: 'claude-sonnet-4-5-20250929',
      apiVersion: DEFAULT_ANTHROPIC_VERSION,
      timeout: 60000, // Longer timeout for streaming
      temperature: 1.0,
      maxTokens: 1024,
      ...config,
    };

    this.name = `${this.claudeConfig.model!}-streaming`;
    this.apiBase = config.apiBase || DEFAULT_CLAUDE_API_BASE;
  }

  /**
   * Process input and yield streaming chunks
   */
  async *processStream(input: AgentInput): AsyncIterable<ContentChunk> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.claudeConfig.timeout);

    try {
      const requestBody = this.buildStreamRequestBody(input);
      const response = await this.initiateStreamRequest(requestBody, controller.signal);

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorData = (await response.json().catch(() => ({}))) as ClaudeErrorResponse;
        const errorMessage = errorData.error?.message || `HTTP ${response.status}`;
        yield this.createErrorChunk(this.mapHttpStatusToErrorCode(response.status), errorMessage);
        yield this.createDoneChunk();
        return;
      }

      const reader = response.body?.getReader();
      if (!reader) {
        yield this.createErrorChunk('STREAM_ERROR', 'No response body');
        yield this.createDoneChunk();
        return;
      }

      const decoder = new TextDecoder();
      let buffer = '';
      let inputTokens = 0;
      let outputTokens = 0;

      // Tool call accumulator for streaming tool_use blocks
      // Map from content block index to accumulated tool call data
      const toolCallAccumulator: Map<number, { id: string; name: string; inputJson: string }> =
        new Map();

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          let currentEvent = '';
          for (const line of lines) {
            const trimmed = line.trim();

            if (trimmed.startsWith('event: ')) {
              currentEvent = trimmed.slice(7);
              continue;
            }

            if (trimmed.startsWith('data: ')) {
              const data = trimmed.slice(6);

              try {
                const event = JSON.parse(data) as ClaudeStreamEvent;

                switch (currentEvent) {
                  case 'message_start':
                    // Capture input tokens from initial message
                    if (event.message?.usage?.input_tokens) {
                      inputTokens = event.message.usage.input_tokens;
                    }
                    break;

                  case 'content_block_start':
                    // Handle start of content blocks
                    if (event.content_block?.type === 'tool_use' && event.index !== undefined) {
                      // Start accumulating a new tool call
                      toolCallAccumulator.set(event.index, {
                        id: event.content_block.id || '',
                        name: event.content_block.name || '',
                        inputJson: '',
                      });
                    }
                    break;

                  case 'content_block_delta':
                    // Yield text delta
                    if (event.delta?.type === 'text_delta' && event.delta.text) {
                      yield this.createDeltaChunk(event.delta.text);
                    }
                    // Accumulate tool_use input JSON
                    if (
                      event.delta?.type === 'input_json_delta' &&
                      event.delta.partial_json &&
                      event.index !== undefined
                    ) {
                      const toolCall = toolCallAccumulator.get(event.index);
                      if (toolCall) {
                        toolCall.inputJson += event.delta.partial_json;
                      }
                    }
                    break;

                  case 'content_block_stop':
                    // Emit completed tool call if any
                    if (event.index !== undefined) {
                      const toolCall = toolCallAccumulator.get(event.index);
                      if (toolCall && toolCall.id) {
                        // Parse accumulated JSON and emit tool_call chunk
                        let parsedInput: Record<string, unknown> = {};
                        if (toolCall.inputJson) {
                          try {
                            parsedInput = JSON.parse(toolCall.inputJson) as Record<string, unknown>;
                          } catch {
                            // Keep empty object if parse fails
                          }
                        }
                        yield {
                          type: 'tool_call',
                          toolCall: {
                            id: toolCall.id,
                            name: toolCall.name,
                            arguments: parsedInput,
                          },
                        };
                        toolCallAccumulator.delete(event.index);
                      }
                    }
                    break;

                  case 'message_delta':
                    // Capture output tokens
                    if (event.usage?.output_tokens) {
                      outputTokens = event.usage.output_tokens;
                    }
                    break;

                  case 'message_stop':
                    // Stream complete
                    if (inputTokens > 0 || outputTokens > 0) {
                      yield this.createUsageChunk(inputTokens, outputTokens, inputTokens + outputTokens);
                    }
                    yield this.createDoneChunk();
                    return;

                  case 'error':
                    // Handle error event
                    yield this.createErrorChunk('STREAM_ERROR', event.delta?.text || 'Unknown error');
                    yield this.createDoneChunk();
                    return;
                }
              } catch {
                // Skip invalid JSON
              }
            }
          }
        }
      } finally {
        reader.releaseLock();
      }

      // If we get here without message_stop, still emit done
      yield this.createDoneChunk();
    } catch (error) {
      clearTimeout(timeoutId);

      if (error instanceof Error && error.name === 'AbortError') {
        yield this.createErrorChunk('TIMEOUT', `Request timed out after ${this.claudeConfig.timeout}ms`);
      } else {
        yield this.createErrorChunk('NETWORK_ERROR', error instanceof Error ? error.message : 'Unknown error');
      }
      yield this.createDoneChunk();
    }
  }

  /**
   * Health check - verify API connectivity
   */
  async healthCheck(): Promise<boolean> {
    try {
      const testBody = {
        model: this.claudeConfig.model,
        max_tokens: 5,
        messages: [{ role: 'user', content: 'Hi' }],
      };

      const response = await fetch(`${this.apiBase}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': this.claudeConfig.apiKey,
          'anthropic-version': this.claudeConfig.apiVersion!,
        },
        body: JSON.stringify(testBody),
      });

      if (!response.ok) return false;
      const data = (await response.json()) as ClaudeResponse;
      return !!data.content && data.content.length > 0;
    } catch {
      return false;
    }
  }

  /**
   * Build streaming request body
   */
  private buildStreamRequestBody(input: AgentInput): Record<string, unknown> {
    // Build messages array
    const messages: ClaudeMessage[] = [];

    // Add conversation history if provided
    if (input.context?.history) {
      for (const msg of input.context.history) {
        // Check for tool_call content (assistant message with tool calls)
        const toolCallItems = msg.content.filter((c) => c.type === 'tool_call' && c.toolCall);
        if (toolCallItems.length > 0 && msg.role === 'assistant') {
          const contentArray: ClaudeMessageContent[] = [];
          for (const c of msg.content) {
            if (c.type === 'text' && c.text) {
              contentArray.push({ type: 'text', text: c.text });
            } else if (c.type === 'tool_call' && c.toolCall) {
              contentArray.push(convertToolCallToContent(c.toolCall));
            }
          }
          messages.push({ role: 'assistant', content: contentArray });
          continue;
        }

        // Check for tool_result content
        const toolResultItems = msg.content.filter(
          (c) => c.type === 'tool_result' && c.toolResult
        );
        if (toolResultItems.length > 0) {
          const contentArray: ClaudeMessageContent[] = toolResultItems.map((item) =>
            convertToolResultToContent(item.toolResult!)
          );
          messages.push({ role: 'user', content: contentArray });
          continue;
        }

        // Regular text/image content (for user messages that may have images)
        if (msg.role === 'user') {
          const content = convertContentToClaude(msg.content);
          if (content && (typeof content === 'string' ? content.length > 0 : content.length > 0)) {
            messages.push({ role: 'user', content });
          }
        } else {
          // Assistant messages - text only in history
          const textContent = msg.content
            .filter((c) => c.type === 'text' && c.text)
            .map((c) => c.text!)
            .join('\n');

          if (textContent) {
            messages.push({ role: 'assistant', content: textContent });
          }
        }
      }
    }

    // Handle current content - could be text, image, or tool_result
    const toolResultItems = input.content.filter((c) => c.type === 'tool_result' && c.toolResult);
    if (toolResultItems.length > 0) {
      const contentArray: ClaudeMessageContent[] = toolResultItems.map((item) =>
        convertToolResultToContent(item.toolResult!)
      );
      messages.push({ role: 'user', content: contentArray });
    } else {
      // Convert content (text and images) for user message
      const content = convertContentToClaude(input.content);

      if (content && (typeof content === 'string' ? content.length > 0 : content.length > 0)) {
        messages.push({ role: 'user', content });
      }
    }

    // Ensure we have at least one message
    if (messages.length === 0) {
      throw new Error('No content provided');
    }

    // Build request body
    const body: Record<string, unknown> = {
      model: this.claudeConfig.model,
      messages,
      max_tokens: input.params?.maxTokens ?? this.claudeConfig.maxTokens,
      stream: true,
    };

    // Add tools if provided
    if (input.tools && input.tools.length > 0) {
      body.tools = convertToClaudeTools(input.tools);
    }

    // Add tool_choice if provided
    if (input.toolChoice) {
      const toolChoice = convertToClaudeToolChoice(input.toolChoice);
      if (toolChoice) {
        body.tool_choice = toolChoice;
      }
    }

    const temperature = input.params?.temperature ?? this.claudeConfig.temperature;
    if (temperature !== undefined) {
      body.temperature = temperature;
    }

    if (input.params?.systemInstruction) {
      body.system = input.params.systemInstruction;
    }

    if (input.params?.stop) {
      body.stop_sequences = input.params.stop;
    }

    return body;
  }

  /**
   * Initiate streaming request
   */
  private async initiateStreamRequest(
    body: Record<string, unknown>,
    signal: AbortSignal
  ): Promise<Response> {
    return fetch(`${this.apiBase}/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.claudeConfig.apiKey,
        'anthropic-version': this.claudeConfig.apiVersion!,
      },
      body: JSON.stringify(body),
      signal,
    });
  }

  /**
   * Map HTTP status code to error code
   */
  private mapHttpStatusToErrorCode(status: number): string {
    switch (status) {
      case 400:
        return 'INVALID_REQUEST';
      case 401:
        return 'AUTHENTICATION_ERROR';
      case 403:
        return 'PERMISSION_DENIED';
      case 404:
        return 'MODEL_NOT_FOUND';
      case 429:
        return 'RATE_LIMIT_EXCEEDED';
      case 500:
      case 502:
      case 503:
        return 'SERVER_ERROR';
      case 529:
        return 'OVERLOADED';
      default:
        return 'API_ERROR';
    }
  }
}
