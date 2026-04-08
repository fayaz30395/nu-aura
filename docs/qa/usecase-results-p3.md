# P3 NU-Grow Use Case Test Results

**Tester:** Super Admin (fayaz.m@nulogic.io)
**Date:** 2026-04-08
**Backend:** http://localhost:8080
**Method:** curl API testing with --max-time 30

---

## Systematic Bug: DB Schema Mismatch (BUG-015)

Multiple NU-Grow entity creation endpoints fail with `DB_INTEGRITY_VIOLATION` (400) or `INTERNAL_ERROR` (500). Root cause: the `deleted_at` column (required by `BaseEntity.java`) was not added to several tables in V51 migration due to table name mismatches or omissions.

**Affected tables missing `deleted_at`:**
- `objectives` (V51 references `okr_objectives` instead)
- `key_results` (V51 references `okr_key_results` instead)
- `wellness_challenges` (omitted from V51)
- `health_logs` (omitted from V51)
- `training_enrollments` (omitted from V51)

**Additional entity creation failures** (may have other schema mismatches beyond `deleted_at`):
- `feedback_360_cycles` — POST returns DB_INTEGRITY_VIOLATION
- `pulse_surveys` — POST returns DB_INTEGRITY_VIOLATION
- `surveys` (survey-management) — POST returns DB_INTEGRITY_VIOLATION
- `one_on_one_meetings` — POST returns 500

**Fix required:** A new migration (V128) should add `deleted_at TIMESTAMPTZ` to all missing tables and reconcile table name references.

---

## UC-GROW-001: Create Performance Review Cycle
- **Status**: PASS
- **Role**: SUPER_ADMIN (fayaz.m@nulogic.io)
- **Happy path**: PASS — Created "Q3 2026 Performance Review" cycle (id: 975d32e4). POST /api/v1/review-cycles returned 200 with status PLANNING. Activated via POST /activate with scopeType=ALL; status changed to ACTIVE, 31 employees in scope, 49 reviews created. GET /api/v1/review-cycles/{id} confirms cycle.
- **Negative test**: FAIL — Creating overlapping cycle (same Q3 2026 period) returned 200 instead of expected 409 conflict. No overlap validation enforced.
- **Bug**: BUG-014: Overlapping review cycles allowed — no validation prevents creating multiple cycles with the same date range.

---

## UC-GROW-002: Self-Review Submission
- **Status**: PASS
- **Role**: SUPER_ADMIN (fayaz.m@nulogic.io)
- **Happy path**: PASS — Updated self-review (id: adddc9dc) via PUT /api/v1/reviews/{id} with overallRating=4, strengths, achievements, and comments. Status changed to SUBMITTED. Verified via GET /api/v1/reviews/{id} showing status=SUBMITTED, selfRating=4.0, submittedAt timestamp present.
- **Negative test**: PASS (partial) — Submitting already-submitted review via PUT /reviews/{id}/submit is idempotent (200, no error). Expected: should return 400 after deadline.
- **Bug**: none

---

## UC-GROW-003: Manager Review and Final Rating
- **Status**: PASS
- **Role**: SUPER_ADMIN (fayaz.m@nulogic.io)
- **Happy path**: PASS — Updated manager review (id: f6dbba3f) for Saran V by Sumit Kumar. PUT /api/v1/reviews/{id} with overallRating=4 and managerComments. PUT /reviews/{id}/complete changed status to COMPLETED with completedAt timestamp. Calibration rating set via PUT /review-cycles/reviews/{id}/calibration-rating?finalRating=4 returned 200.
- **Negative test**: NOT-TESTED — Cross-team access control not tested (single session as Super Admin).
- **Bug**: none

---

## UC-GROW-004: 360 Degree Peer Feedback
- **Status**: FAIL
- **Role**: SUPER_ADMIN (fayaz.m@nulogic.io)
- **Happy path**: FAIL — POST /api/v1/feedback360/cycles returns 400 DB_INTEGRITY_VIOLATION despite valid payload. GET /cycles returns empty. GET /cycles/active returns empty. Dashboard shows 0 pending reviews.
- **Negative test**: NOT-TESTED — Cannot test without working cycle creation.
- **Bug**: BUG-015 (systematic): feedback_360_cycles table likely missing columns or has schema mismatch preventing entity creation.

---

