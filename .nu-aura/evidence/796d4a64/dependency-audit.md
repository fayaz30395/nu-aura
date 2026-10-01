# Frontend dependency security remediation — post-`796d4a64`

Date: 2026-09-30 · dir `frontend/` · npm audit

## Before

`npm audit --production` → **62 vulnerabilities (1 low, 52 moderate, 7 high, 2 critical)**

Critical/high of note (production-runtime reachable):
- `next` **critical** — App Router middleware/proxy bypass (Turbopack, single locale) + Server-Action DoS
- `websocket-driver` **critical** — message-compression resource-limit bypass; length-header corruption
- `axios` **high** — prototype pollution in auth subfields / request construction
- `sharp` **high** — libvips/libheif CVEs
- `postcss` **high** — arbitrary file read via `sourceMappingURL` (build-time)
- `@tiptap/core` **high** — `__proto__` merge → DOM attribute injection; Markdown ReDoS
- also `browserslist`, `nanoid`, `brace-expansion` (high)

## Action

1. `npm audit fix` (non-breaking only; no `--force`) — resolved `next`, `axios`, `sharp`,
   `websocket-driver`, `browserslist`, `nanoid`, `brace-expansion` within declared semver ranges.
2. Bumped the deliberate `postcss` override `8.5.10 → 8.5.28` (`package.json` dependency + override),
   `npm install`.

## After

`npm audit --production` → **39 vulnerabilities (38 moderate, 1 high)** — **0 critical**.

| | before | after |
|---|---|---|
| critical | 2 | 0 |
| high | 7 | 1 |
| moderate | 52 | 38 |
| low | 1 | 0 |

Remaining high: `@tiptap/extension-highlight` (3.22.4–3.30.3). No non-breaking fix was applied —
resolving it requires bumping the `@tiptap/*` family (18 packages) beyond the current `^3.24.0` line.
Deferred to a supervised dependency PR rather than unverified overnight churn (tracked as a P2 finding).

## Verification (new lockfile)

- `npx tsc --noEmit` → PASS
- `npm run lint` (`--max-warnings=0`) → PASS
- `npm run test:run` → 91 files / 2425 tests PASS
- `NEXT_PUBLIC_API_URL=... npm run build` → PASS (`✓ Compiled successfully in 67s`, BUILD_ID 21:17:57)

## Files changed

- `frontend/package.json` (postcss dep + override → 8.5.28)
- `frontend/package-lock.json`

## Unchanged

- No `--force`, no major-version upgrades, no runtime code changes.
