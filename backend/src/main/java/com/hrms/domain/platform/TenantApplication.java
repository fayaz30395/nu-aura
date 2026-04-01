package com.hrms.domain.platform;

import com.hrms.common.entity.TenantAware;
import jakarta.persistence.*;
import org.hibernate.annotations.Where;
import lombok.*;
import lombok.experimental.SuperBuilder;

import java.time.LocalDate;
import java.time.LocalDateTime;

/**
 * Represents a tenant's subscription/access to an NU application.
 * Controls which applications are enabled for each tenant.
 */
@Where(clause = "is_deleted = false")
@Entity
@Table(name = "tenant_applications", indexes = {
    @Index(name = "idx_tenant_app_tenant", columnList = "tenantId"),
    @Index(name = "idx_tenant_app_app", columnList = "application_id"),
    @Index(name = "idx_tenant_app_status", columnList = "status")
}, uniqueConstraints = {
    @UniqueConstraint(name = "uk_tenant_app", columnNames = {"tenantId", "application_id"})
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@SuperBuilder
public class TenantApplication extends TenantAware {

    /**
     * The application this subscription is for
     */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "application_id", nullable = false)
    private NuApplication application;

    /**
     * Subscription status for this tenant
     */
    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    @Builder.Default
    private SubscriptionStatus status = SubscriptionStatus.ACTIVE;

    /**
     * When this subscription was activated
     */
    @Column
    private LocalDateTime activatedAt;

    /**
     * Subscription expiry date (null = never expires)
     */
    @Column
    private LocalDate expiresAt;

    /**
     * Subscription tier/plan
     */
    @Column(length = 50)
    private String subscriptionTier;

    /**
     * Maximum number of users allowed (null = unlimited)
     */
    @Column
    private Integer maxUsers;

    /**
     * Custom configuration as JSON
     */
    @Column(columnDefinition = "TEXT")
    private String configuration;

    public enum SubscriptionStatus {
        ACTIVE,           // Currently active
        TRIAL,            // Trial period
        SUSPENDED,        // Temporarily suspended
        EXPIRED,          // Subscription expired
        CANCELLED         // Cancelled by tenant
    }

    /**
     * Check if this subscription is currently valid
     */
    public boolean isValid() {
        if (status != SubscriptionStatus.ACTIVE && status != SubscriptionStatus.TRIAL) {
            return false;
        }
        if (expiresAt != null && expiresAt.isBefore(LocalDate.now())) {
            return false;
        }
        return true;
    }
}
