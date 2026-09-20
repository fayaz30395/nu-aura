# US-2FZ0BC70DYQ9: Ponytail backlog batch: delete/shrink 15 confirmed-dead frontend+backend items

> **Epic:** EP-2FWVEHJV5G29
> **Tier:** autonomous
> **Status:** Done
> **Created:** 2026-09-20
> **Created-by:** faylo new

## User Story

**As a** ...
**I want** ...
**So that** ...

## Acceptance Criteria

- **AC1:** Delete lib/generated/api/ unused dirs, app/admin/mobile-api page+hooks+service, dead useDebounce exports, useNotificationStore.ts, lib/utils/index.ts isAdmin/hasPermission, useFeatureFlag.ts shim, lib/utils/date.ts toLocalDateString (rename 26 callers), dead next.config.js optimizePackageImports entries, .claude-flow/data inside lib/generated/api, CacheMetricsConfig.java, MetricsConfig.java unused beans, EmailConfig.java, JpaQueryConfig RepositoryQueryAspect, AIConfig objectMapper bean, duplicate ObjectMapper fields -> autowire shared bean. Skip the HIGH RISK ApprovalEscalationJob/WorkflowEscalationScheduler item and the SmsService/PaymentGatewayService yagni items (those need a regression test / bigger decision first per pendings.md).
  - **Verify:** shell bash -c "cd backend && mvn -q -DskipTests compile && cd ../frontend && npx tsc --noEmit"
  - **Verified:** yes (2026-09-20)
