# Error Boundaries & Global Error Handling

This document describes the error boundary strategy and error handling architecture for the NU-AURA platform.

## Overview

The NU-AURA frontend implements a **multi-layered error boundary system** that catches errors at different levels of the application stack and provides graceful fallbacks with user-friendly messaging.

```
Application Error Flow
├─ Global Runtime Errors
│  └─> global-error.tsx (root layout crash)
│
├─ Segment Errors (page / layout level)
│  └─> error.tsx (page-level error boundary)
│
├─ Not Found (404)
│  └─> not-found.tsx (route doesn't exist)
│
├─ React Component Errors
│  └─> ErrorBoundary component (component tree crash)
│
├─ Async/Network Errors
│  ├─> React Query error handler
│  └─> Global unhandledrejection listener
│
└─ Uncaught JavaScript Errors
   └─> Global error listener
```

---

## Layer 1: Global Error Handler

**File:** `lib/utils/error-handler.ts`

Provides centralized error handling utilities for the entire application.

### Key Features

- **Error Categorization:** Classifies errors into categories (NETWORK, AUTH, PERMISSION, SERVER, etc.)
- **Severity Levels:** Determines severity (LOW, MEDIUM, HIGH, CRITICAL)
- **User Messages:** Provides user-friendly error messages based on category
- **Session Tracking:** Generates unique session IDs for error correlation
- **Extensible:** Support for plugging in external error tracking services (Sentry, Rollbar, etc.)

### Usage

```typescript
import { handleError, categorizeError, getUserMessage } from '@/lib/utils/error-handler';

// Handle an error
const errorInfo = handleError(error, { context: 'user-action' });

// Check error category
const category = categorizeError(error);
const message = getUserMessage(category);
```

### Error Categories

| Category | HTTP Status | User Message |
|----------|------------|--------------|
| NETWORK | Network errors | "Unable to connect to server..." |
| AUTH | 401 | "Your session has expired..." |
| PERMISSION | 403 | "You do not have permission..." |
| NOT_FOUND | 404 | "The requested resource was not found" |
| SERVER | 500+ | "A server error occurred..." |
| VALIDATION | 400-499 | Custom validation message |
| CLIENT | JS errors | "An unexpected error occurred..." |

---

## Layer 2: Global Error Listeners

**Initialized in:** `app/providers.tsx` → `initGlobalErrorHandlers()`

Catches unhandled errors at the window level.

### Unhandled Promise Rejections

Catches promises that reject without a `.catch()` handler:

```typescript
window.addEventListener('unhandledrejection', (event) => {
  handleError(event.reason, { type: 'unhandledrejection' });
  if (isProduction) event.preventDefault();
});
```

### Uncaught JavaScript Errors

Catches synchronous JavaScript errors:

```typescript
window.addEventListener('error', (event) => {
  if (!event.message?.includes('ResizeObserver')) {
    handleError(event.error, { type: 'uncaughtError' });
  }
});
```

> **Note:** ResizeObserver errors are ignored (common false positive from Mantine components).

---

## Layer 3: React Query Configuration

**Location:** `app/providers.tsx`

React Query is configured with production-ready defaults:

```typescript
const [queryClient] = useState(
  () =>
    new QueryClient({
      defaultOptions: {
        queries: {
          staleTime: 5 * 60 * 1000,        // 5 minutes
          retry: 2,                         // Retry failed requests 2x
          refetchOnWindowFocus: false,      // Prevent excessive refetching
          gcTime: 10 * 60 * 1000,          // Keep unused data 10 min
        },
        mutations: {
          retry: 1,
          onError: createQueryErrorHandler(),
        },
      },
    })
);
```

### Configuration Rationale

- **staleTime (5 min):** Data is fresh for 5 minutes; avoids excessive network requests while keeping data reasonably current
- **retry (2):** Retry failed API calls 2 times (3 total attempts) for resilience without overwhelming the server
- **refetchOnWindowFocus (false):** Prevents user switching tabs from triggering unnecessary API calls
- **gcTime (10 min):** Keep cached data in memory for 10 minutes for instant navigation back to previously viewed data

