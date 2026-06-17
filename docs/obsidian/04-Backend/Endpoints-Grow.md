---
title: NU-Grow Endpoint Catalog — Per-Method
tags: [backend, api, endpoints, rest, catalog, nu-grow]
---

# NU-Grow Endpoint Catalog — Per-Method

> Per-method companion to [[Controller-Index]] and [[APIs]] for the [[Nu-Grow]] sub-app
> (performance, OKRs, LMS, surveys, recognition, wellness). Where [[APIs]] gives base-path
> orientation, this note enumerates **every handler** of all 18 NU-Grow controllers: HTTP
> verb, full path (class `@RequestMapping` base + method path), `@RequiresPermission`, and a
> short purpose. Evidence-based from source, 2026-06-17.

## Counts

| Metric | Count |
|--------|-------|
| Controllers covered | **18** |
| Total endpoints | **231** |

Per-domain: performance 8 controllers / 89 endpoints · lms 3 / 35 · training 1 / 12 ·
survey 2 / 24 · recognition 1 / 14 · engagement 2 / 42 · wellness 1 / 15.

> All paths require an authenticated JWT and carry a `@RequiresPermission` (the
> `PermissionAspect` enforces authn + authz); `SUPER_ADMIN` bypasses the aspect. No NU-Grow
> endpoint is public.

---

### Feedback360Controller

Base path: `/api/v1/feedback360` · package `api/performance`

| Verb | Path | Permission | Purpose |
|---|---|---|---|
| POST | `/api/v1/feedback360/cycles` | `FEEDBACK_360_MANAGE` | Create 360 cycle |
| GET | `/api/v1/feedback360/cycles` | `FEEDBACK_360_VIEW` | List cycles (paged) |
| GET | `/api/v1/feedback360/cycles/active` | `FEEDBACK_360_VIEW` | List active cycles |
| GET | `/api/v1/feedback360/cycles/{id}` | `FEEDBACK_360_VIEW` | Get cycle by id |
| PUT | `/api/v1/feedback360/cycles/{id}` | `FEEDBACK_360_MANAGE` | Update cycle |
| POST | `/api/v1/feedback360/cycles/{id}/activate` | `FEEDBACK_360_MANAGE` | Activate cycle |
| POST | `/api/v1/feedback360/cycles/{id}/close` | `FEEDBACK_360_MANAGE` | Close cycle |
| DELETE | `/api/v1/feedback360/cycles/{id}` | `FEEDBACK_360_MANAGE` | Delete cycle |
| POST | `/api/v1/feedback360/cycles/{cycleId}/requests` | `FEEDBACK_360_CREATE` | Nominate reviewer request |
| GET | `/api/v1/feedback360/cycles/{cycleId}/requests` | `FEEDBACK_360_MANAGE` | List cycle requests |
| GET | `/api/v1/feedback360/my-pending-reviews` | `FEEDBACK_360_VIEW` | My pending reviews |
| POST | `/api/v1/feedback360/requests/{requestId}/approve` | `FEEDBACK_360_MANAGE` | Approve nomination |
| POST | `/api/v1/feedback360/responses` | `FEEDBACK_360_SUBMIT` | Submit feedback response |
| GET | `/api/v1/feedback360/responses/{requestId}` | `FEEDBACK_360_VIEW` | Get response by request |
| POST | `/api/v1/feedback360/cycles/{cycleId}/summaries/{subjectEmployeeId}/generate` | `FEEDBACK_360_MANAGE` | Generate subject summary |
| GET | `/api/v1/feedback360/cycles/{cycleId}/summaries` | `FEEDBACK_360_MANAGE` | List cycle summaries |
| GET | `/api/v1/feedback360/my-summaries` | `FEEDBACK_360_VIEW` | My shared summaries |
| POST | `/api/v1/feedback360/summaries/{summaryId}/share` | `FEEDBACK_360_MANAGE` | Share summary with employee |
| GET | `/api/v1/feedback360/dashboard` | `FEEDBACK_360_VIEW` | 360 dashboard stats |

