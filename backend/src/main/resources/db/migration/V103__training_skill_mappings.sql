-- V101: Training-to-skill mappings for automatic skill updates on training completion

CREATE TABLE training_skill_mappings
(
  id                UUID PRIMARY KEY      DEFAULT gen_random_uuid(),
  tenant_id         UUID         NOT NULL,
  program_id        UUID         NOT NULL,
  skill_name        VARCHAR(200) NOT NULL,
  category          VARCHAR(50),
  proficiency_level INTEGER      NOT NULL DEFAULT 1,
  is_active         BOOLEAN               DEFAULT TRUE,
  created_at        TIMESTAMP             DEFAULT NOW(),
  updated_at        TIMESTAMP             DEFAULT NOW(),
  CONSTRAINT fk_tsk_program FOREIGN KEY (program_id) REFERENCES training_programs (id) ON DELETE CASCADE
);

CREATE INDEX idx_tsk_tenant_program ON training_skill_mappings (tenant_id, program_id);
CREATE INDEX idx_tsk_active ON training_skill_mappings (tenant_id, is_active);
