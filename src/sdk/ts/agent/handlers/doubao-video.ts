/**
 * Doubao Video Handler
 *
 * Handler for Volcengine Doubao Seedance video generation models.
 * Supports image-to-video generation with first/last frame input.
 */

import {
  AsyncTaskHandler,
  type HandlerType,
  type HandlerCapability,
  type HandlerConfig,
  type AgentInput,
  type AgentOutput,
  type TaskInfo,
  type ContentItem,
  type VideoGenerationParams,
  type ImageContent,
} from '../types/handler.js';

/**
 * Doubao-specific configuration
 */
export interface DoubaoVideoHandlerConfig extends HandlerConfig {
  /** API key for Volcengine Ark */
  apiKey: string;
  /** Model to use (default: doubao-seedance-1-5-pro-251215) */
  model?: string;
  /** Custom API base URL */
  apiBase?: string;
  /** Request timeout in ms (default: 30000 for submit) */
  timeout?: number;
  /** Default video duration in seconds */
  defaultDuration?: number;
}

/**
 * Doubao API response types
 */
interface DoubaoTaskResponse {
  task_id: string;
  status?: string;
  error?: {
    code: string;
    message: string;
  };
}

interface DoubaoStatusResponse {
  task_id: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress?: number;
  output?: {
    video_url?: string;
    duration?: number;
  };
  error?: {
    code: string;
    message: string;
  };
}

interface DoubaoErrorResponse {
  error?: {
    code: string;
    message: string;
  };
}

/**
 * Doubao content part types (OpenAI-compatible)
 */
interface DoubaoTextPart {
  type: 'text';
  text: string;
}

interface DoubaoImageUrlPart {
  type: 'image_url';
  image_url: {
    url: string;
  };
}

type DoubaoContentPart = DoubaoTextPart | DoubaoImageUrlPart;

/**
 * Default Doubao API base URL
 */
const DEFAULT_DOUBAO_API_BASE = 'https://ark.cn-beijing.volces.com/api/v3';

/**
 * Convert ImageContent to Doubao image_url format
 */
function convertImageToDoubao(image: ImageContent): DoubaoImageUrlPart {
  let url: string;

  if (image.source.type === 'url') {
    url = image.source.url;
  } else if (image.source.type === 'base64') {
    // Doubao accepts data URI format
    url = `data:${image.source.mediaType};base64,${image.source.data}`;
  } else if (image.source.type === 'file') {
    throw new Error('File-based images must be converted to base64 before processing');
  } else {
    throw new Error('Unknown image source type');
  }

  return {
    type: 'image_url',
    image_url: { url },
  };
}

/**
 * Build prompt with embedded parameters
 */
function buildPromptWithParams(
  basePrompt: string,
  params?: VideoGenerationParams
): string {
  const parts = [basePrompt];

  if (params?.duration !== undefined) {
    parts.push(`--duration ${params.duration}`);
  }

  if (params?.cameraFixed !== undefined) {
    parts.push(`--camerafixed ${params.cameraFixed}`);
  }

  if (params?.cameraMotion) {
    parts.push(`--cameramotion ${params.cameraMotion}`);
  }

  if (params?.watermark !== undefined) {
    parts.push(`--watermark ${params.watermark}`);
  }

  if (params?.aspectRatio) {
    parts.push(`--aspectratio ${params.aspectRatio}`);
  }

  if (params?.seed !== undefined) {
    parts.push(`--seed ${params.seed}`);
  }

  return parts.join(' ');
}

/**
 * DoubaoVideoHandler
 *
 * Implements video generation using Volcengine Doubao Seedance API.
 * Supports image-to-video with first/last frame input.
 *
 * @example
 * ```typescript
 * const handler = new DoubaoVideoHandler({
 *   apiKey: process.env.ARK_API_KEY!,
 *   model: 'doubao-seedance-1-5-pro-251215',
 * });
 *
 * // Submit and wait for result
 * const output = await handler.process({
 *   requestId: 'req-1',
 *   task: 'generate',
 *   content: [{ type: 'text', text: 'A cat walking on the beach' }],
 *   params: {
 *     videoGeneration: {
 *       firstFrame: { source: { type: 'url', url: 'https://...' } },
 *       duration: 5,
 *     },
 *   },
 * });
 *
 * // Or use async task API directly
 * const taskInfo = await handler.submitTask(input);
 * // ... poll later
 * const status = await handler.getTaskStatus(taskInfo.taskId);
 * ```
 */
