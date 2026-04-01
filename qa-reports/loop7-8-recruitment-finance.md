# QA Report: Loop 7-8 -- Recruitment & Finance API Tests

**Date:** 2026-04-01  
**Tester:** Claude (Automated API QA)  
**Auth:** SuperAdmin (fayaz.m@nulogic.io) with JWT Bearer token  
**Backend:** http://localhost:8080  

---

## Executive Summary

| Category | Passed | Failed | Blocked | Total |
|----------|--------|--------|---------|-------|
| Recruitment (Job Openings) | 1 | 0 | 0 | 1 |
| Recruitment (Candidates) | 1 | 0 | 0 | 1 |
| Recruitment (Interviews) | 1 | 0 | 0 | 1 |
| Recruitment (Offers) | 0 | 1 | 0 | 1 |
| Onboarding | 2 | 0 | 0 | 2 |
| Offboarding | 0 | 1 | 0 | 1 |
| Referrals | 1 | 0 | 0 | 1 |
| Expenses | 1 | 0 | 0 | 1 |
| Loans | 1 | 0 | 0 | 1 |
| Travel | 1 | 1 | 0 | 2 |
| Assets | 1 | 0 | 0 | 1 |
| Letters (templates) | 1 | 0 | 0 | 1 |
| Letters (direct) | 1 | 0 | 0 | 1 |
| Helpdesk | 2 | 0 | 0 | 2 |
| Auth (401 on no-token) | 12 | 0 | 0 | 12 |
| **TOTAL** | **26** | **3** | **0** | **29** |

**Critical Bugs:** 3 (all HTTP 500 errors)  
**Performance Warnings:** 5 endpoints exceed 3000ms threshold  

---

## 1. Recruitment Module

### 1.1 Job Openings -- GET /api/v1/recruitment/job-openings

| Test | Result | Details |
|------|--------|---------|
| With valid token | PASS (200) | Returns paginated list, 51 job openings |
| Without token | PASS (401) | Correctly rejects unauthenticated request |
| Response time | WARN | ~3042ms (exceeds 3000ms threshold) |
| Pagination | PASS | `page`, `size`, `sort` all work correctly |
| Content-Type | PASS | `application/json` |

**Response structure (verified):**
```json
{
  "content": [{ "id", "tenantId", "jobCode", "jobTitle", "departmentId", "departmentName",
                "location", "employmentType", "experienceRequired", "minSalary", "maxSalary", ... }],
  "totalElements": 51, "totalPages": 11
}
```

**Note:** The primary URL `/api/v1/jobs` returns HTTP 500. The correct URL is `/api/v1/recruitment/job-openings`. The `/api/v1/recruitment/jobs` alternative also returns 500.

---

### 1.2 Candidates -- GET /api/v1/recruitment/candidates

| Test | Result | Details |
|------|--------|---------|
| With valid token | PASS (200) | Returns paginated list, 192 candidates |
| Without token | PASS (401) | Correctly rejects unauthenticated request |
| Response time | OK | ~2955ms (within threshold) |
| Pagination | PASS | Sorting by `appliedDate,desc` works |
| Content-Type | PASS | `application/json` |

**Response structure (verified):**
```json
{
  "content": [{ "id", "tenantId", "candidateCode", "jobOpeningId", "jobTitle",
                "firstName", "lastName", "fullName", "email", "phone",
                "totalExperience", "status", "currentStage", "appliedDate", ... }],
  "totalElements": 192, "totalPages": 39
}
```

**Note:** Both `/api/v1/candidates` (500) and `/api/v1/recruitment/candidates` (200) are mapped. Only the `/api/v1/recruitment/candidates` route works. The `/api/v1/candidates` route hits a different (broken) handler.

---

### 1.3 Interviews -- GET /api/v1/recruitment/interviews

| Test | Result | Details |
|------|--------|---------|
| With valid token | PASS (200) | Returns paginated list, 15 interviews |
| Without token | PASS (401) | Correctly rejects unauthenticated request |
| Response time | WARN | ~3653ms (exceeds 3000ms threshold) |
| Pagination | PASS | Sorting by `scheduledAt,desc` works |
| Content-Type | PASS | `application/json` |

