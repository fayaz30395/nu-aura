# Release-readiness doc consistency check (2026-11-20)

Documents only compared against each other; no claim checked against code. Short names: Plan = `17-e2e-browser-test-plan.md` (A4 table), Reg = `evidence/bug-register.md`, P3/P4/P5/P6P7 = the `*-static-status.md` files, Verify = `evidence/fixes/verify.md`, Exec = `00-executive-summary.md`, GoNoGo = `16-release-go-no-go.md`.

## (a) Contradictions for the same bug id

| Item | Document A says | Document B says | Suggested resolution |
|---|---|---|---|
| a1 G-009 | P4: STILL OPEN (Objective.java:126-130, COMPLETED stays after key result lowered) | Reg decisions: "Accepted by design". Plan P4: "accepted by design" | Change P4 verdict to ACCEPTED. Reg row "P4 static status: 13 FIXED, 3 open" then becomes 15 fixed, 2 open, 1 accepted |
| a2 F-010 | P5: UNCLEAR (useCreateWikiPage does not invalidate wikiSpaces) | Reg: "Fixed in code, not proven live" (1b7e0090) | Update P5 row to FIXED-CODE (not live). Reg already has the right wording |
| a3 UI-007 remainder and `/settings/sso` | P6P7: STILL OPEN (attrition and SSO still make the denied call). Plan P1: manager logs 403 on `GET /auth/saml/config` for `/settings/sso`. Reg "429" row: manager 403 "is expected for a role without SSO admin" | Reg "UI-007 remainder": Fixed, SAML config query now needs SYSTEM_ADMIN, "no 4xx on either route" for HR and manager | Pick one story: fixed in abc75d9e. Update P6P7 and Plan P1 note; drop the "403 is expected" sentence from the Reg 429 row or mark it superseded |
| a4 Q-026 | P6P7: UNCLEAR, cites `HolidayCarousel.tsx` (dots 24 px). Reg row "Q-026 carousel dots": Fixed, flagged dots were `LeaveBalanceWidget`, "not HolidayCarousel, already fixed in 16d80143" | Plan P6: lists Q-026 as an open Low finding (carousel dots, MGR `/me/dashboard`) | Name the right component everywhere (`LeaveBalanceWidget`). Mark Q-026 fixed in P6P7 and remove it from the Plan P6 open list |
| a5 Q-019 | P6P7: UNCLEAR, workaround `aria-controls={undefined}` added, "needs axe" | Plan P6 and Reg "P6 re-run": axe still reports it on 3 routes, so the workaround did not work. Left open on purpose | Mark Q-019 STILL OPEN (Low, accepted) in P6P7 |
| a6 F-005 | Verify: PASS (re-verified), `/fluence/search` shows "Found 2 results" | Plan P5 and Reg: "unproven", API and page both empty, Elasticsearch not running | State which run is later and why they differ (index state or data). Until then keep "unproven"; add a note to Verify |
| a7 H-001 | Verify: PASS with env note. Anonymous call uses default tenant 550e8400, which has no jobs. Verify says it created 2 OPEN jobs in another tenant and replayed the response | Reg: "Consistent, not proven. No open job exists to prove a live job renders". Reg top row still lists H-001 as a High defect | Say who is right about open jobs. State the root cause once (default-tenant config vs no data). Consider an env or config item instead of a code bug |
| a8 UI-004 | Reg header: fixed in d10bc9b9 and needs re-verification. P6P7: UNCLEAR | Verify: PASS live (`/me/documents` stays on URL after 3.5 s) | Set UI-004 FIXED in P6P7, citing Verify (that makes 13 UNCLEAR drop to 11) |
| a9 H-013 and H-015 | P3: both FIXED. P3 itself says H-013 only covers the same job opening and H-015 leaves the "Nov 17" referral date unaddressed | Plan P3: "H-013 and H-015 only partly fixed". Reg row H-013 still says any two candidates with the same email | Use PARTIAL in P3 for both (and H-022: "stays SCHEDULED" not changed) |
| a10 H-021 | P3: UNCLEAR | Reg: "Probably fixed, not re-run" | Use one word. Keep UNCLEAR until `p3-t16.mjs` is re-run |
| a11 Reg header vs body | Reg header: "All rows OPEN except UI-001/003/004/005/008/009/010 ... Fix round in 16d80143 and e0840b21" | Reg body, static files, Verify: dozens more fixed (for example G-001, F-001..F-004, H-003, S-001) | Rewrite the header or add a Status column (see c1) |
| a12 Internal review row | Reg: review found "2 Low: see next two rows" | The next two rows are one Low (searchParticipants, accepted) and one "No defect" (getManagers) | Say "1 Low" or reorder the rows |

