-- =============================================================================
-- V162 — Tenant FK Batch 4: Workflow + Notification + Survey + Recognition (23 FKs)
-- =============================================================================
-- Wave-3 audit recommendation #1 continued. Cumulative after this batch:
-- V157 (22) + V158 (23) + V161 (25) + V162 (23) = 93 of ~208 tables covered.
--
-- Idempotent DO block pattern matches V157/V158/V161 — both constraint and
-- table existence are checked before the ALTER, so reruns are safe.
-- =============================================================================

-- Workflow engine --------------------------------------------------------------
DO
$$
BEGIN
    IF
NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE table_name = 'workflow_definitions' AND constraint_name = 'fk_workflow_definitions_tenant')
       AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'workflow_definitions') THEN
ALTER TABLE workflow_definitions
  ADD CONSTRAINT fk_workflow_definitions_tenant
    FOREIGN KEY (tenant_id) REFERENCES tenants (id) ON DELETE CASCADE;
END IF;
END $$;

DO
$$
BEGIN
    IF
NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE table_name = 'workflow_executions' AND constraint_name = 'fk_workflow_executions_tenant')
       AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'workflow_executions') THEN
ALTER TABLE workflow_executions
  ADD CONSTRAINT fk_workflow_executions_tenant
    FOREIGN KEY (tenant_id) REFERENCES tenants (id) ON DELETE CASCADE;
END IF;
END $$;

DO
$$
BEGIN
    IF
NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE table_name = 'workflow_rules' AND constraint_name = 'fk_workflow_rules_tenant')
       AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'workflow_rules') THEN
ALTER TABLE workflow_rules
  ADD CONSTRAINT fk_workflow_rules_tenant
    FOREIGN KEY (tenant_id) REFERENCES tenants (id) ON DELETE CASCADE;
END IF;
END $$;

-- Notifications ---------------------------------------------------------------
DO
$$
BEGIN
    IF
NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE table_name = 'notifications' AND constraint_name = 'fk_notifications_tenant')
       AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'notifications') THEN
ALTER TABLE notifications
  ADD CONSTRAINT fk_notifications_tenant
    FOREIGN KEY (tenant_id) REFERENCES tenants (id) ON DELETE CASCADE;
END IF;
END $$;

DO
$$
BEGIN
    IF
NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE table_name = 'email_notifications' AND constraint_name = 'fk_email_notifications_tenant')
       AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'email_notifications') THEN
ALTER TABLE email_notifications
  ADD CONSTRAINT fk_email_notifications_tenant
    FOREIGN KEY (tenant_id) REFERENCES tenants (id) ON DELETE CASCADE;
END IF;
END $$;

DO
$$
BEGIN
    IF
NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE table_name = 'multi_channel_notifications' AND constraint_name = 'fk_multi_channel_notifications_tenant')
       AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'multi_channel_notifications') THEN
ALTER TABLE multi_channel_notifications
  ADD CONSTRAINT fk_multi_channel_notifications_tenant
    FOREIGN KEY (tenant_id) REFERENCES tenants (id) ON DELETE CASCADE;
END IF;
END $$;

DO
$$
BEGIN
    IF
NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE table_name = 'notification_templates' AND constraint_name = 'fk_notification_templates_tenant')
       AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'notification_templates') THEN
ALTER TABLE notification_templates
  ADD CONSTRAINT fk_notification_templates_tenant
    FOREIGN KEY (tenant_id) REFERENCES tenants (id) ON DELETE CASCADE;
END IF;
END $$;

DO
$$
BEGIN
    IF
NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE table_name = 'notification_channel_configs' AND constraint_name = 'fk_notification_channel_configs_tenant')
       AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'notification_channel_configs') THEN
ALTER TABLE notification_channel_configs
  ADD CONSTRAINT fk_notification_channel_configs_tenant
    FOREIGN KEY (tenant_id) REFERENCES tenants (id) ON DELETE CASCADE;
END IF;
END $$;

DO
$$
BEGIN
    IF
NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE table_name = 'user_notification_preferences' AND constraint_name = 'fk_user_notification_preferences_tenant')
       AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_notification_preferences') THEN
ALTER TABLE user_notification_preferences
  ADD CONSTRAINT fk_user_notification_preferences_tenant
    FOREIGN KEY (tenant_id) REFERENCES tenants (id) ON DELETE CASCADE;
END IF;
END $$;

DO
$$
BEGIN
    IF
NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE table_name = 'user_basic_notification_preferences' AND constraint_name = 'fk_user_basic_notification_preferences_tenant')
       AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_basic_notification_preferences') THEN
ALTER TABLE user_basic_notification_preferences
  ADD CONSTRAINT fk_user_basic_notification_preferences_tenant
    FOREIGN KEY (tenant_id) REFERENCES tenants (id) ON DELETE CASCADE;
END IF;
END $$;

DO
$$
BEGIN
    IF
NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE table_name = 'scheduled_reports' AND constraint_name = 'fk_scheduled_reports_tenant')
       AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'scheduled_reports') THEN
ALTER TABLE scheduled_reports
  ADD CONSTRAINT fk_scheduled_reports_tenant
    FOREIGN KEY (tenant_id) REFERENCES tenants (id) ON DELETE CASCADE;
