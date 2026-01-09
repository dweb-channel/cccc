/**
 * Context-related types
 */

export type MilestoneStatus = 'planned' | 'active' | 'done' | 'archived';
export type TaskStatus = 'planned' | 'active' | 'done' | 'archived';
export type StepStatus = 'pending' | 'in_progress' | 'done';

export interface Milestone {
  id: string;
  name: string;
  description: string;
  status: MilestoneStatus;
  started?: string | null;
  completed?: string | null;
  outcomes?: string | null;
}

export interface Step {
  id: string;
  name: string;
  acceptance: string;
  status: StepStatus;
}

export interface Task {
  id: string;
  name: string;
  goal: string;
  status: TaskStatus;
  milestone?: string | null;
  assignee?: string | null;
  steps: Step[];
  created_at: string;
  updated_at: string;
}

export interface Note {
  id: string;
  content: string;
}

export interface ContextReference {
  id: string;
  url: string;
  note: string;
}

export interface Presence {
  agent_id: string;
  status: string;
  updated_at: string;
}

export interface Context {
  vision: string;
  sketch: string;
  milestones: Milestone[];
  tasks_summary: {
    total: number;
    by_status: Record<TaskStatus, number>;
  };
  active_task?: Task | null;
  notes: Note[];
  references: ContextReference[];
  presence: Presence[];
}

export interface ContextSyncOp {
  op: string;
  [key: string]: unknown;
}

export interface TaskCreateOptions {
  name: string;
  goal: string;
  steps: Array<{ name: string; acceptance: string }>;
  milestone_id?: string;
  assignee?: string;
}

export interface TaskUpdateOptions {
  task_id: string;
  name?: string;
  goal?: string;
  status?: TaskStatus;
  assignee?: string;
  milestone_id?: string;
  step_id?: string;
  step_status?: StepStatus;
}

export interface MilestoneCreateOptions {
  name: string;
  description: string;
  status?: MilestoneStatus;
}
