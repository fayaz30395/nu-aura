package com.hrms.domain.tenant;

import com.hrms.common.entity.BaseEntity;
import jakarta.persistence.*;
import org.hibernate.annotations.SQLRestriction;
import lombok.*;
import lombok.experimental.SuperBuilder;

@SQLRestriction("is_deleted = false")
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
