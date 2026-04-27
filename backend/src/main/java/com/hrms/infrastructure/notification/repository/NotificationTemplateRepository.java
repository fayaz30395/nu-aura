package com.hrms.infrastructure.notification.repository;

import com.hrms.domain.notification.NotificationTemplate;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface NotificationTemplateRepository extends JpaRepository<NotificationTemplate, UUID> {

    Optional<NotificationTemplate> findByCodeAndTenantId(String code, UUID tenantId);

    Optional<NotificationTemplate> findByEventTypeAndTenantId(String eventType, UUID tenantId);

    List<NotificationTemplate> findByCategoryAndIsActiveAndTenantId(String category, Boolean isActive, UUID tenantId);

    List<NotificationTemplate> findByIsActiveAndTenantId(Boolean isActive, UUID tenantId);

    Page<NotificationTemplate> findByTenantId(UUID tenantId, Pageable pageable);

    // FIX: PostgreSQL cannot infer parameter type for LOWER(:search) when :search is null
    // (raises "function lower(bytea) does not exist"). Use native query with explicit
    // text casts so the binding type is unambiguous.
    @Query(value = "SELECT * FROM notification_templates t " +
            "WHERE t.is_deleted = false AND t.tenant_id = :tenantId AND t.is_active = true " +
            "AND (CAST(:category AS text) IS NULL OR t.category = CAST(:category AS text)) " +
            "AND (CAST(:search AS text) IS NULL " +
            "     OR LOWER(t.name) LIKE LOWER(CONCAT('%', CAST(:search AS text), '%')) " +
            "     OR LOWER(t.code) LIKE LOWER(CONCAT('%', CAST(:search AS text), '%')))",
            countQuery = "SELECT COUNT(*) FROM notification_templates t " +
                    "WHERE t.is_deleted = false AND t.tenant_id = :tenantId AND t.is_active = true " +
                    "AND (CAST(:category AS text) IS NULL OR t.category = CAST(:category AS text)) " +
                    "AND (CAST(:search AS text) IS NULL " +
                    "     OR LOWER(t.name) LIKE LOWER(CONCAT('%', CAST(:search AS text), '%')) " +
                    "     OR LOWER(t.code) LIKE LOWER(CONCAT('%', CAST(:search AS text), '%')))",
            nativeQuery = true)
    Page<NotificationTemplate> searchTemplates(
            @Param("tenantId") UUID tenantId,
            @Param("category") String category,
            @Param("search") String search,
            Pageable pageable);

    List<NotificationTemplate> findByIsSystemTemplateAndTenantId(Boolean isSystemTemplate, UUID tenantId);

    boolean existsByCodeAndTenantId(String code, UUID tenantId);
}
