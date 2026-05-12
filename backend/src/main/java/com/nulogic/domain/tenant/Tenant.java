package com.nulogic.domain.tenant;

import com.nulogic.common.entity.BaseEntity;
import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.SuperBuilder;
import org.hibernate.annotations.Where;

@Where(clause = "is_deleted = false")
@Entity
@Table(name = "tenants", indexes = {
        @Index(name = "idx_tenant_code", columnList = "code", unique = true),
        @Index(name = "idx_tenant_status", columnList = "status")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@SuperBuilder
public class Tenant extends BaseEntity {

    @Column(nullable = false, unique = true, length = 50)
    private String code;

    @Column(nullable = false, length = 200)
    private String name;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private TenantStatus status;

    @Column(length = 500)
    private String description;

    @Column(length = 100)
    private String contactEmail;

    @Column(length = 20)
    private String contactPhone;

    @Column(columnDefinition = "TEXT")
    private String settings;

    // ISO 3166-1 alpha-2 country code — drives multi-jurisdiction routing (statutory engine etc.).
    // V155 backfills 'IN' for legacy rows and enforces NOT NULL + ^[A-Z]{2}$ check.
    @Column(name = "country", nullable = false, length = 2)
    @Builder.Default
    private String country = "IN";

    // IANA timezone identifier — drives per-tenant local-time resolution (attendance, payroll
    // cutoffs, leave accrual). V165 backfills 'Asia/Kolkata' for legacy rows and enforces
    // NOT NULL + regex shape check. TenantTimeService is the canonical resolver and falls back
    // to Asia/Kolkata on parse failure so a bad value cannot crash scheduled jobs.
    @Column(name = "timezone", nullable = false, length = 40)
    @Builder.Default
    private String timezone = "Asia/Kolkata";

    public void activate() {
        if (this.status == TenantStatus.PENDING_ACTIVATION || this.status == TenantStatus.SUSPENDED) {
            this.status = TenantStatus.ACTIVE;
        } else {
            throw new IllegalStateException("Cannot activate tenant in status: " + this.status);
        }
    }

    public void suspend() {
        if (this.status == TenantStatus.ACTIVE) {
            this.status = TenantStatus.SUSPENDED;
        } else {
            throw new IllegalStateException("Cannot suspend tenant in status: " + this.status);
        }
    }

    public enum TenantStatus {
        ACTIVE,
        SUSPENDED,
        INACTIVE,
        PENDING_ACTIVATION
    }
}
