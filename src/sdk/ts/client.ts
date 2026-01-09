/**
 * CCCC Client SDK
 *
 * High-level API for interacting with CCCC daemon
 */

import { callDaemon, pingDaemon, type TransportOptions } from './transport.js';
import { createRequest, type DaemonResponse } from './types/ipc.js';
import { CCCCError } from './errors.js';
import type {
  Actor,
  ActorAddOptions,
  GroupState,
  HeadlessState,
} from './types/actor.js';
import type { GroupInfo, GroupCreateOptions, GroupUpdatePatch } from './types/group.js';
import type {
  SendMessageOptions,
  ReplyMessageOptions,
  InboxMessage,
  InboxListOptions,
} from './types/message.js';
import type { Event } from './types/event.js';
import type {
  Context,
  ContextSyncOp,
  Task,
  TaskCreateOptions,
  TaskUpdateOptions,
  Milestone,
  MilestoneCreateOptions,
} from './types/context.js';

export interface CCCCClientOptions extends TransportOptions {}

/**
 * Handle daemon response, throwing on error
 */
function handleResponse<T>(response: DaemonResponse): T {
  if (!response.ok) {
    if (response.error) {
      throw CCCCError.fromDaemonError(response.error);
    }
    throw new CCCCError('DAEMON_ERROR', 'Unknown daemon error');
  }
  return response.result as T;
}

/**
 * Groups API
 */
class GroupsAPI {
  constructor(private client: CCCCClient) {}

  /**
   * List all groups
   */
  async list(): Promise<GroupInfo[]> {
    const response = await this.client.call('groups', {});
    return (handleResponse<{ groups: GroupInfo[] }>(response)).groups;
  }

  /**
   * Get group info
   */
  async get(groupId: string): Promise<GroupInfo> {
    const response = await this.client.call('group_show', { group_id: groupId });
    return handleResponse<GroupInfo>(response);
  }

  /**
   * Create a new group
   */
  async create(options: GroupCreateOptions): Promise<GroupInfo> {
    const response = await this.client.call('group_create', {
      title: options.title,
      topic: options.topic ?? '',
      url: options.url ?? '',
    });
    return handleResponse<GroupInfo>(response);
  }

  /**
   * Set group state
   */
  async setState(groupId: string, state: GroupState, by: string): Promise<void> {
    const response = await this.client.call('group_set_state', {
      group_id: groupId,
      state,
      by,
    });
    handleResponse(response);
  }

  /**
   * Start group (activate all enabled actors)
   */
  async start(groupId: string): Promise<void> {
    const response = await this.client.call('group_start', { group_id: groupId });
    handleResponse(response);
  }

  /**
   * Stop group (stop all actors)
   */
  async stop(groupId: string): Promise<void> {
    const response = await this.client.call('group_stop', { group_id: groupId });
    handleResponse(response);
  }

  /**
   * Update group
   */
  async update(groupId: string, patch: GroupUpdatePatch): Promise<void> {
    const response = await this.client.call('group_update', {
      group_id: groupId,
      patch,
    });
    handleResponse(response);
  }

  /**
   * Delete group
   */
  async delete(groupId: string): Promise<void> {
    const response = await this.client.call('group_delete', { group_id: groupId });
    handleResponse(response);
  }
}

/**
 * Actors API
 */
class ActorsAPI {
  constructor(private client: CCCCClient) {}

  /**
   * List actors in a group
   */
  async list(groupId: string): Promise<Actor[]> {
    const response = await this.client.call('actor_list', { group_id: groupId });
    return (handleResponse<{ actors: Actor[] }>(response)).actors;
  }

  /**
   * Add an actor to a group
   */
  async add(groupId: string, by: string, options: ActorAddOptions): Promise<Actor> {
    const response = await this.client.call('actor_add', {
      group_id: groupId,
      by,
      actor_id: options.actor_id,
      runtime: options.runtime ?? 'claude',
      runner: options.runner ?? 'pty',
      title: options.title ?? '',
      command: options.command ?? [],
      env: options.env ?? {},
    });
    return handleResponse<{ actor: Actor }>(response).actor;
  }

  /**
   * Start an actor
   */
  async start(groupId: string, actorId: string, by: string): Promise<void> {
    const response = await this.client.call('actor_start', {
      group_id: groupId,
      actor_id: actorId,
      by,
    });
    handleResponse(response);
  }

  /**
   * Stop an actor
   */
  async stop(groupId: string, actorId: string, by: string): Promise<void> {
    const response = await this.client.call('actor_stop', {
      group_id: groupId,
      actor_id: actorId,
      by,
    });
    handleResponse(response);
  }

