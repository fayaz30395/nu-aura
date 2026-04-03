---
name: nu-aura-e2e-lifecycle
description: Use when asked to run end-to-end lifecycle tests, integration tests, or cross-module flow tests on NU-AURA. Tests connected journeys across multiple modules (hire-to-retire, leave escalation, payroll cycle, performance review, expense reimbursement, asset lifecycle, etc.) where data flows between modules and roles. Complements the module-level QA skill.
---

# NU-AURA End-to-End Lifecycle Test Suite

> **Purpose:** Test connected journeys where data flows between modules and roles.
> The module QA skill tests breadth (every page). This tests **depth** (real workflows, start to finish).
> Run this AFTER the module QA skill passes — it catches bugs that only appear when modules talk to each other.

## Execution Rules

1. **Stateful execution** — each step depends on the previous one. Carry IDs, names, dates between steps.
2. **Role-switching** — login/logout between roles as instructed. Verify session isolation.
3. **Rate limiting** — wait 15s between login switches (5 req/min on auth endpoint).
4. **After every step:** screenshot + `read_console_messages` + `read_network_requests`.
5. **If a step fails:** log as bug with step number, continue to next step. Don't abandon the flow.
6. **Output:** Summary table per scenario + Excel report with bugs found.

## Services

```bash
curl -s http://localhost:3000 | grep -c "html"     # > 0
curl -s http://localhost:8080/actuator/health       # {"status":"UP"}
```

## Test Data Naming Convention

All test data uses prefix `E2E-` + scenario number + timestamp to avoid collisions:
- Employee: `E2E-S1-John-[timestamp]`
- Job posting: `E2E-S2-QA-Engineer-[timestamp]`
- Project: `E2E-S5-Alpha-[timestamp]`

---

# SCENARIO 1 — HIRE-TO-RETIRE (Full Employee Lifecycle)

> Tests: Recruitment → Onboarding → Employee Creation → Profile → Project Mapping → Promotion → Leave → Payroll → Resignation → Offboarding

### S1.1 — RECRUIT (Login as REC or HRA)

```
navigate → /recruitment
Create job posting: "E2E QA Test Engineer [timestamp]"
  → department: Engineering, openings: 1, type: Full-time, location: Remote
  → Publish → status: "Active"
  → POST /api/v*/jobs → 201

Add candidate manually:
  → name: "E2E-John Lifecycle", email: e2e.john.[timestamp]@test.com
  → phone: 9876543210, resume: upload test PDF
  → appears in "Applied" stage

Move through pipeline (drag or action buttons):
  Applied → Screening → Interview → Offer
  → at each stage: verify status update, network request succeeds
  → schedule interview: date=tomorrow, type=Video, interviewer=[any MGR]

Make offer:
  → salary: 600000/year, start date: next Monday, template: Standard Offer
  → Send Offer → candidate in "Offer" stage
  → POST /api/v*/offers → 201

screenshot → s1-1-recruit-pipeline.png
```

### S1.2 — OFFER ACCEPTANCE (Login as candidate or simulate)

```
navigate → /offer-portal
  → find pending offer for E2E-John
  → click Accept → digital signature/acknowledgment
  → status: "Accepted"
  → verify: candidate auto-progresses to preboarding queue

screenshot → s1-2-offer-accepted.png
```

### S1.3 — PREBOARDING (Login as HRA)

```
navigate → /preboarding
  → find E2E-John in preboarding list
  → verify: document collection tasks visible
  → mark document tasks as received (ID proof, address proof, education certs)

screenshot → s1-3-preboarding.png
```

### S1.4 — CREATE EMPLOYEE ACCOUNT (Login as HRA/SYS)

```
navigate → /employees → Add Employee
  First: "E2E-John", Last: "Lifecycle-[timestamp]"
  Email: e2e.john.[timestamp]@test.com
  Department: Engineering
  Designation: QA Engineer
  Join Date: today
  Employment Type: Full-time
  Reporting Manager: [select existing MGR]
  → Save → POST /api/v*/employees → 201
  → note Employee ID: _________ (carry forward)
  → success toast shown
  → employee appears in list

screenshot → s1-4-employee-created.png
```

