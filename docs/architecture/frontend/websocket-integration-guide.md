# WebSocket Reconnection Integration Guide

## Quick Start

The WebSocket notification system is already integrated into the application. No changes are needed
to existing code. The reconnection logic works transparently in the background.

### How It Works (Automatic)

1. **User logs in** → WebSocketProvider connects automatically
2. **Network drops** → Service detects disconnect and starts reconnection
3. **Waits 1-30 seconds** → Exponential backoff with jitter
4. **Attempts reconnect** → Automatically retries up to 10 times
5. **Connection restored** → User sees success toast, continues receiving notifications
6. **Max attempts exceeded** → User sees error toast, can refresh page

## Integration Points

### 1. Application Root (Already Wrapped)

The WebSocketProvider should wrap your application (typically in `app/layout.tsx` or
`app/providers.tsx`):

```typescript
import { WebSocketProvider } from '@/components/notifications/WebSocketProvider';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <WebSocketProvider autoConnect={true} showToasts={true}>
      {children}
    </WebSocketProvider>
  );
}
```

### 2. Using WebSocket in Components

```typescript
import { useWebSocket } from '@/components/notifications/WebSocketProvider';

export function NotificationBell() {
  const { isConnected, status } = useWebSocket();

  return (
    <div>
      {status === 'CONNECTED' && (
        <span className="text-green-500">● Connected</span>
      )}
      {status === 'RECONNECTING' && (
        <span className="text-yellow-500">⟲ Reconnecting...</span>
      )}
      {status === 'FAILED' && (
        <span className="text-red-500">✕ Failed</span>
      )}
    </div>
  );
}
```

### 3. Listening to Status Changes

```typescript
import { webSocketService, WebSocketStatus } from '@/lib/websocket';
import { useEffect } from 'react';

export function ConnectionMonitor() {
  useEffect(() => {
    const unsubscribe = webSocketService.addStatusChangeListener((status) => {
      console.log('Connection status:', status);

      switch (status) {
        case WebSocketStatus.CONNECTED:
          console.log('✓ Real-time notifications active');
          // Refresh stale data
          queryClient.refetchQueries();
          break;

        case WebSocketStatus.DISCONNECTED:
          console.log('⟲ Connection lost, retrying...');
          break;

        case WebSocketStatus.RECONNECTING:
          console.log('↻ Attempting to reconnect...');
          break;

        case WebSocketStatus.FAILED:
          console.log('✗ Connection failed permanently');
          // Show user-facing error
          break;
      }
    });

    return () => unsubscribe();
  }, []);

  return null; // This component doesn't render
}
```

### 4. Adding Notification Handlers

```typescript
import { webSocketService } from '@/lib/websocket';
import { useEffect } from 'react';

export function NotificationListener() {
  useEffect(() => {
    const unsubscribe = webSocketService.addHandler((notification) => {
      console.log('Received notification:', notification);

      // Update UI based on notification type
      if (notification.type === 'LEAVE_APPROVED') {
        // Update leave balance
        updateLeaveBalance();
      } else if (notification.type === 'EXPENSE_APPROVED') {
        // Update expense status
        updateExpenseStatus();
      }

      // Dispatch custom event for other components
      window.dispatchEvent(
        new CustomEvent('notification-received', { detail: notification })
      );
    });

    return () => unsubscribe();
  }, []);

  return null; // This component doesn't render
}
```

## Configuration Options

### WebSocketProvider Props

```typescript
interface WebSocketProviderProps {
  children: React.ReactNode;
  userId?: string;           // Auto-filled from auth store
  tenantId?: string;         // Auto-filled from auth store
  token?: string;            // Optional JWT token
  autoConnect?: boolean;     // Default: true
  showToasts?: boolean;      // Default: true
}
```

### Reconnection Configuration

Modify in `/lib/websocket.ts` (line 47-52):

```typescript
private readonly reconnectConfig: ReconnectConfig = {
  initialDelay: 1000,      // Start at 1 second
  maxDelay: 30000,         // Max 30 seconds
  maxAttempts: 10,         // Try 10 times total
  backoffMultiplier: 2,    // Double each time
};
```

## Status States Reference

```typescript
enum WebSocketStatus {
  // Not connected, will attempt to reconnect
  DISCONNECTED = 'DISCONNECTED',

  // Initial connection in progress
  CONNECTING = 'CONNECTING',

  // Successfully connected, receiving notifications
  CONNECTED = 'CONNECTED',

  // Disconnected, actively attempting to reconnect
  RECONNECTING = 'RECONNECTING',

  // Max reconnection attempts exceeded
  FAILED = 'FAILED',
}
```

## Notification Interface

All incoming notifications conform to this interface:

