/**
 * CCCC WebSocket Client
 * 实时事件接收
 */

export interface CcccEvent<T = unknown> {
  type: string;
  timestamp: string;
  data: T;
}

export type EventHandler = (event: CcccEvent) => void;

// 动态计算 WebSocket URL（与当前页面同主机端口）
function getWsUrl(): string {
  if (typeof window === 'undefined') return 'ws://localhost:3000/ws';
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  return `${protocol}//${window.location.host}/ws`;
}

class WsClient {
  private ws: WebSocket | null = null;
  private handlers: Set<EventHandler> = new Set();
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 10;
  private reconnectDelay = 1000;
  private _connected = $state(false);
  private _clientId = $state<string | null>(null);

  get connected() {
    return this._connected;
  }

  get clientId() {
    return this._clientId;
  }

  /**
   * 连接到 WebSocket 服务器
   */
  connect(): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      return;
    }

    try {
      this.ws = new WebSocket(getWsUrl());

      this.ws.onopen = () => {
        console.log('[WS] Connected');
        this._connected = true;
        this.reconnectAttempts = 0;
      };

      this.ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          this.handleMessage(message);
        } catch (err) {
          console.error('[WS] Failed to parse message:', err);
        }
      };

      this.ws.onclose = () => {
        console.log('[WS] Disconnected');
        this._connected = false;
        this._clientId = null;
        this.scheduleReconnect();
      };

      this.ws.onerror = (err) => {
        console.error('[WS] Error:', err);
      };
    } catch (err) {
      console.error('[WS] Failed to connect:', err);
      this.scheduleReconnect();
    }
  }

  /**
   * 断开连接
   */
  disconnect(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this._connected = false;
    this._clientId = null;
  }

  /**
   * 处理服务器消息
   */
  private handleMessage(message: { type: string; [key: string]: unknown }): void {
    switch (message.type) {
      case 'connected':
        this._clientId = message.clientId as string;
        break;

      case 'pong':
        // 心跳响应
        break;

      case 'event':
        // 广播事件到所有处理器
        const event = message.event as CcccEvent;
        for (const handler of this.handlers) {
          try {
            handler(event);
          } catch (err) {
            console.error('[WS] Handler error:', err);
          }
        }
        break;
    }
  }

  /**
   * 计划重连
   */
  private scheduleReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.log('[WS] Max reconnect attempts reached');
      return;
    }

    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts);
    this.reconnectAttempts++;

    console.log(`[WS] Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts})`);
    this.reconnectTimer = setTimeout(() => {
      this.connect();
    }, delay);
  }

  /**
   * 订阅事件
   */
  subscribe(events: string[]): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ type: 'subscribe', events }));
    }
  }

  /**
   * 取消订阅
   */
  unsubscribe(events: string[]): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ type: 'unsubscribe', events }));
    }
  }

  /**
   * 发送心跳
   */
  ping(): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ type: 'ping' }));
    }
  }

  /**
   * 添加事件处理器
   */
  onEvent(handler: EventHandler): () => void {
    this.handlers.add(handler);
    return () => {
      this.handlers.delete(handler);
    };
  }

  /**
   * 移除事件处理器
   */
  offEvent(handler: EventHandler): void {
    this.handlers.delete(handler);
  }
}

// 单例导出
export const wsClient = new WsClient();