### S1.5 — ONBOARDING (Login as HRA)

```
navigate → /onboarding → find E2E-John
  → checklist items visible: Document submission, IT setup, Orientation, Policy acknowledgment
  → complete each item one by one
  → verify progress bar updates (25% → 50% → 75% → 100%)
  → at 100%: onboarding marked as "Completed"

screenshot → s1-5-onboarding-complete.png
```

### S1.6 — EMPLOYEE FILLS OWN PROFILE (Login as E2E-John / ESS)

```
Login with E2E-John's credentials
  → verify dashboard loads: "Good [time], E2E-John"
  → verify role label shows correctly

navigate → /me/profile
  → fill Personal tab: phone=9876543210, address="123 Test St", DOB, gender, blood group
  → fill Bank Details tab: account number, IFSC, bank name
  → fill Emergency Contact: name, relation, phone
  → upload profile photo (if supported)
  → Save each section → verify persistence on refresh

navigate → /me/documents
  → upload: ID proof, address proof
  → verify: documents listed with correct names

Check all /me/* pages are accessible:
  /me/profile, /me/payslips, /me/leaves, /me/attendance, /me/documents, /me/assets

screenshot → s1-6-profile-filled.png
```

### S1.7 — MAP TO PROJECT (Login as HRA/SYS or MGR)

```
navigate → /projects
  → find or create project: "E2E-Alpha-Project-[timestamp]"
  → assign E2E-John: allocation=80%, start=today, end=3 months
  → POST /api/v*/allocations → 201
  → verify: E2E-John appears in project team list

navigate → /employees/[john-id]
  → verify: Reporting Manager is set
  → verify: project allocation visible on profile

(As MGR) navigate → /employees or team view
  → verify: E2E-John appears in "My Team" list

screenshot → s1-7-project-mapped.png
```

### S1.8 — PROMOTION (Login as HRA or MGR)

```
navigate → /compensation or /employees/[john-id]/compensation
  → Initiate Revision / Increment
  → New Designation: "Senior QA Engineer"
  → New CTC: 800000 (up from 600000)
  → Effective Date: 1st of next month
  → Reason: "Performance-based promotion"
  → Save → POST /api/v*/compensation/revisions → 201

verify:
  → revision history shows old + new entries
  → employee profile reflects new designation
  → effective date is respected (not applied before date)

screenshot → s1-8-promotion.png
```

### S1.9 — LOGIN/LOGOUT CYCLE (Login as E2E-John / ESS)

```
Test 1: Login → dashboard loads → correct name + role
Test 2: Logout → redirected to /auth/login → session cleared
Test 3: Browser back button → still on login (not dashboard)
Test 4: Login again → session restores correctly
Test 5: Close tab → reopen localhost:3000 → still authenticated (session persistence)
Test 6: Open 2 tabs → logout in tab 2 → tab 1 should be invalidated on next action

screenshot → s1-9-session.png
```

### S1.10 — LEAVE WITH ESCALATION

```
(As E2E-John / ESS)
  navigate → /leave → Apply Leave
  → Type: Earned Leave
  → From: 3 days from now, To: 4 days from now (2 working days)
  → Reason: "E2E test leave"
  → Submit → status: "Pending"
  → verify: balance NOT deducted yet
  → POST /api/v*/leave/requests → 201

(As MGR — John's reporting manager)
  navigate → /approvals
  → verify: E2E-John's leave request visible in pending list
  → verify: notification bell shows pending count
  → DO NOT approve — leave it pending for 30 seconds

(As HRA/SYS — escalation path)
  navigate → /approvals
  → find E2E-John's pending leave request
  → Approve → reason: "Manager unavailable, admin override"
  → status: "Approved"

(As E2E-John / ESS)
  navigate → /leave
  → verify: request status = "Approved"
  → verify: leave balance deducted by 2 days
  → verify: leave calendar shows the dates marked

screenshot → s1-10-leave-escalation.png
```

### S1.11 — PAYSLIP (Login as PAY or SYS)

