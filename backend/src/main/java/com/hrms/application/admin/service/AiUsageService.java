package com.hrms.application.admin.service;

import com.hrms.infrastructure.ai.repository.AiUsageLogRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

/**
 * Service for tracking AI feature usage and credit consumption.
 *
 * <p>Provides insights into AI-powered feature adoption, token usage, and
 * per-tenant billing data sourced from the {@code ai_usage_log} table.
 */
@Service
@RequiredArgsConstructor
public class AiUsageService {

    private final AiUsageLogRepository aiUsageLogRepository;

    /**
     * Get total AI credits/tokens used by a specific tenant.
     *
     * @param tenantId the tenant ID
     * @return total tokens consumed by the tenant
     */
    @Transactional(readOnly = true)
    public long getAiCreditsUsedForTenant(UUID tenantId) {
        return aiUsageLogRepository.sumTokensByTenant(tenantId);
    }

    /**
     * Get total AI credits/tokens used across all tenants.
     * SuperAdmin use only.
     *
     * @return total tokens consumed across the entire system
     */
    @Transactional(readOnly = true)
    public long getAiCreditsUsedAcrossAllTenants() {
        return aiUsageLogRepository.sumAllTokens();
    }
}
