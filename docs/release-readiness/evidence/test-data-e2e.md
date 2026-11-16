# Test data created by agent `e2e-load` (local hrms_dev, tenant NuLogic), 2026-11-15
All via the UI unless stated. Prefix NUAURA_TEST_E2E_. No deletions. Passwords: [REDACTED].
- Leave: request NUAURA_TEST_E2E_leave_576556 (arun, Casual Leave, 14-15 Dec 2026, 2 days), APPROVED by sumit. arun CL balance 7 -> 5 available, 2 used.
- Hire: jobs NUAURA_TEST_E2E_749588_Job, _885142_Job, _967818_Job (OPEN); candidates NUAURA_TEST_E2E_885142_C, NUAURA_TEST_E2E_967818_C (status SELECTED, then OFFER_EXTENDED, offered_ctc 750000). Earlier attempts hit form validation (department/experience required) and created nothing.
- Grow: objective NUAURA_TEST_E2E_OKR_058936 (arun, DRAFT) with key result NUAURA_TEST_E2E_OKR_058936_KR1 (target 100).
- Fluence: wall posts "NUAURA_TEST_E2E wall post <n>" by arun (2 runs). Wiki page create FAILED 400 (DEF-E2E-01), no wiki rows created.
- Account change: nuaura_test_vfy_j@nulogic.io had a forced password change on first login; changed through the UI to a new synthetic password kept only in the session scratchpad. Existing test user, EMPLOYEE role.
- Config change: FE dev server restarted (see logs/config-changes.md).
- Sessions: arun, sumit, admin (HR_ADMIN), tenant.admin, suresh logged in via UI once each (arun and admin re-logged after a logout/other-session effect). storageState kept in scratchpad only.
