/**
 * Ollama Text Handler
 *
 * Handler for local Ollama LLM models.
 * Supports streaming via NDJSON format.
 */

import {
  type HandlerType,
  type HandlerCapability,
  type AgentInput,
  type AgentOutput,
  type ContentItem,
  type ContentChunk,
} from '../types/handler.js';
import { StreamingHandler, type StreamingHandlerConfig } from '../streaming.js';

/**
 * Ollama-specific configuration
 */
export interface OllamaHandlerConfig extends StreamingHandlerConfig {
  /** Model to use (default: llama3.2) */
  model?: string;
  /** Ollama API base URL (default: http://localhost:11434) */
  apiBase?: string;
  /** Request timeout in ms (default: 60000 - local models may be slow) */
  timeout?: number;
  /** Keep model in memory duration (e.g., '5m', '1h') */
  keepAlive?: string;
  /** Default temperature (0-2, default: 0.7) */
  temperature?: number;
  /** Context window size */
  numCtx?: number;
}

/**
 * Ollama API message format
 */
interface OllamaMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

/**
 * Ollama streaming response chunk (NDJSON)
 */
interface OllamaStreamChunk {
  model: string;
  created_at: string;
  message?: {
    role: string;
    content: string;
  };
  done: boolean;
  // Final chunk includes stats
  total_duration?: number;
  load_duration?: number;
  prompt_eval_count?: number;
  prompt_eval_duration?: number;
  eval_count?: number;
  eval_duration?: number;
}

/**
 * Ollama non-streaming response
 */
interface OllamaResponse {
  model: string;
  created_at: string;
  message: {
    role: string;
    content: string;
  };
  done: boolean;
  total_duration?: number;
  prompt_eval_count?: number;
  eval_count?: number;
}

/**
 * Ollama error response
 */
interface OllamaErrorResponse {
  error?: string;
}

/**
 * Default Ollama API base URL
 */
const DEFAULT_OLLAMA_API_BASE = 'http://localhost:11434';

/**
 * OllamaTextHandler
 *
 * Implements text generation using Ollama Chat API with streaming support.
 * Designed for local model inference.
 *
 * @example
 * ```typescript
 * const handler = new OllamaTextHandler({
 *   model: 'llama3.2',
 *   apiBase: 'http://localhost:11434',  // Optional
 * });
 *
 * // Streaming mode
 * for await (const chunk of handler.processStream(input)) {
 *   if (chunk.type === 'delta') {
 *     process.stdout.write(chunk.text!);
 *   }
 * }
 *
 * // Non-streaming mode (collects all chunks)
 * const output = await handler.process(input);
 * ```
 */
export class OllamaTextHandler extends StreamingHandler {
  readonly type: HandlerType = 'text';
  readonly name: string;
  readonly capabilities: HandlerCapability[] = [
    { name: 'generate', description: 'Generate text responses (streaming)' },
    { name: 'chat', description: 'Multi-turn conversation (streaming)' },
    { name: 'analyze', description: 'Analyze and summarize text (streaming)' },
  ];

  private ollamaConfig: OllamaHandlerConfig;
  private apiBase: string;

  constructor(config: OllamaHandlerConfig = {}) {
    super(config);

    this.ollamaConfig = {
      model: 'llama3.2',
      timeout: 60000, // Local models can be slow
      temperature: 0.7,
      ...config,
    };

    this.name = `ollama-${this.ollamaConfig.model!}`;
    this.apiBase = config.apiBase || DEFAULT_OLLAMA_API_BASE;
  }

