# Detailed Bug Findings - Code-Level Analysis

## Overview
This document provides code-level details for each bug identified in the BUG_ANALYSIS_REPORT.md. Use this for implementation guidance.

---

## BUG-001: Payroll Service - Missing Backend Endpoint

### Root Cause
Frontend method `getPayslipsByPeriod()` calls an endpoint that was never implemented in the backend.

### Verification Steps
**Backend Check** - No endpoint exists:
```bash
grep -r "payslips/period" backend/src/main/java/com/hrms/api/payroll/
# No matches (except employee/period endpoint)
```

### Workaround (Temporary)
Until endpoint is implemented, use these alternatives:
```typescript
// Instead of:
const payslips = await payrollService.getPayslipsByPeriod(startDate, endDate);

// Use one of these:
// Option 1: Get by employee and month
const payslips = await payrollService.getPayslipByEmployeeAndPeriod(employeeId, 2026, 3);

// Option 2: Get all payslips and filter client-side
const allPayslips = await payrollService.getAllPayslips(0, 1000);
const filtered = allPayslips.content.filter(p =>
  p.paymentDate >= startDate && p.paymentDate <= endDate
);
```

### Implementation Path
**Option A: Implement Backend Endpoint**
```java
// Add to PayrollController.java
@GetMapping("/payslips/period")
@RequiresPermission(Permission.PAYROLL_VIEW_ALL)
public ResponseEntity<Page<Payslip>> getPayslipsByPeriod(
    @RequestParam String startDate,
    @RequestParam String endDate,
    Pageable pageable) {
  LocalDate start = LocalDate.parse(startDate);
  LocalDate end = LocalDate.parse(endDate);
  Page<Payslip> payslips = payslipService.getPayslipsByPeriod(start, end, pageable);
  return ResponseEntity.ok(payslips);
}

// Add to PayslipService.java
public Page<Payslip> getPayslipsByPeriod(LocalDate start, LocalDate end, Pageable pageable) {
  UUID tenantId = TenantContext.getCurrentTenant();
  return payslipRepository.findByTenantIdAndPaymentDateBetween(tenantId, start, end, pageable);
}

// Add to PayslipRepository
Page<Payslip> findByTenantIdAndPaymentDateBetween(
    UUID tenantId, LocalDate start, LocalDate end, Pageable pageable);
```

**Option B: Remove Stub (Preferred if not needed)**
```typescript
// Remove from payroll.service.ts
// Delete getPayslipsByPeriod() method entirely
// Update any callers to use getPayslipByEmployeeAndPeriod() instead
```

---

## BUG-002: Payroll Service - Bulk Processing Endpoints Missing

### Affected Methods
```typescript
// All three below call non-existent endpoints
1. bulkProcessPayroll(data) → POST /payroll/bulk-process
2. getBulkProcessingStatus(payrollRunId) → GET /payroll/bulk-process/{payrollRunId}/status
3. previewBulkProcessing(data) → POST /payroll/bulk-process/preview
```

### Detection
```bash
# Verify endpoints don't exist
grep -r "/bulk-process" backend/src/main/java/com/hrms/api/payroll/
# No results
```

### Recommended Fix
Since these appear to be Phase 2 features and not critical for MVP:

**Option 1: Remove (Recommended)**
```typescript
// Delete from payroll.service.ts
// These three methods
// Flag in code review as Phase 2

// Option 2: Add feature-flag check at service level
if (!featureFlags.isEnabled('PAYROLL_BULK_PROCESSING')) {
  throw new Error('Bulk processing not yet available');
}
```

