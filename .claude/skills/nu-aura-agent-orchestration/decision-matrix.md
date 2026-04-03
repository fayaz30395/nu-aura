# NU-AURA Agent Orchestration — Decision Matrix

## Scenario → Approach Quick Reference

| Scenario | Layer | Config | Est. Time | Token Cost |
|----------|-------|--------|-----------|------------|
| Fix a bug in one service | L1 `@dev` | Single session | 5–15 min | 1× |
| Add a single API endpoint | L1 `@dev` | Single session | 10–20 min | 1× |
| Review a PR or code block | L1 `@reviewer` | Single session | 5–10 min | 1× |
| Write test cases for a module | L1 `@qa` | Single session | 10–20 min | 1× |
| Design a schema or API contract | L1 `@architect` | Single session | 10–20 min | 1× |
| Update K8s manifest or CI pipeline | L1 `@devops` | Single session | 10–20 min | 1× |
| Write Swagger/ADR/module README | L1 `@docs` | Single session | 10–20 min | 1× |
| Design + implement + test a feature | L2 Subagents | Sequential chain | 30–60 min | 3× |
| Research 3 approaches before deciding | L2 Subagents | Parallel research | 20–30 min | 3× |
| Investigate a complex bug (unknown cause) | L2 or L3 | Competing hypotheses | 30–45 min | 5–8× |
| Build a complete new module | L3 Teams | Full Feature Build (6) | 1–2 hrs | 10–15× |
| RBAC or auth refactor across sub-apps | L3 Teams | Cross-Module Refactor (4) | 1–2 hrs | 6–10× |
| Execute 3–5 sprint tickets in parallel | L3 Teams | Sprint Execution (5) | 1–2 hrs | 8–12× |

---

## Layer 1 Role Selection

```
What kind of task is it?
├─ Design / architecture / schema / API → @architect
├─ Implementation (backend/frontend/fullstack) → @dev
├─ Testing / bug reports / RBAC checks → @qa
├─ Code review / security audit → @reviewer
├─ Docker / CI/CD / K8s / infra → @devops
└─ API docs / ADRs / READMEs / runbooks → @docs
```

---

## "Should I Spawn a Subagent?" Test

Ask yourself: "Could I do this in one focused conversation, or does it decompose into distinct phases with different outputs?"

| Situation | Decision |
|-----------|----------|
| Single focused task (one file, one concern) | Single session |
| Two sequential phases (design then implement) | 2 subagents |
| Three sequential phases (design → implement → test) | 3 subagents |
| N research questions that don't depend on each other | N parallel subagents |
| Debug: unknown root cause with multiple possible layers | 3 parallel investigators |

---

## "Should I Use Agent Teams?" Test

Agent Teams burn 10–15× tokens. Only use when:
- The work spans 2+ weeks of single-session work
- Multiple people (backend + frontend + QA) would work in parallel if this were a real team
- The output is a complete, shippable feature or sprint

If you're unsure, **use subagents instead** — they're cheaper and more controllable.

---

## New Module Checklist (before spawning any agents)

Before launching a full team for a new module, verify you have:

- [ ] Module name confirmed (e.g., "Expense Management")
- [ ] Sub-app assigned (NU-HRMS / NU-Hire / NU-Grow / NU-Fluence)
- [ ] Key requirements listed (what must the module do?)
- [ ] Approval workflow defined if needed (who approves what?)
- [ ] RBAC requirements sketched (which roles can CRUD?)
- [ ] Integration points identified (does it fire Kafka events? emit audit logs? read payroll data?)
- [ ] Next Flyway migration number confirmed (currently V94)
- [ ] File ownership assigned per agent (no two agents in same directory)

---

## Common Mistakes to Avoid

