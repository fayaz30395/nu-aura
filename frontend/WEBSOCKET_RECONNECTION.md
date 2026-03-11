# WebSocket STOMP Notification Client - Reconnection Logic

## Overview

The WebSocket notification client has been enhanced with robust reconnection logic using exponential backoff with jitter. This ensures that when the WebSocket connection drops, the system automatically attempts to reconnect with intelligent delays, providing a seamless real-time notification experience.

## Features

### 1. Exponential Backoff with Jitter
- **Initial Delay**: 1 second
- **Maximum Delay**: 30 seconds
- **Backoff Multiplier**: 2x per attempt
- **Jitter**: ±10% random variation to prevent thundering herd
- **Maximum Attempts**: 10

### 2. Connection Status Tracking

The system tracks 5 distinct connection states via the `WebSocketStatus` enum:

```typescript
enum WebSocketStatus {
  DISCONNECTED = 'DISCONNECTED',   // Connection lost, attempting to reconnect
  CONNECTING = 'CONNECTING',       // Initial connection in progress
  CONNECTED = 'CONNECTED',         // Successfully connected
  RECONNECTING = 'RECONNECTING',   // Actively attempting to reconnect
  FAILED = 'FAILED',               // Max reconnection attempts exceeded
}
```

### 3. Visibility Change Handling
- Monitors browser tab visibility using the Visibility API
- When a tab becomes visible after being hidden, the service automatically attempts to reconnect
- Resets reconnection attempt counter on visibility restoration
- Particularly useful for users who switch between tabs/applications

### 4. User-Facing Notifications
- **Connection Failure**: When max reconnection attempts are exceeded, users receive a persistent error toast
- **Connection Restored**: When connection is successfully re-established after a disconnect, users receive a success toast
- Users are directed to refresh the page if reconnection permanently fails

### 5. Clean Teardown
- All timers are properly cleared on component unmount
- Event listeners are removed
- STOMP subscriptions are unsubscribed
- No memory leaks or dangling references

## Architecture

### Core Service: `lib/websocket.ts`

**Key Methods:**

```typescript
// Public API
connect(userId: string, tenantId: string, token?: string): Promise<void>
disconnect(): void
getStatus(): WebSocketStatus
addStatusChangeListener(handler: (status: WebSocketStatus) => void): () => void
addHandler(handler: NotificationHandler): () => void
isConnected(): boolean
send(destination: string, body: unknown): void

// Private helpers
calculateBackoffDelay(): number
setStatus(status: WebSocketStatus): void
handleDisconnect(): void
scheduleReconnect(): void
attachVisibilityChangeListener(): void
removeVisibilityChangeListener(): void
```

**Backoff Calculation:**
```
delay = min(initialDelay * (multiplier ^ attempt), maxDelay)
delay = delay + random_jitter (±10%)
delay = max(100ms, delay)  // Minimum 100ms
```

### Provider: `components/notifications/WebSocketProvider.tsx`

The provider:
- Wraps the application with WebSocket context
- Listens to status changes from the service
- Shows/hides reconnection failure notifications
- Manages toast notifications
- Handles auto-connect on mount

**Context API:**
```typescript
interface WebSocketContextType {
  isConnected: boolean
  status: WebSocketStatus
  connect: (userId: string, tenantId: string, token?: string) => Promise<void>
  disconnect: () => void
  addHandler: (handler: NotificationHandler) => () => void
}
```

## Usage Examples

### 1. Check Connection Status

```typescript
import { useWebSocket } from '@/components/notifications/WebSocketProvider';

function MyComponent() {
  const { isConnected, status } = useWebSocket();

  return (
    <div>
      {status === 'CONNECTED' && <p>Real-time notifications active</p>}
      {status === 'RECONNECTING' && <p>Attempting to reconnect...</p>}
      {status === 'FAILED' && <p>Notifications unavailable. Please refresh.</p>}
    </div>
  );
}
```

### 2. Listen to Status Changes

```typescript
import { webSocketService, WebSocketStatus } from '@/lib/websocket';

useEffect(() => {
  const unsubscribe = webSocketService.addStatusChangeListener((status) => {
    console.log('WebSocket status changed to:', status);

    if (status === WebSocketStatus.CONNECTED) {
      console.log('Connection restored!');
    } else if (status === WebSocketStatus.FAILED) {
      console.log('Connection failed permanently');
    }
  });

  return () => unsubscribe();
}, []);
```

### 3. Add Notification Handlers

```typescript
import { webSocketService } from '@/lib/websocket';

useEffect(() => {
  const unsubscribe = webSocketService.addHandler((notification) => {
    console.log('Received notification:', notification);
  });

  return () => unsubscribe();
}, []);
```

## Behavior Timeline

### Successful Reconnection
```
CONNECTED
    ↓ (connection drops)
DISCONNECTED (1s delay)
    ↓
RECONNECTING (attempt 1)
    ↓ (connection re-established)
CONNECTED ✓
```

### Failed Reconnection (exceeds max attempts)
```
CONNECTED
    ↓ (connection drops)
DISCONNECTED (1s delay)
    ↓
RECONNECTING (attempt 1, 1s wait)
    ↓
RECONNECTING (attempt 2, 2s wait)
    ↓
RECONNECTING (attempt 3, 4s wait)
    ↓
... (continues with exponential backoff)
    ↓
RECONNECTING (attempt 10, 30s wait - capped)
    ↓
FAILED (user sees error toast, can refresh)
```

