/**
 * CCCC Client SDK for Node.js
 *
 * @packageDocumentation
 */

// Main client
export { CCCCClient, type CCCCClientOptions } from './client.js';

// Transport
export {
  callDaemon,
  pingDaemon,
  getSocketPath,
  getDefaultCcccHome,
  socketExists,
  type TransportOptions,
} from './transport.js';

// Errors
export { CCCCError, type CCCCErrorCode } from './errors.js';

// Types
export * from './types/index.js';

// Agent Framework
export * from './agent/index.js';