### FeedbackController

Base path: `/api/v1/feedback` · package `api/performance`

| Verb | Path | Permission | Purpose |
|---|---|---|---|
| POST | `/api/v1/feedback` | `FEEDBACK_CREATE` | Give feedback |
| GET | `/api/v1/feedback/{id}` | `REVIEW_VIEW` | Get feedback by id |
| GET | `/api/v1/feedback/received/{employeeId}` | `REVIEW_VIEW` | List received feedback |
| GET | `/api/v1/feedback/given/{employeeId}` | `REVIEW_VIEW` | List given feedback |
| PUT | `/api/v1/feedback/{id}` | `FEEDBACK_UPDATE` | Update feedback |
| DELETE | `/api/v1/feedback/{id}` | `FEEDBACK_DELETE` | Delete feedback |

### GoalController

Base path: `/api/v1/goals` · package `api/performance`

| Verb | Path | Permission | Purpose |
|---|---|---|---|
| POST | `/api/v1/goals` | `GOAL_CREATE` | Create goal |
| GET | `/api/v1/goals` | `GOAL_VIEW` | List all goals (paged) |
| GET | `/api/v1/goals/{id}` | `GOAL_VIEW` | Get goal by id |
| GET | `/api/v1/goals/employee/{employeeId}` | `GOAL_VIEW` | List employee goals |
| GET | `/api/v1/goals/employee/{employeeId}/paged` | `GOAL_VIEW` | List employee goals (paged) |
| GET | `/api/v1/goals/team/{managerId}` | `GOAL_VIEW` | List team goals |
| GET | `/api/v1/goals/team/{managerId}/paged` | `GOAL_VIEW` | List team goals (paged) |
| GET | `/api/v1/goals/analytics` | `GOAL_VIEW` | Goal completion analytics |
| PUT | `/api/v1/goals/{id}` | `GOAL_UPDATE` | Update goal |
| PUT | `/api/v1/goals/{id}/progress` | `GOAL_UPDATE` | Update goal progress |
| DELETE | `/api/v1/goals/{id}` | `GOAL_DELETE` | Delete goal |
| PUT | `/api/v1/goals/{id}/approve` | `GOAL_APPROVE` | Approve goal |

### OkrController

Base path: `/api/v1/okr` · package `api/performance`

| Verb | Path | Permission | Purpose |
|---|---|---|---|
| POST | `/api/v1/okr/objectives` | `OKR_CREATE` | Create objective + key results |
| GET | `/api/v1/okr/objectives` | `OKR_VIEW` | List objectives (filtered, paged) |
| GET | `/api/v1/okr/objectives/my` | `OKR_VIEW` | My objectives |
| GET | `/api/v1/okr/objectives/{id}` | `OKR_VIEW` | Get objective by id |
| PUT | `/api/v1/okr/objectives/{id}` | `OKR_UPDATE` | Update objective |
| PUT | `/api/v1/okr/objectives/{id}/status` | `OKR_UPDATE` | Update objective status |
| POST | `/api/v1/okr/objectives/{id}/approve` | `OKR_APPROVE` | Approve objective |
| DELETE | `/api/v1/okr/objectives/{id}` | `OKR_DELETE` | Delete objective |
| POST | `/api/v1/okr/objectives/{objectiveId}/key-results` | `OKR_UPDATE` | Add key result |
| GET | `/api/v1/okr/objectives/{objectiveId}/key-results` | `OKR_VIEW` | List key results |
| PUT | `/api/v1/okr/key-results/{id}` | `OKR_UPDATE` | Update key result |
| PUT | `/api/v1/okr/key-results/{id}/progress` | `OKR_UPDATE` | Update KR progress + check-in |
| DELETE | `/api/v1/okr/key-results/{id}` | `OKR_DELETE` | Delete key result |
| POST | `/api/v1/okr/check-ins` | `OKR_UPDATE` | Create manual check-in |
| GET | `/api/v1/okr/objectives/{objectiveId}/check-ins` | `OKR_VIEW` | List objective check-ins |
| GET | `/api/v1/okr/key-results/{keyResultId}/check-ins` | `OKR_VIEW` | List key result check-ins |
| GET | `/api/v1/okr/dashboard/summary` | `OKR_VIEW` | OKR dashboard summary |
| GET | `/api/v1/okr/company/objectives` | `OKR_VIEW_ALL` | Company-level objectives |

