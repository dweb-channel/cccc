/**
 * Peer Process Wrapper
 * 封装 Peer 进程，支持输出缓冲和事件发射
 */
import { EventEmitter } from 'node:events'
import { execa, type ResultPromise, type Options as ExecaOptions } from 'execa'
import type { Actor, PeerStatus } from '../../shared/types'

export interface PeerProcessConfig {
  id: string
  actor: Actor
  cwd: string
  env?: Record<string, string>
}

export interface PeerProcessEvents {
  output: [data: string]
  error: [error: Error]
  exit: [code: number | null]
  status: [status: PeerStatus]
}

/**
 * Peer 进程封装
 */
export class PeerProcess extends EventEmitter<PeerProcessEvents> {
  readonly id: string
  readonly actor: Actor

  private process: ResultPromise | null = null
  private outputBuffer: string[] = []
  private _status: PeerStatus = 'offline'
  private startedAt: Date | null = null

  constructor(private config: PeerProcessConfig) {
    super()
    this.id = config.id
    this.actor = config.actor
  }

  get status(): PeerStatus {
    return this._status
  }

  get pid(): number | undefined {
    return this.process?.pid
  }

  get isRunning(): boolean {
    return this.process !== null && !this.process.killed
  }

  /**
   * 启动进程
   */
  async start(): Promise<void> {
    if (this.isRunning) {
      throw new Error(`Peer ${this.id} is already running`)
    }

    const options: ExecaOptions = {
      cwd: this.config.cwd,
      env: { ...process.env, ...this.config.env, ...this.actor.env },
      stdin: 'pipe',
      stdout: 'pipe',
      stderr: 'pipe',
      buffer: false,
    }

    this.process = execa(this.actor.command, this.actor.args, options)
    this.startedAt = new Date()
    this._status = 'active'
    this.emit('status', 'active')

    // 处理 execa promise rejection（避免未处理的 rejection 崩溃进程）
    this.process.catch((error: Error) => {
      // 已经通过 exit/error 事件处理，这里只是防止未处理的 rejection
      console.log(`[${this.id}] Process exited: ${error.message}`)
    })

    // 处理输出
    this.process.stdout?.on('data', (chunk: Buffer) => {
      const data = chunk.toString()
      this.outputBuffer.push(data)
      this.emit('output', data)
    })

    this.process.stderr?.on('data', (chunk: Buffer) => {
      const data = chunk.toString()
      this.outputBuffer.push(data)
      this.emit('output', data)
    })

    // 处理退出
    this.process.on('exit', (code: number | null) => {
      this._status = 'offline'
      this.emit('status', 'offline')
      this.emit('exit', code)
      this.process = null
    })

    this.process.on('error', (error: Error) => {
      this._status = 'offline'
      this.emit('status', 'offline')
      this.emit('error', error)
    })
  }

  /**
   * 发送输入到进程
   */
  write(data: string): void {
    if (!this.process?.stdin) {
      throw new Error(`Peer ${this.id} stdin not available`)
    }
    this.process.stdin.write(data)
  }

  /**
   * 发送消息（自动添加换行）
   */
  send(message: string): void {
    this.write(message + '\n')
  }

  /**
   * 停止进程
   */
  async stop(signal: NodeJS.Signals = 'SIGTERM'): Promise<void> {
    if (!this.isRunning) return

    this.process?.kill(signal)
    this._status = 'offline'
    this.emit('status', 'offline')
  }

  /**
   * 强制终止进程
   */
  async kill(): Promise<void> {
    await this.stop('SIGKILL')
  }

  /**
   * 获取输出历史
   */
  getOutput(lines?: number): string[] {
    if (lines === undefined) return [...this.outputBuffer]
    return this.outputBuffer.slice(-lines)
  }

  /**
   * 清空输出缓冲
   */
  clearOutput(): void {
    this.outputBuffer = []
  }

  /**
   * 获取运行时长（毫秒）
   */
  getUptime(): number {
    if (!this.startedAt) return 0
    return Date.now() - this.startedAt.getTime()
  }
}