export class DoubaoVideoHandler extends AsyncTaskHandler {
  readonly type: HandlerType = 'video';
  readonly name: string;
  readonly capabilities: HandlerCapability[] = [
    { name: 'video_generation', description: 'Generate video from text prompt' },
    { name: 'image_to_video', description: 'Generate video from image (first frame)' },
    { name: 'frame_interpolation', description: 'Generate video with first and last frames' },
  ];

  private doubaoConfig: DoubaoVideoHandlerConfig;
  private apiBase: string;

  constructor(config: DoubaoVideoHandlerConfig) {
    super(config);

    if (!config.apiKey) {
      throw new Error('DoubaoVideoHandler requires apiKey');
    }

    this.doubaoConfig = {
      model: 'doubao-seedance-1-5-pro-251215',
      timeout: 30000,
      defaultDuration: 5,
      ...config,
    };

    this.name = this.doubaoConfig.model!;
    this.apiBase = config.apiBase || DEFAULT_DOUBAO_API_BASE;
  }

  /**
   * Submit a video generation task
   */
  async submitTask(input: AgentInput): Promise<TaskInfo> {
    try {
      const requestBody = this.buildRequestBody(input);
      const response = await this.callDoubaoAPI(
        '/contents/generations/tasks',
        requestBody
      );

      return this.createPendingTask(response.task_id, {
        model: this.doubaoConfig.model,
        requestId: input.requestId,
      });
    } catch (error) {
      // Generate a pseudo task ID for error tracking
      const errorTaskId = `error-${Date.now()}`;

      if (error instanceof DoubaoAPIError) {
        return this.createFailedTask(
          errorTaskId,
          error.code,
          error.message,
          { httpStatus: error.httpStatus }
        );
      }

      return this.createFailedTask(
        errorTaskId,
        'SUBMIT_FAILED',
        error instanceof Error ? error.message : 'Unknown error'
      );
    }
  }

  /**
   * Get the status of a video generation task
   */
  async getTaskStatus(taskId: string): Promise<TaskInfo> {
    try {
      const response = await this.callDoubaoStatusAPI(taskId);

      // Map Doubao status to our status
      switch (response.status) {
        case 'pending':
          return {
            taskId,
            status: 'pending',
            createdAt: new Date().toISOString(),
            progress: 0,
          };

        case 'processing':
          return {
            taskId,
            status: 'processing',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            progress: response.progress ?? 50,
          };

        case 'completed':
          if (response.output?.video_url) {
            const result = this.createOutput(
              taskId, // Use taskId as requestId for result
              [
                {
                  type: 'video',
                  video: {
                    source: {
                      type: 'url',
                      url: response.output.video_url,
                    },
                    format: 'mp4',
                  },
                },
              ],
              {
                model: this.doubaoConfig.model,
                duration: response.output.duration,
              }
            );
            return this.createCompletedTask(taskId, result);
          }
          return this.createFailedTask(
            taskId,
            'NO_OUTPUT',
            'Task completed but no video URL returned'
          );

        case 'failed':
          return this.createFailedTask(
            taskId,
            response.error?.code ?? 'TASK_FAILED',
            response.error?.message ?? 'Video generation failed'
          );

        default:
          return this.createFailedTask(
            taskId,
            'UNKNOWN_STATUS',
            `Unknown status: ${response.status}`
          );
      }
    } catch (error) {
      if (error instanceof DoubaoAPIError) {
        return this.createFailedTask(
          taskId,
          error.code,
          error.message,
          { httpStatus: error.httpStatus }
        );
      }

      return this.createFailedTask(
        taskId,
        'STATUS_CHECK_FAILED',
        error instanceof Error ? error.message : 'Unknown error'
      );
    }
  }

