/**
 * CCCC Zod Schemas
 * 数据验证模型 - 运行时类型校验
 */
import { z } from 'zod'

// ============ Enum Schemas ============

export const PeerStatusSchema = z.enum(['idle', 'active', 'blocked', 'offline'])
export const TaskStatusSchema = z.enum(['planned', 'active', 'done'])
export const StepStatusSchema = z.enum(['pending', 'in_progress', 'done'])
export const MilestoneStatusSchema = z.enum(['pending', 'active', 'done'])
export const MessageTypeSchema = z.enum(['user', 'peer', 'system', 'foreman'])
export const MessageTargetSchema = z.enum(['peerA', 'peerB', 'both', 'user'])
export const ProcessBackendSchema = z.enum(['execa', 'pty'])

// ============ Core Schemas ============

export const StepSchema = z.object({
  id: z.string(),
  name: z.string().min(1),
  acceptance: z.string(),
  status: StepStatusSchema,
})

export const TaskSchema = z.object({
  id: z.string(),
  name: z.string().min(1),
  goal: z.string(),
  status: TaskStatusSchema,
  milestone: z.string().optional(),
  assignee: z.string().optional(),
  steps: z.array(StepSchema),
  created_at: z.string(),
  updated_at: z.string(),
})

export const MilestoneSchema = z.object({
  id: z.string(),
  name: z.string().min(1),
  description: z.string(),
  status: MilestoneStatusSchema,
  started: z.string().optional(),
  completed: z.string().optional(),
  outcomes: z.string().optional(),
  updated_at: z.string(),
})

export const NoteSchema = z.object({
  id: z.string(),
  content: z.string().min(1),
  ttl: z.number().min(0).max(100),
  created_at: z.string(),
  updated_at: z.string(),
})

export const ReferenceSchema = z.object({
  id: z.string(),
  url: z.string().min(1),
  note: z.string(),
  ttl: z.number().min(0).max(100),
  created_at: z.string(),
  updated_at: z.string(),
})

export const MessageSchema = z.object({
  id: z.string(),
  type: MessageTypeSchema,
  from: z.string(),
  to: MessageTargetSchema,
  content: z.string(),
  timestamp: z.string(),
  metadata: z.record(z.unknown()).optional(),
})

// ============ Actor & Peer Schemas ============

export const ActorSchema = z.object({
  name: z.string().min(1),
  command: z.string().min(1),
  args: z.array(z.string()).default([]),
  env: z.record(z.string()).optional(),
  capabilities: z.array(z.string()).optional(),
  rate_limit: z.number().positive().optional(),
})

export const BindingSchema = z.object({
  peer: z.string().min(1),
  actor: z.string().min(1),
  role: z.string().optional(),
})

// ============ Config Schemas ============

export const ForemanConfigSchema = z.object({
  enabled: z.boolean().default(false),
  schedule: z.string().optional(),
  actor: z.string().optional(),
})

export const ProcessConfigSchema = z.object({
  backend: ProcessBackendSchema.default('execa'),
  cols: z.number().positive().default(120),
  rows: z.number().positive().default(30),
  idle_timeout: z.number().positive().optional(),
})

export const ApiConfigSchema = z.object({
  port: z.number().min(1).max(65535).default(3000),
  host: z.string().default('127.0.0.1'),
  auth: z
    .object({
      token: z.string().optional(),
    })
    .optional(),
})

export const CliProfileSchema = z.object({
  name: z.string().min(1),
  bindings: z.array(BindingSchema),
  foreman: ForemanConfigSchema.optional(),
  process: ProcessConfigSchema.optional(),
})

export const CcccConfigSchema = z.object({
  profile: z.string().default('default'),
  profiles: z.record(CliProfileSchema),
  actors: z.record(ActorSchema),
  api: ApiConfigSchema.optional(),
})

// ============ Mailbox Schemas ============

export const MailboxEntrySchema = z.object({
  id: z.string(),
  filename: z.string(),
  timestamp: z.string(),
  from: z.string(),
  to: MessageTargetSchema,
  preview: z.string(),
  processed: z.boolean(),
})

// ============ Context Schemas ============

export const ProjectContextSchema = z.object({
  vision: z.string().optional(),
  sketch: z.string().optional(),
  milestones: z.array(MilestoneSchema).default([]),
  notes: z.array(NoteSchema).default([]),
  references: z.array(ReferenceSchema).default([]),
})

export const PresenceEntrySchema = z.object({
  agent_id: z.string(),
  status: z.string(),
  updated_at: z.string(),
})

// ============ Event Schemas ============

export const OrchestratorEventTypeSchema = z.enum([
  'peer:start',
  'peer:stop',
  'peer:status',
  'peer:output',
  'message:new',
  'message:delivered',
  'task:update',
  'handoff:start',
  'handoff:complete',
])

export const LedgerEntrySchema = z.object({
  id: z.string(),
  timestamp: z.string(),
  event_type: OrchestratorEventTypeSchema,
  actor: z.string().optional(),
  summary: z.string(),
  data: z.record(z.unknown()).optional(),
})

// ============ Type Exports ============

export type StepInput = z.input<typeof StepSchema>
export type TaskInput = z.input<typeof TaskSchema>
export type MilestoneInput = z.input<typeof MilestoneSchema>
export type ActorInput = z.input<typeof ActorSchema>
export type CcccConfigInput = z.input<typeof CcccConfigSchema>
