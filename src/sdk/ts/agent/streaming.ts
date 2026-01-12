/**
 * Streaming Handler Base Class
 *
 * Provides base implementation for handlers that support streaming responses.
 */

import {
  BaseHandler,
  type HandlerType,
  type HandlerCapability,
  type HandlerConfig,
  type AgentInput,
  type AgentOutput,
  type ContentChunk,
  type StreamingCapable,
  type ContentItem,
} from './types/handler.js';

/**
 * Configuration for streaming handlers
 */
export interface StreamingHandlerConfig extends HandlerConfig {
  /** Default to streaming mode */
  defaultStreaming?: boolean;
  /** Buffer size for collecting chunks (for non-streaming fallback) */
  bufferSize?: number;
}

/**
 * Base class for handlers that support both streaming and non-streaming modes
 *
 * @example
 * ```typescript
 * class MyStreamingHandler extends StreamingHandler {
 *   readonly type: HandlerType = 'text';
 *   readonly name = 'my-handler';
 *   readonly capabilities = [{ name: 'generate' }];
 *
 *   async *processStream(input: AgentInput): AsyncIterable<ContentChunk> {
 *     // Yield chunks as they arrive
 *     yield { type: 'delta', text: 'Hello' };
 *     yield { type: 'delta', text: ' World' };
 *     yield { type: 'usage', usage: { totalTokens: 10 } };
 *     yield { type: 'done', done: true };
 *   }
 * }
 * ```
 */
export abstract class StreamingHandler extends BaseHandler implements StreamingCapable {
  readonly supportsStreaming = true;

  protected streamingConfig: StreamingHandlerConfig;

  constructor(config: StreamingHandlerConfig = {}) {
    super(config);
    this.streamingConfig = {
      defaultStreaming: true,
      bufferSize: 1000,
      ...config,
    };
  }

  /**
   * Abstract method - subclasses must implement streaming logic
   */
  abstract processStream(input: AgentInput): AsyncIterable<ContentChunk>;

  /**
   * Non-streaming process implementation
   * Collects all chunks and returns final output
   */
  async process(input: AgentInput): Promise<AgentOutput> {
    const startTime = Date.now();
    const textParts: string[] = [];
    let usage: AgentOutput['metadata'] = {};
    let error: AgentOutput['error'] | undefined;

    try {
      for await (const chunk of this.processStream(input)) {
        switch (chunk.type) {
          case 'text':
          case 'delta':
            if (chunk.text) {
              textParts.push(chunk.text);
            }
            break;
          case 'usage':
            if (chunk.usage) {
              usage = { ...usage, usage: chunk.usage };
            }
            break;
          case 'error':
            if (chunk.error) {
              error = {
                code: chunk.error.code,
                message: chunk.error.message,
              };
            }
            break;
          case 'done':
            // Final chunk, break out
            break;
        }
      }
    } catch (err) {
      return this.createErrorOutput(
        input.requestId,
        'STREAM_ERROR',
        err instanceof Error ? err.message : String(err)
      );
    }

    if (error) {
      return {
        requestId: input.requestId,
        success: false,
        content: [],
        error,
      };
    }

    const processingTimeMs = Date.now() - startTime;

    return this.createOutput(
      input.requestId,
      [{ type: 'text', text: textParts.join('') }],
      {
        ...usage,
        processingTimeMs,
        model: this.config.model,
      }
    );
  }

  /**
   * Helper to create a text chunk
   */
  protected createTextChunk(text: string): ContentChunk {
    return { type: 'text', text };
  }

  /**
   * Helper to create a delta chunk (incremental text)
   */
  protected createDeltaChunk(text: string): ContentChunk {
    return { type: 'delta', text };
  }

  /**
   * Helper to create a usage chunk
   */
  protected createUsageChunk(
    inputTokens?: number,
    outputTokens?: number,
    totalTokens?: number
  ): ContentChunk {
    return {
      type: 'usage',
      usage: { inputTokens, outputTokens, totalTokens },
    };
  }

  /**
   * Helper to create a done chunk
   */
  protected createDoneChunk(metadata?: Record<string, unknown>): ContentChunk {
    return { type: 'done', done: true, metadata };
  }

  /**
   * Helper to create an error chunk
   */
  protected createErrorChunk(code: string, message: string): ContentChunk {
    return { type: 'error', error: { code, message } };
  }
}

/**
 * Utility to check if a handler supports streaming
 */
export function isStreamingHandler(handler: unknown): handler is StreamingCapable {
  return (
    typeof handler === 'object' &&
    handler !== null &&
    'supportsStreaming' in handler &&
    (handler as StreamingCapable).supportsStreaming === true &&
    'processStream' in handler &&
    typeof (handler as StreamingCapable).processStream === 'function'
  );
}

/**
 * Utility to collect all chunks from a stream into a single output
 */
export async function collectStream(
  stream: AsyncIterable<ContentChunk>,
  requestId: string
): Promise<AgentOutput> {
  const textParts: string[] = [];
  let usage: { inputTokens?: number; outputTokens?: number; totalTokens?: number } | undefined;
  let error: { code: string; message: string } | undefined;

  for await (const chunk of stream) {
    switch (chunk.type) {
      case 'text':
      case 'delta':
        if (chunk.text) {
          textParts.push(chunk.text);
        }
        break;
      case 'usage':
        usage = chunk.usage;
        break;
      case 'error':
        error = chunk.error;
        break;
    }
  }

  if (error) {
    return {
      requestId,
      success: false,
      content: [],
      error,
    };
  }

  return {
    requestId,
    success: true,
    content: [{ type: 'text', text: textParts.join('') }],
    metadata: usage ? { usage } : undefined,
  };
}

/**
 * Utility to transform a stream with a callback
 */
export async function* transformStream(
  stream: AsyncIterable<ContentChunk>,
  transform: (chunk: ContentChunk) => ContentChunk | null
): AsyncIterable<ContentChunk> {
  for await (const chunk of stream) {
    const transformed = transform(chunk);
    if (transformed !== null) {
      yield transformed;
    }
  }
}

/**
 * Utility to add a prefix to all text chunks
 */
export async function* prefixStream(
  stream: AsyncIterable<ContentChunk>,
  prefix: string
): AsyncIterable<ContentChunk> {
  let prefixSent = false;

  for await (const chunk of stream) {
    if (!prefixSent && (chunk.type === 'text' || chunk.type === 'delta')) {
      prefixSent = true;
      yield { ...chunk, text: prefix + (chunk.text ?? '') };
    } else {
      yield chunk;
    }
  }
}
