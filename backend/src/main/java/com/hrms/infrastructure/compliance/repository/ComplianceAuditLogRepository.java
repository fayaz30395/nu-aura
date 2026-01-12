package com.hrms.infrastructure.compliance.repository;

import com.hrms.domain.compliance.AuditLog;
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
public interface ComplianceAuditLogRepository extends JpaRepository<AuditLog, UUID> {

    Page<AuditLog> findByTenantIdOrderByTimestampDesc(UUID tenantId, Pageable pageable);

    @Query("SELECT a FROM ComplianceAuditLog a WHERE a.tenantId = :tenantId AND a.entityType = :entityType AND a.entityId = :entityId ORDER BY a.timestamp DESC")
    List<AuditLog> findByEntity(@Param("tenantId") UUID tenantId, @Param("entityType") String entityType, @Param("entityId") UUID entityId);

    @Query("SELECT a FROM ComplianceAuditLog a WHERE a.tenantId = :tenantId AND a.performedBy = :userId ORDER BY a.timestamp DESC")
    Page<AuditLog> findByUser(@Param("tenantId") UUID tenantId, @Param("userId") UUID userId, Pageable pageable);

    @Query("SELECT a FROM ComplianceAuditLog a WHERE a.tenantId = :tenantId AND a.action = :action ORDER BY a.timestamp DESC")
    Page<AuditLog> findByAction(@Param("tenantId") UUID tenantId, @Param("action") AuditLog.AuditAction action, Pageable pageable);

    @Query("SELECT a FROM ComplianceAuditLog a WHERE a.tenantId = :tenantId AND a.timestamp BETWEEN :startDate AND :endDate ORDER BY a.timestamp DESC")
    Page<AuditLog> findByDateRange(@Param("tenantId") UUID tenantId, @Param("startDate") LocalDateTime startDate, @Param("endDate") LocalDateTime endDate, Pageable pageable);

    @Query("SELECT a FROM ComplianceAuditLog a WHERE a.tenantId = :tenantId AND a.severity IN ('HIGH', 'CRITICAL') ORDER BY a.timestamp DESC")
    List<AuditLog> findHighSeverityLogs(@Param("tenantId") UUID tenantId, Pageable pageable);

    @Query("SELECT a.action, COUNT(a) FROM ComplianceAuditLog a WHERE a.tenantId = :tenantId AND a.timestamp >= :since GROUP BY a.action")
    List<Object[]> countByAction(@Param("tenantId") UUID tenantId, @Param("since") LocalDateTime since);
}
