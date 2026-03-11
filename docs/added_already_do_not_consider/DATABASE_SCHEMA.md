# Database Schema Documentation

## 1. Overview

### 1.1 Database Configuration

| Property | Value |
|----------|-------|
| Database | PostgreSQL 14+ |
| Hosting | Neon Cloud / Self-hosted |
| Migration Tool | Liquibase |
| Schema Strategy | Single schema with row-level tenant isolation |
| Primary Keys | UUID (V4) |

### 1.2 Naming Conventions

| Element | Convention | Example |
|---------|------------|---------|
| Tables | snake_case, plural | `employees`, `leave_requests` |
| Columns | snake_case | `first_name`, `created_at` |
| Primary Keys | `id` | `id UUID PRIMARY KEY` |
| Foreign Keys | `{table}_id` | `department_id`, `employee_id` |
| Indexes | `idx_{table}_{columns}` | `idx_employees_tenant_id` |
| Constraints | `{table}_{type}_{column}` | `employees_uk_email` |

### 1.3 Standard Columns

All tables include these audit columns:

```sql
id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
tenant_id       UUID NOT NULL REFERENCES tenants(id),
created_at      TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
updated_at      TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
created_by      UUID REFERENCES users(id),
updated_by      UUID REFERENCES users(id),
deleted_at      TIMESTAMP WITH TIME ZONE  -- Soft delete
```

---

## 2. Core Tables

### 2.1 Tenants

Multi-tenancy foundation table.

```sql
CREATE TABLE tenants (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name            VARCHAR(255) NOT NULL,
    domain          VARCHAR(255) UNIQUE,
    status          VARCHAR(20) DEFAULT 'ACTIVE',
    settings        JSONB DEFAULT '{}',
    logo_url        VARCHAR(500),
    created_at      TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX idx_tenants_domain ON tenants(domain);
CREATE INDEX idx_tenants_status ON tenants(status);
```

### 2.2 Users

Authentication and user accounts.

```sql
CREATE TABLE users (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id       UUID NOT NULL REFERENCES tenants(id),
    email           VARCHAR(255) NOT NULL,
    password_hash   VARCHAR(255),
    first_name      VARCHAR(100) NOT NULL,
    last_name       VARCHAR(100) NOT NULL,
    status          VARCHAR(20) DEFAULT 'ACTIVE',
    google_id       VARCHAR(255),
    last_login_at   TIMESTAMP WITH TIME ZONE,
    password_changed_at TIMESTAMP WITH TIME ZONE,
    failed_login_attempts INTEGER DEFAULT 0,
    locked_until    TIMESTAMP WITH TIME ZONE,
    created_at      TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT users_uk_tenant_email UNIQUE (tenant_id, email)
);

-- Indexes
CREATE INDEX idx_users_tenant_id ON users(tenant_id);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_google_id ON users(google_id);
CREATE INDEX idx_users_status ON users(status);
```

### 2.3 Roles

Role definitions.

```sql
CREATE TABLE roles (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id       UUID NOT NULL REFERENCES tenants(id),
    name            VARCHAR(100) NOT NULL,
    description     TEXT,
    is_system       BOOLEAN DEFAULT FALSE,
    is_default      BOOLEAN DEFAULT FALSE,
    created_at      TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT roles_uk_tenant_name UNIQUE (tenant_id, name)
);

-- Default roles: SUPER_ADMIN, HR_ADMIN, MANAGER, EMPLOYEE
```

### 2.4 Permissions

Permission definitions.

```sql
CREATE TABLE permissions (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code            VARCHAR(100) NOT NULL UNIQUE,
    name            VARCHAR(255) NOT NULL,
    module          VARCHAR(100) NOT NULL,
    action          VARCHAR(50) NOT NULL,
    description     TEXT,
    created_at      TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Example permissions:
-- EMPLOYEE_VIEW, EMPLOYEE_CREATE, EMPLOYEE_EDIT, EMPLOYEE_DELETE
-- LEAVE_VIEW, LEAVE_CREATE, LEAVE_APPROVE
-- PAYROLL_VIEW, PAYROLL_PROCESS
```

### 2.5 Role Permissions

Maps roles to permissions with scope.

```sql
CREATE TABLE role_permissions (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id       UUID NOT NULL REFERENCES tenants(id),
    role_id         UUID NOT NULL REFERENCES roles(id),
    permission_id   UUID NOT NULL REFERENCES permissions(id),
    scope           VARCHAR(50) DEFAULT 'OWN',
    scope_value     UUID,  -- Reference to department/location/team
    created_at      TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT role_permissions_uk UNIQUE (tenant_id, role_id, permission_id, scope, scope_value)
);

-- Scope values: GLOBAL, LOCATION, DEPARTMENT, TEAM, OWN
```

