'use client';

import React, {createContext, useCallback, useContext, useEffect, useRef, useState} from 'react';
import {Client, IMessage} from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import {useAuth} from '../hooks/useAuth';
import {createLogger} from '../utils/logger';
import {apiConfig} from '../config';

const log = createLogger('WebSocket');

// Define the notification type
export interface Notification {
  type: string;
  title: string;
  message: string;
  payload?: unknown;
  metadata?: Record<string, unknown>;
  timestamp?: number;
  read: boolean;
  actionUrl?: string;
  priority?: 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';
}

interface WebSocketContextType {
  isConnected: boolean;
  notifications: Notification[];
  unreadCount: number;
  markAsRead: (index: number) => void;
  markAllAsRead: () => void;
  clearNotifications: () => void;
  onApprovalTaskAssigned?: (callback: (notification: Notification) => void) => void;
  offApprovalTaskAssigned?: (callback: (notification: Notification) => void) => void;
}

const WebSocketContext = createContext<WebSocketContextType | null>(null);

export const WebSocketProvider = ({children}: { children: React.ReactNode }) => {
  const {user, isAuthenticated} = useAuth();
  const [isConnected, setIsConnected] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const stompClientRef = useRef<Client | null>(null);
  const approvalCallbacksRef = useRef<Set<(notification: Notification) => void>>(new Set());
  const connectionAttemptsRef = useRef(0);
  const lastErrorLogTimeRef = useRef<number>(0);
  const MAX_RECONNECTION_ATTEMPTS = 5;
  const ERROR_LOG_THROTTLE_MS = 5000; // Suppress error logs for 5 seconds

  useEffect(() => {
    // Only connect if authenticated — use user.id (matches backend userId) not employeeId
    if (!isAuthenticated || !user?.id) {
      if (stompClientRef.current?.active) {
        stompClientRef.current.deactivate();
      }
      connectionAttemptsRef.current = 0;
      return;
    }

    // Skip if too many failed connection attempts
    if (connectionAttemptsRef.current >= MAX_RECONNECTION_ATTEMPTS) {
      log.warn('Max WebSocket reconnection attempts reached, stopping reconnection loop');
      return;
    }

    // Initialize STOMP client
    const wsBaseUrl = apiConfig.baseUrl.replace('/api/v1', '');
    const client = new Client({
      webSocketFactory: () => new SockJS(`${wsBaseUrl}/ws`),
      reconnectDelay: 5000,
      heartbeatIncoming: 4000,
      heartbeatOutgoing: 4000,
      // Suppress STOMP debug output in production; only show in development if needed
      debug: (str) => {
        if (process.env.NODE_ENV === 'development' && str.includes('error')) {
          log.debug('STOMP:', str);
        }
      },
    });

    client.onConnect = (_frame) => {
      connectionAttemptsRef.current = 0; // Reset on successful connection
      setIsConnected(true);
      log.info('WebSocket connected successfully');

      // Subscribe to tenant-scoped broadcasts (matches backend broadcast path)
      if (user.tenantId) {
        client.subscribe(`/topic/tenant/${user.tenantId}/notifications`, (message: IMessage) => {
          handleIncomingMessage(message);
        });
      }

      // Subscribe to user-specific notifications (matches backend sendToUser path)
      client.subscribe(`/topic/user/${user.id}/notifications`, (message: IMessage) => {
        handleIncomingMessage(message);
      });

      // Subscribe to approval-specific notifications
      client.subscribe(`/topic/user/${user.id}/approvals`, (message: IMessage) => {
        const notification = handleIncomingMessage(message);
        // Trigger approval-specific callbacks
        if (notification && notification.type === 'TASK_ASSIGNED') {
          approvalCallbacksRef.current.forEach(callback => {
            try {
              callback(notification);
            } catch (error) {
              log.error('Error executing approval callback:', error);
            }
          });
        }
      });
    };

    client.onStompError = (frame) => {
      connectionAttemptsRef.current += 1;
      // Throttle error logging to prevent console flooding
      const now = Date.now();
      if (now - lastErrorLogTimeRef.current > ERROR_LOG_THROTTLE_MS) {
        log.error(`WebSocket error (attempt ${connectionAttemptsRef.current}/${MAX_RECONNECTION_ATTEMPTS}):`, frame.headers['message']);
        lastErrorLogTimeRef.current = now;
      }

      // Stop retrying after max attempts
      if (connectionAttemptsRef.current >= MAX_RECONNECTION_ATTEMPTS) {
        log.warn('Max WebSocket reconnection attempts exceeded, giving up');
        client.deactivate();
      }
    };

    client.onDisconnect = () => {
      setIsConnected(false);
      connectionAttemptsRef.current += 1;
      // Only log disconnection if in development (suppress in production)
      if (process.env.NODE_ENV === 'development') {
        const now = Date.now();
        if (now - lastErrorLogTimeRef.current > ERROR_LOG_THROTTLE_MS) {
          log.warn(`WebSocket disconnected (attempt ${connectionAttemptsRef.current}/${MAX_RECONNECTION_ATTEMPTS})`);
          lastErrorLogTimeRef.current = now;
        }
      }
    };

    client.activate();
    stompClientRef.current = client;

    return () => {
      if (client.active) {
        client.deactivate();
      }
    };
  }, [isAuthenticated, user?.id, user?.tenantId]);

  const handleIncomingMessage = (message: IMessage): Notification | null => {
    try {
      const body = JSON.parse(message.body);
      const newNotification: Notification = {
        ...body,
        read: false,
        timestamp: body.timestamp ? new Date(body.timestamp).getTime() : Date.now(),
      };

      setNotifications((prev) => [newNotification, ...prev]);

      log.debug('Received notification:', newNotification.type, newNotification.title);

      // Dispatch event for React Query cache invalidation
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('notification-received', {detail: newNotification}));
      }

      // Show browser notification when tab is not focused
      if (typeof document !== 'undefined' && document.hidden && typeof Notification !== 'undefined' && Notification.permission === 'granted') {
        new Notification(newNotification.title, {body: newNotification.message});
      }

      return newNotification;
    } catch (e) {
      log.error('Failed to parse notification', e);
      return null;
    }
  };

  const markAsRead = (index: number) => {
    setNotifications((prev) => {
      const updated = [...prev];
      if (updated[index]) {
        updated[index].read = true;
      }
      return updated;
    });
  };

  const markAllAsRead = () => {
    setNotifications((prev) => prev.map((n) => ({...n, read: true})));
  };

  const clearNotifications = () => {
    setNotifications([]);
  };

  const onApprovalTaskAssigned = useCallback((callback: (notification: Notification) => void) => {
    approvalCallbacksRef.current.add(callback);
  }, []);

  const offApprovalTaskAssigned = useCallback((callback: (notification: Notification) => void) => {
    approvalCallbacksRef.current.delete(callback);
  }, []);

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <WebSocketContext.Provider
      value={{
        isConnected,
        notifications,
        unreadCount,
        markAsRead,
        markAllAsRead,
        clearNotifications,
        onApprovalTaskAssigned,
        offApprovalTaskAssigned,
      }}
    >
      {children}
    </WebSocketContext.Provider>
  );
};

export const useWebSocket = () => {
  const context = useContext(WebSocketContext);
  if (!context) {
    throw new Error('useWebSocket must be used within a WebSocketProvider');
  }
  return context;
};