## (b) Plan 17 status rows that overstate or understate their evidence

| Item | Document A says | Document B says | Suggested resolution |
|---|---|---|---|
| b1 Status vocabulary | A1 allows only PASS, FAIL, BLOCKED, NOT RUN. A5: each phase "PASS, or BLOCKED with a reason" | A4 uses PARTIAL (P3, P7), "PASS (partial coverage)" (P4) and "PASS with N Low/BLOCKED" | Map to the allowed set. P3 and P7 as BLOCKED with the reason, or add PARTIAL to A1 and A5 |
| b2 P1 "PASS with 8 open Low" | Plan P1: only the 8 console 429 FAILs are mentioned | `p1-full-hradmin.md`: REVIEW-denied 46 + 20 + 44 = 110 page loads (routes.ts allows, page denied) are untriaged. Plus 40 dynamic routes BLOCKED | Add "110 REVIEW-denied loads untriaged" to the P1 row, or triage them. State that the 8 FAILs are partly superseded by a3 |
| b3 P2 "PASS with 2 BLOCKED" | Reg header and P6P7 count UI-008 and UI-009 as FIXED | Verify: UI-008, UI-009 NOT VERIFIED. P2 E5b and E5c are the blocked timesheet steps | Mark UI-008 and UI-009 "FIXED-CODE, not live" and tie them to the P2 BLOCKED steps (UI-002 data gap) |
| b4 P4 "PASS on re-run (partial coverage)" | Plan: not run key result add, review submit, 360, PIP, training enrol, survey create | Reg counts G-008, G-003 etc. as fixed from static reading or from the earlier 16d80143 run | Add a one-line "live vs static" split to the row (live: G-002, G-004, review cycle; the rest static) |
| b5 P5 "PASS on re-run, F-005 unproven" | Plan: F-001..F-006 live only | F-007..F-016 are static only (8 FIXED, 2 UNCLEAR). Wall, recognition, helpdesk, comments not re-run, and the row does not say F-007..F-016 are static | Add "F-007..F-016 static only" to the row |
| b6 P6 "PASS with 3 Low" | Plan lists Q-019, Q-026 and a payroll dark contrast row as open | Reg: Q-026 fixed (abc75d9e). 128 runs cover only 32 routes, so the other P6P7 UNCLEAR items (Q-013..Q-015, Q-017, Q-018, Q-023, Q-024, Q-027, Q-028) are not closed by the re-run | Update the Low list to 2 items. Add that 11 static UNCLEAR rows remain browser-unverified for untested routes |
| b7 P7 "PARTIAL" | Plan P7: lists only upload validation, rate limit, bundle scan as new PASS | Reg and P6P7 also count S-001, S-003..S-006 FIXED (static only; S-001 live PASS was before the minimal DTO). Reg: limiter ran in local mode, Redis mode not checked | Add "S-001..S-006 static only" and "Redis limiter mode unchecked" to the P7 row |
| b8 A7 review state | A7: "The Status table (A4) notes the review state" | Only the P1 row says "A7 review NOT RUN". Other rows are silent. A7 table (L185-192) says NOT RUN for P0..P7 | Add "A7 NOT RUN" to every A4 row, or say in A4 that all rows are NOT RUN |
| b9 P3 row wording | Plan P3: "H-002, H-023, H-024 fixed (V353)" | Reg: only H-024 is V353. H-023 and H-002 are frontend fixes | Reword to "H-024 fixed by V353; H-002, H-023 verified" |

## (c) Numbers that disagree

