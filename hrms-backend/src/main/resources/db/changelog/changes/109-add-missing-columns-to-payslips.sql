-- Add missing columns to payslips table
ALTER TABLE public.payslips
    ADD COLUMN IF NOT EXISTS conveyance_allowance DECIMAL(12,2),
    ADD COLUMN IF NOT EXISTS medical_allowance DECIMAL(12,2),
    ADD COLUMN IF NOT EXISTS special_allowance DECIMAL(12,2),
    ADD COLUMN IF NOT EXISTS other_allowances DECIMAL(12,2),
    ADD COLUMN IF NOT EXISTS provident_fund DECIMAL(12,2),
    ADD COLUMN IF NOT EXISTS professional_tax DECIMAL(12,2),
    ADD COLUMN IF NOT EXISTS income_tax DECIMAL(12,2),
    ADD COLUMN IF NOT EXISTS other_deductions DECIMAL(12,2),
    ADD COLUMN IF NOT EXISTS working_days INTEGER,
    ADD COLUMN IF NOT EXISTS present_days INTEGER,
    ADD COLUMN IF NOT EXISTS leave_days INTEGER,
    ADD COLUMN IF NOT EXISTS pdf_file_id UUID,
    ADD COLUMN IF NOT EXISTS created_by VARCHAR(255),
    ADD COLUMN IF NOT EXISTS updated_by VARCHAR(255);