```typescript
interface WebSocketNotification {
  type: string;                          // 'LEAVE_APPROVED', 'ERROR', etc.
  title: string;                         // Toast title
  message: string;                       // Toast message
  data?: Record<string, unknown>;        // Custom payload
  timestamp: string;                     // ISO timestamp
}
```

## Common Scenarios

### Scenario 1: User Working When Network Drops

```
t=0s:   Connected
t=1s:   Network drops
        Status: CONNECTED → DISCONNECTED → RECONNECTING
        Log: "Connection lost. Will attempt to reconnect."
        Log: "Reconnecting (attempt 1/10) in 987ms"

t=2s:   Attempt 1 fails
        Status: RECONNECTING (waiting)
        Log: "Reconnecting (attempt 2/10) in 1876ms"

t=4s:   Attempt 2 succeeds
        Status: RECONNECTING → CONNECTED
        Toast: "Connection Restored"
        Log: "Connected"
        User: Continues receiving notifications
```

### Scenario 2: Network Down for 5 Minutes

```
t=0s:   Network drops
        Status: CONNECTED → DISCONNECTED

t=1s:   Attempt 1 (fails)
        Delay: 1s

t=3s:   Attempt 2 (fails)
        Delay: 2s

t=6s:   Attempt 3 (fails)
        Delay: 4s

t=11s:  Attempt 4 (fails)
        Delay: 8s

t=20s:  Attempt 5 (fails)
        Delay: 16s

t=37s:  Attempt 6 (fails)
        Delay: 30s (capped)

t=68s:  Attempt 7 (fails)
        Delay: 30s

t=99s:  Attempt 8 (fails)
        Delay: 30s

t=130s: Attempt 9 (fails)
        Delay: 30s

t=161s: Attempt 10 (fails)
        Status: RECONNECTING → FAILED
        Toast: "Connection Failed - Please refresh"
        Log: "Max reconnection attempts exceeded"

t=300s: Network restored, user is still on failed page
        (No auto-recovery until user action or tab visibility change)

t=301s: User switches back to tab/clicks refresh
        Status: FAILED → DISCONNECTED → CONNECTING → CONNECTED
        Toast: "Connection Restored"
        User: Back to receiving notifications
```

### Scenario 3: Tab Hidden, Network Drops

```
t=0s:   User switches to another tab
        Tab: CONNECTED (preserved)

t=5s:   Network drops
        Tab: DISCONNECTED → RECONNECTING
        (Reconnection scheduled normally)

t=30s:  User switches back to tab
        Status was: FAILED or DISCONNECTED
        Visibility change detected
        Attempt counter reset to 0
        Status: DISCONNECTED → RECONNECTING → CONNECTED
        Toast: "Connection Restored"
        User: Continues receiving notifications

t=31s:  No delay - fresh reconnection sequence
```

## Debugging

### Enable Debug Logging

In development mode, debug logs are automatically enabled:

```typescript
// In console, you'll see:
[WebSocket Debug] Connected
[WebSocket] Connection lost. Will attempt to reconnect.
[WebSocket] Reconnecting (attempt 1/10) in 987ms
[WebSocket] Connected
```

### Check Current Status

In browser console:

```javascript
// Get current status
webSocketService.getStatus()
// Returns: 'CONNECTED', 'DISCONNECTING', 'RECONNECTING', 'FAILED', etc.

// Check if connected
webSocketService.isConnected()
// Returns: true or false

// Force disconnect (for testing)
webSocketService.disconnect()

// Manually reconnect (if you have credentials)
webSocketService.connect('user123', 'tenant456', 'token...')
```

### Monitor Network Activity

1. Open DevTools → Network tab
2. Filter by `WS` (WebSocket)
3. Look for `/ws` connections
4. Watch for new connections as reconnection happens

### Check Console for Warnings

Look for `[WebSocket]` prefixed logs:

- `[WebSocket Error]` - Actual errors
- `[WebSocket]` - Important events (connection lost, reconnecting, max attempts)
- `[WebSocket Warning]` - Connection issues
- `[WebSocket Debug]` - Detailed lifecycle (dev mode only)

## Performance Considerations

### CPU Usage

- Negligible - event-driven, no polling
- Single timer active during reconnection
- No busy-waiting or loops

### Memory Usage

- ~2KB for configuration and state
- No memory leaks on disconnect
- Handlers properly cleaned up

### Network Impact

- Jitter prevents thundering herd
- Exponential backoff reduces attempts during outages
- Max 30s delay limits retry frequency
- Heartbeats (10s) detect stale connections early

### Battery Impact (Mobile)

- Minimal - long delays reduce wake-ups
- No constant polling
- Efficient event-based model