---

## Layer 4: ErrorBoundary Component

**File:** `components/ui/ErrorBoundary.tsx`

A React error boundary that catches component tree errors (not async errors).

### When It Catches Errors

- ✅ Render errors in components
- ✅ Lifecycle method errors
- ✅ Constructor errors
- ❌ Async errors (use React Query or try/catch)
- ❌ Event handler errors (use try/catch)
- ❌ Server-side rendering errors (use error.tsx)

### Usage

```typescript
import { ErrorBoundary } from '@/components/ui/ErrorBoundary';

<ErrorBoundary>
  <MyComponent />
</ErrorBoundary>

// With custom fallback
<ErrorBoundary fallback={<MyErrorUI />}>
  <MyComponent />
</ErrorBoundary>
```

### Features

- **Development Mode:** Shows full error stack and component stack
- **Production Mode:** Shows error ID for customer support reference
- **Automatic Recovery:** Provides "Refresh Page" and "Go Home" buttons

---

## Layer 5: Page-Level Error Boundary

**File:** `app/error.tsx`

Catches errors within a page segment (created by Next.js error.tsx pattern).

### Caught Errors

- ✅ SSR errors in page/layout
- ✅ Client-side render errors in page/layout
- ✅ Errors from child components in the page segment
- ❌ Errors in parent layouts (caught by parent error.tsx)
- ❌ Root layout errors (caught by global-error.tsx)

### Features

- **Error Categorization:** Uses centralized error categorization
- **User-Friendly Messages:** Provides context-specific messages
- **Developer Details:** Expandable section showing error stack (dev only)
- **Retry Button:** Allows resetting the error state
- **Mantine UI:** Consistent theming with the app

### Example

When `/employees/123` throws an error:

```
error.tsx (in /employees/)
  ↓ catches →
Error in /employees/[id]/page.tsx
  ↓
Shows user-friendly error page with retry
```

---

## Layer 6: Global Error Handler

**File:** `app/global-error.tsx`

The final fallback for critical errors in the root layout.

### When It's Used

- ✅ Errors in root layout.tsx
- ✅ Errors that crash provider setup
- ✅ Errors that break Providers component
- ❌ Regular page errors (use error.tsx)
- ❌ Not found routes (use not-found.tsx)

### Critical Design Constraints

⚠️ **This component CANNOT use:**
- Mantine components (root layout may have crashed)
- CSS modules (CSS loader may be broken)
- External dependencies (provider setup may have failed)
- Even `next/image` (full Next.js runtime may be broken)

**Only inline styles and basic HTML are safe.**

### Features

- **Development Mode:** Shows full error details and stack trace
- **Production Mode:** Shows error reference ID for customer support
- **Minimal Dependencies:** Uses only inline HTML and styles
- **Hover States:** Button hover effects via inline event handlers

---

## Layer 7: 404 Not Found

**File:** `app/not-found.tsx`

Displays when a route doesn't exist or `notFound()` is called.

### When It's Used

```typescript
import { notFound } from 'next/navigation';

export default function Page({ params }: { params: { id: string } }) {
  const item = await getItem(params.id);

  if (!item) {
    notFound(); // Renders not-found.tsx
  }

  return <div>{item.name}</div>;
}
```

### Features

- **Mantine UI:** Consistent with app theme
- **Navigation Options:** Links to home and back
- **User-Friendly:** Clear messaging that page doesn't exist

---

## Error Flow Examples

### Example 1: API Request Fails

```
1. Frontend calls API: useQuery(['employee', id])
2. API returns 500 error
3. React Query catches and retries (2x)
4. All retries fail
5. React Query calls createQueryErrorHandler()
6. handleError() logs error and categorizes as SERVER
7. User sees React Query error state in component
8. Component shows inline error message or error boundary
```

### Example 2: Component Render Error

```
1. Component throws error during render
2. ErrorBoundary catches (if wrapped)
3. Renders fallback UI with error details
4. User can click "Refresh Page" to retry
5. handleError() logs the error
```