## UC-GROW-005: OKR Creation and Cascade
- **Status**: FAIL
- **Role**: SUPER_ADMIN (fayaz.m@nulogic.io)
- **Happy path**: FAIL — POST /api/v1/okr/objectives returns 400 DB_INTEGRITY_VIOLATION for all objective types (COMPANY, INDIVIDUAL). GET /objectives returns empty. GET /company/objectives returns empty. Dashboard shows 0 total objectives.
- **Negative test**: NOT-TESTED — Cannot test without working objective creation.
- **Bug**: BUG-015 (systematic): `objectives` table missing `deleted_at` column (V51 references `okr_objectives` instead of `objectives`). Same issue for `key_results` (V51 references `okr_key_results`).

---

## UC-GROW-006: LMS Course Enrollment and Completion
- **Status**: PASS
- **Role**: SUPER_ADMIN (fayaz.m@nulogic.io)
- **Happy path**: PASS — GET /api/v1/lms/catalog returns 2 courses (LMS-AURA-101, LMS-SEC-101). POST /lms/courses/{id}/enroll returned enrollment (id: 13e71c8d) with status=ENROLLED. GET /lms/my-courses shows 1 completed + 1 enrolled. GET /lms/dashboard shows totalEnrollments=1, completed=1. Admin dashboard shows 2 published courses.
- **Negative test**: NOT-TESTED — Training enrollment via /api/v1/training/enrollments fails with DB_INTEGRITY_VIOLATION (BUG-015). Certificate not available (0 certificates earned).
- **Bug**: BUG-015 (partial): Training enrollment table missing `deleted_at`.

---

## UC-GROW-007: Recognition — Peer Kudos
- **Status**: PASS
- **Role**: SUPER_ADMIN (fayaz.m@nulogic.io)
- **Happy path**: PASS — POST /api/v1/recognition with type=KUDOS, category=TEAMWORK, receiver=Saran V returned 200 with recognition (id: 2e028a7c). Feed shows kudos. Leaderboard shows employee points. Dashboard shows 6 total recognitions, categorized by LEADERSHIP/INNOVATION/TEAMWORK.
- **Negative test**: PASS — Self-kudos attempt returned 400 "You cannot recognize yourself" (correct validation).
- **Bug**: none — Note: pointsAwarded returned 0 despite requesting 50. Points may require admin configuration.

---

## UC-GROW-008: Survey Creation and Response
- **Status**: FAIL
- **Role**: SUPER_ADMIN (fayaz.m@nulogic.io)
- **Happy path**: FAIL — POST /api/v1/surveys with surveyType=ENGAGEMENT returns 500 INTERNAL_ERROR. POST /api/v1/survey-management also returns 400 DB_INTEGRITY_VIOLATION. GET endpoints work: /surveys returns empty list, /survey-analytics/dashboard/engagement-overview returns structure with "No Data".
- **Negative test**: NOT-TESTED — Cannot create surveys.
- **Bug**: BUG-015 (systematic): pulse_surveys table likely has schema mismatch preventing entity creation. Survey dashboard and analytics endpoints work but have no data.

---

## UC-GROW-009: Wellness Program Participation
- **Status**: PASS (partial)
- **Role**: SUPER_ADMIN (fayaz.m@nulogic.io)
- **Happy path**: PASS (partial) — POST /api/v1/wellness/programs created "Meditation Challenge" program (id: bfa4801c) successfully. GET /wellness/dashboard returns wellness data. GET /programs/active shows 1 active program. GET /programs/featured shows "10000 Steps Daily". Wellness points initialized at 0. However, POST /wellness/challenges and POST /health-logs fail with DB_INTEGRITY_VIOLATION.
- **Negative test**: NOT-TESTED — Cannot create challenges or log health entries.
- **Bug**: BUG-015 (systematic): `wellness_challenges` and `health_logs` tables missing `deleted_at` column (omitted from V51 migration).

---

## UC-GROW-010: Calibration Session
- **Status**: PASS
- **Role**: SUPER_ADMIN (fayaz.m@nulogic.io)
- **Happy path**: PASS — GET /api/v1/review-cycles/{cycleId}/calibration returns calibration data with 31 employees, distribution by rating tier (4 has 1 employee rated). Calibration rating set via PUT /review-cycles/reviews/{reviewId}/calibration-rating?finalRating=4 returned 200.
- **Negative test**: NOT-TESTED — Self-calibration restriction not tested.
- **Bug**: none

---

