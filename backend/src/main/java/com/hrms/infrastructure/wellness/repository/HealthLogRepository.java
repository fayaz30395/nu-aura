package com.hrms.infrastructure.wellness.repository;

import com.hrms.domain.wellness.HealthLog;
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
public interface HealthLogRepository extends JpaRepository<HealthLog, UUID> {

    Optional<HealthLog> findByIdAndTenantId(UUID id, UUID tenantId);

    Page<HealthLog> findByEmployeeId(UUID employeeId, Pageable pageable);

    @Query("SELECT h FROM HealthLog h WHERE h.employeeId = :employeeId " +
            "AND h.logDate BETWEEN :startDate AND :endDate ORDER BY h.logDate DESC")
    List<HealthLog> findByEmployeeAndDateRange(
            @Param("employeeId") UUID employeeId,
            @Param("startDate") LocalDate startDate,
            @Param("endDate") LocalDate endDate);

    @Query("SELECT h FROM HealthLog h WHERE h.employeeId = :employeeId " +
            "AND h.metricType = :metricType AND h.logDate BETWEEN :startDate AND :endDate " +
            "ORDER BY h.logDate")
    List<HealthLog> findByMetricType(
            @Param("employeeId") UUID employeeId,
            @Param("metricType") HealthLog.MetricType metricType,
            @Param("startDate") LocalDate startDate,
            @Param("endDate") LocalDate endDate);

    @Query("SELECT h FROM HealthLog h WHERE h.participant.id = :participantId " +
            "ORDER BY h.logDate DESC")
    List<HealthLog> findByParticipant(@Param("participantId") UUID participantId);

    @Query("SELECT SUM(h.value) FROM HealthLog h WHERE h.participant.id = :participantId")
    Double getTotalProgress(@Param("participantId") UUID participantId);

    @Query("SELECT h.logDate, SUM(h.value) FROM HealthLog h WHERE h.employeeId = :employeeId " +
            "AND h.metricType = :metricType AND h.logDate BETWEEN :startDate AND :endDate " +
            "GROUP BY h.logDate ORDER BY h.logDate")
    List<Object[]> getDailyTotals(
            @Param("employeeId") UUID employeeId,
            @Param("metricType") HealthLog.MetricType metricType,
            @Param("startDate") LocalDate startDate,
            @Param("endDate") LocalDate endDate);

    @Query("SELECT AVG(h.value) FROM HealthLog h WHERE h.employeeId = :employeeId " +
            "AND h.metricType = :metricType AND h.logDate BETWEEN :startDate AND :endDate")
    Double getAverageValue(
            @Param("employeeId") UUID employeeId,
            @Param("metricType") HealthLog.MetricType metricType,
            @Param("startDate") LocalDate startDate,
            @Param("endDate") LocalDate endDate);

    @Query("SELECT COUNT(DISTINCT h.logDate) FROM HealthLog h WHERE h.participant.id = :participantId")
    long countActiveDays(@Param("participantId") UUID participantId);

    @Query("SELECT h FROM HealthLog h WHERE h.tenantId = :tenantId AND h.verified = false")
    List<HealthLog> findUnverifiedLogs(@Param("tenantId") UUID tenantId);
}
