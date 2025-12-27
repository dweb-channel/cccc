/**
 * Context API Routes
 * 项目上下文查询 (vision/sketch/milestones/tasks/notes/refs)
 */
import { Hono } from 'hono'
import * as fs from 'node:fs'
import * as path from 'node:path'
import * as yaml from 'js-yaml'
import type { ApiContext } from './index'
import type { ProjectContext, Milestone, Task, Note, Reference } from '../shared/types'

export const contextRoutes = new Hono<ApiContext>()

// Context 文件路径
const CONTEXT_DIR = 'context'

interface ContextData {
  vision?: string
  sketch?: string
  milestones?: Milestone[]
  notes?: Note[]
  references?: Reference[]
  meta?: Record<string, unknown>
}

interface PresenceData {
  agents?: Array<{ id: string; status: string; lastSeen?: string }>
}

function getContextPath(projectRoot: string): string {
  return path.join(projectRoot, CONTEXT_DIR, 'context.yaml')
}

function getPresencePath(projectRoot: string): string {
  return path.join(projectRoot, CONTEXT_DIR, 'presence.yaml')
}

function getTasksDir(projectRoot: string): string {
  return path.join(projectRoot, CONTEXT_DIR, 'tasks')
}

function readYamlFile<T>(filePath: string): T | null {
  try {
    const content = fs.readFileSync(filePath, 'utf-8')
    return yaml.load(content) as T
  } catch {
    return null
  }
}

function readAllTasks(projectRoot: string): Task[] {
  const tasksDir = getTasksDir(projectRoot)
  try {
    const files = fs.readdirSync(tasksDir).filter((f) => f.endsWith('.yaml'))
    const tasks: Task[] = []

    for (const file of files) {
      const task = readYamlFile<Task>(path.join(tasksDir, file))
      if (task) {
        tasks.push(task)
      }
    }

    // Sort by ID
    return tasks.sort((a, b) => a.id.localeCompare(b.id))
  } catch {
    return []
  }
}

/**
 * GET /api/context
 * 获取完整项目上下文
 */
contextRoutes.get('/', (c) => {
  const projectRoot = c.get('projectRoot')
  const contextData = readYamlFile<ContextData>(getContextPath(projectRoot))
  const tasks = readAllTasks(projectRoot)

  const context: ProjectContext = {
    vision: contextData?.vision,
    sketch: contextData?.sketch,
    milestones: contextData?.milestones ?? [],
    tasks,
    notes: contextData?.notes ?? [],
    references: contextData?.references ?? [],
  }

  return c.json(context)
})

/**
 * GET /api/context/vision
 * 获取项目愿景
 */
contextRoutes.get('/vision', (c) => {
  const projectRoot = c.get('projectRoot')
  const contextData = readYamlFile<ContextData>(getContextPath(projectRoot))

  return c.json({ vision: contextData?.vision ?? null })
})

/**
 * GET /api/context/sketch
 * 获取执行蓝图
 */
contextRoutes.get('/sketch', (c) => {
  const projectRoot = c.get('projectRoot')
  const contextData = readYamlFile<ContextData>(getContextPath(projectRoot))

  return c.json({ sketch: contextData?.sketch ?? null })
})

/**
 * GET /api/context/milestones
 * 获取里程碑列表
 */
contextRoutes.get('/milestones', (c) => {
  const projectRoot = c.get('projectRoot')
  const contextData = readYamlFile<ContextData>(getContextPath(projectRoot))
  const milestones = contextData?.milestones ?? []

  return c.json({
    milestones,
    count: milestones.length,
    active: milestones.find((m) => m.status === 'active'),
  })
})

/**
 * GET /api/context/tasks
 * 获取任务列表
 */
contextRoutes.get('/tasks', (c) => {
  const projectRoot = c.get('projectRoot')
  const status = c.req.query('status')
  let tasks = readAllTasks(projectRoot)

  if (status) {
    tasks = tasks.filter((t) => t.status === status)
  }

  return c.json({
    tasks,
    count: tasks.length,
  })
})

/**
 * GET /api/context/tasks/:id
 * 获取单个任务详情
 */
contextRoutes.get('/tasks/:id', (c) => {
  const projectRoot = c.get('projectRoot')
  const id = c.req.param('id')
  const tasksDir = getTasksDir(projectRoot)
  const taskPath = path.join(tasksDir, `${id}.yaml`)
  const task = readYamlFile<Task>(taskPath)

  if (!task) {
    return c.json({ error: 'Task not found', id }, 404)
  }

  return c.json(task)
})

/**
 * GET /api/context/notes
 * 获取笔记列表
 */
contextRoutes.get('/notes', (c) => {
  const projectRoot = c.get('projectRoot')
  const contextData = readYamlFile<ContextData>(getContextPath(projectRoot))
  const notes = contextData?.notes ?? []

  return c.json({
    notes,
    count: notes.length,
  })
})

/**
 * GET /api/context/references
 * 获取引用列表
 */
contextRoutes.get('/references', (c) => {
  const projectRoot = c.get('projectRoot')
  const contextData = readYamlFile<ContextData>(getContextPath(projectRoot))
  const references = contextData?.references ?? []

  return c.json({
    references,
    count: references.length,
  })
})

/**
 * GET /api/context/presence
 * 获取 Agent 存在状态
 */
contextRoutes.get('/presence', (c) => {
  const projectRoot = c.get('projectRoot')
  const presenceData = readYamlFile<PresenceData>(getPresencePath(projectRoot))
  const agents = presenceData?.agents ?? []

  return c.json({
    agents,
    count: agents.length,
  })
})
