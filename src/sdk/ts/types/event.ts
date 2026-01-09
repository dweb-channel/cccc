/**
 * Event-related types
 */

export type EventKind =
  | 'group.create'
  | 'group.update'
  | 'group.attach'
  | 'group.detach_scope'
  | 'group.set_active_scope'
  | 'group.start'
  | 'group.stop'
  | 'actor.add'
  | 'actor.update'
  | 'actor.set_role'
  | 'actor.start'
  | 'actor.stop'
  | 'actor.restart'
  | 'actor.remove'
  | 'context.sync'
  | 'chat.message'
  | 'chat.read'
  | 'chat.reaction'
  | 'system.notify'
  | 'system.notify_ack';

export interface Event {
  v: number;
  id: string;
  ts: string;
  kind: EventKind | string;
  group_id: string;
  scope_key: string;
  by: string;
  data: Record<string, unknown>;
}
