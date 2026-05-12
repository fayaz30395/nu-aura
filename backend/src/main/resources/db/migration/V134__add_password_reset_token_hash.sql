-- Add hashed password reset token column; deprecate plaintext column.
-- Sprint: security overhaul (agent B). Originally numbered V129 in the spec, bumped to V134
-- because V129..V133 are already taken in main.
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS password_reset_token_hash VARCHAR (255);
CREATE INDEX IF NOT EXISTS idx_users_pwd_reset_hash ON users(password_reset_token_hash) WHERE password_reset_token_hash IS NOT NULL;
