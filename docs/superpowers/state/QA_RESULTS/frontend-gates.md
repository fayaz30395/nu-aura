# Frontend Gates - 2026-05-24

Status: partially green

## Passed

- `npx tsc --noEmit` - passed.
- `npm run lint` - passed.
- `npm run test:run` - passed with `89` test files and `2429` tests.
- `npm run lint:design-system` - exited 0.
- `npm run build` - passed and generated `227` app routes.

## Warnings / Remaining Release Work

- `npm run lint:design-system` reported `252` styling drift findings even though it exits 0:
  - inline-style: 175
  - raw-input: 54
  - raw-select: 17
  - raw-textarea: 6
- `npm run build` emitted repeated warnings: `NEXT_PUBLIC_API_URL contains localhost in production environment`.
- `npm run test:run` still emits existing React `act(...)` warnings and an env warning from `lib/services/__tests__/websocket.test.ts`.

## Release Decision

Frontend mechanical gates are green, but T-030 stays open until the production build is rerun with production-safe env and the design-system drift has either a zero-finding result or a signed exception list.
