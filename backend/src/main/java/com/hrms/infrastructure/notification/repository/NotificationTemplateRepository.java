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

    @Query("SELECT t FROM NotificationTemplate t WHERE t.tenantId = :tenantId AND t.isActive = true " +
            "AND (:category IS NULL OR t.category = :category) " +
            "AND (:search IS NULL OR LOWER(t.name) LIKE LOWER(CONCAT('%', :search, '%')) " +
            "OR LOWER(t.code) LIKE LOWER(CONCAT('%', :search, '%')))")
    Page<NotificationTemplate> searchTemplates(
            @Param("tenantId") UUID tenantId,
            @Param("category") String category,
            @Param("search") String search,
            Pageable pageable);

    List<NotificationTemplate> findByIsSystemTemplateAndTenantId(Boolean isSystemTemplate, UUID tenantId);

    boolean existsByCodeAndTenantId(String code, UUID tenantId);
}
