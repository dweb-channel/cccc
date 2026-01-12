/**
 * OpenAI Text Handler
 *
 * Handler for OpenAI GPT text generation models.
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
  type ImageDetail,
} from '../types/handler.js';
import { StreamingHandler } from '../streaming.js';

/**
 * OpenAI-specific configuration
 */
export interface OpenAIHandlerConfig extends HandlerConfig {
  /** API key for OpenAI */
  apiKey: string;
  /** Model to use (default: gpt-4o) */
  model?: string;
  /** Custom API base URL (for proxy) */
  apiBase?: string;
  /** Request timeout in ms (default: 30000) */
  timeout?: number;
  /** Default temperature (0-2, default: 1.0) */
  temperature?: number;
  /** Default max tokens */
  maxTokens?: number;
}

/**
 * OpenAI API response types
 */
interface OpenAIFunctionCall {
  name: string;
  arguments: string; // JSON string
}

interface OpenAIToolCall {
  id: string;
  type: 'function';
  function: OpenAIFunctionCall;
}

/**
 * OpenAI Vision content part types
 */
interface OpenAITextPart {
  type: 'text';
  text: string;
}

interface OpenAIImageUrlPart {
  type: 'image_url';
  image_url: {
    url: string;
    detail?: 'auto' | 'low' | 'high';
  };
}

type OpenAIContentPart = OpenAITextPart | OpenAIImageUrlPart;

interface OpenAIMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string | OpenAIContentPart[] | null;
  tool_calls?: OpenAIToolCall[];
  tool_call_id?: string; // For tool role messages
}

interface OpenAIResponseMessage {
  role: 'assistant';
  content: string | null;
  tool_calls?: OpenAIToolCall[];
}

interface OpenAIChoice {
  index: number;
  message: OpenAIResponseMessage;
  finish_reason: string;
}

interface OpenAIUsage {
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
}

interface OpenAIResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: OpenAIChoice[];
  usage?: OpenAIUsage;
}

interface OpenAIErrorResponse {
  error?: {
    message: string;
    type: string;
    code: string;
  };
}

/**
 * Default OpenAI API base URL
 */
const DEFAULT_OPENAI_API_BASE = 'https://api.openai.com/v1';

/**
 * OpenAI tool format for request
 */
interface OpenAITool {
  type: 'function';
  function: {
    name: string;
    description: string;
    parameters: JSONSchema;
  };
}

/**
 * Convert ToolDefinition to OpenAI tool format
 */
function convertToOpenAITools(tools: ToolDefinition[]): OpenAITool[] {
  return tools.map((tool) => ({
    type: 'function',
    function: {
      name: tool.name,
      description: tool.description,
      parameters: tool.parameters,
    },
  }));
}

/**
 * Convert ToolChoice to OpenAI tool_choice format
 */
function convertToOpenAIToolChoice(
  choice: ToolChoice
): string | { type: 'function'; function: { name: string } } | undefined {
  if (choice === 'auto') return 'auto';
  if (choice === 'none') return 'none';
  if (choice === 'required') return 'required';
  if (typeof choice === 'object' && choice.type === 'tool') {
    return { type: 'function', function: { name: choice.name } };
  }
  return undefined;
}

/**
 * Parse OpenAI tool_calls to ToolCall[]
 */
function parseOpenAIToolCalls(toolCalls: OpenAIToolCall[]): ToolCall[] {
  return toolCalls.map((tc) => ({
    id: tc.id,
    name: tc.function.name,
    arguments: JSON.parse(tc.function.arguments || '{}'),
  }));
}

/**
 * Convert ToolResult to OpenAI message format
 */
function convertToolResultToMessage(result: ToolResult): OpenAIMessage {
  const content =
    typeof result.content === 'string' ? result.content : JSON.stringify(result.content);
  return {
    role: 'tool',
    content: result.isError ? `Error: ${content}` : content,
    tool_call_id: result.toolCallId,
  };
}

