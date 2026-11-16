# NU-Hire defects (agent: hire, 2026-11-15)
Each reproduced in 3 consecutive journey runs (logs/hire/journey-run3..final) and tied to code/DB.

## DEF-HIRE-01 Critical - Offer creation always returns 500 (RECRUITMENT_OFFER workflow cannot exist)
- Root cause: `V95__add_performance_review_workflow.sql:11-14` re-created `workflow_definitions_entity_type_check` without `RECRUITMENT_OFFER` (V12 assumed no constraint). Live DB check lists 8 types, none recruitment. Creating the definition fails (400 DB_INTEGRITY_VIOLATION, test 019a). `RecruitmentManagementService.createOffer` (~L530-580) then calls `workflowService.startWorkflow` inside try/catch in the same transaction; the "No active workflow definition configured for RECRUITMENT_OFFER" exception marks the tx rollback-only, so the catch does not save it -> 500 "Transaction silently rolled back" (backend-session.log 16:33:50).
- Impact: no offer can be generated or approved; offer->accept->onboarding chain blocked.
- Repro: POST /api/v1/recruitment/candidates/{id}/offer as suresh@ (tests 019b/020). Fix: new forward-only migration adding RECRUITMENT_OFFER (and any other enum values) to the CHECK; run startWorkflow with REQUIRES_NEW or check for a definition first; add a test. Effort: S.
- Also: createOffer has no precondition on candidate status (rejected/new candidates would get offers) - High, same fix PR.

## DEF-HIRE-02 High - candidates.current_stage CHECK rejects 5 Java enum stages
- `V20__recruitment_stage_pipeline.sql:30` allows 13 legacy values; `Candidate.RecruitmentStage` also has APPLICATION_RECEIVED, SCREENING, INTERVIEW, OFFER, JOINED. PUT /candidates/{id}/stage with SCREENING -> 400 DB_INTEGRITY_VIOLATION (test 013a). Pipeline page does not show a candidate in TECHNICAL_INTERVIEW_SCHEDULED (UI-004, cause inferred). Fix: align CHECK and enum (forward migration), return 400 with a clear message. Effort: S.

## DEF-HIRE-03 High - E-signature unusable by HR/recruiters and by employee signers
- DB: only SUPER_ADMIN and TENANT_ADMIN hold any ESIGNATURE:* permission. HR_ADMIN, HR_MANAGER, RECRUITMENT_ADMIN get 403 on create (tests 024-*), and named signer Arun (EMPLOYEE) gets 403 on sign (028). Non-named signer checks themselves PASS (026, 027). Fix: seed ESIGNATURE:REQUEST/VIEW to HR roles, ESIGNATURE:SIGN to EMPLOYEE (identity check already enforced server-side). Effort: S.

## DEF-HIRE-04 Medium - PUT /recruitment/job-openings/{id} is full-replace
- Omitted optional fields (salary band, location, hiringManager, description, isActive) are nulled; omitting isActive -> 400 NOT NULL. Test 003b (DB shows NULLs). Fix: partial-update mapping (ignore nulls) or PATCH. Effort: S.

## DEF-HIRE-05 Medium - POST /recruitment/candidates without candidateCode -> 400 DB_INTEGRITY_VIOLATION
- DTO marks it optional; `candidates.candidate_code` NOT NULL; `RecruitmentManagementService.java:106-123` does not generate one. Test 011a. Fix: generate code. Effort: XS.

## DEF-HIRE-06 Medium - Public career page shows nothing for any tenant but the configured default
- `PublicCareerController` resolves tenant from X-Tenant-ID else `app.auth.default-tenant-id`; the /careers frontend sends no tenant header. Local default is 550e8400-...0000, demo data is 660e8400-...0001 -> /careers empty (UI-001/010, 004a). API with header works (004/005 PASS). Prod `render` profile sets the demo tenant default, so single-tenant prod works; multi-tenant does not. Fix: tenant slug/subdomain param. Effort: M.

## DEF-HIRE-07 Medium - E-sign signer needs both signerId and signerEmail
- signerId only -> `signature_approvals.signer_email` NOT NULL violation; email only -> "Signer ID is required". Test 024z. Fix: derive email from employee. Effort: XS. (External candidate signing via /esignature/external is therefore not reachable: 028x BLOCKED.)

## DEF-HIRE-08 Medium - DOCUMENT:UPLOAD only on SUPER_ADMIN
- `/api/v1/files/upload` (resume/attachments store) 403 for HR admin (test 010b). Resume attachment by recruiters therefore only possible via public apply. Fix: seed to HR/recruitment roles. Effort: XS.

## DEF-HIRE-09 Medium - POST /esignature/requests/{id}/send returns 500 (rollback-only)
- Test 025, root cause unconfirmed (suspect notification/mail failure inside same transaction; mail is DOWN locally). Fix: send notifications after commit / REQUIRES_NEW. Effort: S.

## DEF-HIRE-10 High - Interviewer (MANAGER) can read PII of candidates not assigned to them
- `RecruitmentManagementService.validateCandidateAccess` (L849-853) only checks scope when `assignedRecruiterId != null`; candidates without a recruiter are readable by any CANDIDATE_VIEW holder. GET /candidates/{Bravo} as sumit@ -> 200 with email (test 041, 3 runs). List endpoint returned 0 rows for him (scope spec) so by-id and list are inconsistent. Fix: require interviewer/hiring-manager/recruiter relationship, deny by default. Effort: S.

## DEF-HIRE-11 Medium (gap) - no candidate->employee conversion
- HR must re-key the hire via POST /employees (test 029c); `PreboardingService.markConverted` only links an existing employee. Onboarding initiation + 6-task checklist work (031/032). Effort: M.

## Not defects but gaps
- No requisition/approval workflow before publishing a job (test 002 BLOCKED); offer approval depends on DEF-HIRE-01.