### PerformanceReviewController

Base path: `/api/v1/reviews` · package `api/performance`

| Verb | Path | Permission | Purpose |
|---|---|---|---|
| POST | `/api/v1/reviews` | `REVIEW_CREATE` | Create review |
| GET | `/api/v1/reviews` | `REVIEW_VIEW` | List all reviews (paged) |
| GET | `/api/v1/reviews/{id}` | `REVIEW_VIEW` | Get review by id |
| GET | `/api/v1/reviews/employee/{employeeId}` | `REVIEW_VIEW` | List employee reviews |
| GET | `/api/v1/reviews/employee/{employeeId}/paged` | `REVIEW_VIEW` | List employee reviews (paged) |
| GET | `/api/v1/reviews/pending/{reviewerId}` | `REVIEW_VIEW` | Reviewer pending reviews |
| GET | `/api/v1/reviews/pending/{reviewerId}/paged` | `REVIEW_VIEW` | Pending reviews (paged) |
| PUT | `/api/v1/reviews/{id}` | `REVIEW_UPDATE` | Update review |
| PUT | `/api/v1/reviews/{id}/submit` | `REVIEW_SUBMIT` | Submit review for approval |
| PUT | `/api/v1/reviews/{id}/complete` | `REVIEW_APPROVE` | Complete (approve) review |
| DELETE | `/api/v1/reviews/{id}` | `REVIEW_DELETE` | Delete review |
| DELETE | `/api/v1/reviews/competencies/{id}` | `REVIEW_DELETE` | Delete competency |
| POST | `/api/v1/reviews/competencies` | `REVIEW_CREATE` | Add competency |
| GET | `/api/v1/reviews/{reviewId}/competencies` | `REVIEW_VIEW` | List review competencies |

### PerformanceRevolutionController

Base path: `/api/v1/performance/revolution` · package `api/performance`

| Verb | Path | Permission | Purpose |
|---|---|---|---|
| GET | `/api/v1/performance/revolution/okr-graph` | `OKR_VIEW` | OKR alignment graph |
| GET | `/api/v1/performance/revolution/spider/{employeeId}` | `REVIEW_VIEW` | Performance spider chart |

### PIPController

Base path: `/api/v1/performance/pip` · package `api/performance`

| Verb | Path | Permission | Purpose |
|---|---|---|---|
| POST | `/api/v1/performance/pip` | `PIP_CREATE` | Create improvement plan |
| GET | `/api/v1/performance/pip/{id}` | `PIP_VIEW` | Get PIP by id |
| GET | `/api/v1/performance/pip` | `PIP_VIEW` | List PIPs (filtered, paged) |
| POST | `/api/v1/performance/pip/{id}/check-in` | `PIP_MANAGE` | Record PIP check-in |
| PUT | `/api/v1/performance/pip/{id}/close` | `PIP_MANAGE` | Close PIP |

### ReviewCycleController

Base path: `/api/v1/review-cycles` · package `api/performance`

