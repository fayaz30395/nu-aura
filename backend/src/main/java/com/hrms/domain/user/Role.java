package com.hrms.domain.user;

import com.hrms.common.entity.TenantAware;
import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.SuperBuilder;

import java.util.HashSet;
import java.util.Set;

@Entity
@Table(name = "roles", indexes = {
        @Index(name = "idx_role_code_tenant", columnList = "code,tenantId", unique = true),
        @Index(name = "idx_role_tenant", columnList = "tenantId")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@SuperBuilder
public class Role extends TenantAware {

    @Column(nullable = false, length = 50)
    private String code;

    @Column(nullable = false, length = 100)
    private String name;

    @Column(length = 500)
    private String description;

    @Column(nullable = false)
    @Builder.Default
    private Boolean isSystemRole = false;

    /**
     * Role permissions - loaded LAZILY to avoid cascading eager loads.
     *
     * <p><strong>IMPORTANT:</strong> Always use explicit fetch queries when accessing permissions.
     * Use {@link com.hrms.infrastructure.user.repository.UserRepository#findByIdWithRolesAndPermissions}
     * to load the full user -> roles -> permissions hierarchy efficiently.</p>
     */
    @OneToMany(mappedBy = "role", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.LAZY)
    @Builder.Default
    private Set<RolePermission> permissions = new HashSet<>();

    public RolePermission addPermission(Permission permission, RoleScope scope) {
        RolePermission rolePermission = RolePermission.builder()
                .role(this)
                .permission(permission)
                .scope(scope)
                .build();
        rolePermission.setTenantId(getTenantId());
        this.permissions.add(rolePermission);
        return rolePermission;
    }

    public void removePermission(Permission permission) {
        this.permissions.removeIf(rp -> rp.getPermission().equals(permission));
    }
}
