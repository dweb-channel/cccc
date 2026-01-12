/**
 * AgentRegistry Tests
 *
 * Run with: node --test tests/agent/registry.test.ts
 */

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert';
import { AgentRegistry, type RegistryEvent } from '../../agent/index.js';
import { MockTextHandler, MockImageHandler } from './mock-handler.js';

describe('AgentRegistry', () => {
  let registry: AgentRegistry;

  beforeEach(() => {
    registry = new AgentRegistry();
  });

  describe('register', () => {
    it('should register a handler', async () => {
      const handler = new MockTextHandler('test-handler', ['generate']);

      await registry.register(handler);

      assert.strictEqual(registry.count(), 1);
      assert.ok(registry.has('text', 'test-handler'));
    });

    it('should auto-initialize handler by default', async () => {
      const handler = new MockTextHandler('test-handler', ['generate']);

      await registry.register(handler);

      assert.ok(handler.wasInitialized());
    });

    it('should skip initialization when autoInitialize=false', async () => {
      const handler = new MockTextHandler('test-handler', ['generate']);

      await registry.register(handler, false);

      assert.ok(!handler.wasInitialized());
    });

    it('should throw on duplicate registration', async () => {
      const handler1 = new MockTextHandler('test-handler', ['generate']);
      const handler2 = new MockTextHandler('test-handler', ['analyze']);

      await registry.register(handler1);

      await assert.rejects(async () => {
        await registry.register(handler2);
      }, /already registered/);
    });

    it('should emit registered event', async () => {
      const events: RegistryEvent[] = [];
      registry.on((event) => events.push(event));

      const handler = new MockTextHandler('test-handler', ['generate']);
      await registry.register(handler);

      assert.strictEqual(events.length, 2); // registered + initialized
      assert.strictEqual(events[0].type, 'registered');
      assert.strictEqual(events[0].handlerName, 'test-handler');
      assert.strictEqual(events[1].type, 'initialized');
    });
  });

  describe('unregister', () => {
    it('should unregister a handler', async () => {
      const handler = new MockTextHandler('test-handler', ['generate']);
      await registry.register(handler);

      const result = await registry.unregister('text', 'test-handler');

      assert.strictEqual(result, true);
      assert.strictEqual(registry.count(), 0);
      assert.ok(!registry.has('text', 'test-handler'));
    });

    it('should auto-dispose handler by default', async () => {
      const handler = new MockTextHandler('test-handler', ['generate']);
      await registry.register(handler);

      await registry.unregister('text', 'test-handler');

      assert.ok(handler.wasDisposed());
    });

    it('should return false for non-existent handler', async () => {
      const result = await registry.unregister('text', 'non-existent');
      assert.strictEqual(result, false);
    });

    it('should emit unregistered event', async () => {
      const events: RegistryEvent[] = [];
      const handler = new MockTextHandler('test-handler', ['generate']);
      await registry.register(handler);

      registry.on((event) => events.push(event));
      await registry.unregister('text', 'test-handler');

      assert.ok(events.some((e) => e.type === 'unregistered'));
      assert.ok(events.some((e) => e.type === 'disposed'));
    });
  });

  describe('get', () => {
    it('should get handler by type and name', async () => {
      const handler = new MockTextHandler('test-handler', ['generate']);
      await registry.register(handler);

      const result = registry.get('text', 'test-handler');

      assert.strictEqual(result, handler);
    });

    it('should return undefined for non-existent handler', () => {
      const result = registry.get('text', 'non-existent');
      assert.strictEqual(result, undefined);
    });
  });

  describe('getByCapability', () => {
    it('should find handler by capability', async () => {
      const handler = new MockTextHandler('test-handler', ['generate', 'analyze']);
      await registry.register(handler);

      const result = registry.getByCapability('text', 'analyze');

      assert.strictEqual(result, handler);
    });

    it('should return undefined when no handler has capability', async () => {
      const handler = new MockTextHandler('test-handler', ['generate']);
      await registry.register(handler);

      const result = registry.getByCapability('text', 'transform');

      assert.strictEqual(result, undefined);
    });

    it('should return first matching handler when multiple exist', async () => {
      const handler1 = new MockTextHandler('handler-1', ['generate']);
      const handler2 = new MockTextHandler('handler-2', ['generate']);

      await registry.register(handler1);
      await registry.register(handler2);

      const result = registry.getByCapability('text', 'generate');

      assert.ok(result === handler1 || result === handler2);
    });
  });

  describe('getAllByCapability', () => {
    it('should return all handlers with capability', async () => {
      const handler1 = new MockTextHandler('handler-1', ['generate']);
      const handler2 = new MockTextHandler('handler-2', ['generate', 'analyze']);
      const handler3 = new MockTextHandler('handler-3', ['analyze']);

      await registry.register(handler1);
      await registry.register(handler2);
      await registry.register(handler3);

      const result = registry.getAllByCapability('generate');

      assert.strictEqual(result.length, 2);
      assert.ok(result.includes(handler1));
      assert.ok(result.includes(handler2));
    });

    it('should filter by type when specified', async () => {
      const textHandler = new MockTextHandler('text-handler', ['generate']);
      const imageHandler = new MockImageHandler('image-handler', ['generate']);

      await registry.register(textHandler);
      await registry.register(imageHandler);

      const result = registry.getAllByCapability('generate', 'text');

      assert.strictEqual(result.length, 1);
      assert.strictEqual(result[0], textHandler);
    });
  });

  describe('list', () => {
    it('should list all handlers', async () => {
      const handler1 = new MockTextHandler('handler-1', ['generate']);
      const handler2 = new MockImageHandler('handler-2', ['generate']);

      await registry.register(handler1);
      await registry.register(handler2);

      const result = registry.list();

      assert.strictEqual(result.length, 2);
    });

    it('should filter by type when specified', async () => {
      const handler1 = new MockTextHandler('handler-1', ['generate']);
      const handler2 = new MockImageHandler('handler-2', ['generate']);

      await registry.register(handler1);
      await registry.register(handler2);

      const result = registry.list('text');

      assert.strictEqual(result.length, 1);
      assert.strictEqual(result[0], handler1);
    });
  });

  describe('listInfo', () => {
    it('should return handler info with metadata', async () => {
      const handler = new MockTextHandler('test-handler', ['generate', 'analyze']);
      await registry.register(handler);

      const result = registry.listInfo();

      assert.strictEqual(result.length, 1);
      assert.strictEqual(result[0].type, 'text');
      assert.strictEqual(result[0].name, 'test-handler');
      assert.strictEqual(result[0].capabilities.length, 2);
      assert.ok(result[0].registeredAt instanceof Date);
      assert.strictEqual(result[0].initialized, true);
    });
  });

  describe('count', () => {
    it('should return total handler count', async () => {
      await registry.register(new MockTextHandler('h1', ['a']));
      await registry.register(new MockTextHandler('h2', ['b']));
      await registry.register(new MockImageHandler('h3', ['c']));

      assert.strictEqual(registry.count(), 3);
    });

    it('should return count by type', async () => {
      await registry.register(new MockTextHandler('h1', ['a']));
      await registry.register(new MockTextHandler('h2', ['b']));
      await registry.register(new MockImageHandler('h3', ['c']));

      assert.strictEqual(registry.count('text'), 2);
      assert.strictEqual(registry.count('image'), 1);
      assert.strictEqual(registry.count('video'), 0);
    });
  });

  describe('clear', () => {
    it('should remove all handlers', async () => {
      await registry.register(new MockTextHandler('h1', ['a']));
      await registry.register(new MockTextHandler('h2', ['b']));

      await registry.clear();

      assert.strictEqual(registry.count(), 0);
    });

    it('should dispose all handlers', async () => {
      const handler1 = new MockTextHandler('h1', ['a']);
      const handler2 = new MockTextHandler('h2', ['b']);

      await registry.register(handler1);
      await registry.register(handler2);
      await registry.clear();

      assert.ok(handler1.wasDisposed());
      assert.ok(handler2.wasDisposed());
    });
  });

  describe('healthCheck', () => {
    it('should return health status for all handlers', async () => {
      const healthyHandler = new MockTextHandler('healthy', ['a'], { shouldFail: false });
      const unhealthyHandler = new MockTextHandler('unhealthy', ['b'], { shouldFail: true });

      await registry.register(healthyHandler);
      await registry.register(unhealthyHandler);

      const results = await registry.healthCheck();

      assert.strictEqual(results.get('text:healthy'), true);
      assert.strictEqual(results.get('text:unhealthy'), false);
    });
  });

  describe('event subscription', () => {
    it('should unsubscribe via returned function', async () => {
      const events: RegistryEvent[] = [];
      const unsubscribe = registry.on((event) => events.push(event));

      await registry.register(new MockTextHandler('h1', ['a']));
      unsubscribe();
      await registry.register(new MockTextHandler('h2', ['b']));

      // Only events from h1 registration
      assert.strictEqual(events.length, 2);
    });
  });
});
