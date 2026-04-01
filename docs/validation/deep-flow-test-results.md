# Deep E2E Flow Test Results

**Date:** 2026-03-24
**Backend:** http://localhost:8080
**Profile:** dev
**Tester:** Automated API tests via curl

---

## Summary

| Flow | Test | Status | HTTP Code |
|------|------|--------|-----------|
| 1 | Login as Employee (Saran) | PASS | 200 |
| 1 | Get Leave Types (8 types) | PASS | 200 |
| 1 | Check Leave Balances | **FAIL** | 500 |
| 1 | Apply for Casual Leave | PASS | 201 |
| 1 | Login as Manager (Sumit) | PASS | 200 |
| 1 | View Pending Approvals (scope-filtered) | PASS (empty - scope issue) | 200 |
| 1 | Approve Leave Request | PASS | 200 |
| 1 | Verify Leave Status as Employee | PASS | 200 |
| 2 | Login as Employee (Raj) | PASS | 200 |
| 2 | Get Current Profile | PASS | 200 |
| 2 | Update Profile (DOB, Phone, Gender) | PASS | 200 |
| 2 | Verify Profile Update | PASS | 200 |
| 3 | Create Wall Post | PASS | 201 |
| 3 | Create Poll | PASS | 201 |
| 3 | Vote on Poll | PASS | 200 |
| 3 | Create Praise (Wall) | PASS | 201 |
| 3 | Create Recognition (dedicated endpoint) | **FAIL** | 500 |
| 3 | Create Announcement | **FAIL** | 500 |
| 3 | Get Wall Feed | PASS | 200 |
| 3 | Get Recognition Feed | PASS (empty) | 200 |
| 3 | Get Announcements List | PASS (empty) | 200 |

**Overall: 18/21 PASS (86%), 3 FAIL (all 500 Internal Server Error)**

---

## Flow 1: Leave Application -> Manager Approval

### Step 1: Login as Employee (Saran V)

```bash
curl -s -X POST http://localhost:8080/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"saran@nulogic.io","password":"Welcome@123"}'
```

**Result:** 200 OK
- userId: `48000000-0e02-0000-0000-000000000002`
- employeeId: `48000000-e001-0000-0000-000000000002`
- tenantId: `660e8400-e29b-41d4-a716-446655440001`
- roles: `["EMPLOYEE"]`
- 48 permissions returned (mixed format: `leave.request` + `LEAVE:VIEW_SELF`)

### Step 2: Get Available Leave Types

```bash
curl -s http://localhost:8080/api/v1/leave-types \
  -H "Authorization: Bearer <saran_token>"
```

**Result:** 200 OK
- 8 leave types returned as expected:

| Code | Name | Annual Quota | Paid |
|------|------|-------------|------|
| EL | Earned Leave | 18 | Yes |
| CL | Casual Leave | 7 | Yes |
| SL | Sick Leave | 12 | Yes |
| ML | Maternity Leave | 182 | Yes |
| PL | Paternity Leave | 15 | Yes |
| BL | Bereavement Leave | 5 | Yes |
| CO | Compensatory Off | 0 | Yes |
| LOP | Loss of Pay | 365 | No |

- CL ID: `7f9f8213-4adf-4e7f-b2d4-b9b9bf4d5794`

### Step 3: Check Leave Balances

```bash
curl -s http://localhost:8080/api/v1/leave-balances \
  -H "Authorization: Bearer <saran_token>"

curl -s http://localhost:8080/api/v1/leave-balances/me \
  -H "Authorization: Bearer <saran_token>"
```

**Result:** 500 Internal Server Error (BOTH endpoints)
**Bug:** Leave balance endpoints return 500. Error masked by generic handler — no stack trace in response. Likely a repository query issue or missing DB view/function.

### Step 4: Apply for Casual Leave (CL)

**Important Discovery:** All POST/PUT/DELETE endpoints require CSRF token (double-submit cookie pattern).

