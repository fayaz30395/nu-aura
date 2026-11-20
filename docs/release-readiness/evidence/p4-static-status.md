Static code reading only; nothing was run. Verify UNCLEAR and STILL OPEN rows in the browser.

Scope: P4 NU-Grow bugs G-001 to G-018 from `ui-bugs-p4.md`, judged against `main` at `54110ec1`. Fix commits: `16d80143`, `e0840b21`, `c9ee9e54` (migration `V350`), `818a7405`, `8bd65698`.

| ID | Verdict | Evidence | Reason |
|---|---|---|---|
| G-001 | FIXED | `frontend/app/learning/courses/[id]/page.tsx:62-71` (`16d80143`) | Quiz fetch moved from a render-time call to a `useEffect` keyed on `[id, courseLoaded]`; a 403 no longer re-fires it. |
| G-002 | FIXED-LIVE | `performance/goals/page.tsx` `handleSave` (`16d80143`) | Known live-verified: sends `measurementUnit`/`dueDate`. |
| G-003 | FIXED | `SurveyManagementService.java` (`e0840b21`, removed `survey.setId(UUID.randomUUID())`); `frontend/app/surveys/page.tsx` (`16d80143`) | Backend preset-id merge bug removed, and the dialog now closes only on success. `fixes/verify.md` also records a live 201, but I did not re-judge that. |
| G-004 | FIXED-LIVE | `818a7405` (`/meetings/participants/search`) | Known live-verified. |
| G-005 | FIXED | `V350__release_readiness_view_grants_and_default_offer_template.sql:23-24` (`c9ee9e54`) | Grants MANAGER `MEETING:VIEW` and `MEETING:CREATE` (TEAM) to all tenants. `routes.ts:967` needs either. Depends on V350 having run on the DB. |
| G-006 | FIXED | `performance/cycles/_components/CycleFormModal.tsx:27-30` (`16d80143`) | Zod refine rejects a review deadline outside the cycle dates with an inline error on `reviewDeadline`, so no server 400 and the dialog stays open. |
| G-007 | FIXED | `performance/okr/_components/okrConfig.tsx:32-35` (`16d80143`) | Schema refine: end date must not be before start date. |
| G-008 | FIXED | `performance/okr/_components/KeyResultProgressInput.tsx:31-32` (`16d80143`) | Value clamped to the min/max range before commit, so 150 becomes 100. This is UI-only; the backend `progress?value=` endpoint was not checked for a cap. |
| G-009 | STILL OPEN | `backend/.../domain/performance/Objective.java:126-130` (`8bd65698`) | `16d80143` made COMPLETED reopen when progress drops below 100, but `8bd65698` reverted it ("COMPLETED is sticky"). Lowering a key result leaves the badge COMPLETED. |
| G-010 | STILL OPEN | `learning/courses/[id]/page.tsx:141,404-408` | The page shows the enrolment `progressPercentage`, `status` and "Processing your certificate..." as returned. No code reconciles COMPLETED at 30% with 0 lessons. It is a data inconsistency, and `fixes/grow.md` marks it SKIPPED. |
| G-011 | STILL OPEN | `training/my-learning/page.tsx:165` and `CourseEnrollmentController.java:86` (`c9ee9e54`) | Course title is now shown (that part is fixed). Completed at 30% progress is still rendered unchanged (same data issue as G-010). |
| G-012 | FIXED | `competency-matrix/_components/MyCompetenciesTab.tsx` (`c9ee9e54`); `hooks/useCompetency.ts:198-205` | Skill-gap query is disabled and the panel hidden without `EMPLOYEE:READ`, which matches the backend `@RequiresPermission(EMPLOYEE_READ)` in `LmsController.java:296`. |
| G-013 | FIXED | `performance/revolution/page.tsx:46` (`c9ee9e54`) | `useSkillGaps` enabled only with `EMPLOYEE:READ`. |
| G-014 | FIXED | `V350...sql:26-27` (`c9ee9e54`) | Grants HR_MANAGER and HR_ADMIN `LMS:CERTIFICATE_VIEW`, which the page gate (`learning/certificates/page.tsx:46`) checks. Depends on V350 having run. |
| G-015 | FIXED | `V350...sql:25` (`c9ee9e54`) | Grants MANAGER `LMS:COURSE_VIEW`, which `routes.ts:302` and the paths page gate check. Depends on V350 having run. |
| G-016 | FIXED | `wellness/admin/page.tsx:54-64,337-362` (`16d80143`) | Schema now has an end-before-start refine and messages for negative points and max participants, and each is rendered under its field. |
| G-017 | FIXED | `wellness/admin/page.tsx:627` (`16d80143`) | The denied text is now an `<h1>`. |
| G-018 | FIXED | `one-on-one/page.tsx:644-648,1685-1695` (`16d80143`) | Both tab bars now use `type="button"`, `role="tab"`, `role="tablist"` and `aria-selected`. |