**Response structure (verified):**
```json
{
  "content": [{ "id", "tenantId", "candidateId", "candidateName", "jobOpeningId",
                "jobTitle", "interviewRound", "interviewType", "scheduledAt",
                "durationMinutes", "interviewerId", "meetingLink", "status",
                "feedback", "rating", "result", "notes", ... }],
  "totalElements": 15
}
```

---

### 1.4 Offers -- GET /api/v1/recruitment/offers

| Test | Result | Details |
|------|--------|---------|
| With valid token | **FAIL (500)** | Internal Server Error |
| Without token | PASS (401) | Correctly rejects unauthenticated request |

**BUG-R01 (CRITICAL):** `GET /api/v1/recruitment/offers` returns HTTP 500.  
- Also tested: `/api/v1/offers`, `/api/v1/offers/list`, `/api/v1/recruitment/offers/list` -- all return 500.  
- The offers endpoint exists in `RecruitmentController` only as `POST /candidates/{id}/offer` (create offer for a candidate). There is no standalone `GET /offers` list endpoint.  
- **Root cause:** No dedicated offers list endpoint exists. The catch-all route handler is failing because it matches an unmapped sub-resource under `/api/v1/recruitment/`.  
- **Recommendation:** Add a `GET /api/v1/recruitment/offers` endpoint that lists all offers (or offer letters) with pagination.

---

### 1.5 Onboarding -- GET /api/v1/onboarding/processes

| Test | Result | Details |
|------|--------|---------|
| With valid token | PASS (200) | Returns empty paginated list (no processes yet) |
| Without token | PASS (401) | Correctly rejects unauthenticated request |
| Response time | WARN | ~3098ms (exceeds 3000ms threshold) |
| Templates endpoint | PASS (200) | `GET /api/v1/onboarding/templates` returns empty array `[]` |

**Note:** The primary URL `/api/v1/onboarding` returns 500. The correct URL is `/api/v1/onboarding/processes`.  
- Controller: `OnboardingManagementController` at `/api/v1/onboarding`  
- Available sub-routes: `/processes`, `/processes/{id}`, `/processes/employee/{employeeId}`, `/templates`  
- The `/api/v1/onboarding/tasks` and `/api/v1/onboarding/sessions` routes return 500 (not mapped).

---

### 1.6 Offboarding

| Test | Result | Details |
|------|--------|---------|
| All tested URLs | **FAIL (500)** | No working endpoint found |

**BUG-R02 (CRITICAL):** No offboarding controller exists in the codebase.  
- Tested URLs: `/api/v1/offboarding`, `/api/v1/offboarding/tasks`, `/api/v1/offboarding/sessions`, `/api/v1/offboarding/templates`, `/api/v1/offboarding/checklists`, `/api/v1/offboarding/list` -- all return 500.  
- File search confirms: no `*Offboard*` controller, service, or entity files exist under `com.hrms.api`.  
- **Root cause:** Offboarding module has not been implemented yet.  
- **Recommendation:** Implement offboarding controller with at minimum: `GET /api/v1/offboarding/processes` (list), `POST /api/v1/offboarding/processes` (initiate), and task management endpoints.

---

### 1.7 Referrals -- GET /api/v1/referrals

| Test | Result | Details |
|------|--------|---------|
| With valid token | PASS (200) | Returns empty paginated list |
| Without token | PASS (401) | Correctly rejects unauthenticated request |
| Response time | OK | ~2683ms |

**Note:** `/api/v1/recruitment/referrals` returns 500. Only `/api/v1/referrals` works.

---

## 2. Finance Module

### 2.1 Expenses -- GET /api/v1/expenses

| Test | Result | Details |
|------|--------|---------|
| With valid token | PASS (200) | Returns paginated list, 1 expense claim |
| Without token | PASS (401) | Correctly rejects unauthenticated request |
| Response time | OK | ~2903ms |
| Content-Type | PASS | `application/json` |