**Option 2: Implement Backend (if required for Phase 1)**
```java
@PostMapping("/bulk-process")
@RequiresPermission(Permission.PAYROLL_PROCESS)
public ResponseEntity<Map<String, Object>> bulkProcessPayroll(
    @RequestBody BulkProcessRequest request) {
  PayrollRun run = payrollRunService.bulkProcess(
    request.getEmployeeIds(),
    request.getPeriodStart(),
    request.getPeriodEnd()
  );
  return ResponseEntity.ok(Map.of(
    "payrollRunId", run.getId(),
    "processedCount", run.getPayslips().size(),
    "failedCount", 0
  ));
}

@GetMapping("/bulk-process/{payrollRunId}/status")
@RequiresPermission(Permission.PAYROLL_VIEW_ALL)
public ResponseEntity<Map<String, Object>> getBulkProcessingStatus(@PathVariable UUID payrollRunId) {
  PayrollRun run = payrollRunService.getPayrollRunById(payrollRunId);
  return ResponseEntity.ok(Map.of(
    "status", run.getStatus().name(),
    "processedCount", run.getPayslips().size(),
    "totalCount", run.getPayslips().size(),
    "errors", List.of()
  ));
}

@PostMapping("/bulk-process/preview")
@RequiresPermission(Permission.PAYROLL_PROCESS)
public ResponseEntity<List<Map<String, Object>>> previewBulkProcessing(
    @RequestBody BulkProcessRequest request) {
  // Calculate payroll for employees without creating records
  return ResponseEntity.ok(payrollRunService.previewBulk(request));
}
```

---

## BUG-003: Recruitment Service - Ambiguous Endpoint Return Type

### Root Cause
Two methods call the same endpoint but expect different response structures.

### Side-by-Side Comparison

**Frontend Method 1**:
```typescript
// recruitment.service.ts:75-77
async getCandidatesByJobOpening(jobOpeningId: string): Promise<Candidate[]> {
  const response = await apiClient.get<Candidate[]>(
    `/recruitment/candidates/job-opening/${jobOpeningId}`
  );
  return response.data;  // ← Expects raw array
}
```

**Frontend Method 2**:
```typescript
// recruitment.service.ts:84-87
async getCandidatesByJob(jobId: string): Promise<Candidate[]> {
  const response = await apiClient.get<Page<Candidate>>(
    `/recruitment/candidates/job-opening/${jobId}`  // ← SAME ENDPOINT!
  );
  return response.data.content;  // ← Expects paginated response
}
```

**Backend Reality**:
```java
// RecruitmentController.java:98-103
@GetMapping("/candidates/job-opening/{jobOpeningId}")
public ResponseEntity<Page<CandidateResponse>> getCandidatesByJobOpening(
    @PathVariable UUID jobOpeningId,
    Pageable pageable) {
  return ResponseEntity.ok(
    recruitmentManagementService.getCandidatesByJobOpening(jobOpeningId, pageable)
  );
  // ← Returns Page<CandidateResponse>, NOT raw array!
}
```

### Fix Required
**Step 1: Consolidate to Single Method**
```typescript
// Remove getCandidatesByJob() - it's redundant
// Keep getCandidatesByJobOpening()

async getCandidatesByJobOpening(
  jobOpeningId: string,
  page: number = 0,
  size: number = 20
): Promise<Page<Candidate>> {
  const response = await apiClient.get<Page<Candidate>>(
    `/recruitment/candidates/job-opening/${jobOpeningId}`,
    { params: { page, size } }
  );
  return response.data;  // ← Return full Page object
}
```

**Step 2: Update All Callers**
```typescript
// Before:
const candidates = await recruitmentService.getCandidatesByJob(jobId);

// After:
const result = await recruitmentService.getCandidatesByJobOpening(jobId);
const candidates = result.content;
const totalPages = result.totalPages;
```

---

## BUG-004: Leave Service - Approval Parameters Mismatch

### The Problem

**What Frontend Sends**:
```typescript
// leave.service.ts:113-126
async approveLeaveRequest(
  id: string,
  approverId: string,
  comments?: string
): Promise<LeaveRequest> {
  const response = await apiClient.post<LeaveRequest>(
    `/leave-requests/${id}/approve`,
    null,  // Body is empty
    {
      params: { approverId, comments }  // Sent as query parameters
    }
  );
  return response.data;
}
```

**HTTP Request Sent**:
```
POST /api/v1/leave-requests/550e8400-e29b-41d4-a716-446655440000/approve?approverId=123&comments=Looks+good
Content-Type: application/json

null
```

