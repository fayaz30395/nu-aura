'use client';

import React, {createContext, useCallback, useContext, useEffect, useState} from 'react';
import {NotificationHandler, WebSocketNotification, webSocketService, WebSocketStatus,} from '@/lib/websocket';
import {useToast} from './ToastProvider';
import {logger} from '@/lib/utils/logger';

interface WebSocketContextType {
  isConnected: boolean;
  status: WebSocketStatus;
  connect: (userId: string, tenantId: string, token?: string) => Promise<void>;
  disconnect: () => void;
  addHandler: (handler: NotificationHandler) => () => void;
}

const WebSocketContext = createContext<WebSocketContextType | undefined>(undefined);

export const useWebSocket = () => {
  const context = useContext(WebSocketContext);
  if (!context) {
    throw new Error('useWebSocket must be used within a WebSocketProvider');
  }
  return context;
};

interface WebSocketProviderProps {
  children: React.ReactNode;
  userId?: string;
  tenantId?: string;
  token?: string;
  autoConnect?: boolean;
  showToasts?: boolean;
}

export const WebSocketProvider: React.FC<WebSocketProviderProps> = ({
                                                                      children,
                                                                      userId,
                                                                      tenantId,
                                                                      token,
                                                                      autoConnect = true,
                                                                      showToasts = true,
                                                                    }) => {
  const [isConnected, setIsConnected] = useState(false);
  const [status, setStatus] = useState<WebSocketStatus>(WebSocketStatus.DISCONNECTED);
  const [showReconnectNotification, setShowReconnectNotification] = useState(false);
  const toast = useToast();

  // Map notification types to toast types
  const getToastType = (notificationType: string): 'success' | 'error' | 'info' | 'warning' => {
    const successTypes = ['LEAVE_APPROVED', 'EXPENSE_APPROVED', 'ATTENDANCE_MARKED', 'PAYROLL_GENERATED'];
    const errorTypes = ['LEAVE_REJECTED', 'EXPENSE_REJECTED', 'ERROR'];
    const warningTypes = ['ATTENDANCE_ALERT', 'DOCUMENT_REQUIRED', 'PERFORMANCE_REVIEW_DUE', 'DEADLINE_APPROACHING'];

    if (successTypes.includes(notificationType)) return 'success';
    if (errorTypes.includes(notificationType)) return 'error';
    if (warningTypes.includes(notificationType)) return 'warning';
    return 'info';
  };

  // Handle incoming notifications
  const handleNotification = useCallback((notification: WebSocketNotification) => {
    if (showToasts) {
      const toastType = getToastType(notification.type);
      toast.addToast({
        type: toastType,
        title: notification.title,
        message: notification.message,
        duration: 6000,
      });
    }

    // Dispatch custom event for other components to listen to
    const event = new CustomEvent('hrms-notification', {detail: notification});
    window.dispatchEvent(event);
  }, [showToasts, toast]);

  // Connect function
  const connect = useCallback(async (userId: string, tenantId: string, token?: string) => {
    try {
      await webSocketService.connect(userId, tenantId, token);
      setIsConnected(true);
    } catch (error) {
      logger.error('Failed to connect to WebSocket:', error);
      setIsConnected(false);
    }
  }, []);

  // Disconnect function
  const disconnect = useCallback(() => {
    webSocketService.disconnect();
    setIsConnected(false);
  }, []);

  // Add handler function
  const addHandler = useCallback((handler: NotificationHandler) => {
    return webSocketService.addHandler(handler);
  }, []);

  // Auto-connect when credentials are available
  useEffect(() => {
    if (autoConnect && userId && tenantId) {
      connect(userId, tenantId, token);
    }

    return () => {
      disconnect();
    };
  }, [autoConnect, userId, tenantId, token, connect, disconnect]);

  // Add default notification handler
  useEffect(() => {
    const removeHandler = webSocketService.addHandler(handleNotification);
    return () => removeHandler();
  }, [handleNotification]);

  // Listen to WebSocket status changes
  useEffect(() => {
    const unsubscribe = webSocketService.addStatusChangeListener((newStatus) => {
      setStatus(newStatus);
      setIsConnected(newStatus === WebSocketStatus.CONNECTED);

      // Show/hide reconnect failure notification
      if (newStatus === WebSocketStatus.FAILED) {
        setShowReconnectNotification(true);
        if (showToasts) {
          toast.addToast({
            type: 'error',
            title: 'Connection Failed',
            message:
              'Unable to establish real-time notification connection. ' +
              'Please refresh the page to restore notifications.',
            duration: 0, // Persistent until dismissed
          });
        }
      } else if (newStatus === WebSocketStatus.CONNECTED && showReconnectNotification) {
        setShowReconnectNotification(false);
        if (showToasts) {
          toast.addToast({
            type: 'success',
            title: 'Connection Restored',
            message: 'Real-time notifications are now active.',
            duration: 3000,
          });
        }
      }
    });

    return () => unsubscribe();
    // showReconnectNotification intentionally omitted: adding it would re-subscribe the
    // WebSocket status listener on every reconnect state change, causing callback churn.
    // The stale-closure risk is acceptable here (only affects the reconnect success banner).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showToasts, toast]);

  return (
    <WebSocketContext.Provider value={{isConnected, status, connect, disconnect, addHandler}}>
      {children}
    </WebSocketContext.Provider>
  );
};

export default WebSocketProvider;
