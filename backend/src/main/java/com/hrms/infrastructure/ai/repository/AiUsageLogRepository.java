package com.hrms.infrastructure.ai.repository;

import com.hrms.domain.ai.AiUsageLog;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.UUID;

@Repository
public interface AiUsageLogRepository extends JpaRepository<AiUsageLog, UUID> {

    @Query("SELECT COALESCE(SUM(a.tokensUsed), 0) FROM AiUsageLog a WHERE a.tenantId = :tenantId AND a.isDeleted = false")
    long sumTokensByTenant(@Param("tenantId") UUID tenantId);

    @Query("SELECT COALESCE(SUM(a.tokensUsed), 0) FROM AiUsageLog a WHERE a.isDeleted = false")
    long sumAllTokens();
}
