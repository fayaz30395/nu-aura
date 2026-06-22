# CODEX-REVIEW — Live demo-login 403 CSRF fix (authorized auth-scope task)

**Out-of-band from the presentation program** — an explicitly user-authorized auth fix to unblock the
demo EMPLOYEE session (and runtime verification). Diagnosed live via browser MCP, root-caused in code.

## Symptom
Demo quick-login (`Arun K · EMPLOYEE`) → UI "Authentication Failed — CSRF token validation failed".
Network: `POST https://nu-aura-backend-production.up.railway.app/auth/login` → **403**, no preceding
CSRF-token GET. Console `[ApiClient] Error: POST /auth/login 403`. Reproduced on fresh reload + retries.

## Root cause (evidence-chained)
1. Backend `AuthController` is `@RequestMapping("/api/v1/auth")` + `@PostMapping("/login")` → the real
   endpoint is **`/api/v1/auth/login`**. `CsrfDoubleSubmitFilter.isValidationExcluded()` exempts
   **`/api/v1/auth/login`** (and `/google`, `/refresh`, …) from CSRF.
2. The frontend hand-written auth calls use bare `/auth/...` paths (`lib/api/auth.ts`,
   `lib/api/client.ts` refresh) and rely on the axios `baseURL` to supply the `/api/v1` prefix.
3. The whole codebase assumes `apiConfig.baseUrl` **ends with `/api/v1`**: generated orval clients send
   `/api/v1/...` (de-duped by `ApiClient#normalizeUrl`), and WS/SAML consumers do
   `apiConfig.baseUrl.replace('/api/v1', '')` to recover the bare origin
   (`WebSocketContext.tsx:86`, `websocket.ts:86`, `saml.service.ts:94`, `env.ts:249`).
4. **The live `NEXT_PUBLIC_API_URL` is set to the bare Railway origin (no `/api/v1`).** So
   `/auth/login` resolves to `<origin>/auth/login` — NOT the CSRF-exempt `/api/v1/auth/login` — and the
   `CsrfDoubleSubmitFilter` rejects it 403 (this also explains 403-not-404: the CSRF filter runs before
   the dispatcher). Generated clients still work because they carry the `/api/v1` prefix explicitly.

## Fix (single, surgical, config-layer)
`lib/config/env.ts` — normalize `apiConfig.baseUrl` to always end with `/api/v1` (idempotent), making
the runtime value match the codebase's universal assumption regardless of how the deploy env is set:

```ts
export function withApiV1Prefix(url: string): string {
  const trimmed = url.replace(/\/+$/, '');
  return trimmed.endsWith('/api/v1') ? trimmed : `${trimmed}/api/v1`;
}
const apiBaseUrl = withApiV1Prefix(env.NEXT_PUBLIC_API_URL);
export const apiConfig = { baseUrl: apiBaseUrl, wsUrl: apiBaseUrl.replace('/api/v1', '').replace('http', 'ws') } as const;
```

### Why this location (vs. the 15 call sites or the env var)
- **vs. editing ~15 hand-written `/auth/*` call sites:** one change, no risk of missing a site.
- **vs. just setting the Vercel env to `…/api/v1`:** that's the equivalent runtime effect, but the env is
  owner-controlled and not in-repo; this makes the code resilient so a bare-origin env can't silently
  break auth again.
- **WS safety:** consumers `.replace('/api/v1','')` → still get the bare origin (idempotent both ways).
- **Generated clients:** `/api/v1/...` + `normalizeUrl` de-dup → unchanged.

## Regression-safety matrix (proven, not tested live)
| `NEXT_PUBLIC_API_URL` | `apiConfig.baseUrl` after fix | `/auth/login` resolves to | verdict |
|---|---|---|---|
| `…railway.app` (bare, current live) | `…railway.app/api/v1` | `…/api/v1/auth/login` (exempt) | **FIXED** |
| `…/api/v1` (intended) | `…/api/v1` (idempotent) | `…/api/v1/auth/login` | unchanged ✓ |
| `http://localhost:8080` (dev) | `…:8080/api/v1` | `…/api/v1/auth/login` | works ✓ |

## Validation
`tsc --noEmit` 0 · `eslint env.ts` 0 · `env.test.ts` **9/9** (5 new `withApiV1Prefix` cases) · RBAC
70/70 · `next build` exit 0. **Runtime re-verification (browser login as Arun K) is PENDING a Vercel
deploy of this branch** — the live FE is CLI-deploy-only and currently stale. After deploy I will
re-run the demo-login + capture the now-unblocked baselines.

## Risk & rollback
**Risk: LOW–MED** (auth-routing, but a single idempotent normalization matching the codebase's existing
assumption; WS/generated paths provably unaffected). Cannot be runtime-confirmed until deployed.
**Rollback:** revert the `env.ts` change.
