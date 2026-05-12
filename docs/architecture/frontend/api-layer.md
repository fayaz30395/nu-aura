# Frontend API layer

The `frontend/lib/` tree splits HTTP plumbing from business orchestration along two boundaries.

## `lib/api/` — raw HTTP transport

What lives here:

- Direct `axios` (or fetch) calls
- Request/response shape mapping (DTO ↔ TS type)
- Auth header attachment via `client.ts`
- HTTP-level error normalisation

What does NOT live here:

- Application state mutation
- Cross-resource orchestration (e.g. "create user, then assign role, then notify")
- React Query hooks (those live in `lib/hooks/queries/`)
- Permission gating

If you need to import `axios` outside `lib/api/`, use the typed client in `lib/api/client.ts` instead.

## `lib/services/` — business orchestration

What lives here:

- Multi-call workflows that sit on top of `lib/api/` modules
- Caching/memoisation of computed values
- Domain transforms (date calculations, currency formatting bound to a model, etc.)
- WebSocket / streaming clients (`websocket.ts`)
- Anything with a `*.service.ts` filename convention

Service files name themselves `<domain>.service.ts` (e.g. `applicant.service.ts`, `payroll.service.ts`).

## `lib/hooks/` — React-bound integration

- `queries/*` — React Query hooks wrapping a service call
- `useAuth`, `useAuthStatus`, `usePermissions`, etc. — auth-aware hooks
- Domain hooks like `useEmployee`, `useDashboard`

Hooks consume services; services consume `lib/api/`. The opposite direction is forbidden.

## `lib/utils/` — pure helpers

- `cn` (tailwind class merge), formatters, type guards, sanitisers
- No HTTP calls, no React context, no global state
- Re-exports happen via `lib/utils/index.ts`

## `lib/theme/` — design system tokens + Mantine theme

- `design-system.ts` — typography, spacing, motion, iconSize, chartColors, card/layout/input style fragments
- `mantine-theme.ts` — Mantine theme override
- `theme-script.ts` — initial-theme inline script for FOUC prevention

## Boundary summary

```
components / app
       ↓
lib/hooks/         (React-aware)
       ↓
lib/services/      (business orchestration)
       ↓
lib/api/           (raw HTTP)
```

`lib/utils/`, `lib/theme/`, `lib/types/`, `lib/constants/`, `lib/validations/`, `lib/contexts/` are leaves anyone may import.

A future ESLint rule (planned but not yet implemented in `eslint-plugin-nu-aura/`) will enforce: "axios imports outside `lib/api/` are an error."
