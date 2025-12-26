-- Add audit columns to allocation_requests table
ALTER TABLE public.allocation_requests
    ADD COLUMN IF NOT EXISTS created_by VARCHAR(255),
    ADD COLUMN IF NOT EXISTS updated_by VARCHAR(255);
