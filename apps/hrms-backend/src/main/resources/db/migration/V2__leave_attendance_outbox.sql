ALTER TABLE employees
    ADD COLUMN current_address VARCHAR(500),
    ADD COLUMN permanent_address VARCHAR(500),
    ADD COLUMN emergency_contacts JSONB,
    ADD COLUMN profile_photo_url VARCHAR(500);

CREATE TABLE leave_policies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES orgs(id),
    leave_type VARCHAR(20) NOT NULL,
    annual_allotment NUMERIC(5,2) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (org_id, leave_type)
);

CREATE TABLE leave_balances (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES orgs(id),
    employee_id UUID NOT NULL REFERENCES employees(id),
    leave_type VARCHAR(20) NOT NULL,
    year INT NOT NULL,
    balance NUMERIC(5,2) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (employee_id, leave_type, year)
);

CREATE TABLE leave_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES orgs(id),
    employee_id UUID NOT NULL REFERENCES employees(id),
    leave_type VARCHAR(20) NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    is_half_day BOOLEAN NOT NULL DEFAULT false,
    half_day_session VARCHAR(10),
    status VARCHAR(20) NOT NULL,
    approver_user_id UUID,
    reason VARCHAR(255),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE attendance_days (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES orgs(id),
    employee_id UUID NOT NULL REFERENCES employees(id),
    attendance_date DATE NOT NULL,
    check_in_at TIMESTAMPTZ,
    check_out_at TIMESTAMPTZ,
    status VARCHAR(20) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (employee_id, attendance_date)
);

CREATE TABLE regularization_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES orgs(id),
    attendance_day_id UUID NOT NULL REFERENCES attendance_days(id),
    employee_id UUID NOT NULL REFERENCES employees(id),
    reason_code VARCHAR(50) NOT NULL,
    comment VARCHAR(500) NOT NULL,
    status VARCHAR(20) NOT NULL,
    approver_user_id UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE outbox_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES orgs(id),
    event_type VARCHAR(50) NOT NULL,
    status VARCHAR(20) NOT NULL,
    payload JSONB NOT NULL,
    idempotency_key VARCHAR(150),
    attempts INT NOT NULL DEFAULT 0,
    next_run_at TIMESTAMPTZ,
    last_error VARCHAR(500),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE calendar_event_refs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES orgs(id),
    leave_request_id UUID NOT NULL REFERENCES leave_requests(id),
    event_id VARCHAR(200) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (leave_request_id)
);

ALTER TABLE leave_policies
    ADD CONSTRAINT leave_type_check CHECK (leave_type IN ('CL', 'SL', 'PL', 'LOP'));

ALTER TABLE leave_requests
    ADD CONSTRAINT leave_request_status_check CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED'));

ALTER TABLE leave_requests
    ADD CONSTRAINT leave_half_day_check CHECK (half_day_session IN ('AM', 'PM') OR half_day_session IS NULL);

ALTER TABLE attendance_days
    ADD CONSTRAINT attendance_status_check CHECK (status IN ('PRESENT', 'INCOMPLETE', 'ABSENT', 'REGULARIZED'));

ALTER TABLE regularization_requests
    ADD CONSTRAINT regularization_status_check CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED'));

ALTER TABLE outbox_events
    ADD CONSTRAINT outbox_status_check CHECK (status IN ('PENDING', 'PROCESSING', 'SENT', 'FAILED'));

ALTER TABLE outbox_events
    ADD CONSTRAINT outbox_idempotency_key_unique UNIQUE (idempotency_key);
