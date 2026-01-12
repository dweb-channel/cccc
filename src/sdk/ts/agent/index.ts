/**
 * CCCC Agent Framework
 *
 * Provides a universal handler registry and orchestrator for building
 * multi-modal agents that communicate via CCCC.
 *
 * @packageDocumentation
 */

// Types
export * from './types/index.js';

// Registry
export { AgentRegistry } from './registry.js';
export type {
  HandlerKey,
  RegisteredHandler,
  RegistryEvent,
  RegistryEventType,
  RegistryEventListener,
} from './registry.js';

// Orchestrator
export {
  AgentOrchestrator,
  createAgentRequest,
  createStreamingAgentRequest,
  parseAgentResponse,
  parseStreamChunk,
} from './orchestrator.js';
export type {
  AgentMessage,
  StreamingChunkCallback,
  OrchestratorConfig,
  OrchestratorState,
  OrchestratorEvent,
  OrchestratorEventType,
  OrchestratorEventListener,
} from './orchestrator.js';

// Streaming
export {
  StreamingHandler,
  isStreamingHandler,
  collectStream,
  transformStream,
  prefixStream,
} from './streaming.js';
export type { StreamingHandlerConfig } from './streaming.js';

// Handlers
export {
  GeminiTextHandler,
  GeminiAPIError,
  OpenAITextHandler,
  OpenAIStreamingHandler,
  OpenAIAPIError,
  ClaudeTextHandler,
  ClaudeStreamingHandler,
  ClaudeAPIError,
  OllamaTextHandler,
  OllamaAPIError,
} from './handlers/index.js';
export type {
  GeminiHandlerConfig,
  OpenAIHandlerConfig,
  ClaudeHandlerConfig,
  OllamaHandlerConfig,
} from './handlers/index.js';