| Verb | Path | Permission | Purpose |
|---|---|---|---|
| POST | `/api/v1/review-cycles` | `REVIEW_CREATE` | Create review cycle |
| GET | `/api/v1/review-cycles` | `REVIEW_VIEW` | List cycles (paged) |
| GET | `/api/v1/review-cycles/{id}` | `REVIEW_VIEW` | Get cycle by id |
| GET | `/api/v1/review-cycles/active` | `REVIEW_VIEW` | List active cycles |
| PUT | `/api/v1/review-cycles/{id}` | `REVIEW_UPDATE` | Update cycle |
| DELETE | `/api/v1/review-cycles/{id}` | `REVIEW_DELETE` | Delete cycle |
| PUT | `/api/v1/review-cycles/{id}/complete` | `REVIEW_APPROVE` | Complete cycle |
| POST | `/api/v1/review-cycles/{id}/activate` | `REVIEW_APPROVE` | Activate cycle with scope |
| POST | `/api/v1/review-cycles/{id}/advance` | `REVIEW_APPROVE` | Advance cycle stage |
| GET | `/api/v1/review-cycles/{id}/calibration` | `REVIEW_VIEW` | Get calibration data |
| PUT | `/api/v1/review-cycles/reviews/{reviewId}/self-assessment` | `REVIEW_SUBMIT` | Submit self-assessment |
| PUT | `/api/v1/review-cycles/reviews/{reviewId}/manager-review` | `REVIEW_SUBMIT` | Submit manager review |
| PUT | `/api/v1/review-cycles/reviews/{reviewId}/calibration-rating` | `REVIEW_APPROVE` | Set final calibration rating |

### LmsController

Base path: `/api/v1/lms` · package `api/lms`

| Verb | Path | Permission | Purpose |
|---|---|---|---|
| GET | `/api/v1/lms/catalog` | `TRAINING_VIEW` / `LMS_COURSE_VIEW` | Course catalog |
| GET | `/api/v1/lms/courses` | `TRAINING_VIEW` / `LMS_COURSE_VIEW` | List/search courses |
| GET | `/api/v1/lms/courses/published` | `TRAINING_VIEW` / `LMS_COURSE_VIEW` | List published courses |
| GET | `/api/v1/lms/courses/{id}` | `TRAINING_VIEW` / `LMS_COURSE_VIEW` | Get course by id |
| POST | `/api/v1/lms/courses` | `LMS_COURSE_MANAGE` | Create course |
| PUT | `/api/v1/lms/courses/{id}` | `LMS_COURSE_MANAGE` | Update course |
| POST | `/api/v1/lms/courses/{id}/publish` | `LMS_COURSE_MANAGE` | Publish course |
| POST | `/api/v1/lms/courses/{id}/archive` | `LMS_COURSE_MANAGE` | Archive course |
| DELETE | `/api/v1/lms/courses/{id}` | `LMS_COURSE_MANAGE` | Delete course |
| POST | `/api/v1/lms/courses/{courseId}/quizzes` | `LMS_COURSE_MANAGE` | Create quiz |
| GET | `/api/v1/lms/courses/{courseId}/quizzes` | `LMS_COURSE_MANAGE` | List course quizzes |
| PUT | `/api/v1/lms/quizzes/{quizId}` | `LMS_COURSE_MANAGE` | Update quiz |
| DELETE | `/api/v1/lms/quizzes/{quizId}` | `LMS_COURSE_MANAGE` | Delete quiz |
| POST | `/api/v1/lms/quizzes/{quizId}/questions` | `LMS_COURSE_MANAGE` | Add quiz question |
| GET | `/api/v1/lms/quizzes/{quizId}/questions` | `LMS_COURSE_MANAGE` | List quiz questions |
| PUT | `/api/v1/lms/questions/{questionId}` | `LMS_COURSE_MANAGE` | Update question |
| DELETE | `/api/v1/lms/questions/{questionId}` | `LMS_COURSE_MANAGE` | Delete question |
| POST | `/api/v1/lms/quizzes/{quizId}/reorder-questions` | `LMS_COURSE_MANAGE` | Reorder questions |
| POST | `/api/v1/lms/progress/{enrollmentId}/content/{contentId}` | `LMS_ENROLL` | Update content progress |
| GET | `/api/v1/lms/progress/{enrollmentId}` | `LMS_ENROLL` | Get enrollment progress |
| GET | `/api/v1/lms/my-certificates` | `LMS_COURSE_VIEW` | My certificates |
| GET | `/api/v1/lms/certificates/verify/{certificateNumber}` | `TRAINING_VIEW` / `LMS_COURSE_VIEW` | Verify certificate |
| GET | `/api/v1/lms/dashboard` | `LMS_COURSE_VIEW` | My LMS dashboard |
| GET | `/api/v1/lms/admin/dashboard` | `LMS_COURSE_MANAGE` | Admin LMS dashboard |
| GET | `/api/v1/lms/employees/{employeeId}/skill-gaps` | `EMPLOYEE_READ` | Employee skill-gap report |

