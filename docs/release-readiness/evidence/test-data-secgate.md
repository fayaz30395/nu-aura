# Test data created by secgate (NU-SEC-GATE)

| Record | Where | Purpose | Cleanup |
|---|---|---|---|
| users row `nuaura_test_secgate@nulogic.io` (first_name `NUAURA_TEST_secgate`), tenant NuLogic demo, no roles, random password (stored only in the session scratchpad, 0600) | local hrms_dev `users` | Only account used for login brute-force / lockout / rate-limit / user-enumeration probes | `delete from users where email='nuaura_test_secgate@nulogic.io'` (superuser) |
| users row `nuaura_test_secgate2@nulogic.io` (same random password, no roles) | local hrms_dev `users` | session lifecycle probes (login/refresh/logout) after the first test user was locked by the lockout test | `delete from users where email='nuaura_test_secgate2@nulogic.io'` |