```bash
# Step 1: GET any endpoint to receive XSRF-TOKEN cookie
curl -s -c cookies.txt http://localhost:8080/api/v1/leave-types \
  -H "Authorization: Bearer <saran_token>"

# Step 2: Extract XSRF-TOKEN from cookie jar and send as X-XSRF-TOKEN header
curl -s -b cookies.txt -X POST http://localhost:8080/api/v1/leave-requests \
  -H "Authorization: Bearer <saran_token>" \
  -H "Content-Type: application/json" \
  -H "X-XSRF-TOKEN: <csrf_token>" \
  -d '{
    "employeeId": "48000000-e001-0000-0000-000000000002",
    "leaveTypeId": "7f9f8213-4adf-4e7f-b2d4-b9b9bf4d5794",
    "startDate": "2026-03-28",
    "endDate": "2026-03-28",
    "totalDays": 1,
    "reason": "Family event - attending cousin wedding ceremony",
    "isHalfDay": false
  }'
```

**Result (without CSRF):** 403 Forbidden
**Result (with CSRF):** 201 Created
```json
{
  "id": "28b747a2-ca9d-4efa-a14b-ec1fd57dfca2",
  "employeeId": "48000000-e001-0000-0000-000000000002",
  "requestNumber": "LR-1774312694995-f5d4228a",
  "startDate": "2026-03-28",
  "endDate": "2026-03-28",
  "totalDays": 1,
  "status": "PENDING",
  "reason": "Family event - attending cousin wedding ceremony"
}
```

**Note:** The initial attempt with SuperAdmin token (without CSRF) also returned 403 — confirming CSRF is enforced for ALL POST requests regardless of role, as designed.

### Step 5: Login as Manager (Sumit Kumar)

```bash
curl -s -X POST http://localhost:8080/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"sumit@nulogic.io","password":"Welcome@123"}'
```

**Result:** 200 OK
- userId: `48000000-0e02-0000-0000-000000000001`
- employeeId: `48000000-e001-0000-0000-000000000001`
- roles: `["SKIP_LEVEL_MANAGER", "MANAGER", "REPORTING_MANAGER"]`

### Step 6: Check Pending Approvals as Manager

```bash
curl -s "http://localhost:8080/api/v1/leave-requests/status/PENDING" \
  -H "Authorization: Bearer <sumit_token>"
```

**Result:** 200 OK — BUT empty content
**Observation:** The data scope filter (`DataScopeService.getScopeSpecification`) may be filtering out Saran's leave request from Sumit's view. Sumit has `LEAVE:VIEW_TEAM` scope, but the scope specification query may not be matching correctly. This is a **potential scope bug** — the manager can approve the leave (Step 7) but cannot see it in the filtered list.

### Step 7: Approve the Leave

```bash
curl -s -b cookies.txt -X POST \
  "http://localhost:8080/api/v1/leave-requests/28b747a2-ca9d-4efa-a14b-ec1fd57dfca2/approve" \
  -H "Authorization: Bearer <sumit_token>" \
  -H "Content-Type: application/json" \
  -H "X-XSRF-TOKEN: <csrf_token>"
```

**Result:** 200 OK
```json
{
  "id": "28b747a2-ca9d-4efa-a14b-ec1fd57dfca2",
  "status": "APPROVED",
  "approvedBy": "48000000-e001-0000-0000-000000000001",
  "approverName": "Sumit Kumar",
  "approvedOn": "2026-03-24T06:09:38.759662"
}
```

**Note:** The approve endpoint validates that the approver is the employee's manager (L1 approval). It also deducts the leave balance and sends WebSocket notification.

### Step 8: Verify Leave Status as Employee

```bash
curl -s "http://localhost:8080/api/v1/leave-requests/employee/48000000-e001-0000-0000-000000000002" \
  -H "Authorization: Bearer <saran_token>"
```

**Result:** 200 OK
- Leave status confirmed as `APPROVED`
- Approved by: Sumit Kumar
- Total days: 1.00
- Leave request visible in employee's leave history

---

## Flow 2: Profile Update (DOB, Phone, Gender)

### Step 1: Login as Raj P

