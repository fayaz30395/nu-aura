# Database ERD Generation

> Last updated: 2026-05-12 | Wave-4 doc audit (S8-A)

The NU-AURA schema has **360+ tables** distributed across 9 functional clusters. A static ERD
PNG would be unreadable at this size and would drift with every Flyway migration. Instead,
the team **generates the ERD on demand** from the live schema using one of the two tool-chains
documented below.

---

## When to (re-)generate the ERD

- Major release cut (post-final Flyway migration of the sprint)
- Adding a new bounded context (cluster) — refresh the cluster diagram in this file
- Database design review (`/data:db-review`) — generate, attach to the review ticket
- Onboarding a new backend engineer — point them at this doc, not the auto-generated artefact

The ERD is **deliberately not committed** to the repo. The cluster table further down is the
authoritative high-level map; the auto-generated artefact is for working sessions only.

---

## Option 1 — SchemaSpy (recommended for CI / automated runs)

[SchemaSpy](https://schemaspy.org/) produces clickable HTML + per-table pages + a real
graphviz ERD per cluster. The Docker image needs only a read-only DB user.

### Prerequisites

A read-only Postgres role with `USAGE` on `public` and `SELECT` on every table:

```sql
CREATE ROLE schemaspy_ro LOGIN PASSWORD '<rotate-me>';
GRANT CONNECT ON DATABASE neondb TO schemaspy_ro;
GRANT USAGE ON SCHEMA public TO schemaspy_ro;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO schemaspy_ro;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT SELECT ON TABLES TO schemaspy_ro;
```

### Generate

```bash
mkdir -p erd
docker run --rm \
  -v "$(pwd)/erd:/output" \
  schemaspy/schemaspy:latest \
  -t pgsql \
  -host <neon-host> -port 5432 \
  -db neondb \
  -u schemaspy_ro -p "$PG_RO_PASS" \
  -s public \
  -o /output \
  -vizjs           # bundled graphviz, no host install needed
```

Open `erd/index.html` in a browser. Each table has its own page with incoming/outgoing FKs,
indexes, sample rows, and a per-table diagram.

### CI hook (optional)

```yaml
# .github/workflows/erd-nightly.yml
- name: Generate ERD
  run: |
    docker run --rm -v ${{ github.workspace }}/erd:/output \
      schemaspy/schemaspy:latest \
      -t pgsql -host ${{ secrets.PG_HOST }} -port 5432 \
      -db ${{ secrets.PG_DB }} -u ${{ secrets.PG_RO_USER }} -p ${{ secrets.PG_RO_PASS }} \
      -s public -o /output -vizjs
- name: Publish to gh-pages
  uses: peaceiris/actions-gh-pages@v3
  with:
    publish_dir: ./erd
    destination_dir: erd/${{ github.run_id }}
```

---

## Option 2 — `pg_dump` + dbdiagram.io (lightweight, for one-off reviews)

For a single working session — no Docker required.

```bash
pg_dump \
  --schema-only --no-owner --no-acl --no-privileges \
  --exclude-schema=cron --exclude-schema=neon_auth \
  "$DATABASE_URL" > schema.sql

# 1. Open https://dbdiagram.io/d
# 2. File -> Import from SQL -> PostgreSQL
# 3. Paste schema.sql
```

dbdiagram.io renders a draggable canvas with FKs auto-linked. Export to PNG/PDF/DBML from
the UI.

> **Caveat:** dbdiagram.io's free tier struggles past ~200 tables — filter the dump to a
> single cluster (e.g. `pg_dump -t 'payroll_*' -t 'payslip*' ...`) for that workflow.

---

## Option 3 — DBeaver / DataGrip (interactive)

Both IDEs render a live ERD with no extra tooling — useful when you want to drag, hide
tables, and explore. Right-click schema → Generate ERD. Save as `.dbeaver-diagram` /
`.uml` next to your ticket; do **not** commit the binary.

---

## Key entity clusters

> The schema is too large for a single canvas. These are the 9 functional clusters every
> diagram should be filtered to. Table names are representative — see SchemaSpy for the full
> list within each cluster.

### 1. Auth & Tenancy (foundation)

```
tenants, tenant_settings, tenant_apps, tenant_app_subscriptions
users, user_sessions, user_mfa, password_history, password_reset_tokens
roles, permissions, role_permissions, user_roles
custom_scope_targets         -- V148+ scope allowlist
api_keys, api_key_usage
```

**Relationships:** every other entity FKs to `tenants(id)` (multi-tenant isolation) and most
mutating entities FK to `users(id)` via `created_by` / `updated_by`. RLS policies (V36–V38)
enforce tenant boundaries at the row level — see `security-controls.md`.

### 2. Organization & Employee

```
organization_units, departments, designations, positions, office_locations
employees, employee_documents, employee_education, employee_experience
employee_skills, employee_referrals, employee_addresses, employee_emergency_contacts
employment_change_requests, succession_plans, talent_pools
```

**Hot path:** `employees` is the highest-fanout entity (~190 FK relationships) — generate
its dedicated page in SchemaSpy.

### 3. Attendance, Shift & Leave

```
attendance_records, attendance_time_entries, attendance_regularizations
holidays, holiday_calendars, shift_definitions, shift_swaps, comp_off_requests
leave_types, leave_policies, leave_balances, leave_requests
leave_encashment, leave_accrual_log
```

V150 fixed orphaned `leave_balances` for archived employees and added a CHECK
`available_days >= 0` — see `Backend.md#flyway-migrations`.

### 4. Payroll, Compensation & Benefits

```
payroll_runs, payslips, salary_structures, salary_components, salary_revisions
payroll_components, employee_payroll_records, bonus_payouts
benefit_plans, benefit_enrollments, benefit_claims, benefit_dependents
flex_benefit_allocations, tax_declarations
expense_claims, expense_claim_sequence, mileage_claims, mileage_claim_sequence
```

`benefit_dependents.{nationalId, passportNumber, phone, email, preExistingConditions}` and
`tax_declarations.previousEmployerPan` are AES-GCM encrypted (V147).

### 5. Recruitment & Onboarding

```
job_openings, job_postings, job_boards, job_board_integrations
candidates, applicants, applicant_documents, applicant_screening_log
interviews, interview_scorecards, interview_feedback
offer_letters, recruitment_agencies, agency_candidates
onboarding_templates, onboarding_template_tasks, employee_onboarding_runs   -- V154
```

### 6. Performance & Growth (NU-Grow)

```
performance_reviews, review_cycles, performance_review_feedback
goals, okrs, key_results, performance_improvement_plans
feedback_360, feedback_360_invites, feedback_360_responses
training_programs, training_enrollments, lms_courses, lms_lessons, lms_quizzes
surveys, survey_responses, wellness_check_ins
```

### 7. NU-Fluence (Knowledge + Social)

```
wiki_spaces, wiki_pages, wiki_page_versions, wiki_inline_comments, wiki_page_attachments
blog_posts, blog_categories, blog_comments, blog_reactions
document_templates, document_template_versions
social_posts, post_comments, post_reactions, poll_options, poll_votes      -- Wall
announcements, recognitions, recognition_categories
```

V148 added unique constraints on `post_reactions(post_id, user_id)` and
`wiki_page_versions(page_id, version_number)`; V149 restored FTS GIN indexes on
`wiki_pages.search_vector` and `blog_posts.search_vector`; V152 extracted plaintext
`body_text` from stored HTML.

### 8. Workflow, Approval & Notification

```
workflow_definitions, workflow_steps, workflow_transitions
approval_instances, approval_tasks, approval_history
notifications, notification_templates, notification_preferences
email_queue, sms_queue, webhook_deliveries, webhook_subscriptions
failed_kafka_events                -- Kafka DLQ persistence
```

### 9. Audit, Compliance & Platform

```
audit_logs                         -- includes impersonator_id (V146)
compliance_audit_logs
ai_usage_log                       -- model, prompt-hash, cost_usd, runtime model id
system_audit_logs                  -- sprint 4 admin-grade audit table
dsr_requests                       -- V153 GDPR/DPDP data-subject requests
drive_file_mapping                 -- V143 tenant-isolated Drive handles
data_residency_zones, feature_flags
flyway_schema_history
```

---

## Known integrity gaps (wave-3 finding #1)

The wave-3 audit flagged **208 tables that store `tenant_id` as a column but have no FK to
`tenants(id)`**. Most are legacy tables predating the V35 FK pass; many are append-only
audit/event tables where the lack of FK is a performance trade-off. Tracking ticket: wave-3
follow-up backlog. Adding the FKs is a non-trivial 3-step migration (validate, add NOT VALID,
VALIDATE during off-hours) and is sequenced **after** the OpenTelemetry rollout so any deadlock
storm is observable.

When generating an ERD, expect SchemaSpy to render those tables with dashed/inferred edges
instead of solid FK lines.

---

## Quick cluster cheatsheet for code review

If you only need to remember the cross-cluster joins:

| Need to find...                            | Start from              | Key join                           |
|--------------------------------------------|-------------------------|------------------------------------|
| Who created this row?                      | any entity              | `created_by` → `users.id`          |
| What permissions does this role grant?     | `roles`                 | `role_permissions` → `permissions` |
| What's a user's effective tenant access?   | `users`                 | `user_roles` → `roles`             |
| Payslip for an employee in a month?        | `payroll_runs`          | → `payslips` → `employees`         |
| Wiki page version history?                 | `wiki_pages`            | → `wiki_page_versions`             |
| Drive file for a logical path?             | application layer       | `drive_file_mapping(tenant_id, logical_path)` |
| All audit entries for an actor?            | `audit_logs`            | `(actor_id, impersonator_id)`      |
| Pending DSR request for a user?            | `dsr_requests`          | `(tenant_id, subject_user_id, status='PENDING')` |