| Mistake | Consequence | Prevention |
|---------|-------------|------------|
| Vague task description | Agent returns generic output | Include exact file paths and constraints |
| Forgetting tenant_id requirement | Data isolation breach | Always state "filter by tenant_id in all queries" |
| Wrong permission format in spawn prompt | Agent uses wrong format in code | State explicitly: DB = "module.action", code = "MODULE:ACTION" |
| Two agents touching SecurityConfig.java | Merge conflicts, broken auth | Shared file protocol: post → wait → edit |
| Skipping architect for large features | Inconsistent design, rework | Always architect first on anything >2 files |
| Using Layer 3 for a 2-file change | 15× token waste | Check the decision matrix — escalate only when needed |
| Not including Flyway migration number | Agent creates wrong version number | Always state "NEXT MIGRATION = V94" |
| Forgetting SuperAdmin bypass | Broken admin access | Always state "SuperAdmin bypasses ALL checks" in spawn prompts |
| Missing pagination on list endpoints | Unbounded queries, OOM on large tenants | State "ALL list endpoints must be paginated" |
| Spawning QA before backend is done | QA can't write integration tests | Enforce dependency order: backend → qa |

---

## NU-AURA Module → File Path Reference

| Module | Backend Package | Frontend Directory |
|--------|----------------|-------------------|
| Employees | com.hrms.api.employees / application.employees | frontend/app/employees/ |
| Leave | com.hrms.api.leave / application.leave | frontend/app/leave/ |
| Payroll | com.hrms.api.payroll / application.payroll | frontend/app/payroll/ |
| Attendance | com.hrms.api.attendance / application.attendance | frontend/app/attendance/ |
| Benefits | com.hrms.api.benefits / application.benefits | frontend/app/benefits/ |
| Assets | com.hrms.api.assets / application.assets | frontend/app/assets/ |
| Expenses | com.hrms.api.expenses / application.expenses | frontend/app/expenses/ |
| Overtime | com.hrms.api.overtime / application.overtime | frontend/app/overtime/ |
| Probation | com.hrms.api.probation / application.probation | frontend/app/probation/ |
| Referrals | com.hrms.api.referrals / application.referrals | frontend/app/referrals/ |
| Timesheets | com.hrms.api.timesheets / application.timesheets | frontend/app/timesheets/ |
| Recruitment | com.hrms.api.recruitment / application.recruitment | frontend/app/recruitment/ |
| Onboarding | com.hrms.api.onboarding / application.onboarding | frontend/app/onboarding/ |
| Offboarding | com.hrms.api.offboarding / application.offboarding | frontend/app/offboarding/ |
| Performance | com.hrms.api.performance / application.performance | frontend/app/performance/ |
| OKR / Goals | com.hrms.api.okr / application.okr | frontend/app/okr/ |
| Training/LMS | com.hrms.api.training / application.training | frontend/app/training/ |
| Recognition | com.hrms.api.recognition / application.recognition | frontend/app/recognition/ |
| Surveys | com.hrms.api.surveys / application.surveys | frontend/app/surveys/ |
| Wellness | com.hrms.api.wellness / application.wellness | frontend/app/wellness/ |
| NU-Fluence | com.hrms.api.fluence / application.fluence | frontend/app/fluence/ |
| Platform/Auth | com.hrms.common.config / common.security | frontend/lib/stores/, frontend/middleware.ts |
| Admin | com.hrms.api.admin / application.admin | frontend/app/admin/ |

---

## Permission String Reference (key examples)

| Module | Read | Write | Delete | Approve |
|--------|------|-------|--------|---------|
| Employee | employee.read | employee.write | employee.delete | — |
| Leave | leave.read | leave.write | leave.delete | leave.approve |
| Payroll | payroll.read | payroll.write | payroll.delete | payroll.approve |
| Attendance | attendance.read | attendance.write | attendance.delete | — |
| Recruitment | recruitment.read | recruitment.write | recruitment.delete | recruitment.approve |
| Performance | performance.read | performance.write | performance.delete | performance.approve |
| Assets | asset.read | asset.write | asset.delete | asset.approve |
| Benefits | benefit.read | benefit.write | benefit.delete | — |
| Expenses | expense.read | expense.write | expense.delete | expense.approve |
| Training | training.read | training.write | training.delete | — |
| Surveys | survey.read | survey.write | survey.delete | — |
| Admin (RBAC) | role.read | role.write | role.delete | — |
| Audit Logs | audit.read | — | — | — |
| Reports | report.read | report.generate | — | — |

**DB format:** `module.action` (e.g., `employee.read`)
**Code format:** `MODULE:ACTION` (e.g., `EMPLOYEE:READ`)
**@RequiresPermission always uses DB format:** `@RequiresPermission("employee.read")`
