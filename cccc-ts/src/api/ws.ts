/**
 * CCCC WebSocket Server
 * WebSocket 连接管理与事件广播
 */
import { WebSocketServer, type WebSocket as WsWebSocket } from 'ws'
import type { Server as HttpServer } from 'node:http'
import { eventBus, type CcccEvent } from '../core/events'

interface WsClient {
  id: string
  ws: WsWebSocket
  subscriptions: Set<string>
  connectedAt: string
}

/**
 * WebSocket 管理器
 */
export class WsManager {
  private wss: WebSocketServer | null = null
  private clients: Map<string, WsClient> = new Map()
  private clientIdCounter = 0

  /**
   * 初始化 WebSocket 服务器
   * @param server HTTP 服务器实例
   */
  init(server: HttpServer): void {
    this.wss = new WebSocketServer({ server, path: '/ws' })

    this.wss.on('connection', (ws) => {
      const clientId = `ws-${++this.clientIdCounter}`
      const client: WsClient = {
        id: clientId,
        ws,
        subscriptions: new Set(['*']), // 默认订阅所有事件
        connectedAt: new Date().toISOString(),
      }
      this.clients.set(clientId, client)

      console.log(`[WS] Client connected: ${clientId}`)

      // 发送欢迎消息
      this.sendToClient(client, {
        type: 'connected',
        clientId,
        timestamp: new Date().toISOString(),
      })

      // 处理客户端消息
      ws.on('message', (data) => {
        try {
          const message = JSON.parse(data.toString())
          this.handleClientMessage(client, message)
        } catch (err) {
          console.error('[WS] Failed to parse message:', err)
        }
      })

      // 处理断开连接
      ws.on('close', () => {
        console.log(`[WS] Client disconnected: ${clientId}`)
        this.clients.delete(clientId)
      })

      // 处理错误
      ws.on('error', (err) => {
        console.error(`[WS] Client error (${clientId}):`, err)
        this.clients.delete(clientId)
      })
    })

    // 监听事件总线，广播到所有客户端
    eventBus.onEvent((event) => {
      this.broadcast(event)
    })

    console.log('[WS] WebSocket server initialized on /ws')
  }

  /**
   * 处理客户端消息
   */
  private handleClientMessage(
    client: WsClient,
    message: { type: string; [key: string]: unknown }
  ): void {
    switch (message.type) {
      case 'subscribe':
        // 订阅特定事件类型
        if (Array.isArray(message.events)) {
          for (const event of message.events) {
            client.subscriptions.add(event as string)
          }
        }
        break

      case 'unsubscribe':
        // 取消订阅
        if (Array.isArray(message.events)) {
          for (const event of message.events) {
            client.subscriptions.delete(event as string)
          }
        }
        break

      case 'ping':
        // 心跳响应
        this.sendToClient(client, {
          type: 'pong',
          timestamp: new Date().toISOString(),
        })
        break

      default:
        console.log(`[WS] Unknown message type: ${message.type}`)
    }
  }

  /**
   * 向单个客户端发送消息
   */
  private sendToClient(client: WsClient, data: unknown): void {
    if (client.ws.readyState === 1) {
      // OPEN
      client.ws.send(JSON.stringify(data))
    }
  }

  /**
   * 广播事件到所有订阅的客户端
   */
  broadcast(event: CcccEvent): void {
    for (const client of this.clients.values()) {
      // 检查订阅
      if (
        client.subscriptions.has('*') ||
        client.subscriptions.has(event.type)
      ) {
        this.sendToClient(client, {
          type: 'event',
          event,
        })
      }
    }
  }

  /**
   * 获取连接状态
   */
  getStatus(): { clientCount: number; clients: { id: string; connectedAt: string }[] } {
    return {
      clientCount: this.clients.size,
      clients: Array.from(this.clients.values()).map((c) => ({
        id: c.id,
        connectedAt: c.connectedAt,
      })),
    }
  }

  /**
   * 关闭 WebSocket 服务器
   */
  close(): void {
    if (this.wss) {
      this.wss.close()
      this.wss = null
    }
    this.clients.clear()
  }
}

// 单例导出
export const wsManager = new WsManager()