```
navigate → /payroll
  → find or run payroll for current month that includes E2E-John
  → verify: E2E-John appears in employee list with correct CTC
  → if manual entry needed:
    Basic: 33333, HRA: 13333, DA: 8333, Special: 11667
    Deductions: PF=4000, PT=200, TDS=2500
    Net Pay: 56633
  → Save/Process

(As E2E-John / ESS)
  navigate → /me/payslips or /payroll
  → verify: payslip for current month visible
  → click → detail view: earnings, deductions, net pay all correct
  → no "NaN", "undefined", or ₹0 amounts
  → Download PDF → opens correctly with E2E-John's name and amounts

screenshot → s1-11-payslip.png
```

### S1.12 — RESIGNATION & OFFBOARDING

```
(As E2E-John / ESS — if self-service resignation exists)
  navigate → /me/profile or resignation page
  → Submit Resignation → reason: "E2E test", notice period: 30 days
  → status: "Resignation Submitted"

OR (As HRA)
  navigate → /offboarding → Initiate Offboarding
  → search E2E-John → select
  → Last Working Date: 30 days from today
  → Reason: "Voluntary Resignation"
  → Submit → checklist created

Complete offboarding checklist:
  → Asset Return: mark all assets returned
  → Access Revocation: mark IT access revoked
  → Clearance: get department clearances
  → Exit Interview: fill questionnaire
  → verify: progress 25% → 50% → 75% → 100%
  → at 100%: Final clearance certificate generated

verify:
  → E2E-John's status: "Inactive" or "Exited"
  → E2E-John still in employee list (not deleted) but marked inactive
  → E2E-John cannot login after offboarding completes

screenshot → s1-12-offboarded.png
```

---

# SCENARIO 2 — EXPENSE REIMBURSEMENT LIFECYCLE

> Tests: Expense Claim → Manager Approval → Finance Approval → Reimbursement

### S2.1 — Submit Expense (Login as ESS)

```
navigate → /expenses → New Claim
  Category: Travel
  Date: yesterday
  Amount: 2500
  Description: "E2E cab to client site"
  Receipt: upload test image
  → Submit → status: "Pending"
  → POST /api/v*/expenses → 201
  Note claim ID: _________
```

### S2.2 — Validation Checks (Login as ESS)

```
Submit another claim:
  Amount: 0 → validation error
  No receipt → "Receipt required" error (if policy requires)
  Amount > policy limit → warning or block
  → form does NOT submit on validation failure
```

### S2.3 — Manager Approval (Login as MGR)

```
navigate → /approvals
  → find E2E expense claim → view details
  → Amount, receipt, description all correct
  → Approve → status: "Manager Approved"
  → verify: ESS sees "Manager Approved" status
```

### S2.4 — Finance Approval (Login as FIN)

```
navigate → /approvals
  → find same expense (now manager-approved)
  → Approve → status: "Approved" / "Reimbursement Pending"
  → verify: ESS sees final approved status
```

### S2.5 — Verify in Payroll (Login as PAY)

```
navigate → /payroll → reimbursements
  → E2E expense claim appears as pending reimbursement
  → amount matches original claim
```

---

# SCENARIO 3 — LEAVE BALANCE LIFECYCLE

> Tests: Accrual → Apply → Approve → Balance Deduction → Cancel → Balance Restore

### S3.1 — Check Initial Balance (Login as ESS)

```
navigate → /leave/balances
  → note current Earned Leave balance: _________
  → note Sick Leave balance: _________
```

### S3.2 — Apply Leave

```
Apply 1 day Earned Leave for next week
  → verify: balance shown on form = what was noted
  → Submit → status: "Pending"
  → verify: balance NOT yet deducted in /leave/balances
```

### S3.3 — Approve Leave (Login as MGR)

```
navigate → /approvals → Approve E2E leave
  → status: "Approved"
```

### S3.4 — Verify Deduction (Login as ESS)

```
navigate → /leave/balances
  → Earned Leave balance = initial - 1
  → leave calendar shows the date marked
```

### S3.5 — Cancel Approved Leave (Login as ESS)

```
navigate → /leave/requests → find approved leave
  → Cancel / Withdraw
  → confirm dialog → status: "Cancelled"
  → navigate → /leave/balances → balance restored to initial value
```

### S3.6 — Apply Leave Exceeding Balance

```
Apply Earned Leave for more days than balance
  → "Insufficient balance" error
  → form does NOT submit
```

