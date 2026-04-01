-- V72__seed_leave_types.sql
-- Seed standard leave types for NuLogic demo tenant
-- Fixes: Leave Type dropdown empty on /me/leaves → Apply for Leave

-- Step 1: Add a partial unique index so ON CONFLICT works for idempotency
CREATE UNIQUE INDEX IF NOT EXISTS uq_leave_types_tenant_code_active
    ON leave_types (tenant_id, leave_code) WHERE deleted_at IS NULL;

-- Step 2: Insert 8 standard Indian leave types for the demo tenant
INSERT INTO leave_types (
    id, tenant_id, leave_code, leave_name, description,
    is_paid, color_code, annual_quota, max_consecutive_days,
    min_days_notice, max_days_per_request,
    is_carry_forward_allowed, max_carry_forward_days,
    is_encashable, requires_document, applicable_after_days,
    accrual_type, accrual_rate, gender_specific, is_active,
    created_at, updated_at, version, is_deleted
) VALUES
-- 1. Earned Leave (EL) — 18 days/year, monthly accrual, carry forward up to 30, encashable
(
    gen_random_uuid(),
    '660e8400-e29b-41d4-a716-446655440001',
    'EL', 'Earned Leave',
    'Earned/privilege leave accrued monthly. Can be carried forward and encashed.',
    true, '#2563EB', 18.00, 15, 7, 15,
    true, 30.00,
    true, false, 0,
    'MONTHLY', 1.50, 'ALL', true,
    NOW(), NOW(), 0, false
),
-- 2. Casual Leave (CL) — 7 days/year, no carry forward, not encashable
(
    gen_random_uuid(),
    '660e8400-e29b-41d4-a716-446655440001',
    'CL', 'Casual Leave',
    'Short-duration leave for personal matters. Cannot be carried forward.',
    true, '#16A34A', 7.00, 3, 1, 3,
    false, 0.00,
    false, false, 0,
    'YEARLY', 7.00, 'ALL', true,
    NOW(), NOW(), 0, false
),
-- 3. Sick Leave (SL) — 12 days/year, carry forward up to 20, not encashable
(
    gen_random_uuid(),
    '660e8400-e29b-41d4-a716-446655440001',
    'SL', 'Sick Leave',
    'Leave for illness or medical treatment. Medical certificate required for 3+ consecutive days.',
    true, '#DC2626', 12.00, 10, 0, 10,
    true, 20.00,
    false, true, 0,
    'YEARLY', 12.00, 'ALL', true,
    NOW(), NOW(), 0, false
),
-- 4. Maternity Leave — 182 days (26 weeks per Indian law), no accrual
(
    gen_random_uuid(),
    '660e8400-e29b-41d4-a716-446655440001',
    'ML', 'Maternity Leave',
    'Maternity leave as per Maternity Benefit Act, 2017. Available for up to 2 children.',
    true, '#DB2777', 182.00, 182, 30, 182,
    false, 0.00,
    false, true, 80,
    'NONE', 0.00, 'FEMALE', true,
    NOW(), NOW(), 0, false
),
-- 5. Paternity Leave — 15 days, no accrual
(
    gen_random_uuid(),
    '660e8400-e29b-41d4-a716-446655440001',
    'PL', 'Paternity Leave',
    'Leave for new fathers around the time of childbirth.',
    true, '#7C3AED', 15.00, 15, 7, 15,
    false, 0.00,
    false, true, 0,
    'NONE', 0.00, 'MALE', true,
    NOW(), NOW(), 0, false
),
-- 6. Bereavement Leave — 5 days, no accrual
(
    gen_random_uuid(),
    '660e8400-e29b-41d4-a716-446655440001',
    'BL', 'Bereavement Leave',
    'Leave granted in the event of death of an immediate family member.',
    true, '#6B7280', 5.00, 5, 0, 5,
    false, 0.00,
    false, false, 0,
    'NONE', 0.00, 'ALL', true,
    NOW(), NOW(), 0, false
),
-- 7. Compensatory Off — 0 initial days, earned from weekend/holiday work
(
    gen_random_uuid(),
    '660e8400-e29b-41d4-a716-446655440001',
    'CO', 'Compensatory Off',
    'Compensatory leave earned for working on weekends or public holidays.',
    true, '#F59E0B', 0.00, 3, 1, 3,
    false, 0.00,
    false, false, 0,
    'NONE', 0.00, 'ALL', true,
    NOW(), NOW(), 0, false
),
-- 8. Loss of Pay (LOP) — unlimited, deducted from salary
(
    gen_random_uuid(),
    '660e8400-e29b-41d4-a716-446655440001',
    'LOP', 'Loss of Pay',
    'Unpaid leave when all other leave balances are exhausted. Deducted from salary.',
    false, '#EF4444', 365.00, 30, 1, 30,
    false, 0.00,
    false, false, 0,
    'NONE', 0.00, 'ALL', true,
    NOW(), NOW(), 0, false
)
ON CONFLICT (tenant_id, leave_code) WHERE deleted_at IS NULL DO NOTHING;
