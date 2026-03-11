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

export enum WebSocketStatus {
  DISCONNECTED = 'DISCONNECTED',
  CONNECTING = 'CONNECTING',
  CONNECTED = 'CONNECTED',
  RECONNECTING = 'RECONNECTING',
  FAILED = 'FAILED',
}

interface ReconnectConfig {
  initialDelay: number; // milliseconds
  maxDelay: number; // milliseconds
  maxAttempts: number;
  backoffMultiplier: number;
}

interface ConnectionCredentials {
  userId: string;
  tenantId: string;
  token?: string;
}

class WebSocketService {
  private client: Client | null = null;
  private subscriptions: Map<string, StompSubscription> = new Map();
  private handlers: Set<NotificationHandler> = new Set();
  private reconnectAttempts = 0;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private statusChangeHandlers: Set<(status: WebSocketStatus) => void> = new Set();
  private status: WebSocketStatus = WebSocketStatus.DISCONNECTED;
  private credentials: ConnectionCredentials | null = null;
  private visibilityChangeListener: (() => void) | null = null;

  // Reconnection configuration
  private readonly reconnectConfig: ReconnectConfig = {
    initialDelay: 1000, // Start at 1 second
    maxDelay: 30000, // Max 30 seconds
    maxAttempts: 10,
    backoffMultiplier: 2,
  };

  private userId: string | null = null;
  private tenantId: string | null = null;

  /**
   * Calculate exponential backoff delay with jitter.
   */
  private calculateBackoffDelay(): number {
    const exponentialDelay = this.reconnectConfig.initialDelay *
      Math.pow(this.reconnectConfig.backoffMultiplier, this.reconnectAttempts);
    const cappedDelay = Math.min(exponentialDelay, this.reconnectConfig.maxDelay);
    // Add jitter: ±10% to prevent thundering herd
    const jitter = cappedDelay * 0.1 * (Math.random() * 2 - 1);
    return Math.max(100, cappedDelay + jitter);
  }

  /**
   * Update connection status and notify listeners.
   */
  private setStatus(status: WebSocketStatus): void {
    if (this.status !== status) {
      this.status = status;
      this.statusChangeHandlers.forEach(handler => {
        try {
          handler(status);
        } catch (error) {
          console.error('[WebSocket] Status change handler error:', error);
        }
      });
    }
  }

  /**
   * Add a status change listener.
   */
  addStatusChangeListener(handler: (status: WebSocketStatus) => void): () => void {
    this.statusChangeHandlers.add(handler);
    return () => this.statusChangeHandlers.delete(handler);
  }

  /**
   * Connect to the WebSocket server.
   */
  connect(userId: string, tenantId: string, token?: string): Promise<void> {
    if (this.client?.connected) {
      return Promise.resolve();
    }

    // If already connecting, return pending promise
    if (this.status === WebSocketStatus.CONNECTING) {
      return Promise.resolve();
    }

    this.userId = userId;
    this.tenantId = tenantId;
    this.credentials = { userId, tenantId, token };
    this.setStatus(WebSocketStatus.CONNECTING);

    return new Promise((resolve, reject) => {
      // Remove /api/v1 from the URL if present to get the base WebSocket URL
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080/api/v1';
      const baseUrl = apiUrl.replace('/api/v1', '');
      const wsUrl = `${baseUrl}/ws`;

      this.client = new Client({
        webSocketFactory: () => new SockJS(wsUrl),
        connectHeaders: token ? { Authorization: `Bearer ${token}` } : {},
        debug: (str) => {
          if (process.env.NODE_ENV === 'development') {
            console.log('[WebSocket]', str);
          }
        },
        // Disable StompJS built-in reconnect - we handle it manually
        reconnectDelay: 0,
        heartbeatIncoming: 10000,
        heartbeatOutgoing: 10000,
        onConnect: () => {
          if (process.env.NODE_ENV === 'development') {
            console.log('[WebSocket] Connected');
          }
          this.reconnectAttempts = 0;
          this.setStatus(WebSocketStatus.CONNECTED);
          this.subscribeToNotifications();
          this.attachVisibilityChangeListener();
          resolve();
        },
        onStompError: (frame) => {
          console.error('[WebSocket] STOMP error:', frame.headers['message']);
          reject(new Error(frame.headers['message']));
        },
        onWebSocketClose: () => {
          if (process.env.NODE_ENV === 'development') {
            console.log('[WebSocket] Connection closed');
          }
          this.handleDisconnect();
        },
        onWebSocketError: (error) => {
          console.error('[WebSocket] WebSocket error:', error);
        },
      });

      this.client.activate();
    });
  }

