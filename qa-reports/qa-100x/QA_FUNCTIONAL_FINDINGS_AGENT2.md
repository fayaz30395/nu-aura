# QA Functional Findings — NU-AURA

**Agent:** Agent 2 — Functional QA
**Date:** 2026-06-18
**Scope:** Backend unit tests, core fix verification, frontend unit tests

---

## Test Results Summary

| Suite | Tests Run | Passed | Failed | Status |
|-------|-----------|--------|--------|--------|
| ContractServiceTest | 17 | 17 | 0 | PASS |
| AttendanceRecordServiceTest | 17 | 17 | 0 | PASS |
| GoalServiceTest | 19 | 19 | 0 | PASS |
| PerformanceReviewServiceTest | 14 | 14 | 0 | PASS |
| WebhookSignatureVerifierTest | 9 | 9 | 0 | PASS |
| **Backend Total** | **76** | **76** | **0** | **BUILD SUCCESS** |
| Frontend Vitest (90 files) | 2419 | 2419 | 0 | PASS |

---

## Backend Unit Tests (pass/fail counts per suite)

### ContractServiceTest — 17/17 PASS
- createContract (3 tests): creation, validation, tenant isolation all pass
- updateContract (4 tests): field updates with tenant check pass
- getVersionHistory: both paginated and non-paginated paths covered
- softDelete, renew, terminate: all pass with tenant-ownership guard confirmed via logs

### AttendanceRecordServiceTest — 17/17 PASS
- Check-in / check-out lifecycle tests pass including bulk operations (2 success / 0 failed, 3 success / 0 failed confirmed in logs)
- Regularization rejection path confirmed working
- Unusually long shift (20h) warning path exercised
- Biometric + Web + Mobile source types all tested

### GoalServiceTest — 19/19 PASS
- Goal creation (2), update (3), enriched response (2), analytics (1), progress updates (4)
- Goal approval workflow (2 scenarios)
- Get goal (5 scenarios: by ID, by employee, paginated)

### PerformanceReviewServiceTest — 14/14 PASS
- Create (2), update (2), submit (2), complete (2) flows
- Competency tests (3 scenarios)
- Get review (5 scenarios)
- Review completion log confirms rating 4.5 recorded correctly

### WebhookSignatureVerifierTest — 9/9 PASS
- 4 Razorpay HMAC-SHA256 hex tests (valid sig, invalid sig, null inputs, blank secret)
- 5 Stripe t=...,v1=... with replay tolerance tests (valid, expired replay, missing t, missing v1, tampered)

---

## Core Fix Verification

### BE-01 — ContractService IDOR Fix
**Status: FIXED / PASS**

ContractService.java uses findByIdAndTenantId at 4 call sites (lines 104, 159, 244, 464).
getVersionHistory (lines 410, 429) calls getContractEntity(contractId) first which resolves via findByIdAndTenantId.
Comment at line 411: "// SEC (BE-01): tenant-ownership guard before exposing version content (cross-tenant IDOR)".
All 17 ContractServiceTest tests pass including IDOR-guarded paths.

### BE-02 — Mass-Assignment Protection on BaseEntity
**Status: FIXED / PASS**

BaseEntity.java applies @JsonProperty(access = JsonProperty.Access.READ_ONLY) to all 8 server-managed fields (lines 38, 43, 48, 53, 58, 62, 67, 71): id, tenantId, createdAt, updatedAt, createdBy, updatedBy, version, deletedAt.
CreateOrganizationUnitRequest.java is a record DTO exposing only 9 client-settable fields — server-managed identity/audit fields are structurally excluded.

### RBAC-01 — HMAC Webhook Signature Verification
**Status: FIXED / PASS**

WebhookSignatureVerifier.java implements:
- verifyHmacSha256Hex(): Razorpay, constant-time MessageDigest.isEqual comparison, rejects null/blank secret
- verifyStripe(): t=...,v1=... header parsing, signed payload timestamp.payload, replay tolerance window, constant-time comparison
PaymentWebhookController.java line 25-26 confirms DONE for both Stripe and Razorpay adapters.
9/9 WebhookSignatureVerifierTest tests pass.