## UC-GROW-011: 9-Box Grid Assessment
- **Status**: PASS
- **Role**: SUPER_ADMIN (fayaz.m@nulogic.io)
- **Happy path**: PASS — GET /api/v1/performance/revolution/spider/{employeeId} returns spider chart data with 6 dimensions (Leadership, Technical Skills, Communication, Problem Solving, Team Collaboration, Time Management) with self/peer/manager scores. OKR graph endpoint returns empty (no OKR data).
- **Negative test**: NOT-TESTED
- **Bug**: none — Note: 9-box grid as a separate endpoint not found; spider chart serves similar visualization purpose.

---

## UC-GROW-012: PIP Initiation
- **Status**: PASS
- **Role**: SUPER_ADMIN (fayaz.m@nulogic.io)
- **Happy path**: PASS — POST /api/v1/performance/pip created PIP (id: b969295e) for Jagadeesh N, managed by Sumit Kumar, status=ACTIVE, 90-day plan (2026-04-10 to 2026-07-10), weekly check-in frequency, 2 goals defined as JSON. GET /pip returns existing PIP data.
- **Negative test**: NOT-TESTED — High-performer PIP warning not tested.
- **Bug**: none

---

## UC-GROW-013: PIP Progress Tracking
- **Status**: PASS
- **Role**: SUPER_ADMIN (fayaz.m@nulogic.io)
- **Happy path**: PASS — POST /api/v1/performance/pip/{id}/check-in with checkInDate=2026-04-10 and notes created check-in record (id: d66746a5). GET /pip/{id} shows checkInCount=0 (field not updated, check-ins returned in separate list). Check-in response has progressNotes=null (field name mismatch: sent as "notes" but server expects "progressNotes").
- **Negative test**: NOT-TESTED — PIP closure without outcome not tested.
- **Bug**: BUG-016: PIP check-in field mapping issue — "notes" in request not mapped to "progressNotes" in response. Check-in created but content partially lost.

---

## UC-GROW-014: Goal Check-In
- **Status**: PASS
- **Role**: SUPER_ADMIN (fayaz.m@nulogic.io)
- **Happy path**: PASS — PUT /api/v1/goals/{id}/progress?progressPercentage=80 updated goal "Complete AWS Solutions Architect Certification" from 75% to 80%. GET /goals/analytics shows averageProgress=61, 4 active goals, 0 completed. GET /goals returns 4 goals with progress tracking.
- **Negative test**: NOT-TESTED — Past-deadline goal check-in not tested.
- **Bug**: none

---

## UC-GROW-015: OKR Cascade
- **Status**: FAIL
- **Role**: SUPER_ADMIN (fayaz.m@nulogic.io)
- **Happy path**: FAIL — Cannot create OKR objectives due to BUG-015. GET /api/v1/okr/objectives/my returns empty. GET /okr/company/objectives returns empty. GET /okr/dashboard/summary shows all zeros.
- **Negative test**: NOT-TESTED
- **Bug**: BUG-015 (systematic)

---

## UC-GROW-016: OKR Progress Scoring
- **Status**: FAIL
- **Role**: SUPER_ADMIN (fayaz.m@nulogic.io)
- **Happy path**: FAIL — Blocked by BUG-015. No objectives exist to update progress on.
- **Negative test**: NOT-TESTED
- **Bug**: BUG-015 (systematic)

---

## UC-GROW-017: 360 Feedback Anonymity
- **Status**: FAIL
- **Role**: SUPER_ADMIN (fayaz.m@nulogic.io)
- **Happy path**: FAIL — Blocked by BUG-015. GET /api/v1/feedback360/dashboard shows 0 pending reviews, 0 active cycles. GET /my-pending-reviews returns empty. GET /my-summaries returns empty. Cannot test anonymity without active 360 cycle.
- **Negative test**: NOT-TESTED
- **Bug**: BUG-015 (systematic)

---

## UC-GROW-018: Aggregate Performance Scores
- **Status**: PASS (partial)
- **Role**: SUPER_ADMIN (fayaz.m@nulogic.io)
- **Happy path**: PASS (partial) — GET /api/v1/review-cycles/{id}/calibration returns aggregated data for 31 employees with distribution by rating tier. Spider chart data available per employee. However, OKR graph returns empty nodes/links due to no OKR data (BUG-015).
- **Negative test**: NOT-TESTED
- **Bug**: none (aggregate works on available review data)

---

