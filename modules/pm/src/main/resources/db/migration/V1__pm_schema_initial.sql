-- ============================================================
-- PM Module - Initial Schema (Flyway V1)
-- Converted from Liquibase changesets 000-005
-- ============================================================

-- 000: Create schema
CREATE SCHEMA IF NOT EXISTS pm;

-- 001: Projects table
CREATE TABLE IF NOT EXISTS pm.projects (
    id                  UUID PRIMARY KEY NOT NULL,
    tenant_id           UUID NOT NULL,
    project_code        VARCHAR(50) NOT NULL,
    name                VARCHAR(200) NOT NULL,
    description         TEXT,
    status              VARCHAR(20) NOT NULL DEFAULT 'PLANNING',
    priority            VARCHAR(20) NOT NULL DEFAULT 'MEDIUM',
    owner_id            UUID,
    owner_name          VARCHAR(200),
    start_date          DATE,
    end_date            DATE,
    target_end_date     DATE,
    client_name         VARCHAR(200),
    budget              DECIMAL(15,2),
    currency            VARCHAR(3) DEFAULT 'USD',
    progress_percentage INTEGER DEFAULT 0,
    color               VARCHAR(20),
    tags                VARCHAR(500),
    is_archived         BOOLEAN DEFAULT FALSE,
    created_at          TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at          TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by          UUID,
    last_modified_by    UUID,
    version             BIGINT DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_pm_project_tenant        ON pm.projects (tenant_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_pm_project_code_tenant ON pm.projects (project_code, tenant_id);
CREATE INDEX IF NOT EXISTS idx_pm_project_status        ON pm.projects (status);
CREATE INDEX IF NOT EXISTS idx_pm_project_owner         ON pm.projects (owner_id);

-- 002: Tasks table
CREATE TABLE IF NOT EXISTS pm.project_tasks (
    id                  UUID PRIMARY KEY NOT NULL,
    tenant_id           UUID NOT NULL,
    task_code           VARCHAR(50) NOT NULL,
    project_id          UUID NOT NULL,
    title               VARCHAR(500) NOT NULL,
    description         TEXT,
    status              VARCHAR(20) NOT NULL DEFAULT 'TODO',
    priority            VARCHAR(20) NOT NULL DEFAULT 'MEDIUM',
    type                VARCHAR(20) DEFAULT 'TASK',
    assignee_id         UUID,
    assignee_name       VARCHAR(200),
    reporter_id         UUID,
    reporter_name       VARCHAR(200),
    parent_task_id      UUID,
    milestone_id        UUID,
    start_date          DATE,
    due_date            DATE,
    completed_date      DATE,
    estimated_hours     INTEGER,
    actual_hours        INTEGER,
    progress_percentage INTEGER DEFAULT 0,
    story_points        INTEGER DEFAULT 0,
    sprint_name         VARCHAR(100),
    sort_order          INTEGER DEFAULT 0,
    tags                VARCHAR(500),
    color               VARCHAR(20),
    created_at          TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at          TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by          UUID,
    last_modified_by    UUID,
    version             BIGINT DEFAULT 0,
    CONSTRAINT fk_pm_task_project FOREIGN KEY (project_id)    REFERENCES pm.projects(id) ON DELETE CASCADE,
    CONSTRAINT fk_pm_task_parent  FOREIGN KEY (parent_task_id) REFERENCES pm.project_tasks(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_pm_task_tenant           ON pm.project_tasks (tenant_id);
CREATE INDEX IF NOT EXISTS idx_pm_task_project          ON pm.project_tasks (project_id);
CREATE INDEX IF NOT EXISTS idx_pm_task_assignee         ON pm.project_tasks (assignee_id);
CREATE INDEX IF NOT EXISTS idx_pm_task_parent           ON pm.project_tasks (parent_task_id);
CREATE INDEX IF NOT EXISTS idx_pm_task_status           ON pm.project_tasks (status);
CREATE INDEX IF NOT EXISTS idx_pm_task_milestone        ON pm.project_tasks (milestone_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_pm_task_code_tenant ON pm.project_tasks (task_code, tenant_id);

-- 003: Milestones table
CREATE TABLE IF NOT EXISTS pm.project_milestones (
    id                  UUID PRIMARY KEY NOT NULL,
    tenant_id           UUID NOT NULL,
    project_id          UUID NOT NULL,
    name                VARCHAR(200) NOT NULL,
    description         TEXT,
    status              VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    start_date          DATE,
    due_date            DATE,
    completed_date      DATE,
    progress_percentage INTEGER DEFAULT 0,
    owner_id            UUID,
    owner_name          VARCHAR(200),
    sort_order          INTEGER DEFAULT 0,
    color               VARCHAR(20),
    created_at          TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at          TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by          UUID,
    last_modified_by    UUID,
    version             BIGINT DEFAULT 0,
    CONSTRAINT fk_pm_milestone_project FOREIGN KEY (project_id) REFERENCES pm.projects(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_pm_milestone_tenant      ON pm.project_milestones (tenant_id);
CREATE INDEX IF NOT EXISTS idx_pm_milestone_project     ON pm.project_milestones (project_id);
CREATE INDEX IF NOT EXISTS idx_pm_milestone_status      ON pm.project_milestones (status);
CREATE INDEX IF NOT EXISTS idx_pm_milestone_due_date    ON pm.project_milestones (due_date);

-- Wire task→milestone FK (milestone table now exists)
ALTER TABLE pm.project_tasks
    ADD CONSTRAINT fk_pm_task_milestone
    FOREIGN KEY (milestone_id) REFERENCES pm.project_milestones(id) ON DELETE SET NULL;

-- 004: Members table
CREATE TABLE IF NOT EXISTS pm.project_members (
    id                  UUID PRIMARY KEY NOT NULL,
    tenant_id           UUID NOT NULL,
    project_id          UUID NOT NULL,
    user_id             UUID NOT NULL,
    user_name           VARCHAR(200),
    email               VARCHAR(200),
    role                VARCHAR(30) NOT NULL DEFAULT 'MEMBER',
    joined_date         DATE,
    left_date           DATE,
    is_active           BOOLEAN DEFAULT TRUE,
    hours_per_week      INTEGER,
    department          VARCHAR(100),
    designation         VARCHAR(100),
    created_at          TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at          TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by          UUID,
    last_modified_by    UUID,
    version             BIGINT DEFAULT 0,
    CONSTRAINT fk_pm_member_project FOREIGN KEY (project_id) REFERENCES pm.projects(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_pm_member_tenant         ON pm.project_members (tenant_id);
CREATE INDEX IF NOT EXISTS idx_pm_member_project        ON pm.project_members (project_id);
CREATE INDEX IF NOT EXISTS idx_pm_member_user           ON pm.project_members (user_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_pm_member_project_user ON pm.project_members (project_id, user_id);

-- 005: Comments table
CREATE TABLE IF NOT EXISTS pm.project_comments (
    id                  UUID PRIMARY KEY NOT NULL,
    tenant_id           UUID NOT NULL,
    project_id          UUID NOT NULL,
    task_id             UUID,
    milestone_id        UUID,
    author_id           UUID,
    author_name         VARCHAR(200),
    content             TEXT NOT NULL,
    parent_comment_id   UUID,
    type                VARCHAR(20) DEFAULT 'COMMENT',
    is_edited           BOOLEAN DEFAULT FALSE,
    is_deleted          BOOLEAN DEFAULT FALSE,
    mentions            VARCHAR(500),
    attachments         VARCHAR(500),
    created_at          TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at          TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by          UUID,
    last_modified_by    UUID,
    version             BIGINT DEFAULT 0,
    CONSTRAINT fk_pm_comment_project   FOREIGN KEY (project_id)        REFERENCES pm.projects(id)          ON DELETE CASCADE,
    CONSTRAINT fk_pm_comment_task      FOREIGN KEY (task_id)           REFERENCES pm.project_tasks(id)     ON DELETE CASCADE,
    CONSTRAINT fk_pm_comment_milestone FOREIGN KEY (milestone_id)      REFERENCES pm.project_milestones(id) ON DELETE CASCADE,
    CONSTRAINT fk_pm_comment_parent    FOREIGN KEY (parent_comment_id) REFERENCES pm.project_comments(id)  ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_pm_comment_tenant    ON pm.project_comments (tenant_id);
CREATE INDEX IF NOT EXISTS idx_pm_comment_project   ON pm.project_comments (project_id);
CREATE INDEX IF NOT EXISTS idx_pm_comment_task      ON pm.project_comments (task_id);
CREATE INDEX IF NOT EXISTS idx_pm_comment_author    ON pm.project_comments (author_id);
CREATE INDEX IF NOT EXISTS idx_pm_comment_parent    ON pm.project_comments (parent_comment_id);
