# Live re-verification of fixes (2026-11-15, local stack, demo + NUAURA_TEST_ accounts)

Build: `mvn -o -DskipTests package` (no clean), BE restarted via `~/.config/nu-aura/run-be.sh`. Flyway applied V342, V343, V344 (flyway_schema_history success=t); older checksums validated on boot, not edited.
One defect fixed during this run (wiki controller, 1 loop). BE rebuilt and restarted twice; all other checks ran against code that includes the final jar.
No secrets in evidence. Scripts: `evidence/scripts/verify/`.

| Test | Scenario | Status | Evidence (under evidence/) | Repro |
|---|---|---|---|---|
| NU-VERIFY-01 | Payslip PDF download | PASS: 200, application/pdf, 12350 bytes, starts `%PDF`; other employee 403 | logs/NU-VERIFY-01-payslip-pdf.txt | 3 calls, same size |
| NU-VERIFY-02 | Unpaid leave 3 days reduces pay | PASS: K (3 LOP days) net 41478.27 vs L (same structure, none) 48000.00; LOP row in payroll_adjustments, PROCESSED | logs/NU-VERIFY-06/07 | per-day = gross/23 working days |
| NU-VERIFY-03 | Mid-month joiner proration | PASS: joined 16 Jul, gross 25806.45 = 50000 x 16/31 | logs/NU-VERIFY-07 | single run (July) |
| NU-VERIFY-04 | IFSC 11 chars | PASS: 201; stored encrypted length 53 | logs/NU-VERIFY-02 | repeated for 2nd employee path (J) |
| NU-VERIFY-05 | Maker-checker | PASS: processor approve 409 x2; second user 200 | logs/NU-VERIFY-08 | x2 |
| NU-VERIFY-06 | Offer POST | PASS: 201 x2, candidate OFFER_EXTENDED, offered_ctc 750000 | logs/NU-VERIFY-09 | x2 |
| NU-VERIFY-07 | Interviewer vs unassigned candidate | PASS: 403 x2; controls (assigned interviewer, hiring manager, recruiter) 200 | logs/NU-VERIFY-09 | x2 |
| NU-VERIFY-08 | OKR key result create | PASS: 200 x2, listed | logs/NU-VERIFY-10 | x2 |
| NU-VERIFY-09 | Manager vs non-report review | PASS: 403 x2 (+ competencies, + 2nd review); control 200 | logs/NU-VERIFY-10 | x2 |
| NU-VERIFY-10..13 | Wiki/blog/template POST then GET; wiki list | PASS after fix (below) | logs/NU-VERIFY-11 | x2 |
| NU-VERIFY-14 | PUT /users/{id}/roles | PASS: 200, user_roles rows present | logs/NU-VERIFY-03 | x2 |
| NU-VERIFY-15 | LEAVE:REJECT by manager (sumit) | PASS: 200 REJECTED x2 (note: `reason` is a query param) | logs/NU-VERIFY-05 | x2 |
| NU-VERIFY-16 | Login bundle without demo data | PASS: 0 of 1406 chunks contain demo emails or password (one `@nulogic.io` hit is the contact page support address) | logs/NU-VERIFY-12 | prod webpack build, flag empty |
| NU-VERIFY-17 | Wiki `/versions` | FAIL (new, not fixed) | logs/NU-VERIFY-11b | x2 |
| NU-VERIFY-18 | Wiki PUT without status/visibility | FAIL (new, Low, not fixed) | logs/NU-VERIFY-11b | x2 |
| NU-VERIFY-19 | Audit consumer persistence | FAIL (pre-existing, not fixed) | backend-session.log | continuous |

## Defect fixed in this run (1 loop)
DEF-FLUENCE-03 residual: `GET /wiki/pages/{id}` returned 500 (`LazyInitializationException`, WikiSpace proxy, `WikiPageDto.fromEntity:74`). The earlier fix left single-page, update, publish and similar endpoints outside a transaction.
Fix: `@Transactional` on `WikiPageController` (class) plus explicit read-only on `getRootPages`/`getChildPages`; `WikiPageController.java:33,143,284,294`. Test `WikiPageControllerLazyReadTest` (2 cases): RED before, GREEN after, with `WikiPageControllerTest` still passing. Live after fix: GET by id 200, PUT 200 x2, publish 200, GET child (lazy parent) 200.
View counting is preserved: the transaction is non-read-only on single-page GET.

## Open, not fixed (outside the verification list)
- DEF-VERIFY-01 (Medium): `GET /wiki/pages/{id}/versions` returns 500, controller serialises `WikiPageVersion` entities and reaches the lazy `page` proxy (`WikiPageController.java` versions endpoint ~L350). Fix: map to a DTO.
- DEF-VERIFY-02 (Low): `UpdateWikiPageRequest` with null `status`/`visibility` throws NPE in `valueOf` (`WikiPageController.java:195-196`), giving 500 instead of 400.
- DEF-VERIFY-03 (High, pre-existing, same bug class as the `setId(UUID.randomUUID())` sweep): `AuditEventConsumer.java:178` pre-assigns the AuditLog id, so `save` sees a detached entity with null `@Version` and fails. 52 failures since boot, retried every 5s, so outbox-driven audit events are not persisted and the poller transaction is marked rollback-only. Fix: drop the `setId` (or use `Persistable`/merge), then re-run.
- Fluence permissions: HR_MANAGER has no KNOWLEDGE:* (product decision, DEF-FLUENCE-05); creates only work for HR_ADMIN/TENANT_ADMIN/SUPER_ADMIN.
- Payslip PDF header is the placeholder text "COMPANY NAME / 123 Business Street" (content, not size).
- Not re-verified here: TDS, leaver proration, negative-net rollback behaviour, FLUENCE-04 search leak, V344 RLS default on other join tables.
