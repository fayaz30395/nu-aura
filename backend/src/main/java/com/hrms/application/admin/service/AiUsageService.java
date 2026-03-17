package com.hrms.application.admin.service;

import com.hrms.domain.audit.AuditLog;
import com.hrms.infrastructure.audit.repository.AuditLogRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

/**
 * Service for tracking AI feature usage and credit consumption.
 *
 * <p>Provides insights into AI-powered feature adoption and usage patterns.
 * Currently uses audit logs as a proxy for tracking AI feature invocations.
 *
 * <p><strong>Future Enhancement (NUJIRA-XXX):</strong>
 * <ul>
 *   <li>Create a dedicated ai_usage_log table with:
 *       <ul>
 *         <li>tenant_id (for tenant-scoped billing)</li>
 *         <li>feature (e.g., "resume_screening", "salary_prediction", "nlp_text_analysis")</li>
 *         <li>tokens_used (LLM token consumption)</li>
 *         <li>cost_usd (computed cost)</li>
 *         <li>created_at (timestamp)</li>
 *       </ul>
 *   </li>
 *   <li>Integrate with OpenAI usage API or similar to track real token consumption</li>
 *   <li>Implement credit deduction on feature invocation (transactional)</li>
 *   <li>Add credit recharge flows for tenant admins</li>
 * </ul>
 *
 * <p>For now, this service returns 0 as a placeholder. Integration should
 * happen in a separate phase after the core audit and AI features are mature.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class AiUsageService {

    private final AuditLogRepository auditLogRepository;

    /**
     * Get total AI credits/tokens used by a specific tenant.
     *
     * <p><strong>Current behavior:</strong> Returns 0 as a placeholder.
     * <strong>Future behavior:</strong> Will sum tokens_used from dedicated ai_usage_log
     * table after integration.
     *
     * @param tenantId the tenant ID
     * @return AI credits used (currently always 0 — pending implementation)
     */
    @Transactional(readOnly = true)
    public long getAiCreditsUsedForTenant(UUID tenantId) {
        // Placeholder: audit logs don't distinguish AI actions yet
        // TODO: Once ai_usage_log table exists, query:
        // SELECT COALESCE(SUM(tokens_used), 0) FROM ai_usage_log WHERE tenant_id = :tenantId

        log.debug("AI credits query for tenant {} — returning 0 (pending ai_usage_log integration)", tenantId);
        return 0L;
    }

    /**
     * Get total AI credits/tokens used across all tenants.
     * SuperAdmin use only.
     *
     * <p><strong>Current behavior:</strong> Returns 0 as a placeholder.
     * <strong>Future behavior:</strong> Will sum tokens_used from dedicated ai_usage_log
     * table after integration.
     *
     * @return total AI credits used across the system (currently always 0 — pending implementation)
     */
    @Transactional(readOnly = true)
    public long getAiCreditsUsedAcrossAllTenants() {
        // Placeholder: waiting for ai_usage_log table integration
        // TODO: Once ai_usage_log table exists, query:
        // SELECT COALESCE(SUM(tokens_used), 0) FROM ai_usage_log

        log.debug("System-wide AI credits query — returning 0 (pending ai_usage_log integration)");
        return 0L;
    }
}
