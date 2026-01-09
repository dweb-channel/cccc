/**
 * IPC protocol types for CCCC daemon communication
 */

export interface DaemonRequest {
  v: number;
  op: string;
  args: Record<string, unknown>;
}

export interface DaemonError {
  code: string;
  message: string;
  details: Record<string, unknown>;
}

export interface DaemonResponse {
  v: number;
  ok: boolean;
  result: Record<string, unknown>;
  error: DaemonError | null;
}

/**
 * Create a daemon request
 */
export function createRequest(op: string, args: Record<string, unknown> = {}): DaemonRequest {
  return { v: 1, op, args };
}
