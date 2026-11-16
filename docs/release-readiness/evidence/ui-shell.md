# UI shell (application chrome)

## Changed
- `frontend/components/layout/ToastHost.tsx` (new): the single toast host. Bottom-right on desktop (380px max), bottom-centre above the bottom nav on mobile, max 4 stacked, 5s default auto-dismiss, close button. Replaces top-right `<Notifications>` in `app/providers.tsx`, so toasts no longer cover headings or the top-bar avatar.
- `components/layout/shell/TopBar.tsx`: breadcrumb "Dashboard" (`/dashboard`) links fall back to `/me/dashboard` unless the user holds DASHBOARD:VIEW and ANALYTICS:VIEW.
- `components/layout/shell/TopBar.test.tsx` (new, 2 tests).
- `components/layout/shell/ProductRail.tsx`, `NavPanel.tsx`: removed glow shadows, brand-mark gradient and the gradient promo card (flat, no glow).

## Defects
1. "Access Denied" after login: not reproducible by plain login (arun lands on `/me/dashboard` with no toast). Cause found: `/dashboard` needs DASHBOARD:VIEW + ANALYTICS:VIEW; employees reach it via hard-coded "Dashboard" crumbs in many page files, notification fallback (`lib/utils/notificationRoutes.ts`), or a stale `returnUrl` from another role. AuthGuard then bounces with `?denied=1` (genuine, once). Shell crumb fix applied; the page-file crumbs and notificationRoutes fallback are outside my area.
2. Toast covering heading at 390px: fixed by ToastHost.
3. Avatar hidden by toasts: fixed (no top placement).

## Not changed (already present)
Cmd/Ctrl-K palette, theme toggle, collapsible panel, mobile drawer + bottom nav, product rail (kept: it is the 4-app switcher).
Note: `components/ui/Toast.tsx` error duration is 8000ms (outside my area; host default is 5000).

## Checks
tsc clean; vitest 2641/2641; lint:design-system at baseline.

## Screenshots (`screenshots/NU-SHELL-*.png`)
emp (arun) and hr (jagadeesh, HR_MANAGER; /employees/new is denied for that role so the form shot shows the redirect) at light/dark, 1440 and 390; `denied-toast-light-{1440,390}` shows the new toast position. Viewed 8 (incl. dark list, mobile list, dark profile form, both toast shots).