  /**
   * Process input and yield streaming chunks (NDJSON)
   */
  async *processStream(input: AgentInput): AsyncIterable<ContentChunk> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.ollamaConfig.timeout);

    try {
      const requestBody = this.buildRequestBody(input, true);
      const response = await this.initiateRequest(requestBody, controller.signal);

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorData = (await response.json().catch(() => ({}))) as OllamaErrorResponse;
        const errorMessage = errorData.error || `HTTP ${response.status}`;
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
      let promptTokens = 0;
      let outputTokens = 0;

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed) continue;

            try {
              const chunk = JSON.parse(trimmed) as OllamaStreamChunk;

              // Yield content delta
              if (chunk.message?.content) {
                yield this.createDeltaChunk(chunk.message.content);
              }

              // Check if this is the final chunk
              if (chunk.done) {
                // Extract token counts from final chunk
                if (chunk.prompt_eval_count) {
                  promptTokens = chunk.prompt_eval_count;
                }
                if (chunk.eval_count) {
                  outputTokens = chunk.eval_count;
                }

                // Emit usage info
                if (promptTokens > 0 || outputTokens > 0) {
                  yield this.createUsageChunk(promptTokens, outputTokens, promptTokens + outputTokens);
                }

                yield this.createDoneChunk({
                  model: chunk.model,
                  totalDuration: chunk.total_duration,
                });
                return;
              }
            } catch {
              // Skip invalid JSON lines
            }
          }
        }
      } finally {
        reader.releaseLock();
      }

      // If stream ends without done=true, still emit done
      yield this.createDoneChunk();
    } catch (error) {
      clearTimeout(timeoutId);

      if (error instanceof Error && error.name === 'AbortError') {
        yield this.createErrorChunk('TIMEOUT', `Request timed out after ${this.ollamaConfig.timeout}ms`);
      } else if (error instanceof Error && error.message.includes('ECONNREFUSED')) {
        yield this.createErrorChunk('CONNECTION_REFUSED', 'Cannot connect to Ollama server. Is it running?');
      } else {
        yield this.createErrorChunk('NETWORK_ERROR', error instanceof Error ? error.message : 'Unknown error');
      }
      yield this.createDoneChunk();
    }
  }

  /**
   * Health check - verify Ollama server connectivity and model availability
   */
  async healthCheck(): Promise<boolean> {
    try {
      // Check if server is running via /api/tags
      const tagsResponse = await fetch(`${this.apiBase}/api/tags`, {
        signal: AbortSignal.timeout(5000),
      });

      if (!tagsResponse.ok) return false;

      const tags = (await tagsResponse.json()) as { models?: Array<{ name: string }> };

      // Check if configured model is available
      const modelName = this.ollamaConfig.model!;
      const modelAvailable = tags.models?.some(
        (m) => m.name === modelName || m.name.startsWith(`${modelName}:`)
      );

      return modelAvailable ?? false;
    } catch {
      return false;
    }
  }

  /**
   * List available models on the Ollama server
   */
  async listModels(): Promise<string[]> {
    try {
      const response = await fetch(`${this.apiBase}/api/tags`, {
        signal: AbortSignal.timeout(5000),
      });

      if (!response.ok) return [];

      const data = (await response.json()) as { models?: Array<{ name: string }> };
      return data.models?.map((m) => m.name) ?? [];
    } catch {
      return [];
    }
  }

  /**
   * Build request body for Ollama API
   */
  private buildRequestBody(input: AgentInput, stream: boolean): Record<string, unknown> {
    // Extract text content
    const textContent = input.content
      .filter((item) => item.type === 'text' && item.text)
      .map((item) => item.text!)
      .join('\n');

    if (!textContent) {
      throw new Error('No text content provided');
    }

    // Build messages array
    const messages: OllamaMessage[] = [];

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

    // Add current user message
    messages.push({
      role: 'user',
      content: textContent,
    });

    // Build request body
    const body: Record<string, unknown> = {
      model: this.ollamaConfig.model,
      messages,
      stream,
    };

    // Add options
    const options: Record<string, unknown> = {};

    const temperature = input.params?.temperature ?? this.ollamaConfig.temperature;
    if (temperature !== undefined) {
      options.temperature = temperature;
    }

    if (this.ollamaConfig.numCtx) {
      options.num_ctx = this.ollamaConfig.numCtx;
    }

    if (Object.keys(options).length > 0) {
      body.options = options;
    }

    // Add keep_alive if configured
    if (this.ollamaConfig.keepAlive) {
      body.keep_alive = this.ollamaConfig.keepAlive;
    }

    return body;
  }

  /**
   * Initiate HTTP request to Ollama
   */
  private async initiateRequest(
    body: Record<string, unknown>,
    signal: AbortSignal
  ): Promise<Response> {
    return fetch(`${this.apiBase}/api/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
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
      case 404:
        return 'MODEL_NOT_FOUND';
      case 500:
      case 502:
      case 503:
        return 'SERVER_ERROR';
      default:
        return 'API_ERROR';
    }
  }
}

/**
 * Custom error class for Ollama API errors
 */
export class OllamaAPIError extends Error {
  constructor(
    public code: string,
    message: string,
    public httpStatus?: number
  ) {
    super(message);
    this.name = 'OllamaAPIError';
  }
}