### 2.6 User Roles

Maps users to roles.

```sql
CREATE TABLE user_roles (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id       UUID NOT NULL REFERENCES tenants(id),
    user_id         UUID NOT NULL REFERENCES users(id),
    role_id         UUID NOT NULL REFERENCES roles(id),
    assigned_at     TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    assigned_by     UUID REFERENCES users(id),

    CONSTRAINT user_roles_uk UNIQUE (tenant_id, user_id, role_id)
);
```

---

## 3. Organization Structure

### 3.1 Departments

```sql
CREATE TABLE departments (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id       UUID NOT NULL REFERENCES tenants(id),
    name            VARCHAR(255) NOT NULL,
    code            VARCHAR(50),
    description     TEXT,
    parent_id       UUID REFERENCES departments(id),
    head_id         UUID,  -- References employees(id)
    status          VARCHAR(20) DEFAULT 'ACTIVE',
    created_at      TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT departments_uk_tenant_code UNIQUE (tenant_id, code)
);

CREATE INDEX idx_departments_tenant ON departments(tenant_id);
CREATE INDEX idx_departments_parent ON departments(parent_id);
```

### 3.2 Designations

```sql
CREATE TABLE designations (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id       UUID NOT NULL REFERENCES tenants(id),
    name            VARCHAR(255) NOT NULL,
    code            VARCHAR(50),
    level           INTEGER,
    description     TEXT,
    status          VARCHAR(20) DEFAULT 'ACTIVE',
    created_at      TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT designations_uk_tenant_code UNIQUE (tenant_id, code)
);
```

### 3.3 Locations

```sql
CREATE TABLE locations (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id       UUID NOT NULL REFERENCES tenants(id),
    name            VARCHAR(255) NOT NULL,
    code            VARCHAR(50),
    address         TEXT,
    city            VARCHAR(100),
    state           VARCHAR(100),
    country         VARCHAR(100),
    postal_code     VARCHAR(20),
    latitude        DECIMAL(10, 8),
    longitude       DECIMAL(11, 8),
    geofence_radius INTEGER DEFAULT 100,  -- meters
    timezone        VARCHAR(50) DEFAULT 'UTC',
    status          VARCHAR(20) DEFAULT 'ACTIVE',
    created_at      TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT locations_uk_tenant_code UNIQUE (tenant_id, code)
);
```

### 3.4 Holidays

```sql
CREATE TABLE holidays (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id       UUID NOT NULL REFERENCES tenants(id),
    name            VARCHAR(255) NOT NULL,
    date            DATE NOT NULL,
    type            VARCHAR(50) DEFAULT 'PUBLIC',
    is_optional     BOOLEAN DEFAULT FALSE,
    location_id     UUID REFERENCES locations(id),
    created_at      TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT holidays_uk UNIQUE (tenant_id, date, location_id)
);

CREATE INDEX idx_holidays_date ON holidays(tenant_id, date);
```

---

## 4. Employee Management

### 4.1 Employees

```sql
CREATE TABLE employees (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id           UUID NOT NULL REFERENCES tenants(id),
    user_id             UUID REFERENCES users(id),
    employee_id         VARCHAR(50) NOT NULL,

    -- Personal Information
    first_name          VARCHAR(100) NOT NULL,
    last_name           VARCHAR(100) NOT NULL,
    email               VARCHAR(255) NOT NULL,
    personal_email      VARCHAR(255),
    phone               VARCHAR(20),
    date_of_birth       DATE,
    gender              VARCHAR(20),
    blood_group         VARCHAR(10),
    marital_status      VARCHAR(20),
    nationality         VARCHAR(100),

    -- Address
    address_line1       VARCHAR(255),
    address_line2       VARCHAR(255),
    city                VARCHAR(100),
    state               VARCHAR(100),
    country             VARCHAR(100),
    postal_code         VARCHAR(20),

    -- Emergency Contact
    emergency_contact_name  VARCHAR(255),
    emergency_contact_phone VARCHAR(20),
    emergency_contact_relation VARCHAR(50),

    -- Employment
    department_id       UUID REFERENCES departments(id),
    designation_id      UUID REFERENCES designations(id),
    manager_id          UUID REFERENCES employees(id),
    location_id         UUID REFERENCES locations(id),
    joining_date        DATE NOT NULL,
    confirmation_date   DATE,
    probation_end_date  DATE,
    employment_type     VARCHAR(50) DEFAULT 'FULL_TIME',
    employment_status   VARCHAR(50) DEFAULT 'ACTIVE',

    -- Bank Details (encrypted)
    bank_name           VARCHAR(255),
    bank_account_number VARCHAR(255),
    bank_ifsc_code      VARCHAR(20),

    -- Identity
    pan_number          VARCHAR(20),
    aadhaar_number      VARCHAR(20),
    passport_number     VARCHAR(50),

    -- Profile
    avatar_url          VARCHAR(500),
    bio                 TEXT,
    skills              TEXT[],

    -- Metadata
    created_at          TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at          TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    deleted_at          TIMESTAMP WITH TIME ZONE,

    CONSTRAINT employees_uk_tenant_empid UNIQUE (tenant_id, employee_id),
    CONSTRAINT employees_uk_tenant_email UNIQUE (tenant_id, email)
);

-- Indexes
CREATE INDEX idx_employees_tenant ON employees(tenant_id);
CREATE INDEX idx_employees_department ON employees(tenant_id, department_id);
CREATE INDEX idx_employees_manager ON employees(manager_id);
CREATE INDEX idx_employees_status ON employees(tenant_id, employment_status);
CREATE INDEX idx_employees_name ON employees(tenant_id, first_name, last_name);
CREATE INDEX idx_employees_search ON employees USING gin(
    to_tsvector('english', first_name || ' ' || last_name || ' ' || email)
);
```