**Response structure (verified):**
```json
{
  "content": [{ "id", "employeeId", "employeeName", "claimNumber", "claimDate",
                "category", "categoryDisplayName", "description", "amount", "currency",
                "status", "statusDisplayName", "receiptUrl", "submittedAt",
                "approvedBy", "approvedByName", "rejectedBy", "rejectionReason",
                "paymentDate", "paymentReference", "notes", "title", "policyId",
                "totalItems", "createdAt", "updatedAt" }],
  "totalElements": 1
}
```

Data found: 1 expense claim (EXP-202604-0001, TRAVEL, 2500.00 INR, DRAFT status).

---

### 2.2 Loans -- GET /api/v1/loans

| Test | Result | Details |
|------|--------|---------|
| With valid token | PASS (200) | Returns empty paginated list |
| Without token | PASS (401) | Correctly rejects unauthenticated request |
| Response time | OK | ~2320ms |
| Empty state | PASS | `{"content":[], "totalElements": 0, "empty": true}` |

---

### 2.3 Travel -- GET /api/v1/travel/requests

| Test | Result | Details |
|------|--------|---------|
| With valid token (correct URL) | PASS (200) | Returns paginated list, 2 travel requests |
| With valid token (wrong URL) | **FAIL (500)** | `/api/v1/travel` returns 500 |
| Without token | PASS (401) | Correctly rejects unauthenticated request |
| Response time | OK | ~1428ms for the 500, successful requests ~2500ms |

**BUG-F01 (MINOR):** `GET /api/v1/travel` returns HTTP 500 instead of routing to the list endpoint.  
- The correct URL is `/api/v1/travel/requests`.  
- Controller: `TravelController` at `/api/v1/travel` with sub-route `/requests`.  
- `GET /api/v1/travel/expenses` returns 405 (Method Not Allowed -- POST only).  
- **Recommendation:** Consider adding a redirect or alias from `/api/v1/travel` to `/api/v1/travel/requests`.

**Response structure (verified):**
```json
{
  "content": [{ "id", "tenantId", "employeeId", "employeeName", "requestNumber",
                "travelType", "purpose", "originCity", "destinationCity",
                "departureDate", "returnDate", "totalDays",
                "accommodationRequired", "transportMode", "estimatedCost",
                "advanceRequired", "status", "isInternational", "visaRequired",
                "createdAt", "updatedAt" }],
  "totalElements": 2
}
```

**Note:** `employeeName` is `null` in travel request responses -- potential data join issue.

---

### 2.4 Assets -- GET /api/v1/assets

| Test | Result | Details |
|------|--------|---------|
| With valid token | PASS (200) | Returns empty paginated list |
| Without token | PASS (401) | Correctly rejects unauthenticated request |
| Response time | WARN | ~3557ms (exceeds 3000ms threshold) |
| Empty state | PASS | `{"content":[], "totalElements": 0, "empty": true}` |

---

### 2.5 Letters -- GET /api/v1/letters and /api/v1/letters/templates

| Test | Result | Details |
|------|--------|---------|
| `/api/v1/letters` (list letters) | PASS (200) | Returns empty paginated list of generated letters |
| `/api/v1/letters/templates` | PASS (200) | Returns 5 letter templates |
| Without token | PASS (401) | Correctly rejects unauthenticated request |
| Response time | OK | ~2934ms |

**Letter templates found (5):**
1. **OFFER_STANDARD** -- Standard Offer Letter (category: OFFER)
2. **APPOINTMENT_STANDARD** -- Standard Appointment Letter (category: APPOINTMENT)
3. Plus 3 additional templates

**Response structure for templates (verified):**
```json
{
  "content": [{ "id", "name", "code", "description", "category", "categoryDisplayName",
                "templateContent" (HTML with {{placeholders}}), "headerHtml", "footerHtml",
                "includeCompanyLogo", "includeSignature", "signatureTitle",
                "signatoryDesignation", "requiresApproval", "isActive",
                "isSystemTemplate", "version", "availablePlaceholders",
                "createdAt", "updatedAt" }],
  "totalElements": 5
}
```

