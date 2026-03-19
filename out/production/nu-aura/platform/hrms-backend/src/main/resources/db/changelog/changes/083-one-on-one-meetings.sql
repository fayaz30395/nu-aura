--liquibase formatted sql

--changeset hrms:051-01
--comment: Create one_on_one_meetings table
CREATE TABLE IF NOT EXISTS one_on_one_meetings (
    id UUID PRIMARY KEY,
    tenant_id UUID NOT NULL,
    manager_id UUID NOT NULL,
    employee_id UUID NOT NULL,
    title VARCHAR(200) NOT NULL,
    description TEXT,
    meeting_date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME,
    duration_minutes INTEGER DEFAULT 30,
    status VARCHAR(20) NOT NULL DEFAULT 'SCHEDULED',
    meeting_type VARCHAR(30) DEFAULT 'REGULAR',
    location VARCHAR(200),
    meeting_link VARCHAR(500),
    is_recurring BOOLEAN DEFAULT FALSE,
    recurrence_pattern VARCHAR(20),
    recurrence_end_date DATE,
    parent_meeting_id UUID,
    manager_notes TEXT,
    shared_notes TEXT,
    employee_notes TEXT,
    meeting_summary TEXT,
    reminder_sent BOOLEAN DEFAULT FALSE,
    reminder_minutes_before INTEGER DEFAULT 15,
    actual_start_time TIMESTAMP,
    actual_end_time TIMESTAMP,
    cancelled_at TIMESTAMP,
    cancelled_by UUID,
    cancellation_reason VARCHAR(500),
    rescheduled_from UUID,
    employee_rating INTEGER,
    employee_feedback TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by UUID,
    last_modified_by UUID,
    version BIGINT DEFAULT 0,
    CONSTRAINT fk_meeting_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id),
    CONSTRAINT fk_meeting_parent FOREIGN KEY (parent_meeting_id) REFERENCES one_on_one_meetings(id),
    CONSTRAINT fk_meeting_rescheduled FOREIGN KEY (rescheduled_from) REFERENCES one_on_one_meetings(id)
);

CREATE INDEX IF NOT EXISTS idx_meeting_tenant ON one_on_one_meetings(tenant_id);
CREATE INDEX IF NOT EXISTS idx_meeting_manager ON one_on_one_meetings(manager_id);
CREATE INDEX IF NOT EXISTS idx_meeting_employee ON one_on_one_meetings(employee_id);
CREATE INDEX IF NOT EXISTS idx_meeting_date ON one_on_one_meetings(tenant_id, meeting_date);
CREATE INDEX IF NOT EXISTS idx_meeting_status ON one_on_one_meetings(tenant_id, status);

--changeset hrms:051-02
--comment: Create meeting_agenda_items table
CREATE TABLE meeting_agenda_items (
    id UUID PRIMARY KEY,
    tenant_id UUID NOT NULL,
    meeting_id UUID NOT NULL,
    title VARCHAR(300) NOT NULL,
    description TEXT,
    item_order INTEGER NOT NULL,
    added_by VARCHAR(20) NOT NULL,
    added_by_id UUID NOT NULL,
    is_discussed BOOLEAN DEFAULT FALSE,
    discussion_notes TEXT,
    duration_minutes INTEGER,
    priority VARCHAR(20) DEFAULT 'MEDIUM',
    category VARCHAR(30),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by UUID,
    last_modified_by UUID,
    version BIGINT DEFAULT 0,
    CONSTRAINT fk_agenda_meeting FOREIGN KEY (meeting_id) REFERENCES one_on_one_meetings(id) ON DELETE CASCADE,
    CONSTRAINT fk_agenda_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id)
);

CREATE INDEX idx_agenda_meeting ON meeting_agenda_items(meeting_id);
CREATE INDEX idx_agenda_order ON meeting_agenda_items(meeting_id, item_order);

--changeset hrms:051-03
--comment: Create meeting_action_items table
CREATE TABLE meeting_action_items (
    id UUID PRIMARY KEY,
    tenant_id UUID NOT NULL,
    meeting_id UUID NOT NULL,
    title VARCHAR(300) NOT NULL,
    description TEXT,
    assignee_id UUID NOT NULL,
    assignee_role VARCHAR(20),
    due_date DATE,
    status VARCHAR(20) NOT NULL DEFAULT 'OPEN',
    priority VARCHAR(20) DEFAULT 'MEDIUM',
    completed_at TIMESTAMP,
    completion_notes TEXT,
    is_carried_over BOOLEAN DEFAULT FALSE,
    carried_from_meeting_id UUID,
    reminder_sent BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by UUID,
    last_modified_by UUID,
    version BIGINT DEFAULT 0,
    CONSTRAINT fk_action_meeting FOREIGN KEY (meeting_id) REFERENCES one_on_one_meetings(id) ON DELETE CASCADE,
    CONSTRAINT fk_action_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id),
    CONSTRAINT fk_action_carried_from FOREIGN KEY (carried_from_meeting_id) REFERENCES one_on_one_meetings(id)
);

CREATE INDEX idx_action_meeting ON meeting_action_items(meeting_id);
CREATE INDEX idx_action_assignee ON meeting_action_items(assignee_id);
CREATE INDEX idx_action_status ON meeting_action_items(status);
CREATE INDEX idx_action_due_date ON meeting_action_items(due_date);

--changeset hrms:051-04
--comment: Add meeting permissions
INSERT INTO permissions (id, code, name, description, resource, action, created_at, updated_at, version)
SELECT
    gen_random_uuid(),
    'MEETING_VIEW',
    'View Meetings',
    'View 1-on-1 meetings',
    'MEETING',
    'VIEW',
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP,
    0
WHERE NOT EXISTS (SELECT 1 FROM permissions WHERE code = 'MEETING_VIEW');

INSERT INTO permissions (id, code, name, description, resource, action, created_at, updated_at, version)
SELECT
    gen_random_uuid(),
    'MEETING_CREATE',
    'Create Meetings',
    'Create and manage own 1-on-1 meetings',
    'MEETING',
    'CREATE',
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP,
    0
WHERE NOT EXISTS (SELECT 1 FROM permissions WHERE code = 'MEETING_CREATE');

INSERT INTO permissions (id, code, name, description, resource, action, created_at, updated_at, version)
SELECT
    gen_random_uuid(),
    'MEETING_MANAGE',
    'Manage Meetings',
    'Manage all 1-on-1 meetings as manager',
    'MEETING',
    'MANAGE',
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP,
    0
WHERE NOT EXISTS (SELECT 1 FROM permissions WHERE code = 'MEETING_MANAGE');
