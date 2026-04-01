-- V97: Asset Maintenance Requests
-- Tracks maintenance requests, schedules, costs, and resolution for assets.

CREATE TABLE IF NOT EXISTS asset_maintenance_requests (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id           UUID NOT NULL,
    asset_id            UUID NOT NULL,
    requested_by        UUID NOT NULL,
    maintenance_type    VARCHAR(30) NOT NULL,
    issue_description   TEXT NOT NULL,
    priority            VARCHAR(20) NOT NULL DEFAULT 'MEDIUM',
    status              VARCHAR(30) NOT NULL DEFAULT 'REQUESTED',
    assigned_vendor     VARCHAR(200),
    estimated_cost      NUMERIC(12, 2),
    actual_cost         NUMERIC(12, 2),
    scheduled_date      DATE,
    completed_date      DATE,
    resolution_notes    TEXT,
    approved_by         UUID,
    created_at          TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMP NOT NULL DEFAULT NOW(),
    created_by          UUID,
    last_modified_by    UUID,
    version             BIGINT DEFAULT 0,
    is_deleted          BOOLEAN DEFAULT FALSE,
    deleted_at          TIMESTAMP
);

-- Tenant scoping (primary filter for all queries)
CREATE INDEX IF NOT EXISTS idx_amr_tenant
    ON asset_maintenance_requests(tenant_id);

-- Lookup by asset
CREATE INDEX IF NOT EXISTS idx_amr_asset
    ON asset_maintenance_requests(asset_id);

-- Filter by status within a tenant
CREATE INDEX IF NOT EXISTS idx_amr_tenant_status
    ON asset_maintenance_requests(tenant_id, status);

-- Filter by priority within a tenant
CREATE INDEX IF NOT EXISTS idx_amr_tenant_priority
    ON asset_maintenance_requests(tenant_id, priority);

-- Requester lookup
CREATE INDEX IF NOT EXISTS idx_amr_requested_by
    ON asset_maintenance_requests(requested_by);
