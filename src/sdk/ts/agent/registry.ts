/**
 * Agent Registry
 *
 * Central registry for managing agent handlers.
 * Supports registration, lookup, and lifecycle management.
 */

import type { AgentHandler, HandlerType, HandlerCapability } from './types/handler.js';

/**
 * Handler lookup key
 */
export interface HandlerKey {
  type: HandlerType;
  name: string;
}

/**
 * Handler registration info
 */
export interface RegisteredHandler {
  handler: AgentHandler;
  registeredAt: Date;
  initialized: boolean;
}

/**
 * Registry events
 */
export type RegistryEventType = 'registered' | 'unregistered' | 'initialized' | 'disposed';

export interface RegistryEvent {
  type: RegistryEventType;
  handlerType: HandlerType;
  handlerName: string;
  timestamp: Date;
}

export type RegistryEventListener = (event: RegistryEvent) => void;

/**
 * Agent Registry
 *
 * Manages the lifecycle of agent handlers including registration,
 * lookup, and cleanup.
 *
 * @example
 * ```typescript
 * const registry = new AgentRegistry();
 *
 * // Register handlers
 * registry.register(new GeminiTextHandler({ apiKey: '...' }));
 * registry.register(new DalleImageHandler({ apiKey: '...' }));
 *
 * // Get handler by type and name
 * const gemini = registry.get('text', 'gemini-3-preview');
 *
 * // Get handler by capability
 * const generator = registry.getByCapability('text', 'generate');
 *
 * // List all handlers
 * const allHandlers = registry.list();
 * ```
 */
export class AgentRegistry {
  /** Map of type -> name -> handler */
  private handlers: Map<HandlerType, Map<string, RegisteredHandler>> = new Map();

  /** Event listeners */
  private listeners: Set<RegistryEventListener> = new Set();

  /**
   * Register a handler
   *
   * @param handler - The handler to register
   * @param autoInitialize - Whether to call initialize() automatically (default: true)
   * @throws Error if handler with same type/name already exists
   */
  async register(handler: AgentHandler, autoInitialize = true): Promise<void> {
    const { type, name } = handler;

    // Get or create type map
    let typeMap = this.handlers.get(type);
    if (!typeMap) {
      typeMap = new Map();
      this.handlers.set(type, typeMap);
    }

    // Check for duplicates
    if (typeMap.has(name)) {
      throw new Error(`Handler '${name}' of type '${type}' is already registered`);
    }

    // Initialize if requested
    let initialized = false;
    if (autoInitialize && handler.initialize) {
      await handler.initialize();
      initialized = true;
    }

    // Register
    typeMap.set(name, {
      handler,
      registeredAt: new Date(),
      initialized,
    });

    // Emit event
    this.emit({
      type: 'registered',
      handlerType: type,
      handlerName: name,
      timestamp: new Date(),
    });

    if (initialized) {
      this.emit({
        type: 'initialized',
        handlerType: type,
        handlerName: name,
        timestamp: new Date(),
      });
    }
  }

  /**
   * Unregister a handler
   *
   * @param type - Handler type
   * @param name - Handler name
   * @param autoDispose - Whether to call dispose() automatically (default: true)
   * @returns true if handler was found and removed
   */
  async unregister(type: HandlerType, name: string, autoDispose = true): Promise<boolean> {
    const typeMap = this.handlers.get(type);
    if (!typeMap) return false;

    const registered = typeMap.get(name);
    if (!registered) return false;

    // Dispose if requested
    if (autoDispose && registered.handler.dispose) {
      await registered.handler.dispose();
      this.emit({
        type: 'disposed',
        handlerType: type,
        handlerName: name,
        timestamp: new Date(),
      });
    }

    // Remove
    typeMap.delete(name);

    // Clean up empty type map
    if (typeMap.size === 0) {
      this.handlers.delete(type);
    }

    // Emit event
    this.emit({
      type: 'unregistered',
      handlerType: type,
      handlerName: name,
      timestamp: new Date(),
    });

    return true;
  }

  /**
   * Get a handler by type and name
   *
   * @param type - Handler type
   * @param name - Handler name
   * @returns The handler or undefined if not found
   */
  get(type: HandlerType, name: string): AgentHandler | undefined {
    return this.handlers.get(type)?.get(name)?.handler;
  }

  /**
   * Get a handler that supports a specific capability
   *
   * @param type - Handler type
   * @param capability - Capability name to look for
   * @returns First matching handler or undefined
   */
  getByCapability(type: HandlerType, capability: string): AgentHandler | undefined {
    const typeMap = this.handlers.get(type);
    if (!typeMap) return undefined;

    for (const registered of typeMap.values()) {
      const hasCapability = registered.handler.capabilities.some(
        (cap) => cap.name === capability
      );
      if (hasCapability) {
        return registered.handler;
      }
    }

    return undefined;
  }

