-- Add created_by and updated_by columns to leave_requests table
ALTER TABLE public.leave_requests
    ADD COLUMN IF NOT EXISTS created_by VARCHAR(255),
    ADD COLUMN IF NOT EXISTS updated_by VARCHAR(255);

-- Add created_by and updated_by columns to leave_balances table
ALTER TABLE public.leave_balances
    ADD COLUMN IF NOT EXISTS created_by VARCHAR(255),
    ADD COLUMN IF NOT EXISTS updated_by VARCHAR(255);