### QuizController

Base path: `/api/v1/lms/quizzes` · package `api/lms`

| Verb | Path | Permission | Purpose |
|---|---|---|---|
| GET | `/api/v1/lms/quizzes/{quizId}` | `LMS_COURSE_VIEW` | Quiz details (student view) |
| POST | `/api/v1/lms/quizzes/{quizId}/start` | `LMS_COURSE_VIEW` | Start quiz attempt |
| POST | `/api/v1/lms/quizzes/attempts/{attemptId}/submit` | `LMS_COURSE_VIEW` | Submit quiz attempt |
| GET | `/api/v1/lms/quizzes/{quizId}/attempts` | `LMS_COURSE_VIEW` | Quiz attempt history |
| POST | `/api/v1/lms/quizzes/enrollments/{enrollmentId}/certificate` | `LMS_COURSE_VIEW` | Generate certificate |

### CourseEnrollmentController

Base path: `/api/v1/lms` · package `api/lms` · gated by feature flag `ENABLE_LMS`

| Verb | Path | Permission | Purpose |
|---|---|---|---|
| POST | `/api/v1/lms/courses/{courseId}/enroll` | `LMS_ENROLL` | Enroll in course |
| PUT | `/api/v1/lms/enrollments/{enrollmentId}/progress` | `LMS_ENROLL` | Update enrollment progress |
| GET | `/api/v1/lms/my-courses` | `LMS_COURSE_VIEW` | My enrollments |
| GET | `/api/v1/lms/courses/{courseId}/enrollments` | `LMS_COURSE_MANAGE` | Course enrollments (admin) |
| GET | `/api/v1/lms/courses/{courseId}/enrollments/stats` | `LMS_COURSE_MANAGE` | Course completion stats |

### TrainingManagementController

Base path: `/api/v1/training` · package `api/training`

| Verb | Path | Permission | Purpose |
|---|---|---|---|
| POST | `/api/v1/training/programs` | `TRAINING_CREATE` | Create training program |
| PUT | `/api/v1/training/programs/{programId}` | `TRAINING_UPDATE` | Update program |
| GET | `/api/v1/training/programs/{programId}` | `TRAINING_VIEW` | Get program by id |
| GET | `/api/v1/training/programs` | `TRAINING_VIEW` | List programs (paged) |
| GET | `/api/v1/training/programs/status/{status}` | `TRAINING_VIEW` | List programs by status |
| DELETE | `/api/v1/training/programs/{programId}` | `TRAINING_DELETE` | Delete program |
| POST | `/api/v1/training/enrollments` | `TRAINING_ENROLL` | Enroll employee |
| POST | `/api/v1/training/enrollments/{enrollmentId}/complete` | `TRAINING_APPROVE` | Complete training |
| POST | `/api/v1/training/enrollments/{enrollmentId}/generate-certificate` | `TRAINING_APPROVE` | Generate certificate |
| PATCH | `/api/v1/training/enrollments/{enrollmentId}/status` | `TRAINING_APPROVE` | Update enrollment status |
| GET | `/api/v1/training/enrollments/program/{programId}` | `TRAINING_VIEW` | List enrollments by program |
| GET | `/api/v1/training/enrollments/employee/{employeeId}` | `TRAINING_VIEW` | List enrollments by employee |

### SurveyAnalyticsController

Base path: `/api/v1/survey-analytics` · package `api/survey`

