# Test data created by agent grow (local dev DB hrms_dev, tenant NuLogic)
- review_cycles (HR_MANAGER cannot delete; left in place): NUAURA_TEST_PerfCycle_637878, _700169, _781813, _009782 (PLANNING, unused, from aborted UI-selector iterations), NUAURA_TEST_PerfCycle_241136 (id 1101ca3f-eeb1-4f04-922c-41641c818b33, UI-created+activated, COMPLETED then reopened ACTIVE by DEF-GROW-06 repro), NUAURA_TEST_Cycle_B_* (26590152-ed6e-45c1-842d-28b60298dade, COMPLETED then reopened ACTIVE), NUAURA_TEST_Cycle_C_* (COMPLETED). Each activated cycle created SELF+MANAGER performance_reviews for Recruitment dept employees (arun, suresh, EMP-0011).
- objectives: NUAURA_TEST_OKR_* (several, owner sumit / jagadeesh), NUAURA_TEST_OKR_hr, _hr2. No key results (creation broken).
- feedback_360_cycles: NUAURA_TEST_360_* (closed).
- wellness_programs / wellness_challenges: NUAURA_TEST_Wellness_*, NUAURA_TEST_Steps.
- lms_course_enrollments: 1 row, arun on seeded course "Workplace Security Essentials" (not NUAURA-prefixed; seeded course reused), progress 30 / COMPLETED.
- pulse_surveys / lms_courses / training_programs: none created (blocked).
- API-logins performed once each: jagadeesh, arun, sumit, suresh, finance, anshuman, mani, admin (cookies cached outside repo, not committed).
