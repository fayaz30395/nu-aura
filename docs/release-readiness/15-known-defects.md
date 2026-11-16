# NU-AURA Release-Readiness: Known Defects (consolidated)

Status key: FIXED-VERIFIED (fixed in code, re-tested live) | FIXED-UNIT (code + unit test only) | OPEN | NEEDS-HUMAN.
All fixes are uncommitted in the working tree. Source evidence: `evidence/defects-*.md`, `evidence/fixes-*.md`, `evidence/verify-live.md`.

## Critical
| ID | Defect | Status |
|---|---|---|
| DEF-PAY-05 | Payslip PDF 0 bytes (`toByteArray` before `document.close`) | FIXED-VERIFIED (12350 bytes, %PDF) |
| DEF-PAY-04 | Approved unpaid leave / expenses never reach payroll | FIXED-VERIFIED (unpaid leave: 48000.00 -> 41478.27); expense path unit only |
| DEF-HIRE-01 | Offer creation 500 (CHECK constraint lacks RECRUITMENT_OFFER) | FIXED-VERIFIED (V342, POST 201) |
| DEF-AUDIT | Audit events never persisted (pre-set id + outbox tx opened before tenant) | FIXED-VERIFIED (audit_logs 334 -> 338) |

## High
| ID | Defect | Status |
|---|---|---|
| DEF-HIRE-02 | candidates.current_stage CHECK rejects enum stages | FIXED-VERIFIED (V342) |
| DEF-HIRE-10 | Interviewer reads PII of unassigned candidate | FIXED-VERIFIED (403) |
| DEF-GROW-01..03 | Detached-entity errors on create | FIXED-VERIFIED for OKR key result; ~48 same-pattern sites remain OPEN |
| DEF-GROW-04/05 | Manager REVIEW:APPROVE org-wide; non-report review readable | FIXED-VERIFIED (403) |
| DEF-FLUENCE-01/03 | Wiki/blog/template create 500, lazy-load 500 | FIXED-VERIFIED (blog, template, list, GET/PUT by id); wiki create via API depends on KNOWLEDGE:WIKI_CREATE holders |
| DEF-FLUENCE-02 | Wiki UI sends content as object | FIXED-UNIT |
| DEF-FLUENCE-04 | Draft/PRIVATE content leak | PARTIAL: TEAM/RESTRICTED visibility unchecked; search hides owner's own drafts |
| DEF-HRMS-01 | /auth/me, /auth/refresh in 5/min auth bucket | FIXED-UNIT (live after restart) |
| DEF-HRMS-02 | PUT /users/{id}/roles 500 (RLS on user_roles) | FIXED-VERIFIED (V344) |
| DEF-HRMS-03 | Manager 403 on leave reject | FIXED-VERIFIED (V344) |
| DEF-RBAC-01 | EMPLOYEE missing 20 default grants; no non-admin KNOWLEDGE | FIXED-VERIFIED for wiki read (V345); MANAGER/HR_MANAGER self-service defaults OPEN |
| DEF-RBAC-02 | 49 codes held only by SUPER_ADMIN; PROJECT/TRAINING update/delete no holder | PARTIAL: project/training granted (V345); rest NEEDS-HUMAN |
| DEF-01 | Demo accounts/password in login bundle, demo on by default | FIXED-VERIFIED (no demo strings in 1406 chunks); prod must still set NEXT_PUBLIC_DEMO_MODE=false |
| DEF-02 | `:?` default makes missing encryption key a public default | FIXED (no default, startup fails); render deploy needs the env var |
| DEF-03/04 | Sentinel-prefixed values corrupted on re-save; key rotation cannot finish | OPEN (needs re-encrypt endpoints + data decision) |
| DEF-05 / DEF-BE-04 | npm audit (prod 6 -> 3: zod high, uuid moderate); Tomcat/Spring/Jackson behind fixes | OPEN (needs breaking bumps / network) |
| DEF-BE-02 | 44 migrations V0-V315 edited after apply; prod validate-on-migrate=true | OPEN (remote DB check needs authorisation) |
| DEF-TENANT-01 | Permission catalog stamped to one tenant; new tenants get 0 permissions | OPEN (matters only for multi-tenant hosting) |
| Payroll statutory | Statutory filings return 400; TDS slabs FY2024-25, no std deduction | OPEN; TDS NEEDS-HUMAN (CA) |
| R1 | MEMORY.md claims demo logins worked on prod after flag off | BLOCKED (needs remote authorisation) |

## Medium / Low (abbreviated)
- Payroll: same-user process+approve (FIXED-VERIFIED, product call for single-admin tenants); negative net pay (FIXED-UNIT); mid-month joiner (FIXED-VERIFIED); IFSC 11 chars (FIXED-VERIFIED, V343); PF/ESI/PT from statutory calculator (FIXED-UNIT); runs page gross 0.00 (OPEN, FE/DTO); payslip address line placeholder (OPEN).
- HRMS: no max_days_per_request, past-dated leave, department/manager cycles, attendance uses browser date (OPEN).
- Hire: job PUT wipes fields, no candidate-to-employee conversion, career page default tenant only, ESIGNATURE only for admins (OPEN).
- Grow: completed cycles reopen via PUT, complete skips stages, no LMS certificate (OPEN).
- Fluence: ENABLE_FLUENCE flag not seeded; versions endpoint 500 (FIXED-VERIFIED); wiki PUT 400 (FIXED-UNIT); FLUENCE-05 employee create perms NEEDS-HUMAN.
- RBAC: DEF-RBAC-05 (10 DB roles vs 26 in code), -06 (lookalike SUPER_ADMIN codes; 5 debris roles), -04/-11, -10 employee-update scope (FIXED-VERIFIED for manager; skill/document controllers keep old check).
- Tenant: DEF-TENANT-03 file download guard bypassable by `../` (OPEN), -05 `tenants` has no RLS, -06 app role owns all tables.
- ESLint ignore for `.next-*` (FIXED); Docker-down: 772 Testcontainers errors across 78 classes BLOCKED, 11 security classes (117 tests) unrun.

## Test-data cleanup pending
NUAURA_TEST_* rows and test users listed in `evidence/test-data-*.md` (secgate, verify, e2e). Cleanup SQL is in those files.