**What Backend Does**:
```java
// LeaveRequestController.java:156-171
@PostMapping("/{id}/approve")
@RequiresPermission(Permission.LEAVE_APPROVE)
public ResponseEntity<LeaveRequestResponse> approveLeaveRequest(
    @PathVariable UUID id) {  // ← IGNORES approverId parameter

  UUID approverId = SecurityContext.getCurrentEmployeeId();  // Uses current user
  LeaveRequest approved = leaveRequestService.approveLeaveRequest(id, approverId);
  return ResponseEntity.ok(toResponse(approved));
}
```

### Why This Works (By Accident)
- Using `SecurityContext.getCurrentEmployeeId()` is actually correct (approver must be the current user)
- Comments parameter is completely ignored (not stored anywhere)
- But the frontend API contract is misleading

### Solution - Option A: Fix Frontend (Recommended)
```typescript
// leave.service.ts - Remove unused parameters
async approveLeaveRequest(id: string, reason?: string): Promise<LeaveRequest> {
  const body: any = {};
  if (reason) {
    body.approvalComments = reason;  // Store in request body if needed
  }

  const response = await apiClient.post<LeaveRequest>(
    `/leave-requests/${id}/approve`,
    body
  );
  return response.data;
}

async rejectLeaveRequest(id: string, reason: string): Promise<LeaveRequest> {
  // Already works correctly - reason is sent as query param
  const response = await apiClient.post<LeaveRequest>(
    `/leave-requests/${id}/reject`,
    null,
    { params: { reason } }
  );
  return response.data;
}
```

### Solution - Option B: Fix Backend (If Comments Need Storage)
```java
// Add comments field to LeaveRequest entity if not present
@Column(length = 1000)
private String approvalComments;

// Update controller to accept comments
@PostMapping("/{id}/approve")
public ResponseEntity<LeaveRequestResponse> approveLeaveRequest(
    @PathVariable UUID id,
    @RequestParam(required = false) String comments) {  // ← Accept parameter

  UUID approverId = SecurityContext.getCurrentEmployeeId();
  LeaveRequest approved = leaveRequestService.approveLeaveRequest(id, approverId, comments);
  return ResponseEntity.ok(toResponse(approved));
}
```

---

## BUG-005: Token Refresh Race Condition

### The Race

**Scenario**: User's token expires while they're making 3 concurrent requests.

**Timeline**:
```
Time | Request A           | Request B           | Request C
-----|-------------------|-------------------|------------------
 0   | GET /employees    | GET /leave        | GET /payroll
     | (sends expired)   | (sends expired)   | (sends expired)
     |                   |                   |
 50  | ← 401 response    | ← 401 response    | ← 401 response
     | refreshPromise=1  | checks refPromise=1 | checks refPromise=1
     | posts /refresh   | awaits shared      | awaits shared
     |                  | promise            | promise
     |
100  | ← 200 success    |                    |
     | refreshPromise=null
     | redirectToLogin()| ← if refresh failed
     | redirectToLogin()| ← RACE: multiple redirects
     | redirectToLogin()| ← possible here
```

### Root Cause
```typescript
// client.ts:98-104
if (refreshed) {
  return this.client(originalRequest);  // Retry on success
}

// ← If we reach here, refresh failed
this.redirectToLogin();  // ← Multiple concurrent calls race here
```

### Current Behavior (Why It Mostly Works)
```typescript
private redirectToLogin(): void {
  if (isRedirecting) return;  // ← Guard prevents immediate re-entry

  isRedirecting = true;

  // But: between checking and setting, another thread could set it
  // (JavaScript is single-threaded, but async operations can interleave)
}
```

