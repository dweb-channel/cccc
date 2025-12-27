/**
 * Messages API Routes
 * 消息操作（邮箱读写）
 */
import { Hono } from 'hono'
import type { ApiContext } from './index'
import {
  resolveMailboxPaths,
  listInboxMessages,
  readMessage,
  writeInboxMessage,
} from '../core/mailbox'
import type { Message, MessageTarget } from '../shared/types'

export const messagesRoutes = new Hono<ApiContext>()

/**
 * GET /api/messages
 * 获取消息列表（支持筛选）
 */
messagesRoutes.get('/', (c) => {
  const projectRoot = c.get('projectRoot')
  const peer = c.req.query('peer') ?? 'peerA'
  const limit = parseInt(c.req.query('limit') ?? '50', 10)
  const offset = parseInt(c.req.query('offset') ?? '0', 10)

  try {
    const paths = resolveMailboxPaths(projectRoot, peer)
    const messages = listInboxMessages(paths)
    const paginated = messages.slice(offset, offset + limit)

    return c.json({
      peer,
      messages: paginated,
      total: messages.length,
      limit,
      offset,
    })
  } catch (error) {
    return c.json(
      { error: 'Failed to list messages', detail: String(error) },
      500
    )
  }
})

/**
 * GET /api/messages/:id
 * 获取单条消息内容
 */
messagesRoutes.get('/:id', (c) => {
  const projectRoot = c.get('projectRoot')
  const id = c.req.param('id')
  const peer = c.req.query('peer') ?? 'peerA'

  try {
    const paths = resolveMailboxPaths(projectRoot, peer)
    const content = readMessage(paths, id)

    if (!content) {
      return c.json({ error: 'Message not found', id }, 404)
    }

    return c.json({
      id,
      peer,
      content,
    })
  } catch (error) {
    return c.json(
      { error: 'Failed to read message', detail: String(error) },
      500
    )
  }
})

/**
 * POST /api/messages
 * 发送新消息到邮箱
 */
messagesRoutes.post('/', async (c) => {
  const projectRoot = c.get('projectRoot')
  const body = await c.req.json<{
    to: MessageTarget
    content: string
    from?: string
  }>()

  if (!body.to || !body.content) {
    return c.json({ error: 'to and content are required' }, 400)
  }

  const from = body.from ?? 'user'
  const results: Array<{ peer: string; messageId: string; filename: string }> = []

  try {
    // 根据目标写入相应 peer 的 inbox
    if (body.to === 'both') {
      // 广播到所有 peer
      for (const peer of ['peerA', 'peerB']) {
        const { messageId, filename } = writeInboxMessage(projectRoot, peer, body.content, from)
        results.push({ peer, messageId, filename })
      }
    } else if (body.to === 'user') {
      // 用户消息暂不写入邮箱（由前端直接显示）
      return c.json({
        success: true,
        to: body.to,
        message_id: `user-${Date.now()}`,
        queued: false,
        note: 'User messages are displayed directly',
      })
    } else {
      // 单个 peer
      const { messageId, filename } = writeInboxMessage(projectRoot, body.to, body.content, from)
      results.push({ peer: body.to, messageId, filename })
    }

    return c.json({
      success: true,
      to: body.to,
      results,
      queued: true,
    })
  } catch (error) {
    return c.json(
      { error: 'Failed to write message', detail: String(error) },
      500
    )
  }
})

/**
 * POST /api/messages/broadcast
 * 广播消息到所有 Peer
 */
messagesRoutes.post('/broadcast', async (c) => {
  const body = await c.req.json<{ content: string; from?: string }>()

  if (!body.content) {
    return c.json({ error: 'content is required' }, 400)
  }

  // TODO: 广播到所有活跃 Peer
  return c.json({
    success: true,
    targets: ['peerA', 'peerB'],
    message_length: body.content.length,
  })
})

/**
 * DELETE /api/messages/:id
 * 删除/归档消息
 */
messagesRoutes.delete('/:id', (c) => {
  const id = c.req.param('id')
  const peer = c.req.query('peer') ?? 'peerA'

  // TODO: 移动到 processed 目录
  return c.json({
    success: true,
    id,
    peer,
    action: 'archived',
  })
})
