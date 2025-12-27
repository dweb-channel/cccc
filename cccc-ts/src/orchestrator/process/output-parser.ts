/**
 * Output Parser
 * 解析 Peer 输出，检测空闲状态，处理 ANSI 转义序列
 */

/** ANSI 转义序列正则 */
const ANSI_REGEX = /\x1b\[[0-9;]*[a-zA-Z]/g

/** 常见提示符模式 */
const PROMPT_PATTERNS = [
  /^\$ $/m,              // bash prompt
  /^> $/m,               // node/python REPL
  /^>>> $/m,             // python prompt
  /^In \[\d+\]: $/m,     // IPython
  /^claude> $/m,         // Claude CLI
  /^codex> $/m,          // Codex CLI
]

/** 空闲检测配置 */
export interface IdleDetectorConfig {
  /** 无输出超时时间（毫秒） */
  timeout: number
  /** 是否检测提示符 */
  detectPrompt: boolean
}

const DEFAULT_IDLE_CONFIG: IdleDetectorConfig = {
  timeout: 5000,
  detectPrompt: true,
}

/**
 * 移除 ANSI 转义序列
 */
export function stripAnsi(text: string): string {
  return text.replace(ANSI_REGEX, '')
}

/**
 * 检测是否为提示符行
 */
export function isPromptLine(line: string): boolean {
  const stripped = stripAnsi(line).trim()
  return PROMPT_PATTERNS.some((pattern) => pattern.test(stripped))
}

/**
 * 空闲状态检测器
 */
export class IdleDetector {
  private lastOutputTime = 0
  private lastOutput = ''
  private config: IdleDetectorConfig

  constructor(config: Partial<IdleDetectorConfig> = {}) {
    this.config = { ...DEFAULT_IDLE_CONFIG, ...config }
  }

  /**
   * 记录输出
   */
  recordOutput(data: string): void {
    this.lastOutputTime = Date.now()
    this.lastOutput = data
  }

  /**
   * 检测是否空闲
   */
  isIdle(): boolean {
    // 检测超时
    if (Date.now() - this.lastOutputTime > this.config.timeout) {
      return true
    }

    // 检测提示符
    if (this.config.detectPrompt && this.lastOutput) {
      const lines = this.lastOutput.split('\n')
      const lastLine = lines[lines.length - 1] || lines[lines.length - 2] || ''
      if (isPromptLine(lastLine)) {
        return true
      }
    }

    return false
  }

  /**
   * 获取自上次输出的时间（毫秒）
   */
  getTimeSinceLastOutput(): number {
    if (this.lastOutputTime === 0) return Infinity
    return Date.now() - this.lastOutputTime
  }

  /**
   * 重置状态
   */
  reset(): void {
    this.lastOutputTime = 0
    this.lastOutput = ''
  }
}

/**
 * 输出解析器
 */
export class OutputParser {
  private buffer = ''

  /**
   * 追加输出并返回完整行
   */
  append(data: string): string[] {
    this.buffer += data
    const lines = this.buffer.split('\n')

    // 保留最后一个不完整的行
    this.buffer = lines.pop() || ''

    return lines
  }

  /**
   * 获取缓冲区内容
   */
  getBuffer(): string {
    return this.buffer
  }

  /**
   * 清空缓冲区
   */
  clear(): void {
    this.buffer = ''
  }

  /**
   * 提取结构化数据（如 Evidence, Progress 等）
   */
  extractStructuredData(line: string): { type: string; content: string } | null {
    const stripped = stripAnsi(line)

    // 匹配 Item(label): content
    const itemMatch = stripped.match(/^Item\(([^)]+)\):\s*(.+)$/)
    if (itemMatch) {
      return { type: 'item', content: `${itemMatch[1]}: ${itemMatch[2]}` }
    }

    // 匹配 Evidence(...): content
    const evidenceMatch = stripped.match(/^Evidence\([^)]*\):\s*(.+)$/)
    if (evidenceMatch) {
      return { type: 'evidence', content: evidenceMatch[1] }
    }

    // 匹配 Progress: content
    const progressMatch = stripped.match(/^Progress:\s*(.+)$/)
    if (progressMatch) {
      return { type: 'progress', content: progressMatch[1] }
    }

    // 匹配 Next: content
    const nextMatch = stripped.match(/^Next:\s*(.+)$/)
    if (nextMatch) {
      return { type: 'next', content: nextMatch[1] }
    }

    return null
  }
}