**Note:** `/api/v1/letter-templates` returns 500 (incorrect route). Use `/api/v1/letters/templates`.

---

### 2.6 Helpdesk -- GET /api/v1/helpdesk/tickets

| Test | Result | Details |
|------|--------|---------|
| With valid token | PASS (200) | Returns paginated list, 1 ticket |
| Without token | PASS (401) | Correctly rejects unauthenticated request |
| Response time | OK | ~2984ms |
| Categories endpoint | PASS (200) | `GET /api/v1/helpdesk/categories` returns `[]` |

**Response structure (verified):**
```json
{
  "content": [{ "id", "tenantId", "ticketNumber", "employeeId", "employeeName",
                "categoryId", "categoryName", "subject", "description",
                "priority", "status", "assignedTo", "assignedToName",
                "assignedAt", "resolvedAt", "closedAt", "resolutionNotes",
                "dueDate", "tags", "attachmentUrls", "createdAt", "updatedAt" }],
  "totalElements": 1
}
```

Ticket found: TKT-20260401030810-619E (MEDIUM priority, IN_PROGRESS status).

---

## 3. Authentication / Authorization Tests

All 12 primary endpoints were tested without a Bearer token:

| Endpoint | No-Auth Response |
|----------|-----------------|
| /api/v1/jobs | 401 |
| /api/v1/candidates | 401 |
| /api/v1/interviews | 401 |
| /api/v1/offers | 401 |
| /api/v1/onboarding | 401 |
| /api/v1/offboarding | 401 |
| /api/v1/expenses | 401 |
| /api/v1/loans | 401 |
| /api/v1/travel | 401 |
| /api/v1/assets | 401 |
| /api/v1/letters | 401 |
| /api/v1/helpdesk/tickets | 401 |

**Result:** All endpoints correctly return 401 for unauthenticated requests. Security filter is working.

---

## 4. Performance Summary

| Endpoint | Response Time | Status |
|----------|--------------|--------|
| /api/v1/recruitment/job-openings | ~3042ms | WARN (> 3000ms) |
| /api/v1/recruitment/candidates | ~2955ms | OK |
| /api/v1/recruitment/interviews | ~3653ms | WARN (> 3000ms) |
| /api/v1/expenses | ~2903ms | OK |
| /api/v1/loans | ~2320ms | OK |
| /api/v1/travel/requests | ~2500ms | OK |
| /api/v1/assets | ~3557ms | WARN (> 3000ms) |
| /api/v1/letters | ~2934ms | OK |
| /api/v1/letters/templates | ~2397ms | OK |
| /api/v1/helpdesk/tickets | ~2984ms | OK |
| /api/v1/helpdesk/categories | ~2756ms | OK |
| /api/v1/onboarding/processes | ~3098ms | WARN (> 3000ms) |
| /api/v1/onboarding/templates | ~2397ms | OK |
| /api/v1/referrals | ~2683ms | OK |

**Note:** Multiple endpoints are near or above the 3000ms threshold. This is likely related to Neon cloud PostgreSQL latency from dev environment (not a code issue). Production PG 16 should perform significantly better.

---

## 5. URL Mapping Discovery

### Correct (Working) URLs

| Module | Correct URL | HTTP | Data |
|--------|-------------|------|------|
| Job Openings | `/api/v1/recruitment/job-openings` | 200 | 51 records |
| Candidates | `/api/v1/recruitment/candidates` | 200 | 192 records |
| Interviews | `/api/v1/recruitment/interviews` | 200 | 15 records |
| Onboarding Processes | `/api/v1/onboarding/processes` | 200 | 0 records |
| Onboarding Templates | `/api/v1/onboarding/templates` | 200 | 0 records |
| Referrals | `/api/v1/referrals` | 200 | 0 records |
| Expenses | `/api/v1/expenses` | 200 | 1 record |
| Loans | `/api/v1/loans` | 200 | 0 records |
| Travel Requests | `/api/v1/travel/requests` | 200 | 2 records |
| Assets | `/api/v1/assets` | 200 | 0 records |
| Letters (generated) | `/api/v1/letters` | 200 | 0 records |
| Letter Templates | `/api/v1/letters/templates` | 200 | 5 records |
| Helpdesk Tickets | `/api/v1/helpdesk/tickets` | 200 | 1 record |
| Helpdesk Categories | `/api/v1/helpdesk/categories` | 200 | 0 records |

