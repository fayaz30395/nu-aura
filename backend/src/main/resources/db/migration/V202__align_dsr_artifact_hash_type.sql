-- Align dsr_requests.artifact_sha256 with the DsrRequest entity mapping.

ALTER TABLE dsr_requests
  ALTER COLUMN artifact_sha256 TYPE VARCHAR(64);
