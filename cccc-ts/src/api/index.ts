/**
 * API Routes Entry
 * Hono 路由汇总
 */
import { readFile, stat } from 'node:fs/promises'
import { join, extname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { logger } from 'hono/logger'
import { createPeersRoutes } from './peers'
import { messagesRoutes } from './messages'
import { configRoutes } from './config'
import { contextRoutes } from './context'
import type { Orchestrator } from '../orchestrator'
import type { ProcessManager } from '../orchestrator/process/manager'

export interface ApiContext {
  Variables: {
    projectRoot: string
    processManager?: ProcessManager
  }
}

export interface CreateApiOptions {
  projectRoot: string
  orchestrator?: Orchestrator
}

// MIME 类型映射
const MIME_TYPES: Record<string, string> = {
  '.html': 'text/html',
  '.js': 'application/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
}

/**
 * 获取 WebUI 静态文件目录
 */
function getWebuiDir(): string {
  // dist/index.js -> dist/webui
  const __dirname = fileURLToPath(new URL('.', import.meta.url))
  return join(__dirname, 'webui')
}

/**
 * 创建 API 应用
 */
export function createApi(options: CreateApiOptions | string): Hono<ApiContext> {
  // 兼容旧的调用方式
  const opts: CreateApiOptions =
    typeof options === 'string' ? { projectRoot: options } : options
  const { projectRoot, orchestrator } = opts
  const processManager = orchestrator?.getProcessManager()

  const app = new Hono<ApiContext>()
  const webuiDir = getWebuiDir()

  // 中间件
  app.use('*', logger())
  app.use(
    '*',
    cors({
      origin: '*',
      allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowHeaders: ['Content-Type', 'Authorization'],
    })
  )

  // 注入项目根目录和 ProcessManager
  app.use('*', async (c, next) => {
    c.set('projectRoot', projectRoot)
    if (processManager) {
      c.set('processManager', processManager)
    }
    await next()
  })

  // 健康检查
  app.get('/health', (c) => {
    return c.json({ status: 'ok', timestamp: new Date().toISOString() })
  })

  // API 路由
  const peersRoutes = createPeersRoutes(processManager)
  app.route('/api/peers', peersRoutes)
  app.route('/api/messages', messagesRoutes)
  app.route('/api/config', configRoutes)
  app.route('/api/context', contextRoutes)

  // 静态文件服务 - 仅在 WebUI 存在时启用
  app.get('*', async (c) => {
    const path = c.req.path

    // 跳过 API 和 WebSocket 路径
    if (path.startsWith('/api') || path.startsWith('/ws')) {
      return c.json({ error: 'Not Found', path }, 404)
    }

    try {
      // 确定要服务的文件
      let filePath = join(webuiDir, path === '/' ? 'index.html' : path)

      // 检查文件是否存在
      try {
        const fileStat = await stat(filePath)
        if (fileStat.isDirectory()) {
          filePath = join(filePath, 'index.html')
        }
      } catch {
        // 文件不存在，返回 index.html (SPA fallback)
        filePath = join(webuiDir, 'index.html')
      }

      const content = await readFile(filePath)
      const ext = extname(filePath)
      const contentType = MIME_TYPES[ext] || 'application/octet-stream'

      return c.body(content, 200, {
        'Content-Type': contentType,
        'Cache-Control': ext === '.html' ? 'no-cache' : 'max-age=31536000',
      })
    } catch {
      // WebUI 不存在
      return c.json(
        {
          error: 'WebUI not found',
          hint: 'Run: pnpm --filter webui build',
        },
        404
      )
    }
  })

  // 错误处理
  app.onError((err, c) => {
    console.error('[API Error]', err)
    return c.json(
      {
        error: err.message,
        stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
      },
      500
    )
  })

  return app
}
