# NU-Hire test data (all NUAURA_TEST_*; local hrms_dev, tenant 660e8400-e29b-41d4-a716-446655440001)
Created across 5 journey runs (each run uses a new 6-digit suffix; earlier runs' rows remain):
- job_openings NUAURA_TEST_Engineer_<suffix>: 6 (1 DRAFT, rest OPEN)
- candidates NUAURA_TEST_Alpha/Bravo/Charlie <suffix> (code NUAURA_TEST_<name>_<suffix>): 15 with matching applicants and 7+ interviews (interviewer Sumit)
- scorecard_templates NUAURA_TEST_Tpl_*: 6; interview_scorecards from sumit@ (1 per run)
- recruitment_agencies NUAURA_TEST_Agency_*: 6
- employees NUAURA_TEST_Hire (+ users) created by HR: one per run, each with an onboarding_process (6 tasks)
- signature_requests NUAURA_TEST_Offer_*: 1 (+ 1 NoEmail probe failed, none stored)
- A transient onboarding process for demo employee Arun (non-NUAURA row) was created in run 1 and deleted via API (204).
No workflow definition created (creation blocked by DEF-HIRE-01). Cleanup: soft-delete via UI/API as needed; no SQL deletes performed.
