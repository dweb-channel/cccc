/**
 * Actor-related types
 */

export type ActorRole = 'foreman' | 'peer';
export type ActorSubmit = 'enter' | 'newline' | 'none';
export type RunnerKind = 'pty' | 'headless';
export type AgentRuntime =
  | 'amp'
  | 'auggie'
  | 'claude'
  | 'codex'
  | 'cursor'
  | 'droid'
  | 'gemini'
  | 'kilocode'
  | 'neovate'
  | 'opencode'
  | 'copilot'
  | 'custom';

export type GroupState = 'active' | 'idle' | 'paused';

export interface Actor {
  v: number;
  id: string;
  role?: ActorRole | null;
  title: string;
  command: string[];
  env: Record<string, string>;
  default_scope_key: string;
  submit: ActorSubmit;
  enabled: boolean;
  runner: RunnerKind;
  runtime: AgentRuntime;
  created_at: string;
  updated_at: string;
}

export interface HeadlessState {
  v: number;
  group_id: string;
  actor_id: string;
  status: 'idle' | 'working' | 'waiting' | 'stopped';
  current_task_id?: string | null;
  last_message_id?: string | null;
  started_at: string;
  updated_at: string;
}

export interface ActorAddOptions {
  actor_id: string;
  runtime?: AgentRuntime;
  runner?: RunnerKind;
  title?: string;
  command?: string[];
  env?: Record<string, string>;
}
