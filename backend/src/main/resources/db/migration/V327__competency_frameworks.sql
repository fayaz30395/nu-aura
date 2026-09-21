-- V327: competency_frameworks/competency_requirements tables, replacing the
-- hardcoded required-skills-per-role map that used to live in
-- SkillGapAnalysisService. Seeds the same data the hardcoded map had, per
-- tenant, so skill-gap analysis behavior is unchanged after the cutover.

CREATE TABLE IF NOT EXISTS competency_frameworks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID,
    updated_by UUID,
    version BIGINT DEFAULT 0,
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
    name VARCHAR(200) NOT NULL,
    description TEXT,
    role_family VARCHAR(50) NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE INDEX IF NOT EXISTS idx_competency_framework_tenant ON competency_frameworks(tenant_id);
CREATE INDEX IF NOT EXISTS idx_competency_framework_role_family ON competency_frameworks(tenant_id, role_family);

CREATE TABLE IF NOT EXISTS competency_requirements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID,
    updated_by UUID,
    version BIGINT DEFAULT 0,
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
    framework_id UUID NOT NULL REFERENCES competency_frameworks(id),
    skill_name VARCHAR(200) NOT NULL,
    required_level INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_competency_requirement_tenant ON competency_requirements(tenant_id);
CREATE INDEX IF NOT EXISTS idx_competency_requirement_framework ON competency_requirements(framework_id);

-- Seed one framework per role family, per tenant, with the same skills/levels
-- the hardcoded map used to return.
DO $$
DECLARE
    tt RECORD;
    fw_id UUID;
BEGIN
    FOR tt IN SELECT id FROM tenants LOOP
        -- ENGINEER
        fw_id := gen_random_uuid();
        INSERT INTO competency_frameworks (id, tenant_id, name, description, role_family, is_active)
        VALUES (fw_id, tt.id, 'Engineering', 'Required skills for engineering/developer roles', 'ENGINEER', true);
        INSERT INTO competency_requirements (id, tenant_id, framework_id, skill_name, required_level) VALUES
            (gen_random_uuid(), tt.id, fw_id, 'System Design', 4),
            (gen_random_uuid(), tt.id, fw_id, 'Java', 4),
            (gen_random_uuid(), tt.id, fw_id, 'Cloud Architecture', 3),
            (gen_random_uuid(), tt.id, fw_id, 'Database Design', 3),
            (gen_random_uuid(), tt.id, fw_id, 'API Development', 4);

        -- MANAGER
        fw_id := gen_random_uuid();
        INSERT INTO competency_frameworks (id, tenant_id, name, description, role_family, is_active)
        VALUES (fw_id, tt.id, 'People Management', 'Required skills for manager roles', 'MANAGER', true);
        INSERT INTO competency_requirements (id, tenant_id, framework_id, skill_name, required_level) VALUES
            (gen_random_uuid(), tt.id, fw_id, 'Leadership', 4),
            (gen_random_uuid(), tt.id, fw_id, 'Communication', 5),
            (gen_random_uuid(), tt.id, fw_id, 'Strategic Planning', 4),
            (gen_random_uuid(), tt.id, fw_id, 'Team Management', 4);

        -- PRODUCT
        fw_id := gen_random_uuid();
        INSERT INTO competency_frameworks (id, tenant_id, name, description, role_family, is_active)
        VALUES (fw_id, tt.id, 'Product', 'Required skills for product roles', 'PRODUCT', true);
        INSERT INTO competency_requirements (id, tenant_id, framework_id, skill_name, required_level) VALUES
            (gen_random_uuid(), tt.id, fw_id, 'Product Strategy', 4),
            (gen_random_uuid(), tt.id, fw_id, 'User Research', 3),
            (gen_random_uuid(), tt.id, fw_id, 'Data Analysis', 3),
            (gen_random_uuid(), tt.id, fw_id, 'Stakeholder Management', 4);

        -- DEFAULT (fallback for every other role)
        fw_id := gen_random_uuid();
        INSERT INTO competency_frameworks (id, tenant_id, name, description, role_family, is_active)
        VALUES (fw_id, tt.id, 'General', 'Fallback skills for roles without a dedicated framework', 'DEFAULT', true);
        INSERT INTO competency_requirements (id, tenant_id, framework_id, skill_name, required_level) VALUES
            (gen_random_uuid(), tt.id, fw_id, 'Communication', 3),
            (gen_random_uuid(), tt.id, fw_id, 'Collaboration', 3),
            (gen_random_uuid(), tt.id, fw_id, 'Problem Solving', 3);
    END LOOP;
END $$;
