package com.hrms.infrastructure.analytics.repository;

import com.hrms.domain.analytics.AttritionPrediction;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface AttritionPredictionRepository extends JpaRepository<AttritionPrediction, UUID> {

    Optional<AttritionPrediction> findByIdAndTenantId(UUID id, UUID tenantId);

    @Query("SELECT p FROM AttritionPrediction p WHERE p.tenantId = :tenantId AND p.employeeId = :employeeId " +
            "ORDER BY p.predictionDate DESC")
    List<AttritionPrediction> findByEmployee(@Param("tenantId") UUID tenantId, @Param("employeeId") UUID employeeId);

    @Query("SELECT p FROM AttritionPrediction p WHERE p.tenantId = :tenantId AND p.riskLevel = :riskLevel " +
            "AND p.predictionDate = (SELECT MAX(p2.predictionDate) FROM AttritionPrediction p2 " +
            "WHERE p2.employeeId = p.employeeId AND p2.tenantId = :tenantId)")
    List<AttritionPrediction> findLatestByRiskLevel(@Param("tenantId") UUID tenantId,
                                                    @Param("riskLevel") AttritionPrediction.RiskLevel riskLevel);

    @Query("SELECT p FROM AttritionPrediction p WHERE p.tenantId = :tenantId AND p.riskScore >= :minScore " +
            "AND p.predictionDate = (SELECT MAX(p2.predictionDate) FROM AttritionPrediction p2 " +
            "WHERE p2.employeeId = p.employeeId AND p2.tenantId = :tenantId) " +
            "ORDER BY p.riskScore DESC")
    List<AttritionPrediction> findHighRiskEmployees(@Param("tenantId") UUID tenantId,
                                                    @Param("minScore") BigDecimal minScore);

    @Query("SELECT COUNT(p) FROM AttritionPrediction p WHERE p.tenantId = :tenantId " +
            "AND p.riskLevel = :riskLevel AND p.predictionDate >= :fromDate")
    long countByRiskLevel(@Param("tenantId") UUID tenantId,
                          @Param("riskLevel") AttritionPrediction.RiskLevel riskLevel,
                          @Param("fromDate") LocalDate fromDate);

    @Query("SELECT p.riskLevel, COUNT(p) FROM AttritionPrediction p WHERE p.tenantId = :tenantId " +
            "AND p.predictionDate = (SELECT MAX(p2.predictionDate) FROM AttritionPrediction p2 " +
            "WHERE p2.tenantId = :tenantId) GROUP BY p.riskLevel")
    List<Object[]> countByRiskLevelDistribution(@Param("tenantId") UUID tenantId);

    @Query("SELECT AVG(p.riskScore) FROM AttritionPrediction p WHERE p.tenantId = :tenantId " +
            "AND p.predictionDate >= :fromDate")
    BigDecimal getAverageRiskScore(@Param("tenantId") UUID tenantId, @Param("fromDate") LocalDate fromDate);

    @Query("SELECT p FROM AttritionPrediction p WHERE p.tenantId = :tenantId " +
            "AND p.actionTaken = false AND p.riskLevel IN ('HIGH', 'CRITICAL') " +
            "ORDER BY p.riskScore DESC")
    List<AttritionPrediction> findPendingActions(@Param("tenantId") UUID tenantId);
}
