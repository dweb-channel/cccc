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
  parseAgentResponse,
} from './orchestrator.js';
export type {
  AgentMessage,
  OrchestratorConfig,
  OrchestratorState,
  OrchestratorEvent,
  OrchestratorEventType,
  OrchestratorEventListener,
} from './orchestrator.js';

// Handlers
export { GeminiTextHandler, GeminiAPIError } from './handlers/index.js';
export type { GeminiHandlerConfig } from './handlers/index.js';
