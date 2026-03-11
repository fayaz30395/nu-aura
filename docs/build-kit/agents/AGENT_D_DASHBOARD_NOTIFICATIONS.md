# 🤖 Agent D — Dashboard KPIs + Notification Bell
**Priority: HIGH | Est. Time: 4 hours**
**Paste this entire prompt into a Cursor Composer session.**

---

You are working on an existing production HRMS codebase.

- Frontend: `frontend/` — Next.js 14, TypeScript, Mantine UI, Tailwind, Zustand, React Query, Axios
- Backend: `backend/` — Java Spring Boot monolith, Kafka for events
- Key reference files: `CLAUDE.md`, `MEMORY.md`, `docs/build-kit/10_EVENT_DRIVEN_ARCHITECTURE.md`

**Read these files first before writing any code:**
- `CLAUDE.md` — coding rules and stack
- `MEMORY.md` — architecture decisions
- `frontend/app/dashboards/page.tsx` — existing dashboard (find hardcoded numbers)
- Any existing notification component in `frontend/components/`

---

## Your Tasks

### Task 1: Wire Dashboard KPIs to Real API

Open `frontend/app/dashboards/page.tsx` (or wherever the main home dashboard is). Find any hardcoded numbers in KPI cards — things like `headcount: 142` or `presentToday: 87`. Replace them all with real data:

**Create backend endpoint `GET /api/v1/analytics/summary`** returning:
```json
{
  "totalEmployees": 0,
  "presentToday": 0,
  "onLeaveToday": 0,
  "pendingApprovals": 0,
  "payrollProcessedThisMonth": false,
  "openPositions": 0
}
```

**Create `frontend/lib/hooks/useAnalytics.ts`** — React Query `useQuery` hook calling this endpoint with `staleTime: 5 * 60 * 1000` (5 minutes).

Replace all hardcoded dashboard values with data from this hook. Show Mantine `Skeleton` while loading.

### Task 2: Notification Bell — Frontend

Find the main header/navbar component (`frontend/components/` or inside the layout). The notification bell icon must:

1. Call `GET /api/v1/notifications/inbox?limit=10&status=UNREAD` using React Query with `refetchInterval: 30000`.
2. Show a red badge with the unread count. If 0, show no badge.
3. On click, open a Mantine `Popover` showing the last 10 notifications. Each item shows:
   - Icon (based on type: 📋 Leave, 💸 Expense, ✅ Approval)
   - Message text
   - Time ago (use `date-fns` `formatDistanceToNow` — it's already in `package.json`)
4. Bottom of popover: "Mark all as read" link → calls `PUT /api/v1/notifications/read-all` → invalidates the query.

### Task 3: Notification Bell — Backend

Find or create `NotificationController.java`:

**GET `/api/v1/notifications/inbox`**
- Returns paginated `notification_log` records for the current user
- Filterable by `status` (UNREAD/READ)

**PUT `/api/v1/notifications/read-all`**
- Updates all `notification_log` rows for the current user to `status = READ`

### Task 4: Kafka Consumer (Backend)

In the backend Kafka consumer layer, ensure the `NotificationService` creates a `notification_log` record when it receives these events:
- `leave.requested` → Message: "{requester} applied for {type} leave from {start} to {end}"
- `expense.submitted` → Message: "{requester} submitted an expense of {amount} for approval"
- `approval.task.assigned` → Message: "You have a pending {entityType} approval request from {requester}"

If the Kafka consumer already exists, verify these three events are handled. If not, create them.

### Task 5: Verify
- Run `cd frontend && npx tsc --noEmit`. Fix ALL TypeScript errors in files you touched.
- Do NOT touch: `app/admin/`, `app/recruitment/`, `app/approvals/`, `app/leave/`, `app/attendance/`.
