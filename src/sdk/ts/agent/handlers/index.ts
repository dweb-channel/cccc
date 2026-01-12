/**
 * Agent Handlers
 *
 * Pre-built handler implementations for common AI services.
 */

// Gemini
export { GeminiTextHandler, GeminiAPIError } from './gemini.js';
export type { GeminiHandlerConfig } from './gemini.js';

// OpenAI
export { OpenAITextHandler, OpenAIStreamingHandler, OpenAIAPIError } from './openai.js';
export type { OpenAIHandlerConfig } from './openai.js';

// Claude
export { ClaudeTextHandler, ClaudeStreamingHandler, ClaudeAPIError } from './claude.js';
export type { ClaudeHandlerConfig } from './claude.js';

// Ollama (local)
export { OllamaTextHandler, OllamaAPIError } from './ollama.js';
export type { OllamaHandlerConfig } from './ollama.js';

// Doubao Video (Volcengine)
export { DoubaoVideoHandler, DoubaoAPIError } from './doubao-video.js';
export type { DoubaoVideoHandlerConfig } from './doubao-video.js';
