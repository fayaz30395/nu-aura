# nu-chrome-e2e — Run Report (2026-04-22-0424)

## Verdict

`SKILL_EXIT: partial reason=catalog_route_mismatch_and_mcp_serial_throughput`

## Summary

- **Bootstrap (Persona 0):** clean — all 5 gates green (docker, infra, backend, frontend, Chrome MCP). Two P0 startup blockers found and fixed in flight.
- **Iteration 1 (QA smoke):** 10 use cases sampled. 5 SUPER_ADMIN pages render cleanly; 5 EMPLOYEE negative-RBAC checks return 403 as expected on the backend.
- **Iteration 1 did NOT complete the full 900-UC catalog.** Blocked by (a) the catalog's route paths not matching the actual Next.js app tree, and (b) serial MCP navigation + Next.js dev-mode compile-on-demand making 900 round-trips infeasible inside this session's budget.

## Bootstrap Fixes Applied (Persona 0 → Medic)

| File | Line | Change | Class |
|------|-----:|--------|-------|
| `V132__seed_lms_course_view_for_employee.sql` | 13 | `ON CONFLICT (code) DO NOTHING` → `ON CONFLICT (code) WHERE is_deleted = false DO NOTHING` | FLYWAY_ON_CONFLICT_PARTIAL_INDEX |
| `V133__seed_analytics_view_for_hr_roles.sql`  | 11 | same pattern                                                                              | FLYWAY_ON_CONFLICT_PARTIAL_INDEX |

Both migrations now target the partial unique index `idx_permission_code ... WHERE is_deleted = false` correctly. Stale packaged JAR with the old `module` column was rebuilt via `mvn clean package -DskipTests`. Backend health `{"status":"UP"}` confirmed on PID 73606.

## Positive Findings

- Backend RBAC is enforced cleanly — EMPLOYEE hits 403 on every tested admin endpoint.
- SUPER_ADMIN landing + employee management + analytics + Fluence wiki all render without console errors.
- Login API, JWT cookie issuance, and session restore on page reload all behave as designed.

## Open Issues

1. **`use-cases.yaml` route mismatch (P2).** The catalog references paths like `/hrms/employees` and `/admin/users` that do not exist in `frontend/app/`. Real routes are flat (`/employees`, `/admin/employees`). ~300 UC-RBAC rows are likely miscategorised. Regenerate via a script that walks `frontend/app/` `page.tsx` files.
2. **Client-side identity cache (P3).** `sessionStorage['auth-storage']` retains prior-session user info across `fetch`-based re-auths; UI renders stale-role shell until storage is cleared. Backend stays authoritative, so this is a UX / defense-in-depth issue. Fix: clear `auth-storage` on any 401/403.

## What Was Not Completed

- 890 of 900 use cases unrun (99%). Skipped due to catalog mismatch + single-tab serial-nav throughput. True 5-tab-per-role parallelism described in SKILL.md requires a headless Playwright runner — Chrome-in-Chrome MCP is single-tab interactive.
- Full 9-role matrix: only SUPER_ADMIN (UI) + EMPLOYEE (API) sampled.
- No clean-sweep iteration possible — requires previous iteration to have run the full catalog.

## Recommendations

- **Before next run:** regenerate `use-cases.yaml` from real route tree; fix client-cache invalidation on auth errors.
- **Runner change:** add a Playwright harness under `frontend/e2e/rbac-matrix.spec.ts` that drives the 765 UC-RBAC cases in parallel contexts — the skill can then invoke it and consume JSON results.

## Artifacts

```
qa-reports/nu-chrome-e2e/2026-04-22-0424/
├── report.md       ← this file
├── bug-sheet.md    ← 4 rows (2 VERIFIED, 2 OPEN)
├── bootstrap.log   ← full Medic trace
├── trace.log       ← iteration handoffs
├── console.log
├── network.log
├── locks/
└── screenshots/
```

## Exit

`SKILL_EXIT: partial reason=catalog_route_mismatch_and_mcp_serial_throughput`
