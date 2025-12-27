/**
 * CCCC Mailbox Protocol
 * 文件系统邮箱协议实现 - inbox/outbox 读写、sentinel 标记
 */
import { readFileSync, writeFileSync, readdirSync, existsSync, mkdirSync, renameSync } from 'node:fs'
import { resolve, basename, dirname } from 'node:path'
import type { MailboxEntry, MessageTarget, Message } from '../shared/types'

/** Sentinel 标记格式 */
const SENTINEL_PREFIX = '<!-- MAILBOX:SENT v1'
const SENTINEL_REGEX = /^<!-- MAILBOX:SENT v1 ts=(\S+) eid=(\S+) sha=(\S+) route=(\S+) -->/

/** 消息文件名格式: 000001.source-timestamp-hash.txt */
const MESSAGE_FILENAME_REGEX = /^(\d{6})\.([a-z]+-\d+-[a-f0-9]+)\.txt$/i

/**
 * 生成消息 ID
 */
function generateMessageId(source: string): string {
  const ts = Date.now()
  const hash = ts.toString(16).slice(-6)
  return `${source}-${ts}-${hash}`
}

/**
 * 获取下一个序列号
 */
function getNextSequence(inboxPath: string): string {
  if (!existsSync(inboxPath)) return '000001'

  const files = readdirSync(inboxPath).filter(f => f.endsWith('.txt'))
  if (files.length === 0) return '000001'

  const maxSeq = files.reduce((max, f) => {
    const match = f.match(/^(\d{6})\./)
    if (match) {
      const seq = parseInt(match[1], 10)
      return seq > max ? seq : max
    }
    return max
  }, 0)

  return String(maxSeq + 1).padStart(6, '0')
}

/**
 * 邮箱路径解析
 */
export interface MailboxPaths {
  root: string
  inbox: string
  outbox: string
  processed: string
  toPeer: string
  toUser: string
}

/**
 * 解析邮箱路径
 */
export function resolveMailboxPaths(projectRoot: string, peerId: string): MailboxPaths {
  const mailboxRoot = resolve(projectRoot, '.cccc', 'mailbox', peerId)
  return {
    root: mailboxRoot,
    inbox: resolve(mailboxRoot, 'inbox'),
    outbox: resolve(mailboxRoot, 'outbox'),
    processed: resolve(mailboxRoot, 'processed'),
    toPeer: resolve(mailboxRoot, 'to_peer.md'),
    toUser: resolve(mailboxRoot, 'to_user.md'),
  }
}

/**
 * 确保邮箱目录存在
 */
export function ensureMailboxDirs(paths: MailboxPaths): void {
  for (const dir of [paths.inbox, paths.outbox, paths.processed]) {
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true })
    }
  }
}

/**
 * 解析消息文件名
 */
export function parseMessageFilename(filename: string): { seq: string; id: string } | null {
  const match = filename.match(MESSAGE_FILENAME_REGEX)
  if (!match) return null
  return { seq: match[1], id: match[2] }
}

/**
 * 读取 inbox 消息列表
 */
export function listInboxMessages(paths: MailboxPaths): MailboxEntry[] {
  if (!existsSync(paths.inbox)) return []

  const files = readdirSync(paths.inbox)
    .filter((f) => f.endsWith('.txt'))
    .sort() // 按文件名排序（oldest first）

  const entries: MailboxEntry[] = []
  for (const filename of files) {
    const parsed = parseMessageFilename(filename)
    if (!parsed) continue

    const filepath = resolve(paths.inbox, filename)
    const content = readFileSync(filepath, 'utf-8')
    const preview = extractPreview(content)
    const from = extractFrom(content)
    const to = extractTo(content)

    entries.push({
      id: parsed.id,
      filename,
      timestamp: extractTimestamp(content) ?? new Date().toISOString(),
      from,
      to,
      preview,
      processed: false,
    })
  }

  return entries
}

/**
 * 读取消息内容
 */
