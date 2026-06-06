/**
 * WebSocket 客户端服务
 * 封装连接管理、自动重连、消息分发
 */
type MessageHandler = (data: any) => void;

class WsService {
  private ws: WebSocket | null = null;
  private url: string = '';
  private handlers: Map<string, Set<MessageHandler>> = new Map();
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private reconnectAttempts = 0;

  connect(token: string, baseUrl?: string): void {
    const host = baseUrl || `ws://${window.location.host}`;
    this.url = `${host}/ws?token=${token}`;
    this.doConnect();
  }

  private doConnect(): void {
    if (this.ws) return;

    try {
      this.ws = new WebSocket(this.url);
    } catch {
      this.scheduleReconnect();
      return;
    }

    this.ws.onopen = () => {
      this.reconnectAttempts = 0;
      this.emit('connected', {});
    };

    this.ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        this.emit(msg.type || 'message', msg);
      } catch {}
    };

    this.ws.onclose = (event) => {
      this.ws = null;
      // 4001 = invalid/missing token — don't retry
      if (event.code === 4001) return;
      this.scheduleReconnect();
    };

    this.ws.onerror = () => {
      this.ws?.close();
    };
  }

  private scheduleReconnect(): void {
    if (this.reconnectTimer) return;
    this.reconnectAttempts++;
    const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000);
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.doConnect();
    }, delay);
  }

  send(data: any): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(data));
    }
  }

  on(type: string, handler: MessageHandler): () => void {
    if (!this.handlers.has(type)) this.handlers.set(type, new Set());
    this.handlers.get(type)!.add(handler);
    return () => this.handlers.get(type)?.delete(handler);
  }

  private emit(type: string, data: any): void {
    this.handlers.get(type)?.forEach(h => h(data));
    this.handlers.get('*')?.forEach(h => h(data));
  }

  disconnect(): void {
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    this.ws?.close();
    this.ws = null;
  }

  get isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }
}

export const wsService = new WsService();