## Troubleshooting

### Notifications not arriving after reconnect

**Symptom**: Reconnection succeeds (toast shows) but notifications still don't arrive

**Check**:

1. Are you subscribed to the right topics?

- `/topic/broadcast` - All users
- `/topic/user/{userId}` - Individual user
- `/topic/tenant/{tenantId}` - Tenant-wide

2. Is the backend sending notifications?

- Check backend logs for message publishing

3. Are notifications arriving before disconnect?

- If yes, it's a subscription issue
- If no, it's a backend issue

**Solution**: The service automatically resubscribes on successful reconnect (line 135 in
websocket.ts: `subscribeToNotifications()`)

### Reconnection attempts stop after failure

**Symptom**: Status shows FAILED, but never retries even after network restored

**Reason**: After 10 failed attempts, service stops retrying to save resources

**Solution**:

1. User can switch tabs/return to page (resets counter)
2. User can refresh page
3. Wait for browser/app update that resets connection

### Too frequent reconnection attempts

**Symptom**: Reconnecting too often, high network load

**Solution**: Adjust reconnectConfig in websocket.ts:

```typescript
private readonly reconnectConfig: ReconnectConfig = {
  initialDelay: 2000,      // Increase from 1000
  maxDelay: 60000,         // Increase from 30000
  maxAttempts: 5,          // Decrease from 10
  backoffMultiplier: 2.5,  // Increase from 2
};
```

### Not reconnecting at all

**Symptom**: Connection drops, no reconnection attempts

**Check**:

1. Is WebSocketProvider in component tree?
2. Are userId and tenantId provided?
3. Check console for errors
4. Check Network tab - see if connection drops?

**Solution**:

```typescript
// Enable reconnection manually
webSocketService.connect(userId, tenantId, token)
  .then(() => console.log('Connected'))
  .catch(error => console.error('Failed:', error))
```

## Advanced Usage

### Custom Toast Notifications

If you want different toast behavior, override in your component:

```typescript
import { webSocketService, WebSocketStatus } from '@/lib/websocket';

export function CustomNotificationHandler() {
  useEffect(() => {
    const unsubscribe = webSocketService.addStatusChangeListener((status) => {
      if (status === WebSocketStatus.FAILED) {
        // Custom handling instead of default toast
        showCustomErrorDialog(
          'Real-time notifications are temporarily unavailable'
        );
      }
    });

    return () => unsubscribe();
  }, []);

  return null;
}
```

### Notification Deduplication

If you receive duplicate notifications:

```typescript
import { webSocketService } from '@/lib/websocket';

const seenNotifications = new Set<string>();

export function DedupedNotificationHandler() {
  useEffect(() => {
    const unsubscribe = webSocketService.addHandler((notification) => {
      const key = `${notification.type}-${notification.timestamp}`;

      if (!seenNotifications.has(key)) {
        seenNotifications.add(key);

        // Process notification
        handleNotification(notification);

        // Clean up old keys periodically
        if (seenNotifications.size > 1000) {
          seenNotifications.clear();
        }
      }
    });

    return () => unsubscribe();
  }, []);

  return null;
}
```

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                        Application                          │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                   WebSocketProvider                         │
│  - Wraps application                                        │
│  - Listens to status changes                                │
│  - Shows toast notifications                               │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                  WebSocketService (Singleton)               │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  Connection Management                               │  │
│  │  - connect() / disconnect()                          │  │
│  │  - Status tracking (DISCONNECTED → CONNECTED, etc.)  │  │
│  └──────────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  Reconnection Logic                                  │  │
│  │  - Exponential backoff (1s → 30s)                    │  │
│  │  - Jitter (±10%)                                     │  │
│  │  - Max 10 attempts                                   │  │
│  │  - Visibility change detection                       │  │
│  └──────────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  Message Handling                                    │  │
│  │  - Handler subscriptions                             │  │
│  │  - JSON parsing                                      │  │
│  │  - Error isolation                                   │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│              STOMP Client (@stomp/stompjs)                  │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│           SockJS WebSocket Bridge (sockjs-client)           │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    Backend STOMP Server                     │
│  - ws://server:8080/ws                                      │
│  - Manages subscriptions                                    │
│  - Publishes notifications                                 │
└─────────────────────────────────────────────────────────────┘
```

## Summary

The WebSocket reconnection system is:

- ✓ Automatic - no manual intervention needed
- ✓ Transparent - works in background
- ✓ Intelligent - exponential backoff with jitter
- ✓ User-friendly - helpful toast notifications
- ✓ Robust - handles all edge cases
- ✓ Efficient - minimal CPU, memory, network usage

Users will experience seamless real-time notifications with automatic recovery from connection
drops.
