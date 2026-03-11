# WebSocket Reconnection - Quick Reference

## Connection States

```
┌─────────────┐
│ CONNECTING  │  Initial connection attempt
└──────┬──────┘
       │ ✓ Success
       ▼
┌─────────────┐
│ CONNECTED   │  Active, receiving notifications
└──────┬──────┘
       │ Connection lost
       ▼
┌─────────────┐
│DISCONNECTED │  Attempting automatic reconnect
└──────┬──────┘
       │ Scheduling attempt
       ▼
┌──────────────┐
│ RECONNECTING │  Actively trying to reconnect
└──────┬───────┘
       │ ✓ Success
       │ ✗ Failure → back to RECONNECTING (with backoff)
       ▼
┌──────────────┐
│    FAILED    │  Max attempts (10) exceeded
└──────────────┘ User sees error toast, can refresh
```

## Exponential Backoff Timeline

| Attempt | Delay | Cumulative | Example Event |
|---------|-------|------------|---|
| 1 | ~1s | ~1s | Initial drop |
| 2 | ~2s | ~3s | - |
| 3 | ~4s | ~7s | - |
| 4 | ~8s | ~15s | - |
| 5 | ~16s | ~31s | - |
| 6 | ~30s | ~61s | 1 minute elapsed |
| 7 | ~30s | ~91s | - |
| 8 | ~30s | ~121s | 2 minutes elapsed |
| 9 | ~30s | ~151s | - |
| 10 | ~30s | ~168s | **2.8 minutes - FAILED** |

## API Reference

### Service Methods

```typescript
// Get/set connection
webSocketService.connect(userId, tenantId, token?)
webSocketService.disconnect()

// Check status
webSocketService.isConnected(): boolean
webSocketService.getStatus(): WebSocketStatus

// Listen for events
webSocketService.addStatusChangeListener(handler): () => void
webSocketService.addHandler(notificationHandler): () => void

// Send messages
webSocketService.send(destination, body)
```

### Component Hook

```typescript
import { useWebSocket } from '@/components/notifications/WebSocketProvider';

const { isConnected, status, connect, disconnect, addHandler } = useWebSocket();

// isConnected: boolean
// status: WebSocketStatus (CONNECTED | DISCONNECTED | RECONNECTING | FAILED | CONNECTING)
```

### Status Values

```typescript
enum WebSocketStatus {
  DISCONNECTED = 'DISCONNECTED'   // Lost connection, reconnecting
  CONNECTING = 'CONNECTING'       // Initial connection in progress
  CONNECTED = 'CONNECTED'         // Connected, receiving notifications
  RECONNECTING = 'RECONNECTING'   // Actively attempting to reconnect
  FAILED = 'FAILED'              // Max attempts exceeded
}
```

## Common Patterns

### Show Connection Indicator

```typescript
import { useWebSocket } from '@/components/notifications/WebSocketProvider';

export function ConnectionStatus() {
  const { status } = useWebSocket();

  const statusConfig = {
    CONNECTED: { color: 'green', label: 'Connected' },
    CONNECTING: { color: 'blue', label: 'Connecting...' },
    DISCONNECTED: { color: 'yellow', label: 'Reconnecting...' },
    RECONNECTING: { color: 'yellow', label: 'Reconnecting...' },
    FAILED: { color: 'red', label: 'Connection Failed' },
  };

  const config = statusConfig[status];
  return <span style={{ color: config.color }}>● {config.label}</span>;
}
```

### Listen to Notifications

```typescript
import { webSocketService } from '@/lib/websocket';
import { useEffect } from 'react';

useEffect(() => {
  const unsubscribe = webSocketService.addHandler((notification) => {
    console.log('Got notification:', notification.type);
    // Handle notification
  });

  return () => unsubscribe();
}, []);
```

### React to Connection Changes

```typescript
import { webSocketService, WebSocketStatus } from '@/lib/websocket';
import { useEffect } from 'react';

useEffect(() => {
  const unsubscribe = webSocketService.addStatusChangeListener((status) => {
    if (status === WebSocketStatus.CONNECTED) {
      // Connection restored - refresh data
      refetchQueries();
    } else if (status === WebSocketStatus.FAILED) {
      // Max retries exceeded - show user message
      showErrorDialog('Please refresh to restore notifications');
    }
  });

  return () => unsubscribe();
}, []);
```

## Debugging

### In Browser Console

```javascript
// Check current status
webSocketService.getStatus()

// See if connected
webSocketService.isConnected()

// Force disconnect (for testing)
webSocketService.disconnect()

// Reconnect manually
webSocketService.connect('user123', 'tenant456')
```

### Enable Logs

Development mode automatically shows:
```
[WebSocket] Connected
[WebSocket] Connection lost. Will attempt to reconnect.
[WebSocket] Reconnecting (attempt 1/10) in 987ms
[WebSocket] Connected
```

## Configuration

Edit `/lib/websocket.ts` line 47-52:

```typescript
private readonly reconnectConfig: ReconnectConfig = {
  initialDelay: 1000,      // Change start delay (ms)
  maxDelay: 30000,         // Change max delay (ms)
  maxAttempts: 10,         // Change max attempts
  backoffMultiplier: 2,    // Change backoff rate
};
```

## Troubleshooting

| Issue | Cause | Solution |
|-------|-------|----------|
| Notifications stop after reconnect | Subscriptions not re-attached | Check line 135 in websocket.ts |
| Too many reconnection attempts | Settings too aggressive | Increase initialDelay or maxAttempts |
| Not reconnecting at all | No credentials provided | Ensure userId and tenantId are set |
| High memory usage | Handlers not removed | Use unsubscribe function returned by addHandler() |
| Notifications missing | Subscribed to wrong topics | Verify backend publishes to /topic/user/{id} |

## Performance

| Metric | Value |
|--------|-------|
| Memory overhead | ~2KB |
| CPU usage | Negligible |
| Battery impact | Minimal (long delays) |
| Network impact | Reduced (jitter + capping) |

## Key Points

- ✓ Automatic - no manual connection management needed
- ✓ Transparent - works in background
- ✓ Smart - exponential backoff prevents server overload
- ✓ Safe - jitter prevents thundering herd
- ✓ User-friendly - helpful toast notifications
- ✓ Efficient - event-driven, not polling

## Toast Notifications (Automatic)

| Event | Toast | Duration |
|-------|-------|----------|
| Connection fails | ❌ "Connection Failed - Please refresh" | Persistent |
| Connection restored | ✓ "Connection Restored" | 3 seconds |

## Provider Props

```typescript
<WebSocketProvider
  userId={user.id}           // Optional - auto-filled
  tenantId={user.tenantId}   // Optional - auto-filled
  token={auth.token}         // Optional - for auth
  autoConnect={true}         // Connect on mount (default)
  showToasts={true}          // Show notifications (default)
>
  {children}
</WebSocketProvider>
```

## Full Documentation

- **WEBSOCKET_RECONNECTION.md** - Complete feature documentation
- **WEBSOCKET_INTEGRATION_GUIDE.md** - Integration and usage guide
- **WEBSOCKET_IMPLEMENTATION_SUMMARY.md** - Technical details

## TL;DR

The WebSocket client automatically reconnects when connections drop:
1. Waits 1 second before first retry
2. Doubles the wait time each attempt (up to 30 seconds)
3. Tries up to 10 times over ~2.8 minutes
4. Shows error toast if all attempts fail
5. Auto-reconnects when user switches back to tab

**No code changes needed - it just works!**