  /**
   * Handle disconnection and initiate reconnect logic.
   */
  private handleDisconnect(): void {
    if (this.status === WebSocketStatus.CONNECTED) {
      this.setStatus(WebSocketStatus.DISCONNECTED);
      this.logWarning(`Connection lost. Will attempt to reconnect.`);
    }

    // Clear any pending reconnect timer
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    // Attempt reconnection if we haven't exceeded max attempts
    if (this.reconnectAttempts < this.reconnectConfig.maxAttempts && this.credentials) {
      this.scheduleReconnect();
    } else if (this.reconnectAttempts >= this.reconnectConfig.maxAttempts) {
      this.setStatus(WebSocketStatus.FAILED);
      this.logError(
        `Max reconnection attempts (${this.reconnectConfig.maxAttempts}) exceeded. ` +
        'Real-time notifications are unavailable. Please refresh the page.'
      );
    }
  }

  /**
   * Schedule a reconnection attempt with exponential backoff.
   */
  private scheduleReconnect(): void {
    if (!this.credentials) return;

    this.reconnectAttempts++;
    const delay = this.calculateBackoffDelay();

    this.setStatus(WebSocketStatus.RECONNECTING);
    this.logInfo(
      `Reconnecting (attempt ${this.reconnectAttempts}/${this.reconnectConfig.maxAttempts}) ` +
      `in ${Math.round(delay)}ms`
    );

    // Clear any existing reconnect timer
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
    }

    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      if (this.credentials) {
        this.connect(this.credentials.userId, this.credentials.tenantId, this.credentials.token)
          .catch(error => {
            this.logError('Reconnection attempt failed:', error);
            // handleDisconnect will be called via onWebSocketClose
          });
      }
    }, delay);
  }

  /**
   * Attach visibility change listener to reconnect when tab becomes visible.
   */
  private attachVisibilityChangeListener(): void {
    if (this.visibilityChangeListener) return; // Already attached

    this.visibilityChangeListener = () => {
      if (!document.hidden && (this.status === WebSocketStatus.DISCONNECTED ||
          this.status === WebSocketStatus.FAILED)) {
        this.logInfo('Tab became visible. Attempting to reconnect.');
        this.reconnectAttempts = 0;
        this.setStatus(WebSocketStatus.DISCONNECTED);
        if (this.credentials) {
          this.connect(this.credentials.userId, this.credentials.tenantId, this.credentials.token)
            .catch(error => this.logError('Failed to reconnect on visibility change:', error));
        }
      }
    };

    document.addEventListener('visibilitychange', this.visibilityChangeListener);
  }

  /**
   * Remove visibility change listener.
   */
  private removeVisibilityChangeListener(): void {
    if (this.visibilityChangeListener) {
      document.removeEventListener('visibilitychange', this.visibilityChangeListener);
      this.visibilityChangeListener = null;
    }
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
   * Logging utilities with level-based filtering.
   */
  private logDebug(message: string, data?: unknown): void {
    if (process.env.NODE_ENV === 'development') {
      console.log(`[WebSocket Debug] ${message}`, data || '');
    }
  }

  private logInfo(message: string, data?: unknown): void {
    console.info(`[WebSocket] ${message}`, data || '');
  }

  private logWarning(message: string, data?: unknown): void {
    console.warn(`[WebSocket] ${message}`, data || '');
  }

  private logError(message: string, error?: unknown): void {
    console.error(`[WebSocket Error] ${message}`, error || '');
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
   * Get current connection status.
   */
  getStatus(): WebSocketStatus {
    return this.status;
  }

  /**
   * Disconnect from the WebSocket server.
   */
  disconnect(): void {
    // Clear reconnect timer
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    // Remove visibility change listener
    this.removeVisibilityChangeListener();

    // Clean up STOMP client
    if (this.client) {
      this.subscriptions.forEach((sub) => sub.unsubscribe());
      this.subscriptions.clear();
      this.client.deactivate();
      this.client = null;
    }

    this.handlers.clear();
    this.userId = null;
    this.tenantId = null;
    this.credentials = null;
    this.reconnectAttempts = 0;
    this.setStatus(WebSocketStatus.DISCONNECTED);

    this.logDebug('Disconnected from WebSocket');
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
