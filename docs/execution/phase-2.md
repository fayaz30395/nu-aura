# Phase 2: Payments Module Hardening (Feature-Flag and Hide)

**Date:** 2026-03-19
**Strategy:** Option A -- feature-flag the payments module and hide it from the UI until the payment gateway integration is production-ready.

---

## Problem Statement

The payments module (Razorpay / Stripe gateway integration) exists in both backend and frontend but is not yet production-ready. Exposing unfinished payment endpoints and UI in production creates risk:

- Webhook endpoints accept external traffic with no real signature verification
- Payment gateway adapters (`StripeAdapter`, `RazorpayAdapter`) are stubs/mocks
- No idempotency, retry, or reconciliation logic in place

The module must be completely gated so no traffic can reach it until it is ready.

---

## Changes Made

### Backend

#### 1. Static configuration kill-switch (`application.yml`)

Added under the `app:` namespace:

```yaml
app:
  payments:
    enabled: ${PAYMENTS_ENABLED:false}
```

This is a **deployment-time** kill-switch independent of the database-level feature flags. Default is `false`.

#### 2. `FeatureDisabledException` (new)

**File:** `backend/src/main/java/com/hrms/common/exception/FeatureDisabledException.java`

A new exception class for feature-disabled scenarios. Carries the feature name for logging/metrics.

#### 3. `GlobalExceptionHandler` handler (updated)

**File:** `backend/src/main/java/com/hrms/common/exception/GlobalExceptionHandler.java`

New handler maps `FeatureDisabledException` to **HTTP 503 Service Unavailable** with error code `FEATURE_DISABLED`. Includes structured logging and Micrometer metrics under the `feature` / `feature_disabled` category.

#### 4. `PaymentFeatureGuard` (new)

**File:** `backend/src/main/java/com/hrms/common/security/PaymentFeatureGuard.java`

Spring `@Component` that reads `app.payments.enabled` from config. Provides:

- `requirePaymentsEnabled()` -- throws `FeatureDisabledException` if disabled
- `isEnabled()` -- boolean check for conditional logic

#### 5. Payment controllers guarded (updated)

All three payment controllers now have **two layers of protection**:

| Layer | Mechanism | Response |
|-------|-----------|----------|
| AOP (existing) | `@RequiresFeature(FeatureFlag.ENABLE_PAYMENTS)` | 403 Forbidden (DB feature flag) |
| Imperative (new) | `paymentFeatureGuard.requirePaymentsEnabled()` | 503 Service Unavailable (config kill-switch) |

**Files modified:**

- `backend/.../api/payment/controller/PaymentController.java` -- all 5 endpoints guarded
- `backend/.../api/payment/controller/PaymentWebhookController.java` -- all endpoints guarded (including health check)
- `backend/.../api/payment/controller/PaymentConfigController.java` -- both endpoints guarded

### Frontend

#### 6. Environment variable

Added `NEXT_PUBLIC_PAYMENTS_ENABLED=false` to:

- `frontend/.env.example` (documented)
- `frontend/.env.local` (set to false)

#### 7. Sidebar navigation hidden

**File:** `frontend/components/layout/menuSections.tsx`

The "Payments" menu item under "Pay & Finance" is conditionally included only when `NEXT_PUBLIC_PAYMENTS_ENABLED === 'true'`. When false, the item is omitted from the sidebar entirely.

#### 8. Page-level redirects

**Files:**

- `frontend/app/payments/page.tsx`
- `frontend/app/payments/config/page.tsx`

Both pages redirect to `/dashboard` when `NEXT_PUBLIC_PAYMENTS_ENABLED` is not `'true'`. This prevents direct URL access even if the nav item is hidden.

---

## How to Re-enable Payments

When the payment gateway integration is production-ready:

1. **Backend:** Set `PAYMENTS_ENABLED=true` in environment variables (or K8s secret)
2. **Database:** Enable the `enable_payments` feature flag for the target tenant(s) via the admin panel or direct DB update
3. **Frontend:** Set `NEXT_PUBLIC_PAYMENTS_ENABLED=true` in the deployment environment
4. Rebuild and deploy

Both backend layers (config + DB feature flag) must be enabled for payments to work.

---

## Files Changed Summary

| File | Action |
|------|--------|
| `backend/src/main/resources/application.yml` | Added `app.payments.enabled` property |
| `backend/.../common/exception/FeatureDisabledException.java` | **Created** |
| `backend/.../common/exception/GlobalExceptionHandler.java` | Added 503 handler |
| `backend/.../common/security/PaymentFeatureGuard.java` | **Created** |
| `backend/.../api/payment/controller/PaymentController.java` | Injected guard, added checks |
| `backend/.../api/payment/controller/PaymentWebhookController.java` | Injected guard, added checks |
| `backend/.../api/payment/controller/PaymentConfigController.java` | Injected guard, added checks |
| `frontend/.env.example` | Added `NEXT_PUBLIC_PAYMENTS_ENABLED` |
| `frontend/.env.local` | Added `NEXT_PUBLIC_PAYMENTS_ENABLED=false` |
| `frontend/components/layout/menuSections.tsx` | Conditional payment nav item |
| `frontend/app/payments/page.tsx` | Feature-flag redirect |
| `frontend/app/payments/config/page.tsx` | Feature-flag redirect |
| `docs/execution/phase-2.md` | **Created** (this file) |

---

## Risk Assessment

- **Low risk:** All changes are additive or gating. No existing functionality is removed.
- **Rollback:** Set `PAYMENTS_ENABLED=true` and `NEXT_PUBLIC_PAYMENTS_ENABLED=true` to restore previous behavior.
- **No migration needed:** No database schema changes.
