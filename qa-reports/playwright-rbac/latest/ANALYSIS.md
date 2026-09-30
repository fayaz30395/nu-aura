# Playwright RBAC suite — failure analysis

**Date of analysis:** 2026-09-24
**Input:** `results.jsonl` (run dated 2026-09-22) — 9/9 roles `AUTH_FAILED`, severity P0
**Verdict: ENVIRONMENTAL (expired demo credentials). Not an RBAC regression. Not a code defect.**

## Summary

All nine role cases failed at `/auth/login` before any RBAC assertion executed. The uniformity
was the clue: nine independent role journeys failing identically points to a shared pre-auth
step, not nine separate authorization bugs.

Root cause: **the demo accounts' passwords have expired** under the 90-day max-age password
policy. The login endpoint rejects them with a business-rule violation, so no session is ever
established and every downstream RBAC assertion is unreachable.

## Evidence

Target reachability — both healthy, so "app is down" is excluded:

```
GET https://hrms-frontend-vert.vercel.app/auth/login          -> http=200
GET https://nu-aura-backend-production.up.railway.app/actuator/health
                                                              -> http=200 {"status":"UP"}
```

Correct endpoint is `/api/v1/auth/login` (`AuthController.java:28` `@RequestMapping("/api/v1/auth")`,
`:105` `@PostMapping("/login")`). CSRF is enforced via double-submit cookie, so a bare POST is
rejected before authentication is even attempted:

```
POST /api/v1/auth/login  (no CSRF token)
  -> 403 {"error":"Forbidden","message":"CSRF token validation failed"}
```

With the CSRF handshake performed correctly (fetch cookie, echo as `X-XSRF-TOKEN`):

```
# control: wrong password -> auth stack is alive and discriminating
POST /api/v1/auth/login  {"email":"arun@nulogic.io","password":"WRONGPASS999"}
  -> 401 {"error":"Authentication Failed","message":"Bad credentials"}

# valid demo password -> credentials are RECOGNISED but EXPIRED
POST /api/v1/auth/login  {"email":"arun@nulogic.io","password":"Welcome@123"}
  -> 400 {"error":"Business Rule Violation",
          "message":"Your password has expired. Please reset your password.",
          "errorCode":"BUSINESS_RULE_VIOLATION"}
```

The wrong-password control is what makes this conclusive: the backend distinguishes "bad
credentials" from "expired password", and the demo account returns the latter. The password is
correct; the account is simply past its rotation deadline.

## Classification of the 9 findings

| Finding | Original severity | Actual classification |
|---|---|---|
| `AUTH-*` x9 (all roles) | P0 | **Environment / test-data expiry.** Not a regression. Downgrade from P0. |

No RBAC assertion in the suite actually executed, so the run provides **no evidence either way**
about RBAC correctness. The suite result should be read as `BLOCKED`, not `FAIL`.

## Contributing weaknesses in the harness

1. The harness reports `AUTH_FAILED` without capturing the HTTP status or response body. The
   distinction between 403-CSRF, 401-bad-credentials and 400-expired-password is the entire
   diagnosis, and it was discarded. Log status + body on auth failure.
2. An expired-password state is indistinguishable from a real outage in the current output.
   The harness should fail loudly and separately on a non-401 login rejection.

## Required human action

1. **Reset / rotate the demo account passwords** (all demo accounts share one password), or
   exempt the QA test tenant from the 90-day max-age policy. Until then the RBAC suite cannot run.
2. Re-run the suite once credentials are valid. Only then do its RBAC results carry meaning.
3. Optional: add status/body capture to the harness so the next occurrence self-diagnoses.

## Independent confirmation (second method)

The above was derived by probing the API directly. A separate investigation reproduced the
same root cause by running the real harness, which is stronger evidence than either alone.

```
cd frontend
PLAYWRIGHT_BASE_URL=https://hrms-frontend-vert.vercel.app \
NU_RBAC_ROLE=EMPLOYEE NU_RBAC_MAX_PER_ROLE=1 NU_RBAC_WORKERS=1 \
NU_RBAC_OUT_DIR=/tmp/nu-rbac-diag \
npx playwright test --config=nu-rbac.config.ts
```

Reproduced the identical row (`"status":"AUTH_FAILED","severity":"P0"`), failing as
`"beforeAll" hook timeout of 45000ms exceeded`. The captured DOM at
`frontend/test-results/nu-rbac-RBAC-EMPLOYEE-1-cases-UC-EMP-001-chromium/error-context.md`
shows the rendered page after the attempt for `saran@nulogic.io`:

```
Authentication Failed
Your password has expired. Please reset your password.
```

The login page itself rendered correctly (SSO buttons, demo account list, email/password form),
confirming this is a backend policy rejection and not a network or render failure.

### Additional harness detail

`frontend/nu-rbac.config.ts` defaults `baseURL` to `localhost:3000`, and **nothing was
listening on :3000** during this investigation (confirmed via `lsof`). This matters for
interpreting the original 2026-09-22 run:

- Which target that run used could not be determined — no logs or run history survive.
- A fully dead `:3000` would throw inside `beforeAll` rather than append the tidy `AUTH_FAILED`
  rows actually present, which suggests that run did reach a live login page.
- This ambiguity does **not** weaken the verdict: the password-expiry cause is directly
  reproduced against a live target and fully explains the uniform 9/9 failure on its own.

To run locally instead of against prod, start frontend (:3000) and backend (:8080) first.

## What this does NOT indicate

- Not a build problem: frontend `npx tsc --noEmit` exits 0 with 0 errors; backend
  `mvn -DskipTests compile` exits 0, both verified on `main` 2026-09-24.
- Not a CSRF defect: CSRF enforcement behaves correctly; it rejected an unauthenticated
  double-submit and accepted a valid one.
- Not the `DEMO_CREDENTIALS_ENABLED=false` prod gate: that would not produce an
  expired-password business-rule violation.