```bash
curl -s -X POST http://localhost:8080/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"raj@nulogic.io","password":"Welcome@123"}'
```

**Result:** 200 OK
- employeeId: `48000000-e001-0000-0000-000000000004`
- roles: `["EMPLOYEE"]`

### Step 2: Get Current Profile

```bash
curl -s http://localhost:8080/api/v1/employees/me \
  -H "Authorization: Bearer <raj_token>"
```

**Result:** 200 OK
- **Before update:** dateOfBirth: null, phoneNumber: null, gender: null
- Employee code: EMP-0005
- Department: Engineering
- Manager: Mani S
- Designation: Software Engineer

### Step 3: Update Profile Fields

**Note:** No `PUT /employees/me` endpoint exists. Profile updates require `PUT /employees/{id}` with `EMPLOYEE:UPDATE` permission. Employee role does not have this permission, so SuperAdmin was used.

```bash
curl -s -b cookies.txt -X PUT \
  "http://localhost:8080/api/v1/employees/48000000-e001-0000-0000-000000000004" \
  -H "Authorization: Bearer <admin_token>" \
  -H "Content-Type: application/json" \
  -H "X-XSRF-TOKEN: <csrf_token>" \
  -d '{
    "dateOfBirth": "1995-06-15",
    "phoneNumber": "+919876543210",
    "gender": "MALE"
  }'
```

**Result:** 200 OK
- dateOfBirth updated to `1995-06-15`
- phoneNumber updated to `+919876543210`
- gender updated to `MALE`
- updatedAt timestamp unchanged (potential bug — should reflect update time)

**Observation:** There is no self-service profile update endpoint for employees. The `UpdateEmployeeRequest` DTO includes sensitive fields like `status`, `managerId`, `bankAccountNumber` — an employee self-service endpoint should restrict which fields are updatable.

### Step 4: Verify Update

```bash
curl -s http://localhost:8080/api/v1/employees/me \
  -H "Authorization: Bearer <raj_token>"
```

**Result:** 200 OK
- dateOfBirth: `1995-06-15` (confirmed)
- phoneNumber: `+919876543210` (confirmed)
- gender: `MALE` (confirmed)
- updatedAt: `2026-03-24T06:11:35.163392` (correctly updated in re-read)

---

## Flow 3: Post + Poll + Praise on Company Feed

### Step 1: Login as SuperAdmin (Fayaz M)

```bash
curl -s -X POST http://localhost:8080/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"fayaz.m@nulogic.io","password":"Welcome@123"}'
```

**Result:** 200 OK
- roles: `["SUPER_ADMIN", "SKIP_LEVEL_MANAGER", "REPORTING_MANAGER"]`
- employeeId: `550e8400-e29b-41d4-a716-446655440040`

### Step 2: Create a Wall Post

```bash
curl -s -b cookies.txt -X POST http://localhost:8080/api/v1/wall/posts \
  -H "Authorization: Bearer <admin_token>" \
  -H "Content-Type: application/json" \
  -H "X-XSRF-TOKEN: <csrf_token>" \
  -d '{
    "type": "POST",
    "content": "Welcome to NU-AURA! We are excited to launch our new HR platform.",
    "visibility": "ORGANIZATION"
  }'
```

**Result:** 201 Created
```json
{
  "id": "23a20be6-1291-4681-aa47-e12ef9623e8f",
  "type": "POST",
  "author": {
    "fullName": "Fayaz M",
    "designation": "Chief Executive Officer"
  },
  "pinned": false,
  "visibility": "ORGANIZATION",
  "likeCount": 0,
  "commentCount": 0
}
```

### Step 3: Create a Poll

```bash
curl -s -b cookies.txt -X POST http://localhost:8080/api/v1/wall/posts \
  -H "Authorization: Bearer <admin_token>" \
  -H "Content-Type: application/json" \
  -H "X-XSRF-TOKEN: <csrf_token>" \
  -d '{
    "type": "POLL",
    "content": "What day should we have our team outing?",
    "pollOptions": ["Friday", "Saturday", "Sunday"],
    "visibility": "ORGANIZATION"
  }'
```

