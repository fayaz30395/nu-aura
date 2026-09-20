# RV-2FYCK0K1TG0T: Added PUT /documents/{documentId}/expiry, GET /documents/expiring, GET /documents/expired to DocumentController, gated DOCUMENT_ACCESS_MANAGE, wired to existing DocumentWorkflowService.setDocumentExpiry/getExpiringDocuments/getExpiredDocuments. New DocumentExpiryScheduler modeled directly on ContractLifecycleScheduler (daily cron, per-tenant loop via same JdbcTemplate active-tenants pattern, NotificationService.createNotification, marks isNotified after dispatch) — sweeps DocumentExpiryTracking using its existing shouldSendReminder()/isExpired() domain predicates, notifies DocumentAccess user-grants for the document (ponytail: no dedicated owner field exists; role/department grants not resolved to users). New DocumentExpiryDto/SetDocumentExpiryRequest. Added DocumentExpirySchedulerTest (2 cases: dispatch+mark-notified, skip when reminder window not reached) — verified passing in an isolated worktree (live tree's mvn test is currently blocked by an unrelated, already-committed, in-flight payroll test from another agent — backend/src/test/java/com/nulogic/application/payroll/service/GlobalPayrollServiceTest.java:543, not touched here). mvn -DskipTests compile clean on the live tree.

> **Story:** US-2FYBYK78PV8B
> **Author:** faylo-backend-engineer
> **Reviewer:** faylo-qa-reviewer
> **Verdict:** pass
> **Created:** 2026-09-20
> **Created-by:** faylo new

## Findings

...
