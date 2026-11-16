-- Encrypted (EncryptedStringConverter) IFSC/PAN values are ~53+ chars and overflowed varchar(50).
-- Forward-only widening; no data change.
ALTER TABLE employees ALTER COLUMN bank_ifsc_code TYPE VARCHAR(255);
ALTER TABLE employees ALTER COLUMN tax_id TYPE VARCHAR(255);