| Verb | Path | Permission | Purpose |
|---|---|---|---|
| POST | `/api/v1/survey-analytics/surveys/{surveyId}/questions` | `SURVEY_MANAGE` | Add survey question |
| GET | `/api/v1/survey-analytics/surveys/{surveyId}/questions` | `SURVEY_VIEW` | List survey questions |
| POST | `/api/v1/survey-analytics/responses/submit` | `EMPLOYEE_VIEW_SELF` | Submit survey response |
| POST | `/api/v1/survey-analytics/surveys/{surveyId}/calculate-engagement` | `SURVEY_MANAGE` | Calculate engagement score |
| GET | `/api/v1/survey-analytics/engagement/latest` | `SURVEY_VIEW` | Latest engagement score |
| GET | `/api/v1/survey-analytics/engagement/trend` | `SURVEY_VIEW` | Engagement trend over time |
| GET | `/api/v1/survey-analytics/surveys/{surveyId}/department-scores` | `SURVEY_VIEW` | Department engagement scores |
| POST | `/api/v1/survey-analytics/surveys/{surveyId}/generate-insights` | `SURVEY_MANAGE` | Generate AI insights |
| GET | `/api/v1/survey-analytics/surveys/{surveyId}/insights` | `SURVEY_VIEW` | List survey insights |
| GET | `/api/v1/survey-analytics/insights/high-priority` | `SURVEY_VIEW` | High-priority insights |
| POST | `/api/v1/survey-analytics/insights/{insightId}/acknowledge` | `SURVEY_MANAGE` | Acknowledge insight |
| PUT | `/api/v1/survey-analytics/insights/{insightId}/action` | `SURVEY_MANAGE` | Update insight action status |
| GET | `/api/v1/survey-analytics/surveys/{surveyId}/summary` | `SURVEY_VIEW` | Survey analytics summary |
| GET | `/api/v1/survey-analytics/dashboard/engagement-overview` | `SURVEY_VIEW` | Engagement dashboard overview |

### SurveyManagementController

Base path: `/api/v1/survey-management` · package `api/survey`

| Verb | Path | Permission | Purpose |
|---|---|---|---|
| POST | `/api/v1/survey-management` | `SURVEY_CREATE` | Create survey |
| PUT | `/api/v1/survey-management/{surveyId}` | `SURVEY_UPDATE` | Update survey |
| PATCH | `/api/v1/survey-management/{surveyId}/status` | `SURVEY_MANAGE` | Update survey status |
| POST | `/api/v1/survey-management/{surveyId}/launch` | `SURVEY_MANAGE` | Launch survey |
| POST | `/api/v1/survey-management/{surveyId}/complete` | `SURVEY_MANAGE` | Complete survey |
| GET | `/api/v1/survey-management/{surveyId}` | `SURVEY_VIEW` | Get survey by id |
| GET | `/api/v1/survey-management` | `SURVEY_VIEW` | List surveys (paged) |
| GET | `/api/v1/survey-management/status/{status}` | `SURVEY_VIEW` | List surveys by status |
| GET | `/api/v1/survey-management/active` | `SURVEY_VIEW` | List active surveys |
| DELETE | `/api/v1/survey-management/{surveyId}` | `SURVEY_DELETE` | Delete survey |

### RecognitionController

Base path: `/api/v1/recognition` · package `api/recognition`

| Verb | Path | Permission | Purpose |
|---|---|---|---|
| POST | `/api/v1/recognition` | `RECOGNITION_CREATE` | Give recognition |
| GET | `/api/v1/recognition/{id}` | `RECOGNITION_VIEW` | Get recognition by id |
| GET | `/api/v1/recognition/feed` | `RECOGNITION_VIEW` | Public recognition feed |
| GET | `/api/v1/recognition/received` | `RECOGNITION_VIEW` | My received recognitions |
| GET | `/api/v1/recognition/given` | `RECOGNITION_VIEW` | My given recognitions |
| POST | `/api/v1/recognition/{id}/react` | `RECOGNITION_CREATE` | Add reaction |
| DELETE | `/api/v1/recognition/{id}/react` | `RECOGNITION_CREATE` | Remove reaction |
| GET | `/api/v1/recognition/badges` | `RECOGNITION_VIEW` | List active badges |
| GET | `/api/v1/recognition/points` | `RECOGNITION_VIEW` | My points balance |
| GET | `/api/v1/recognition/leaderboard` | `RECOGNITION_VIEW` | Recognition leaderboard |
| GET | `/api/v1/recognition/dashboard` | `RECOGNITION_VIEW` | Engagement dashboard |
| GET | `/api/v1/recognition/milestones/upcoming` | `MILESTONE_VIEW` | Upcoming milestones |
| GET | `/api/v1/recognition/types` | `RECOGNITION_VIEW` | List recognition types |
| GET | `/api/v1/recognition/categories` | `RECOGNITION_VIEW` | List recognition categories |

