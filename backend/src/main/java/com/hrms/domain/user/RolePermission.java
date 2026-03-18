package com.hrms.domain.user;

import com.hrms.common.entity.TenantAware;
import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.SuperBuilder;

import java.util.HashSet;
import java.util.Set;

@Entity
@Table(name = "role_permissions", indexes = {
        @Index(name = "idx_role_permission_role", columnList = "role_id"),
        @Index(name = "idx_role_permission_permission", columnList = "permission_id")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@SuperBuilder
public class RolePermission extends TenantAware {

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "role_id", nullable = false)
    private Role role;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "permission_id", nullable = false)
    private Permission permission;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    @Builder.Default
    private RoleScope scope = RoleScope.ALL;

    /**
     * Custom scope targets (only applicable when scope = CUSTOM).
     * Contains specific employees, departments, or locations this permission grants access to.
     */
    @OneToMany(mappedBy = "rolePermission", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.LAZY)
    @Builder.Default
    private Set<CustomScopeTarget> customTargets = new HashSet<>();

    @PrePersist
    private void applyTenantFromRole() {
        if (getTenantId() == null && role != null) {
            setTenantId(role.getTenantId());
        }
    }

    /**
     * Adds a custom target to this role permission.
     * Automatically sets the tenant ID from this role permission.
     */
    public void addCustomTarget(CustomScopeTarget target) {
        target.setRolePermission(this);
        if (target.getTenantId() == null) {
            target.setTenantId(this.getTenantId());
        }
        this.customTargets.add(target);
    }

    /**
     * Removes a custom target from this role permission.
     */
    public void removeCustomTarget(CustomScopeTarget target) {
        this.customTargets.remove(target);
        target.setRolePermission(null);
    }

    /**
     * Clears all custom targets from this role permission.
     */
    public void clearCustomTargets() {
        this.customTargets.clear();
    }
}
