package com.hrms.infrastructure.analytics.repository;

import com.hrms.domain.analytics.AnalyticsInsight;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface AnalyticsInsightRepository extends JpaRepository<AnalyticsInsight, UUID> {

    Optional<AnalyticsInsight> findByIdAndTenantId(UUID id, UUID tenantId);

    Page<AnalyticsInsight> findByTenantId(UUID tenantId, Pageable pageable);

    @Query("SELECT i FROM AnalyticsInsight i WHERE i.tenantId = :tenantId " +
            "AND i.category = :category AND (i.validUntil IS NULL OR i.validUntil >= :today) " +
            "ORDER BY i.generatedAt DESC")
    List<AnalyticsInsight> findByCategory(@Param("tenantId") UUID tenantId,
                                          @Param("category") AnalyticsInsight.InsightCategory category,
                                          @Param("today") LocalDate today);

    @Query("SELECT i FROM AnalyticsInsight i WHERE i.tenantId = :tenantId " +
            "AND i.severity = :severity AND i.status IN ('NEW', 'ACKNOWLEDGED') " +
            "ORDER BY i.generatedAt DESC")
    List<AnalyticsInsight> findBySeverity(@Param("tenantId") UUID tenantId,
                                          @Param("severity") AnalyticsInsight.InsightSeverity severity);

    @Query("SELECT i FROM AnalyticsInsight i WHERE i.tenantId = :tenantId " +
            "AND i.status = :status ORDER BY i.generatedAt DESC")
    List<AnalyticsInsight> findByStatus(@Param("tenantId") UUID tenantId,
                                        @Param("status") AnalyticsInsight.InsightStatus status);

    @Query("SELECT i FROM AnalyticsInsight i WHERE i.tenantId = :tenantId " +
            "AND i.departmentId = :departmentId AND (i.validUntil IS NULL OR i.validUntil >= :today) " +
            "ORDER BY i.generatedAt DESC")
    List<AnalyticsInsight> findByDepartment(@Param("tenantId") UUID tenantId,
                                            @Param("departmentId") UUID departmentId,
                                            @Param("today") LocalDate today);

    @Query("SELECT i FROM AnalyticsInsight i WHERE i.tenantId = :tenantId " +
            "AND i.insightType = :type AND i.status IN ('NEW', 'ACKNOWLEDGED') " +
            "ORDER BY i.impactScore DESC")
    List<AnalyticsInsight> findActiveByType(@Param("tenantId") UUID tenantId,
                                            @Param("type") AnalyticsInsight.InsightType type);

    @Query("SELECT i FROM AnalyticsInsight i WHERE i.tenantId = :tenantId " +
            "AND i.severity = 'CRITICAL' AND i.status = 'NEW' " +
            "ORDER BY i.generatedAt DESC")
    List<AnalyticsInsight> findCriticalUnacknowledged(@Param("tenantId") UUID tenantId);

    @Query("SELECT i.category, COUNT(i) FROM AnalyticsInsight i WHERE i.tenantId = :tenantId " +
            "AND i.status IN ('NEW', 'ACKNOWLEDGED', 'IN_PROGRESS') GROUP BY i.category")
    List<Object[]> countActiveByCategory(@Param("tenantId") UUID tenantId);

    @Query("SELECT i FROM AnalyticsInsight i WHERE i.tenantId = :tenantId " +
            "AND i.assignedTo = :userId AND i.status NOT IN ('RESOLVED', 'DISMISSED') " +
            "ORDER BY i.dueDate")
    List<AnalyticsInsight> findAssignedTo(@Param("tenantId") UUID tenantId, @Param("userId") UUID userId);
}
