# Fix Validation: [DEF-XX]

> Reusable checklist for the Validator Agent. Copy this template for each fix validation.

## Original Defect
- **Bug ID:**
- **Module:**
- **Route:**
- **Severity:** P0 / P1 / P2 / P3
- **Description:**
- **Reproduction steps:**

## Fix Applied
- **Developer:**
- **Commit:**
- **Files changed:**
- **Fix description:**

## Validation Steps

### 1. Reproduction Verification
- [ ] Original reproduction steps no longer trigger the bug
- [ ] Tested with the same role(s) that originally exposed the issue
- [ ] Tested with at least one additional role to confirm no role-specific regression

### 2. Happy Path
- [ ] Primary user flow still works end-to-end
- [ ] Expected data is returned and displayed correctly
- [ ] Success feedback (toast, redirect, state change) fires as expected

### 3. Error and Edge Cases
- [ ] Error states handled (network failure, 4xx, 5xx)
- [ ] Loading states present during async operations
- [ ] Empty states render correctly when no data exists
- [ ] Validation errors display for invalid input

### 4. RBAC Verification
- [ ] RBAC not weakened by the fix (permission level same or stricter)
- [ ] SuperAdmin still bypasses correctly
- [ ] Employee role correctly blocked from admin endpoints
- [ ] No new endpoints exposed without `@RequiresPermission`

### 5. Code Quality
- [ ] No TypeScript errors introduced (`npx tsc --noEmit`)
- [ ] No lint errors introduced (`npm run lint`)
- [ ] No console errors in browser DevTools
- [ ] No new `any` types in TypeScript
- [ ] No new Axios instances created
- [ ] Forms still use React Hook Form + Zod (if applicable)
- [ ] Data fetching still uses React Query (if applicable)

### 6. API Contract Alignment
- [ ] Request payload shape matches backend DTO
- [ ] Response shape matches frontend type definition
- [ ] HTTP method and URL path unchanged (or intentionally changed)
- [ ] Error response codes match frontend error handling

## Regression Check

### Adjacent Routes
- [ ] Related routes still functional (list routes checked: ___)
- [ ] Related components not broken (list components checked: ___)
- [ ] Shared services/hooks still work for other consumers

### Cross-Cutting Concerns
- [ ] Auth flow not disrupted (login, logout, session restore)
- [ ] Tenant isolation preserved (X-Tenant-ID still sent)
- [ ] CSRF token still attached to mutating requests
- [ ] Middleware route protection unchanged

### Backend Regression
- [ ] Related backend tests pass (`./mvnw test -pl backend -Dtest=<TestClass>`)
- [ ] No new Flyway migration conflicts
- [ ] No entity/repository signature changes that break other services

## Result

- [ ] **VALIDATED** -- fix is correct, complete, and regression-free
- [ ] **REJECTED** -- fix is incomplete or introduces regression

**Rejection reason (if applicable):** ___

**Validator:** ___
**Date:** ___
