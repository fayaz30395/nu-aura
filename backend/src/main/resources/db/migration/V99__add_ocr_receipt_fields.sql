-- V99: Add OCR receipt scanning fields to expense module
-- Supports GAP-002: OCR Receipt Scanning for expenses

-- Add OCR metadata fields to expense_items
ALTER TABLE expense_items
    ADD COLUMN IF NOT EXISTS ocr_raw_text TEXT,
    ADD COLUMN IF NOT EXISTS ocr_confidence DECIMAL(5, 4),
    ADD COLUMN IF NOT EXISTS ocr_processed_at TIMESTAMP;

-- Add receipt scan status to expense_claims
ALTER TABLE expense_claims
    ADD COLUMN IF NOT EXISTS receipt_scan_status VARCHAR(20);

-- Index for filtering claims by scan status
CREATE INDEX IF NOT EXISTS idx_expense_claim_scan_status
    ON expense_claims (receipt_scan_status)
    WHERE receipt_scan_status IS NOT NULL;
