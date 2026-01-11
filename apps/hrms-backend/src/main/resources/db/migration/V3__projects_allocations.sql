CREATE TABLE project_code_sequences (
    org_id UUID PRIMARY KEY REFERENCES orgs(id),
    prefix VARCHAR(20) NOT NULL,
    next_value INTEGER NOT NULL
);

CREATE TABLE projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES orgs(id),
    project_code VARCHAR(30) NOT NULL,
    name VARCHAR(200) NOT NULL,
    type VARCHAR(20) NOT NULL,
    status VARCHAR(20) NOT NULL,
    owner_employee_id UUID NOT NULL REFERENCES employees(id),
    start_date DATE NOT NULL,
    end_date DATE,
    client_name VARCHAR(200),
    description TEXT,
    activated_at TIMESTAMPTZ,
    closed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (org_id, project_code),
    CONSTRAINT projects_type_check CHECK (type IN ('CLIENT', 'INTERNAL')),
    CONSTRAINT projects_status_check CHECK (status IN ('DRAFT', 'ACTIVE', 'CLOSED')),
    CONSTRAINT projects_client_name_check CHECK (type <> 'CLIENT' OR client_name IS NOT NULL),
    CONSTRAINT projects_dates_check CHECK (end_date IS NULL OR end_date >= start_date)
);

CREATE INDEX idx_projects_org_status ON projects (org_id, status);
CREATE INDEX idx_projects_org_owner ON projects (org_id, owner_employee_id);
CREATE INDEX idx_projects_org_type ON projects (org_id, type);

CREATE TABLE project_allocations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES orgs(id),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    employee_id UUID NOT NULL REFERENCES employees(id),
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    allocation_percent NUMERIC(5,2) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT project_allocations_percent_check CHECK (allocation_percent > 0 AND allocation_percent <= 100),
    CONSTRAINT project_allocations_dates_check CHECK (end_date >= start_date)
);

CREATE INDEX idx_project_allocations_org_project ON project_allocations (org_id, project_id);
CREATE INDEX idx_project_allocations_org_employee ON project_allocations (org_id, employee_id);
CREATE INDEX idx_project_allocations_employee_dates ON project_allocations (employee_id, start_date, end_date);
