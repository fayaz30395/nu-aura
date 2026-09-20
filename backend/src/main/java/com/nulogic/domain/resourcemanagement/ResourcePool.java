package com.nulogic.domain.resourcemanagement;

import com.nulogic.common.entity.TenantAware;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Index;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import lombok.experimental.SuperBuilder;
import org.hibernate.annotations.SQLRestriction;

/**
 * A lightweight grouping of employees for shared or exclusive resource
 * allocation (UC-RESOURCE-006). Backs {@code ResourcePoolController}, gated
 * behind {@code app.features.resource-pools}.
 */
@SQLRestriction("is_deleted = false")
@Entity
@Table(name = "resource_pools", indexes = {
        @Index(name = "idx_resource_pools_tenant", columnList = "tenantId")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@SuperBuilder
public class ResourcePool extends TenantAware {

    @Column(nullable = false, length = 200)
    private String name;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private PoolType poolType;

    @Column(nullable = false)
    @Builder.Default
    private Boolean isActive = true;

    public enum PoolType {
        SHARED,
        EXCLUSIVE
    }
}