### Fix Implementation
```typescript
private redirectToLogin(): void {
  // Atomic: check-and-set in one synchronous operation
  if (isRedirecting) return;

  isRedirecting = true;
  this.clearTokens();

  if (redirectResetTimer) clearTimeout(redirectResetTimer);
  redirectResetTimer = setTimeout(() => {
    isRedirecting = false;
    redirectResetTimer = null;
  }, REDIRECT_DEBOUNCE_MS);

  // Defer navigation to avoid multiple redirects
  if (typeof window !== 'undefined') {
    // Use microtask queue (Promise) instead of immediate assignment
    // This ensures all concurrent redirectToLogin() calls queue together
    Promise.resolve().then(() => {
      if (isRedirecting) {  // Double-check still valid
        window.location.href = '/auth/login?reason=expired';
      }
    });
  }
}
```

---

## BUG-006: Auth Store Hydration Race

### The Problem

**Component Lifecycle**:
```
1. App mounts
2. useAuth() hook initializes
3. Zustand reads from sessionStorage (synchronous)
   → May find stale data from previous session
4. useAuth hydration callback fires (async)
5. Component renders with stale state
6. restoreSession() eventually completes
7. Component re-renders with correct state
   → User sees flicker or wrong UI
```

### Code Flow

**File**: `/frontend/lib/hooks/useAuth.ts:220-231`

```typescript
// This happens AFTER component renders:
{
  name: 'auth-storage',
  storage: createJSONStorage(() => sessionStorage),
  // ...
  onRehydrateStorage: () => (state) => {
    state?.setHasHydrated(true);  // ← Marks as ready
  },
}
```

**Problem**: Even if hydration completes, `restoreSession()` hasn't been called yet!

```typescript
// User typically calls this in layout or app component:
useEffect(() => {
  if (!auth.isAuthenticated && !auth.hasHydrated) {
    auth.restoreSession();  // ← Async network call starts here
  }
}, [auth.hasHydrated]);
```

### Scenario: The Flicker
```
Timeline:
 0ms - App loads, useAuth hydrates from sessionStorage
      isAuthenticated: true (stale from before logout)
      user: null (was cleared)

 10ms - Component renders
       Sees isAuthenticated=true, renders protected content
       But user is null → shows broken UI

 50ms - restoreSession() completes
       If session invalid: clears isAuthenticated=false
       Component re-renders, shows login screen
       → USER SEES FLICKER
```

### Recommended Fix

**Option 1: Check Both Flags Before Rendering Protected Content**
```typescript
// In page.tsx or layout.tsx
function ProtectedPage() {
  const auth = useAuth();

  if (!auth.hasHydrated) {
    return <LoadingSpinner />;  // Wait for hydration
  }

  if (!auth.isAuthenticated) {
    return redirect('/auth/login');
  }

  return <YourContent />;
}
```

**Option 2: Prevent Persisting Stale Data (Better)**
```typescript
// useAuth.ts - Add explicit hydration control
export const useAuth = create<AuthState>()(
  persist(
    (set) => ({
      // ...
      restoreSession: async () => {
        try {
          const response = await authApi.refresh();
          // ... restore logic
          return true;
        } catch {
          // Explicitly clear auth state on restore failure
          set({ user: null, isAuthenticated: false });
          return false;
        }
      },
    }),
    {
      // ...
      // Only persist successful logins, not partial state
      partialize: (state) => {
        // Don't persist if not authenticated
        if (!state.isAuthenticated) {
          return { user: null, isAuthenticated: false };
        }
        return {
          user: state.user,
          isAuthenticated: state.isAuthenticated,
        };
      },
    }
  )
);
```

---

## BUG-008: Payment Config Mutation Cleanup

### The Leak

**Scenario**: User navigates away while mutation is in-flight

```typescript
// Mutation is pending...
const onSubmit = async (data: ConfigFormData) => {
  try {
    await saveConfigMutation.mutateAsync(request);  // ← Still pending
    setSavedMessage(...);  // ← Component unmounts before this
  }
};

// User clicks Back button → Component unmounts
// Mutation completes 1 second later
// setSavedMessage() tries to update unmounted component
// React warning: "Can't perform a React state update on an unmounted component"
```

