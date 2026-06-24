# Auth QA Results — 2026-06-24

Target: https://hrms-frontend-vert.vercel.app
Run time: ~17:00–17:10 IST

## Summary
- Total accounts tested: 13
- PASS: 12
- FAIL: 1 (admin@nulogic.io — Bad credentials / 401)
- BLOCKED: 0

## Results

| # | Email | Result | Actual Role | Display Name | Post-Login URL | Notes |
|---|-------|--------|-------------|--------------|----------------|-------|
| 1 | arun@nulogic.io | PASS | EMPLOYEE | Arun T | /me/dashboard | Engineering · Employee |
| 2 | anshuman@nulogic.io | PASS | EMPLOYEE | Anshuman K | /me/dashboard | Engineering · Employee |
| 3 | sumit@nulogic.io | PASS | MANAGER | Sumit Kumar | /me/dashboard | Engineering · Manager; Pending Approvals visible |
| 4 | mani@nulogic.io | PASS | TEAM LEAD | Mani S | /me/dashboard | Engineering · Team Lead; 6 pending approvals |
| 5 | gokul@nulogic.io | PASS | TEAM LEAD | Gokul R | /me/dashboard | Engineering · Lead |
| 6 | dhanush@nulogic.io | PASS | TEAM LEAD | Dhanush A | /me/dashboard | HR Lead job title; not in demo panel — form login used |
| 7 | jagadeesh@nulogic.io | PASS | HR MANAGER | Jagadeesh N | /me/dashboard | HR Manager |
| 8 | suresh@nulogic.io | PASS | RECRUITMENT ADMIN | Suresh M | /me/dashboard | Recruitment Lead |
| 9 | saran@nulogic.io | PASS | HR ADMIN | Saran V | /me/dashboard | Attendance already completed today |
| 10 | raj@nulogic.io | PASS | FINANCE ADMIN | Raj P | /me/dashboard | Not in demo panel — form login used |
| 11 | finance@nulogic.io | PASS | FINANCE ADMIN | Fiona Nance | /me/dashboard | "No employee profile linked" warning on dashboard |
| 12 | tenant.admin@nulogic.io | PASS | TENANT ADMIN | Tenant Admin | /me/dashboard | Not in demo panel — form login used |
| 13 | admin@nulogic.io | FAIL | N/A | N/A | /auth/login | Authentication Failed: Bad credentials (401) |

## Critical Issues
- **admin@nulogic.io**: Login returns 401 Bad credentials. This account is not provisioned in the demo seed or has a different password. Needs investigation before go-live.

## Observations
- **finance@nulogic.io** (Fiona Nance): Login succeeds (FINANCE ADMIN role) but dashboard shows "No employee profile linked". The account lacks a linked employee record — functional issue, not auth failure.
- **dhanush@nulogic.io**: Expected "Team Lead HR" per spec; actual role badge is "TEAM LEAD". Job title shows "HR Lead" which is consistent. No auth issue.
- **raj@nulogic.io**: Expected "Verify actual role live"; actual is FINANCE ADMIN. Two Finance Admin accounts exist (raj@ and finance@).
- **saran@nulogic.io**: Expected "Verify actual role live"; actual is HR ADMIN.
- Demo panel shows 10 accounts (excludes fayaz.m SUPER ADMIN). Accounts not in demo panel (dhanush, raj, tenant.admin, admin) require form login.
- All 12 successful logins landed on /me/dashboard with correct role badges.
- No 403/auth errors on successful logins.
