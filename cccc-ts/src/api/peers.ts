/**
 * Peers API Routes
 * Peer 状态查询和控制
 */
import { Hono } from 'hono'
import type { ApiContext } from './index'
import type { ProcessManager } from '../orchestrator/process/manager'

/**
 * 创建 Peers 路由
 */
export function createPeersRoutes(processManager?: ProcessManager): Hono<ApiContext> {
  const app = new Hono<ApiContext>()

  /**
   * GET /api/peers
   * 获取所有 Peer 状态
   */
  app.get('/', (c) => {
    if (!processManager) {
      return c.json({
        peers: [],
        count: 0,
        warning: 'ProcessManager not available',
      })
    }

    const peers = processManager.getAllPeerRuntimes()
    return c.json({
      peers,
      count: peers.length,
    })
  })

  /**
   * GET /api/peers/:id
   * 获取单个 Peer 状态
   */
  app.get('/:id', (c) => {
    const id = c.req.param('id')

    if (!processManager) {
      return c.json({ error: 'ProcessManager not available' }, 503)
    }

    const peer = processManager.getPeerRuntime(id)
    if (!peer) {
      return c.json({ error: 'Peer not found', id }, 404)
    }

    return c.json(peer)
  })

  /**
   * GET /api/peers/:id/output
   * 获取 Peer 输出（最近 N 行）
   */
  app.get('/:id/output', (c) => {
    const id = c.req.param('id')
    const lines = parseInt(c.req.query('lines') ?? '100', 10)

    if (!processManager) {
      return c.json({ error: 'ProcessManager not available' }, 503)
    }

    const peer = processManager.getPeer(id)
    if (!peer) {
      return c.json({ error: 'Peer not found', id }, 404)
    }

    const output = peer.getOutput()
    const slicedOutput = output.slice(-lines)

    return c.json({
      peer_id: id,
      lines: slicedOutput,
      total: output.length,
      requested: lines,
    })
  })

  /**
   * POST /api/peers/:id/send
   * 向 Peer 发送消息
   */
  app.post('/:id/send', async (c) => {
    const id = c.req.param('id')
    const body = await c.req.json<{ message: string }>()

    if (!processManager) {
      return c.json({ error: 'ProcessManager not available' }, 503)
    }

    if (!body.message) {
      return c.json({ error: 'Message is required' }, 400)
    }

    const success = processManager.sendToPeer(id, body.message)
    if (!success) {
      return c.json({ error: 'Failed to send message', id }, 500)
    }

    return c.json({
      success: true,
      peer_id: id,
      message_length: body.message.length,
    })
  })

  /**
   * POST /api/peers/:id/restart
   * 重启 Peer
   */
  app.post('/:id/restart', async (c) => {
    const id = c.req.param('id')

    if (!processManager) {
      return c.json({ error: 'ProcessManager not available' }, 503)
    }

    const peer = processManager.getPeer(id)
    if (!peer) {
      return c.json({ error: 'Peer not found', id }, 404)
    }

    try {
      await processManager.restartPeer(id)
      return c.json({
        success: true,
        peer_id: id,
        action: 'restart',
      })
    } catch (error) {
      return c.json(
        {
          error: 'Failed to restart peer',
          message: error instanceof Error ? error.message : 'Unknown error',
        },
        500
      )
    }
  })

  return app
}
