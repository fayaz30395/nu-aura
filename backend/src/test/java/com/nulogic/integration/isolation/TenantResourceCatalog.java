package com.nulogic.integration.isolation;

import com.nulogic.integration.isolation.TwoTenantFixture.Tenant;

import java.util.List;
import java.util.UUID;

import static com.nulogic.integration.isolation.TwoTenantFixture.*;

/**
 * The tenant-owned resource types the HTTP-level isolation tests iterate over: 34 types across
 * NU-HRMS, NU-Hire, NU-Grow, NU-Fluence, payroll and PSA. Each row is seeded for both tenants by
 * {@code seed-tenant.sql} under {@link TwoTenantFixture#id(int)}.
 *
 * <p>{@code mutation} is a state-changing call on a single row other than DELETE (approve,
 * publish, pin, status change, ...): {@code "METHOD /path/{id}|json-body"}; body may be empty.</p>
 */
final class TenantResourceCatalog {

    private TenantResourceCatalog() {
    }

    record ApiResource(String name, String module, String table, int type,
                       String getPath, String listPath, String deletePath, String mutation) {

        String get(Tenant owner) {
            return getPath.replace("{id}", id(owner).toString());
        }

        String delete(Tenant owner) {
            return deletePath.replace("{id}", id(owner).toString());
        }

        UUID id(Tenant owner) {
            return owner.id(type);
        }

        @Override
        public String toString() {
            return module + ":" + name;
        }
    }