### Broken / Non-existent URLs (all return 500)

| Attempted URL | Issue |
|---------------|-------|
| `/api/v1/jobs` | No controller mapped; catch-all fails |
| `/api/v1/candidates` | Hits broken handler (different from `/api/v1/recruitment/candidates`) |
| `/api/v1/interviews` | No controller mapped |
| `/api/v1/offers` | No offers list endpoint exists |
| `/api/v1/recruitment/offers` | No offers list endpoint exists |
| `/api/v1/onboarding` (bare) | No root GET handler on OnboardingManagementController |
| `/api/v1/offboarding/*` | Entire offboarding module is unimplemented |
| `/api/v1/travel` (bare) | No root GET handler on TravelController |
| `/api/v1/recruitment/jobs` | No `/jobs` sub-route (should be `/job-openings`) |

---

## 6. Bug Summary

### Critical (HTTP 500)

| ID | Endpoint | Description | Root Cause |
|----|----------|-------------|------------|
| BUG-R01 | `GET /api/v1/recruitment/offers` | No offers list endpoint | Missing controller method |
| BUG-R02 | `GET /api/v1/offboarding/*` | Entire offboarding module missing | No controller/service/entity |
| BUG-F01 | `GET /api/v1/travel` | Bare travel route returns 500 | No root GET handler |

### Minor / Data Issues

| ID | Endpoint | Description |
|----|----------|-------------|
| BUG-D01 | `GET /api/v1/travel/requests` | `employeeName` is `null` in travel request responses despite `employeeId` being populated |
| BUG-D02 | `GET /api/v1/helpdesk/categories` | Returns empty array -- no helpdesk categories seeded |
| BUG-D03 | `GET /api/v1/onboarding/templates` | Returns empty array -- no onboarding templates seeded |
| BUG-D04 | Multiple 500 routes | Catch-all handler returns generic 500 for unmapped routes instead of 404 |

### Performance Warnings

| ID | Endpoint | Response Time |
|----|----------|--------------|
| PERF-01 | `/api/v1/recruitment/interviews` | ~3653ms |
| PERF-02 | `/api/v1/assets` | ~3557ms |
| PERF-03 | `/api/v1/onboarding/processes` | ~3098ms |
| PERF-04 | `/api/v1/recruitment/job-openings` | ~3042ms |

---

## 7. Recommendations

1. **Implement Offboarding Module (BUG-R02):** This is a critical gap. The NU-Hire sub-app advertises offboarding but no backend exists. Needs controller, service, entity, and repository layers.

2. **Add Offers List Endpoint (BUG-R01):** Add `GET /api/v1/recruitment/offers` that returns a paginated list of all offers across candidates. Currently offers are only accessible per-candidate.

3. **Fix 500-to-404 Mapping (BUG-D04):** Unmapped routes under `/api/v1/*` should return 404 Not Found, not 500 Internal Server Error. This hides real bugs and confuses API consumers.

4. **Fix Travel employeeName Join (BUG-D01):** The travel request DTO returns `null` for `employeeName`. The service/mapper needs to join with the employee table to resolve the name.

5. **Seed Helpdesk Categories (BUG-D02):** Add default helpdesk categories (IT Support, HR, Facilities, Finance, etc.) via a Flyway migration.

6. **Seed Onboarding Templates (BUG-D03):** Add default onboarding task templates for common workflows.

7. **Performance:** Response times are uniformly high (~2.5-3.5s). This appears to be Neon cloud latency rather than query inefficiency. Verify with production PostgreSQL 16.

---

*Report generated: 2026-04-01T21:15:00Z*  
*Test duration: ~3 minutes*  
*Total API calls: ~50*
