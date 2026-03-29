-- =============================================================================
-- V82: Biometric Device Integration
-- Creates tables for biometric device management, punch logging, and API keys
-- =============================================================================

-- ─── Biometric Devices ──────────────────────────────────────────────────────

CREATE TABLE biometric_devices (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id       UUID NOT NULL,
    device_name     VARCHAR(200) NOT NULL,
    device_type     VARCHAR(30) NOT NULL CHECK (device_type IN ('FINGERPRINT', 'FACE', 'IRIS', 'CARD', 'MULTI_MODAL')),
    serial_number   VARCHAR(100) NOT NULL,
    location_id     UUID,
    location_name   VARCHAR(200),
    ip_address      VARCHAR(50),
    manufacturer    VARCHAR(100),
    model           VARCHAR(100),
    firmware_version VARCHAR(50),
    is_active       BOOLEAN NOT NULL DEFAULT TRUE,
    last_sync_at    TIMESTAMP,
    last_heartbeat_at TIMESTAMP,
    api_key_hash    VARCHAR(128),
    notes           TEXT,
    created_at      TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMP NOT NULL DEFAULT NOW(),
    created_by      UUID,
    last_modified_by UUID,
    version         BIGINT DEFAULT 0,
    is_deleted      BOOLEAN NOT NULL DEFAULT FALSE,
    deleted_at      TIMESTAMP
);

CREATE INDEX idx_biometric_device_tenant ON biometric_devices(tenant_id);
CREATE INDEX idx_biometric_device_serial ON biometric_devices(serial_number);
CREATE INDEX idx_biometric_device_active ON biometric_devices(tenant_id, is_active);
ALTER TABLE biometric_devices ADD CONSTRAINT uk_biometric_device_serial_tenant UNIQUE (serial_number, tenant_id);

-- ─── Biometric Punch Logs ───────────────────────────────────────────────────

CREATE TABLE biometric_punch_logs (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id           UUID NOT NULL,
    device_id           UUID,
    employee_id         UUID,
    employee_identifier VARCHAR(100),
    punch_time          TIMESTAMP NOT NULL,
    punch_type          VARCHAR(10) NOT NULL CHECK (punch_type IN ('IN', 'OUT')),
    raw_data            TEXT,
    processed_status    VARCHAR(20) NOT NULL DEFAULT 'PENDING' CHECK (processed_status IN ('PENDING', 'PROCESSED', 'FAILED', 'DUPLICATE')),
    error_message       TEXT,
    attendance_record_id UUID,
    processed_at        TIMESTAMP,
    created_at          TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMP NOT NULL DEFAULT NOW(),
    created_by          UUID,
    last_modified_by    UUID,
    version             BIGINT DEFAULT 0,
    is_deleted          BOOLEAN NOT NULL DEFAULT FALSE,
    deleted_at          TIMESTAMP
);

CREATE INDEX idx_punch_log_tenant ON biometric_punch_logs(tenant_id);
CREATE INDEX idx_punch_log_device ON biometric_punch_logs(device_id);
CREATE INDEX idx_punch_log_employee ON biometric_punch_logs(employee_id);
CREATE INDEX idx_punch_log_status ON biometric_punch_logs(processed_status);
CREATE INDEX idx_punch_log_punch_time ON biometric_punch_logs(punch_time);
CREATE INDEX idx_punch_log_dedup ON biometric_punch_logs(tenant_id, employee_id, punch_time);

-- Foreign keys
ALTER TABLE biometric_punch_logs ADD CONSTRAINT fk_punch_log_device
    FOREIGN KEY (device_id) REFERENCES biometric_devices(id);
ALTER TABLE biometric_punch_logs ADD CONSTRAINT fk_punch_log_attendance
    FOREIGN KEY (attendance_record_id) REFERENCES attendance_records(id);

-- ─── Biometric API Keys ────────────────────────────────────────────────────

CREATE TABLE biometric_api_keys (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id   UUID NOT NULL,
    key_name    VARCHAR(200) NOT NULL,
    key_hash    VARCHAR(128) NOT NULL,
    key_suffix  VARCHAR(8),
    device_id   UUID,
    is_active   BOOLEAN NOT NULL DEFAULT TRUE,
    expires_at  TIMESTAMP,
    last_used_at TIMESTAMP,
    created_at  TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMP NOT NULL DEFAULT NOW(),
    created_by  UUID,
    last_modified_by UUID,
    version     BIGINT DEFAULT 0,
    is_deleted  BOOLEAN NOT NULL DEFAULT FALSE,
    deleted_at  TIMESTAMP
);

CREATE INDEX idx_biometric_api_key_tenant ON biometric_api_keys(tenant_id);
CREATE INDEX idx_biometric_api_key_hash ON biometric_api_keys(key_hash);
CREATE INDEX idx_biometric_api_key_device ON biometric_api_keys(device_id);
ALTER TABLE biometric_api_keys ADD CONSTRAINT uk_biometric_api_key_hash UNIQUE (key_hash);

-- Foreign key to device (optional — key may be tenant-wide)
ALTER TABLE biometric_api_keys ADD CONSTRAINT fk_api_key_device
    FOREIGN KEY (device_id) REFERENCES biometric_devices(id);

-- ─── Row-Level Security ────────────────────────────────────────────────────

ALTER TABLE biometric_devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE biometric_punch_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE biometric_api_keys ENABLE ROW LEVEL SECURITY;

-- RLS policies for tenant isolation
CREATE POLICY biometric_devices_tenant_isolation ON biometric_devices
    USING (tenant_id = current_setting('app.current_tenant')::UUID);

CREATE POLICY biometric_punch_logs_tenant_isolation ON biometric_punch_logs
    USING (tenant_id = current_setting('app.current_tenant')::UUID);

CREATE POLICY biometric_api_keys_tenant_isolation ON biometric_api_keys
    USING (tenant_id = current_setting('app.current_tenant')::UUID);

-- ─── Seed Permissions ──────────────────────────────────────────────────────
-- The ATTENDANCE:MANAGE permission already exists and covers biometric device admin.
-- No new permissions needed — biometric admin uses ATTENDANCE:MANAGE.
