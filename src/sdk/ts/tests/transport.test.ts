/**
 * Transport Layer Tests
 *
 * Run with: node --test tests/transport.test.ts
 */

import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
  getDefaultCcccHome,
  getSocketPath,
  socketExists,
} from '../transport.js';
import * as path from 'node:path';
import * as os from 'node:os';

describe('Transport', () => {
  describe('getDefaultCcccHome', () => {
    it('should return CCCC_HOME env if set', () => {
      const original = process.env['CCCC_HOME'];
      process.env['CCCC_HOME'] = '/custom/path';
      try {
        assert.strictEqual(getDefaultCcccHome(), '/custom/path');
      } finally {
        if (original) {
          process.env['CCCC_HOME'] = original;
        } else {
          delete process.env['CCCC_HOME'];
        }
      }
    });

    it('should return ~/.cccc by default', () => {
      const original = process.env['CCCC_HOME'];
      delete process.env['CCCC_HOME'];
      try {
        assert.strictEqual(getDefaultCcccHome(), path.join(os.homedir(), '.cccc'));
      } finally {
        if (original) {
          process.env['CCCC_HOME'] = original;
        }
      }
    });
  });

  describe('getSocketPath', () => {
    it('should return correct socket path', () => {
      const home = '/test/home';
      const expected = '/test/home/daemon/ccccd.sock';
      assert.strictEqual(getSocketPath(home), expected);
    });
  });

  describe('socketExists', () => {
    it('should return false for non-existent socket', () => {
      assert.strictEqual(socketExists('/non/existent/path'), false);
    });
  });
});