---

# SCENARIO 4 — PERFORMANCE REVIEW CYCLE

> Tests: Create Cycle → Self-Assessment → Manager Review → Calibration

### S4.1 — Create Review Cycle (Login as HRA/SYS)

```
navigate → /performance
  → Create Review Cycle
  → Name: "E2E Q1 Review [timestamp]"
  → Type: Quarterly
  → Start Date: today, End Date: 7 days from now
  → Eligible: All employees (or specific department)
  → Launch → employees notified
```

### S4.2 — Self-Assessment (Login as ESS)

```
navigate → /performance
  → current cycle visible, status: "Self Assessment Pending"
  → click Start Self Assessment
  → goals/KPIs listed → rate each (1-5) + comments
  → Submit → status: "Self Assessment Submitted"
  → verify: cannot re-submit after submission
```

### S4.3 — Manager Review (Login as MGR)

```
navigate → /performance → team reviews
  → find ESS employee's submitted assessment
  → click Review
  → fill manager rating per goal + overall rating + development notes
  → Submit → status: "Manager Reviewed"
```

### S4.4 — Verify Final State (Login as ESS)

```
navigate → /performance
  → cycle shows "Manager Reviewed" status
  → can view manager's ratings (if policy allows)
  → cannot edit own assessment after manager review
```

---

# SCENARIO 5 — ASSET LIFECYCLE

> Tests: Add Asset → Assign → Employee View → Return → Re-assign

### S5.1 — Add Asset (Login as ITA/SYS)

```
navigate → /assets → Add Asset
  Name: "E2E MacBook Pro [timestamp]"
  Type: Laptop
  Serial: "E2E-SN-[timestamp]"
  Purchase Date: 1 month ago
  Value: 150000
  Warranty Expiry: 1 year from now
  → Save → status: "Available"
  Note asset ID: _________
```

### S5.2 — Assign to Employee (Login as ITA)

```
find E2E MacBook → Assign
  → select employee → assignment date: today → notes: "E2E test"
  → Assign → status: "Assigned"
  → employee profile /employees/[id] → assets tab shows this asset
```

### S5.3 — Employee View (Login as ESS)

```
navigate → /me/assets or /assets
  → E2E MacBook visible with serial, type, assignment date
  → cannot see other employees' assets
  → cannot create or edit assets (read-only for ESS)
```

### S5.4 — Return Asset (Login as ITA)

```
find E2E MacBook → Return
  → return date: today, condition: "Good"
  → Confirm → status: "Available" again
  → employee profile → asset removed from their list
```

### S5.5 — Re-assign to Different Employee

```
Assign same E2E MacBook to a different employee
  → verify: assignment history shows 2 entries (first employee + second)
  → first employee no longer sees it in their assets
```

---

# SCENARIO 6 — LOAN LIFECYCLE

> Tests: Apply → Approve → EMI Schedule → Payroll Deduction

### S6.1 — Apply for Loan (Login as ESS)

```
navigate → /loans → Apply for Loan
  Type: Personal Loan
  Amount: 100000
  Repayment Months: 12
  Reason: "E2E test loan"
  → Submit → status: "Pending Approval"
```

### S6.2 — Approve Loan (Login as HRA/FIN)

```
navigate → /loans or /approvals
  → find E2E loan → Approve
  → enter approval terms (interest rate if applicable)
  → Confirm → status: "Approved"
  → EMI schedule generated: 12 installments
```

### S6.3 — Verify EMI Schedule (Login as ESS)

```
navigate → /loans → click approved loan
  → EMI table: 12 rows with dates, principal, interest, balance
  → total repayment = principal + interest
  → monthly deduction amount visible
```

### S6.4 — Verify Payroll Impact (Login as PAY)

```
navigate → /payroll → run payroll for next month
  → E2E employee's payslip should show loan EMI as deduction
  → net pay reduced by EMI amount
```

---

# SCENARIO 7 — TRAVEL REQUEST LIFECYCLE

> Tests: Request → Manager Approve → Travel → Expense Report → Reimbursement

### S7.1 — Submit Travel Request (Login as ESS)

