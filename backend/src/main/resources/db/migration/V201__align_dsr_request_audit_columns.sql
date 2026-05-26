-- Align dsr_requests with BaseEntity audit columns expected by Hibernate.

ALTER TABLE dsr_requests
  ADD COLUMN IF NOT EXISTS created_by UUID,
  ADD COLUMN IF NOT EXISTS updated_by UUID;
