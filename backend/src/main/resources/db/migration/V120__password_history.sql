-- Password history tracking for password reuse prevention
CREATE TABLE IF NOT EXISTS password_history
(
  id
  BIGSERIAL
  PRIMARY
  KEY,
  user_id
  UUID
  NOT
  NULL,
  tenant_id
  UUID
  NOT
  NULL,
  password_hash
  VARCHAR
(
  255
) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW
(
),
  CONSTRAINT fk_password_history_user FOREIGN KEY
(
  user_id
) REFERENCES users
(
  id
) ON DELETE CASCADE
  );

CREATE INDEX idx_password_history_user_id ON password_history (user_id);
CREATE INDEX idx_password_history_tenant_id ON password_history (tenant_id);
