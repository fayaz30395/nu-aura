package com.nulogic.domain.resourcemanagement;

import com.nulogic.common.entity.TenantAware;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Index;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import lombok.experimental.SuperBuilder;
import org.hibernate.annotations.SQLRestriction;

import java.time.LocalDateTime;
import java.util.UUID;

/**
 * Membership of an employee in a {@link ResourcePool}. One row per
 * (pool, employee) — unique constraint enforced at the DB level.
 */
@SQLRestriction("is_deleted = false")
@Entity
@Table(name = "resource_pool_members", indexes = {
        @Index(name = "idx_resource_pool_members_tenant", columnList = "tenantId"),
        @Index(name = "idx_resource_pool_members_pool", columnList = "poolId")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@SuperBuilder
public class ResourcePoolMember extends TenantAware {

    @Column(nullable = false)
    private UUID poolId;

    @Column(nullable = false)
    private UUID employeeId;

    @Column(nullable = false)
    private LocalDateTime joinedPoolAt;
}