```
navigate → /travel → New Travel Request
  Destination: "E2E-Mumbai"
  Travel Dates: next week Mon-Wed
  Purpose: "Client meeting"
  Mode: Flight
  Estimated Cost: 25000
  → Submit → status: "Pending"
```

### S7.2 — Approve (Login as MGR)

```
navigate → /approvals → find travel request → Approve
  → status: "Approved"
```

### S7.3 — Post-Travel Expense Report (Login as ESS)

```
navigate → /travel → find approved travel → Submit Expense Report
  → actual costs: flight=18000, hotel=5000, cab=2000
  → attach receipts for each
  → Submit → linked to original travel request
```

### S7.4 — Finance Approval (Login as FIN)

```
Approve travel expense report
  → verify total matches itemized costs
  → feeds into reimbursement pipeline
```

---

# SCENARIO 8 — HELPDESK TICKET LIFECYCLE

> Tests: Create → Assign → Respond → Resolve → Reopen

### S8.1 — Create Ticket (Login as ESS)

```
navigate → /helpdesk → New Ticket
  Subject: "E2E laptop not working"
  Category: IT Support, Priority: High
  Description: "Screen flickering after update"
  → Submit → ticket ID generated, status: "Open"
```

### S8.2 — Admin Assigns & Responds (Login as HRA/SYS/ITA)

```
navigate → /helpdesk → find E2E ticket
  → Assign to self or IT team member
  → Reply: "Please restart and try safe mode"
  → verify: reply appears in thread
```

### S8.3 — Employee Replies (Login as ESS)

```
navigate → /helpdesk → find ticket
  → Reply: "Tried safe mode, still flickering"
  → reply appears in thread with timestamp
```

### S8.4 — Resolve (Login as ITA/SYS)

```
→ Reply: "Replaced display driver, issue resolved"
→ Close/Resolve → status: "Resolved"
→ resolution notes visible
```

### S8.5 — Verify Closure (Login as ESS)

```
→ ticket shows "Resolved" status
→ can view full thread history
→ can reopen if issue persists (if supported)
```

---

# SCENARIO 9 — ANNOUNCEMENT & FEED LIFECYCLE

> Tests: Create → All Employees See → Pin → Edit → Delete

### S9.1 — Create Announcement (Login as HRA/SYS)

```
navigate → /announcements → New Announcement
  Title: "E2E Test Announcement [timestamp]"
  Body: "This is an end-to-end test announcement"
  Target: All Employees
  → Publish → visible in list
```

### S9.2 — Employee Sees It (Login as ESS)

```
navigate → /dashboard → Company Feed → Announcements tab
  → E2E announcement visible
  → or navigate → /announcements → visible in list
```

### S9.3 — Pin & Edit (Login as HRA)

```
→ Pin announcement → moves to top
→ Edit → change body text → Save → updated
→ Unpin → returns to chronological order
```

### S9.4 — Delete (Login as HRA)

```
→ Delete → confirm dialog → removed
→ (As ESS) verify: no longer visible
→ direct URL to deleted announcement → 404 or not-found
```

---

# SCENARIO 10 — MULTI-ROLE SESSION ISOLATION

> Tests: Verify that switching roles doesn't leak data between sessions

### S10.1 — ESS Cannot See Others' Data

```
(Login as ESS employee A)
  → navigate to /employees/[employee-B-id] via direct URL
  → verify: 403 or redirect (NOT employee B's data)

  → navigate to /payroll/employees/[employee-B-id]/payslips
  → verify: 403 (NOT employee B's payslips)

  → navigate to /leave with employee B's filters
  → verify: only own leave requests visible
```

### S10.2 — MGR Sees Only Team

```
(Login as MGR)
  → navigate to /employees → only direct reports visible
  → navigate to /leave (team view) → only team's leave requests
  → navigate to /attendance → only team's records
  → try URL: /employees/[employee-from-other-team] → 403 or scoped data only
```

### S10.3 — Cross-Tenant Isolation

```
(Login as Tenant A employee)
  → inject Tenant B employee ID: /employees/[TENANT_B_ID]
  → verify: 403 or not-found — NEVER returns Tenant B data
  → check network response body for any tenant B data leakage
  → if data leaks → CRITICAL severity bug
```

