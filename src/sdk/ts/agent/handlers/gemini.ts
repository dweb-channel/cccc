/**
 * Gemini Text Handler
 *
 * Handler for Google Gemini text generation models.
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
} from '../types/handler.js';

/**
 * Gemini-specific configuration
 */
export interface GeminiHandlerConfig extends HandlerConfig {
  /** API key for Gemini */
  apiKey: string;
  /** Model to use (default: gemini-2.0-flash) */
  model?: string;
  /** Custom API base URL (for proxy) */
  apiBase?: string;
  /** Request timeout in ms (default: 30000) */
  timeout?: number;
  /** Default temperature (0-2, default: 1.0) */
  temperature?: number;
  /** Default max output tokens */
  maxOutputTokens?: number;
}

/**
 * Gemini API response types (subset for our needs)
 */
interface GeminiContent {
  role: string;
  parts: Array<{ text?: string }>;
}

interface GeminiCandidate {
  content: GeminiContent;
  finishReason?: string;
}

interface GeminiUsageMetadata {
  promptTokenCount?: number;
  candidatesTokenCount?: number;
  totalTokenCount?: number;
}

interface GeminiResponse {
  candidates?: GeminiCandidate[];
  usageMetadata?: GeminiUsageMetadata;
}

interface GeminiErrorResponse {
  error?: {
    code: number;
    message: string;
    status: string;
  };
}

/**
 * Default Gemini API base URL
 */
const DEFAULT_GEMINI_API_BASE = 'https://generativelanguage.googleapis.com/v1beta';

