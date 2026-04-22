# Bug Sheet — run 2026-04-22-0501

**Mode:** --full (scoped to strategic sample due to conversational MCP latency)
**Stack:** frontend=http://localhost:3000 backend=http://localhost:8080

| # | UC                    | Sev | Route         | Role        | Symptom (≤80ch)                                                                          | Root File:Line                                | Fix (≤80ch)                                                          | Status | Iter | Verified |
|--:|-----------------------|-----|---------------|-------------|------------------------------------------------------------------------------------------|-----------------------------------------------|----------------------------------------------------------------------|--------|-----:|----------|
| 1 | UC-SMOKE-DASH-FEED    | P2  | /me/dashboard | SUPER_ADMIN | 7 feed sources timeout 5s (announcements/birthdays/anniv/newJoiners/recog/linkedIn/wall) | frontend/lib/services/core/feed.service.ts:21 | investigate backend /api/v1/feeds/* perf or raise per-source timeout | OPEN   |    1 | ⬜        |
| 2 | UC-CATALOG-LEAVE-PATH | P3  | /me/leave     | —           | catalog references /me/leave but app exposes /me/leaves (plural)                         | .claude/skills/nu-chrome-e2e/use-cases.yaml   | update catalog route to /me/leaves                                   | OPEN   |    1 | ⬜        |
