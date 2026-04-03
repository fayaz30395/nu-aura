package com.hrms.infrastructure.audit.repository;

import com.hrms.domain.audit.AuditLog;
import com.hrms.domain.audit.AuditLog.AuditAction;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Repository
public interface AuditLogRepository extends JpaRepository<AuditLog, UUID>, JpaSpecificationExecutor<AuditLog> {

    // Tenant-aware queries
    Page<AuditLog> findAllByTenantIdOrderByCreatedAtDesc(UUID tenantId, Pageable pageable);

    Page<AuditLog> findByTenantIdAndEntityTypeOrderByCreatedAtDesc(UUID tenantId, String entityType, Pageable pageable);

    Page<AuditLog> findByTenantIdAndEntityTypeAndEntityIdOrderByCreatedAtDesc(
            UUID tenantId, String entityType, UUID entityId, Pageable pageable);

    Page<AuditLog> findByTenantIdAndActorIdOrderByCreatedAtDesc(UUID tenantId, UUID actorId, Pageable pageable);

    Page<AuditLog> findByTenantIdAndActionOrderByCreatedAtDesc(UUID tenantId, AuditAction action, Pageable pageable);

    // Date range queries
    @Query("SELECT a FROM AuditLog a WHERE a.tenantId = :tenantId AND a.createdAt BETWEEN :startDate AND :endDate ORDER BY a.createdAt DESC")
    Page<AuditLog> findByTenantIdAndDateRange(
            @Param("tenantId") UUID tenantId,
            @Param("startDate") LocalDateTime startDate,
            @Param("endDate") LocalDateTime endDate,
            Pageable pageable);

    // Combined filters
    @Query("SELECT a FROM AuditLog a WHERE a.tenantId = :tenantId " +
            "AND (:entityType IS NULL OR a.entityType = :entityType) " +
            "AND (:action IS NULL OR a.action = :action) " +
            "AND (:actorId IS NULL OR a.actorId = :actorId) " +
            "AND (:startDate IS NULL OR a.createdAt >= :startDate) " +
            "AND (:endDate IS NULL OR a.createdAt <= :endDate) " +
            "ORDER BY a.createdAt DESC")
    Page<AuditLog> searchAuditLogs(
            @Param("tenantId") UUID tenantId,
            @Param("entityType") String entityType,
            @Param("action") AuditAction action,
            @Param("actorId") UUID actorId,
            @Param("startDate") LocalDateTime startDate,
            @Param("endDate") LocalDateTime endDate,
            Pageable pageable);

    // Recent audit logs for an entity
    List<AuditLog> findTop10ByTenantIdAndEntityTypeAndEntityIdOrderByCreatedAtDesc(
            UUID tenantId, String entityType, UUID entityId);

    // Statistics
    @Query("SELECT COUNT(a) FROM AuditLog a WHERE a.tenantId = :tenantId AND a.createdAt BETWEEN :startDate AND :endDate")
    long countByTenantIdAndDateRange(
            @Param("tenantId") UUID tenantId,
            @Param("startDate") LocalDateTime startDate,
            @Param("endDate") LocalDateTime endDate);

    @Query("SELECT a.action, COUNT(a) FROM AuditLog a WHERE a.tenantId = :tenantId " +
            "AND a.createdAt BETWEEN :startDate AND :endDate GROUP BY a.action")
    List<Object[]> countByActionForDateRange(
            @Param("tenantId") UUID tenantId,
            @Param("startDate") LocalDateTime startDate,
            @Param("endDate") LocalDateTime endDate);

    @Query("SELECT a.entityType, COUNT(a) FROM AuditLog a WHERE a.tenantId = :tenantId " +
            "AND a.createdAt BETWEEN :startDate AND :endDate GROUP BY a.entityType ORDER BY COUNT(a) DESC")
    List<Object[]> countByEntityTypeForDateRange(
            @Param("tenantId") UUID tenantId,
            @Param("startDate") LocalDateTime startDate,
            @Param("endDate") LocalDateTime endDate);

    @Query("SELECT a.actorId, a.actorEmail, COUNT(a) FROM AuditLog a WHERE a.tenantId = :tenantId " +
            "AND a.createdAt BETWEEN :startDate AND :endDate GROUP BY a.actorId, a.actorEmail ORDER BY COUNT(a) DESC")
    List<Object[]> countByActorForDateRange(
            @Param("tenantId") UUID tenantId,
            @Param("startDate") LocalDateTime startDate,
            @Param("endDate") LocalDateTime endDate);

    @Query("SELECT DATE(a.createdAt), COUNT(a) FROM AuditLog a WHERE a.tenantId = :tenantId " +
            "AND a.createdAt BETWEEN :startDate AND :endDate GROUP BY DATE(a.createdAt) ORDER BY DATE(a.createdAt)")
    List<Object[]> countByDayForDateRange(
            @Param("tenantId") UUID tenantId,
            @Param("startDate") LocalDateTime startDate,
            @Param("endDate") LocalDateTime endDate);

    // Security-related queries
    @Query("SELECT a FROM AuditLog a WHERE a.tenantId = :tenantId " +
            "AND a.action IN ('LOGIN', 'LOGOUT', 'PASSWORD_CHANGE', 'PERMISSION_CHANGE') " +
            "AND a.createdAt BETWEEN :startDate AND :endDate ORDER BY a.createdAt DESC")
    Page<AuditLog> findSecurityEvents(
            @Param("tenantId") UUID tenantId,
            @Param("startDate") LocalDateTime startDate,
            @Param("endDate") LocalDateTime endDate,
            Pageable pageable);

    // Failed actions (for compliance)
    @Query("SELECT a FROM AuditLog a WHERE a.tenantId = :tenantId " +
            "AND a.changes LIKE '%failed%' OR a.changes LIKE '%error%' " +
            "ORDER BY a.createdAt DESC")
    Page<AuditLog> findFailedActions(@Param("tenantId") UUID tenantId, Pageable pageable);

    // Count by tenant
    long countByTenantId(UUID tenantId);

    long countByTenantIdAndEntityType(UUID tenantId, String entityType);

    long countByTenantIdAndActorId(UUID tenantId, UUID actorId);

    // Legacy queries (kept for backward compatibility)
    Page<AuditLog> findByEntityTypeAndEntityIdOrderByCreatedAtDesc(String entityType, UUID entityId, Pageable pageable);

    Page<AuditLog> findByActorIdOrderByCreatedAtDesc(UUID actorId, Pageable pageable);

    Page<AuditLog> findByEntityTypeOrderByCreatedAtDesc(String entityType, Pageable pageable);

    Page<AuditLog> findByActionOrderByCreatedAtDesc(AuditAction action, Pageable pageable);

    @Query("SELECT a FROM AuditLog a WHERE a.createdAt BETWEEN :startDate AND :endDate ORDER BY a.createdAt DESC")
    Page<AuditLog> findByDateRange(@Param("startDate") LocalDateTime startDate, @Param("endDate") LocalDateTime endDate, Pageable pageable);

    Page<AuditLog> findByEntityTypeAndActionOrderByCreatedAtDesc(String entityType, AuditAction action, Pageable pageable);

    List<AuditLog> findTop10ByEntityTypeAndEntityIdOrderByCreatedAtDesc(String entityType, UUID entityId);

    long countByEntityType(String entityType);

    long countByActorId(UUID actorId);
}