### 4.2 Employee Documents

```sql
CREATE TABLE employee_documents (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id       UUID NOT NULL REFERENCES tenants(id),
    employee_id     UUID NOT NULL REFERENCES employees(id),
    document_type   VARCHAR(50) NOT NULL,
    name            VARCHAR(255) NOT NULL,
    file_url        VARCHAR(500) NOT NULL,
    file_size       BIGINT,
    mime_type       VARCHAR(100),
    expiry_date     DATE,
    verified        BOOLEAN DEFAULT FALSE,
    verified_by     UUID REFERENCES users(id),
    verified_at     TIMESTAMP WITH TIME ZONE,
    created_at      TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT employee_documents_uk UNIQUE (tenant_id, employee_id, document_type, name)
);

-- Document types: ID_PROOF, ADDRESS_PROOF, EDUCATION, EXPERIENCE, OFFER_LETTER, etc.
```

---

## 5. Attendance

### 5.1 Shifts

```sql
CREATE TABLE shifts (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id       UUID NOT NULL REFERENCES tenants(id),
    name            VARCHAR(100) NOT NULL,
    code            VARCHAR(20),
    start_time      TIME NOT NULL,
    end_time        TIME NOT NULL,
    grace_period    INTEGER DEFAULT 15,  -- minutes
    half_day_hours  DECIMAL(4,2) DEFAULT 4,
    full_day_hours  DECIMAL(4,2) DEFAULT 8,
    break_duration  INTEGER DEFAULT 60,  -- minutes
    is_night_shift  BOOLEAN DEFAULT FALSE,
    is_flexible     BOOLEAN DEFAULT FALSE,
    core_start_time TIME,  -- For flexible shifts
    core_end_time   TIME,
    status          VARCHAR(20) DEFAULT 'ACTIVE',
    created_at      TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT shifts_uk_tenant_code UNIQUE (tenant_id, code)
);
```

### 5.2 Shift Assignments

```sql
CREATE TABLE shift_assignments (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id       UUID NOT NULL REFERENCES tenants(id),
    employee_id     UUID NOT NULL REFERENCES employees(id),
    shift_id        UUID NOT NULL REFERENCES shifts(id),
    effective_from  DATE NOT NULL,
    effective_to    DATE,
    created_at      TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_shift_assignments ON shift_assignments(tenant_id, employee_id, effective_from);
```

### 5.3 Attendance Records

```sql
CREATE TABLE attendance_records (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id       UUID NOT NULL REFERENCES tenants(id),
    employee_id     UUID NOT NULL REFERENCES employees(id),
    date            DATE NOT NULL,

    -- Check-in details
    check_in_time   TIMESTAMP WITH TIME ZONE,
    check_in_source VARCHAR(20),  -- WEB, MOBILE, BIOMETRIC, IP
    check_in_latitude  DECIMAL(10, 8),
    check_in_longitude DECIMAL(11, 8),
    check_in_location_id UUID REFERENCES locations(id),

    -- Check-out details
    check_out_time  TIMESTAMP WITH TIME ZONE,
    check_out_source VARCHAR(20),
    check_out_latitude DECIMAL(10, 8),
    check_out_longitude DECIMAL(11, 8),
    check_out_location_id UUID REFERENCES locations(id),

    -- Calculations
    total_hours     DECIMAL(5,2),
    break_hours     DECIMAL(5,2),
    overtime_hours  DECIMAL(5,2),

    -- Status
    status          VARCHAR(20) DEFAULT 'PRESENT',
    late_arrival    BOOLEAN DEFAULT FALSE,
    early_departure BOOLEAN DEFAULT FALSE,

    -- Regularization
    is_regularized  BOOLEAN DEFAULT FALSE,
    regularized_by  UUID REFERENCES users(id),
    regularization_reason TEXT,

    remarks         TEXT,
    created_at      TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT attendance_records_uk UNIQUE (tenant_id, employee_id, date)
);

-- Status values: PRESENT, ABSENT, HALF_DAY, ON_LEAVE, HOLIDAY, WEEKEND, WFH
CREATE INDEX idx_attendance_date ON attendance_records(tenant_id, date);
CREATE INDEX idx_attendance_employee ON attendance_records(tenant_id, employee_id, date);
CREATE INDEX idx_attendance_status ON attendance_records(tenant_id, date, status);
```

