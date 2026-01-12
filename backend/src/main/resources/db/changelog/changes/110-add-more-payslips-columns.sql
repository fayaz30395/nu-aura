-- Add pay_date and hra columns that were missed
ALTER TABLE public.payslips
    ADD COLUMN IF NOT EXISTS pay_date DATE,
    ADD COLUMN IF NOT EXISTS hra DECIMAL(12,2);
