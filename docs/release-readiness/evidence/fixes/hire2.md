H-005 | NEEDS-DECISION | - | V83 already seeds OFFER_STANDARD per tenant that existed at migration time; demo tenant has none (data gap). A new seed migration needs a decision on per-tenant bootstrap
H-018 | FIXED | lib/config/routes.ts | added /recruitment/career-page route rule (recruitment roles only)
H-019 | FIXED | app/recruitment/scorecards/page.tsx | New Template/edit/delete shown only with SCORECARD:TEMPLATE_MANAGE; save error text mentions permission
H-020 | FIXED | app/recruitment/scorecards/page.tsx | blocks save with "Add at least one criterion"
H-021 | FIXED (unverified in browser) | app/onboarding/templates/new/page.tsx | router.replace + button locked after create, so no duplicate; root cause of no-nav not reproduced
H-022 | FIXED | app/recruitment/interviews/page.tsx | past time rejected for new interviews only (not in shared schema, feedback form reuses it)
H-023 | FIXED | lib/hooks/queries/useReferrals.ts, app/referrals/page.tsx | list-all only fetched with REFERRAL:MANAGE; my-referrals only with VIEW
H-024 | FIXED | lib/config/routes.ts | /referrals also allows REFERRAL:MANAGE (HR admin)
H-025 | FIXED | app/recruitment/career-page/page.tsx | table container overflow-x-auto
H-026 | PARTIAL | app/recruitment/interviews/page.tsx | interview forms noValidate so zod message shows; candidate form left to fix-hire
H-027 | FIXED | app/recruitment/jobs/page.tsx | past closing date rejected on create only
H-028 | FIXED | app/recruitment/interviews/page.tsx, lib/validations/recruitment.ts | "Feedback is required"; feedback schema nullish
H-029 | PARTIAL | lib/validations/recruitment.ts | "Invalid ID format" -> "Please select a valid option"; backend "Invalid value ... for field" text in applicant dialog (pipeline) not touched
H-030 | FIXED | lib/config/public-routes.ts, __tests__/public-routes.test.ts | client list gets /careers/[slug]; test updated, passes
H-031 | FIXED | app/preboarding/page.tsx | joining date cannot be in the past
H-032 | FIXED | app/recruitment/jobs/_components/JobsTable.tsx | 0 shown as em dash
H-033 | FIXED | app/onboarding/page.tsx, lib/hooks/queries/useOnboarding.ts | h1 on denied view; processes query disabled without permission (nav entry still visible)
H-034 | FIXED | app/recruitment/interviews/page.tsx | year added to list date
H-035 | FIXED | app/recruitment/scorecards/page.tsx | back button goes to /me/dashboard
