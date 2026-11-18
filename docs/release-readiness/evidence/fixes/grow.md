G-001 | FIXED | frontend/app/learning/courses/[id]/page.tsx | quiz load moved from render-time call to a useEffect keyed on id (a 403 left quizzes empty and re-fired the call every render)
G-002 | FIXED | frontend/app/performance/goals/page.tsx, _components/goalConfig.ts | form unit/endDate now sent as measurementUnit/dueDate (backend + goals.due_date NOT NULL); edit prefill reads the same fields. Not run live
G-003 | PARTIAL | frontend/app/surveys/page.tsx | dialog now closes only on success (input kept, existing error toast shows). Root cause of the 400 DB_INTEGRITY_VIOLATION NOT found statically (DTO/entity/V0 table match); needs the backend log line "Data integrity violation detail"
G-004 | NEEDS-DECISION | - | /employees/search needs EMPLOYEE:VIEW_ALL/DEPARTMENT/TEAM; fix needs a new low-exposure participant lookup endpoint or a permission change
G-005 | NEEDS-DECISION | - | MANAGER lacks MEETING:VIEW/CREATE in role_permissions; needs a grant migration (V350+), RBAC policy call
G-006 | FIXED | frontend/app/performance/cycles/_components/CycleFormModal.tsx | inline error when review deadline is outside [start,end]; dialog already stays open on failure
G-007 | FIXED | frontend/app/performance/okr/_components/okrConfig.tsx | end date must not be before start date
G-008 | FIXED | frontend/app/performance/okr/_components/KeyResultProgressInput.tsx | value clamped to [start,target] before commit (Enter bypassed Mantine clamp)
G-009 | FIXED | backend/src/main/java/com/nulogic/domain/performance/Objective.java | COMPLETED no longer terminal when progress < 100 (reopens on next KR update; a manually completed objective with <100% also reopens). Backend not rebuilt
G-010 | SKIPPED | - | enrolment COMPLETED with 30% progress and 0 lessons is a data/backend consistency issue, not a UI rule
G-011 | SKIPPED | - | EnrollmentResponse has no course title; needs backend DTO enrichment
G-012 | PARTIAL | frontend/lib/hooks/useCompetency.ts | no retry on 4xx (3 calls -> 1); the single forbidden call and error card remain
G-013 | PARTIAL | frontend/lib/hooks/queries/useLearning.ts | no retry on 4xx (2 calls -> 1)
G-014 | NEEDS-DECISION | - | HR lacks LMS:CERTIFICATE_VIEW; RBAC grant migration (see V337 history: LMS widening is an open human decision)
G-015 | NEEDS-DECISION | - | MANAGER lacks LMS:COURSE_VIEW; same as G-014
G-016 | FIXED | frontend/app/wellness/admin/page.tsx | end-before-start refine plus field messages for negative points / max participants
G-017 | FIXED | frontend/app/wellness/admin/page.tsx | denied text is now an h1
G-018 | FIXED | frontend/app/one-on-one/page.tsx | both tab bars: type=button, role=tab/tablist, aria-selected
G-003 (update) | FIXED | backend/src/main/java/com/nulogic/application/survey/service/SurveyManagementService.java | removed manual survey.setId(UUID.randomUUID()): a preset id plus null @Version made save() merge a "detached" entity; id is generated (GenerationType.UUID) so it now persists. Goals/cycles/OKR/wellness create paths grep clean for the same pattern. Backend not rebuilt
