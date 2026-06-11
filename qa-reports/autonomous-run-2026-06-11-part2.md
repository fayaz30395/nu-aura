# NU-AURA Autonomous Run (Part 2) — End Report 2026-06-11
Live only: frontend hrms-frontend-vert.vercel.app · backend nu-aura-backend-production.up.railway.app. Model: Fable.

## ✅ Achieved & verified live
1. **Kafka durable** — root-running custom image (`FROM apache/kafka:3.7.1; USER root`) + volume at `/var/lib/kafka/data`. Persists across restarts (`uid=0(root)`, "Kafka Server started", no write error). Solved the bitnami/apache non-root volume-permission wall.
2. **Redis-backed everything** (cache, rate-limit, lockout) — verified.
3. **Comprehensive audit workflow (18 agents): overall PASS.** No Critical/High/Medium security issues. RBAC correct across all 8 roles (no privilege escalation in 144 checks), tenant isolation holds, JWT/IDOR/injection/CORS/headers all defended. Findings were Info-level + 2 functional (below).
4. **HR_MANAGER + HR_ADMIN letters RBAC** — granted `LETTER:TEMPLATE_VIEW`+`ISSUE` (live DB + migration V288). Closes the audit's RBAC gap.
5. **Notification PERSISTENCE core bug FIXED** — notifications table was empty system-wide. Root cause: `ApprovalNotificationListener` is `@TransactionalEventListener(AFTER_COMMIT)`; its `createNotification` ran with no active tx (plain `@Transactional` no-ops post-commit) so inserts never committed. Fix: `createNotification` → `@Transactional(REQUIRES_NEW)` (commit `c57d2ccb`). **Verified: a notification now persists** (table 0→1 on leave submit). Also wired persistence into `application` `WebSocketNotificationService.sendToUser` (commit `810cd95e`).
6. **Deploy pipeline understood** — earlier deploy failures were a **compile error** (wrong `NotificationMessage` class in the domain package — no inner enums), NOT OOM/overlap as first theorized (empty runtime logs were because the build never produced a container). Fixed commit `9999f804`/`810cd95e`. Overlap deploys at 75% heap work fine.

## ⚠️ Remaining (well-scoped, next session)
- **Notification recipient id mismatch (SYSTEMIC — root cause confirmed).** Notifiers pass **employee ids** where the notification system expects **user ids**. Proven: leave-submit persisted a TASK_ASSIGNED with `user_id = 48000000-e001-…005` (gokul's EMPLOYEE id), but the controller queries `getUnreadCount(SecurityContext.getCurrentUserId())` = gokul's USER id `48000000-0e02-…005` → he sees 0. This breaks BOTH the persisted bell AND real-time WS delivery (the STOMP user-principal is the USER id, so `convertAndSendToUser(employeeId,…)` reaches nobody). Affects every flow: `ApprovalNotificationListener` (createNotification with `assignedToUserId` that holds an employee id) and `LeaveRequestService.notifyLeaveApproved/Rejected/Submitted` (`sendToUser(employeeId,…)`). **Fix:** resolve employee_id → users.user_id at notification dispatch (or have the events carry user ids). Cross-cutting across all notifiers — do as a focused, tested change, not blind. This is THE remaining blocker for usable notifications; persistence itself now works.
- **Audit functional findings:** `/employees` `search` param is ignored (no filtering); minor PII masking on `/employees/me` bank/tax fields; CSP could add `base-uri`/`form-action`/`object-src`. All code changes (deployable now that the pipeline works).

## Notes
- An external process (ruflo/freeze daemon) reverts UNcommitted edits to HEAD and deletes new untracked files — all fixes had to be committed to stick. Backend HEAD: `c57d2ccb`.
- JAVA_TOOL_OPTIONS back to MaxRAMPercentage=75 (proven). Demo mode stays ON per user.
- Both apps healthy at report time (backend /readiness UP, frontend 200).
