/**
 * Group-related types
 */

import type { Actor, GroupState } from './actor.js';

export interface Scope {
  scope_key: string;
  url: string;
  label: string;
  git_remote: string;
}

export interface GroupInfo {
  v: number;
  group_id: string;
  title: string;
  topic: string;
  created_at: string;
  updated_at: string;
  running: boolean;
  state: GroupState;
  active_scope_key: string;
  scopes: Scope[];
  actors: Actor[];
}

export interface GroupCreateOptions {
  title: string;
  topic?: string;
  url?: string;
}

export interface GroupUpdatePatch {
  title?: string;
  topic?: string;
}