### OneOnOneMeetingController

Base path: `/api/v1/meetings` · package `api/engagement`

| Verb | Path | Permission | Purpose |
|---|---|---|---|
| POST | `/api/v1/meetings` | `MEETING_CREATE` | Create 1:1 meeting |
| PUT | `/api/v1/meetings/{meetingId}` | `MEETING_CREATE` | Update meeting |
| GET | `/api/v1/meetings/{meetingId}` | `MEETING_VIEW` | Get meeting by id |
| GET | `/api/v1/meetings` | `MEETING_VIEW` | My meetings (paged) |
| GET | `/api/v1/meetings/upcoming` | `MEETING_VIEW` | My upcoming meetings |
| GET | `/api/v1/meetings/as-manager` | `MEETING_MANAGE` | Meetings as manager (paged) |
| GET | `/api/v1/meetings/history/{employeeId}` | `MEETING_MANAGE` | Meeting history with employee |
| POST | `/api/v1/meetings/{meetingId}/start` | `MEETING_CREATE` | Start meeting |
| POST | `/api/v1/meetings/{meetingId}/complete` | `MEETING_CREATE` | Complete meeting |
| POST | `/api/v1/meetings/{meetingId}/cancel` | `MEETING_CREATE` | Cancel meeting |
| POST | `/api/v1/meetings/{meetingId}/reschedule` | `MEETING_CREATE` | Reschedule meeting |
| PUT | `/api/v1/meetings/{meetingId}/notes` | `MEETING_VIEW` | Update meeting notes |
| POST | `/api/v1/meetings/{meetingId}/feedback` | `MEETING_VIEW` | Submit meeting feedback |
| POST | `/api/v1/meetings/{meetingId}/agenda` | `MEETING_VIEW` | Add agenda item |
| GET | `/api/v1/meetings/{meetingId}/agenda` | `MEETING_VIEW` | List agenda items |
| PUT | `/api/v1/meetings/{meetingId}/agenda/{itemId}/discussed` | `MEETING_CREATE` | Mark agenda item discussed |
| DELETE | `/api/v1/meetings/{meetingId}/agenda/{itemId}` | `MEETING_VIEW` | Delete agenda item |
| POST | `/api/v1/meetings/{meetingId}/actions` | `MEETING_CREATE` | Create action item |
| GET | `/api/v1/meetings/{meetingId}/actions` | `MEETING_VIEW` | List action items |
| GET | `/api/v1/meetings/actions/pending` | `MEETING_VIEW` | My pending action items |
| GET | `/api/v1/meetings/actions/overdue` | `MEETING_VIEW` | My overdue action items |
| PUT | `/api/v1/meetings/actions/{actionId}/status` | `MEETING_VIEW` | Update action item status |
| GET | `/api/v1/meetings/dashboard` | `MEETING_VIEW` | My meeting dashboard |
| GET | `/api/v1/meetings/dashboard/manager` | `MEETING_MANAGE` | Manager meeting dashboard |

### PulseSurveyController

Base path: `/api/v1/surveys` · package `api/engagement`

