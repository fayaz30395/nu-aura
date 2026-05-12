# Frontend auth hooks

NU-AURA's auth surface is split across 5 hooks in `frontend/lib/hooks/`. They're intentionally separate — each addresses a distinct concern. Audited and confirmed during P3c of the 2026-05-13 repo layout cleanup.

## `useAuth.ts` (342 lines)

**Purpose:** Zustand store for the user/auth state machine. Single source of truth for "who is signed in".

**Responsibilities:**
- `login`, `googleLogin`, `logout` actions
- Persist user to a separate `nu-aura-user` sessionStorage key (workaround for HMR + Zustand partialize quirk)
- Hydrate from sessionStorage on page load
- Expose `user`, `isAuthenticated`, `hasHydrated`
- `refreshSession` action (delegates to `apiClient.post('/auth/refresh')`)

**When to use:** Reading `user`, triggering login/logout, gating UI on auth state.

## `useAuthStatus.ts` (111 lines)

**Purpose:** Verify the current session is still valid by calling the backend. Tokens are httpOnly cookies, so JS can't introspect them — we must round-trip.

**When to use:** Before critical operations, on app foreground, or when you suspect cookie expiry.

**Distinct from `useAuth`** because `useAuth` is local state; `useAuthStatus` is server truth.

## `usePermissions.ts` (779 lines)

**Purpose:** Permission constants (matching backend `Permission.java`) + check helpers (`hasPermission`, `hasAnyPermission`, `hasAllPermissions`).

**When to use:** Anywhere you need to gate UI on a `MODULE:ACTION` permission.

**Distinct from `useAuth`** because permissions are derived from roles loaded server-side and cached in Redis; the constants list is a contract with the backend.

## `useSessionTimeout.ts` (225 lines)

**Purpose:** Inactivity-based logout (30 min default). Watches mouse/keyboard/scroll/touch activity. Warns at 25 min, logs out at 30 min.

**When to use:** Mount once at the app root. Defends against unattended sessions.

**Distinct from `useTokenRefresh`** because this is about user attention, not token lifetime — even if the token is fresh, idle sessions are a risk.

## `useTokenRefresh.ts` (82 lines)

**Purpose:** Proactively refresh the access token cookie every 50 minutes (it expires at 60). Also refreshes on window focus and visibility change.

**When to use:** Mount once at the app root.

**Distinct from `useAuth.refreshSession`** because this fires *automatically* on a timer; `useAuth.refreshSession` is invoked on demand.

**Distinct from `useSessionTimeout`** because this keeps the token fresh; the timeout logs out regardless.

## Why keep them separate?

- **Single Responsibility:** Each hook has one reason to change. Merging them would create a god-hook with five entry points.
- **Defense in depth:** Inactivity timeout + proactive refresh + backend verify are independent layers. A bug in one doesn't break the others.
- **Mount semantics:** `useSessionTimeout` and `useTokenRefresh` mount once at app root; `useAuth` is consumed everywhere; `usePermissions` is per-render. Different lifecycles.
- **Test surface:** Smaller files are easier to test. `usePermissions.test.ts` already exists; the others can grow tests independently.

## Decision

No consolidation. Each hook stays. This document is the source of truth for the boundary.