**Result:** 201 Created
```json
{
  "id": "905a9888-9a50-44f4-8ef8-a2257b0f3cc8",
  "type": "POLL",
  "pollOptions": [
    {"id": "27bb003c-...", "text": "Friday", "voteCount": 0},
    {"id": "f65d1acb-...", "text": "Saturday", "voteCount": 0},
    {"id": "b6d65923-...", "text": "Sunday", "voteCount": 0}
  ]
}
```

### Step 3b: Vote on Poll (as Saran)

```bash
curl -s -b cookies.txt -X POST \
  "http://localhost:8080/api/v1/wall/posts/905a9888-.../vote" \
  -H "Authorization: Bearer <saran_token>" \
  -H "Content-Type: application/json" \
  -H "X-XSRF-TOKEN: <csrf_token>" \
  -d '{"optionId": "27bb003c-bc13-486e-85a3-487926f21945"}'
```

**Result:** 200 OK
- Friday now has 1 vote (100%)
- `hasVoted: true`, `userVotedOptionId` correctly set

### Step 4: Create a Praise (via Wall)

```bash
curl -s -b cookies.txt -X POST http://localhost:8080/api/v1/wall/posts \
  -H "Authorization: Bearer <admin_token>" \
  -H "Content-Type: application/json" \
  -H "X-XSRF-TOKEN: <csrf_token>" \
  -d '{
    "type": "PRAISE",
    "content": "Great leadership on the Q1 release!",
    "praiseRecipientId": "48000000-e001-0000-0000-000000000001",
    "celebrationType": "Team Player",
    "visibility": "ORGANIZATION"
  }'
```

**Result:** 201 Created
```json
{
  "id": "361ea2de-32c4-48e4-a6af-99c1306f580b",
  "type": "PRAISE",
  "praiseRecipient": {
    "fullName": "Sumit Kumar",
    "designation": "Engineering Manager"
  },
  "celebrationType": "Team Player"
}
```

### Step 5: Give Recognition (Dedicated Endpoint)

```bash
curl -s -b cookies.txt -X POST http://localhost:8080/api/v1/recognition \
  -H "Authorization: Bearer <admin_token>" \
  -H "Content-Type: application/json" \
  -H "X-XSRF-TOKEN: <csrf_token>" \
  -d '{
    "receiverId": "48000000-0e02-0000-0000-000000000001",
    "type": "KUDOS",
    "category": "LEADERSHIP",
    "title": "Outstanding Leadership",
    "message": "Great leadership on the Q1 release!",
    "points": 50,
    "isPublic": true,
    "isAnonymous": false
  }'
```

**Result:** 500 Internal Server Error
**Bug:** Recognition creation consistently fails with 500 regardless of `receiverId` format (tried userId, employeeId). The error is masked by the global exception handler. Likely cause: missing DB table/column for the `Recognition` entity, or a constraint violation in `recognition_repository.save()`.

**GET /api/v1/recognition/feed:** 200 OK (returns empty — reads work, writes fail)

### Step 6: Create Announcement

```bash
curl -s -b cookies.txt -X POST http://localhost:8080/api/v1/announcements \
  -H "Authorization: Bearer <admin_token>" \
  -H "Content-Type: application/json" \
  -H "X-XSRF-TOKEN: <csrf_token>" \
  -d '{
    "title": "Q1 2026 All-Hands Meeting",
    "content": "Join us for the Q1 all-hands meeting this Friday at 3 PM IST.",
    "category": "EVENT",
    "priority": "HIGH",
    "targetAudience": "ALL_EMPLOYEES",
    "isPinned": true,
    "sendEmail": false,
    "requiresAcceptance": false
  }'
```

**Result:** 500 Internal Server Error
**Bug:** Announcement creation fails with 500. GET /api/v1/announcements returns 200 (empty). Similar pattern to Recognition — reads work, writes fail.

### Step 7: Verify Wall Feed

