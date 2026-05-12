-- =============================================================================
-- V170 — Tenant FK Batch 9: Analytics + AI + Talent + Succession + Dashboards (17 FKs)
-- =============================================================================
-- Cumulative after this batch: V157(22) + V158(23) + V161(26) + V162(23) +
-- V163(25) + V164(25) + V167(26) + V168(25) + V170(17) = 212 tenant FKs.
-- Closes the final tenant-FK gaps for the analytics/AI/talent/succession surface
-- that S08–S12 left out while focusing on transactional HR/payroll/recruitment.
--
-- Theme breakdown:
--   - Analytics fact tables (analytics_insights, analytics_metrics,
--     analytics_snapshots, sentiment_analysis, attrition_predictions,
--     workforce_trends, smart_recommendations)
--   - AI usage telemetry (ai_usage_log, chatbot_conversations,
--     resume_parsing_results)
--   - Dashboards + widgets (dashboards, dashboard_widgets)
--   - Talent + succession (talent_pools, talent_pool_members, succession_plans,
--     succession_candidates)
--   - Verification checks (background-verification supporting table that S09
--     skipped because the parent FK was already covered)
--
-- Idempotent DO-block pattern matches V157/V158/V161-V164/V167/V168 — guarded
-- by information_schema lookups for both the constraint AND the table, so
-- reruns are safe and a missing table on a downstream branch does not abort.
-- All FKs use ON DELETE CASCADE for clean tenant offboarding.
-- =============================================================================

-- Analytics fact tables --------------------------------------------------------
DO
$$
BEGIN
    IF
NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE table_name = 'analytics_insights' AND constraint_name = 'fk_analytics_insights_tenant')
       AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'analytics_insights') THEN
ALTER TABLE analytics_insights
  ADD CONSTRAINT fk_analytics_insights_tenant FOREIGN KEY (tenant_id) REFERENCES tenants (id) ON DELETE CASCADE;
END IF;
END $$;
DO
$$
BEGIN
    IF
NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE table_name = 'analytics_metrics' AND constraint_name = 'fk_analytics_metrics_tenant')
       AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'analytics_metrics') THEN
ALTER TABLE analytics_metrics
  ADD CONSTRAINT fk_analytics_metrics_tenant FOREIGN KEY (tenant_id) REFERENCES tenants (id) ON DELETE CASCADE;
END IF;
END $$;
DO
$$
BEGIN
    IF
NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE table_name = 'analytics_snapshots' AND constraint_name = 'fk_analytics_snapshots_tenant')
       AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'analytics_snapshots') THEN
ALTER TABLE analytics_snapshots
  ADD CONSTRAINT fk_analytics_snapshots_tenant FOREIGN KEY (tenant_id) REFERENCES tenants (id) ON DELETE CASCADE;
END IF;
END $$;
DO
$$
BEGIN
    IF
NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE table_name = 'sentiment_analysis' AND constraint_name = 'fk_sentiment_analysis_tenant')
       AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'sentiment_analysis') THEN
ALTER TABLE sentiment_analysis
  ADD CONSTRAINT fk_sentiment_analysis_tenant FOREIGN KEY (tenant_id) REFERENCES tenants (id) ON DELETE CASCADE;
END IF;
END $$;
DO
$$
BEGIN
    IF
NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE table_name = 'attrition_predictions' AND constraint_name = 'fk_attrition_predictions_tenant')
       AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'attrition_predictions') THEN
ALTER TABLE attrition_predictions
  ADD CONSTRAINT fk_attrition_predictions_tenant FOREIGN KEY (tenant_id) REFERENCES tenants (id) ON DELETE CASCADE;
END IF;
END $$;
DO
$$
BEGIN
    IF
NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE table_name = 'workforce_trends' AND constraint_name = 'fk_workforce_trends_tenant')
       AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'workforce_trends') THEN
ALTER TABLE workforce_trends
  ADD CONSTRAINT fk_workforce_trends_tenant FOREIGN KEY (tenant_id) REFERENCES tenants (id) ON DELETE CASCADE;
END IF;
END $$;
DO
$$
BEGIN
    IF
NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE table_name = 'smart_recommendations' AND constraint_name = 'fk_smart_recommendations_tenant')
       AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'smart_recommendations') THEN
ALTER TABLE smart_recommendations
  ADD CONSTRAINT fk_smart_recommendations_tenant FOREIGN KEY (tenant_id) REFERENCES tenants (id) ON DELETE CASCADE;
