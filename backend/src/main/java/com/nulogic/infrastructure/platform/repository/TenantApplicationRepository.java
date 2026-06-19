package com.nulogic.infrastructure.platform.repository;

import com.nulogic.domain.platform.TenantApplication;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface TenantApplicationRepository extends JpaRepository<TenantApplication, UUID> {

    /**
     * Find tenant's subscription to an application
     */
    Optional<TenantApplication> findByTenantIdAndApplicationId(UUID tenantId, UUID applicationId);

    @Modifying
    @Transactional
    @Query(
            value = """
            INSERT INTO tenant_applications (
              tenant_id,
              application_id,
              status,
              activated_at,
              subscription_tier,
              max_users,
              is_deleted,
              created_at,
              updated_at,
              version
            ) VALUES (
              :tenantId,
              :applicationId,
              :status,
              :activatedAt,
              :subscriptionTier,
              :maxUsers,
              false,
              :now,
              :now,
              0
            )
            ON CONFLICT (tenant_id, application_id)
            DO UPDATE SET
              status = EXCLUDED.status,
              activated_at = EXCLUDED.activated_at,
              subscription_tier = EXCLUDED.subscription_tier,
              max_users = EXCLUDED.max_users,
              is_deleted = false,
              updated_at = EXCLUDED.updated_at
            """,
            nativeQuery = true
    )
    int upsertTenantApplication(
            @Param("tenantId") UUID tenantId,
            @Param("applicationId") UUID applicationId,
            @Param("status") String status,
            @Param("activatedAt") LocalDateTime activatedAt,
            @Param("subscriptionTier") String subscriptionTier,
            @Param("maxUsers") Integer maxUsers,
            @Param("now") LocalDateTime now
    );

    /**
     * Find by tenant and app code
     */
    @Query("SELECT ta FROM TenantApplication ta JOIN ta.application a " +
            "WHERE ta.tenantId = :tenantId AND a.code = :appCode")
    Optional<TenantApplication> findByTenantIdAndApplicationCode(
            @Param("tenantId") UUID tenantId,
            @Param("appCode") String appCode
    );

    /**
     * Find all subscriptions for a tenant
     */
    List<TenantApplication> findByTenantIdOrderByApplicationDisplayOrderAsc(UUID tenantId);

    /**
     * Find active subscriptions for a tenant
     */
    @Query("SELECT ta FROM TenantApplication ta JOIN FETCH ta.application a " +
            "WHERE ta.tenantId = :tenantId AND ta.status IN ('ACTIVE', 'TRIAL') " +
            "ORDER BY a.displayOrder ASC")
    List<TenantApplication> findActiveByTenantId(@Param("tenantId") UUID tenantId);

    /**
     * Check if tenant has active subscription to an application
     */
    @Query("SELECT CASE WHEN COUNT(ta) > 0 THEN true ELSE false END " +
            "FROM TenantApplication ta JOIN ta.application a " +
            "WHERE ta.tenantId = :tenantId AND a.code = :appCode " +
            "AND ta.status IN ('ACTIVE', 'TRIAL')")
    boolean hasActiveSubscription(@Param("tenantId") UUID tenantId, @Param("appCode") String appCode);

    /**
     * Find all tenants subscribed to an application
     */
    List<TenantApplication> findByApplicationIdAndStatus(
            UUID applicationId,
            TenantApplication.SubscriptionStatus status
    );

    /**
     * Count tenants per application
     */
    @Query("SELECT a.code, COUNT(ta) FROM TenantApplication ta JOIN ta.application a " +
            "WHERE ta.status IN ('ACTIVE', 'TRIAL') GROUP BY a.code")
    List<Object[]> countTenantsPerApplication();
}
