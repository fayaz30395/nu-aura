-- V22: Add Google Meet integration fields to interviews table
-- Stores the auto-generated Google Meet link and Calendar event ID
-- so interviews can be linked to Google Calendar events with conferencing.

ALTER TABLE interviews
    ADD COLUMN IF NOT EXISTS google_meet_link VARCHAR(500),
    ADD COLUMN IF NOT EXISTS google_calendar_event_id VARCHAR(255);

COMMENT ON COLUMN interviews.google_meet_link IS 'Auto-generated Google Meet video link';
COMMENT ON COLUMN interviews.google_calendar_event_id IS 'Google Calendar event ID for sync/update/delete';