| Item | Document A says | Document B says | Suggested resolution |
|---|---|---|---|
| c1 Fix-status totals | Reg header: over 117 entries FIXED 84, PARTIAL 7, SKIPPED 11, NEEDS-DECISION 15 | Static files (109 of the 117 rows): FIXED 84 (incl. 2 FIXED-LIVE), STILL OPEN 7, UNCLEAR 17, ACCEPTED 1. Another 8 rows (F-001..F-006, H-001, H-002) are live-verified. Different taxonomy, same "84" by coincidence; later fixes (a3, a4, F-010) not in either | Add a Status column to the register table and regenerate one set of totals. Drop the header totals until then |
| c2 P4 totals | Reg row: "13 FIXED, 3 open". Plan P4: "13 FIXED, G-009 accepted, G-010/G-011 open" (13+1+2 = 16) | P4 file has 18 rows: 13 FIXED + 2 FIXED-LIVE (G-002, G-004) + 3 STILL OPEN | Say 15 fixed, 1 accepted (G-009), 2 open (G-010, G-011) |
| c3 Test-data row count | Reg: "16 NUAURA_TEST rows" | Same row lists 3 work requests + 1 referral + 1 ticket + 9 comments = 14 | Fix the number or add the 2 missing items |
| c4 Fix commits in Reg header | Reg header: fix round is 16d80143 and e0840b21, "local, not pushed" | Reg body, P3, P4, P6P7 also cite d10bc9b9, c9ee9e54, 818a7405, 8bd65698, d7241e6e, 1aaeeb6e, a18a956b, 0b2a37e6 (and abc75d9e is HEAD). V352 row has no commit hash | List the full commit range once; add the V352 hash; restate pushed status |
| c5 Static-file base commits | P3: base c0e483a3. P4 and P6P7: base 54110ec1 | P6P7 says "current main (HEAD 54110ec1)" but F-010 fix 1b7e0090 and abc75d9e came later | State the base per file and mark P5/P6P7 rows that later commits changed (F-010, Q-026, UI-007) |
| c6 P1 evidence files | Plan P1: sweep @ d7241e6e, 8 FAIL, "p1-full-hradmin.md covers all roles" (4+2+2 = 8, correct) | `p1-full-employee.md` and `p1-full-manager.md` are older (8bd65698): FAIL 38 and 20, plus 1 gate-missing each. Same folder, same name pattern | Rename or mark the two older files as superseded |
| c7 Critical and High counts | Exec L26 and GoNoGo: Critical found 4, High about 20 | Reg: Critical 1 (G-001), High 23 (+1 High/Medium). Different scope (audit vs UI) but never joined | Add one sentence to Exec: "UI register adds 1 Critical, 23 High, status in Plan 17" |
| c8 Test counts | Exec L23 and GoNoGo L22: backend 5325 run, vitest 2634 | Fix round added tests (benefits.service.test.ts, EmployeeControllerTest, hook tests) and code after that run | Re-run and refresh, or date the numbers |

Checked and consistent: register 117 rows and its severity split (1/23/1/52/40) and prefix split (F16 G18 H36 Q28 S6 UI13); catalogue 124+24+39+29+56+18 = 290; P1 249x3x2 = 1494 and 185 before fixes; P6 32 routes x 4 = 128; P3 30+1+3 = 34; P5 8+2 = 10; P6P7 31+12+3+1 = 47; matrix 451 rows adds up; Verify "22 PASS" matches.

## (d) Stale statements in 00-executive-summary.md and 16-release-go-no-go.md (listed only)

| Line | Text (short) | Why stale |
|---|---|---|
| Exec L1 | "Executive Summary (2026-11-15)" | Written before V350-V353, UI register and P0-P7 re-runs (2026-11-18..20) |
| Exec L3 | Links only `15-known-defects.md` and `16-ui-upgrade-plan.md` | No link to Plan 17 or `evidence/bug-register.md` |
| Exec L13 | RBAC "grants repaired (V345)" | V350-V353 added HR/MANAGER grants (letters, documents, referrals, meetings, certificates) |
| Exec L14 | Tenant isolation "PASS (local only)" | Reg 2026-11-19: two-tenant isolation NOT TESTABLE locally |
| Exec L16 | Browser E2E "14 checks: 10 pass, 3 fail, 1 inconclusive; rerun needed" | Plan 17 P0-P7 ran: 1494 route loads, 19 P2 steps, 128 P6 runs; reruns done |
| Exec L23 | "frontend vitest 2634" and "backend 5325" | Pre-fix-round numbers (c8) |
| Exec L26 | Critical 4, High about 20 | UI register adds Critical 1, High 23 (c7) |
| Exec L32 | "Fixes uncommitted/undeployed" | Fixes are committed locally (Reg header); only the push and deploy remain |
| Exec L39 | "approve cleanup of NUAURA_TEST_* data (lists in test-data-*.md)" | Reg lists more deferred test data (P2, P4, P5 re-runs, 2 storage objects) with owner "release manager", no API removal path |
| GoNoGo L7 | "40+ fixes ... uncommitted and undeployed" | Same as Exec L32 |
| GoNoGo L12 | "Cross-tenant access: None found (RLS verified ...)" | Two-tenant test not testable locally (Reg) |
| GoNoGo L22 | Test counts "5325 / 2634 / Next 16.4.6 build OK" | c8 |
| GoNoGo L28 | "Commit, review and deploy the uncommitted fixes (V342-V345)" | Range now reaches V353 and the fixes are committed |
| GoNoGo L32 | "Decisions needed from you" list | Missing newer product decisions: H-016 Applicant-to-Candidate status mapping, G-010/G-011 enrolment data, UI-013, TASK:VIEW page, UI-002 PSA seed |
| GoNoGo L35 | "Browser E2E: 14 checks (10 pass, 3 fail since fixed, 1 inconclusive), not the full 123 Playwright specs" | Same as Exec L16 |
