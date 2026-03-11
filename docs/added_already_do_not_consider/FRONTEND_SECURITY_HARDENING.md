# Frontend Security Hardening

This document describes the security improvements implemented in the frontend codebase.

## Overview

| Task | Status | Primary Files |
|------|--------|---------------|
| XSS Handling | ✅ Complete | `lib/utils/sanitize.ts` |
| Production Logging | ✅ Complete | `lib/utils/logger.ts` |
| Toast Error Feedback | ✅ Complete | `components/notifications/ToastProvider.tsx` |
| Race Condition Fixes | ✅ Complete | `lib/hooks/useDebounce.ts` |
| Confirmation Dialogs | ✅ Complete | `components/ui/ConfirmDialog.tsx` |
| Error Boundary Hardening | ✅ Complete | `components/ui/ErrorBoundary.tsx` |

---

## 1. XSS Handling for `dangerouslySetInnerHTML`

**Risk**: Cross-site scripting attacks via unsanitized HTML content.

**Solution**: All HTML content rendered via `dangerouslySetInnerHTML` is sanitized using DOMPurify.

**Files**:
- `frontend/lib/utils/sanitize.ts` - Sanitization utilities
- `frontend/app/announcements/page.tsx` - Uses `sanitizeAnnouncementHtml()`
- `frontend/components/layout/Header.tsx` - Uses `sanitizeEmailHtml()`

**Usage**:
```tsx
import { sanitizeAnnouncementHtml } from '@/lib/utils/sanitize';

<div dangerouslySetInnerHTML={{ __html: sanitizeAnnouncementHtml(content) }} />
```

---

## 2. Production-Safe Logging

**Risk**: Sensitive information leakage via console logs in production.

**Solution**: Created a logger utility that gates output based on `NODE_ENV`.

**File**: `frontend/lib/utils/logger.ts`

**Features**:
- All logs suppressed in production except sanitized errors
- Namespaced loggers for better organization
- Error objects sanitized (no stack traces in production)

**Usage**:
```tsx
import { createLogger } from '@/lib/utils/logger';

const logger = createLogger('ComponentName');

logger.log('Debug info');      // Only in development
logger.error('Error:', err);   // Sanitized in production
```

**API**:
- `logger.log()` - Development only
- `logger.info()` - Development only
- `logger.warn()` - Development only
- `logger.error()` - Always logged, sanitized in production
- `logger.debug()` - Development only
- `logger.group()` / `logger.groupEnd()` - Development only
- `logger.table()` - Development only

---

## 3. Toast Notifications for Error Feedback

**Risk**: Poor user experience with browser alerts; users unaware of errors.

**Solution**: Integrated toast notifications for all user-facing errors and success messages.

**File**: `frontend/components/notifications/ToastProvider.tsx`

**Usage**:
```tsx
import { useToast } from '@/components/notifications/ToastProvider';

function MyComponent() {
  const toast = useToast();

  const handleAction = async () => {
    try {
      await someAction();
      toast.success('Success', 'Action completed successfully.');
    } catch (error) {
      toast.error('Error', 'Unable to complete action.');
    }
  };
}
```

**API**:
- `toast.success(title, message?)` - Green success notification
- `toast.error(title, message?)` - Red error notification (8s duration)
- `toast.warning(title, message?)` - Yellow warning notification (6s duration)
- `toast.info(title, message?)` - Blue info notification

---

## 4. Race Condition Prevention

**Risk**: Stale data, duplicate requests, memory leaks from unmounted components.

**Solution**: Created debounce and abort controller hooks.

**File**: `frontend/lib/hooks/useDebounce.ts`

**Hooks Available**:

### `useDebounce<T>(value, delay)`
Debounces a value.
```tsx
const [searchTerm, setSearchTerm] = useState('');
const debouncedSearch = useDebounce(searchTerm, 300);

// Use debouncedSearch for filtering/API calls
```

### `useDebouncedCallback(callback, delay)`
Debounces a function.
```tsx
const debouncedSave = useDebouncedCallback((data) => {
  saveToServer(data);
}, 500);
```

### `useAbortController()`
Provides AbortController for fetch cancellation.
```tsx
const { getSignal, abort } = useAbortController();

const fetchData = async () => {
  const response = await fetch(url, { signal: getSignal() });
  // Previous request automatically aborted when new one starts
};
```

### `useDebouncedFetch(fetchFn, deps, delay)`
Combined debounce + abort for API calls.
```tsx
const { data, loading, error, refetch } = useDebouncedFetch(
  async (signal) => {
    const res = await fetch('/api/search?q=' + query, { signal });
    return res.json();
  },
  [query],
  300
);
```

---

## 5. Confirmation Dialogs for Destructive Actions

**Risk**: Accidental data deletion without user confirmation.

**Solution**: Enhanced ConfirmDialog component with accessibility features.

**File**: `frontend/components/ui/ConfirmDialog.tsx`

**Features**:
- Keyboard support (Escape to close)
- Focus management (focuses cancel button by default)
- ARIA attributes for screen readers
- Dark mode support
- Body scroll lock while open
- Async `onConfirm` support
- Loading state with spinner

**Usage**:
```tsx
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';

<ConfirmDialog
  isOpen={showConfirm}
  onClose={() => setShowConfirm(false)}
  onConfirm={handleDelete}
  title="Delete Item"
  message="Are you sure? This action cannot be undone."
  confirmText="Delete"
  cancelText="Cancel"
  type="danger"
  loading={isDeleting}
/>
```

**Props**:
| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `isOpen` | boolean | required | Controls visibility |
| `onClose` | () => void | required | Called on cancel/escape |
| `onConfirm` | () => void \| Promise<void> | required | Called on confirm |
| `title` | string | required | Dialog title |
| `message` | string | required | Dialog message |
| `confirmText` | string | "Confirm" | Confirm button text |
| `cancelText` | string | "Cancel" | Cancel button text |
| `type` | "danger" \| "warning" \| "info" | "danger" | Visual style |
| `loading` | boolean | false | Shows loading spinner |

---

## 6. Error Boundary Stack Trace Hiding

**Risk**: Stack traces expose internal implementation details in production.

**Solution**: Enhanced ErrorBoundary to hide stack traces in production.

**File**: `frontend/components/ui/ErrorBoundary.tsx`

**Behavior**:

| Environment | Error Display |
|-------------|---------------|
| Development | Full error message + stack trace |
| Production | User-friendly message + error reference ID |

**Error Reference ID Format**: `ERR-{timestamp}-{random}`
- Example: `ERR-M0X3K4-A1B2`
- Users can provide this ID for support

**Production Logging**:
```javascript
// Sanitized log output in production
console.error('Application error:', {
  errorId: 'ERR-M0X3K4-A1B2',
  message: 'Cannot read property x of undefined',
  name: 'TypeError',
  componentStack: '    at Component\n    at App\n    at Root'
});
```

---

## Files Changed Summary

### New Files
- `frontend/lib/utils/logger.ts`
- `frontend/lib/hooks/useDebounce.ts`

### Modified Files
- `frontend/components/ui/ErrorBoundary.tsx`
- `frontend/components/ui/ConfirmDialog.tsx`
- `frontend/components/layout/Header.tsx`
- `frontend/app/announcements/page.tsx`

---

## Best Practices

1. **Always sanitize HTML** before using `dangerouslySetInnerHTML`
2. **Use `logger` instead of `console`** for all logging
3. **Show toast notifications** for all user-facing errors
4. **Debounce search inputs** to prevent excessive API calls
5. **Use ConfirmDialog** for all destructive actions (delete, remove, etc.)
6. **Never expose stack traces** in production error UIs
