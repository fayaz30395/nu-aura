# FINAL PRODUCTION READINESS PROMPT

**Objective:** Transform the current HRMS into a 100% production-ready, bug-free MVP. Focus on integration, type safety, and the final 10% of features.

## 1. Recruitment ATS Finalization
- **The Gap:** `frontend/app/recruitment/page.tsx` is currently a redirect.
- **Task:** Build a high-impact Recruitment Dashboard at `/recruitment` using the existing large sub-pages (`/jobs`, `/candidates`) as data sources. Show "Active Openings," "Recent Applications," and "Interviews Today."

## 2. Type-Safe Integration
- **Command:** Run `cd frontend && npx tsc --noEmit`.
- **Task:** Fix every single TypeScript error. Ensure the new `ApprovalInbox` and `AdminDashboard` use the actual backend-generated types from `frontend/lib/types/`. 
- **Consistency:** Ensure `zod` schemas for recruitment forms match the backend DTO constraints exactly.

## 3. Security Check (SuperAdmin Bypass Validation)
- **Frontend:** Verify `middleware.ts` correctly detects the `SUPER_ADMIN` string in the JWT and allows navigation to `/admin`.
- **Backend:** Ensure `CustomPermissionEvaluator.java` is correctly wired into `MethodSecurityExpressionHandler`.
- **Audit:** Scan all new Controllers in `api/recruitment/`, `api/approvals/`, and `api/admin/`. Every endpoint MUST have `@PreAuthorize("hasPermission(..., '...')")` to prevent data leaks.

## 4. UI/UX Final Polish
- **Framer Motion:** Add entry animations (fade-in/slide-up) to every new module using the patterns in `AGENT_E_UI_POLISH.md`.
- **Empty States:** Ensure selecting a non-existent ID in the Approval Inbox shows a clean `EmptyState` component.
- **Error Boundaries:** Wrap the Recruitment and Admin modules in `nextjs` error boundaries to prevent app-wide crashes.

## 5. Performance & Build
- **Scan:** Run `npm run build` in the frontend and `mvn clean install` in the backend.
- **Fix:** Any build-time warnings (missing keys in lists, unused imports, serial version ID issues) must be resolved.

**When complete, perform a "Smoke Test" of these 3 flows:**
1. Login as **SuperAdmin**, visit `/admin`, and successfully change a user's role.
2. Submit a Recruitment application and verify it shows up in the **Recruitment Tracker**.
3. Submit a leave request and verify it appears in the **Unified Approval Inbox**.

*Ready? Let's ship this.*
