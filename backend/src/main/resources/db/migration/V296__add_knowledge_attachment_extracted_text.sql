-- W5-B: persist Tika-extracted text on knowledge attachment rows so it is
-- available for the Elasticsearch full-text search indexing pipeline.
-- Column is nullable — extraction is best-effort and may be empty for
-- binary formats that Tika cannot parse.
ALTER TABLE knowledge_attachments
    ADD COLUMN IF NOT EXISTS extracted_text TEXT;
