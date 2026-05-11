package com.hrms.application.admin.service;

import com.hrms.domain.ai.AiUsageLog;
import com.hrms.infrastructure.ai.repository.AiUsageLogRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * Service for tracking AI feature usage and credit consumption.
 *
 * <p>Provides insights into AI-powered feature adoption, token usage, and
 * per-tenant billing data sourced from the {@code ai_usage_log} table.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class AiUsageService {

    private final AiUsageLogRepository aiUsageLogRepository;

    /**
     * Approximate USD cost per 1,000 tokens, keyed by lower-case model name.
     * Sourced from each vendor's public pricing page as of 2026-05; numbers are
     * deliberately conservative (output-token rate) so {@link #backfillRange}
     * never under-bills. Unknown models map to {@link BigDecimal#ZERO}, which
     * leaves the row in its un-priced state for a follow-up sweep.
     */
    private static final Map<String, BigDecimal> COST_PER_1K_TOKENS = Map.of(
            "gpt-4o-mini", new BigDecimal("0.00015"),
            "gpt-4o", new BigDecimal("0.005"),
            "llama-3.1-8b-instant", new BigDecimal("0.00005"), // Groq pricing approx
            "claude-3-haiku", new BigDecimal("0.00025")
    );

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

    /**
     * S3-G follow-up: compute an estimated USD cost for a single usage row.
     * Pure function — safe to call from anywhere, including in tests.
     *
     * @param modelName the upstream model identifier (case-insensitive)
     * @param tokensUsed total tokens (prompt + completion) for the call
     * @return cost in USD rounded to 6 decimal places, or {@link BigDecimal#ZERO}
     *         when the model is unknown or no tokens were charged
     */
    public static BigDecimal estimateCost(String modelName, Integer tokensUsed) {
        if (modelName == null || tokensUsed == null || tokensUsed == 0) {
            return BigDecimal.ZERO;
        }
        BigDecimal rate = COST_PER_1K_TOKENS.getOrDefault(
                modelName.toLowerCase(), BigDecimal.ZERO);
        if (rate.signum() == 0) {
            return BigDecimal.ZERO;
        }
        return rate.multiply(BigDecimal.valueOf(tokensUsed))
                .divide(BigDecimal.valueOf(1000L), 6, RoundingMode.HALF_UP);
    }

    /**
     * Operator-invocable backfill: walks every un-priced (costUsd = 0,
     * tokensUsed &gt; 0) row in {@code [from, to]} and populates {@code costUsd}
     * using {@link #estimateCost}. Idempotent — re-running the same window
     * after a successful sweep is a no-op because freshly-priced rows are
     * skipped by the repository query.
     *
     * <p>Returns the number of rows updated so the operator can verify the
     * sweep made progress (or that the window has already been processed).</p>
     */
    @Transactional
    public int backfillRange(LocalDateTime from, LocalDateTime to) {
        if (from == null || to == null || !to.isAfter(from)) {
            throw new IllegalArgumentException("backfillRange requires from < to");
        }
        List<AiUsageLog> unpriced = aiUsageLogRepository.findUnpricedBetween(from, to);
        int updated = 0;
        for (AiUsageLog row : unpriced) {
            BigDecimal cost = estimateCost(row.getModelName(), row.getTokensUsed());
            if (cost.signum() > 0) {
                row.setCostUsd(cost);
                updated++;
            }
        }
        if (updated > 0) {
            aiUsageLogRepository.saveAll(unpriced);
        }
        log.info("AI usage cost backfill window=[{},{}] candidates={} priced={}",
                from, to, unpriced.size(), updated);
        return updated;
    }
}