  /**
   * Restart an actor
   */
  async restart(groupId: string, actorId: string, by: string): Promise<void> {
    const response = await this.client.call('actor_restart', {
      group_id: groupId,
      actor_id: actorId,
      by,
    });
    handleResponse(response);
  }

  /**
   * Remove an actor
   */
  async remove(groupId: string, actorId: string, by: string): Promise<void> {
    const response = await this.client.call('actor_remove', {
      group_id: groupId,
      actor_id: actorId,
      by,
    });
    handleResponse(response);
  }
}

/**
 * Messages API
 */
class MessagesAPI {
  constructor(private client: CCCCClient) {}

  /**
   * Send a message
   */
  async send(groupId: string, by: string, options: SendMessageOptions): Promise<Event> {
    const response = await this.client.call('send', {
      group_id: groupId,
      by,
      text: options.text,
      to: options.to ?? [],
      format: options.format ?? 'plain',
    });
    return handleResponse<{ event: Event }>(response).event;
  }

  /**
   * Reply to a message
   */
  async reply(groupId: string, by: string, options: ReplyMessageOptions): Promise<Event> {
    const response = await this.client.call('reply', {
      group_id: groupId,
      by,
      event_id: options.event_id,
      text: options.text,
      to: options.to ?? [],
    });
    return handleResponse<{ event: Event }>(response).event;
  }
}

/**
 * Inbox API
 */
class InboxAPI {
  constructor(private client: CCCCClient) {}

  /**
   * List inbox messages
   */
  async list(
    groupId: string,
    actorId: string,
    options: InboxListOptions = {}
  ): Promise<InboxMessage[]> {
    const response = await this.client.call('inbox_list', {
      group_id: groupId,
      actor_id: actorId,
      kind_filter: options.kind_filter ?? 'all',
      limit: options.limit ?? 50,
    });
    return (handleResponse<{ messages: InboxMessage[] }>(response)).messages;
  }

  /**
   * Mark messages as read up to event_id
   */
  async markRead(groupId: string, actorId: string, eventId: string): Promise<void> {
    const response = await this.client.call('inbox_mark_read', {
      group_id: groupId,
      actor_id: actorId,
      event_id: eventId,
    });
    handleResponse(response);
  }

  /**
   * Mark all messages as read
   */
  async markAllRead(groupId: string, actorId: string): Promise<void> {
    const response = await this.client.call('inbox_mark_all_read', {
      group_id: groupId,
      actor_id: actorId,
    });
    handleResponse(response);
  }
}

/**
 * Context API
 */
class ContextAPI {
  constructor(private client: CCCCClient) {}

  /**
   * Get project context
   */
  async get(groupId: string): Promise<Context> {
    const response = await this.client.call('context_get', { group_id: groupId });
    return handleResponse<Context>(response);
  }

  /**
   * Sync context with batch operations
   */
  async sync(
    groupId: string,
    ops: ContextSyncOp[],
    dryRun = false
  ): Promise<Record<string, unknown>> {
    const response = await this.client.call('context_sync', {
      group_id: groupId,
      ops,
      dry_run: dryRun,
    });
    return handleResponse<Record<string, unknown>>(response);
  }
}

/**
 * Tasks API
 */
class TasksAPI {
  constructor(private client: CCCCClient) {}

  /**
   * List tasks
   */
  async list(groupId: string, includeArchived = false): Promise<Task[]> {
    const response = await this.client.call('task_list', {
      group_id: groupId,
      include_archived: includeArchived,
    });
    return (handleResponse<{ tasks: Task[] }>(response)).tasks;
  }

  /**
   * Create a task
   */
  async create(groupId: string, options: TaskCreateOptions): Promise<Task> {
    const response = await this.client.call('context_sync', {
      group_id: groupId,
      ops: [
        {
          op: 'task.create',
          name: options.name,
          goal: options.goal,
          steps: options.steps,
          milestone_id: options.milestone_id,
          assignee: options.assignee,
        },
      ],
    });
    const result = handleResponse<{ results: Array<{ task: Task }> }>(response);
    return result.results[0].task;
  }

  /**
   * Update a task
   */
  async update(groupId: string, options: TaskUpdateOptions): Promise<Task> {
    const response = await this.client.call('context_sync', {
      group_id: groupId,
      ops: [
        {
          op: 'task.update',
          task_id: options.task_id,
          name: options.name,
          goal: options.goal,
          status: options.status,
          assignee: options.assignee,
          milestone_id: options.milestone_id,
          step_id: options.step_id,
          step_status: options.step_status,
        },
      ],
    });
    const result = handleResponse<{ results: Array<{ task: Task }> }>(response);
    return result.results[0].task;
  }
}

/**
 * Milestones API
 */
class MilestonesAPI {
  constructor(private client: CCCCClient) {}

