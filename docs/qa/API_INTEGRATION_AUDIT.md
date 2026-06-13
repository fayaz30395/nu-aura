# API Integration Audit

Date: 2026-06-13

## Findings

- Frontend uses the shared Axios client in `frontend/lib/api/client.ts` with credentials and CSRF header handling.
- Auth API uses the shared client for login/logout/refresh/me/change-password/Google login.
- Release env validation correctly blocks production builds when `NEXT_PUBLIC_API_URL` is missing or unsafe.
- Next.js rewrites can proxy `/api/v1/*` only when `BACKEND_ORIGIN` is set.
- Deployed smoke evidence from the repo (`frontend/e2e/remote-deployed-route-smoke.json`) shows prior API 404/error symptoms for deployed environment and should be re-run after this change.

## Required live checks

- `/api/v1/auth/login`, `/auth/me`, `/auth/refresh`, `/auth/logout`.
- Dashboard summary APIs.
- Employee, recruitment, performance, fluence, reports, notifications, settings APIs.
- API failure handling with 401/403/404/500 and slow network.
- CORS/cookie behavior between Vercel frontend and Railway backend.
- RBAC denial at API layer, not only UI.

## Status

Static inspection complete. Live API integration validation is BLOCKED by network and deployment credential limitations.
