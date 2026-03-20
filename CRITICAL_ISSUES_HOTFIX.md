# CRITICAL ISSUES - HOT FIX GUIDE

**Priority**: MUST FIX BEFORE PRODUCTION

---

## CRITICAL SEVERITY (Fix Immediately)

### BUG-001: Payroll Service - Missing Backend Endpoint
**File**: `frontend/lib/services/payroll.service.ts:149-159`

**Quick Fix - Remove Stub Method**:
```bash
# Delete these lines from payroll.service.ts:
# Lines 146-159 (getPayslipsByPeriod method)

# Update import: remove from types if used
grep -r "getPayslipsByPeriod" frontend/ --include="*.ts" --include="*.tsx"
# Update all callers to use getPayslipByEmployeeAndPeriod() instead
```

**Impact if not fixed**: Any page trying to show payslips by date range will crash with 404.

---

## HIGH SEVERITY (Fix this sprint)

### BUG-002: Payroll Bulk Processing - Missing Endpoints
**File**: `frontend/lib/services/payroll.service.ts:243-292`

**Quick Fix - Remove or Gate Behind Feature Flag**:
```typescript
// Option 1: Delete the entire block (lines 241-292)

// Option 2: Add feature flag
const BULK_PAYROLL_ENABLED = process.env.NEXT_PUBLIC_BULK_PAYROLL_ENABLED === 'true';

async bulkProcessPayroll(...) {
  if (!BULK_PAYROLL_ENABLED) {
    throw new Error('Bulk payroll processing is not yet available');
  }
  // ...
}
```

**Impact if not fixed**: Bulk import UI will fail if accessed.

---

### BUG-008: Payment Config - Mutation Cleanup Missing
**File**: `frontend/app/payments/config/page.tsx:93-119`

**Quick Fix - Add Component Unmount Guard**:
```typescript
// Line 51-55: Existing cleanup
const isMountedRef = useRef(true);

useEffect(() => {
  return () => {
    isMountedRef.current = false;
  };
}, []);

// Line 111-114: Add guard before setState
const onSubmit = async (data: ConfigFormData) => {
  try {
    // ... existing code ...
    await saveConfigMutation.mutateAsync(request);

    if (!isMountedRef.current) return;  // ← ADD THIS

    setSavedMessage(`${paymentService.getProviderLabel(data.provider)} configuration saved successfully!`);
  } catch (error) {
    if (!isMountedRef.current) return;  // ← ADD THIS

    const message = error instanceof Error ? error.message : 'Failed to save configuration';
    setErrorMessage(message);
  }
};
```

**Time to fix**: 5 minutes
**Impact if not fixed**: React warnings in console, potential memory leaks during navigation.

---

### BUG-012: Fluence Chat - Tenant ID Not Sent
**File**: `frontend/lib/services/fluence-chat.service.ts:11-15`

**Quick Fix - Change Cookie to localStorage**:
```typescript
// Line 11-15: Change from:
function getTenantId(): string | null {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(/(?:^|;\s*)tenant_id=([^;]*)/);
  return match ? decodeURIComponent(match[1]) : null;
}

// To:
function getTenantId(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('tenantId');  // ← Match client.ts behavior
}
```

**Time to fix**: 2 minutes
**Impact if not fixed**: Fluence chat requests sent without tenant ID, causing 403 or cross-tenant data issues.

---

## MEDIUM SEVERITY (Fix before final QA)

### BUG-003: Recruitment - Duplicate Methods with Type Mismatch
**File**: `frontend/lib/services/recruitment.service.ts:75-87`

**Quick Fix - Consolidate Methods**:
```bash
# Step 1: Remove getCandidatesByJob (line 84-87)
# Step 2: Verify getCandidatesByJobOpening is typed as Page<Candidate>
# Step 3: Find all callers:
grep -r "getCandidatesByJob\|getCandidatesByJobOpening" frontend/ --include="*.ts" --include="*.tsx"

# Step 4: Update callers to handle pagination:
// Before:
const candidates = await recruitmentService.getCandidatesByJob(jobId);

// After:
const result = await recruitmentService.getCandidatesByJobOpening(jobId);
const candidates = result.content;
```

---

### BUG-004: Leave Approval - Misleading API Contract
**File**: `frontend/lib/services/leave.service.ts:113-126`

**Quick Fix - Remove Unused Parameters**:
```typescript
// Line 113-126: Update from:
async approveLeaveRequest(
  id: string,
  approverId: string,  // ← Not used
  comments?: string     // ← Not stored
): Promise<LeaveRequest> {
  const response = await apiClient.post<LeaveRequest>(
    `/leave-requests/${id}/approve`,
    null,
    { params: { approverId, comments } }
  );
  return response.data;
}

// To:
async approveLeaveRequest(id: string): Promise<LeaveRequest> {
  const response = await apiClient.post<LeaveRequest>(
    `/leave-requests/${id}/approve`
  );
  return response.data;
}

// Then update all callers:
// Before:
await leaveService.approveLeaveRequest(id, approverId, comments);

// After:
await leaveService.approveLeaveRequest(id);
```