/**
 * Convert ImageContent to OpenAI image_url format
 */
function convertImageToOpenAI(image: ImageContent): OpenAIImageUrlPart {
  let url: string;

  // Handle different source types
  if (image.source.type === 'url') {
    url = image.source.url;
  } else if (image.source.type === 'base64') {
    // OpenAI expects data URI format: data:image/{type};base64,{data}
    url = `data:${image.source.mediaType};base64,${image.source.data}`;
  } else if (image.source.type === 'file') {
    // File paths need to be converted to base64 by the caller
    // For now, throw an error as we can't read files in browser context
    throw new Error('File-based images must be converted to base64 before processing');
  } else {
    throw new Error('Unknown image source type');
  }

  return {
    type: 'image_url',
    image_url: {
      url,
      detail: image.detail as 'auto' | 'low' | 'high' | undefined,
    },
  };
}

/**
 * Convert ContentItem[] to OpenAI content parts (for vision)
 * Returns string for text-only content, or array for multimodal content
 */
function convertContentToOpenAI(items: ContentItem[]): string | OpenAIContentPart[] {
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
  const parts: OpenAIContentPart[] = [];

  for (const item of items) {
    if (item.type === 'text' && item.text) {
      parts.push({ type: 'text', text: item.text });
    } else if (item.type === 'image' && item.image) {
      parts.push(convertImageToOpenAI(item.image));
    } else if (item.type === 'image' && (item.url || item.data)) {
      // Legacy format support
      if (item.url) {
        parts.push({
          type: 'image_url',
          image_url: { url: item.url },
        });
      } else if (item.data && item.mimeType) {
        parts.push({
          type: 'image_url',
          image_url: { url: `data:${item.mimeType};base64,${item.data}` },
        });
      }
    }
  }

  return parts.length > 0 ? parts : '';
}

/**
 * OpenAITextHandler
 *
 * Implements text generation using OpenAI Chat Completions API.
 * Supports custom API base URL for proxy configurations.
 *
 * @example
 * ```typescript
 * const handler = new OpenAITextHandler({
 *   apiKey: process.env.OPENAI_API_KEY!,
 *   apiBase: 'https://my-proxy.com/v1',  // Optional custom proxy
 *   model: 'gpt-4o',
 *   temperature: 0.7,
 * });
 *
 * const output = await handler.process({
 *   requestId: 'req-1',
 *   task: 'generate',
 *   content: [{ type: 'text', text: 'Hello, how are you?' }],
 * });
 * ```
 */
export class OpenAITextHandler extends BaseHandler {
  readonly type: HandlerType = 'text';
  readonly name: string;
  readonly capabilities: HandlerCapability[] = [
    { name: 'generate', description: 'Generate text responses' },
    { name: 'chat', description: 'Multi-turn conversation' },
    { name: 'analyze', description: 'Analyze and summarize text' },
    { name: 'tool_call', description: 'Function calling / tool use' },
    { name: 'vision', description: 'Analyze images (gpt-4o, gpt-4-turbo)' },
  ];

  private openaiConfig: OpenAIHandlerConfig;
  private apiBase: string;

  constructor(config: OpenAIHandlerConfig) {
    super(config);

    if (!config.apiKey) {
      throw new Error('OpenAITextHandler requires apiKey');
    }

    this.openaiConfig = {
      model: 'gpt-4o',
      timeout: 30000,
      temperature: 1.0,
      ...config,
    };

    this.name = this.openaiConfig.model!;
    this.apiBase = config.apiBase || DEFAULT_OPENAI_API_BASE;
  }

