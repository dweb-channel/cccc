/**
 * Unix Socket Transport Layer for CCCC daemon IPC
 *
 * Protocol:
 * - Uses Unix Domain Socket at $CCCC_HOME/daemon/ccccd.sock
 * - Messages are newline-delimited JSON
 * - Request: {"v": 1, "op": "xxx", "args": {...}}
 * - Response: {"v": 1, "ok": true/false, "result": {...}, "error": {...}}
 */

import * as net from 'node:net';
import * as path from 'node:path';
import * as os from 'node:os';
import * as fs from 'node:fs';
import type { DaemonRequest, DaemonResponse } from './types/ipc.js';
import { CCCCError } from './errors.js';

export interface TransportOptions {
  /** CCCC home directory, defaults to ~/.cccc */
  ccccHome?: string;
  /** Request timeout in milliseconds, defaults to 60000 */
  timeoutMs?: number;
}

const DEFAULT_TIMEOUT_MS = 60_000;
const MAX_RESPONSE_SIZE = 4_000_000; // 4MB

/**
 * Get default CCCC home directory
 */
export function getDefaultCcccHome(): string {
  return process.env['CCCC_HOME'] || path.join(os.homedir(), '.cccc');
}

/**
 * Get socket path for CCCC daemon
 */
export function getSocketPath(ccccHome?: string): string {
  const home = ccccHome || getDefaultCcccHome();
  return path.join(home, 'daemon', 'ccccd.sock');
}

/**
 * Check if daemon socket exists
 */
export function socketExists(ccccHome?: string): boolean {
  const sockPath = getSocketPath(ccccHome);
  try {
    fs.accessSync(sockPath, fs.constants.F_OK);
    return true;
  } catch {
    return false;
  }
}

/**
 * Send a request to the CCCC daemon and receive a response
 */
export async function callDaemon(
  request: DaemonRequest,
  options: TransportOptions = {}
): Promise<DaemonResponse> {
  const { ccccHome, timeoutMs = DEFAULT_TIMEOUT_MS } = options;
  const sockPath = getSocketPath(ccccHome);

  // Check socket exists
  if (!socketExists(ccccHome)) {
    throw new CCCCError('SOCKET_NOT_FOUND', `Socket not found at ${sockPath}`);
  }

  return new Promise((resolve, reject) => {
    const socket = net.createConnection(sockPath);
    let buffer = '';
    let resolved = false;

    const cleanup = () => {
      socket.removeAllListeners();
      socket.destroy();
    };

    const handleError = (error: Error) => {
      if (resolved) return;
      resolved = true;
      cleanup();

      if ((error as NodeJS.ErrnoException).code === 'ECONNREFUSED') {
        reject(new CCCCError('DAEMON_NOT_RUNNING', 'Daemon is not running'));
      } else if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        reject(new CCCCError('SOCKET_NOT_FOUND', `Socket not found at ${sockPath}`));
      } else {
        reject(new CCCCError('INTERNAL', error.message));
      }
    };

    // Set timeout
    const timeoutId = setTimeout(() => {
      if (resolved) return;
      resolved = true;
      cleanup();
      reject(new CCCCError('TIMEOUT', `Request timed out after ${timeoutMs}ms`));
    }, timeoutMs);

    socket.on('connect', () => {
      // Send request as newline-delimited JSON
      const payload = JSON.stringify(request) + '\n';
      socket.write(payload, 'utf-8');
    });

    socket.on('data', (chunk: Buffer) => {
      buffer += chunk.toString('utf-8');

      // Check size limit
      if (buffer.length > MAX_RESPONSE_SIZE) {
        if (resolved) return;
        resolved = true;
        clearTimeout(timeoutId);
        cleanup();
        reject(new CCCCError('INTERNAL', 'Response too large'));
        return;
      }

      // Check for complete response (newline terminated)
      const newlineIndex = buffer.indexOf('\n');
      if (newlineIndex !== -1) {
        if (resolved) return;
        resolved = true;
        clearTimeout(timeoutId);
        cleanup();

        const line = buffer.slice(0, newlineIndex);
        try {
          const response = JSON.parse(line) as DaemonResponse;
          resolve(response);
        } catch {
          reject(new CCCCError('INTERNAL', 'Invalid JSON response from daemon'));
        }
      }
    });

    socket.on('error', handleError);

    socket.on('close', () => {
      if (resolved) return;
      resolved = true;
      clearTimeout(timeoutId);
      cleanup();
      reject(new CCCCError('DAEMON_NOT_RUNNING', 'Connection closed unexpectedly'));
    });
  });
}

/**
 * Ping the daemon to check if it's running
 */
export async function pingDaemon(options: TransportOptions = {}): Promise<boolean> {
  try {
    const response = await callDaemon({ v: 1, op: 'ping', args: {} }, options);
    return response.ok;
  } catch {
    return false;
  }
}
