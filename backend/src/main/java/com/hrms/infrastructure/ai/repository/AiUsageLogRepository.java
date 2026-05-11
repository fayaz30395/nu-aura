package com.hrms.infrastructure.ai.repository;

import com.hrms.domain.ai.AiUsageLog;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Repository
public interface AiUsageLogRepository extends JpaRepository<AiUsageLog, UUID> {

    @Query("SELECT COALESCE(SUM(a.tokensUsed), 0) FROM AiUsageLog a WHERE a.tenantId = :tenantId AND a.isDeleted = false")
    long sumTokensByTenant(@Param("tenantId") UUID tenantId);

    @Query("SELECT COALESCE(SUM(a.tokensUsed), 0) FROM AiUsageLog a WHERE a.isDeleted = false")
    long sumAllTokens();

    /**
     * S3-G follow-up: rows landed in {@code ai_usage_log} with {@code tokensUsed}
     * populated but {@code costUsd = 0}, because the previous logger had no
     * pricing table. Selects un-priced rows within an operator-supplied window
     * so {@link com.hrms.application.admin.service.AiUsageService#backfillRange}
     * can compute the dollar amount per row.
     */
    @Query("SELECT a FROM AiUsageLog a " +
            "WHERE a.isDeleted = false " +
            "AND a.costUsd = 0 " +
            "AND a.tokensUsed > 0 " +
            "AND a.createdAt BETWEEN :from AND :to")
    List<AiUsageLog> findUnpricedBetween(@Param("from") LocalDateTime from,
                                          @Param("to") LocalDateTime to);
}
