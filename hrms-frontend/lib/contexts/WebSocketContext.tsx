'use client';

import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { Client, IMessage } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import { useAuth } from '../hooks/useAuth';

// Define the notification type
export interface Notification {
    type: string;
    title: string;
    message: string;
    payload: any;
    timestamp: number;
    read: boolean;
}

interface WebSocketContextType {
    isConnected: boolean;
    notifications: Notification[];
    unreadCount: number;
    markAsRead: (index: number) => void;
    markAllAsRead: () => void;
    clearNotifications: () => void;
}

const WebSocketContext = createContext<WebSocketContextType | null>(null);

export const WebSocketProvider = ({ children }: { children: React.ReactNode }) => {
    const { user, isAuthenticated } = useAuth();
    const [isConnected, setIsConnected] = useState(false);
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const stompClientRef = useRef<Client | null>(null);

    useEffect(() => {
        // Only connect if authenticated
        if (!isAuthenticated || !user?.employeeId) {
            if (stompClientRef.current?.active) {
                stompClientRef.current.deactivate();
            }
            return;
        }

        // Initialize STOMP client
        const client = new Client({
            webSocketFactory: () => new SockJS('http://localhost:8080/ws'), // Adjust URL as needed
            reconnectDelay: 5000,
            heartbeatIncoming: 4000,
            heartbeatOutgoing: 4000,
            debug: (str) => {
                // console.log('STOMP: ' + str);
            },
        });

        client.onConnect = (frame) => {
            setIsConnected(true);
            console.log('Connected to WebSocket');

            // Subscribe to global broadcasts
            client.subscribe('/topic/broadcast', (message: IMessage) => {
                handleIncomingMessage(message);
            });

            // Subscribe to user-specific notifications
            client.subscribe(`/topic/user/${user.employeeId}`, (message: IMessage) => {
                handleIncomingMessage(message);
            });
        };

        client.onStompError = (frame) => {
            console.error('Broker reported error: ' + frame.headers['message']);
            console.error('Additional details: ' + frame.body);
        };

        client.onDisconnect = () => {
            setIsConnected(false);
            console.log('Disconnected from WebSocket');
        };

        client.activate();
        stompClientRef.current = client;

        return () => {
            if (client.active) {
                client.deactivate();
            }
        };
    }, [isAuthenticated, user?.employeeId]);

    const handleIncomingMessage = (message: IMessage) => {
        try {
            const body = JSON.parse(message.body);
            const newNotification: Notification = {
                ...body,
                read: false,
                timestamp: body.timestamp || Date.now(),
            };

            setNotifications((prev) => [newNotification, ...prev]);

            // Optional: Play sound or show browser notification
        } catch (e) {
            console.error('Failed to parse notification', e);
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
