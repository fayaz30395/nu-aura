-- Payment Gateway Schema
-- V17 migration: Payment configs, transactions, batches, webhooks

-- Payment Gateway Configurations
CREATE TABLE payment_configs
(
  id                UUID PRIMARY KEY,
  tenant_id         UUID        NOT NULL,
  provider          VARCHAR(50) NOT NULL, -- RAZORPAY, STRIPE, BANK_TRANSFER
  api_key_encrypted TEXT        NOT NULL,
  webhook_secret    TEXT,
  merchant_id       VARCHAR(255),
  is_active         BOOLEAN     NOT NULL DEFAULT FALSE,
  metadata          JSONB,
  created_at        TIMESTAMP   NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at        TIMESTAMP   NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_by        UUID,
  updated_by        UUID,
  is_deleted        BOOLEAN     NOT NULL DEFAULT FALSE,
  UNIQUE (tenant_id, provider)
);

CREATE INDEX idx_payment_config_tenant ON payment_configs (tenant_id);
CREATE INDEX idx_payment_config_provider ON payment_configs (tenant_id, provider);

-- Payment Transactions
CREATE TABLE payment_transactions
(
  id                       UUID PRIMARY KEY,
  tenant_id                UUID           NOT NULL,
  transaction_ref          VARCHAR(100)   NOT NULL,
  external_ref             VARCHAR(255),                                -- Reference from payment gateway (e.g., Razorpay payment ID)
  type                     VARCHAR(50)    NOT NULL,                     -- PAYROLL, EXPENSE_REIMBURSEMENT, LOAN
  amount                   DECIMAL(15, 2) NOT NULL,
  currency                 VARCHAR(3)     NOT NULL DEFAULT 'INR',
  status                   VARCHAR(50)    NOT NULL DEFAULT 'INITIATED', -- INITIATED, PROCESSING, COMPLETED, FAILED, REFUNDED
  employee_id              UUID,
  payroll_run_id           UUID,
  expense_claim_id         UUID,
  loan_id                  UUID,
  provider                 VARCHAR(50)    NOT NULL,
  recipient_account_number VARCHAR(255),
  recipient_ifsc           VARCHAR(11),
  recipient_name           VARCHAR(255),
  metadata                 JSONB,
  failed_reason            TEXT,
  initiated_at             TIMESTAMP      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  completed_at             TIMESTAMP,
  refunded_at              TIMESTAMP,
  created_at               TIMESTAMP      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at               TIMESTAMP      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_by               UUID,
  updated_by               UUID,
  is_deleted               BOOLEAN        NOT NULL DEFAULT FALSE,
  UNIQUE (tenant_id, transaction_ref)
);

CREATE INDEX idx_payment_transaction_tenant ON payment_transactions (tenant_id);
CREATE INDEX idx_payment_transaction_ref ON payment_transactions (tenant_id, transaction_ref);
CREATE INDEX idx_payment_transaction_external_ref ON payment_transactions (external_ref);
CREATE INDEX idx_payment_transaction_type ON payment_transactions (tenant_id, type);
CREATE INDEX idx_payment_transaction_status ON payment_transactions (tenant_id, status);
CREATE INDEX idx_payment_transaction_employee ON payment_transactions (tenant_id, employee_id);
CREATE INDEX idx_payment_transaction_payroll ON payment_transactions (payroll_run_id);

-- Payment Batches (for batch disbursements like payroll runs)
CREATE TABLE payment_batches
(
  id                UUID PRIMARY KEY,
  tenant_id         UUID           NOT NULL,
  batch_ref         VARCHAR(100)   NOT NULL,
  type              VARCHAR(50)    NOT NULL,                     -- PAYROLL, EXPENSE_REIMBURSEMENT, LOAN
  total_amount      DECIMAL(15, 2) NOT NULL,
  transaction_count INTEGER        NOT NULL DEFAULT 0,
  status            VARCHAR(50)    NOT NULL DEFAULT 'INITIATED', -- INITIATED, PROCESSING, COMPLETED, PARTIAL_SUCCESS, FAILED
  payroll_run_id    UUID,
  initiated_by      UUID           NOT NULL,
  completed_by      UUID,
  completed_at      TIMESTAMP,
  failed_count      INTEGER                 DEFAULT 0,
  success_count     INTEGER                 DEFAULT 0,
  metadata          JSONB,
  created_at        TIMESTAMP      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at        TIMESTAMP      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  is_deleted        BOOLEAN        NOT NULL DEFAULT FALSE,
  UNIQUE (tenant_id, batch_ref)
);

