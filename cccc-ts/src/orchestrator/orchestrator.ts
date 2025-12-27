/**
 * Orchestrator Core
 * 编排引擎核心入口 - 状态机和事件循环
 */
import { EventEmitter } from 'node:events'
import { ProcessManager } from './process/manager'
import { MessageDelivery } from './delivery'
import { loadConfig, getCurrentProfile } from '../core/config'
import type { CcccConfig } from '../shared/types'
import { resolveMailboxPaths, listInboxMessages, moveToProcessed, ensureMailboxDirs } from '../core/mailbox'
import type { CliProfile, Binding, PeerStatus } from '../shared/types'
import { emitPeerStart, emitPeerStop, emitPeerOutput, emitPeerStatus } from '../core/events'

export type OrchestratorState = 'stopped' | 'starting' | 'running' | 'stopping'

export interface OrchestratorEvents {
  'state:change': [state: OrchestratorState]
  'peer:ready': [peerId: string]
  'peer:exit': [peerId: string, code: number | null]
  'message:delivered': [peerId: string, success: boolean]
  'error': [error: Error]
}

export interface OrchestratorOptions {
  projectRoot?: string
  profile?: string
}

/**
 * 编排引擎
 */
export class Orchestrator extends EventEmitter<OrchestratorEvents> {
  private _state: OrchestratorState = 'stopped'
  private config: CcccConfig
  private profile: CliProfile | null = null
  private processManager: ProcessManager
  private delivery: MessageDelivery
  private projectRoot: string
  private pollInterval: NodeJS.Timeout | null = null

  constructor(options: OrchestratorOptions = {}) {
    super()
    this.projectRoot = options.projectRoot ?? process.cwd()
    this.config = loadConfig(this.projectRoot)

    if (options.profile) {
      this.config.profile = options.profile
    }

    this.profile = getCurrentProfile(this.config)

    this.processManager = new ProcessManager({
      projectRoot: this.projectRoot,
      actors: this.config.actors,
    })

    this.delivery = new MessageDelivery(this.processManager)

    this.setupEventHandlers()
  }

  get state(): OrchestratorState {
    return this._state
  }

  /**
   * 获取 ProcessManager 实例（供 API 层使用）
   */
  getProcessManager(): ProcessManager {
    return this.processManager
  }

  private setState(state: OrchestratorState): void {
    this._state = state
    this.emit('state:change', state)
  }

  private setupEventHandlers(): void {
    this.processManager.on('peer:start', (peerId) => {
      console.log(`[Orchestrator] Peer ${peerId} started`)
      const runtime = this.processManager.getPeerRuntime(peerId)
      emitPeerStart(peerId, runtime?.actor?.name || 'unknown')
      this.emit('peer:ready', peerId)
    })

    this.processManager.on('peer:stop', (peerId, code) => {
      console.log(`[Orchestrator] Peer ${peerId} stopped with code ${code}`)
      emitPeerStop(peerId)
      this.emit('peer:exit', peerId, code)
    })

    this.processManager.on('peer:output', (peerId, data) => {
      // 广播到 eventBus，WebSocket 会转发到前端
      emitPeerOutput(peerId, data)
      process.stdout.write(`[${peerId}] ${data}`)
    })

    this.processManager.on('peer:status', (peerId, status) => {
      emitPeerStatus(peerId, status)
    })

    this.processManager.on('peer:error', (peerId, error) => {
      console.error(`[Orchestrator] Peer ${peerId} error:`, error.message)
      this.emit('error', error)
    })
  }

  /**
   * 启动编排器
   */
  async start(): Promise<void> {
    if (this._state !== 'stopped') {
      throw new Error(`Cannot start: current state is ${this._state}`)
    }

    this.setState('starting')
    console.log('[Orchestrator] Starting...')

    if (!this.profile) {
      throw new Error('No profile configured')
    }

    // 确保邮箱目录存在
    for (const binding of this.profile.bindings) {
      const paths = resolveMailboxPaths(this.projectRoot, binding.peer)
      ensureMailboxDirs(paths)
    }

    // 启动所有 Peer 进程（失败不阻塞其他 peer）
    const startResults: Array<{ peer: string; success: boolean; error?: string }> = []
    for (const binding of this.profile.bindings) {
      try {
        await this.processManager.startPeer(binding.peer, binding.actor)
        console.log(`[Orchestrator] Started peer ${binding.peer} with actor ${binding.actor}`)
        startResults.push({ peer: binding.peer, success: true })
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error)
        console.warn(`[Orchestrator] Failed to start peer ${binding.peer}: ${errorMsg}`)
        startResults.push({ peer: binding.peer, success: false, error: errorMsg })
        // 继续启动其他 peer，不抛出异常
      }
    }

    // 如果没有任何 peer 成功启动，抛出警告
    const successCount = startResults.filter(r => r.success).length
    if (successCount === 0 && startResults.length > 0) {
      console.warn('[Orchestrator] Warning: No peers started successfully')
    }

    // 启动邮箱轮询
    this.startPolling()

    this.setState('running')
    console.log('[Orchestrator] Running')
  }

  /**
   * 停止编排器
   */
  async stop(): Promise<void> {
    if (this._state !== 'running') {
      return
    }

    this.setState('stopping')
    console.log('[Orchestrator] Stopping...')

    // 停止轮询
    this.stopPolling()

    // 停止所有进程
    await this.processManager.stopAll()

    this.setState('stopped')
    console.log('[Orchestrator] Stopped')
  }

  /**
   * 发送消息到 Peer
   */
  sendToPeer(peerId: string, message: string): boolean {
    return this.processManager.sendToPeer(peerId, message)
  }

  /**
   * 获取 Peer 状态
   */
  getPeerStatus(peerId: string): PeerStatus {
    const runtime = this.processManager.getPeerRuntime(peerId)
    return runtime?.status ?? 'offline'
  }

  /**
   * 启动邮箱轮询
   */
  private startPolling(): void {
    this.pollInterval = setInterval(() => {
      this.pollMailboxes()
    }, 1000)
  }

  /**
   * 停止邮箱轮询
   */
  private stopPolling(): void {
    if (this.pollInterval) {
      clearInterval(this.pollInterval)
      this.pollInterval = null
    }
  }

  /**
   * 轮询所有邮箱
   */
  private pollMailboxes(): void {
    if (!this.profile) return

    for (const binding of this.profile.bindings) {
      const paths = resolveMailboxPaths(this.projectRoot, binding.peer)
      const messages = listInboxMessages(paths)

      if (messages.length > 0) {
        // 有新消息，发送 NUDGE
        const oldest = messages[0]
        this.delivery.sendNudge(binding.peer, paths.inbox)
        console.log(`[Orchestrator] NUDGE sent to ${binding.peer}, ${messages.length} messages pending`)
      }
    }
  }
}
