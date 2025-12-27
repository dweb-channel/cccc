/**
 * Process Manager
 * 管理多个 Peer 进程的生命周期
 */
import { EventEmitter } from 'node:events'
import { PeerProcess, type PeerProcessConfig } from './peer-process'
import type { Actor, PeerStatus, PeerRuntime } from '../../shared/types'

export interface ProcessManagerEvents {
  'peer:start': [peerId: string]
  'peer:stop': [peerId: string, code: number | null]
  'peer:output': [peerId: string, data: string]
  'peer:status': [peerId: string, status: PeerStatus]
  'peer:error': [peerId: string, error: Error]
}

export interface ProcessManagerConfig {
  projectRoot: string
  actors: Record<string, Actor>
}

/**
 * 进程管理器
 */
export class ProcessManager extends EventEmitter<ProcessManagerEvents> {
  private peers = new Map<string, PeerProcess>()
  private config: ProcessManagerConfig

  constructor(config: ProcessManagerConfig) {
    super()
    this.config = config
  }

  /**
   * 启动 Peer 进程
   */
  async startPeer(peerId: string, actorName: string): Promise<PeerProcess> {
    if (this.peers.has(peerId)) {
      throw new Error(`Peer ${peerId} is already registered`)
    }

    const actor = this.config.actors[actorName]
    if (!actor) {
      throw new Error(`Actor ${actorName} not found`)
    }

    const processConfig: PeerProcessConfig = {
      id: peerId,
      actor,
      cwd: this.config.projectRoot,
    }

    const peer = new PeerProcess(processConfig)

    // 转发事件
    peer.on('output', (data) => {
      this.emit('peer:output', peerId, data)
    })

    peer.on('status', (status) => {
      this.emit('peer:status', peerId, status)
    })

    peer.on('exit', (code) => {
      this.emit('peer:stop', peerId, code)
    })

    peer.on('error', (error) => {
      this.emit('peer:error', peerId, error)
    })

    this.peers.set(peerId, peer)
    await peer.start()
    this.emit('peer:start', peerId)

    return peer
  }

  /**
   * 停止 Peer 进程
   */
  async stopPeer(peerId: string): Promise<void> {
    const peer = this.peers.get(peerId)
    if (!peer) return

    await peer.stop()
  }

  /**
   * 重启 Peer 进程
   */
  async restartPeer(peerId: string): Promise<PeerProcess | null> {
    const peer = this.peers.get(peerId)
    if (!peer) return null

    const actorName = peer.actor.name
    await this.stopPeer(peerId)
    this.peers.delete(peerId)

    return this.startPeer(peerId, actorName)
  }

  /**
   * 停止所有 Peer 进程
   */
  async stopAll(): Promise<void> {
    const promises = Array.from(this.peers.keys()).map((id) => this.stopPeer(id))
    await Promise.all(promises)
  }

  /**
   * 获取 Peer 进程
   */
  getPeer(peerId: string): PeerProcess | undefined {
    return this.peers.get(peerId)
  }

  /**
   * 获取所有 Peer ID
   */
  getPeerIds(): string[] {
    return Array.from(this.peers.keys())
  }

  /**
   * 发送消息到 Peer
   */
  sendToPeer(peerId: string, message: string): boolean {
    const peer = this.peers.get(peerId)
    if (!peer?.isRunning) return false

    peer.send(message)
    return true
  }

  /**
   * 获取 Peer 运行时状态
   */
  getPeerRuntime(peerId: string): PeerRuntime | null {
    const peer = this.peers.get(peerId)
    if (!peer) return null

    return {
      id: peerId,
      actor: peer.actor,
      status: peer.status,
      pid: peer.pid,
      started_at: peer.getUptime() > 0 ? new Date(Date.now() - peer.getUptime()).toISOString() : undefined,
      last_activity: undefined, // TODO: track last activity
      output_lines: peer.getOutput().length,
    }
  }

  /**
   * 获取所有 Peer 运行时状态
   */
  getAllPeerRuntimes(): PeerRuntime[] {
    return this.getPeerIds()
      .map((id) => this.getPeerRuntime(id))
      .filter((r): r is PeerRuntime => r !== null)
  }
}