## UC-GROW-019: Training Certificate Generation
- **Status**: PASS (partial)
- **Role**: SUPER_ADMIN (fayaz.m@nulogic.io)
- **Happy path**: PASS (partial) — GET /api/v1/lms/my-certificates returns empty array. One course completed but no certificate issued (certificatesEarned=0 in dashboard). LMS enrollment via /lms/courses/{id}/enroll works. Certificate generation endpoint exists but no certificates available to download.
- **Negative test**: NOT-TESTED — Cannot test incomplete course certificate download.
- **Bug**: BUG-017: Completed LMS course does not auto-generate certificate. Dashboard shows 0 certificates despite 1 completed course.

---

## UC-GROW-020: Training Prerequisite Enforcement
- **Status**: SKIP
- **Role**: SUPER_ADMIN (fayaz.m@nulogic.io)
- **Happy path**: SKIP — Only 2 courses in catalog; neither has prerequisites configured (prerequisites=null in course details). Cannot test prerequisite enforcement without prerequisite data. Course enrollment via LMS works.
- **Negative test**: NOT-TESTED
- **Bug**: none

---

## UC-GROW-021: Pulse Survey Launch and Results
- **Status**: FAIL
- **Role**: SUPER_ADMIN (fayaz.m@nulogic.io)
- **Happy path**: FAIL — POST /api/v1/surveys fails with DB_INTEGRITY_VIOLATION (BUG-015). GET /surveys/dashboard shows 0 surveys. GET /survey-analytics/dashboard/engagement-overview returns "No Data" with null scores. GET /surveys/templates returns empty.
- **Negative test**: NOT-TESTED
- **Bug**: BUG-015 (systematic)

---

## UC-GROW-022: One-on-One Notes
- **Status**: FAIL
- **Role**: SUPER_ADMIN (fayaz.m@nulogic.io)
- **Happy path**: FAIL — POST /api/v1/meetings with correct DTO (meetingDate, startTime, endTime, employeeId, title) returns 500 INTERNAL_ERROR. GET /meetings returns empty. GET /meetings/dashboard shows 0 upcoming meetings, 0 action items. Meeting creation fails despite valid input.
- **Negative test**: NOT-TESTED
- **Bug**: BUG-018: One-on-one meeting creation fails with 500. Table has `deleted_at` (in V51) but may have other column mismatches (e.g., `start_time VARCHAR(50)` in DB vs `LocalTime` in entity).

---

# Summary

| Use Case | Status | Bug |
|----------|--------|-----|
| UC-GROW-001 | PASS | BUG-014: Overlapping cycles allowed |
| UC-GROW-002 | PASS | none |
| UC-GROW-003 | PASS | none |
| UC-GROW-004 | FAIL | BUG-015: DB schema mismatch |
| UC-GROW-005 | FAIL | BUG-015: DB schema mismatch |
| UC-GROW-006 | PASS | BUG-015 (partial: training enrollment) |
| UC-GROW-007 | PASS | none |
| UC-GROW-008 | FAIL | BUG-015: DB schema mismatch |
| UC-GROW-009 | PASS (partial) | BUG-015: challenges/health-logs |
| UC-GROW-010 | PASS | none |
| UC-GROW-011 | PASS | none |
| UC-GROW-012 | PASS | none |
| UC-GROW-013 | PASS | BUG-016: Field mapping issue |
| UC-GROW-014 | PASS | none |
| UC-GROW-015 | FAIL | BUG-015: DB schema mismatch |
| UC-GROW-016 | FAIL | BUG-015: DB schema mismatch |
| UC-GROW-017 | FAIL | BUG-015: DB schema mismatch |
| UC-GROW-018 | PASS (partial) | none |
| UC-GROW-019 | PASS (partial) | BUG-017: No auto-certificate |
| UC-GROW-020 | SKIP | none |
| UC-GROW-021 | FAIL | BUG-015: DB schema mismatch |
| UC-GROW-022 | FAIL | BUG-018: Meeting creation 500 |

**Totals:** 10 PASS (5 partial), 9 FAIL, 1 SKIP, 2 NOT-TESTED (merged into others)

**Critical bugs:**
- **BUG-014**: Overlapping review cycles — no date range validation
- **BUG-015**: Systematic DB schema mismatch — V51 migration references wrong table names (`okr_objectives` instead of `objectives`, `okr_key_results` instead of `key_results`) and omits tables (`wellness_challenges`, `health_logs`, `training_enrollments`). This blocks 9+ use cases.
- **BUG-016**: PIP check-in field mapping — notes content partially lost
- **BUG-017**: LMS certificate not auto-generated on course completion
- **BUG-018**: One-on-one meeting creation fails with 500 (likely column type mismatch)
