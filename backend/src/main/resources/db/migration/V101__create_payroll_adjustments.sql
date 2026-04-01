-- FIX-001/002/005: Payroll adjustments table for cross-module integration
-- Stores one-time earnings/deductions from overtime, expense, LOP leave, etc.

CREATE TABLE IF NOT EXISTS payroll_adjustments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    employee_id UUID NOT NULL,
    adjustment_type VARCHAR(30) NOT NULL,
    category VARCHAR(20) NOT NULL DEFAULT 'EARNING',
    amount DECIMAL(12, 2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'INR',
    description VARCHAR(500) NOT NULL,
    source_module VARCHAR(50) NOT NULL,
    source_id UUID,
    effective_date DATE NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    payroll_run_id UUID,
    processed_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    created_by UUID,
    last_modified_by UUID,
    version BIGINT DEFAULT 0,
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
    deleted_at TIMESTAMP
);

CREATE INDEX idx_pa_tenant_employee ON payroll_adjustments(tenant_id, employee_id);
CREATE INDEX idx_pa_tenant_status ON payroll_adjustments(tenant_id, status);
CREATE INDEX idx_pa_effective_date ON payroll_adjustments(effective_date);
CREATE INDEX idx_pa_source ON payroll_adjustments(source_module, source_id);
