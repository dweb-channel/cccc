/**
 * CCCC API Server
 * Hono 服务入口 + WebSocket
 */
import { createServer } from 'node:http'
import { serve } from '@hono/node-server'
import { createApi } from './api'
import { wsManager } from './api/ws'
import type { Orchestrator } from './orchestrator'

export interface ServerOptions {
  projectRoot?: string
  port?: number
  host?: string
  orchestrator?: Orchestrator
}

const DEFAULT_PORT = 3000
const DEFAULT_HOST = '0.0.0.0'

/**
 * 检查端口是否可用
 */
async function findAvailablePort(startPort: number, host: string, maxRetries = 10): Promise<number> {
  for (let port = startPort; port < startPort + maxRetries; port++) {
    const available = await new Promise<boolean>((resolve) => {
      const server = createServer()
      server.once('error', () => resolve(false))
      server.once('listening', () => {
        server.close(() => resolve(true))
      })
      server.listen(port, host)
    })
    if (available) return port
    console.log(`[Server] Port ${port} in use, trying ${port + 1}...`)
  }
  throw new Error(`No available port found in range ${startPort}-${startPort + maxRetries}`)
}

/**
 * 启动 API 服务器
 */
export async function startServer(options: ServerOptions = {}): Promise<void> {
  const projectRoot = options.projectRoot ?? process.cwd()
  const requestedPort = options.port ?? DEFAULT_PORT
  const host = options.host ?? DEFAULT_HOST

  const app = createApi({
    projectRoot,
    orchestrator: options.orchestrator,
  })

  console.log(`[Server] Starting CCCC API Server...`)
  console.log(`[Server] Project root: ${projectRoot}`)

  // 找到可用端口
  const port = await findAvailablePort(requestedPort, host)

  const serverInstance = serve(
    {
      fetch: app.fetch,
      port,
      hostname: host,
      createServer,
    },
    (info) => {
      console.log(`[Server] Listening on http://${info.address}:${info.port}`)
      console.log(`[Server] Health check: http://${info.address}:${info.port}/health`)
      console.log(`[Server] API base: http://${info.address}:${info.port}/api`)
      console.log(`[Server] WebSocket: ws://${info.address}:${info.port}/ws`)
    }
  )

  // 初始化 WebSocket
  wsManager.init(serverInstance as unknown as import('node:http').Server)
}

/**
 * 导出 createApi 供测试使用
 */
export { createApi } from './api'
