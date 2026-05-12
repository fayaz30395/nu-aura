-- V157: Tenant FK batch 1 of N — Core HR tables.
--
-- Context: Wave-3 audit #1 identified ~208 tables with a `tenant_id UUID` column but no
-- foreign key back to `tenants(id)`. Multi-tenancy is enforced at the application layer via
-- TenantContext (ThreadLocal), so referential integrity at the DB has been missing — a defense-
-- in-depth gap that also makes tenant offboarding messy. This batch adds explicit FKs with
-- ON DELETE CASCADE so deleting a tenant cleanly cascades through its data.
--
-- Idempotency: each FK is wrapped in its own DO block that checks information_schema first,
-- so reruns are safe and a single failure (e.g. table missing on a downstream branch) does
-- not poison the batch — the remaining FKs still get applied.
--
-- Scope: 22 core-HR tables. Subsequent batches will cover payroll/recruitment (V158) etc.
-- Cap: 25 per batch to keep the transaction modest.

-- ----------------------------------------------------------------------------
-- 1. departments
-- ----------------------------------------------------------------------------
DO
$$
BEGIN
    IF
NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE table_name = 'departments' AND constraint_name = 'fk_departments_tenant'
    ) AND EXISTS (
        SELECT 1 FROM information_schema.tables WHERE table_name = 'departments'
    ) THEN
ALTER TABLE departments
  ADD CONSTRAINT fk_departments_tenant
    FOREIGN KEY (tenant_id) REFERENCES tenants (id) ON DELETE CASCADE;
END IF;
END $$;

-- ----------------------------------------------------------------------------
-- 2. employees
-- ----------------------------------------------------------------------------
DO
$$
BEGIN
    IF
NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE table_name = 'employees' AND constraint_name = 'fk_employees_tenant'
    ) AND EXISTS (
        SELECT 1 FROM information_schema.tables WHERE table_name = 'employees'
    ) THEN
ALTER TABLE employees
  ADD CONSTRAINT fk_employees_tenant
    FOREIGN KEY (tenant_id) REFERENCES tenants (id) ON DELETE CASCADE;
END IF;
END $$;

-- ----------------------------------------------------------------------------
-- 3. attendance_records
-- ----------------------------------------------------------------------------
DO
$$
BEGIN
    IF
NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE table_name = 'attendance_records' AND constraint_name = 'fk_attendance_records_tenant'
    ) AND EXISTS (
        SELECT 1 FROM information_schema.tables WHERE table_name = 'attendance_records'
    ) THEN
ALTER TABLE attendance_records
  ADD CONSTRAINT fk_attendance_records_tenant
    FOREIGN KEY (tenant_id) REFERENCES tenants (id) ON DELETE CASCADE;
END IF;
END $$;

-- ----------------------------------------------------------------------------
-- 4. leave_requests
-- ----------------------------------------------------------------------------
DO
$$
BEGIN
    IF
NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE table_name = 'leave_requests' AND constraint_name = 'fk_leave_requests_tenant'
    ) AND EXISTS (
        SELECT 1 FROM information_schema.tables WHERE table_name = 'leave_requests'
    ) THEN
ALTER TABLE leave_requests
  ADD CONSTRAINT fk_leave_requests_tenant
    FOREIGN KEY (tenant_id) REFERENCES tenants (id) ON DELETE CASCADE;
END IF;
END $$;

-- ----------------------------------------------------------------------------
-- 5. leave_balances
-- ----------------------------------------------------------------------------
DO
$$
BEGIN
    IF
NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE table_name = 'leave_balances' AND constraint_name = 'fk_leave_balances_tenant'
    ) AND EXISTS (
        SELECT 1 FROM information_schema.tables WHERE table_name = 'leave_balances'
    ) THEN
ALTER TABLE leave_balances
  ADD CONSTRAINT fk_leave_balances_tenant
    FOREIGN KEY (tenant_id) REFERENCES tenants (id) ON DELETE CASCADE;
END IF;
END $$;

-- ----------------------------------------------------------------------------
-- 6. leave_types
-- ----------------------------------------------------------------------------
DO
$$
BEGIN
    IF
NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE table_name = 'leave_types' AND constraint_name = 'fk_leave_types_tenant'
    ) AND EXISTS (
        SELECT 1 FROM information_schema.tables WHERE table_name = 'leave_types'
    ) THEN
ALTER TABLE leave_types
  ADD CONSTRAINT fk_leave_types_tenant
    FOREIGN KEY (tenant_id) REFERENCES tenants (id) ON DELETE CASCADE;
END IF;
END $$;

-- ----------------------------------------------------------------------------
-- 7. holidays
-- ----------------------------------------------------------------------------
DO
$$
BEGIN
    IF
NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE table_name = 'holidays' AND constraint_name = 'fk_holidays_tenant'
    ) AND EXISTS (
        SELECT 1 FROM information_schema.tables WHERE table_name = 'holidays'
    ) THEN
ALTER TABLE holidays
  ADD CONSTRAINT fk_holidays_tenant
    FOREIGN KEY (tenant_id) REFERENCES tenants (id) ON DELETE CASCADE;
END IF;
END $$;

-- ----------------------------------------------------------------------------
-- 8. shifts
-- ----------------------------------------------------------------------------
DO
$$
BEGIN
    IF
NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE table_name = 'shifts' AND constraint_name = 'fk_shifts_tenant'
    ) AND EXISTS (
        SELECT 1 FROM information_schema.tables WHERE table_name = 'shifts'
    ) THEN
ALTER TABLE shifts
  ADD CONSTRAINT fk_shifts_tenant
    FOREIGN KEY (tenant_id) REFERENCES tenants (id) ON DELETE CASCADE;
END IF;
END $$;

-- ----------------------------------------------------------------------------
-- 9. shift_assignments
-- ----------------------------------------------------------------------------
DO
$$
BEGIN
    IF
NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE table_name = 'shift_assignments' AND constraint_name = 'fk_shift_assignments_tenant'
    ) AND EXISTS (
        SELECT 1 FROM information_schema.tables WHERE table_name = 'shift_assignments'
    ) THEN
ALTER TABLE shift_assignments
  ADD CONSTRAINT fk_shift_assignments_tenant
    FOREIGN KEY (tenant_id) REFERENCES tenants (id) ON DELETE CASCADE;
END IF;
END $$;

-- ----------------------------------------------------------------------------
-- 10. assets
-- ----------------------------------------------------------------------------
DO
$$
BEGIN
    IF
NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE table_name = 'assets' AND constraint_name = 'fk_assets_tenant'
    ) AND EXISTS (
        SELECT 1 FROM information_schema.tables WHERE table_name = 'assets'
    ) THEN
ALTER TABLE assets
  ADD CONSTRAINT fk_assets_tenant
    FOREIGN KEY (tenant_id) REFERENCES tenants (id) ON DELETE CASCADE;
END IF;
END $$;

-- ----------------------------------------------------------------------------
-- 11. announcements
-- ----------------------------------------------------------------------------
DO
$$
BEGIN
    IF
NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE table_name = 'announcements' AND constraint_name = 'fk_announcements_tenant'
    ) AND EXISTS (
        SELECT 1 FROM information_schema.tables WHERE table_name = 'announcements'
    ) THEN
ALTER TABLE announcements
  ADD CONSTRAINT fk_announcements_tenant
    FOREIGN KEY (tenant_id) REFERENCES tenants (id) ON DELETE CASCADE;
END IF;
END $$;

-- ----------------------------------------------------------------------------
-- 12. calendar_events
-- ----------------------------------------------------------------------------
DO
$$
BEGIN
    IF
NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE table_name = 'calendar_events' AND constraint_name = 'fk_calendar_events_tenant'
    ) AND EXISTS (
        SELECT 1 FROM information_schema.tables WHERE table_name = 'calendar_events'
    ) THEN
ALTER TABLE calendar_events
  ADD CONSTRAINT fk_calendar_events_tenant
    FOREIGN KEY (tenant_id) REFERENCES tenants (id) ON DELETE CASCADE;
END IF;
END $$;

-- ----------------------------------------------------------------------------
-- 13. organization_units (org/dept hierarchy — closest match to "organizations")
-- ----------------------------------------------------------------------------
DO
$$
BEGIN
    IF
NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE table_name = 'organization_units' AND constraint_name = 'fk_organization_units_tenant'
    ) AND EXISTS (
        SELECT 1 FROM information_schema.tables WHERE table_name = 'organization_units'
    ) THEN
ALTER TABLE organization_units
  ADD CONSTRAINT fk_organization_units_tenant
    FOREIGN KEY (tenant_id) REFERENCES tenants (id) ON DELETE CASCADE;
END IF;
END $$;

-- ----------------------------------------------------------------------------
-- 14. office_locations (replaces "locations")
-- ----------------------------------------------------------------------------
DO
$$
BEGIN
    IF
NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE table_name = 'office_locations' AND constraint_name = 'fk_office_locations_tenant'
    ) AND EXISTS (
        SELECT 1 FROM information_schema.tables WHERE table_name = 'office_locations'
    ) THEN
ALTER TABLE office_locations
  ADD CONSTRAINT fk_office_locations_tenant
    FOREIGN KEY (tenant_id) REFERENCES tenants (id) ON DELETE CASCADE;
END IF;
END $$;

-- ----------------------------------------------------------------------------
-- 15. positions (job positions / designations equivalent)
-- ----------------------------------------------------------------------------
DO
$$
BEGIN
    IF
NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE table_name = 'positions' AND constraint_name = 'fk_positions_tenant'
    ) AND EXISTS (
        SELECT 1 FROM information_schema.tables WHERE table_name = 'positions'
    ) THEN
ALTER TABLE positions
  ADD CONSTRAINT fk_positions_tenant
    FOREIGN KEY (tenant_id) REFERENCES tenants (id) ON DELETE CASCADE;
END IF;
END $$;

-- ----------------------------------------------------------------------------
-- 16. onboarding_processes
-- ----------------------------------------------------------------------------
DO
$$
BEGIN
    IF
NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE table_name = 'onboarding_processes' AND constraint_name = 'fk_onboarding_processes_tenant'
    ) AND EXISTS (
        SELECT 1 FROM information_schema.tables WHERE table_name = 'onboarding_processes'
    ) THEN
ALTER TABLE onboarding_processes
  ADD CONSTRAINT fk_onboarding_processes_tenant
    FOREIGN KEY (tenant_id) REFERENCES tenants (id) ON DELETE CASCADE;
END IF;
END $$;

-- ----------------------------------------------------------------------------
-- 17. onboarding_tasks
-- ----------------------------------------------------------------------------
DO
$$
BEGIN
    IF
NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE table_name = 'onboarding_tasks' AND constraint_name = 'fk_onboarding_tasks_tenant'
    ) AND EXISTS (
        SELECT 1 FROM information_schema.tables WHERE table_name = 'onboarding_tasks'
    ) THEN
ALTER TABLE onboarding_tasks
  ADD CONSTRAINT fk_onboarding_tasks_tenant
    FOREIGN KEY (tenant_id) REFERENCES tenants (id) ON DELETE CASCADE;
END IF;
END $$;

-- ----------------------------------------------------------------------------
-- 18. document_templates  (closest schema match to "documents")
-- ----------------------------------------------------------------------------
DO
$$
BEGIN
    IF
NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE table_name = 'document_templates' AND constraint_name = 'fk_document_templates_tenant'
    ) AND EXISTS (
        SELECT 1 FROM information_schema.tables WHERE table_name = 'document_templates'
    ) THEN
ALTER TABLE document_templates
  ADD CONSTRAINT fk_document_templates_tenant
    FOREIGN KEY (tenant_id) REFERENCES tenants (id) ON DELETE CASCADE;
END IF;
END $$;

-- ----------------------------------------------------------------------------
-- 19. document_categories
-- ----------------------------------------------------------------------------
DO
$$
BEGIN
    IF
NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE table_name = 'document_categories' AND constraint_name = 'fk_document_categories_tenant'
    ) AND EXISTS (
        SELECT 1 FROM information_schema.tables WHERE table_name = 'document_categories'
    ) THEN
ALTER TABLE document_categories
  ADD CONSTRAINT fk_document_categories_tenant
    FOREIGN KEY (tenant_id) REFERENCES tenants (id) ON DELETE CASCADE;
END IF;
END $$;

-- ----------------------------------------------------------------------------
-- 20. generated_documents (actual generated/served documents)
-- ----------------------------------------------------------------------------
DO
$$
BEGIN
    IF
NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE table_name = 'generated_documents' AND constraint_name = 'fk_generated_documents_tenant'
    ) AND EXISTS (
        SELECT 1 FROM information_schema.tables WHERE table_name = 'generated_documents'
    ) THEN
ALTER TABLE generated_documents
  ADD CONSTRAINT fk_generated_documents_tenant
    FOREIGN KEY (tenant_id) REFERENCES tenants (id) ON DELETE CASCADE;
END IF;
END $$;

-- ----------------------------------------------------------------------------
-- 21. tickets (helpdesk tickets)
-- ----------------------------------------------------------------------------
DO
$$
BEGIN
    IF
NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE table_name = 'tickets' AND constraint_name = 'fk_tickets_tenant'
    ) AND EXISTS (
        SELECT 1 FROM information_schema.tables WHERE table_name = 'tickets'
    ) THEN
ALTER TABLE tickets
  ADD CONSTRAINT fk_tickets_tenant
    FOREIGN KEY (tenant_id) REFERENCES tenants (id) ON DELETE CASCADE;
END IF;
END $$;

-- ----------------------------------------------------------------------------
-- 22. ticket_categories (helpdesk categories)
-- ----------------------------------------------------------------------------
DO
$$
BEGIN
    IF
NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE table_name = 'ticket_categories' AND constraint_name = 'fk_ticket_categories_tenant'
    ) AND EXISTS (
        SELECT 1 FROM information_schema.tables WHERE table_name = 'ticket_categories'
    ) THEN
ALTER TABLE ticket_categories
  ADD CONSTRAINT fk_ticket_categories_tenant
    FOREIGN KEY (tenant_id) REFERENCES tenants (id) ON DELETE CASCADE;
END IF;
END $$;
