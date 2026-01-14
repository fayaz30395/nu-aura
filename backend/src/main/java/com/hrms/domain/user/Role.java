package com.hrms.domain.user;

import com.hrms.common.entity.TenantAware;
import jakarta.persistence.*;
import lombok.*;

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
@Builder
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

    @OneToMany(mappedBy = "role", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.EAGER)
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
