-- V73__seed_leave_balances_2026.sql
-- Seed leave balances for all demo employees for year 2026.
-- Fixes: Leave management page shows "No leave balances found" because
-- V72 seeded leave_types but no leave_balance records existed.
--
-- Strategy:
--   - Cross-join demo employees with applicable leave types
--   - Gender-specific types: ML (FEMALE) only for Chitra; PL (MALE) for all males
--   - opening_balance = annual_quota from leave_types
--   - available = opening_balance (no usage yet)
--   - CO gets 0 balance (earned from weekend/holiday work)
--   - LOP gets 365 balance (unpaid, effectively unlimited)
--   - Idempotent via ON CONFLICT on uq_leave_balances_key
--
-- Tenant: NuLogic (660e8400-e29b-41d4-a716-446655440001)
-- ============================================================================

DO $$
DECLARE
    v_tenant_id UUID := '660e8400-e29b-41d4-a716-446655440001';
    v_year      INT  := 2026;
BEGIN

    -- Insert leave balances for each demo employee × each applicable leave type.
    -- Uses a CTE to look up leave_type IDs by code within the tenant.
    INSERT INTO leave_balances (
        id, tenant_id, employee_id, leave_type_id, year,
        opening_balance, accrued, used, pending, available,
        carried_forward, encashed, lapsed, last_accrual_date,
        created_at, updated_at, version, is_deleted
    )
    SELECT
        gen_random_uuid(),
        v_tenant_id,
        emp.id,
        lt.id,
        v_year,
        lt.annual_quota,                      -- opening_balance
        0.00,                                 -- accrued (start of year)
        0.00,                                 -- used
        0.00,                                 -- pending
        lt.annual_quota,                      -- available = opening_balance
        0.00,                                 -- carried_forward
        0.00,                                 -- encashed
        0.00,                                 -- lapsed
        NULL,                                 -- last_accrual_date
        NOW(),                                -- created_at
        NOW(),                                -- updated_at
        0,                                    -- version
        false                                 -- is_deleted
    FROM (
        -- All 14 demo employees (Fayaz + 13 from V49)
        VALUES
            ('550e8400-e29b-41d4-a716-446655440040'::UUID, 'MALE'),   -- Fayaz (CEO)
            ('48000000-e001-0000-0000-000000000001'::UUID, 'MALE'),   -- Sumit
            ('48000000-e001-0000-0000-000000000002'::UUID, 'MALE'),   -- Saran
            ('48000000-e001-0000-0000-000000000003'::UUID, 'MALE'),   -- Mani
            ('48000000-e001-0000-0000-000000000004'::UUID, 'MALE'),   -- Raj
            ('48000000-e001-0000-0000-000000000005'::UUID, 'MALE'),   -- Gokul
            ('48000000-e001-0000-0000-000000000006'::UUID, 'MALE'),   -- Anshuman
            ('48000000-e001-0000-0000-000000000007'::UUID, 'MALE'),   -- Jagadeesh
            ('48000000-e001-0000-0000-000000000008'::UUID, 'MALE'),   -- Suresh
            ('48000000-e001-0000-0000-000000000009'::UUID, 'MALE'),   -- Arun
            ('48000000-e001-0000-0000-000000000010'::UUID, 'MALE'),   -- Bharath
            ('48000000-e001-0000-0000-000000000011'::UUID, 'MALE'),   -- Dhanush
            ('48000000-e001-0000-0000-000000000012'::UUID, 'FEMALE'), -- Chitra
            ('48000000-e001-0000-0000-000000000013'::UUID, 'MALE')    -- Deepak
    ) AS emp(id, gender)
    CROSS JOIN leave_types lt
    WHERE lt.tenant_id = v_tenant_id
      AND lt.is_deleted = false
      AND lt.is_active = true
      -- Gender filtering: ML only for FEMALE, PL only for MALE, ALL for everyone
      AND (
          lt.gender_specific = 'ALL'
          OR (lt.gender_specific = 'FEMALE' AND emp.gender = 'FEMALE')
          OR (lt.gender_specific = 'MALE'   AND emp.gender = 'MALE')
      )
    ON CONFLICT ON CONSTRAINT uq_leave_balances_key DO NOTHING;

END $$;
