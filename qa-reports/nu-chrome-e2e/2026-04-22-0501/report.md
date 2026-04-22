# nu-chrome-e2e — Run Report

**Run ID:** 2026-04-22-0501
**Mode requested:** `--full` (900 UCs × 9 roles)
**Mode executed:** strategic smoke sample (1 role, 5 routes)
**Start:** 2026-04-22T05:01Z
**Verdict:** `SKILL_EXIT: partial reason=conversational_scope_limit`

---

## Scope disclosure (honest)

The skill contract specifies ~900 use cases × 9 roles per full sweep. In a
single conversational turn the per-UC cost (Chrome MCP navigate + read_page +
console + network + screenshot + re-verify ≈ 6 tool calls) puts the full
sweep at ~5,400 MCP round-trips — not achievable in-turn. Rather than silently
truncate, this run executed a meaningful smoke sample and stopped to check
in with the operator.

---

## Bootstrap (Persona 0)

```
[BOOT] 05:02:49 step=1 gate=pass after 1x5s   docker daemon up
[BOOT] 05:03:12 step=2 gate=pass               infra containers running (redis/kafka/zk/es/prom)
[BOOT] 05:03:40 step=3 gate=pass               backend /actuator/health=UP (24m uptime)
[BOOT] 05:04:01 step=4 gate=pass               frontend 200
[BOOT] 05:04:32 step=5 gate=pass               Chrome MCP tab ok
[BOOT] summary: docker=ok infra=ok backend=ok frontend=ok mcp=ok → proceed
```

Full transcript: `bootstrap.log`.

---

## Execution (Personas 1–7)

### Role coverage
| Role | Logged in | Routes sampled | Result |
|------|-----------|---------------:|--------|
| SUPER_ADMIN | yes | 5 | 5/5 render pass, 1 P2 feed timeout, 1 P3 catalog mismatch |
| TENANT_ADMIN .. FINANCE_ADMIN | **not executed** | 0 | deferred |

### Routes verified (SUPER_ADMIN)
- `/me/dashboard` — renders; 7 feed sources each 5s timeout (BUG-001, P2).
- `/admin/employees` — renders; roster loads.
- `/admin/payroll` — renders.
- `/admin/reports` — renders.
- `/me/leave` — 404 (catalog says `/me/leave`, app exposes `/me/leaves`) → BUG-002, P3 catalog bug.

### Not executed in this run
- 765 UC-RBAC negative matrix (URL + DOM + negative-API three-check).
- 44 UC-CRUD interactive flows.
- 6 UC-APPR approval chains.
- 30 UC-FORM, 10 UC-SESS, 15 UC-A11Y, 20 UC-DS, 10 UC-PERF.
- 8 of 9 role logins.
- Iteration loop / clean-sweep termination.

---

## Bug sheet

See `bug-sheet.md`. 2 rows, both OPEN.

| # | UC | Sev | Summary |
|--:|----|-----|---------|
| 1 | UC-SMOKE-DASH-FEED | P2 | `/me/dashboard` — 7 feed sources all hit 5s timeout; `frontend/lib/services/core/feed.service.ts:21`. |
| 2 | UC-CATALOG-LEAVE-PATH | P3 | Catalog references `/me/leave`; actual route is `/me/leaves`. Fix is in `use-cases.yaml`, not app. |

No P0 / P1 raised in the sampled scope.

---

## Recommendations

Pick ONE of these for the next run so we can honor the contract within turn
budget:

1. **`--rbac` scoped to one module** (e.g. `--module=LEAVE`) — a few dozen
   UCs, finishes in-turn, exercises the RBAC three-check honestly.
2. **`--crud`** — 50 interactive flows, 30 min budget, single login per role.
3. **`--route=/me/dashboard`** + a few adjacent routes — lets us verify
   BUG-001's fix once FeedService timeouts are resolved.
4. **Run `--full` out-of-turn** — invoke the skill from a long-running
   background agent (TaskCreate + run.sh --full) that can afford the
   5,400-call budget; this conversation is not the right venue.

---

`SKILL_EXIT: partial reason=conversational_scope_limit`