  /**
   * Create a milestone
   */
  async create(groupId: string, options: MilestoneCreateOptions): Promise<Milestone> {
    const response = await this.client.call('context_sync', {
      group_id: groupId,
      ops: [
        {
          op: 'milestone.create',
          name: options.name,
          description: options.description,
          status: options.status ?? 'planned',
        },
      ],
    });
    const result = handleResponse<{ results: Array<{ milestone: Milestone }> }>(response);
    return result.results[0].milestone;
  }

  /**
   * Complete a milestone
   */
  async complete(groupId: string, milestoneId: string, outcomes: string): Promise<void> {
    const response = await this.client.call('context_sync', {
      group_id: groupId,
      ops: [
        {
          op: 'milestone.complete',
          milestone_id: milestoneId,
          outcomes,
        },
      ],
    });
    handleResponse(response);
  }
}

/**
 * Vision API
 */
class VisionAPI {
  constructor(private client: CCCCClient) {}

  /**
   * Update project vision
   */
  async update(groupId: string, vision: string): Promise<void> {
    const response = await this.client.call('context_sync', {
      group_id: groupId,
      ops: [{ op: 'vision.update', vision }],
    });
    handleResponse(response);
  }
}

/**
 * Sketch API
 */
class SketchAPI {
  constructor(private client: CCCCClient) {}

  /**
   * Update execution sketch
   */
  async update(groupId: string, sketch: string): Promise<void> {
    const response = await this.client.call('context_sync', {
      group_id: groupId,
      ops: [{ op: 'sketch.update', sketch }],
    });
    handleResponse(response);
  }
}

/**
 * Headless API for MCP-driven actors
 */
class HeadlessAPI {
  constructor(private client: CCCCClient) {}

  /**
   * Get headless session status
   */
  async status(groupId: string, actorId: string): Promise<HeadlessState> {
    const response = await this.client.call('headless_status', {
      group_id: groupId,
      actor_id: actorId,
    });
    return handleResponse<HeadlessState>(response);
  }

  /**
   * Set headless session status
   */
  async setStatus(
    groupId: string,
    actorId: string,
    status: 'idle' | 'working' | 'waiting' | 'stopped',
    taskId?: string
  ): Promise<void> {
    const response = await this.client.call('headless_set_status', {
      group_id: groupId,
      actor_id: actorId,
      status,
      task_id: taskId,
    });
    handleResponse(response);
  }

  /**
   * Acknowledge processed message
   */
  async ackMessage(groupId: string, actorId: string, messageId: string): Promise<void> {
    const response = await this.client.call('headless_ack_message', {
      group_id: groupId,
      actor_id: actorId,
      message_id: messageId,
    });
    handleResponse(response);
  }
}

/**
 * CCCC Client
 *
 * Main entry point for SDK
 *
 * @example
 * ```typescript
 * const client = new CCCCClient();
 *
 * // List all groups
 * const groups = await client.groups.list();
 *
 * // Add an actor
 * await client.actors.add(groupId, 'user', {
 *   actor_id: 'agent-1',
 *   runtime: 'claude',
 *   runner: 'pty'
 * });
 *
 * // Send a message
 * await client.messages.send(groupId, 'user', {
 *   text: 'Hello agents!',
 *   to: ['agent-1']
 * });
 * ```
 */
export class CCCCClient {
  private options: CCCCClientOptions;

  // API namespaces
  readonly groups: GroupsAPI;
  readonly actors: ActorsAPI;
  readonly messages: MessagesAPI;
  readonly inbox: InboxAPI;
  readonly context: ContextAPI;
  readonly tasks: TasksAPI;
  readonly milestones: MilestonesAPI;
  readonly vision: VisionAPI;
  readonly sketch: SketchAPI;
  readonly headless: HeadlessAPI;

  constructor(options: CCCCClientOptions = {}) {
    this.options = options;

    // Initialize API namespaces
    this.groups = new GroupsAPI(this);
    this.actors = new ActorsAPI(this);
    this.messages = new MessagesAPI(this);
    this.inbox = new InboxAPI(this);
    this.context = new ContextAPI(this);
    this.tasks = new TasksAPI(this);
    this.milestones = new MilestonesAPI(this);
    this.vision = new VisionAPI(this);
    this.sketch = new SketchAPI(this);
    this.headless = new HeadlessAPI(this);
  }

  /**
   * Ping daemon to check if it's running
   */
  async ping(): Promise<boolean> {
    return pingDaemon(this.options);
  }

  /**
   * Low-level daemon call
   */
  async call(op: string, args: Record<string, unknown>): Promise<DaemonResponse> {
    const request = createRequest(op, args);
    return callDaemon(request, this.options);
  }

  /**
   * Shutdown the daemon
   */
  async shutdown(): Promise<void> {
    const response = await this.call('shutdown', {});
    handleResponse(response);
  }
}