END IF;
END $$;

-- AI usage telemetry -----------------------------------------------------------
DO
$$
BEGIN
    IF
NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE table_name = 'ai_usage_log' AND constraint_name = 'fk_ai_usage_log_tenant')
       AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'ai_usage_log') THEN
ALTER TABLE ai_usage_log
  ADD CONSTRAINT fk_ai_usage_log_tenant FOREIGN KEY (tenant_id) REFERENCES tenants (id) ON DELETE CASCADE;
END IF;
END $$;
DO
$$
BEGIN
    IF
NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE table_name = 'chatbot_conversations' AND constraint_name = 'fk_chatbot_conversations_tenant')
       AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'chatbot_conversations') THEN
ALTER TABLE chatbot_conversations
  ADD CONSTRAINT fk_chatbot_conversations_tenant FOREIGN KEY (tenant_id) REFERENCES tenants (id) ON DELETE CASCADE;
END IF;
END $$;
DO
$$
BEGIN
    IF
NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE table_name = 'resume_parsing_results' AND constraint_name = 'fk_resume_parsing_results_tenant')
       AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'resume_parsing_results') THEN
ALTER TABLE resume_parsing_results
  ADD CONSTRAINT fk_resume_parsing_results_tenant FOREIGN KEY (tenant_id) REFERENCES tenants (id) ON DELETE CASCADE;
END IF;
END $$;

-- Dashboards + widgets ---------------------------------------------------------
DO
$$
BEGIN
    IF
NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE table_name = 'dashboards' AND constraint_name = 'fk_dashboards_tenant')
       AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'dashboards') THEN
ALTER TABLE dashboards
  ADD CONSTRAINT fk_dashboards_tenant FOREIGN KEY (tenant_id) REFERENCES tenants (id) ON DELETE CASCADE;
END IF;
END $$;
DO
$$
BEGIN
    IF
NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE table_name = 'dashboard_widgets' AND constraint_name = 'fk_dashboard_widgets_tenant')
       AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'dashboard_widgets') THEN
ALTER TABLE dashboard_widgets
  ADD CONSTRAINT fk_dashboard_widgets_tenant FOREIGN KEY (tenant_id) REFERENCES tenants (id) ON DELETE CASCADE;
END IF;
END $$;

-- Talent + succession ----------------------------------------------------------
DO
$$
BEGIN
    IF
NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE table_name = 'talent_pools' AND constraint_name = 'fk_talent_pools_tenant')
       AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'talent_pools') THEN
ALTER TABLE talent_pools
  ADD CONSTRAINT fk_talent_pools_tenant FOREIGN KEY (tenant_id) REFERENCES tenants (id) ON DELETE CASCADE;
END IF;
END $$;
DO
$$
BEGIN
    IF
NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE table_name = 'talent_pool_members' AND constraint_name = 'fk_talent_pool_members_tenant')
       AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'talent_pool_members') THEN
ALTER TABLE talent_pool_members
  ADD CONSTRAINT fk_talent_pool_members_tenant FOREIGN KEY (tenant_id) REFERENCES tenants (id) ON DELETE CASCADE;
END IF;
END $$;
DO
$$
BEGIN
    IF
NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE table_name = 'succession_plans' AND constraint_name = 'fk_succession_plans_tenant')
       AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'succession_plans') THEN
ALTER TABLE succession_plans
  ADD CONSTRAINT fk_succession_plans_tenant FOREIGN KEY (tenant_id) REFERENCES tenants (id) ON DELETE CASCADE;
END IF;
END $$;
DO
$$
BEGIN
    IF
NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE table_name = 'succession_candidates' AND constraint_name = 'fk_succession_candidates_tenant')
       AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'succession_candidates') THEN
ALTER TABLE succession_candidates
  ADD CONSTRAINT fk_succession_candidates_tenant FOREIGN KEY (tenant_id) REFERENCES tenants (id) ON DELETE CASCADE;
END IF;
END $$;

-- Verification supporting tables -----------------------------------------------
DO
$$
BEGIN
    IF
NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE table_name = 'verification_checks' AND constraint_name = 'fk_verification_checks_tenant')
       AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'verification_checks') THEN
ALTER TABLE verification_checks
  ADD CONSTRAINT fk_verification_checks_tenant FOREIGN KEY (tenant_id) REFERENCES tenants (id) ON DELETE CASCADE;
END IF;
END $$;