### S10.4 — Concurrent Sessions

```
Tab 1: Login as ESS
Tab 2: Login as MGR (different user)
  → Tab 1: navigate to /dashboard → still shows ESS data (not MGR)
  → Tab 2: navigate to /dashboard → shows MGR data
  → Logout Tab 2 → Tab 1 still active
  → Logout Tab 1 → both sessions should be independent
```

---

# SCENARIO 11 — OKR + RECOGNITION FLOW

> Tests: Set OKR → Track Progress → Recognize Achievement

### S11.1 — Create OKR (Login as ESS)

```
navigate → /okr → Add Objective
  Title: "E2E Ship v2.0"
  Level: Individual
  Due: end of quarter
  KR1: "Complete 50 test cases", target=50, unit=count
  KR2: "Zero critical bugs in release", target=0, unit=count
  → Save → 0% progress
```

### S11.2 — Update Progress

```
→ KR1: Update → current=25 → progress=50%
→ parent objective recalculates
→ Check-in: "Halfway through test suite"
```

### S11.3 — Manager Recognizes (Login as MGR)

```
navigate → /recognition → Recognize
  → select E2E employee
  → badge: "Innovation"
  → message: "Great progress on v2.0 testing"
  → Send → appears in recognition wall and employee profile
```

---

# OUTPUT FORMAT

After all scenarios, produce:

## Summary Table

```
| Scenario | Steps | Passed | Failed | Bugs | Duration |
|----------|-------|--------|--------|------|----------|
| S1 Hire-to-Retire | 12 | ? | ? | ? | ? |
| S2 Expense Lifecycle | 5 | ? | ? | ? | ? |
| S3 Leave Balance | 6 | ? | ? | ? | ? |
| S4 Performance Cycle | 4 | ? | ? | ? | ? |
| S5 Asset Lifecycle | 5 | ? | ? | ? | ? |
| S6 Loan Lifecycle | 4 | ? | ? | ? | ? |
| S7 Travel Lifecycle | 4 | ? | ? | ? | ? |
| S8 Helpdesk Lifecycle | 5 | ? | ? | ? | ? |
| S9 Announcement Flow | 4 | ? | ? | ? | ? |
| S10 Session Isolation | 4 | ? | ? | ? | ? |
| S11 OKR + Recognition | 3 | ? | ? | ? | ? |
```

## Bug Report (Same format as QA skill)

```
Bug ID | Scenario | Step | Severity | Title | Steps to Repro | Expected | Actual | Screenshot
```

## Integration Gap Log

Track where data failed to flow between modules:
```
| Source Module | Target Module | Data Expected | Data Found | Bug? |
```
Example: Payroll should show loan EMI deduction, but shows ₹0 → integration bug.

---

## EXECUTION ORDER

```
Run scenarios in this order (dependencies):
1. S1  Hire-to-Retire     (creates the test employee used by later scenarios)
2. S3  Leave Balance       (uses S1's employee)
3. S2  Expense Lifecycle   (uses S1's employee)
4. S6  Loan Lifecycle      (uses S1's employee)
5. S7  Travel Lifecycle    (uses S1's employee)
6. S5  Asset Lifecycle     (independent — uses ITA role)
7. S4  Performance Cycle   (can use S1's employee or any)
8. S11 OKR + Recognition   (uses S1's employee)
9. S8  Helpdesk Lifecycle  (uses S1's employee)
10. S9  Announcement Flow  (independent — HRA creates)
11. S10 Session Isolation  (uses multiple roles, run last)
```

After S1 completes: S1's employee is available for S2-S9 and S11.
S10 runs last because it tests isolation and may invalidate sessions.

---

## IMPORTANT NOTES

- **State carries between steps** — employee IDs, leave request IDs, asset IDs, loan IDs created in earlier steps are used in later steps.
- **Screenshot every step result**, not just failures.
- **If a step blocks the entire scenario** (e.g., employee creation fails), log the bug and skip remaining steps in that scenario. Move to the next scenario.
- **This complements the module QA skill** — don't duplicate module-level checks here. Focus on data flowing correctly between modules.
- **Clock the total time** for each scenario. If any scenario takes >15 min of wall time, flag as a performance concern.
