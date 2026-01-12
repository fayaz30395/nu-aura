--liquibase formatted sql

--changeset hrms:050-01
--comment: Create pulse_surveys table
CREATE TABLE pulse_surveys (
    id UUID PRIMARY KEY,
    tenant_id UUID NOT NULL,
    title VARCHAR(200) NOT NULL,
    description TEXT,
    status VARCHAR(20) NOT NULL DEFAULT 'DRAFT',
    survey_type VARCHAR(30) NOT NULL DEFAULT 'ENGAGEMENT',
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    is_anonymous BOOLEAN DEFAULT TRUE,
    is_mandatory BOOLEAN DEFAULT FALSE,
    frequency VARCHAR(20),
    next_occurrence_date DATE,
    target_departments TEXT,
    target_locations TEXT,
    reminder_enabled BOOLEAN DEFAULT TRUE,
    reminder_days_before INTEGER DEFAULT 2,
    total_questions INTEGER DEFAULT 0,
    total_responses INTEGER DEFAULT 0,
    total_invited INTEGER DEFAULT 0,
    average_score DECIMAL(5,2),
    published_at TIMESTAMP,
    published_by UUID,
    closed_at TIMESTAMP,
    closed_by UUID,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by UUID,
    last_modified_by UUID,
    version BIGINT DEFAULT 0,
    CONSTRAINT fk_pulse_survey_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id)
);

CREATE INDEX idx_pulse_survey_tenant ON pulse_surveys(tenant_id);
CREATE INDEX idx_pulse_survey_status ON pulse_surveys(tenant_id, status);
CREATE INDEX idx_pulse_survey_dates ON pulse_surveys(tenant_id, start_date, end_date);

--changeset hrms:050-02
--comment: Create pulse_survey_questions table
CREATE TABLE pulse_survey_questions (
    id UUID PRIMARY KEY,
    tenant_id UUID NOT NULL,
    survey_id UUID NOT NULL,
    question_text TEXT NOT NULL,
    question_type VARCHAR(30) NOT NULL,
    question_order INTEGER NOT NULL,
    is_required BOOLEAN DEFAULT TRUE,
    options TEXT,
    min_value INTEGER,
    max_value INTEGER,
    min_label VARCHAR(100),
    max_label VARCHAR(100),
    category VARCHAR(30),
    help_text VARCHAR(500),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by UUID,
    last_modified_by UUID,
    version BIGINT DEFAULT 0,
    CONSTRAINT fk_psq_survey FOREIGN KEY (survey_id) REFERENCES pulse_surveys(id) ON DELETE CASCADE,
    CONSTRAINT fk_psq_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id)
);

CREATE INDEX idx_psq_survey ON pulse_survey_questions(survey_id);
CREATE INDEX idx_psq_order ON pulse_survey_questions(survey_id, question_order);

--changeset hrms:050-03
--comment: Create pulse_survey_responses table
CREATE TABLE pulse_survey_responses (
    id UUID PRIMARY KEY,
    tenant_id UUID NOT NULL,
    survey_id UUID NOT NULL,
    employee_id UUID,
    status VARCHAR(20) NOT NULL DEFAULT 'IN_PROGRESS',
    started_at TIMESTAMP,
    submitted_at TIMESTAMP,
    time_spent_seconds INTEGER,
    overall_score DECIMAL(5,2),
    device_type VARCHAR(30),
    browser VARCHAR(100),
    ip_address VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by UUID,
    last_modified_by UUID,
    version BIGINT DEFAULT 0,
    CONSTRAINT fk_psr_survey FOREIGN KEY (survey_id) REFERENCES pulse_surveys(id) ON DELETE CASCADE,
    CONSTRAINT fk_psr_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id),
    CONSTRAINT uk_psr_survey_employee UNIQUE (survey_id, employee_id)
);

CREATE INDEX idx_psr_survey ON pulse_survey_responses(survey_id);
CREATE INDEX idx_psr_employee ON pulse_survey_responses(employee_id);
CREATE INDEX idx_psr_survey_employee ON pulse_survey_responses(survey_id, employee_id);

--changeset hrms:050-04
--comment: Create pulse_survey_answers table
CREATE TABLE pulse_survey_answers (
    id UUID PRIMARY KEY,
    tenant_id UUID NOT NULL,
    survey_id UUID NOT NULL,
    response_id UUID NOT NULL,
    question_id UUID NOT NULL,
    numeric_value INTEGER,
    text_value TEXT,
    selected_options TEXT,
    boolean_value BOOLEAN,
    is_skipped BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by UUID,
    last_modified_by UUID,
    version BIGINT DEFAULT 0,
    CONSTRAINT fk_psa_survey FOREIGN KEY (survey_id) REFERENCES pulse_surveys(id) ON DELETE CASCADE,
    CONSTRAINT fk_psa_response FOREIGN KEY (response_id) REFERENCES pulse_survey_responses(id) ON DELETE CASCADE,
    CONSTRAINT fk_psa_question FOREIGN KEY (question_id) REFERENCES pulse_survey_questions(id) ON DELETE CASCADE,
    CONSTRAINT fk_psa_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id)
);

CREATE INDEX idx_psa_response ON pulse_survey_answers(response_id);
CREATE INDEX idx_psa_question ON pulse_survey_answers(question_id);
CREATE INDEX idx_psa_survey_question ON pulse_survey_answers(survey_id, question_id);

--changeset hrms:050-05
--comment: Add survey permissions
INSERT INTO permissions (id, code, name, description, resource, action, created_at, updated_at, version)
SELECT
    gen_random_uuid(),
    'SURVEY_VIEW',
    'View Surveys',
    'View pulse surveys and results',
    'SURVEY',
    'VIEW',
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP,
    0
WHERE NOT EXISTS (SELECT 1 FROM permissions WHERE code = 'SURVEY_VIEW');

INSERT INTO permissions (id, code, name, description, resource, action, created_at, updated_at, version)
SELECT
    gen_random_uuid(),
    'SURVEY_MANAGE',
    'Manage Surveys',
    'Create and manage pulse surveys',
    'SURVEY',
    'MANAGE',
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP,
    0
WHERE NOT EXISTS (SELECT 1 FROM permissions WHERE code = 'SURVEY_MANAGE');
