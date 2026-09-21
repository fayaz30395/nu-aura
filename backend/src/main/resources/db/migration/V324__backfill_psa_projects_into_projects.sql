-- US-2FZ92MRRMTV6: backfill psa_projects into the shared HRMS projects table
-- (by project_code) so the new shared timesheet-to-invoice pipeline
-- (ProjectInvoiceGenerationService, US-2FZ92MJAG93G) can see PSA-managed projects.

-- ponytail: single hardcoded tenant literal, matching every other seed/backfill
-- migration in this codebase (V315/V316/etc) — this system is single-tenant demo
-- today. A true multi-tenant backfill would need to loop per distinct tenant_id.
SELECT set_config('app.current_tenant_id', '660e8400-e29b-41d4-a716-446655440001', true);

INSERT INTO projects (
    id, tenant_id, project_code, name, description,
    start_date, end_date, status, priority,
    project_manager_id, client_id, budget,
    billing_type, is_billable, default_billing_rate,
    created_at, updated_at
)
SELECT
    gen_random_uuid(), p.tenant_id, p.project_code, p.project_name, p.description,
    p.start_date, p.end_date,
    CASE p.status
        WHEN 'ACTIVE' THEN 'IN_PROGRESS'
        ELSE p.status
    END,
    'MEDIUM',
    p.project_manager_id, p.client_id, p.budget,
    p.billing_type, COALESCE(p.is_billable, false), p.billing_rate,
    NOW(), NOW()
FROM psa_projects p
WHERE NOT EXISTS (
    SELECT 1 FROM projects pr
    WHERE pr.project_code = p.project_code
      AND pr.tenant_id = p.tenant_id
      AND pr.is_deleted = false
);