### SEC-001 — V295 Demo Credential Neutralization
**Status: FIXED / PASS (operational env var flip pending on Railway)**

V295__neutralize_demo_admin_after_reseed.sql targets 3 known Welcome@123 bcrypt hashes, sets sentinel LOCKED_DEMO_CREDENTIAL_<uuid> + SUSPENDED status.
Gated by ${demoCredentialsEnabled} placeholder; application.yml defaults to false (safe).
V299 additionally handles Railway render profile where flyway.enabled=false caused V295 to never run.
Remaining risk: DEMO_CREDENTIALS_ENABLED=true still set on live Railway instance; requires manual env flip + one deploy with SPRING_FLYWAY_ENABLED=true.

### SEC-002 — V298 PII Backfill Encryption
**Status: FIXED / PASS (application-layer re-encryption step pending)**

V298__backfill_encrypt_statutory_pii.sql marks pre-existing plaintext PII rows with PLAINTEXT_PENDING_ENCRYPTION: sentinel in: employee_pf_records.uan_number, employee_pf_records.pf_number, employee_esi_records.esi_number, employee_esi_records.ip_number.
Application re-encryption endpoint: POST /api/v1/admin/maintenance/reencrypt-statutory-pii.
New writes protected by EncryptedStringConverter; migration handles legacy rows safely.

### RBAC-02 — Feature Flag RBAC Protection
**Status: FIXED / PASS**

FeatureFlagController.java applies @RequiresPermission(SYSTEM_ADMIN) to all 6 endpoints (lines 34, 42, 50, 73, 81, 95).

### RBAC-03 — Rate Limiting Filter
**Status: IMPLEMENTED / PASS**

RateLimitingFilter.java: Redis primary via DistributedRateLimiter, in-memory Bucket4j fallback.
MAX_BUCKETS=50,000 hard cap; TTL eviction 2 min after last access; cleanup sweep every 5 min.
Redis retry interval: 30 seconds. ConcurrentHashMap + AtomicBoolean/AtomicLong guards.

---

## Functional Issues Found

## FUNC-001
**Severity:** LOW  **Module:** Payment / Webhook  **Status:** OPEN
**Evidence:** PaymentWebhookController.java — NUAURA-PAYMENT-003 (idempotency check) and NUAURA-PAYMENT-004 (rate limiting on webhook flood) explicitly marked FUTURE. A webhook flood pre-signature-check could exhaust request-handling threads. Low severity since signature rejection is the first guard.

## FUNC-002
**Severity:** LOW  **Module:** Attendance  **Status:** OPEN (pre-existing)
**Evidence:** AttendanceRecordService log during test: "Unusually long shift detected for record d979ccc0: 20 hours". Warning logged but record is saved. No hard rejection for >N hour shifts; erroneous biometric data could be silently persisted as valid attendance.

## FUNC-003
**Severity:** INFO  **Module:** SEC-001 / Railway Deployment  **Status:** OPEN (operational, not code)
**Evidence:** DEMO_CREDENTIALS_ENABLED=true on live Railway per MEMORY.md. V299 requires manual SPRING_FLYWAY_ENABLED=true env override for one deploy cycle. Not a code defect; unexecuted deployment step.

---

## Frontend Tests

**90 test files, 2419 tests — all PASS (0 failures)**

Coverage: analytics service, status vocabulary, environment validation (loopback + placeholder URL rejection), categorical palette utilities.
One expected stderr in env tests: "[env] Error: NEXT_PUBLIC_API_URL: Required" — correct, this is a rejection assertion test.

---

## Summary

- **Backend:** 76 tests run, 76 passed, 0 failed — BUILD SUCCESS
- **Frontend:** 2419 tests run, 2419 passed, 0 failed
- **Core fixes verified:** BE-01 PASS, BE-02 PASS, RBAC-01 PASS, SEC-001 PASS (code), SEC-002 PASS (code), RBAC-02 PASS, RBAC-03 PASS
- **Open items:** 2 LOW functional gaps + 1 INFO operational step (no code changes required)
