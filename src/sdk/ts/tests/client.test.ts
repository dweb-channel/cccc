/**
 * Client Tests
 *
 * Run with: node --test tests/client.test.ts
 *
 * Note: Integration tests require a running CCCC daemon
 */

import { describe, it } from 'node:test';
import assert from 'node:assert';
import { CCCCClient } from '../client.js';
import { CCCCError } from '../errors.js';

describe('CCCCClient', () => {
  describe('constructor', () => {
    it('should create client with default options', () => {
      const client = new CCCCClient();
      assert.ok(client);
      assert.ok(client.groups);
      assert.ok(client.actors);
      assert.ok(client.messages);
      assert.ok(client.inbox);
      assert.ok(client.context);
      assert.ok(client.tasks);
      assert.ok(client.milestones);
      assert.ok(client.vision);
      assert.ok(client.sketch);
      assert.ok(client.headless);
    });

    it('should create client with custom options', () => {
      const client = new CCCCClient({
        ccccHome: '/custom/path',
        timeoutMs: 30000,
      });
      assert.ok(client);
    });
  });

  describe('ping', () => {
    it('should return false when daemon not running', async () => {
      const client = new CCCCClient({
        ccccHome: '/non/existent/path',
      });
      const result = await client.ping();
      assert.strictEqual(result, false);
    });
  });
});

describe('CCCCError', () => {
  it('should create error with code and message', () => {
    const error = new CCCCError('DAEMON_NOT_RUNNING', 'Daemon is not running');
    assert.strictEqual(error.code, 'DAEMON_NOT_RUNNING');
    assert.strictEqual(error.message, 'Daemon is not running');
    assert.strictEqual(error.name, 'CCCCError');
  });

  it('should create error from daemon error', () => {
    const daemonError = {
      code: 'permission_denied',
      message: 'Permission denied',
      details: { actor: 'user' },
    };
    const error = CCCCError.fromDaemonError(daemonError);
    assert.strictEqual(error.code, 'PERMISSION_DENIED');
    assert.strictEqual(error.message, 'Permission denied');
    assert.deepStrictEqual(error.details, { actor: 'user' });
  });
});
