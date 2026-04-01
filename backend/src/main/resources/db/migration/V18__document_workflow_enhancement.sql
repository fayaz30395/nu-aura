-- Document Workflow Enhancement Schema
-- V18 migration: Document versions, approvals, access control, categories, tags, and expiry tracking

-- Alter documents table to add workflow columns (assuming documents table already exists)
-- First, add new columns
ALTER TABLE documents
ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'DRAFT',
ADD COLUMN IF NOT EXISTS category_id UUID,
ADD COLUMN IF NOT EXISTS expiry_date DATE,
ADD COLUMN IF NOT EXISTS version_number INTEGER DEFAULT 1;

-- Document Versions
CREATE TABLE IF NOT EXISTS document_versions (
    id UUID PRIMARY KEY,
    tenant_id UUID NOT NULL,
    document_id UUID NOT NULL,
    version_number INTEGER NOT NULL,
    file_path VARCHAR(500),
    file_size BIGINT,
    file_name VARCHAR(255),
    mime_type VARCHAR(100),
    uploaded_by UUID NOT NULL,
    change_notes TEXT,
    metadata JSONB,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(document_id, version_number),
    FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE
);

CREATE INDEX idx_document_version_tenant ON document_versions(tenant_id);
CREATE INDEX idx_document_version_document ON document_versions(document_id);
CREATE INDEX idx_document_version_uploaded_by ON document_versions(uploaded_by);

-- Document Approvals Workflow
CREATE TABLE IF NOT EXISTS document_approval_workflows (
    id UUID PRIMARY KEY,
    tenant_id UUID NOT NULL,
    document_id UUID NOT NULL,
    workflow_def_id UUID,
    status VARCHAR(50) NOT NULL DEFAULT 'PENDING', -- PENDING, IN_PROGRESS, APPROVED, REJECTED
    requested_by UUID NOT NULL,
    current_approver_id UUID,
    approval_level INTEGER DEFAULT 1,
    total_approval_levels INTEGER DEFAULT 1,
    rejection_reason TEXT,
    initiated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by UUID,
    updated_by UUID,
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
    FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE
);

CREATE INDEX idx_document_approval_workflow_tenant ON document_approval_workflows(tenant_id);
CREATE INDEX idx_document_approval_workflow_document ON document_approval_workflows(document_id);
CREATE INDEX idx_document_approval_workflow_status ON document_approval_workflows(tenant_id, status);
CREATE INDEX idx_document_approval_workflow_approver ON document_approval_workflows(current_approver_id);

-- Document Approval Tasks
CREATE TABLE IF NOT EXISTS document_approval_tasks (
    id UUID PRIMARY KEY,
    tenant_id UUID NOT NULL,
    workflow_id UUID NOT NULL,
    approver_id UUID NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'PENDING', -- PENDING, APPROVED, REJECTED, DELEGATED
    approval_level INTEGER NOT NULL,
    comments TEXT,
    approved_at TIMESTAMP,
    delegated_to UUID,
    metadata JSONB,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by UUID,
    updated_by UUID,
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
    FOREIGN KEY (workflow_id) REFERENCES document_approval_workflows(id) ON DELETE CASCADE,
    FOREIGN KEY (approver_id) REFERENCES users(id) ON DELETE RESTRICT
);

CREATE INDEX idx_document_approval_task_tenant ON document_approval_tasks(tenant_id);
CREATE INDEX idx_document_approval_task_workflow ON document_approval_tasks(workflow_id);
CREATE INDEX idx_document_approval_task_approver ON document_approval_tasks(approver_id);
CREATE INDEX idx_document_approval_task_status ON document_approval_tasks(tenant_id, status);

-- Document Categories
CREATE TABLE IF NOT EXISTS document_categories (
    id UUID PRIMARY KEY,
    tenant_id UUID NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    parent_id UUID,
    icon VARCHAR(100),
    display_order INTEGER DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by UUID,
    updated_by UUID,
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
    UNIQUE(tenant_id, name),
    FOREIGN KEY (parent_id) REFERENCES document_categories(id) ON DELETE SET NULL
);

CREATE INDEX idx_document_category_tenant ON document_categories(tenant_id);
CREATE INDEX idx_document_category_parent ON document_categories(parent_id);
CREATE INDEX idx_document_category_active ON document_categories(tenant_id, is_active);

-- Document Tags
CREATE TABLE IF NOT EXISTS document_tags (
    id UUID PRIMARY KEY,
    tenant_id UUID NOT NULL,
    document_id UUID NOT NULL,
    tag_name VARCHAR(100) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE,
    UNIQUE(document_id, tag_name)
);

CREATE INDEX idx_document_tag_tenant ON document_tags(tenant_id);
CREATE INDEX idx_document_tag_document ON document_tags(document_id);
CREATE INDEX idx_document_tag_name ON document_tags(tenant_id, tag_name);

-- Document Access Control
CREATE TABLE IF NOT EXISTS document_access (
    id UUID PRIMARY KEY,
    tenant_id UUID NOT NULL,
    document_id UUID NOT NULL,
    user_id UUID,
    role_id UUID,
    department_id UUID,
    access_level VARCHAR(50) NOT NULL, -- VIEW, EDIT, MANAGE, APPROVE
    granted_by UUID NOT NULL,
    granted_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    metadata JSONB,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
    FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE
);

CREATE INDEX idx_document_access_tenant ON document_access(tenant_id);
CREATE INDEX idx_document_access_document ON document_access(document_id);
CREATE INDEX idx_document_access_user ON document_access(user_id);
CREATE INDEX idx_document_access_role ON document_access(role_id);
CREATE INDEX idx_document_access_department ON document_access(department_id);
CREATE INDEX idx_document_access_level ON document_access(tenant_id, access_level);

-- Document Expiry Tracking
CREATE TABLE IF NOT EXISTS document_expiry_tracking (
    id UUID PRIMARY KEY,
    tenant_id UUID NOT NULL,
    document_id UUID NOT NULL,
    expiry_date DATE NOT NULL,
    reminder_days_before INTEGER DEFAULT 30,
    is_notified BOOLEAN NOT NULL DEFAULT FALSE,
    notified_at TIMESTAMP,
    expiry_notification_sent BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
    FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE,
    UNIQUE(document_id)
);

CREATE INDEX idx_document_expiry_tenant ON document_expiry_tracking(tenant_id);
CREATE INDEX idx_document_expiry_document ON document_expiry_tracking(document_id);
CREATE INDEX idx_document_expiry_date ON document_expiry_tracking(tenant_id, expiry_date);
CREATE INDEX idx_document_expiry_notified ON document_expiry_tracking(tenant_id, is_notified);

-- Add foreign key for category if documents table exists
ALTER TABLE documents
ADD CONSTRAINT fk_documents_category
FOREIGN KEY (category_id) REFERENCES document_categories(id) ON DELETE SET NULL;

-- Create indexes on documents table if they don't exist
CREATE INDEX IF NOT EXISTS idx_document_tenant ON documents(tenant_id);
CREATE INDEX IF NOT EXISTS idx_document_status ON documents(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_document_category ON documents(category_id);
CREATE INDEX IF NOT EXISTS idx_document_expiry ON documents(expiry_date);