### Current Code (Lines 52-119)
```typescript
const savedMsgTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

useEffect(() => () => {
  if (savedMsgTimerRef.current) clearTimeout(savedMsgTimerRef.current);
}, []);  // ← Only clears timeout, NOT the mutation

const onSubmit = async (data: ConfigFormData) => {
  try {
    await saveConfigMutation.mutateAsync(request);  // ← Can outlive component
    setSavedMessage(...);  // ← Memory leak here
  } catch (error) {
    setErrorMessage(error.message);  // ← And here
  }
};
```

### Solution

**Option 1: Use AbortSignal (Recommended)**
```typescript
'use client';

import { useEffect, useRef } from 'react';

export default function PaymentConfigPage() {
  const controllerRef = useRef<AbortController | null>(null);

  // Abort mutations on unmount
  useEffect(() => {
    return () => {
      if (controllerRef.current) {
        controllerRef.current.abort();
      }
    };
  }, []);

  const onSubmit = async (data: ConfigFormData) => {
    try {
      controllerRef.current = new AbortController();

      // Pass signal to mutation (if supported)
      await saveConfigMutation.mutateAsync(request, {
        // Custom mutation options to support signal
      });

      // Only update state if component still mounted
      setSavedMessage(`...`);
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') {
        // Mutation was cancelled — expected, no error
        return;
      }
      setErrorMessage(error.message);
    }
  };

  return (
    // ... JSX
  );
}
```

**Option 2: Use Callback Refs (Simpler)**
```typescript
const isMountedRef = useRef(true);

useEffect(() => {
  return () => {
    isMountedRef.current = false;
  };
}, []);

const onSubmit = async (data: ConfigFormData) => {
  try {
    await saveConfigMutation.mutateAsync(request);

    if (isMountedRef.current) {  // ← Check before setState
      setSavedMessage(`...`);
    }
  } catch (error) {
    if (isMountedRef.current) {
      setErrorMessage(error.message);
    }
  }
};
```

---

## BUG-011: React Query Over-Invalidation

### The Problem

Current implementation:
```typescript
export function useUpdateEmployee() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: ...) =>
      employeeService.updateEmployee(id, data),
    onSettled: (_, _error, { id }) => {
      queryClient.invalidateQueries({ queryKey: employeeKeys.detail(id) });

      // ← PROBLEM: Invalidates ALL pages, not just affected ones
      queryClient.invalidateQueries({ queryKey: employeeKeys.lists() });
    },
  });
}
```

**What Happens**:
```
User loads employees page 1-20, then page 2-20
User edits employee ID #5 (on page 1)
Mutation updates #5
Query invalidation fires:
  - Refetches detail query for #5 ✓ Good
  - Invalidates ALL list queries (page 0, page 1, page 2, etc.) ✗ Bad
  - Causes all pages to refetch from server
  - Network overhead increases
```

### Better Approach

**Option 1: Selective Invalidation**
```typescript
export function useUpdateEmployee() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: ...) =>
      employeeService.updateEmployee(id, data),

    onSuccess: (updatedEmployee, { id }) => {
      // Refetch only the detail query
      queryClient.invalidateQueries({
        queryKey: employeeKeys.detail(id),
        exact: true  // ← Only this specific detail
      });

      // Optionally: update specific list pages if you know the page
      // Don't invalidate all lists
    },
  });
}
```

**Option 2: Optimistic Update with Rollback**
```typescript
export function useUpdateEmployee() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: ...) =>
      employeeService.updateEmployee(id, data),

    onMutate: async ({ id, data }) => {
      // Cancel any in-flight queries
      await queryClient.cancelQueries({ queryKey: employeeKeys.detail(id) });

      // Get current cache
      const previousEmployee = queryClient.getQueryData<Employee>(
        employeeKeys.detail(id)
      );

      // Optimistically update UI
      queryClient.setQueryData(employeeKeys.detail(id), {
        ...previousEmployee,
        ...data,
      });

      return { previousEmployee };
    },

    onError: (_err, { id }, context) => {
      // Rollback on error
      if (context?.previousEmployee) {
        queryClient.setQueryData(
          employeeKeys.detail(id),
          context.previousEmployee
        );
      }
    },

    onSuccess: (updatedEmployee, { id }) => {
      // Ensure cache is in sync with server
      queryClient.setQueryData(employeeKeys.detail(id), updatedEmployee);
    },
  });
}
```

