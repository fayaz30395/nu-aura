# Database Schema Documentation

## Overview

NuLogic HRMS uses PostgreSQL 16 with 80+ tables organized by domain.

## Schema Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                         CORE TABLES                              │
├─────────────────────────────────────────────────────────────────┤
│  tenants ──────┬──> users ──────┬──> employees                  │
│                │                │                                │
│                │                └──> user_roles                  │
│                │                                                 │
│                ├──> departments ──> employees                    │
│                │                                                 │
│                └──> roles ──────┬──> role_permissions           │
│                                 └──> user_roles                  │
└─────────────────────────────────────────────────────────────────┘
```

## Core Tables

### tenants
```sql
CREATE TABLE tenants (
    id UUID PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    code VARCHAR(50) UNIQUE NOT NULL,
    domain VARCHAR(255),
    logo_url VARCHAR(500),
    settings JSONB,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### users
```sql
CREATE TABLE users (
    id UUID PRIMARY KEY,
    tenant_id UUID REFERENCES tenants(id),
    email VARCHAR(255) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    employee_id UUID REFERENCES employees(id),
    is_active BOOLEAN DEFAULT true,
    last_login TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(tenant_id, email)
);
```

### employees
```sql
CREATE TABLE employees (
    id UUID PRIMARY KEY,
    tenant_id UUID REFERENCES tenants(id),
    employee_code VARCHAR(50) NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    email VARCHAR(255) NOT NULL,
    phone VARCHAR(20),
    date_of_birth DATE,
    gender VARCHAR(20),

    -- Employment
    department_id UUID REFERENCES departments(id),
    designation VARCHAR(100),
    reporting_manager_id UUID REFERENCES employees(id),
    employment_type VARCHAR(50),
    hire_date DATE,
    probation_end_date DATE,
    confirmation_date DATE,

    -- Address
    address_line1 VARCHAR(255),
    address_line2 VARCHAR(255),
    city VARCHAR(100),
    state VARCHAR(100),
    country VARCHAR(100),
    postal_code VARCHAR(20),

    -- Banking
    bank_name VARCHAR(100),
    bank_account_number VARCHAR(50),
    ifsc_code VARCHAR(20),

    -- Tax
    pan_number VARCHAR(20),
    aadhar_number VARCHAR(20),

    -- Status
    status VARCHAR(20) DEFAULT 'ACTIVE',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    UNIQUE(tenant_id, employee_code),
    UNIQUE(tenant_id, email)
);
```

### departments
```sql
CREATE TABLE departments (
    id UUID PRIMARY KEY,
    tenant_id UUID REFERENCES tenants(id),
    name VARCHAR(100) NOT NULL,
    code VARCHAR(50) NOT NULL,
    description TEXT,
    parent_id UUID REFERENCES departments(id),
    head_id UUID REFERENCES employees(id),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(tenant_id, code)
);
```

## Attendance Tables

### attendance_records
```sql
CREATE TABLE attendance_records (
    id UUID PRIMARY KEY,
    tenant_id UUID REFERENCES tenants(id),
    employee_id UUID REFERENCES employees(id),
    attendance_date DATE NOT NULL,
    check_in_time TIMESTAMP,
    check_out_time TIMESTAMP,
    status VARCHAR(20),
    work_hours DECIMAL(5,2),
    overtime_hours DECIMAL(5,2),
    shift_id UUID REFERENCES shifts(id),
    location_id UUID REFERENCES office_locations(id),
    check_in_latitude DECIMAL(10,8),
    check_in_longitude DECIMAL(11,8),
    check_out_latitude DECIMAL(10,8),
    check_out_longitude DECIMAL(11,8),
    remarks TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(tenant_id, employee_id, attendance_date)
);
```

### shifts
```sql
CREATE TABLE shifts (
    id UUID PRIMARY KEY,
    tenant_id UUID REFERENCES tenants(id),
    name VARCHAR(100) NOT NULL,
    code VARCHAR(50) NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    break_duration_minutes INTEGER DEFAULT 0,
    is_night_shift BOOLEAN DEFAULT false,
    grace_period_minutes INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(tenant_id, code)
);
```

### office_locations
```sql
CREATE TABLE office_locations (
    id UUID PRIMARY KEY,
    tenant_id UUID REFERENCES tenants(id),
    name VARCHAR(100) NOT NULL,
    address TEXT,
    latitude DECIMAL(10,8) NOT NULL,
    longitude DECIMAL(11,8) NOT NULL,
    geofence_radius_meters INTEGER DEFAULT 100,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

## Leave Tables

### leave_types
```sql
CREATE TABLE leave_types (
    id UUID PRIMARY KEY,
    tenant_id UUID REFERENCES tenants(id),
    name VARCHAR(100) NOT NULL,
    code VARCHAR(50) NOT NULL,
    description TEXT,
    annual_quota INTEGER,
    carry_forward_limit INTEGER DEFAULT 0,
    is_paid BOOLEAN DEFAULT true,
    requires_approval BOOLEAN DEFAULT true,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(tenant_id, code)
);
```

### leave_requests
```sql
CREATE TABLE leave_requests (
    id UUID PRIMARY KEY,
    tenant_id UUID REFERENCES tenants(id),
    employee_id UUID REFERENCES employees(id),
    leave_type_id UUID REFERENCES leave_types(id),
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    days_count DECIMAL(4,1) NOT NULL,
    reason TEXT,
    status VARCHAR(20) DEFAULT 'PENDING',
    approved_by UUID REFERENCES employees(id),
    approved_at TIMESTAMP,
    rejection_reason TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### leave_balances
```sql
CREATE TABLE leave_balances (
    id UUID PRIMARY KEY,
    tenant_id UUID REFERENCES tenants(id),
    employee_id UUID REFERENCES employees(id),
    leave_type_id UUID REFERENCES leave_types(id),
    year INTEGER NOT NULL,
    opening_balance DECIMAL(5,1) DEFAULT 0,
    accrued DECIMAL(5,1) DEFAULT 0,
    used DECIMAL(5,1) DEFAULT 0,
    carry_forward DECIMAL(5,1) DEFAULT 0,
    current_balance DECIMAL(5,1) DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(tenant_id, employee_id, leave_type_id, year)
);
```

## Payroll Tables

### salary_structures
```sql
CREATE TABLE salary_structures (
    id UUID PRIMARY KEY,
    tenant_id UUID REFERENCES tenants(id),
    employee_id UUID REFERENCES employees(id),
    effective_date DATE NOT NULL,
    basic_salary DECIMAL(15,2) NOT NULL,
    hra DECIMAL(15,2) DEFAULT 0,
    conveyance DECIMAL(15,2) DEFAULT 0,
    medical DECIMAL(15,2) DEFAULT 0,
    special_allowance DECIMAL(15,2) DEFAULT 0,
    other_allowances DECIMAL(15,2) DEFAULT 0,
    gross_salary DECIMAL(15,2) NOT NULL,
    pf_employee DECIMAL(15,2) DEFAULT 0,
    pf_employer DECIMAL(15,2) DEFAULT 0,
    esi_employee DECIMAL(15,2) DEFAULT 0,
    esi_employer DECIMAL(15,2) DEFAULT 0,
    professional_tax DECIMAL(15,2) DEFAULT 0,
    tds DECIMAL(15,2) DEFAULT 0,
    other_deductions DECIMAL(15,2) DEFAULT 0,
    net_salary DECIMAL(15,2) NOT NULL,
    status VARCHAR(20) DEFAULT 'ACTIVE',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### payroll_runs
```sql
CREATE TABLE payroll_runs (
    id UUID PRIMARY KEY,
    tenant_id UUID REFERENCES tenants(id),
    pay_period_start DATE NOT NULL,
    pay_period_end DATE NOT NULL,
    run_date DATE NOT NULL,
    status VARCHAR(20) DEFAULT 'DRAFT',
    total_employees INTEGER DEFAULT 0,
    total_gross DECIMAL(18,2) DEFAULT 0,
    total_deductions DECIMAL(18,2) DEFAULT 0,
    total_net DECIMAL(18,2) DEFAULT 0,
    processed_by UUID REFERENCES users(id),
    processed_at TIMESTAMP,
    approved_by UUID REFERENCES users(id),
    approved_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### payslips
```sql
CREATE TABLE payslips (
    id UUID PRIMARY KEY,
    tenant_id UUID REFERENCES tenants(id),
    payroll_run_id UUID REFERENCES payroll_runs(id),
    employee_id UUID REFERENCES employees(id),
    pay_period_start DATE NOT NULL,
    pay_period_end DATE NOT NULL,
    working_days INTEGER,
    days_worked DECIMAL(4,1),
    earnings JSONB,
    deductions JSONB,
    gross_salary DECIMAL(15,2),
    total_deductions DECIMAL(15,2),
    net_salary DECIMAL(15,2),
    status VARCHAR(20) DEFAULT 'GENERATED',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

## Performance Tables

### goals
```sql
CREATE TABLE goals (
    id UUID PRIMARY KEY,
    tenant_id UUID REFERENCES tenants(id),
    employee_id UUID REFERENCES employees(id),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    category VARCHAR(50),
    start_date DATE,
    due_date DATE,
    weight DECIMAL(5,2) DEFAULT 100,
    progress DECIMAL(5,2) DEFAULT 0,
    status VARCHAR(20) DEFAULT 'NOT_STARTED',
    parent_goal_id UUID REFERENCES goals(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### performance_reviews
```sql
CREATE TABLE performance_reviews (
    id UUID PRIMARY KEY,
    tenant_id UUID REFERENCES tenants(id),
    employee_id UUID REFERENCES employees(id),
    reviewer_id UUID REFERENCES employees(id),
    review_cycle_id UUID REFERENCES review_cycles(id),
    review_period_start DATE,
    review_period_end DATE,
    self_rating DECIMAL(3,2),
    manager_rating DECIMAL(3,2),
    final_rating DECIMAL(3,2),
    status VARCHAR(20) DEFAULT 'PENDING',
    self_comments TEXT,
    manager_comments TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

## Announcements Tables

### announcements
```sql
CREATE TABLE announcements (
    id UUID PRIMARY KEY,
    tenant_id UUID REFERENCES tenants(id),
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    category VARCHAR(30) DEFAULT 'GENERAL',
    priority VARCHAR(20) DEFAULT 'MEDIUM',
    status VARCHAR(20) DEFAULT 'DRAFT',
    target_audience VARCHAR(30) DEFAULT 'ALL_EMPLOYEES',
    published_at TIMESTAMP,
    expires_at TIMESTAMP,
    is_pinned BOOLEAN DEFAULT false,
    send_email BOOLEAN DEFAULT false,
    requires_acceptance BOOLEAN DEFAULT false,
    read_count INTEGER DEFAULT 0,
    accepted_count INTEGER DEFAULT 0,
    published_by UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### announcement_reads
```sql
CREATE TABLE announcement_reads (
    id UUID PRIMARY KEY,
    tenant_id UUID REFERENCES tenants(id),
    announcement_id UUID REFERENCES announcements(id),
    employee_id UUID REFERENCES employees(id),
    read_at TIMESTAMP NOT NULL,
    accepted_at TIMESTAMP,
    UNIQUE(announcement_id, employee_id)
);
```

## Benefits Tables

### benefit_plans
```sql
CREATE TABLE benefit_plans (
    id UUID PRIMARY KEY,
    tenant_id UUID REFERENCES tenants(id),
    plan_code VARCHAR(50) NOT NULL,
    plan_name VARCHAR(255) NOT NULL,
    description TEXT,
    benefit_type VARCHAR(50) NOT NULL,
    provider_id UUID,
    provider_name VARCHAR(255),
    coverage_amount DECIMAL(15,2),
    employee_contribution DECIMAL(15,2),
    employer_contribution DECIMAL(15,2),
    effective_date DATE NOT NULL,
    expiry_date DATE,
    is_active BOOLEAN DEFAULT true,
    eligibility_criteria TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(tenant_id, plan_code)
);
```

### benefit_enrollments
```sql
CREATE TABLE benefit_enrollments (
    id UUID PRIMARY KEY,
    tenant_id UUID REFERENCES tenants(id),
    employee_id UUID REFERENCES employees(id),
    benefit_plan_id UUID REFERENCES benefit_plans(id),
    enrollment_date DATE NOT NULL,
    effective_date DATE NOT NULL,
    termination_date DATE,
    status VARCHAR(20) DEFAULT 'PENDING',
    coverage_level VARCHAR(30),
    employee_contribution DECIMAL(15,2),
    employer_contribution DECIMAL(15,2),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(tenant_id, employee_id, benefit_plan_id)
);
```

## Audit Tables

### audit_logs
```sql
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY,
    tenant_id UUID REFERENCES tenants(id),
    entity_type VARCHAR(100) NOT NULL,
    entity_id UUID NOT NULL,
    action VARCHAR(20) NOT NULL,
    actor_id UUID REFERENCES users(id),
    actor_name VARCHAR(255),
    old_values JSONB,
    new_values JSONB,
    ip_address VARCHAR(50),
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_audit_tenant_entity ON audit_logs(tenant_id, entity_type, entity_id);
CREATE INDEX idx_audit_created ON audit_logs(created_at);
```

## Indexes

Key indexes for performance:

```sql
-- Employee lookups
CREATE INDEX idx_employee_tenant ON employees(tenant_id);
CREATE INDEX idx_employee_department ON employees(department_id);
CREATE INDEX idx_employee_manager ON employees(reporting_manager_id);
CREATE INDEX idx_employee_status ON employees(status);

-- Attendance queries
CREATE INDEX idx_attendance_employee_date ON attendance_records(employee_id, attendance_date);
CREATE INDEX idx_attendance_date ON attendance_records(attendance_date);

-- Leave queries
CREATE INDEX idx_leave_employee ON leave_requests(employee_id);
CREATE INDEX idx_leave_status ON leave_requests(status);
CREATE INDEX idx_leave_dates ON leave_requests(start_date, end_date);

-- Payroll queries
CREATE INDEX idx_payslip_employee ON payslips(employee_id);
CREATE INDEX idx_payslip_period ON payslips(pay_period_start, pay_period_end);

-- Announcements
CREATE INDEX idx_announcement_status ON announcements(status);
CREATE INDEX idx_announcement_published ON announcements(published_at);
```

## Data Relationships

```
tenants (1) ──────── (N) users
tenants (1) ──────── (N) employees
tenants (1) ──────── (N) departments

employees (1) ────── (N) attendance_records
employees (1) ────── (N) leave_requests
employees (1) ────── (N) leave_balances
employees (1) ────── (1) salary_structure
employees (1) ────── (N) payslips
employees (1) ────── (N) goals
employees (1) ────── (N) performance_reviews
employees (1) ────── (N) benefit_enrollments

departments (1) ──── (N) employees
departments (1) ──── (N) departments (parent-child)

leave_types (1) ──── (N) leave_requests
leave_types (1) ──── (N) leave_balances

benefit_plans (1) ── (N) benefit_enrollments

payroll_runs (1) ─── (N) payslips
```

---

**Last Updated**: December 8, 2025