### Example 3: Root Layout Crashes

```
1. Root layout.tsx throws error
2. Next.js can't render error.tsx (depends on root layout)
3. Renders global-error.tsx (minimal HTML, no dependencies)
4. User sees critical error page with error ID
5. handleError() logs critical error
```

### Example 4: Route Not Found

```
1. User navigates to /nonexistent-route
2. Next.js routing finds no match
3. Renders not-found.tsx
4. User sees friendly 404 page
```

---

## Production Monitoring

### Error Tracking Integration

To add external error tracking (Sentry, Rollbar, etc.):

```typescript
import { setErrorTracker } from '@/lib/utils/error-handler';

// In app/providers.tsx, after creating providers:
if (process.env.NEXT_PUBLIC_SENTRY_DSN) {
  import('@sentry/nextjs').then(({ captureException }) => {
    setErrorTracker({
      captureError: (error, info) => {
        captureException(error, {
          contexts: { app: info.context },
          tags: { category: info.category, severity: info.severity },
        });
      },
      captureMessage: (msg, severity) => {
        console.log(`[${severity}] ${msg}`);
      },
      setUser: (userId) => {
        // Sentry.setUser({ id: userId });
      },
    });
  });
}
```

### Error Reference IDs

- **error.tsx:** Uses error.digest (Next.js provides)
- **global-error.tsx:** Generates error ID with timestamp
- **ErrorBoundary:** Generates error ID with timestamp

Store these IDs to correlate with server logs.

---

## Testing Error Boundaries

### Testing error.tsx

```typescript
'use client';

// Trigger error in tests
throw new Error('Test error');
```

### Testing ErrorBoundary

```typescript
import { ErrorBoundary } from '@/components/ui/ErrorBoundary';

describe('ErrorBoundary', () => {
  it('catches render errors', () => {
    const ThrowError = () => {
      throw new Error('Test error');
    };

    const { container } = render(
      <ErrorBoundary>
        <ThrowError />
      </ErrorBoundary>
    );

    expect(container.textContent).toContain('Something went wrong');
  });
});
```

---

## Best Practices

### ✅ DO

- Use React Query for async operations (has built-in error handling)
- Wrap custom async functions with `withErrorHandling()`
- Use `notFound()` when data doesn't exist
- Provide context when calling `handleError(error, { context })`
- Test error paths in components

### ❌ DON'T

- Use `.catch(() => {})` without handling the error
- Ignore unhandled promise rejections
- Use `any` types in error handlers
- Store error details in localStorage (privacy concern)
- Render sensitive stack traces in production

---

## Configuration Reference

### staleTime vs refetchOnWindowFocus

| Scenario | staleTime | refetchOnWindowFocus |
|----------|-----------|-------------------|
| User switches tabs | Data is stale, will refetch on interaction | Won't refetch unless you enable it |
| Data changes on server | Won't know about change until staleTime expires | Would know immediately if enabled |
| Production goal | Balance freshness with server load | Disable (reduces unnecessary requests) |

### When to Adjust Retry Logic

- **High-reliability operations** (payment processing): `retry: 3`
- **Read operations** (list employees): `retry: 2`
- **Mutations** (create/update/delete): `retry: 1` or `retry: 0`
- **Critical operations** (auth): Handle manually

---

## Summary

| Layer | Component | Catches | Fallback |
|-------|-----------|---------|----------|
| 1 | Error utilities | Error categorization | Message generation |
| 2 | Global listeners | Unhandled rejections, JS errors | Log + optional tracking |
| 3 | React Query | API/network errors | Retry + error state |
| 4 | ErrorBoundary | Component render errors | Error UI + recovery |
| 5 | error.tsx | Page/segment errors | User-friendly error page |
| 6 | global-error.tsx | Root layout crashes | Minimal HTML fallback |
| 7 | not-found.tsx | Missing routes | 404 page |

All layers work together to ensure users see helpful error messages while developers get complete error details for debugging.