---

## BUG-012: Fluence Chat Tenant ID Mismatch

### Root Cause

**Two Different Storage Locations**:

```typescript
// fluence-chat.service.ts:11-15
// Reads from COOKIE
function getTenantId(): string | null {
  const match = document.cookie.match(/(?:^|;\s*)tenant_id=([^;]*)/);
  return match ? decodeURIComponent(match[1]) : null;
}

// client.ts:164-169
// Reads from LOCALSTORAGE
private getTenantId(): string | null {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('tenantId');
  }
  return null;
}
```

### When This Breaks

```
Scenario 1: Cookie-only implementation
- Backend sets tenant_id in Set-Cookie header after login
- Frontend reads from localStorage (returns null)
- Fluence chat works (finds cookie)
- Regular API calls fail (no X-Tenant-ID header)

Scenario 2: localStorage-only implementation (current)
- Frontend stores tenantId in localStorage after login
- Regular API calls work (reads from localStorage)
- Fluence chat fails (looks for cookie, finds nothing)
```

### Verification

```bash
# Check what's actually set after login:
JavaScript console:
> localStorage.getItem('tenantId')
"550e8400-e29b-41d4-a716-446655440000"

> document.cookie
"XSRF-TOKEN=xyz; Path=/; HttpOnly; Secure"
# ← No tenant_id cookie!
```

### Fix

**Option 1: Standardize on localStorage (Recommended)**
```typescript
// fluence-chat.service.ts - Fix to use localStorage instead
function getTenantId(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('tenantId');  // ← Match client.ts
}

// Also fix getCsrfToken to read from cookie (that's correct)
```

**Option 2: Store in Both Places**
```typescript
// After successful login (useAuth.ts)
login: async (credentials: LoginRequest) => {
  const response = await authApi.login(credentials);

  // Store in localStorage (for XHR requests)
  apiClient.setTenantId(response.tenantId);
  localStorage.setItem('tenantId', response.tenantId);

  // Also store in cookie (for fetch requests)
  // This requires backend to not set HttpOnly
  document.cookie = `tenant_id=${response.tenantId}; Path=/; SameSite=Strict`;

  // ... rest of login logic
}
```

### Recommended Implementation

**Best Practice: Consolidate to localStorage**
```typescript
// 1. Remove cookie attempt
// 2. Update fluence-chat.service.ts:

export async function streamFluenceChat(options: StreamChatOptions): Promise<void> {
  // ... existing code ...

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'Accept': 'text/event-stream',
  };

  // Use localStorage directly (not cookie)
  const tenantId = typeof window !== 'undefined'
    ? localStorage.getItem('tenantId')
    : null;

  if (tenantId) {
    headers['X-Tenant-ID'] = tenantId;
  }

  // ... rest of function ...
}
```

---

## Testing Verification

### How to Verify Each Bug

**BUG-001**: Payroll Period Endpoint
```bash
# Should return 404
curl -X GET "http://localhost:8080/api/v1/payroll/payslips/period?startDate=2026-01-01&endDate=2026-03-31" \
  -H "X-Tenant-ID: test-tenant" \
  -H "Authorization: Bearer $TOKEN"
# Expected: 404 Not Found
```

**BUG-003**: Recruitment Ambiguous Return
```bash
# Backend returns Page<Candidate>
curl -X GET "http://localhost:8080/api/v1/recruitment/candidates/job-opening/123" \
  -H "X-Tenant-ID: test-tenant" | jq '.'
# Output should show: { "content": [...], "totalPages": 2, ...}
# Not just: [...]
```

**BUG-005**: Token Refresh Race
```bash
# Simulate 3 concurrent requests with expired token
for i in {1..3}; do
  curl -X GET "http://localhost:8080/api/v1/employees" \
    -H "Authorization: Bearer expired_token" \
    -H "X-Tenant-ID: test" &
done
wait

# Should see single refresh attempt in logs, not 3
# Check server logs for: "Refresh token" messages
```

---

**End of Detailed Findings**
