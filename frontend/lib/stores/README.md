# Zustand Stores — Cross-Route UI State

Slices live here when state crosses routes and doesn't belong in React Query
(server state) or React Hook Form (form state).

## Convention

- **Slice per file.** One store per file, named `useXxxStore.ts`.
- **`use<Domain>Store` naming.** e.g. `useUiStore`, `useNotificationStore`.
- **Persist sparingly.** Only state that should survive a hard reload. Use the
  `persist` middleware with an explicit `name` namespaced under `nu-aura-*`.
- **Actions inside the store.** Expose `setX` / `toggleX`; don't mutate from
  the outside.
- **Don't put it here if it's:**
  - Server state → use React Query (`lib/hooks/queries`)
  - Form state → use React Hook Form
  - Single-component state → use `useState`
  - Auth/session → already in `lib/hooks/useAuth`

## Current slices

| Slice                  | Persisted                                            | Purpose                                                                 |
|------------------------|------------------------------------------------------|-------------------------------------------------------------------------|
| `useUiStore`           | `sidebarCollapsed`, `adminSidebarCollapsed`          | User-app + admin shell sidebar collapse, mobile nav, command palette    |
| `useThemeStore`        | `mode` (light / dark / system)                       | Theme preference (legacy key `nu-aura-theme`, raw-string for FOUC script) |
| `useNotificationStore` | none                                                 | Notification panel open/close (forward-looking)                         |

## Adding a slice

1. Drop `useXxxStore.ts` in this directory.
2. Type the state + actions.
3. If persisting, use `persist` with `name: 'nu-aura-<domain>'`.
4. Add a row to the table above.