  /**
   * Health check - verify API connectivity
   */
  async healthCheck(): Promise<boolean> {
    // For video generation, we can't do a cheap health check
    // Just verify the API key format is valid
    return this.doubaoConfig.apiKey.length > 0;
  }

  /**
   * Build Doubao API request body
   */
  private buildRequestBody(input: AgentInput): Record<string, unknown> {
    const content: DoubaoContentPart[] = [];
    const videoParams = input.params?.videoGeneration as VideoGenerationParams | undefined;

    // Extract text prompt
    const textContent = input.content
      .filter((item) => item.type === 'text' && item.text)
      .map((item) => item.text!)
      .join('\n');

    // Build prompt with embedded parameters
    const prompt = buildPromptWithParams(textContent, videoParams);
    content.push({ type: 'text', text: prompt });

    // Add first frame if provided
    if (videoParams?.firstFrame) {
      content.push(convertImageToDoubao(videoParams.firstFrame));
    } else {
      // Check for image in input content (legacy support)
      const imageItem = input.content.find((item) => item.type === 'image');
      if (imageItem?.image) {
        content.push(convertImageToDoubao(imageItem.image));
      }
    }

    // Add last frame if provided (for frame interpolation)
    if (videoParams?.lastFrame) {
      content.push(convertImageToDoubao(videoParams.lastFrame));
    }

    return {
      model: this.doubaoConfig.model,
      content,
    };
  }

  /**
   * Call Doubao API to submit task
   */
  private async callDoubaoAPI(
    endpoint: string,
    body: Record<string, unknown>
  ): Promise<DoubaoTaskResponse> {
    const url = `${this.apiBase}${endpoint}`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.doubaoConfig.timeout);

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.doubaoConfig.apiKey}`,
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorData = (await response.json().catch(() => ({}))) as DoubaoErrorResponse;
        const errorMessage = errorData.error?.message || `HTTP ${response.status}`;
        const errorCode = this.mapHttpStatusToErrorCode(response.status);
        throw new DoubaoAPIError(errorCode, errorMessage, response.status);
      }

      return (await response.json()) as DoubaoTaskResponse;
    } catch (error) {
      clearTimeout(timeoutId);

      if (error instanceof DoubaoAPIError) {
        throw error;
      }

      if (error instanceof Error && error.name === 'AbortError') {
        throw new DoubaoAPIError('TIMEOUT', `Request timed out after ${this.doubaoConfig.timeout}ms`);
      }

      throw new DoubaoAPIError('NETWORK_ERROR', error instanceof Error ? error.message : 'Unknown error');
    }
  }

  /**
   * Call Doubao API to check task status
   */
  private async callDoubaoStatusAPI(taskId: string): Promise<DoubaoStatusResponse> {
    const url = `${this.apiBase}/contents/generations/tasks/${taskId}`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.doubaoConfig.timeout);

    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.doubaoConfig.apiKey}`,
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorData = (await response.json().catch(() => ({}))) as DoubaoErrorResponse;
        const errorMessage = errorData.error?.message || `HTTP ${response.status}`;
        const errorCode = this.mapHttpStatusToErrorCode(response.status);
        throw new DoubaoAPIError(errorCode, errorMessage, response.status);
      }

      return (await response.json()) as DoubaoStatusResponse;
    } catch (error) {
      clearTimeout(timeoutId);

      if (error instanceof DoubaoAPIError) {
        throw error;
      }

      if (error instanceof Error && error.name === 'AbortError') {
        throw new DoubaoAPIError('TIMEOUT', `Request timed out after ${this.doubaoConfig.timeout}ms`);
      }

      throw new DoubaoAPIError('NETWORK_ERROR', error instanceof Error ? error.message : 'Unknown error');
    }
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
        return 'NOT_FOUND';
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
 * Custom error class for Doubao API errors
 */
export class DoubaoAPIError extends Error {
  constructor(
    public code: string,
    message: string,
    public httpStatus?: number
  ) {
    super(message);
    this.name = 'DoubaoAPIError';
  }
}
