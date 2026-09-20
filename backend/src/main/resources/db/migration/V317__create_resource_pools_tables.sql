-- =============================================================================
-- V317: Resource Pools persistence (UC-RESOURCE-006 / BUG-QA2-011)
-- Real tables backing ResourcePoolController, replacing the stub 501 responses.
-- Feature remains gated behind app.features.resource-pools (default false in
-- application.yml) until the operator flips it on.
-- =============================================================================

CREATE TABLE IF NOT EXISTS resource_pools
(
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id    UUID         NOT NULL,
    name         VARCHAR(200) NOT NULL,
    description  TEXT,
    pool_type    VARCHAR(20)  NOT NULL DEFAULT 'SHARED',
    is_active    BOOLEAN      NOT NULL DEFAULT TRUE,
    created_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    created_by   UUID,
    updated_by   UUID,
    version      BIGINT       DEFAULT 0,
    is_deleted   BOOLEAN      NOT NULL DEFAULT FALSE,
    deleted_at   TIMESTAMPTZ,
    CONSTRAINT chk_resource_pools_pool_type CHECK (pool_type IN ('SHARED', 'EXCLUSIVE'))
);

CREATE INDEX IF NOT EXISTS idx_resource_pools_tenant ON resource_pools (tenant_id);

ALTER TABLE resource_pools
    ENABLE ROW LEVEL SECURITY;
CREATE POLICY resource_pools_tenant_isolation ON resource_pools
    USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);
ALTER TABLE resource_pools
    FORCE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS resource_pool_members
(
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id      UUID        NOT NULL,
    pool_id        UUID        NOT NULL,
    employee_id    UUID        NOT NULL,
    joined_pool_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by     UUID,
    updated_by     UUID,
    version        BIGINT      DEFAULT 0,
    is_deleted     BOOLEAN     NOT NULL DEFAULT FALSE,
    deleted_at     TIMESTAMPTZ,
    CONSTRAINT uk_resource_pool_members_pool_employee UNIQUE (pool_id, employee_id),
    CONSTRAINT fk_resource_pool_members_pool FOREIGN KEY (pool_id) REFERENCES resource_pools (id) ON DELETE CASCADE,
    CONSTRAINT fk_resource_pool_members_employee FOREIGN KEY (employee_id) REFERENCES employees (id)
);

CREATE INDEX IF NOT EXISTS idx_resource_pool_members_tenant ON resource_pool_members (tenant_id);
CREATE INDEX IF NOT EXISTS idx_resource_pool_members_pool ON resource_pool_members (pool_id);

ALTER TABLE resource_pool_members
    ENABLE ROW LEVEL SECURITY;
CREATE POLICY resource_pool_members_tenant_isolation ON resource_pool_members
    USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);
ALTER TABLE resource_pool_members
    FORCE ROW LEVEL SECURITY;
