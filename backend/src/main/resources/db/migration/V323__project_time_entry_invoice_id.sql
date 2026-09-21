-- US-2FZ92MJAG93G: timesheet-to-invoice pipeline
ALTER TABLE project_time_entries
    ADD COLUMN IF NOT EXISTS invoice_id UUID;

CREATE INDEX IF NOT EXISTS idx_project_time_entries_invoice_id ON project_time_entries (invoice_id);
