# Generated Playwright E2E Tests

Tests generated from `docs/qa/use-cases.v2.yaml` (single source of truth).

## Files

| File | Tests | Purpose |
|---|---|---|
| `route-smoke.spec.ts` | 222 | One per unique frontend route — page renders, no 5xx, no console errors, no uncaught exceptions, body has visible text. Authenticated as SUPER_ADMIN. |
| `rbac-redirect.spec.ts` | ~30-50 | Low-priv roles (EMPLOYEE, TEAM_LEAD, MANAGER) hitting admin-scoped routes (`/admin/**`, `/payroll/runs/**`, etc.) MUST get 401/403/redirect/denial copy. |
| `critical-journeys.spec.ts` | 5 | Hand-curated multi-step flows (login→dashboard→logout, employees list+detail, attendance, leave, approvals). Add more as new critical paths land. |
| `generate.py` | — | Regenerator. Reads YAML, emits `routes.json` + `rbac-matrix.json` + `roles.json`. |

## Why generated, not hand-written

YAML has **9180 total UCs** (1998 RBAC + 7155 API + 27 dynamic-route variants). Hand-rolling each as a Playwright test would mean ~30 MB of test code, ~hours of compile, zero review value.

What Playwright is actually good for: **does the page render in a real browser?** That's covered by the 222 smoke tests + 30-50 RBAC redirects + 5 journeys.

What Playwright is NOT the right tool for:
- **2025 API RBAC matrix** → already covered by `nu-rbac-autonomous` skill via `curl` (faster, parallel, context-free)
- **7155 API contract checks** → belong in `mvn test` (controller layer) or a Jest API harness, not browser
- **Per-cell observation logging** → covered by `qa-dev-loop` finding files

## Regenerate

```bash
# After updating use-cases.v2.yaml:
python3 frontend/e2e/generated/generate.py
# → routes: 222  rbac cells: 1998  roles: 9
```

The data files (`routes.json`, `rbac-matrix.json`, `roles.json`) are regenerated; spec files stay stable. Diff is contained to data, not test logic.

## Run

```bash
# All generated tests
cd frontend && npx playwright test e2e/generated/

# Just smoke
npx playwright test e2e/generated/route-smoke.spec.ts

# Just RBAC denials
npx playwright test e2e/generated/rbac-redirect.spec.ts

# Tag-based selection
npx playwright test --grep @smoke
npx playwright test --grep @rbac
npx playwright test --grep @journey
```

## Adding new critical journeys

Add `test('...')` blocks to `critical-journeys.spec.ts`. Don't try to make these table-driven — the value is in the explicit interaction sequence.

## Known noise filter

`route-smoke.spec.ts` ignores HMR/DevTools/SourceMap/Fast-Refresh console messages. Add new noise patterns to `KNOWN_NOISE` if a real noise source appears — never broaden to ignore actual errors.

## RBAC scope assumptions

`rbac-redirect.spec.ts` only fails on **admin-scoped routes** for **low-priv roles** (a small subset of the 1998-cell matrix). The full matrix is owned by `nu-rbac-autonomous` (curl-based, fast). This file catches the high-value subset that needs a real browser to verify (middleware redirects, client-side guards).
