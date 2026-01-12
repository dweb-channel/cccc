/**
 * Mock Handler for Testing
 *
 * Provides a configurable mock handler for unit testing
 */

import {
  BaseHandler,
  StreamingHandler,
  type HandlerType,
  type HandlerCapability,
  type AgentInput,
  type AgentOutput,
  type HandlerConfig,
  type ContentChunk,
  type StreamingHandlerConfig,
} from '../../agent/index.js';

export interface MockHandlerConfig extends HandlerConfig {
  /** Response delay in ms */
  delay?: number;
  /** Whether to throw error on process */
  shouldFail?: boolean;
  /** Custom error message */
  errorMessage?: string;
  /** Custom response content */
  responseText?: string;
}

/**
 * Mock text handler for testing
 */
export class MockTextHandler extends BaseHandler {
  readonly type: HandlerType = 'text';
  readonly name: string;
  readonly capabilities: HandlerCapability[];

  private mockConfig: MockHandlerConfig;
  private initializeCalled = false;
  private disposeCalled = false;
  private processCount = 0;

  constructor(name: string, capabilities: string[], config: MockHandlerConfig = {}) {
    super(config);
    this.name = name;
    this.capabilities = capabilities.map((c) => ({ name: c }));
    this.mockConfig = config;
  }

  async initialize(): Promise<void> {
    this.initializeCalled = true;
  }

  async dispose(): Promise<void> {
    this.disposeCalled = true;
  }

  async healthCheck(): Promise<boolean> {
    return !this.mockConfig.shouldFail;
  }

  async process(input: AgentInput): Promise<AgentOutput> {
    this.processCount++;

    // Simulate delay
    if (this.mockConfig.delay) {
      await new Promise((resolve) => setTimeout(resolve, this.mockConfig.delay));
    }

    // Simulate failure
    if (this.mockConfig.shouldFail) {
      return this.createErrorOutput(
        input.requestId,
        'MOCK_ERROR',
        this.mockConfig.errorMessage ?? 'Mock handler error'
      );
    }

    // Return mock response
    const responseText =
      this.mockConfig.responseText ?? `Mock response for task: ${input.task}`;

    return this.createOutput(input.requestId, [{ type: 'text', text: responseText }], {
      model: 'mock-model',
      processingTimeMs: this.mockConfig.delay ?? 0,
    });
  }

  // Test helpers
  wasInitialized(): boolean {
    return this.initializeCalled;
  }

  wasDisposed(): boolean {
    return this.disposeCalled;
  }

  getProcessCount(): number {
    return this.processCount;
  }

  reset(): void {
    this.initializeCalled = false;
    this.disposeCalled = false;
    this.processCount = 0;
  }
}

/**
 * Mock image handler for testing
 */
export class MockImageHandler extends BaseHandler {
  readonly type: HandlerType = 'image';
  readonly name: string;
  readonly capabilities: HandlerCapability[];

  constructor(name: string, capabilities: string[] = ['generate', 'analyze']) {
    super({});
    this.name = name;
    this.capabilities = capabilities.map((c) => ({ name: c }));
  }

  async process(input: AgentInput): Promise<AgentOutput> {
    return this.createOutput(input.requestId, [
      { type: 'image', url: 'https://example.com/mock-image.png', mimeType: 'image/png' },
    ]);
  }
}

export interface MockStreamingConfig extends StreamingHandlerConfig {
  /** Chunks to yield */
  chunks?: string[];
  /** Delay between chunks in ms */
  chunkDelay?: number;
  /** Whether to throw error during streaming */
  shouldFail?: boolean;
  /** Error message if failing */
  errorMessage?: string;
  /** Include usage chunk */
  includeUsage?: boolean;
}

/**
 * Mock streaming handler for testing
 */
export class MockStreamingHandler extends StreamingHandler {
  readonly type: HandlerType = 'text';
  readonly name: string;
  readonly capabilities: HandlerCapability[];

  private mockConfig: MockStreamingConfig;
  private streamCount = 0;

  constructor(name: string, capabilities: string[], config: MockStreamingConfig = {}) {
    super(config);
    this.name = name;
    this.capabilities = capabilities.map((c) => ({ name: c }));
    this.mockConfig = {
      chunks: ['Hello', ' ', 'World', '!'],
      chunkDelay: 10,
      includeUsage: true,
      ...config,
    };
  }

  async *processStream(input: AgentInput): AsyncIterable<ContentChunk> {
    this.streamCount++;

    // Simulate failure
    if (this.mockConfig.shouldFail) {
      yield this.createErrorChunk(
        'MOCK_STREAM_ERROR',
        this.mockConfig.errorMessage ?? 'Mock streaming error'
      );
      return;
    }

    // Yield text chunks
    for (const chunk of this.mockConfig.chunks ?? []) {
      if (this.mockConfig.chunkDelay) {
        await new Promise((resolve) => setTimeout(resolve, this.mockConfig.chunkDelay));
      }
      yield this.createDeltaChunk(chunk);
    }

    // Yield usage if configured
    if (this.mockConfig.includeUsage) {
      yield this.createUsageChunk(10, 20, 30);
    }

    // Yield done
    yield this.createDoneChunk({ task: input.task });
  }

  // Test helpers
  getStreamCount(): number {
    return this.streamCount;
  }

  reset(): void {
    this.streamCount = 0;
  }
}