  /**
   * Process an agent input request
   */
  async process(input: AgentInput): Promise<AgentOutput> {
    const startTime = Date.now();

    try {
      const requestBody = this.buildRequestBody(input);
      const response = await this.callOpenAIAPI(requestBody);
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
        model: this.openaiConfig.model,
        messages: [{ role: 'user', content: 'Hi' }],
        max_completion_tokens: 5,
      };

      const response = await this.callOpenAIAPI(testBody);
      return !!response.choices && response.choices.length > 0;
    } catch {
      return false;
    }
  }

  /**
   * Build OpenAI API request body
   */
  private buildRequestBody(input: AgentInput): Record<string, unknown> {
    // Build messages array
    const messages: OpenAIMessage[] = [];

    // Add system instruction if provided
    if (input.params?.systemInstruction) {
      messages.push({
        role: 'system',
        content: input.params.systemInstruction as string,
      });
    }

    // Add conversation history if provided
    if (input.context?.history) {
      for (const msg of input.context.history) {
        // Check for tool_call content (assistant message with tool calls)
        const toolCallItems = msg.content.filter((c) => c.type === 'tool_call' && c.toolCall);
        if (toolCallItems.length > 0 && msg.role === 'assistant') {
          // Get text content if any
          const textContent = msg.content
            .filter((c) => c.type === 'text' && c.text)
            .map((c) => c.text!)
            .join('\n');

          messages.push({
            role: 'assistant',
            content: textContent || null,
            tool_calls: toolCallItems.map((item) => ({
              id: item.toolCall!.id,
              type: 'function' as const,
              function: {
                name: item.toolCall!.name,
                arguments: JSON.stringify(item.toolCall!.arguments),
              },
            })),
          });
          continue;
        }

        // Check for tool_result content (tool response)
        const toolResultItems = msg.content.filter(
          (c) => c.type === 'tool_result' && c.toolResult
        );
        if (toolResultItems.length > 0) {
          // Add each tool result as a separate message
          for (const item of toolResultItems) {
            messages.push(convertToolResultToMessage(item.toolResult!));
          }
          continue;
        }

        // Regular text content
        const content = msg.content
          .filter((c) => c.type === 'text' && c.text)
          .map((c) => c.text!)
          .join('\n');

        if (content) {
          messages.push({
            role: msg.role as 'user' | 'assistant',
            content,
          });
        }
      }
    }

    // Handle current content - could be text, image, or tool_result
    const toolResultItems = input.content.filter((c) => c.type === 'tool_result' && c.toolResult);
    if (toolResultItems.length > 0) {
      // This is a tool result response
      for (const item of toolResultItems) {
        messages.push(convertToolResultToMessage(item.toolResult!));
      }
    } else {
      // Convert content (text and images) for user message
      const content = convertContentToOpenAI(input.content);

      if (content && (typeof content === 'string' ? content.length > 0 : content.length > 0)) {
        messages.push({
          role: 'user',
          content,
        });
      }
    }

    // Ensure we have at least one message
    if (messages.length === 0) {
      throw new Error('No content provided');
    }

    // Build request body
    const body: Record<string, unknown> = {
      model: this.openaiConfig.model,
      messages,
    };

    // Add tools if provided
    if (input.tools && input.tools.length > 0) {
      body.tools = convertToOpenAITools(input.tools);
    }

    // Add tool_choice if provided
    if (input.toolChoice) {
      const toolChoice = convertToOpenAIToolChoice(input.toolChoice);
      if (toolChoice) {
        body.tool_choice = toolChoice;
      }
    }

    // Add temperature
    const temperature = input.params?.temperature ?? this.openaiConfig.temperature;
    if (temperature !== undefined) {
      body.temperature = temperature;
    }

    // Add max tokens
    const maxTokens = input.params?.maxTokens ?? this.openaiConfig.maxTokens;
    if (maxTokens !== undefined) {
      body.max_completion_tokens = maxTokens;
    }

    // Add stop sequences if provided
    if (input.params?.stop) {
      body.stop = input.params.stop;
    }

    return body;
  }

  /**
   * Call OpenAI API using fetch
   */
  private async callOpenAIAPI(body: Record<string, unknown>): Promise<OpenAIResponse> {
    const url = `${this.apiBase}/chat/completions`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.openaiConfig.timeout);

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.openaiConfig.apiKey}`,
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorData = (await response.json().catch(() => ({}))) as OpenAIErrorResponse;
        const errorMessage = errorData.error?.message || `HTTP ${response.status}`;
        const errorCode = this.mapHttpStatusToErrorCode(response.status);
        throw new OpenAIAPIError(errorCode, errorMessage, response.status);
      }

      return (await response.json()) as OpenAIResponse;
    } catch (error) {
      clearTimeout(timeoutId);

      if (error instanceof OpenAIAPIError) {
        throw error;
      }

      if (error instanceof Error && error.name === 'AbortError') {
        throw new OpenAIAPIError('TIMEOUT', `Request timed out after ${this.openaiConfig.timeout}ms`);
      }

      throw new OpenAIAPIError('NETWORK_ERROR', error instanceof Error ? error.message : 'Unknown error');
    }
  }

  /**
   * Parse OpenAI API response to AgentOutput
   */
  private parseResponse(requestId: string, response: OpenAIResponse, startTime: number): AgentOutput {
    const choices = response.choices || [];

    if (choices.length === 0) {
      return this.createErrorOutput(requestId, 'NO_RESPONSE', 'No choices returned from API');
    }

    const choice = choices[0];
    const content: ContentItem[] = [];

    // Add text content if present
    if (choice.message.content) {
      content.push({ type: 'text', text: choice.message.content });
    }

    // Add tool calls if present
    if (choice.message.tool_calls && choice.message.tool_calls.length > 0) {
      const toolCalls = parseOpenAIToolCalls(choice.message.tool_calls);
      for (const toolCall of toolCalls) {
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
      finishReason: choice.finish_reason,
      usage: response.usage
        ? {
            inputTokens: response.usage.prompt_tokens,
            outputTokens: response.usage.completion_tokens,
            totalTokens: response.usage.total_tokens,
          }
        : undefined,
    });
  }

  /**
   * Handle errors and convert to AgentOutput
   */
  private handleError(requestId: string, error: unknown, startTime: number): AgentOutput {
    const processingTimeMs = Date.now() - startTime;

    if (error instanceof OpenAIAPIError) {
      return {
        requestId,
        success: false,
        content: [],
        error: {
          code: error.code,
          message: error.message,
          details: { httpStatus: error.httpStatus },
        },
        metadata: { processingTimeMs, model: this.openaiConfig.model },
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
      metadata: { processingTimeMs, model: this.openaiConfig.model },
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
 * Custom error class for OpenAI API errors
 */
export class OpenAIAPIError extends Error {
  constructor(
    public code: string,
    message: string,
    public httpStatus?: number
  ) {
    super(message);
    this.name = 'OpenAIAPIError';
  }
}

/**
 * OpenAI SSE stream chunk types
 */
interface OpenAIStreamToolCallDelta {
  index: number;
  id?: string;
  type?: 'function';
  function?: {
    name?: string;
    arguments?: string;
  };
}

interface OpenAIStreamDelta {
  content?: string;
  role?: string;
  tool_calls?: OpenAIStreamToolCallDelta[];
}

interface OpenAIStreamChoice {
  index: number;
  delta: OpenAIStreamDelta;
  finish_reason: string | null;
}

interface OpenAIStreamChunk {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: OpenAIStreamChoice[];
  usage?: OpenAIUsage;
}

/**
 * OpenAIStreamingHandler
 *
 * Implements streaming text generation using OpenAI Chat Completions API.
 * Supports custom API base URL for proxy configurations.
 *
 * @example
 * ```typescript
 * const handler = new OpenAIStreamingHandler({
 *   apiKey: process.env.OPENAI_API_KEY!,
 *   model: 'gpt-4o',
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
export class OpenAIStreamingHandler extends StreamingHandler {
  readonly type: HandlerType = 'text';
  readonly name: string;
  readonly capabilities: HandlerCapability[] = [
    { name: 'generate', description: 'Generate text responses (streaming)' },
    { name: 'chat', description: 'Multi-turn conversation (streaming)' },
    { name: 'analyze', description: 'Analyze and summarize text (streaming)' },
    { name: 'tool_call', description: 'Function calling / tool use (streaming)' },
    { name: 'vision', description: 'Analyze images (streaming, gpt-4o, gpt-4-turbo)' },
  ];

  private openaiConfig: OpenAIHandlerConfig;
  private apiBase: string;

  constructor(config: OpenAIHandlerConfig) {
    super(config);

    if (!config.apiKey) {
      throw new Error('OpenAIStreamingHandler requires apiKey');
    }

    this.openaiConfig = {
      model: 'gpt-4o',
      timeout: 60000, // Longer timeout for streaming
      temperature: 1.0,
      ...config,
    };

    this.name = `${this.openaiConfig.model!}-streaming`;
    this.apiBase = config.apiBase || DEFAULT_OPENAI_API_BASE;
  }

  /**
   * Process input and yield streaming chunks
   */
  async *processStream(input: AgentInput): AsyncIterable<ContentChunk> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.openaiConfig.timeout);

    try {
      const requestBody = this.buildStreamRequestBody(input);
      const response = await this.initiateStreamRequest(requestBody, controller.signal);

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorData = (await response.json().catch(() => ({}))) as OpenAIErrorResponse;
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
      let totalInputTokens = 0;
      let totalOutputTokens = 0;

      // Accumulator for streaming tool calls (indexed by tool call index)
      const toolCallAccumulator: Map<
        number,
        { id: string; name: string; arguments: string }
      > = new Map();

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed || !trimmed.startsWith('data: ')) continue;

            const data = trimmed.slice(6);
            if (data === '[DONE]') {
              // Emit accumulated tool calls before done
              for (const [, tc] of toolCallAccumulator) {
                try {
                  const toolCall: ToolCall = {
                    id: tc.id,
                    name: tc.name,
                    arguments: JSON.parse(tc.arguments || '{}'),
                  };
                  yield { type: 'tool_call', toolCall };
                } catch {
                  // Skip invalid tool call
                }
              }

              // Stream complete
              if (totalOutputTokens > 0 || totalInputTokens > 0) {
                yield this.createUsageChunk(totalInputTokens, totalOutputTokens, totalInputTokens + totalOutputTokens);
              }
              yield this.createDoneChunk();
              return;
            }

            try {
              const chunk = JSON.parse(data) as OpenAIStreamChunk;

              // Extract delta content
              if (chunk.choices?.[0]?.delta?.content) {
                yield this.createDeltaChunk(chunk.choices[0].delta.content);
              }

              // Handle tool call deltas - accumulate them
              const toolCallDeltas = chunk.choices?.[0]?.delta?.tool_calls;
              if (toolCallDeltas && toolCallDeltas.length > 0) {
                for (const tcd of toolCallDeltas) {
                  const idx = tcd.index;
                  if (!toolCallAccumulator.has(idx)) {
                    toolCallAccumulator.set(idx, { id: '', name: '', arguments: '' });
                  }
                  const acc = toolCallAccumulator.get(idx)!;
                  if (tcd.id) acc.id = tcd.id;
                  if (tcd.function?.name) acc.name += tcd.function.name;
                  if (tcd.function?.arguments) acc.arguments += tcd.function.arguments;
                }
              }

              // Collect usage if present (with stream_options.include_usage)
              if (chunk.usage) {
                totalInputTokens = chunk.usage.prompt_tokens;
                totalOutputTokens = chunk.usage.completion_tokens;
              }
            } catch {
              // Skip invalid JSON
            }
          }
        }
      } finally {
        reader.releaseLock();
      }

      // If we get here without [DONE], still emit done
      yield this.createDoneChunk();
    } catch (error) {
      clearTimeout(timeoutId);

      if (error instanceof Error && error.name === 'AbortError') {
        yield this.createErrorChunk('TIMEOUT', `Request timed out after ${this.openaiConfig.timeout}ms`);
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
      // Use non-streaming request for health check
      const testBody = {
        model: this.openaiConfig.model,
        messages: [{ role: 'user', content: 'Hi' }],
        max_completion_tokens: 5,
      };

      const response = await fetch(`${this.apiBase}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.openaiConfig.apiKey}`,
        },
        body: JSON.stringify(testBody),
      });

      if (!response.ok) return false;
      const data = (await response.json()) as OpenAIResponse;
      return !!data.choices && data.choices.length > 0;
    } catch {
      return false;
    }
  }

  /**
   * Build streaming request body
   */
  private buildStreamRequestBody(input: AgentInput): Record<string, unknown> {
    const messages: OpenAIMessage[] = [];

    // Add system instruction if provided
    if (input.params?.systemInstruction) {
      messages.push({
        role: 'system',
        content: input.params.systemInstruction as string,
      });
    }

    // Add conversation history if provided
    if (input.context?.history) {
      for (const msg of input.context.history) {
        // Check for tool_call content (assistant message with tool calls)
        const toolCallItems = msg.content.filter((c) => c.type === 'tool_call' && c.toolCall);
        if (toolCallItems.length > 0 && msg.role === 'assistant') {
          const textContent = msg.content
            .filter((c) => c.type === 'text' && c.text)
            .map((c) => c.text!)
            .join('\n');

          messages.push({
            role: 'assistant',
            content: textContent || null,
            tool_calls: toolCallItems.map((item) => ({
              id: item.toolCall!.id,
              type: 'function' as const,
              function: {
                name: item.toolCall!.name,
                arguments: JSON.stringify(item.toolCall!.arguments),
              },
            })),
          });
          continue;
        }

        // Check for tool_result content
        const toolResultItems = msg.content.filter(
          (c) => c.type === 'tool_result' && c.toolResult
        );
        if (toolResultItems.length > 0) {
          for (const item of toolResultItems) {
            messages.push(convertToolResultToMessage(item.toolResult!));
          }
          continue;
        }

        // Regular text content
        const content = msg.content
          .filter((c) => c.type === 'text' && c.text)
          .map((c) => c.text!)
          .join('\n');

        if (content) {
          messages.push({
            role: msg.role as 'user' | 'assistant',
            content,
          });
        }
      }
    }

    // Handle current content - could be text, image, or tool_result
    const toolResultItems = input.content.filter((c) => c.type === 'tool_result' && c.toolResult);
    if (toolResultItems.length > 0) {
      for (const item of toolResultItems) {
        messages.push(convertToolResultToMessage(item.toolResult!));
      }
    } else {
      // Convert content (text and images) for user message
      const content = convertContentToOpenAI(input.content);

      if (content && (typeof content === 'string' ? content.length > 0 : content.length > 0)) {
        messages.push({
          role: 'user',
          content,
        });
      }
    }

    // Ensure we have at least one message
    if (messages.length === 0) {
      throw new Error('No content provided');
    }

    const body: Record<string, unknown> = {
      model: this.openaiConfig.model,
      messages,
      stream: true,
      stream_options: { include_usage: true },
    };

    // Add tools if provided
    if (input.tools && input.tools.length > 0) {
      body.tools = convertToOpenAITools(input.tools);
    }

    // Add tool_choice if provided
    if (input.toolChoice) {
      const toolChoice = convertToOpenAIToolChoice(input.toolChoice);
      if (toolChoice) {
        body.tool_choice = toolChoice;
      }
    }

    const temperature = input.params?.temperature ?? this.openaiConfig.temperature;
    if (temperature !== undefined) {
      body.temperature = temperature;
    }

    const maxTokens = input.params?.maxTokens ?? this.openaiConfig.maxTokens;
    if (maxTokens !== undefined) {
      body.max_completion_tokens = maxTokens;
    }

    if (input.params?.stop) {
      body.stop = input.params.stop;
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
    return fetch(`${this.apiBase}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.openaiConfig.apiKey}`,
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