    static final List<ApiResource> RESOURCES = List.of(
            // ── NU-HRMS ──────────────────────────────────────────────────────────────────
            new ApiResource("employee", "HRMS", "employees", EMPLOYEE,
                    "/api/v1/employees/{id}", "/api/v1/employees", "/api/v1/employees/{id}",
                    "PUT /api/v1/employees/{id}/deactivate|"),
            new ApiResource("department", "HRMS", "departments", DEPARTMENT,
                    "/api/v1/departments/{id}", "/api/v1/departments", "/api/v1/departments/{id}",
                    "PATCH /api/v1/departments/{id}/deactivate|"),
            new ApiResource("leave-type", "HRMS", "leave_types", LEAVE_TYPE,
                    "/api/v1/leave-types/{id}", "/api/v1/leave-types", "/api/v1/leave-types/{id}",
                    "PATCH /api/v1/leave-types/{id}/deactivate|"),
            new ApiResource("leave-request", "HRMS", "leave_requests", LEAVE_REQUEST,
                    "/api/v1/leave-requests/{id}", "/api/v1/leave-requests", null,
                    "POST /api/v1/leave-requests/{id}/approve|"),
            new ApiResource("expense-claim", "HRMS", "expense_claims", EXPENSE_CLAIM,
                    "/api/v1/expenses/{id}", "/api/v1/expenses", "/api/v1/expenses/{id}",
                    "POST /api/v1/expenses/{id}/approve|"),
            new ApiResource("announcement", "HRMS", "announcements", ANNOUNCEMENT,
                    "/api/v1/announcements/{id}", "/api/v1/announcements", "/api/v1/announcements/{id}",
                    "POST /api/v1/announcements/{id}/pin|"),
            new ApiResource("helpdesk-ticket", "HRMS", "tickets", TICKET,
                    "/api/v1/helpdesk/tickets/{id}", "/api/v1/helpdesk/tickets", "/api/v1/helpdesk/tickets/{id}",
                    "PATCH /api/v1/helpdesk/tickets/{id}/close|"),
            new ApiResource("holiday", "HRMS", "holidays", HOLIDAY,
                    "/api/v1/holidays/{id}", "/api/v1/holidays/year/2030", "/api/v1/holidays/{id}", null),
            new ApiResource("asset", "HRMS", "assets", ASSET,
                    "/api/v1/assets/{id}", "/api/v1/assets", "/api/v1/assets/{id}",
                    "POST /api/v1/assets/{id}/return|"),
            new ApiResource("contract", "HRMS", "contracts", CONTRACT,
                    "/api/v1/contracts/{id}", "/api/v1/contracts", "/api/v1/contracts/{id}",
                    "PATCH /api/v1/contracts/{id}/mark-pending-review|"),
            new ApiResource("letter-template", "HRMS", "letter_templates", LETTER_TEMPLATE,
                    "/api/v1/letters/templates/{id}", "/api/v1/letters/templates", "/api/v1/letters/templates/{id}",
                    "POST /api/v1/letters/templates/{id}/clone|"),
            new ApiResource("generated-letter", "HRMS", "generated_letters", GENERATED_LETTER,
                    "/api/v1/letters/{id}", "/api/v1/letters", null,
                    "POST /api/v1/letters/{id}/submit|"),
            new ApiResource("office-location", "HRMS", "office_locations", OFFICE_LOCATION,
                    "/api/v1/office-locations/{id}", "/api/v1/office-locations", "/api/v1/office-locations/{id}", null),
            new ApiResource("notification", "HRMS", "notifications", NOTIFICATION,
                    "/api/v1/notifications/{id}", "/api/v1/notifications", "/api/v1/notifications/{id}", null),
            // ── Payroll ──────────────────────────────────────────────────────────────────
            new ApiResource("payroll-run", "PAYROLL", "payroll_runs", PAYROLL_RUN,
                    "/api/v1/payroll/runs/{id}", "/api/v1/payroll/runs", "/api/v1/payroll/runs/{id}",
                    "POST /api/v1/payroll/runs/{id}/approve|"),
            new ApiResource("payslip", "PAYROLL", "payslips", PAYSLIP,
                    "/api/v1/payroll/payslips/{id}", "/api/v1/payroll/payslips", "/api/v1/payroll/payslips/{id}", null),
            new ApiResource("salary-structure", "PAYROLL", "salary_structures", SALARY_STRUCTURE,
                    "/api/v1/payroll/salary-structures/{id}", "/api/v1/payroll/salary-structures",
                    "/api/v1/payroll/salary-structures/{id}", "POST /api/v1/payroll/salary-structures/{id}/deactivate|"),
            new ApiResource("tax-declaration", "PAYROLL", "tax_declarations", TAX_DECLARATION,
                    "/api/v1/tax-declarations/{id}", "/api/v1/tax-declarations", "/api/v1/tax-declarations/{id}",
                    "PATCH /api/v1/tax-declarations/{id}/submit|"),
            new ApiResource("loan", "PAYROLL", "employee_loans", LOAN,
                    "/api/v1/loans/{id}", "/api/v1/loans", null,
                    "POST /api/v1/loans/{id}/approve|"),
            // ── NU-Hire ──────────────────────────────────────────────────────────────────
            new ApiResource("job-opening", "HIRE", "job_openings", JOB_OPENING,
                    "/api/v1/recruitment/job-openings/{id}", "/api/v1/recruitment/job-openings",
                    "/api/v1/recruitment/job-openings/{id}", null),
            new ApiResource("candidate", "HIRE", "candidates", CANDIDATE,
                    "/api/v1/recruitment/candidates/{id}", "/api/v1/recruitment/candidates",
                    "/api/v1/recruitment/candidates/{id}", null),
            new ApiResource("applicant", "HIRE", "applicants", APPLICANT,
                    "/api/v1/recruitment/applicants/{id}", "/api/v1/recruitment/applicants",
                    "/api/v1/recruitment/applicants/{id}",
                    "PUT /api/v1/recruitment/applicants/{id}/rating|{\"rating\":1}"),
            // ── NU-Grow ──────────────────────────────────────────────────────────────────
            new ApiResource("goal", "GROW", "goals", GOAL,
                    "/api/v1/goals/{id}", "/api/v1/goals", "/api/v1/goals/{id}",
                    "PUT /api/v1/goals/{id}/approve|"),
            new ApiResource("performance-review", "GROW", "performance_reviews", PERFORMANCE_REVIEW,
                    "/api/v1/reviews/{id}", "/api/v1/reviews", "/api/v1/reviews/{id}",
                    "PUT /api/v1/reviews/{id}/submit|"),
            new ApiResource("review-cycle", "GROW", "review_cycles", REVIEW_CYCLE,
                    "/api/v1/review-cycles/{id}", "/api/v1/review-cycles", "/api/v1/review-cycles/{id}",
                    "PUT /api/v1/review-cycles/{id}/complete|"),
            new ApiResource("training-program", "GROW", "training_programs", TRAINING_PROGRAM,
                    "/api/v1/training/programs/{id}", "/api/v1/training/programs", "/api/v1/training/programs/{id}", null),
            new ApiResource("okr-objective", "GROW", "objectives", OBJECTIVE,
                    "/api/v1/okr/objectives/{id}", "/api/v1/okr/objectives", "/api/v1/okr/objectives/{id}",
                    "POST /api/v1/okr/objectives/{id}/approve|"),
            new ApiResource("recognition", "GROW", "recognitions", RECOGNITION,
                    "/api/v1/recognition/{id}", "/api/v1/recognition/feed", null, null),
            new ApiResource("pulse-survey", "GROW", "pulse_surveys", PULSE_SURVEY,
                    "/api/v1/surveys/{id}", "/api/v1/surveys", "/api/v1/surveys/{id}",
                    "POST /api/v1/surveys/{id}/publish|"),
            // ── NU-Fluence ───────────────────────────────────────────────────────────────
            new ApiResource("wiki-space", "FLUENCE", "wiki_spaces", WIKI_SPACE,
                    "/api/v1/knowledge/wiki/spaces/{id}", "/api/v1/knowledge/wiki/spaces",
                    "/api/v1/knowledge/wiki/spaces/{id}", "POST /api/v1/knowledge/wiki/spaces/{id}/archive|"),
            new ApiResource("wiki-page", "FLUENCE", "wiki_pages", WIKI_PAGE,
                    "/api/v1/knowledge/wiki/pages/{id}", "/api/v1/knowledge/wiki/pages",
                    "/api/v1/knowledge/wiki/pages/{id}", "POST /api/v1/knowledge/wiki/pages/{id}/archive|"),
            new ApiResource("blog-post", "FLUENCE", "blog_posts", BLOG_POST,
                    "/api/v1/knowledge/blogs/{id}", "/api/v1/knowledge/blogs", "/api/v1/knowledge/blogs/{id}",
                    "POST /api/v1/knowledge/blogs/{id}/archive|"),
            new ApiResource("wall-post", "FLUENCE", "social_posts", WALL_POST,
                    "/api/v1/wall/posts/{id}", "/api/v1/wall/posts", "/api/v1/wall/posts/{id}",
                    "PATCH /api/v1/wall/posts/{id}/pin|"),
            // ── PSA ──────────────────────────────────────────────────────────────────────
            new ApiResource("project", "PSA", "projects", PROJECT,
                    "/api/v1/projects/{id}", "/api/v1/projects", "/api/v1/projects/{id}", null)
    );
}
