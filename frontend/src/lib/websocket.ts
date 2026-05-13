import type { WsMessage } from "@/types";

const WS_BASE = process.env.NEXT_PUBLIC_WS_URL ?? "ws://localhost:8000";

type Handler = (msg: WsMessage) => void;

class TrolleyWebSocket {
  private ws:          WebSocket | null = null;
  private token:       string | null    = null;
  private handlers:    Set<Handler>     = new Set();
  private reconnectMs: number           = 2000;
  private shouldRun:   boolean          = false;

  connect(token: string): void {
    this.token     = token;
    this.shouldRun = true;
    this._open();
  }

  private _open(): void {
    if (!this.token) return;
    const url = `${WS_BASE}/ws/session/${this.token}`;
    this.ws = new WebSocket(url);

    this.ws.onopen = () => {
      this.reconnectMs = 2000;
      console.info("[WS] connected:", this.token);
    };

    this.ws.onmessage = (e) => {
      try {
        const msg = JSON.parse(e.data) as WsMessage;
        this.handlers.forEach((h) => h(msg));
      } catch {
        // ignore malformed frames
      }
    };

    this.ws.onclose = () => {
      if (this.shouldRun) {
        console.info("[WS] disconnected — reconnecting in", this.reconnectMs, "ms");
        setTimeout(() => this._open(), this.reconnectMs);
        this.reconnectMs = Math.min(this.reconnectMs * 2, 30_000);
      }
    };

    this.ws.onerror = (e) => console.warn("[WS] error", e);
  }

  send(type: string, data: Record<string, unknown>): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ type, data }));
    }
  }

  subscribe(handler: Handler): () => void {
    this.handlers.add(handler);
    return () => this.handlers.delete(handler);
  }

  disconnect(): void {
    this.shouldRun = false;
    this.ws?.close();
    this.ws    = null;
    this.token = null;
  }

  get isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }
}

export const trolleyWs = new TrolleyWebSocket();
