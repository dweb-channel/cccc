/**
 * Message Delivery
 * 消息格式化与投递到 Peer PTY
 */
import type { Message, MessageTarget } from '../shared/types'
import type { ProcessManager } from './process/manager'

/** 消息投递结果 */
export interface DeliveryResult {
  success: boolean
  target: string
  timestamp: string
  error?: string
}

/** 消息格式化选项 */
export interface FormatOptions {
  /** 包含时间戳 */
  includeTimestamp?: boolean
  /** 包含来源标签 */
  includeFrom?: boolean
  /** 最大长度（截断） */
  maxLength?: number
}

const DEFAULT_FORMAT_OPTIONS: FormatOptions = {
  includeTimestamp: true,
  includeFrom: true,
}

/**
 * 格式化消息用于投递
 */
export function formatMessage(message: Message, options: FormatOptions = {}): string {
  const opts = { ...DEFAULT_FORMAT_OPTIONS, ...options }
  const lines: string[] = []

  // 添加 wrapper 标签
  lines.push(`<FROM_${message.from.toUpperCase()}>`)

  // 添加元数据
  if (opts.includeTimestamp) {
    lines.push(`[TS: ${message.timestamp}]`)
  }

  // 添加内容
  let content = message.content
  if (opts.maxLength && content.length > opts.maxLength) {
    content = content.slice(0, opts.maxLength) + '...'
  }
  lines.push(content)

  lines.push(`</${message.from.toUpperCase()}>`)

  return lines.join('\n')
}

/**
 * 消息投递器
 */
export class MessageDelivery {
  constructor(private processManager: ProcessManager) {}

  /**
   * 投递消息到目标
   */
  async deliver(message: Message): Promise<DeliveryResult[]> {
    const targets = this.resolveTargets(message.to)
    const results: DeliveryResult[] = []

    const formatted = formatMessage(message)

    for (const target of targets) {
      const result = await this.deliverToTarget(target, formatted)
      results.push(result)
    }

    return results
  }

  /**
   * 解析目标 Peer ID
   */
  private resolveTargets(target: MessageTarget): string[] {
    switch (target) {
      case 'peerA':
        return ['peerA']
      case 'peerB':
        return ['peerB']
      case 'both':
        return ['peerA', 'peerB']
      case 'user':
        return [] // 用户消息不通过 PTY 投递
      default:
        return []
    }
  }

  /**
   * 投递到单个目标
   */
  private async deliverToTarget(peerId: string, content: string): Promise<DeliveryResult> {
    const timestamp = new Date().toISOString()

    try {
      const success = this.processManager.sendToPeer(peerId, content)
      return {
        success,
        target: peerId,
        timestamp,
        error: success ? undefined : `Peer ${peerId} not running`,
      }
    } catch (error) {
      return {
        success: false,
        target: peerId,
        timestamp,
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  }

  /**
   * 直接发送原始文本到 Peer
   */
  sendRaw(peerId: string, text: string): boolean {
    return this.processManager.sendToPeer(peerId, text)
  }

  /**
   * 发送 NUDGE 到 Peer
   */
  sendNudge(peerId: string, inboxPath: string): boolean {
    const nudge = `[NUDGE] [TS: ${new Date().toISOString()}] — Inbox: ${inboxPath}`
    return this.processManager.sendToPeer(peerId, nudge)
  }
}
