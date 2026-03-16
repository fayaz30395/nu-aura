'use client';

import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { Client, IMessage } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import { useAuth } from '../hooks/useAuth';
import { createLogger } from '../utils/logger';
import { apiConfig } from '../config';

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

export const WebSocketProvider = ({ children }: { children: React.ReactNode }) => {
    const { user, isAuthenticated } = useAuth();
    const [isConnected, setIsConnected] = useState(false);
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const stompClientRef = useRef<Client | null>(null);
    const approvalCallbacksRef = useRef<Set<(notification: Notification) => void>>(new Set());

    useEffect(() => {
        // Only connect if authenticated
        if (!isAuthenticated || !user?.employeeId) {
            if (stompClientRef.current?.active) {
                stompClientRef.current.deactivate();
            }
            return;
        }

        // Initialize STOMP client
        const wsBaseUrl = apiConfig.baseUrl.replace('/api/v1', '');
        const client = new Client({
            webSocketFactory: () => new SockJS(`${wsBaseUrl}/ws`),
            reconnectDelay: 5000,
            heartbeatIncoming: 4000,
            heartbeatOutgoing: 4000,
            debug: (str) => {
                log.debug('STOMP:', str);
            },
        });

        client.onConnect = (_frame) => {
            setIsConnected(true);

            // Subscribe to global broadcasts
            client.subscribe('/topic/broadcast', (message: IMessage) => {
                handleIncomingMessage(message);
            });

            // Subscribe to user-specific notifications
            client.subscribe(`/topic/user/${user.employeeId}`, (message: IMessage) => {
                handleIncomingMessage(message);
            });

            // Subscribe to approval-specific notifications
            client.subscribe(`/topic/user/${user.employeeId}/approvals`, (message: IMessage) => {
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
            log.error('Broker reported error:', frame.headers['message']);
            log.error('Additional details:', frame.body);
        };

        client.onDisconnect = () => {
            setIsConnected(false);
        };

        client.activate();
        stompClientRef.current = client;

        return () => {
            if (client.active) {
                client.deactivate();
            }
        };
    }, [isAuthenticated, user?.employeeId]);

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

            // Optional: Play sound or show browser notification
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
        setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
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