### Visibility Change Recovery
```
DISCONNECTED (tab was hidden)
    ↓ (user returns to tab)
DISCONNECTED (attempt counter reset to 0)
    ↓
RECONNECTING (attempt 1, 1s wait)
    ↓
CONNECTED ✓ (fresh reconnection)
```

## Reconnection Sequence

When the WebSocket disconnects:

1. **Detect Disconnect**: `onWebSocketClose` callback is triggered
2. **Transition State**: Status changes to `DISCONNECTED` or `FAILED`
3. **Log Warning**: Warning is logged with reconnection plan
4. **Check Limits**: Verify we haven't exceeded max attempts
5. **Schedule Reconnect**: Schedule next attempt with exponential backoff
6. **Update Status**: Set status to `RECONNECTING`
7. **Log Info**: Log attempt number and delay
8. **Wait**: Use `setTimeout` with calculated delay
9. **Attempt Connection**: Call `connect()` method
10. **Handle Result**:
    - Success: Reset attempt counter, resubscribe to topics
    - Failure: Increment attempt counter, trigger next reconnection or failure

## Logging

The service provides structured logging with levels:

- **Debug**: Connection lifecycle events (development only)
- **Info**: Reconnection attempts, visibility changes
- **Warning**: Disconnection events
- **Error**: STOMP errors, max attempts exceeded

Example log output:
```
[WebSocket] Connected
[WebSocket] Connection lost. Will attempt to reconnect.
[WebSocket] Reconnecting (attempt 1/10) in 987ms
[WebSocket] Reconnecting (attempt 2/10) in 1876ms
[WebSocket] Connected
```

## Performance Considerations

### Memory Management
- Status change listeners are properly cleaned up
- Event listeners are removed on disconnect
- Timers are cleared before being replaced
- No circular references or memory leaks

### Network Efficiency
- Jitter prevents thundering herd problem
- Exponential backoff reduces server load during outages
- Maximum 30-second delay limits retry frequency
- Heartbeats (10s) detect stale connections early

### CPU Impact
- Single background timer per service instance
- No polling intervals (event-driven instead)
- Efficient status checking via direct property access

## Edge Cases Handled

1. **Rapid Reconnection Attempts**: If `connect()` is called while `CONNECTING`, it returns the pending promise
2. **Lost During Reconnection**: If disconnected during a reconnection attempt, a new backoff sequence starts
3. **Tab Hidden**: Reconnection pauses efficiently without consuming CPU
4. **Multiple Handlers**: All handlers are called safely with error isolation
5. **Malformed Messages**: Gracefully skipped with error logging
6. **Missing Credentials**: Service waits for valid credentials before reconnecting

## Testing Reconnection

To test the reconnection logic:

1. **Simulate Disconnect**:
   ```
   In DevTools Console:
   webSocketService.disconnect()
   ```

2. **Verify Reconnection Attempts**:
   - Monitor console logs for reconnection messages
   - Open DevTools Network tab to see WebSocket reopening

3. **Test Visibility Change**:
   - Connect successfully
   - Disconnect the WebSocket
   - Switch to another tab and back
   - Observe reconnection attempt counter reset

4. **Test Max Attempts**:
   - Change `reconnectConfig.maxAttempts` to 2 for quick testing
   - Disconnect and wait for FAILED status

## Migration Guide

If you were using the old `handleReconnect()` method:

**Before**:
```typescript
// Old method - removed
private handleReconnect(): void { ... }
```

**After**:
```typescript
// New methods - use these instead
private scheduleReconnect(): void { ... }
private handleDisconnect(): void { ... }
```

The public API remains backward compatible. Existing code using `webSocketService.connect()`, `webSocketService.disconnect()`, and `webSocketService.addHandler()` continues to work without changes.

## Future Enhancements

Potential improvements for consideration:

1. **Circuit Breaker Pattern**: Track failed attempts and implement exponential backoff at service level
2. **Health Checks**: Periodic ping/pong to detect stale connections proactively
3. **Metrics Collection**: Track reconnection success rates and latency
4. **Configurable Backoff**: Allow per-tenant backoff configuration
5. **Persistent Connection History**: Log reconnection events for analytics
6. **Browser Online/Offline Detection**: Integrate with `navigator.onLine` API
7. **Service Worker Support**: Maintain notification queue while offline

## TypeScript Types

All types are properly defined with no `any` types:

```typescript
export interface WebSocketNotification {
  type: string;
  title: string;
  message: string;
  data?: Record<string, unknown>;
  timestamp: string;
}

export type NotificationHandler = (notification: WebSocketNotification) => void;

export enum WebSocketStatus {
  DISCONNECTED = 'DISCONNECTED';
  CONNECTING = 'CONNECTING';
  CONNECTED = 'CONNECTED';
  RECONNECTING = 'RECONNECTING';
  FAILED = 'FAILED';
}

interface WebSocketContextType {
  isConnected: boolean;
  status: WebSocketStatus;
  connect: (userId: string, tenantId: string, token?: string) => Promise<void>;
  disconnect: () => void;
  addHandler: (handler: NotificationHandler) => () => void;
}
```

## References

- **STOMP.js Documentation**: https://stomp-js.github.io/
- **SockJS Documentation**: https://sockjs.org/
- **Web Visibility API**: https://developer.mozilla.org/en-US/docs/Web/API/Page_Visibility_API
- **Exponential Backoff**: https://en.wikipedia.org/wiki/Exponential_backoff
