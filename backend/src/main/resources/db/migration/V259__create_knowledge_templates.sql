-- Create the Fluence knowledge template table used by KnowledgeDocumentTemplate.
CREATE TABLE IF NOT EXISTS knowledge_templates
(
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID,
  updated_by UUID,
  version BIGINT DEFAULT 0,
  is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
  deleted_at TIMESTAMPTZ,
  name VARCHAR(200) NOT NULL,
  slug VARCHAR(200) NOT NULL,
  description TEXT,
  category VARCHAR(100),
  content JSONB NOT NULL,
  template_variables JSONB,
  sample_data JSONB,
  thumbnail_url VARCHAR(500),
  usage_count INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  is_featured BOOLEAN NOT NULL DEFAULT FALSE,
  tags VARCHAR(1000)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_knowledge_templates_tenant_slug_active
  ON knowledge_templates (tenant_id, slug)
  WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_knowledge_templates_tenant ON knowledge_templates(tenant_id);
CREATE INDEX IF NOT EXISTS idx_knowledge_templates_category ON knowledge_templates(category);
CREATE INDEX IF NOT EXISTS idx_knowledge_templates_is_active ON knowledge_templates(is_active);
CREATE INDEX IF NOT EXISTS idx_knowledge_templates_is_featured ON knowledge_templates(is_featured);

ALTER TABLE template_instantiations
  ALTER COLUMN template_id DROP NOT NULL;

ALTER TABLE template_instantiations
  DROP CONSTRAINT IF EXISTS fk_template_instantiations_template;

ALTER TABLE template_instantiations
  ADD CONSTRAINT fk_template_instantiations_template
  FOREIGN KEY (template_id) REFERENCES knowledge_templates(id) ON DELETE SET NULL;