/**
 * GeminiTextHandler
 *
 * Implements text generation using Google Gemini API.
 * Supports custom API base URL for proxy configurations.
 *
 * @example
 * ```typescript
 * const handler = new GeminiTextHandler({
 *   apiKey: process.env.GEMINI_API_KEY!,
 *   apiBase: 'https://my-proxy.com/v1',  // Optional custom proxy
 *   model: 'gemini-2.0-flash',
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
export class GeminiTextHandler extends BaseHandler {
  readonly type: HandlerType = 'text';
  readonly name: string;
  readonly capabilities: HandlerCapability[] = [
    { name: 'generate', description: 'Generate text responses' },
    { name: 'chat', description: 'Multi-turn conversation' },
    { name: 'analyze', description: 'Analyze and summarize text' },
  ];

  private geminiConfig: GeminiHandlerConfig;
  private apiBase: string;

  constructor(config: GeminiHandlerConfig) {
    super(config);

    if (!config.apiKey) {
      throw new Error('GeminiTextHandler requires apiKey');
    }

    this.geminiConfig = {
      model: 'gemini-2.0-flash',
      timeout: 30000,
      temperature: 1.0,
      ...config,
    };

    this.name = this.geminiConfig.model!;
    this.apiBase = config.apiBase || DEFAULT_GEMINI_API_BASE;
  }

  /**
   * Process an agent input request
   */
  async process(input: AgentInput): Promise<AgentOutput> {
    const startTime = Date.now();

    try {
      // Build request body
      const requestBody = this.buildRequestBody(input);

      // Make API call
      const response = await this.callGeminiAPI(requestBody);

      // Parse response
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
      // Simple test request
      const testBody = {
        contents: [{ role: 'user', parts: [{ text: 'Hi' }] }],
        generationConfig: { maxOutputTokens: 5 },
      };

      const response = await this.callGeminiAPI(testBody);
      return !!response.candidates && response.candidates.length > 0;
    } catch {
      return false;
    }
  }

  /**
   * Build Gemini API request body
   */
  private buildRequestBody(input: AgentInput): Record<string, unknown> {
    // Extract text content
    const textParts = input.content
      .filter((item) => item.type === 'text' && item.text)
      .map((item) => ({ text: item.text! }));

    if (textParts.length === 0) {
      throw new Error('No text content provided');
    }

    // Build contents array
    const contents: GeminiContent[] = [];

    // Add conversation history if provided
    if (input.context?.history) {
      for (const msg of input.context.history) {
        const parts = msg.content
          .filter((c) => c.type === 'text' && c.text)
          .map((c) => ({ text: c.text! }));

        if (parts.length > 0) {
          contents.push({
            role: msg.role === 'assistant' ? 'model' : msg.role,
            parts,
          });
        }
      }
    }

    // Add current user message
    contents.push({
      role: 'user',
      parts: textParts,
    });

    // Build generation config
    const generationConfig: Record<string, unknown> = {};

    if (this.geminiConfig.temperature !== undefined) {
      generationConfig.temperature = this.geminiConfig.temperature;
    }

    if (this.geminiConfig.maxOutputTokens !== undefined) {
      generationConfig.maxOutputTokens = this.geminiConfig.maxOutputTokens;
    }

    // Override with request params
    if (input.params?.temperature !== undefined) {
      generationConfig.temperature = input.params.temperature;
    }

    if (input.params?.maxOutputTokens !== undefined) {
      generationConfig.maxOutputTokens = input.params.maxOutputTokens;
    }

    const body: Record<string, unknown> = { contents };

    if (Object.keys(generationConfig).length > 0) {
      body.generationConfig = generationConfig;
    }

    // Add system instruction if provided
    if (input.params?.systemInstruction) {
      body.systemInstruction = {
        parts: [{ text: input.params.systemInstruction as string }],
      };
    }

    return body;
  }

  /**
   * Call Gemini API using fetch
   */
  private async callGeminiAPI(body: Record<string, unknown>): Promise<GeminiResponse> {
    const model = this.geminiConfig.model;
    const url = `${this.apiBase}/models/${model}:generateContent?key=${this.geminiConfig.apiKey}`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.geminiConfig.timeout);

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorData = (await response.json().catch(() => ({}))) as GeminiErrorResponse;
        const errorMessage = errorData.error?.message || `HTTP ${response.status}`;
        const errorCode = this.mapHttpStatusToErrorCode(response.status);
        throw new GeminiAPIError(errorCode, errorMessage, response.status);
      }

      return (await response.json()) as GeminiResponse;
    } catch (error) {
      clearTimeout(timeoutId);

      if (error instanceof GeminiAPIError) {
        throw error;
      }

      if (error instanceof Error && error.name === 'AbortError') {
        throw new GeminiAPIError('TIMEOUT', `Request timed out after ${this.geminiConfig.timeout}ms`);
      }

      throw new GeminiAPIError('NETWORK_ERROR', error instanceof Error ? error.message : 'Unknown error');
    }
  }

  /**
   * Parse Gemini API response to AgentOutput
   */
  private parseResponse(requestId: string, response: GeminiResponse, startTime: number): AgentOutput {
    const candidates = response.candidates || [];

    if (candidates.length === 0) {
      return this.createErrorOutput(requestId, 'NO_RESPONSE', 'No candidates returned from API');
    }

    const candidate = candidates[0];
    const textParts = candidate.content.parts
      .filter((p) => p.text)
      .map((p) => p.text!)
      .join('');

    const content: ContentItem[] = [{ type: 'text', text: textParts }];

    return this.createOutput(requestId, content, {
      processingTimeMs: Date.now() - startTime,
      model: this.geminiConfig.model,
      finishReason: candidate.finishReason,
      usage: response.usageMetadata
        ? {
            inputTokens: response.usageMetadata.promptTokenCount,
            outputTokens: response.usageMetadata.candidatesTokenCount,
            totalTokens: response.usageMetadata.totalTokenCount,
          }
        : undefined,
    });
  }

  /**
   * Handle errors and convert to AgentOutput
   */
  private handleError(requestId: string, error: unknown, startTime: number): AgentOutput {
    const processingTimeMs = Date.now() - startTime;

    if (error instanceof GeminiAPIError) {
      return {
        requestId,
        success: false,
        content: [],
        error: {
          code: error.code,
          message: error.message,
          details: { httpStatus: error.httpStatus },
        },
        metadata: { processingTimeMs, model: this.geminiConfig.model },
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
      metadata: { processingTimeMs, model: this.geminiConfig.model },
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
      case 403:
        return 'AUTHENTICATION_ERROR';
      case 404:
        return 'MODEL_NOT_FOUND';
      case 429:
        return 'RATE_LIMIT_EXCEEDED';
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
 * Custom error class for Gemini API errors
 */
export class GeminiAPIError extends Error {
  constructor(
    public code: string,
    message: string,
    public httpStatus?: number
  ) {
    super(message);
    this.name = 'GeminiAPIError';
  }
}