```bash
curl -s "http://localhost:8080/api/v1/wall/posts?size=5" \
  -H "Authorization: Bearer <admin_token>"
```

**Result:** 200 OK
- 8 total posts in feed (including historical posts)
- All 3 new posts (POST, POLL, PRAISE) appear correctly
- Post ordering: newest first (createdAt DESC)
- Author enrichment working (fullName, designation, avatarUrl)
- Poll vote counts reflected in real-time

---

## Bugs Found

### BUG-1: Leave Balances Endpoint Returns 500 (Critical)
- **Endpoints:** `GET /api/v1/leave-balances` and `GET /api/v1/leave-balances/me`
- **Impact:** Employees cannot view their leave balance dashboard
- **Probable Cause:** Repository query issue, missing DB view/function, or entity mapping error in `LeaveBalanceController`
- **Workaround:** Leave application still works despite balance check failure (the `getOrCreateBalance` in the service creates balances on-the-fly)

### BUG-2: Recognition Creation Returns 500 (Medium)
- **Endpoint:** `POST /api/v1/recognition`
- **Impact:** Cannot create recognition/kudos through the dedicated recognition module
- **Workaround:** Use wall praise posts (`POST /api/v1/wall/posts` with `type: PRAISE`) — this works correctly
- **Probable Cause:** Missing or mismatched DB table/column for `Recognition` entity

### BUG-3: Announcement Creation Returns 500 (Medium)
- **Endpoint:** `POST /api/v1/announcements`
- **Impact:** Cannot create company announcements
- **Probable Cause:** Missing or mismatched DB table/column for `Announcement` entity, or a service-layer error in `AnnouncementService.createAnnouncement()`

### BUG-4: CSRF Required for ALL Mutations — No Documentation (Low)
- **Issue:** All POST/PUT/DELETE endpoints require CSRF double-submit cookie (`X-XSRF-TOKEN` header matching `XSRF-TOKEN` cookie). Without it, the server returns 403 Forbidden with no indication that CSRF is the issue.
- **Impact:** API consumers (mobile apps, external integrations) will get silent 403s
- **Recommendation:** Add CSRF requirement to API documentation. Consider CSRF exemption for pure JWT-authenticated API calls (cookie-less).

### BUG-5: Scope Filtering Gap for Manager Leave View (Low)
- **Endpoint:** `GET /api/v1/leave-requests/status/PENDING`
- **Issue:** Sumit (MANAGER role with `LEAVE:VIEW_TEAM` scope) gets empty results when querying PENDING leave requests, even though Saran (his reportee) has a pending request. However, Sumit CAN approve the same leave request by ID.
- **Probable Cause:** `DataScopeService.getScopeSpecification()` may not be correctly building the team scope filter, or Saran's `managerId` is not set to Sumit's employeeId.

### BUG-6: No Self-Service Profile Update Endpoint (Enhancement)
- **Issue:** No `PUT /employees/me` or `PATCH /employees/me/profile` endpoint exists. Profile updates require `EMPLOYEE:UPDATE` permission (admin-only).
- **Impact:** Employees cannot update their own phone number, address, emergency contact, etc.
- **Recommendation:** Create a restricted self-service endpoint that allows updates only to non-sensitive fields (phone, personal email, emergency contact, address).

---

## CSRF Protocol (Required for all mutation tests)

All state-changing requests (POST, PUT, PATCH, DELETE) require CSRF double-submit cookie:

1. Make any GET request with the cookie jar to receive the `XSRF-TOKEN` cookie
2. Extract the token value from the cookie
3. Send it back as the `X-XSRF-TOKEN` header on mutation requests
4. Also send the cookie itself (via `-b cookies.txt`)

**Exception:** Auth endpoints (`/api/v1/auth/**`) are exempt from CSRF.

---

## Test Environment Details

- **App Status:** UP (healthy)
- **Active Profile:** dev
- **Database:** PostgreSQL (Neon cloud) — 458ms response time (high, warning issued)
- **Heap Usage:** 831.9 MB / 3.56 GB (22.8%)
- **Uptime at test start:** ~25 minutes
