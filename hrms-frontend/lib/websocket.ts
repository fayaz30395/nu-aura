import { Client, Message, StompSubscription } from '@stomp/stompjs';
import SockJS from 'sockjs-client';

export interface WebSocketNotification {
  type: string;
  title: string;
  message: string;
  data?: Record<string, unknown>;
  timestamp: string;
}

export type NotificationHandler = (notification: WebSocketNotification) => void;

class WebSocketService {
  private client: Client | null = null;
  private subscriptions: Map<string, StompSubscription> = new Map();
  private handlers: Set<NotificationHandler> = new Set();
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 3000;
  private isConnecting = false;
  private userId: string | null = null;
  private tenantId: string | null = null;

  /**
   * Connect to the WebSocket server.
   */
  connect(userId: string, tenantId: string, token?: string): Promise<void> {
    if (this.client?.connected || this.isConnecting) {
      return Promise.resolve();
    }

    this.userId = userId;
    this.tenantId = tenantId;
    this.isConnecting = true;

    return new Promise((resolve, reject) => {
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';
      const wsUrl = `${baseUrl}/ws`;

      this.client = new Client({
        webSocketFactory: () => new SockJS(wsUrl),
        connectHeaders: token ? { Authorization: `Bearer ${token}` } : {},
        debug: (str) => {
          if (process.env.NODE_ENV === 'development') {
            console.log('[WebSocket]', str);
          }
        },
        reconnectDelay: this.reconnectDelay,
        heartbeatIncoming: 10000,
        heartbeatOutgoing: 10000,
        onConnect: () => {
          console.log('[WebSocket] Connected');
          this.isConnecting = false;
          this.reconnectAttempts = 0;
          this.subscribeToNotifications();
          resolve();
        },
        onStompError: (frame) => {
          console.error('[WebSocket] STOMP error:', frame.headers['message']);
          this.isConnecting = false;
          reject(new Error(frame.headers['message']));
        },
        onWebSocketClose: () => {
          console.log('[WebSocket] Connection closed');
          this.isConnecting = false;
          this.handleReconnect();
        },
        onWebSocketError: (error) => {
          console.error('[WebSocket] WebSocket error:', error);
          this.isConnecting = false;
        },
      });

      this.client.activate();
    });
  }

  /**
   * Subscribe to notification channels.
   */
  private subscribeToNotifications(): void {
    if (!this.client?.connected) return;

    // Subscribe to broadcast channel (all users)
    this.subscribe('/topic/broadcast', (message: Message) => {
      this.handleMessage(message);
    });

    // Subscribe to user-specific channel
    if (this.userId) {
      this.subscribe(`/topic/user/${this.userId}`, (message: Message) => {
        this.handleMessage(message);
      });
    }

    // Subscribe to tenant-specific channel
    if (this.tenantId) {
      this.subscribe(`/topic/tenant/${this.tenantId}`, (message: Message) => {
        this.handleMessage(message);
      });
    }
  }

  /**
   * Subscribe to a specific topic.
   */
  private subscribe(destination: string, callback: (message: Message) => void): void {
    if (!this.client?.connected) return;

    // Unsubscribe from existing subscription if any
    const existingSub = this.subscriptions.get(destination);
    if (existingSub) {
      existingSub.unsubscribe();
    }

    const subscription = this.client.subscribe(destination, callback);
    this.subscriptions.set(destination, subscription);
  }

  /**
   * Handle incoming message.
   */
  private handleMessage(message: Message): void {
    try {
      const notification: WebSocketNotification = JSON.parse(message.body);
      this.handlers.forEach((handler) => {
        try {
          handler(notification);
        } catch (error) {
          console.error('[WebSocket] Handler error:', error);
        }
      });
    } catch (error) {
      console.error('[WebSocket] Failed to parse message:', error);
    }
  }

  /**
   * Handle reconnection logic.
   */
  private handleReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('[WebSocket] Max reconnect attempts reached');
      return;
    }

    this.reconnectAttempts++;
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);

    console.log(`[WebSocket] Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts})`);

    setTimeout(() => {
      if (this.userId && this.tenantId) {
        this.connect(this.userId, this.tenantId).catch(console.error);
      }
    }, delay);
  }

  /**
   * Add a notification handler.
   */
  addHandler(handler: NotificationHandler): () => void {
    this.handlers.add(handler);
    return () => this.handlers.delete(handler);
  }

  /**
   * Remove a notification handler.
   */
  removeHandler(handler: NotificationHandler): void {
    this.handlers.delete(handler);
  }

  /**
   * Send a message to a destination.
   */
  send(destination: string, body: unknown): void {
    if (!this.client?.connected) {
      console.warn('[WebSocket] Not connected, cannot send message');
      return;
    }

    this.client.publish({
      destination,
      body: JSON.stringify(body),
    });
  }

  /**
   * Disconnect from the WebSocket server.
   */
  disconnect(): void {
    if (this.client) {
      this.subscriptions.forEach((sub) => sub.unsubscribe());
      this.subscriptions.clear();
      this.client.deactivate();
      this.client = null;
    }
    this.handlers.clear();
    this.userId = null;
    this.tenantId = null;
    this.reconnectAttempts = 0;
  }

  /**
   * Check if connected.
   */
  isConnected(): boolean {
    return this.client?.connected ?? false;
  }
}

// Export singleton instance
export const webSocketService = new WebSocketService();

export default webSocketService;