export function readMessage(paths: MailboxPaths, filename: string): string | null {
  const filepath = resolve(paths.inbox, filename)
  if (!existsSync(filepath)) return null
  return readFileSync(filepath, 'utf-8')
}

/**
 * 移动消息到 processed
 */
export function moveToProcessed(paths: MailboxPaths, filename: string): boolean {
  const src = resolve(paths.inbox, filename)
  const dst = resolve(paths.processed, filename)

  if (!existsSync(src)) return false

  ensureMailboxDirs(paths)
  renameSync(src, dst)
  return true
}

/**
 * 检查 outbox 文件是否已发送（sentinel 标记）
 */
export function isSent(filepath: string): boolean {
  if (!existsSync(filepath)) return false
  const content = readFileSync(filepath, 'utf-8')
  return content.startsWith(SENTINEL_PREFIX)
}

/**
 * 解析 sentinel 标记
 */
export function parseSentinel(content: string): {
  timestamp: string
  eventId: string
  sha: string
  route: string
} | null {
  const match = content.match(SENTINEL_REGEX)
  if (!match) return null
  return {
    timestamp: match[1],
    eventId: match[2],
    sha: match[3],
    route: match[4],
  }
}

/**
 * 写入 outbox 消息
 */
export function writeOutboxMessage(
  paths: MailboxPaths,
  target: 'peer' | 'user',
  content: string
): void {
  const filepath = target === 'peer' ? paths.toPeer : paths.toUser
  ensureMailboxDirs(paths)
  writeFileSync(filepath, content, 'utf-8')
}

/**
 * 读取 outbox 消息（如果未发送）
 */
export function readOutboxMessage(
  paths: MailboxPaths,
  target: 'peer' | 'user'
): string | null {
  const filepath = target === 'peer' ? paths.toPeer : paths.toUser
  if (!existsSync(filepath)) return null

  const content = readFileSync(filepath, 'utf-8')
  if (content.startsWith(SENTINEL_PREFIX)) return null // 已发送

  return content
}

/**
 * 写入消息到目标 Peer 的 inbox
 */
export function writeInboxMessage(
  projectRoot: string,
  targetPeer: string,
  content: string,
  from: string = 'user'
): { messageId: string; filename: string } {
  const paths = resolveMailboxPaths(projectRoot, targetPeer)
  ensureMailboxDirs(paths)

  const messageId = generateMessageId(from)
  const seq = getNextSequence(paths.inbox)
  const filename = `${seq}.${messageId}.txt`

  const timestamp = new Date().toISOString()
  const formattedContent = `<FROM_${from.toUpperCase()}>
[TS: ${timestamp}]

${content}

</FROM_${from.toUpperCase()}>`

  const filepath = resolve(paths.inbox, filename)
  writeFileSync(filepath, formattedContent, 'utf-8')

  return { messageId, filename }
}

// ============ Helper Functions ============

function extractPreview(content: string, maxLen = 80): string {
  // 跳过 wrapper 标签，提取第一行实际内容
  const lines = content.split('\n')
  for (const line of lines) {
    const trimmed = line.trim()
    if (
      trimmed &&
      !trimmed.startsWith('<') &&
      !trimmed.startsWith('[') &&
      !trimmed.startsWith('#')
    ) {
      return trimmed.slice(0, maxLen)
    }
  }
  return lines[0]?.slice(0, maxLen) ?? ''
}

function extractFrom(content: string): string {
  // 从 <FROM_XXX> 标签提取
  const match = content.match(/<FROM_(\w+)>/i)
  return match?.[1]?.toLowerCase() ?? 'unknown'
}

function extractTo(content: string): MessageTarget {
  // 从 To: 行或 <TO_PEER>/<TO_USER> 提取
  if (content.includes('<TO_PEER>')) return 'peerB'
  if (content.includes('<TO_USER>')) return 'user'
  if (content.includes('To: Both')) return 'both'
  return 'peerA'
}

function extractTimestamp(content: string): string | null {
  // 从 [TS: ...] 提取
  const match = content.match(/\[TS: ([^\]]+)\]/)
  return match?.[1] ?? null
}
