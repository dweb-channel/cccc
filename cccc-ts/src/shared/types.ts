/**
 * CCCC Core Type Definitions
 * 共享类型定义 - 对应 Python 版 task_schema.py 和 types
 */

// ============ Enums ============

/** Peer 状态 */
export type PeerStatus = 'idle' | 'active' | 'blocked' | 'offline'

/** 任务状态 */
export type TaskStatus = 'planned' | 'active' | 'done'

/** 步骤状态 */
export type StepStatus = 'pending' | 'in_progress' | 'done'

/** 里程碑状态 */
export type MilestoneStatus = 'pending' | 'active' | 'done'

/** 消息类型 */
export type MessageType = 'user' | 'peer' | 'system' | 'foreman'

/** 消息目标 */
export type MessageTarget = 'peerA' | 'peerB' | 'both' | 'user'

/** 进程后端类型 (默认 execa，可选 pty 用于交互增强) */
export type ProcessBackend = 'execa' | 'pty'

// ============ Core Interfaces ============

/** 步骤定义 */
export interface Step {
  id: string
  name: string
  acceptance: string
  status: StepStatus
}

/** 任务定义 */
export interface Task {
  id: string
  name: string
  goal: string
  status: TaskStatus
  milestone?: string
  assignee?: string
  steps: Step[]
  created_at: string
  updated_at: string
}

/** 里程碑定义 */
export interface Milestone {
  id: string
  name: string
  description: string
  status: MilestoneStatus
  started?: string
  completed?: string
  outcomes?: string
  updated_at: string
}

/** 笔记定义 */
export interface Note {
  id: string
  content: string
  ttl: number
  created_at: string
  updated_at: string
}

/** 引用定义 */
export interface Reference {
  id: string
  url: string
  note: string
  ttl: number
  created_at: string
  updated_at: string
}

/** 消息定义 */
export interface Message {
  id: string
  type: MessageType
  from: string
  to: MessageTarget
  content: string
  timestamp: string
  metadata?: Record<string, unknown>
}

// ============ Actor & Peer ============

/** Actor 定义 (来自 agents.yaml) */
export interface Actor {
  name: string
  command: string
  args: string[]
  env?: Record<string, string>
  capabilities?: string[]
  rate_limit?: number
}

/** Peer 绑定 */
export interface Binding {
  peer: string
  actor: string
  role?: string
}

/** Peer 运行时状态 */
export interface PeerRuntime {
  id: string
  actor: Actor
  status: PeerStatus
  pid?: number
  started_at?: string
  last_activity?: string
  output_lines: number
}

// ============ Mailbox ============

/** 邮箱消息索引项 */
export interface MailboxEntry {
  id: string
  filename: string
  timestamp: string
  from: string
  to: MessageTarget
  preview: string
  processed: boolean
}

/** 邮箱状态 */
export interface MailboxState {
  peer: string
  inbox_count: number
  outbox_pending: boolean
  last_delivery?: string
}

// ============ Config ============

/** CLI Profile */
export interface CliProfile {
  name: string
  bindings: Binding[]
  foreman?: ForemanConfig
  process?: ProcessConfig
}

/** Foreman 配置 */
export interface ForemanConfig {
  enabled: boolean
  schedule?: string
  actor?: string
}

/** 进程配置 */
export interface ProcessConfig {
  backend: ProcessBackend
  cols?: number
  rows?: number
  idle_timeout?: number
}

/** API 配置 */
export interface ApiConfig {
  port: number
  host: string
  auth?: {
    token?: string
  }
}

/** 主配置 */
export interface CcccConfig {
  profile: string
  profiles: Record<string, CliProfile>
  actors: Record<string, Actor>
  api?: ApiConfig
}

// ============ Events ============

/** 编排器事件类型 */
export type OrchestratorEventType =
  | 'peer:start'
  | 'peer:stop'
  | 'peer:status'
  | 'peer:output'
  | 'message:new'
  | 'message:delivered'
  | 'task:update'
  | 'handoff:start'
  | 'handoff:complete'

/** 编排器事件 */
export interface OrchestratorEvent<T = unknown> {
  type: OrchestratorEventType
  timestamp: string
  data: T
}

/** Ledger 条目 (Audit Log) */
export interface LedgerEntry {
  id: string
  timestamp: string
  event_type: OrchestratorEventType
  actor?: string
  summary: string
  data?: Record<string, unknown>
}

// ============ Context ============

/** 项目上下文 */
export interface ProjectContext {
  vision?: string
  sketch?: string
  milestones: Milestone[]
  tasks?: Task[]
  notes: Note[]
  references: Reference[]
}

/** Presence 状态 */
export interface PresenceEntry {
  agent_id: string
  status: string
  updated_at: string
}

// ============ Utility Types ============

/** 深度只读类型 */
export type DeepReadonly<T> = {
  readonly [P in keyof T]: T[P] extends object ? DeepReadonly<T[P]> : T[P]
}

/** 可选字段 */
export type Optional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>

/** 创建时省略的字段 */
export type CreateInput<T> = Omit<T, 'id' | 'created_at' | 'updated_at'>
