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

    @ManyToMany(fetch = FetchType.EAGER)
    @JoinTable(
        name = "role_permissions",
        joinColumns = @JoinColumn(name = "role_id"),
        inverseJoinColumns = @JoinColumn(name = "permission_id"),
        indexes = {
            @Index(name = "idx_role_permissions_role", columnList = "role_id"),
            @Index(name = "idx_role_permissions_permission", columnList = "permission_id")
        }
    )
    @Builder.Default
    private Set<Permission> permissions = new HashSet<>();

    public void addPermission(Permission permission) {
        this.permissions.add(permission);
    }

    public void removePermission(Permission permission) {
        this.permissions.remove(permission);
    }
}