| Verb | Path | Permission | Purpose |
|---|---|---|---|
| POST | `/api/v1/surveys` | `SURVEY_MANAGE` | Create pulse survey |
| PUT | `/api/v1/surveys/{surveyId}` | `SURVEY_MANAGE` | Update pulse survey |
| GET | `/api/v1/surveys/{surveyId}` | `SURVEY_VIEW` | Get survey with questions |
| GET | `/api/v1/surveys` | `SURVEY_VIEW` | List surveys (filtered, paged) |
| GET | `/api/v1/surveys/active` | `SURVEY_VIEW` | List active surveys |
| DELETE | `/api/v1/surveys/{surveyId}` | `SURVEY_MANAGE` | Delete survey |
| POST | `/api/v1/surveys/{surveyId}/publish` | `SURVEY_MANAGE` | Publish survey |
| POST | `/api/v1/surveys/{surveyId}/close` | `SURVEY_MANAGE` | Close survey |
| POST | `/api/v1/surveys/{surveyId}/questions` | `SURVEY_MANAGE` | Add question |
| GET | `/api/v1/surveys/{surveyId}/questions` | `SURVEY_VIEW` | List questions |
| DELETE | `/api/v1/surveys/{surveyId}/questions/{questionId}` | `SURVEY_MANAGE` | Delete question |
| POST | `/api/v1/surveys/{surveyId}/clone` | `SURVEY_MANAGE` | Clone survey |
| POST | `/api/v1/surveys/{surveyId}/save-as-template` | `SURVEY_MANAGE` | Save survey as template |
| GET | `/api/v1/surveys/templates` | `SURVEY_VIEW` | List survey templates |
| POST | `/api/v1/surveys/{surveyId}/start` | `EMPLOYEE_VIEW_SELF` | Start survey response |
| POST | `/api/v1/surveys/submit` | `EMPLOYEE_VIEW_SELF` | Submit survey response |
| GET | `/api/v1/surveys/{surveyId}/analytics` | `SURVEY_VIEW` | Survey analytics |
| GET | `/api/v1/surveys/dashboard` | `SURVEY_VIEW` | Engagement dashboard |

### WellnessController

Base path: `/api/v1/wellness` · package `api/wellness`

| Verb | Path | Permission | Purpose |
|---|---|---|---|
| GET | `/api/v1/wellness/dashboard` | `WELLNESS_VIEW` | My wellness dashboard |
| POST | `/api/v1/wellness/programs` | `WELLNESS_MANAGE` | Create wellness program |
| GET | `/api/v1/wellness/programs/active` | `WELLNESS_VIEW` | List active programs |
| GET | `/api/v1/wellness/programs/featured` | `WELLNESS_VIEW` | List featured programs |
| POST | `/api/v1/wellness/programs/{programId}/challenges` | `WELLNESS_MANAGE` | Create program challenge |
| POST | `/api/v1/wellness/challenges` | `WELLNESS_MANAGE` | Create standalone challenge |
| GET | `/api/v1/wellness/challenges/active` | `WELLNESS_VIEW` | List active challenges |
| GET | `/api/v1/wellness/challenges/upcoming` | `WELLNESS_VIEW` | List upcoming challenges |
| POST | `/api/v1/wellness/challenges/{challengeId}/join` | `WELLNESS_CREATE` | Join challenge |
| POST | `/api/v1/wellness/challenges/{challengeId}/leave` | `WELLNESS_CREATE` | Leave challenge |
| POST | `/api/v1/wellness/health-logs` | `WELLNESS_CREATE` | Log health metric |
| GET | `/api/v1/wellness/health-logs` | `WELLNESS_VIEW` | Get my health logs |
| GET | `/api/v1/wellness/points` | `WELLNESS_VIEW` | My wellness points |
| GET | `/api/v1/wellness/leaderboard` | `WELLNESS_VIEW` | Wellness leaderboard |
| GET | `/api/v1/wellness/challenges/{challengeId}/leaderboard` | `WELLNESS_VIEW` | Challenge leaderboard |

## Related Links

- [[Controller-Index]] · [[APIs]] · [[Services]] · [[Feature-Traceability]] · [[Permissions]]
- [[Nu-Grow]] · [[00-Home]]
