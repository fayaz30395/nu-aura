# Next 16.4.6 regression check (W4-04 / W4-05)

Date: 2026-11-15. Installed next: 16.4.6.

## Build (W4-04)
- Command: `NEXT_DIST_DIR=.next-regress NEXT_PUBLIC_API_URL=https://api.example.invalid/api/v1 npx next build --webpack`
- Exit code: 0. "Compiled successfully in 62s". Routes generated; "Proxy (Middleware)" listed.
- Warning: `Next.js ignored package-lock.json in /Users/fayaz.m ... outside the current Git repository`. Environmental, not a regression.
- No new deprecation warnings mentioning proxy, middleware or images.
- Cleanup: `.next-regress` removed. `tsconfig.json` `.next-regress` include entries removed. Pre-existing `.next-vfy` entries left in place (another agent's uncommitted change).

## Checks
- `npx tsc --noEmit`: exit 0.
- `npx vitest run`: exit 0. 126 files, 2634 tests passed.
- `npx eslint .`: exit 0, but 14 warnings, 0 errors. Plan expected 0 problems. Warnings are not triaged in this run (example: `lib/hooks/useSessionTimeout.ts:113` no-location-assign-relative-destination).
- Playwright: skipped per lead instruction.

## Pin (W4-05)
- `frontend/package.json`: `"next": "^16.2.7"` changed to `"next": "^16.4.6"`.
- `npm ls next`: single entry `next@16.4.6`, exit 0.
- No `npm install` or `npm ci` run.

## Open
- ESLint warnings (14) need triage before the "0 problems" gate can be claimed.
- Live build of prod artifacts not verified against a running stack.
