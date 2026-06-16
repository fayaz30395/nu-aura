---
title: Frontend Components — Inventory, State & Providers
tags: [frontend, components, state-management, zustand, react-query, mantine]
---

# Frontend Components — Inventory, State & Providers

## Purpose

Inventory of the **170** React components under `frontend/components/`, organized
by feature area, plus the shared UI primitive library, the state-management split
([[#State management]] — Zustand for client/identity/UI, TanStack Query for
server state), the realtime `WebSocketContext`, and the custom-hook catalog.
Companion to [[Routes]] (route map) and [[Pages]] (layout + guard logic).

## Context

**Measured** (`find frontend/components -name '*.tsx' | wc -l` and per-dir
counts, run for this doc):

| Metric | Count |
|--------|-------|
| Total components (`*.tsx` under `components/`) | **170** |
| `use*` hook files (whole frontend) | **127** |
| Domain query hooks (`lib/hooks/queries/*`) | **93** |
| Service wrappers (`lib/services/*`) | **226** |
| Zustand stores (`lib/stores/*`) | **3** (+ tests) |
| React contexts (`lib/contexts/*`) | **1** (`WebSocketContext`) |

### Components by feature area (measured per-dir)

| Area | Count | Examples |
|------|-------|----------|
| `ui/` (shared primitives) | **43** | `Button`, `Card`, `Modal`, `Select`, `Input`, `Tabs`, `ResponsiveTable`, `StatCard`, `EmptyState`, `Toast`, `ConfirmDialog`, `FileUpload`, `AdvancedFilterPanel`, `ErrorBoundary`, `AccessibleFormField` |
| `fluence/` ([[Nu-Fluence]]) | **30** | `RichTextEditor`, `WikiPageTree`, `ContentViewer`, `InlineComments`, `MentionInput`, `FluenceChatWidget`, `ChatSourceCard`, `FileUploader`, `MacroRenderer`, `TableOfContents`, `SpacePermissionsDrawer` |
| `layout/` (app shell) | **16** | `AppLayout`, `Header`, `GlobalSearch`, `NotificationDropdown`, `UserMenu`, `menuSections`, `Breadcrumbs`, `DarkModeProvider`, `MantineThemeProvider`, `AdminPageContent`, `AppLandingHero`, + `shell/` (`ProductRail`, `NavPanel`, `TopBar`, `CommandPalette`, `shellConfig`) |
| `dashboard/` | **13** | dashboard widgets / cards |
| `charts/` (Recharts) | **11** | chart wrappers |
| `resource-management/` (PSA) | **10** | allocation / resourcing UI |
| `auth/` | **7** | `AuthGuard`, `PermissionGate`, `FeatureGate`, `MfaSetup`, `MfaVerification` |
| `integrations/` | **5** | connector config UI |
| `wall/` ([[Nu-Fluence]] social) | **4** | feed, reactions |
| `motion/` (Framer Motion) | **4** | animation primitives |
| `recruitment/` ([[Nu-Hire]]) | **3** | |
| `projects/` · `performance/` · `notifications/` · `errors/` | 3 each | |
| `platform/` · `payroll/` · `expenses/` · `custom-fields/` · `admin/` | 2 each | |
| `training/` · `employee/` | 1 each | |

> No root-level `components/*.tsx` files — everything is grouped by feature area
> (matches the "organize by surface area, not file type" convention).

## Dependencies

- **UI**: Mantine 9 (`@mantine/core`, `@mantine/notifications`) + Tailwind 3.4.
- **Server state**: TanStack Query v5 (`lib/queryClient.ts` singleton).
- **Client state**: Zustand 5 (`lib/hooks/useAuth.ts`, `lib/stores/*`).
- **Forms**: React Hook Form + Zod. **HTTP**: Axios (`lib/api/client.ts`).
- **Rich text**: Tiptap (`fluence/RichTextEditor`). **Charts**: Recharts.
- **Motion**: Framer Motion. **DnD**: `@hello-pangea/dnd` (recruitment kanban).
- **Realtime**: STOMP + SockJS (`lib/contexts/WebSocketContext.tsx`).
- **Generated API**: Orval (`lib/generated/api/*`, gitignored) via `orval-mutator`.

## Diagram — Component dependency map

```mermaid
graph LR
  subgraph Shell["layout/ — app shell"]
    AppLayout --> ProductRail
    AppLayout --> NavPanel
    AppLayout --> TopBar
    AppLayout -.lazy.-> CommandPalette
    AppLayout -.lazy.-> FluenceChatWidget
    NavPanel --> menuSections
    TopBar --> GlobalSearch
    TopBar --> NotificationDropdown
    TopBar --> UserMenu
  end

  subgraph Gating["auth/"]
    AuthGuard --> usePermissions
    PermissionGate --> usePermissions
    FeatureGate --> useFeatureFlag
  end

  subgraph UI["ui/ (43 primitives)"]
    Button & Card & Modal & Select & ResponsiveTable & StatCard
  end

  subgraph Domain["feature areas"]
    Fluence["fluence/ (30)"] --> RichTextEditor
    Dashboard["dashboard/ (13)"] --> Charts["charts/ (11)"]
    Recruitment["recruitment/ (3)"]
    Resource["resource-management/ (10)"]
  end

  Page["app/**/page.tsx"] --> AppLayout
  Page --> Gating
  Page --> Domain
  Domain --> UI
  Domain --> Queries["lib/hooks/queries/* (93)"]
  Queries --> RQ["TanStack Query (singleton)"]
  RQ --> Orval["lib/generated/api/*"]
  Orval --> Mutator["orval-mutator → apiClient (Axios)"]
  Mutator --> Backend["/api/v1 (proxy → backend)"]
  WS["WebSocketContext (STOMP/SockJS)"] --> NotificationDropdown
  Stores["Zustand: useAuth · useUiStore · useThemeStore · useNotificationStore"] --> Shell
```

## State management

**Two distinct lanes** — server state never duplicated into client stores.

### Client / identity / UI — Zustand

| Store | File | Holds |
|-------|------|-------|
| Auth | `lib/hooks/useAuth.ts` | `user`, `isAuthenticated`, `isLoading`, `hasHydrated`; actions `login`/`googleLogin`/`logout`/`restoreSession`. `persist` middleware; user mirrored to `sessionStorage` `nu-aura-user`. |
| UI | `lib/stores/useUiStore.ts` | sidebar/modal state |
| Theme | `lib/stores/useThemeStore.ts` | dark mode |
| Notifications | `lib/stores/useNotificationStore.ts` | in-app notifications |

### Server state — TanStack Query

`lib/queryClient.ts` singleton (`getQueryClient()`); domain hooks in
`lib/hooks/queries/*` (**93**) wrap Orval-generated hooks; `lib/services/*`
(**226**) are thin domain wrappers, not a separate data layer. `queryClient.clear()`
on logout wipes cached server state. See [[APIs]] · [[Services]] · [[Data-Flows]].

### Realtime — context

`lib/contexts/WebSocketContext.tsx`: STOMP-over-SockJS keyed on
`isAuthenticated`/`user`; exposes `notifications`, `unreadCount`, `markAsRead`,
and approval-task callbacks consumed by `NotificationDropdown`.

## Provider stack

Assembled in `frontend/app/providers.tsx` (full chain documented in [[Pages]]):
`ErrorBoundary → GoogleOAuthProvider → QueryClientProvider → ToastProvider (ui)
→ NotificationsToastProvider → DarkModeProvider → MantineThemeProvider →
Notifications → WebSocketProvider → TokenRefreshManager → AuthGuard → children`.

## Custom hooks (127 `use*` files)

- **Auth/RBAC**: `useAuth`, `useAuthStatus`, `usePermissions`, `useActiveApp`,
  `useFeatureFlag`, `useSamlConfig`.
- **Session lifecycle**: `useTokenRefresh`, `useSessionTimeout`,
  `useUnsavedChanges`, `useUnsavedChangesWarning`.
- **Domain query hooks** (93 in `lib/hooks/queries/`): `useEmployees`,
  `useApprovals`, `useDashboards`, `useAttendance`, `useExpenses`,
  `useContracts`, `useAgency`, `useCompensation`, `useEsignature`, …
- **Utility**: `useDebounce`, `useAnimation`, `useAriaAnnounce` (a11y live
  region), `useOrgChart`, `usePreloadData`, `useBiometric`, `useFluenceChat`.

## Related Links

- [[Routes]] — route map · [[Pages]] — layouts, guards, data fetching
- [[APIs]] · [[Services]] — backend contract these hooks call
- [[Permissions]] · [[Roles]] · [[RBAC-Matrix]] — `usePermissions` / gating
- [[Data-Flows]] · [[System-Flows]] — request lifecycle, WebSocket fan-out
- [[Test-Coverage]] — component + RBAC test sweep
- [[Nu-HRMS]] · [[Nu-Hire]] · [[Nu-Grow]] · [[Nu-Fluence]] · [[Shared-Platform]]
- [[System-Overview]] · [[C4-Container]] · [[C4-Component]] · [[00-Home]]

## Risks

- **226 service wrappers vs 93 query hooks vs generated Orval**: three layers of
  indirection over the API. Thin wrappers can drift or duplicate; verify a
  service isn't shadowing a generated hook before adding logic.
- **`lib/generated/api/*` is gitignored** — regenerated from
  `openapi-snapshot.json` / live `/v3/api-docs`. A stale snapshot means
  components compile against an outdated contract ([[APIs]]).
- **Mantine + Tailwind dual styling**: two systems in play; uncoordinated tokens
  risk visual drift (the repo enforces a compact desktop-first sizing baseline).
- **Heavy client libs** (Tiptap, Recharts, Framer Motion, SockJS): bundle weight;
  `AppLayout` lazy-loads `CommandPalette` and `FluenceChatWidget` to mitigate.
- **WebSocket lifecycle** keyed on auth — reconnect/cleanup correctness matters
  for multi-tab and post-refresh scenarios.

## Operational Notes

- Recount: `find frontend/components -name '*.tsx' | wc -l` (170);
  per-area: pipe through `sed`/`awk` on the first path segment.
- Component tests live beside sources (`Button.test.tsx`, `Stat.test.tsx`,
  `StatusBadge.test.tsx`, `Callout.test.tsx`, store/hook `.test.ts`).
- `shell/CommandPalette.tsx` and `fluence/FluenceChatWidget.tsx` are lazy
  imports in `AppLayout` — expect them absent from the initial chunk.
- Dev ports: frontend 3000, backend 8080.
