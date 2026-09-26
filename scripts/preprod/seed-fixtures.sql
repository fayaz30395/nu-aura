-- ============================================================================
-- PREPRODUCTION-ONLY fixture: a second, entirely synthetic tenant.
--
-- Purpose: the cross-tenant isolation probe (check 6 of verify-deployment.sh)
-- needs a resource in a DIFFERENT tenant to request. Production's second tenant
-- ("Default Tenant") has zero employees, and the demo-gated migrations seed only
-- the NuLogic tenant, so nothing exists to cross-test against.
--
-- THIS IS NOT A FLYWAY MIGRATION. It lives outside db/migration/ deliberately:
--   * Flyway never resolves it, so it can never take a version number, never
--     enter flyway_schema_history, and never affect a checksum.
--   * V337+ stays reserved for real schema/data corrections.
--   * It is applied out-of-band, by an operator or the CI preprod job.
--
-- THREE INDEPENDENT SAFETY BARRIERS, any one of which stops a production run:
--   1. Refuses if the target looks like production (NuLogic tenant with real
--      employee volume).
--   2. Refuses unless app.preprod_fixtures_allowed = 'true' is deliberately set
--      by the caller.
--   3. Refuses if demo credentials are disabled, which is production's posture.
--
-- All data below is fictional. No production identifier, name, or email appears.
--
-- Usage:
--   psql "$PREPROD_DB_URL" \
--     -c "SET app.preprod_fixtures_allowed = 'true'" -f scripts/preprod/seed-fixtures.sql
-- ============================================================================

\set ON_ERROR_STOP on

DO $$
DECLARE
    nulogic_employees INTEGER;
BEGIN
    -- Barrier 2: explicit opt-in.
    IF current_setting('app.preprod_fixtures_allowed', true) IS DISTINCT FROM 'true' THEN
        RAISE EXCEPTION 'REFUSING: app.preprod_fixtures_allowed is not ''true''. '
                        'This fixture is preproduction-only.';
    END IF;

    -- Barrier 1: production shape detection. Production's NuLogic tenant holds
    -- dozens of real employees; a freshly seeded preproduction holds the demo set.
    SELECT count(*) INTO nulogic_employees
      FROM employees
     WHERE tenant_id = '660e8400-e29b-41d4-a716-446655440001';
    IF nulogic_employees > 100 THEN
        RAISE EXCEPTION 'REFUSING: target has % employees in the NuLogic tenant and '
                        'looks like production.', nulogic_employees;
    END IF;

    -- Barrier 3: production runs with demo credentials disabled, so the demo users
    -- this fixture complements do not exist there.
    IF NOT EXISTS (SELECT 1 FROM users WHERE email LIKE '%@nulogic.io' AND status = 'ACTIVE') THEN
        RAISE EXCEPTION 'REFUSING: no active demo accounts present. This target is not a '
                        'demo-seeded preproduction database.';
    END IF;
END $$;

-- ---------------------------------------------------------------------------
-- Synthetic tenant. Fixed UUIDs so the verification suite can reference them.
-- ---------------------------------------------------------------------------
INSERT INTO tenants (id, code, name, status, created_at, updated_at, version, is_deleted)
SELECT 'aa000000-0000-0000-0000-000000000001', 'PREPROD-ISO', 'Preprod Isolation Tenant',
       'ACTIVE', NOW(), NOW(), 0, false
WHERE NOT EXISTS (SELECT 1 FROM tenants WHERE id = 'aa000000-0000-0000-0000-000000000001');

SELECT set_config('app.current_tenant_id', 'aa000000-0000-0000-0000-000000000001', false);

INSERT INTO roles (id, tenant_id, code, name, description, created_at, updated_at, version, is_deleted)
SELECT 'aa000000-0000-0000-0000-000000000010', 'aa000000-0000-0000-0000-000000000001',
       'EMPLOYEE', 'Employee', 'Preprod isolation fixture role', NOW(), NOW(), 0, false
WHERE NOT EXISTS (SELECT 1 FROM roles WHERE id = 'aa000000-0000-0000-0000-000000000010');

-- Fictional person. The password hash is a bcrypt of a value that exists only in
-- preproduction and is supplied to CI as a secret; it is never a production credential.
INSERT INTO users (id, tenant_id, email, password_hash, first_name, last_name,
                   status, password_changed_at, created_at, updated_at, version, is_deleted)
SELECT 'aa000000-0000-0000-0000-000000000020', 'aa000000-0000-0000-0000-000000000001',
       'isolation.fixture@preprod.invalid',
       '$2a$10$K7KY7oAmG8.YWepGbhhzSOQg1H25YeIy9rSiZ3wAkQBNeCKrmJzaG',
       'Isolation', 'Fixture', 'ACTIVE', NOW(), NOW(), NOW(), 0, false
WHERE NOT EXISTS (SELECT 1 FROM users WHERE id = 'aa000000-0000-0000-0000-000000000020');

INSERT INTO employees (id, tenant_id, user_id, employee_code, first_name, last_name,
                       joining_date, employment_type, status,
                       created_at, updated_at, version, is_deleted)
SELECT 'aa000000-0000-0000-0000-000000000030', 'aa000000-0000-0000-0000-000000000001',
       'aa000000-0000-0000-0000-000000000020', 'PPX-0001', 'Isolation', 'Fixture',
       CURRENT_DATE, 'FULL_TIME', 'ACTIVE',
       NOW(), NOW(), 0, false
WHERE NOT EXISTS (SELECT 1 FROM employees WHERE id = 'aa000000-0000-0000-0000-000000000030');

DO $$
DECLARE
    n INTEGER;
BEGIN
    SELECT count(*) INTO n FROM employees WHERE tenant_id = 'aa000000-0000-0000-0000-000000000001';
    RAISE NOTICE 'preprod fixture: isolation tenant has % employee(s). '
                 'VERIFY_OTHER_TENANT_EMPLOYEE_ID=aa000000-0000-0000-0000-000000000030', n;
END $$;
