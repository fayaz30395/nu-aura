package com.hrms.domain.user;

import com.hrms.common.entity.TenantAware;
import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "role_permissions", indexes = {
        @Index(name = "idx_role_permission_role", columnList = "role_id"),
        @Index(name = "idx_role_permission_permission", columnList = "permission_id")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class RolePermission extends TenantAware {

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "role_id", nullable = false)
    private Role role;

    @ManyToOne(fetch = FetchType.EAGER) // Permission metadata is usually small and needed
    @JoinColumn(name = "permission_id", nullable = false)
    private Permission permission;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    @Builder.Default
    private RoleScope scope = RoleScope.GLOBAL;

    @PrePersist
    private void applyTenantFromRole() {
        if (getTenantId() == null && role != null) {
            setTenantId(role.getTenantId());
        }
    }
}
