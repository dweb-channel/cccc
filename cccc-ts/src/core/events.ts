/**
 * CCCC Event Bus
 * 事件发射器 - 用于编排器事件广播
 */
import { EventEmitter } from 'node:events'
import type { OrchestratorEventType } from '../shared/types'

export interface CcccEvent<T = unknown> {
  type: OrchestratorEventType
  timestamp: string
  data: T
}

/**
 * 全局事件总线
 * 用于在模块间广播事件
 */
class EventBus extends EventEmitter {
  /**
   * 发射 CCCC 事件
   */
  emitEvent<T = unknown>(type: OrchestratorEventType, data: T): void {
    const event: CcccEvent<T> = {
      type,
      timestamp: new Date().toISOString(),
      data,
    }
    this.emit('cccc:event', event)
    this.emit(`cccc:${type}`, event)
  }

  /**
   * 监听所有 CCCC 事件
   */
  onEvent(listener: (event: CcccEvent) => void): void {
    this.on('cccc:event', listener)
  }

  /**
   * 移除事件监听器
   */
  offEvent(listener: (event: CcccEvent) => void): void {
    this.off('cccc:event', listener)
  }
}

// 单例导出
export const eventBus = new EventBus()

// 便捷函数
export function emitPeerStart(peerId: string, actor: string): void {
  eventBus.emitEvent('peer:start', { peerId, actor })
}

export function emitPeerStop(peerId: string): void {
  eventBus.emitEvent('peer:stop', { peerId })
}

export function emitPeerStatus(
  peerId: string,
  status: string,
  details?: Record<string, unknown>
): void {
  eventBus.emitEvent('peer:status', { peerId, status, ...details })
}

export function emitPeerOutput(peerId: string, line: string): void {
  eventBus.emitEvent('peer:output', { peerId, line })
}

export function emitMessage(
  from: string,
  to: string,
  content: string,
  messageId: string
): void {
  eventBus.emitEvent('message:new', { from, to, content, messageId })
}

export function emitMessageDelivered(messageId: string, to: string): void {
  eventBus.emitEvent('message:delivered', { messageId, to })
}

export function emitTaskUpdate(
  taskId: string,
  status: string,
  stepId?: string
): void {
  eventBus.emitEvent('task:update', { taskId, status, stepId })
}

export function emitHandoffStart(from: string, to: string): void {
  eventBus.emitEvent('handoff:start', { from, to })
}

export function emitHandoffComplete(from: string, to: string): void {
  eventBus.emitEvent('handoff:complete', { from, to })
}