CREATE INDEX idx_payment_batch_tenant ON payment_batches (tenant_id);
CREATE INDEX idx_payment_batch_ref ON payment_batches (tenant_id, batch_ref);
CREATE INDEX idx_payment_batch_type ON payment_batches (tenant_id, type);
CREATE INDEX idx_payment_batch_status ON payment_batches (tenant_id, status);
CREATE INDEX idx_payment_batch_payroll ON payment_batches (payroll_run_id);

-- Payment Batch Transactions (mapping transactions to batches)
CREATE TABLE payment_batch_transactions
(
  batch_id        UUID    NOT NULL,
  transaction_id  UUID    NOT NULL,
  sequence_number INTEGER NOT NULL,
  PRIMARY KEY (batch_id, transaction_id),
  FOREIGN KEY (batch_id) REFERENCES payment_batches (id) ON DELETE CASCADE,
  FOREIGN KEY (transaction_id) REFERENCES payment_transactions (id) ON DELETE CASCADE
);

CREATE INDEX idx_payment_batch_txn_batch ON payment_batch_transactions (batch_id);
CREATE INDEX idx_payment_batch_txn_txn ON payment_batch_transactions (transaction_id);

-- Payment Webhooks (for webhook event tracking)
CREATE TABLE payment_webhooks
(
  id                UUID PRIMARY KEY,
  tenant_id         UUID         NOT NULL,
  provider          VARCHAR(50)  NOT NULL,
  event_type        VARCHAR(100) NOT NULL,
  external_event_id VARCHAR(255),
  payload           JSONB        NOT NULL,
  processed         BOOLEAN      NOT NULL DEFAULT FALSE,
  processed_at      TIMESTAMP,
  status            VARCHAR(50)  NOT NULL DEFAULT 'RECEIVED', -- RECEIVED, PROCESSING, PROCESSED, FAILED
  error_message     TEXT,
  created_at        TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at        TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_payment_webhook_tenant ON payment_webhooks (tenant_id);
CREATE INDEX idx_payment_webhook_provider ON payment_webhooks (tenant_id, provider);
CREATE INDEX idx_payment_webhook_event ON payment_webhooks (tenant_id, event_type);
CREATE INDEX idx_payment_webhook_processed ON payment_webhooks (tenant_id, processed);
CREATE INDEX idx_payment_webhook_external_event_id ON payment_webhooks (external_event_id);

-- Payment Refunds
CREATE TABLE payment_refunds
(
  id                 UUID PRIMARY KEY,
  tenant_id          UUID           NOT NULL,
  transaction_id     UUID           NOT NULL,
  refund_ref         VARCHAR(100)   NOT NULL,
  external_refund_id VARCHAR(255),
  amount             DECIMAL(15, 2) NOT NULL,
  status             VARCHAR(50)    NOT NULL DEFAULT 'INITIATED', -- INITIATED, PROCESSING, COMPLETED, FAILED
  reason             TEXT,
  initiated_by       UUID           NOT NULL,
  completed_at       TIMESTAMP,
  metadata           JSONB,
  created_at         TIMESTAMP      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at         TIMESTAMP      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  is_deleted         BOOLEAN        NOT NULL DEFAULT FALSE,
  FOREIGN KEY (transaction_id) REFERENCES payment_transactions (id),
  UNIQUE (tenant_id, refund_ref)
);

CREATE INDEX idx_payment_refund_tenant ON payment_refunds (tenant_id);
CREATE INDEX idx_payment_refund_transaction ON payment_refunds (transaction_id);
CREATE INDEX idx_payment_refund_status ON payment_refunds (tenant_id, status);
