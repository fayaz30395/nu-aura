package com.hrms.infrastructure.attendance.repository;

import com.hrms.domain.attendance.BiometricPunchLog;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Repository
public interface BiometricPunchLogRepository extends JpaRepository<BiometricPunchLog, UUID> {

    Page<BiometricPunchLog> findByDeviceIdAndTenantIdOrderByPunchTimeDesc(
            UUID deviceId, UUID tenantId, Pageable pageable);

    List<BiometricPunchLog> findByProcessedStatusAndTenantId(
            BiometricPunchLog.ProcessedStatus status, UUID tenantId);

    Page<BiometricPunchLog> findByProcessedStatusAndTenantIdOrderByPunchTimeAsc(
            BiometricPunchLog.ProcessedStatus status, UUID tenantId, Pageable pageable);

    /**
     * Check for duplicate punches: same employee, same tenant, punch within the dedup window.
     */
    @Query("SELECT COUNT(p) > 0 FROM BiometricPunchLog p " +
            "WHERE p.tenantId = :tenantId " +
            "AND p.employeeId = :employeeId " +
            "AND p.punchTime BETWEEN :windowStart AND :windowEnd " +
            "AND p.processedStatus <> 'DUPLICATE'")
    boolean existsDuplicatePunch(
            @Param("tenantId") UUID tenantId,
            @Param("employeeId") UUID employeeId,
            @Param("windowStart") LocalDateTime windowStart,
            @Param("windowEnd") LocalDateTime windowEnd);

    @Query("SELECT COUNT(p) FROM BiometricPunchLog p " +
            "WHERE p.deviceId = :deviceId AND p.tenantId = :tenantId " +
            "AND p.processedStatus = :status " +
            "AND p.punchTime >= :since")
    long countByDeviceAndStatusSince(
            @Param("deviceId") UUID deviceId,
            @Param("tenantId") UUID tenantId,
            @Param("status") BiometricPunchLog.ProcessedStatus status,
            @Param("since") LocalDateTime since);

    List<BiometricPunchLog> findByProcessedStatusInAndTenantId(
            List<BiometricPunchLog.ProcessedStatus> statuses, UUID tenantId);

    Page<BiometricPunchLog> findByTenantIdAndPunchTimeBetweenOrderByPunchTimeDesc(
            UUID tenantId, LocalDateTime start, LocalDateTime end, Pageable pageable);

    /**
     * Find all pending punches across all tenants (for scheduled processing).
     */
    @Query("SELECT p FROM BiometricPunchLog p WHERE p.processedStatus = :status ORDER BY p.punchTime ASC")
    List<BiometricPunchLog> findAllByProcessedStatus(
            @Param("status") BiometricPunchLog.ProcessedStatus status, Pageable pageable);
}
