H-008, H-010, H-013..H-015, H-018..H-025, H-027, H-028, H-030..H-036 | FIXED earlier | - | see hire.md / hire2.md
H-017 | FIXED | app/offer-portal/page.tsx | hr@company.com removed; uses NEXT_PUBLIC_HR_CONTACT_EMAIL, else generic text (offer payload has no tenant email; set env per deployment)
H-026 | FIXED | app/recruitment/candidates/_components/CandidateFormModal.tsx | form noValidate so zod message shows for negative notice period (interview form done earlier)
H-025 | FIXED earlier | app/recruitment/career-page/page.tsx | overflow-x-auto (admin/career-page route redirects/aliases there)
H-029 | SKIPPED (partial earlier) | - | backend "Invalid value ... for field" text in pipeline applicant dialog needs a message-mapping decision/live repro
H-011, H-012 | NEEDS-DECISION | - | root cause not reproduced; see hire2.md
H-016 | NEEDS-DECISION | - | showing status and stage as two labelled fields requires the candidate page to fetch application stage per candidate (no field on candidate DTO); not done
H-005 | NEEDS-DECISION | - | per-tenant offer template seed
Q-006 | FIXED earlier | app/recruitment/candidates/page.tsx | error card with retry (spinner variant not reproduced)
Q-015 | FIXED | app/recruitment/candidates/CandidateStats.tsx | grid 1/2/4 columns at sm/lg so cards are not clipped at 768
Q-022 | FIXED | app/recruitment/pipeline/page.tsx, app/onboarding/templates/page.tsx, app/preboarding/page.tsx | aria-labels on job select and search inputs