  /**
   * Get all handlers that support a specific capability
   *
   * @param type - Handler type (optional, searches all types if not provided)
   * @param capability - Capability name to look for
   * @returns Array of matching handlers
   */
  getAllByCapability(capability: string, type?: HandlerType): AgentHandler[] {
    const results: AgentHandler[] = [];

    const searchTypes = type ? [type] : Array.from(this.handlers.keys());

    for (const t of searchTypes) {
      const typeMap = this.handlers.get(t);
      if (!typeMap) continue;

      for (const registered of typeMap.values()) {
        const hasCapability = registered.handler.capabilities.some(
          (cap) => cap.name === capability
        );
        if (hasCapability) {
          results.push(registered.handler);
        }
      }
    }

    return results;
  }

  /**
   * Check if a handler exists
   *
   * @param type - Handler type
   * @param name - Handler name
   * @returns true if handler is registered
   */
  has(type: HandlerType, name: string): boolean {
    return this.handlers.get(type)?.has(name) ?? false;
  }

  /**
   * List all registered handlers
   *
   * @param type - Optional type filter
   * @returns Array of handlers
   */
  list(type?: HandlerType): AgentHandler[] {
    const results: AgentHandler[] = [];

    const searchTypes = type ? [type] : Array.from(this.handlers.keys());

    for (const t of searchTypes) {
      const typeMap = this.handlers.get(t);
      if (!typeMap) continue;

      for (const registered of typeMap.values()) {
        results.push(registered.handler);
      }
    }

    return results;
  }

  /**
   * List all registered handler info
   *
   * @param type - Optional type filter
   * @returns Array of handler info objects
   */
  listInfo(type?: HandlerType): Array<{
    type: HandlerType;
    name: string;
    capabilities: HandlerCapability[];
    registeredAt: Date;
    initialized: boolean;
  }> {
    const results: Array<{
      type: HandlerType;
      name: string;
      capabilities: HandlerCapability[];
      registeredAt: Date;
      initialized: boolean;
    }> = [];

    const searchTypes = type ? [type] : Array.from(this.handlers.keys());

    for (const t of searchTypes) {
      const typeMap = this.handlers.get(t);
      if (!typeMap) continue;

      for (const [name, registered] of typeMap) {
        results.push({
          type: t,
          name,
          capabilities: registered.handler.capabilities,
          registeredAt: registered.registeredAt,
          initialized: registered.initialized,
        });
      }
    }

    return results;
  }

  /**
   * Get count of registered handlers
   *
   * @param type - Optional type filter
   * @returns Number of handlers
   */
  count(type?: HandlerType): number {
    if (type) {
      return this.handlers.get(type)?.size ?? 0;
    }

    let total = 0;
    for (const typeMap of this.handlers.values()) {
      total += typeMap.size;
    }
    return total;
  }

  /**
   * Clear all handlers
   *
   * @param autoDispose - Whether to call dispose() on each handler
   */
  async clear(autoDispose = true): Promise<void> {
    for (const [type, typeMap] of this.handlers) {
      for (const [name, registered] of typeMap) {
        if (autoDispose && registered.handler.dispose) {
          await registered.handler.dispose();
          this.emit({
            type: 'disposed',
            handlerType: type,
            handlerName: name,
            timestamp: new Date(),
          });
        }

        this.emit({
          type: 'unregistered',
          handlerType: type,
          handlerName: name,
          timestamp: new Date(),
        });
      }
    }

    this.handlers.clear();
  }

  /**
   * Run health check on all handlers
   *
   * @returns Map of handler key to health status
   */
  async healthCheck(): Promise<Map<string, boolean>> {
    const results = new Map<string, boolean>();

    for (const [type, typeMap] of this.handlers) {
      for (const [name, registered] of typeMap) {
        const key = `${type}:${name}`;
        try {
          const healthy = registered.handler.healthCheck
            ? await registered.handler.healthCheck()
            : true;
          results.set(key, healthy);
        } catch {
          results.set(key, false);
        }
      }
    }

    return results;
  }

  /**
   * Subscribe to registry events
   *
   * @param listener - Event listener function
   * @returns Unsubscribe function
   */
  on(listener: RegistryEventListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /**
   * Emit an event to all listeners
   */
  private emit(event: RegistryEvent): void {
    for (const listener of this.listeners) {
      try {
        listener(event);
      } catch (err) {
        console.error('Registry event listener error:', err);
      }
    }
  }
}