---

### BUG-005: Token Refresh - Race Condition Possible
**File**: `frontend/lib/api/client.ts:98-104`

**Quick Fix - Add Atomic Guard**:
```typescript
// Line 118-134: Update redirectToLogin() method:
private redirectToLogin(): void {
  if (isRedirecting) return;

  isRedirecting = true;
  this.clearTokens();

  if (redirectResetTimer) clearTimeout(redirectResetTimer);
  redirectResetTimer = setTimeout(() => {
    isRedirecting = false;
    redirectResetTimer = null;
  }, REDIRECT_DEBOUNCE_MS);

  if (typeof window !== 'undefined') {
    // Use Promise to defer navigation (helps prevent multiple redirects)
    Promise.resolve().then(() => {
      if (isRedirecting) {
        window.location.href = '/auth/login?reason=expired';
      }
    });
  }
}
```

---

### BUG-009: Employee Edit - No Error UI
**File**: `frontend/app/employees/[id]/edit/page.tsx`

**Quick Fix - Add Error Toast**:
```typescript
// Add at top of file after imports:
import { useToast } from '@/components/ui/Toast';  // or whatever your toast component is

// Inside component:
const toast = useToast();

// In existing catch blocks (multiple places):
try {
  // ... existing code ...
} catch (err: unknown) {
  const message = err instanceof Error ? err.message : 'An error occurred';
  toast.error(message);  // ← ADD THIS LINE
}
```

---

### BUG-011: React Query - Over-Invalidation
**File**: `frontend/lib/hooks/queries/useEmployees.ts:161-165`

**Quick Fix - Remove Overzealous Invalidation**:
```typescript
// Line 161-165: Change from:
onSettled: (_, _error, { id }) => {
  queryClient.invalidateQueries({ queryKey: employeeKeys.detail(id) });
  queryClient.invalidateQueries({ queryKey: employeeKeys.lists() });  // ← Remove this
};

// To:
onSettled: (_, _error, { id }) => {
  // Only invalidate the specific employee detail
  queryClient.invalidateQueries({
    queryKey: employeeKeys.detail(id),
    exact: true
  });
  // List will refresh naturally on next navigation or via other means
};
```

---

## MINOR/ACCEPTABLE ISSUES

### BUG-006: Auth Hydration Race
- **Status**: Monitor, not critical for MVP
- **Mitigation**: All protected routes check `hasHydrated` before rendering

### BUG-007: CSRF Token Bootstrap
- **Status**: Acceptable behavior
- **Note**: No CSRF token cookie exists at login time (correct behavior)

### BUG-010: Null Safety Inconsistency
- **Status**: Code works correctly
- **Note**: Low priority refactoring

---

## DEPLOYMENT CHECKLIST

- [ ] **BUG-001**: Remove `getPayslipsByPeriod()` stub or implement endpoint
- [ ] **BUG-002**: Remove bulk processing stubs or gate behind feature flag
- [ ] **BUG-008**: Add isMountedRef checks in payment config page
- [ ] **BUG-012**: Change fluence chat tenant ID from cookie to localStorage
- [ ] **BUG-003**: Consolidate recruitment candidate methods
- [ ] **BUG-004**: Remove unused parameters from leave approval service
- [ ] **BUG-005**: Add Promise.resolve() defer to redirect
- [ ] **BUG-009**: Add error toast to employee edit page
- [ ] **BUG-011**: Remove list invalidation from employee update mutation
- [ ] Run full regression test
- [ ] Test on production-like environment

---

## VERIFICATION COMMANDS

```bash
# Find all callers of stub methods (to update them)
grep -r "getPayslipsByPeriod\|bulkProcessPayroll\|getBulkProcessingStatus\|previewBulkProcessing" frontend/ --include="*.ts" --include="*.tsx"

# Check for getCandidatesByJob usages
grep -r "getCandidatesByJob" frontend/ --include="*.ts" --include="*.tsx"

# Check for approveLeaveRequest with 3 parameters
grep -r "approveLeaveRequest.*,.*," frontend/ --include="*.ts" --include="*.tsx"

# Verify fixes applied
grep -n "isMountedRef\|exact: true\|Promise.resolve" frontend/lib/services/fluence-chat.service.ts frontend/app/payments/config/page.tsx frontend/lib/hooks/queries/useEmployees.ts
```

---

## TIMELINE

**Critical (Today)**:
- Remove payroll stubs or implement endpoints: **1 hour**
- Fix payment mutation cleanup: **30 min**
- Fix fluence chat tenant ID: **15 min**

**High (Tomorrow)**:
- Consolidate recruitment methods: **1 hour**
- Add error toasts: **1 hour**

**Total Effort**: ~4 hours

---

**Status**: Ready for implementation
**Last Updated**: March 20, 2026