END IF;
END $$;

-- Webhooks --------------------------------------------------------------------
DO
$$
BEGIN
    IF
NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE table_name = 'webhooks' AND constraint_name = 'fk_webhooks_tenant')
       AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'webhooks') THEN
ALTER TABLE webhooks
  ADD CONSTRAINT fk_webhooks_tenant
    FOREIGN KEY (tenant_id) REFERENCES tenants (id) ON DELETE CASCADE;
END IF;
END $$;

DO
$$
BEGIN
    IF
NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE table_name = 'webhook_deliveries' AND constraint_name = 'fk_webhook_deliveries_tenant')
       AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'webhook_deliveries') THEN
ALTER TABLE webhook_deliveries
  ADD CONSTRAINT fk_webhook_deliveries_tenant
    FOREIGN KEY (tenant_id) REFERENCES tenants (id) ON DELETE CASCADE;
END IF;
END $$;

-- Engagement + Surveys --------------------------------------------------------
DO
$$
BEGIN
    IF
NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE table_name = 'engagement_scores' AND constraint_name = 'fk_engagement_scores_tenant')
       AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'engagement_scores') THEN
ALTER TABLE engagement_scores
  ADD CONSTRAINT fk_engagement_scores_tenant
    FOREIGN KEY (tenant_id) REFERENCES tenants (id) ON DELETE CASCADE;
END IF;
END $$;

DO
$$
BEGIN
    IF
NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE table_name = 'pulse_surveys' AND constraint_name = 'fk_pulse_surveys_tenant')
       AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'pulse_surveys') THEN
ALTER TABLE pulse_surveys
  ADD CONSTRAINT fk_pulse_surveys_tenant
    FOREIGN KEY (tenant_id) REFERENCES tenants (id) ON DELETE CASCADE;
END IF;
END $$;

DO
$$
BEGIN
    IF
NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE table_name = 'pulse_survey_questions' AND constraint_name = 'fk_pulse_survey_questions_tenant')
       AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'pulse_survey_questions') THEN
ALTER TABLE pulse_survey_questions
  ADD CONSTRAINT fk_pulse_survey_questions_tenant
    FOREIGN KEY (tenant_id) REFERENCES tenants (id) ON DELETE CASCADE;
END IF;
END $$;

DO
$$
BEGIN
    IF
NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE table_name = 'pulse_survey_responses' AND constraint_name = 'fk_pulse_survey_responses_tenant')
       AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'pulse_survey_responses') THEN
ALTER TABLE pulse_survey_responses
  ADD CONSTRAINT fk_pulse_survey_responses_tenant
    FOREIGN KEY (tenant_id) REFERENCES tenants (id) ON DELETE CASCADE;
END IF;
END $$;

DO
$$
BEGIN
    IF
NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE table_name = 'pulse_survey_answers' AND constraint_name = 'fk_pulse_survey_answers_tenant')
       AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'pulse_survey_answers') THEN
ALTER TABLE pulse_survey_answers
  ADD CONSTRAINT fk_pulse_survey_answers_tenant
    FOREIGN KEY (tenant_id) REFERENCES tenants (id) ON DELETE CASCADE;
END IF;
END $$;

DO
$$
BEGIN
    IF
NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE table_name = 'survey_answers' AND constraint_name = 'fk_survey_answers_tenant')
       AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'survey_answers') THEN
ALTER TABLE survey_answers
  ADD CONSTRAINT fk_survey_answers_tenant
    FOREIGN KEY (tenant_id) REFERENCES tenants (id) ON DELETE CASCADE;
END IF;
END $$;

-- Recognition -----------------------------------------------------------------
DO
$$
BEGIN
    IF
NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE table_name = 'recognitions' AND constraint_name = 'fk_recognitions_tenant')
       AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'recognitions') THEN
ALTER TABLE recognitions
  ADD CONSTRAINT fk_recognitions_tenant
    FOREIGN KEY (tenant_id) REFERENCES tenants (id) ON DELETE CASCADE;
END IF;
END $$;

DO
$$
BEGIN
    IF
NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE table_name = 'peer_recognitions' AND constraint_name = 'fk_peer_recognitions_tenant')
       AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'peer_recognitions') THEN
ALTER TABLE peer_recognitions
  ADD CONSTRAINT fk_peer_recognitions_tenant
    FOREIGN KEY (tenant_id) REFERENCES tenants (id) ON DELETE CASCADE;
END IF;
END $$;

DO
$$
BEGIN
    IF
NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE table_name = 'recognition_badges' AND constraint_name = 'fk_recognition_badges_tenant')
       AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'recognition_badges') THEN
ALTER TABLE recognition_badges
  ADD CONSTRAINT fk_recognition_badges_tenant
    FOREIGN KEY (tenant_id) REFERENCES tenants (id) ON DELETE CASCADE;
END IF;
END $$;

DO
$$
BEGIN
    IF
NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE table_name = 'recognition_reactions' AND constraint_name = 'fk_recognition_reactions_tenant')
       AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'recognition_reactions') THEN
ALTER TABLE recognition_reactions
  ADD CONSTRAINT fk_recognition_reactions_tenant
    FOREIGN KEY (tenant_id) REFERENCES tenants (id) ON DELETE CASCADE;
END IF;
END $$;
