/**
 * CCCC SDK Error Types
 */

export type CCCCErrorCode =
  | 'DAEMON_NOT_RUNNING'
  | 'SOCKET_NOT_FOUND'
  | 'TIMEOUT'
  | 'INVALID_REQUEST'
  | 'PERMISSION_DENIED'
  | 'GROUP_NOT_FOUND'
  | 'ACTOR_NOT_FOUND'
  | 'INTERNAL'
  | 'DAEMON_ERROR';

export class CCCCError extends Error {
  readonly code: CCCCErrorCode;
  readonly details: Record<string, unknown>;

  constructor(code: CCCCErrorCode, message: string, details: Record<string, unknown> = {}) {
    super(message);
    this.name = 'CCCCError';
    this.code = code;
    this.details = details;
  }

  static fromDaemonError(error: { code: string; message: string; details?: Record<string, unknown> }): CCCCError {
    const codeMap: Record<string, CCCCErrorCode> = {
      daemon_unavailable: 'DAEMON_NOT_RUNNING',
      invalid_request: 'INVALID_REQUEST',
      permission_denied: 'PERMISSION_DENIED',
      group_not_found: 'GROUP_NOT_FOUND',
      actor_not_found: 'ACTOR_NOT_FOUND',
    };
    const code = codeMap[error.code] ?? 'DAEMON_ERROR';
    return new CCCCError(code, error.message, error.details ?? {});
  }
}