### 5.4 Attendance Regularization Requests

```sql
CREATE TABLE attendance_regularizations (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id       UUID NOT NULL REFERENCES tenants(id),
    employee_id     UUID NOT NULL REFERENCES employees(id),
    attendance_id   UUID REFERENCES attendance_records(id),
    date            DATE NOT NULL,
    type            VARCHAR(50) NOT NULL,  -- MISSED_CHECKIN, MISSED_CHECKOUT, TIME_CORRECTION

    original_check_in  TIMESTAMP WITH TIME ZONE,
    original_check_out TIMESTAMP WITH TIME ZONE,
    requested_check_in TIMESTAMP WITH TIME ZONE,
    requested_check_out TIMESTAMP WITH TIME ZONE,

    reason          TEXT NOT NULL,
    status          VARCHAR(20) DEFAULT 'PENDING',

    approved_by     UUID REFERENCES users(id),
    approved_at     TIMESTAMP WITH TIME ZONE,
    approver_comments TEXT,

    created_at      TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

---

## 6. Leave Management

### 6.1 Leave Types

```sql
CREATE TABLE leave_types (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id           UUID NOT NULL REFERENCES tenants(id),
    name                VARCHAR(100) NOT NULL,
    code                VARCHAR(20) NOT NULL,
    description         TEXT,

    -- Allocation
    default_balance     DECIMAL(5,2) DEFAULT 0,
    max_balance         DECIMAL(5,2),
    accrual_type        VARCHAR(20) DEFAULT 'ANNUAL',  -- ANNUAL, MONTHLY, NONE
    accrual_rate        DECIMAL(5,2),

    -- Carry-over
    carry_over_allowed  BOOLEAN DEFAULT FALSE,
    carry_over_limit    DECIMAL(5,2),
    carry_over_expiry_months INTEGER,

    -- Encashment
    encashable          BOOLEAN DEFAULT FALSE,
    encashment_rate     DECIMAL(5,2),

    -- Restrictions
    min_days            DECIMAL(3,1) DEFAULT 0.5,
    max_days            DECIMAL(5,2),
    max_consecutive_days DECIMAL(5,2),
    advance_notice_days INTEGER DEFAULT 0,

    -- Document requirements
    requires_document   BOOLEAN DEFAULT FALSE,
    document_threshold_days INTEGER DEFAULT 3,

    -- Applicability
    applicable_gender   VARCHAR(20),  -- NULL = all, MALE, FEMALE
    requires_approval   BOOLEAN DEFAULT TRUE,

    status              VARCHAR(20) DEFAULT 'ACTIVE',
    created_at          TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at          TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT leave_types_uk UNIQUE (tenant_id, code)
);
```

### 6.2 Leave Policies

```sql
CREATE TABLE leave_policies (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id       UUID NOT NULL REFERENCES tenants(id),
    name            VARCHAR(255) NOT NULL,
    description     TEXT,

    -- Scope
    department_id   UUID REFERENCES departments(id),
    location_id     UUID REFERENCES locations(id),
    employment_type VARCHAR(50),

    -- Rules as JSON
    rules           JSONB DEFAULT '{}',

    effective_from  DATE NOT NULL,
    effective_to    DATE,
    status          VARCHAR(20) DEFAULT 'ACTIVE',
    created_at      TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

### 6.3 Leave Balances

```sql
CREATE TABLE leave_balances (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id       UUID NOT NULL REFERENCES tenants(id),
    employee_id     UUID NOT NULL REFERENCES employees(id),
    leave_type_id   UUID NOT NULL REFERENCES leave_types(id),
    year            INTEGER NOT NULL,

    opening_balance DECIMAL(5,2) DEFAULT 0,
    accrued         DECIMAL(5,2) DEFAULT 0,
    used            DECIMAL(5,2) DEFAULT 0,
    adjusted        DECIMAL(5,2) DEFAULT 0,
    encashed        DECIMAL(5,2) DEFAULT 0,
    lapsed          DECIMAL(5,2) DEFAULT 0,

    -- Calculated: opening + accrued - used + adjusted - encashed - lapsed
    available       DECIMAL(5,2) GENERATED ALWAYS AS (
        opening_balance + accrued - used + adjusted - encashed - lapsed
    ) STORED,

    created_at      TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT leave_balances_uk UNIQUE (tenant_id, employee_id, leave_type_id, year)
);

CREATE INDEX idx_leave_balances ON leave_balances(tenant_id, employee_id, year);
```

### 6.4 Leave Requests

```sql
CREATE TABLE leave_requests (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id       UUID NOT NULL REFERENCES tenants(id),
    employee_id     UUID NOT NULL REFERENCES employees(id),
    leave_type_id   UUID NOT NULL REFERENCES leave_types(id),

    start_date      DATE NOT NULL,
    end_date        DATE NOT NULL,
    start_day_type  VARCHAR(20) DEFAULT 'FULL_DAY',  -- FULL_DAY, FIRST_HALF, SECOND_HALF
    end_day_type    VARCHAR(20) DEFAULT 'FULL_DAY',
    total_days      DECIMAL(5,2) NOT NULL,

    reason          TEXT,
    contact_number  VARCHAR(20),
    handover_to     UUID REFERENCES employees(id),

    status          VARCHAR(20) DEFAULT 'PENDING',

    -- Approval chain
    current_approver_id UUID REFERENCES employees(id),
    approval_level  INTEGER DEFAULT 1,

    -- Documents
    document_url    VARCHAR(500),

    created_at      TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Status: PENDING, APPROVED, REJECTED, CANCELLED, WITHDRAWN
CREATE INDEX idx_leave_requests_employee ON leave_requests(tenant_id, employee_id);
CREATE INDEX idx_leave_requests_date ON leave_requests(tenant_id, start_date, end_date);
CREATE INDEX idx_leave_requests_status ON leave_requests(tenant_id, status);
CREATE INDEX idx_leave_requests_approver ON leave_requests(current_approver_id, status);
```

### 6.5 Leave Approvals

```sql
CREATE TABLE leave_approvals (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id       UUID NOT NULL REFERENCES tenants(id),
    leave_request_id UUID NOT NULL REFERENCES leave_requests(id),
    approver_id     UUID NOT NULL REFERENCES employees(id),
    level           INTEGER NOT NULL,
    status          VARCHAR(20) NOT NULL,  -- PENDING, APPROVED, REJECTED
    comments        TEXT,
    acted_at        TIMESTAMP WITH TIME ZONE,
    created_at      TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

---

## 7. Payroll

### 7.1 Salary Structures

```sql
CREATE TABLE salary_structures (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id       UUID NOT NULL REFERENCES tenants(id),
    employee_id     UUID NOT NULL REFERENCES employees(id),

    effective_from  DATE NOT NULL,
    effective_to    DATE,

    gross_salary    DECIMAL(12,2) NOT NULL,
    basic_salary    DECIMAL(12,2) NOT NULL,
    hra             DECIMAL(12,2) DEFAULT 0,
    special_allowance DECIMAL(12,2) DEFAULT 0,
    conveyance      DECIMAL(12,2) DEFAULT 0,
    medical         DECIMAL(12,2) DEFAULT 0,
    other_allowances DECIMAL(12,2) DEFAULT 0,

    pf_contribution DECIMAL(12,2) DEFAULT 0,
    esi_contribution DECIMAL(12,2) DEFAULT 0,

    ctc             DECIMAL(12,2),

    is_current      BOOLEAN DEFAULT TRUE,
    created_at      TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_salary_structures ON salary_structures(tenant_id, employee_id, is_current);
```

### 7.2 Payroll Runs

```sql
CREATE TABLE payroll_runs (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id       UUID NOT NULL REFERENCES tenants(id),

    month           INTEGER NOT NULL,
    year            INTEGER NOT NULL,

    run_type        VARCHAR(20) DEFAULT 'REGULAR',  -- REGULAR, SUPPLEMENTARY, ARREARS
    status          VARCHAR(20) DEFAULT 'DRAFT',

    total_employees INTEGER DEFAULT 0,
    total_gross     DECIMAL(15,2) DEFAULT 0,
    total_deductions DECIMAL(15,2) DEFAULT 0,
    total_net       DECIMAL(15,2) DEFAULT 0,

    processed_by    UUID REFERENCES users(id),
    processed_at    TIMESTAMP WITH TIME ZONE,
    approved_by     UUID REFERENCES users(id),
    approved_at     TIMESTAMP WITH TIME ZONE,

    created_at      TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT payroll_runs_uk UNIQUE (tenant_id, month, year, run_type)
);

-- Status: DRAFT, PROCESSING, PENDING_APPROVAL, APPROVED, PAID
```

### 7.3 Payslips

```sql
CREATE TABLE payslips (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id       UUID NOT NULL REFERENCES tenants(id),
    payroll_run_id  UUID NOT NULL REFERENCES payroll_runs(id),
    employee_id     UUID NOT NULL REFERENCES employees(id),

    month           INTEGER NOT NULL,
    year            INTEGER NOT NULL,

    -- Days
    working_days    INTEGER,
    days_worked     DECIMAL(5,2),
    lop_days        DECIMAL(5,2) DEFAULT 0,

    -- Earnings
    basic_salary    DECIMAL(12,2),
    hra             DECIMAL(12,2),
    special_allowance DECIMAL(12,2),
    conveyance      DECIMAL(12,2),
    medical         DECIMAL(12,2),
    other_earnings  DECIMAL(12,2) DEFAULT 0,
    overtime_pay    DECIMAL(12,2) DEFAULT 0,
    bonus           DECIMAL(12,2) DEFAULT 0,
    gross_earnings  DECIMAL(12,2),

    -- Deductions
    pf_employee     DECIMAL(12,2),
    pf_employer     DECIMAL(12,2),
    esi_employee    DECIMAL(12,2),
    esi_employer    DECIMAL(12,2),
    professional_tax DECIMAL(12,2),
    tds             DECIMAL(12,2),
    loan_recovery   DECIMAL(12,2) DEFAULT 0,
    other_deductions DECIMAL(12,2) DEFAULT 0,
    total_deductions DECIMAL(12,2),

    -- Net
    net_pay         DECIMAL(12,2),

    -- YTD
    ytd_gross       DECIMAL(15,2),
    ytd_pf          DECIMAL(15,2),
    ytd_tds         DECIMAL(15,2),

    status          VARCHAR(20) DEFAULT 'GENERATED',
    paid_on         DATE,

    created_at      TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT payslips_uk UNIQUE (tenant_id, employee_id, month, year)
);

CREATE INDEX idx_payslips_employee ON payslips(tenant_id, employee_id);
CREATE INDEX idx_payslips_period ON payslips(tenant_id, year, month);
```

---

## 8. Project Management

### 8.1 Projects

```sql
CREATE TABLE projects (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id       UUID NOT NULL REFERENCES tenants(id),

    name            VARCHAR(255) NOT NULL,
    code            VARCHAR(50),
    description     TEXT,

    client_name     VARCHAR(255),
    client_id       UUID,  -- References clients table if exists

    project_manager_id UUID REFERENCES employees(id),

    type            VARCHAR(50) DEFAULT 'CLIENT',  -- CLIENT, INTERNAL, SUPPORT
    status          VARCHAR(50) DEFAULT 'ACTIVE',
    priority        VARCHAR(20) DEFAULT 'MEDIUM',

    start_date      DATE,
    end_date        DATE,
    actual_end_date DATE,

    budget          DECIMAL(15,2),
    spent           DECIMAL(15,2) DEFAULT 0,

    is_billable     BOOLEAN DEFAULT TRUE,
    billing_type    VARCHAR(50),  -- FIXED, TIME_MATERIAL, RETAINER
    billing_rate    DECIMAL(10,2),

    progress        INTEGER DEFAULT 0,  -- 0-100

    settings        JSONB DEFAULT '{}',

    created_at      TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT projects_uk_code UNIQUE (tenant_id, code)
);

-- Status: PLANNING, ACTIVE, ON_HOLD, COMPLETED, CANCELLED
CREATE INDEX idx_projects_tenant ON projects(tenant_id);
CREATE INDEX idx_projects_status ON projects(tenant_id, status);
CREATE INDEX idx_projects_manager ON projects(project_manager_id);
```

### 8.2 Project Members

```sql
CREATE TABLE project_members (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id       UUID NOT NULL REFERENCES tenants(id),
    project_id      UUID NOT NULL REFERENCES projects(id),
    employee_id     UUID NOT NULL REFERENCES employees(id),

    role            VARCHAR(50) DEFAULT 'MEMBER',  -- MANAGER, LEAD, MEMBER
    allocation      INTEGER DEFAULT 100,  -- percentage

    start_date      DATE,
    end_date        DATE,

    is_billable     BOOLEAN DEFAULT TRUE,
    billing_rate    DECIMAL(10,2),

    created_at      TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT project_members_uk UNIQUE (tenant_id, project_id, employee_id)
);

CREATE INDEX idx_project_members ON project_members(project_id);
CREATE INDEX idx_project_members_employee ON project_members(employee_id);
```

### 8.3 Tasks

```sql
CREATE TABLE tasks (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id       UUID NOT NULL REFERENCES tenants(id),
    project_id      UUID NOT NULL REFERENCES projects(id),
    parent_task_id  UUID REFERENCES tasks(id),

    title           VARCHAR(255) NOT NULL,
    description     TEXT,

    assignee_id     UUID REFERENCES employees(id),
    reporter_id     UUID REFERENCES employees(id),

    status          VARCHAR(50) DEFAULT 'TODO',
    priority        VARCHAR(20) DEFAULT 'MEDIUM',

    start_date      DATE,
    due_date        DATE,
    completed_at    TIMESTAMP WITH TIME ZONE,

    estimated_hours DECIMAL(6,2),
    logged_hours    DECIMAL(6,2) DEFAULT 0,

    sort_order      INTEGER DEFAULT 0,

    tags            TEXT[],

    created_at      TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Status: TODO, IN_PROGRESS, REVIEW, BLOCKED, DONE
-- Priority: LOW, MEDIUM, HIGH, CRITICAL
CREATE INDEX idx_tasks_project ON tasks(project_id);
CREATE INDEX idx_tasks_assignee ON tasks(assignee_id);
CREATE INDEX idx_tasks_status ON tasks(tenant_id, status);
CREATE INDEX idx_tasks_parent ON tasks(parent_task_id);
```

### 8.4 Time Logs

```sql
CREATE TABLE time_logs (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id       UUID NOT NULL REFERENCES tenants(id),
    project_id      UUID NOT NULL REFERENCES projects(id),
    task_id         UUID REFERENCES tasks(id),
    employee_id     UUID NOT NULL REFERENCES employees(id),

    date            DATE NOT NULL,
    hours           DECIMAL(5,2) NOT NULL,
    description     TEXT,

    is_billable     BOOLEAN DEFAULT TRUE,
    billing_rate    DECIMAL(10,2),

    status          VARCHAR(20) DEFAULT 'PENDING',  -- PENDING, APPROVED, REJECTED
    approved_by     UUID REFERENCES employees(id),
    approved_at     TIMESTAMP WITH TIME ZONE,

    created_at      TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_time_logs_project ON time_logs(project_id);
CREATE INDEX idx_time_logs_employee ON time_logs(employee_id, date);
CREATE INDEX idx_time_logs_date ON time_logs(tenant_id, date);
```

---

## 9. Additional Tables

### 9.1 Benefits

```sql
CREATE TABLE benefit_plans (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id       UUID NOT NULL REFERENCES tenants(id),
    name            VARCHAR(255) NOT NULL,
    type            VARCHAR(50) NOT NULL,  -- HEALTH, LIFE, DENTAL, VISION, RETIREMENT
    coverage_type   VARCHAR(50),  -- INDIVIDUAL, FAMILY
    provider        VARCHAR(255),
    monthly_premium DECIMAL(10,2),
    employer_contribution DECIMAL(10,2),
    employee_contribution DECIMAL(10,2),
    description     TEXT,
    features        JSONB,
    status          VARCHAR(20) DEFAULT 'ACTIVE',
    created_at      TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE benefit_enrollments (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id       UUID NOT NULL REFERENCES tenants(id),
    employee_id     UUID NOT NULL REFERENCES employees(id),
    plan_id         UUID NOT NULL REFERENCES benefit_plans(id),
    status          VARCHAR(20) DEFAULT 'ACTIVE',
    start_date      DATE NOT NULL,
    end_date        DATE,
    dependents      JSONB,
    created_at      TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

### 9.2 Training

```sql
CREATE TABLE courses (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id       UUID NOT NULL REFERENCES tenants(id),
    title           VARCHAR(255) NOT NULL,
    description     TEXT,
    type            VARCHAR(50),  -- ONLINE, INSTRUCTOR_LED, BLENDED
    duration_hours  INTEGER,
    content         JSONB,
    status          VARCHAR(20) DEFAULT 'ACTIVE',
    created_at      TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE course_enrollments (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id       UUID NOT NULL REFERENCES tenants(id),
    course_id       UUID NOT NULL REFERENCES courses(id),
    employee_id     UUID NOT NULL REFERENCES employees(id),
    status          VARCHAR(20) DEFAULT 'ENROLLED',
    progress        INTEGER DEFAULT 0,
    enrolled_at     TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    completed_at    TIMESTAMP WITH TIME ZONE,
    certificate_url VARCHAR(500)
);
```

### 9.3 Expenses

```sql
CREATE TABLE expense_claims (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id       UUID NOT NULL REFERENCES tenants(id),
    employee_id     UUID NOT NULL REFERENCES employees(id),

    claim_number    VARCHAR(50),
    title           VARCHAR(255),
    description     TEXT,

    total_amount    DECIMAL(12,2) NOT NULL,
    currency        VARCHAR(3) DEFAULT 'INR',

    status          VARCHAR(20) DEFAULT 'DRAFT',

    project_id      UUID REFERENCES projects(id),

    submitted_at    TIMESTAMP WITH TIME ZONE,
    approved_by     UUID REFERENCES employees(id),
    approved_at     TIMESTAMP WITH TIME ZONE,

    created_at      TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE expense_items (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id       UUID NOT NULL REFERENCES tenants(id),
    claim_id        UUID NOT NULL REFERENCES expense_claims(id),

    category        VARCHAR(50) NOT NULL,
    description     VARCHAR(255),
    date            DATE NOT NULL,
    amount          DECIMAL(12,2) NOT NULL,

    receipt_url     VARCHAR(500),

    created_at      TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

### 9.4 Assets

```sql
CREATE TABLE assets (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id       UUID NOT NULL REFERENCES tenants(id),

    asset_tag       VARCHAR(50) NOT NULL,
    name            VARCHAR(255) NOT NULL,
    description     TEXT,

    category        VARCHAR(50),  -- LAPTOP, MONITOR, PHONE, FURNITURE
    brand           VARCHAR(100),
    model           VARCHAR(100),
    serial_number   VARCHAR(100),

    purchase_date   DATE,
    purchase_cost   DECIMAL(12,2),
    vendor          VARCHAR(255),

    warranty_expiry DATE,

    current_value   DECIMAL(12,2),
    depreciation_rate DECIMAL(5,2),

    status          VARCHAR(20) DEFAULT 'AVAILABLE',
    condition       VARCHAR(20) DEFAULT 'GOOD',

    assigned_to     UUID REFERENCES employees(id),
    assigned_at     DATE,

    location_id     UUID REFERENCES locations(id),

    created_at      TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT assets_uk_tag UNIQUE (tenant_id, asset_tag)
);

-- Status: AVAILABLE, ASSIGNED, MAINTENANCE, RETIRED, LOST
```

### 9.5 Audit Logs

```sql
CREATE TABLE audit_logs (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id       UUID NOT NULL,
    user_id         UUID,

    entity_type     VARCHAR(100) NOT NULL,
    entity_id       UUID NOT NULL,
    action          VARCHAR(50) NOT NULL,  -- CREATE, UPDATE, DELETE, VIEW

    old_values      JSONB,
    new_values      JSONB,

    ip_address      VARCHAR(50),
    user_agent      TEXT,

    created_at      TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_audit_logs_entity ON audit_logs(tenant_id, entity_type, entity_id);
CREATE INDEX idx_audit_logs_user ON audit_logs(tenant_id, user_id);
CREATE INDEX idx_audit_logs_date ON audit_logs(tenant_id, created_at);
```

---

## 10. Entity Relationship Diagram

```
┌─────────────┐       ┌─────────────┐       ┌─────────────┐
│   TENANTS   │───1:N─│    USERS    │───1:1─│  EMPLOYEES  │
└─────────────┘       └─────────────┘       └─────────────┘
                             │                     │
                            1:N                   1:N
                             │                     │
                      ┌──────┴──────┐       ┌─────┴─────┐
                      │ USER_ROLES  │       │ ATTENDANCE│
                      └─────────────┘       │  RECORDS  │
                             │              └───────────┘
                            N:1
                             │
                      ┌──────┴──────┐
                      │    ROLES    │───1:N─────┐
                      └─────────────┘           │
                                         ┌─────┴──────┐
                                         │    ROLE    │
                                         │ PERMISSIONS│
                                         └────────────┘

┌─────────────┐       ┌─────────────┐       ┌─────────────┐
│ DEPARTMENTS │───1:N─│  EMPLOYEES  │───N:1─│ DESIGNATIONS│
└─────────────┘       └─────────────┘       └─────────────┘
                             │
                            1:N
                             │
                    ┌────────┴────────┐
                    │ LEAVE_REQUESTS  │
                    └─────────────────┘
                             │
                            N:1
                             │
                    ┌────────┴────────┐
                    │  LEAVE_TYPES    │
                    └─────────────────┘

┌─────────────┐       ┌─────────────┐       ┌─────────────┐
│  PROJECTS   │───1:N─│   TASKS     │───N:1─│  EMPLOYEES  │
└─────────────┘       └─────────────┘       └─────────────┘
      │
     1:N
      │
┌─────┴─────┐
│TIME_LOGS  │
└───────────┘
```

---

*Document Version: 1.0*
*Last Updated: January 11, 2026*
