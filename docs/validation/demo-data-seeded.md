# Demo Data Seeding Results

**Date:** 2026-03-24
**Tenant:** NuLogic (`660e8400-e29b-41d4-a716-446655440001`)
**Actor:** SuperAdmin (`fayaz.m@nulogic.io`)

## Summary

All 8 modules seeded successfully. Three bugs were discovered and fixed during the process.

| Module            | Records           | Status                  |
|-------------------|-------------------|-------------------------|
| Departments       | 5 new (8 total)   | SUCCESS                 |
| Announcements     | 3                 | SUCCESS (after bug fix) |
| Holidays          | 8                 | SUCCESS                 |
| Job Openings      | 3 new (50+ total) | SUCCESS                 |
| Goals             | 4                 | SUCCESS                 |
| Training Programs | 3                 | SUCCESS (after bug fix) |
| LMS Courses       | 2 (published)     | SUCCESS                 |
| Recognition       | 3                 | SUCCESS (after bug fix) |
| Leave Balances    | --                | SKIPPED (no API)        |

## Detailed Results

### 1. Departments (5 added)

| Name              | Code | Type        | Status      |
|-------------------|------|-------------|-------------|
| Finance           | FIN  | FINANCE     | 201 Created |
| Marketing         | MKT  | MARKETING   | 201 Created |
| Product           | PROD | PRODUCT     | 201 Created |
| Design            | DES  | DESIGN      | 201 Created |
| Quality Assurance | QA   | ENGINEERING | 201 Created |

Pre-existing: Engineering (ENG), Human Resources (HR), Recruitment (HR-REC)

### 2. Announcements (3 created)

| Title                                              | Category | Priority | Pinned |
|----------------------------------------------------|----------|----------|--------|
| Q2 2026 Company Goals Published                    | GENERAL  | HIGH     | Yes    |
| New Employee Benefits Package -- Effective April 1 | BENEFIT  | MEDIUM   | No     |
| Office Renovation -- Floor 3 Closed March 28-30    | EVENT    | HIGH     | Yes    |

### 3. Holidays 2026 (8 created)

| Holiday          | Date       | Type     |
|------------------|------------|----------|
| Republic Day     | 2026-01-26 | NATIONAL |
| Holi             | 2026-03-17 | FESTIVAL |
| Good Friday      | 2026-04-03 | NATIONAL |
| May Day          | 2026-05-01 | NATIONAL |
| Independence Day | 2026-08-15 | NATIONAL |
| Gandhi Jayanti   | 2026-10-02 | NATIONAL |
| Diwali           | 2026-11-08 | FESTIVAL |
| Christmas        | 2026-12-25 | NATIONAL |

### 4. Job Openings (3 created)

| Title                     | Department      | Openings | Priority | Status |
|---------------------------|-----------------|----------|----------|--------|
| Senior Frontend Developer | Engineering     | 2        | HIGH     | OPEN   |
| HR Business Partner       | Human Resources | 1        | MEDIUM   | OPEN   |
| Product Designer          | Design          | 1        | MEDIUM   | OPEN   |

### 5. Goals (4 created)

| Title                                          | Owner       | Type     | Progress | Status |
|------------------------------------------------|-------------|----------|----------|--------|
| Launch NU-AURA V2.0                            | Fayaz M     | OKR      | 65%      | ACTIVE |
| Achieve 95% Employee Satisfaction Score        | Fayaz M     | TEAM     | 42%      | ACTIVE |
| Reduce Frontend Build Time by 40%              | Sumit Kumar | KPI      | 62%      | ACTIVE |
| Complete AWS Solutions Architect Certification | Fayaz M     | PERSONAL | 30%      | ACTIVE |

### 6. Training Programs (3 created)

| Program                                | Category   | Mode      | Duration | Status    |
|----------------------------------------|------------|-----------|----------|-----------|
| Onboarding Essentials                  | COMPLIANCE | HYBRID    | 16h      | SCHEDULED |
| Leadership Skills for New Managers     | LEADERSHIP | WORKSHOP  | 24h      | SCHEDULED |
| Advanced TypeScript & Next.js Patterns | TECHNICAL  | IN_PERSON | 12h      | SCHEDULED |

### 7. LMS Courses (2 created and published)

| Course                             | Difficulty | Mandatory | Duration | Status    |
|------------------------------------|------------|-----------|----------|-----------|
| Introduction to NU-AURA Platform   | BEGINNER   | Yes       | 4h       | PUBLISHED |
| Data Privacy & Security Essentials | BEGINNER   | Yes       | 2h       | PUBLISHED |

### 8. Recognition (3 created)

| Title                                          | Receiver    | Type         | Category   | Points |
|------------------------------------------------|-------------|--------------|------------|--------|
| Outstanding Engineering Leadership in Q1!      | Sumit Kumar | KUDOS        | LEADERSHIP | 100    |
| Brilliant Performance Dashboard Implementation | Saran V     | APPRECIATION | INNOVATION | 75     |
| Successful Benefits Rollout                    | Jagadeesh N | ACHIEVEMENT  | TEAMWORK   | 150    |

### 9. Leave Balances

**SKIPPED** -- No direct initialization API exists. Leave balances are created via:

- Kafka `employee-lifecycle` consumer (on employee creation)
- Monthly scheduled accrual cron job

## Bugs Found and Fixed

### BUG-1: Announcements and Recognition 500 Error (userId vs employeeId)

**Root cause:** `AnnouncementService.createAnnouncement()` and
`RecognitionController.giveRecognition()` used `SecurityContext.getCurrentUserId()` to call
`WallService.createPost()`. The WallService looks up the employee table using this ID, but
`userId` (from `users` table) is different from `employeeId` (from `employees` table). When the
employee lookup failed, the exception marked the Spring transaction as rollback-only, causing the
entire operation to fail despite the try/catch.

**Fix:**

- `AnnouncementService.java`: Use `SecurityContext.getCurrentEmployeeId()` for employee lookups and
  wall post creation
- `RecognitionController.java`: Pass `employeeId` instead of `userId` as the giver ID

**Files changed:**

- `backend/src/main/java/com/hrms/application/announcement/service/AnnouncementService.java`
- `backend/src/main/java/com/hrms/api/recognition/controller/RecognitionController.java`

### BUG-2: Training Programs 500 Error (Optimistic Locking)

**Root cause:** `TrainingManagementService.createProgram()` manually set
`program.setId(UUID.randomUUID())` on an entity that uses
`@GeneratedValue(strategy = GenerationType.UUID)`. Hibernate treated the entity as a detached (
existing) entity and attempted a merge/update instead of persist. Combined with the `@Version` field
initialized to `0L`, this caused `ObjectOptimisticLockingFailureException`.

**Fix:** Removed the manual `setId()` call, letting `@GeneratedValue` handle ID generation.

**File changed:**

- `backend/src/main/java/com/hrms/application/training/service/TrainingManagementService.java`
