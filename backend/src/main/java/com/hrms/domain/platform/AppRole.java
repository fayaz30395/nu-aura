package com.hrms.domain.platform;

import com.hrms.common.entity.TenantAware;
import jakarta.persistence.*;
import org.hibernate.annotations.Where;
import lombok.*;
import lombok.experimental.SuperBuilder;

import java.util.HashSet;
import java.util.Set;

/**
 * Application-specific role that can be assigned to users.
 * Roles are scoped to both tenant and application.
 * <p>
 * A user can have different roles in different applications.
 * Example: Admin in HRMS, Viewer in CRM
 */
@Where(clause = "is_deleted = false")
@Entity
@Table(name = "app_roles", indexes = {
        @Index(name = "idx_app_role_tenant", columnList = "tenantId"),
        @Index(name = "idx_app_role_app", columnList = "application_id"),
        @Index(name = "idx_app_role_code", columnList = "code")
}, uniqueConstraints = {
        @UniqueConstraint(name = "uk_app_role_code_tenant_app", columnNames = {"code", "tenantId", "application_id"})
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@SuperBuilder
public class AppRole extends TenantAware {

    /**
     * The application this role belongs to
     */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "application_id", nullable = false)
    private NuApplication application;

    /**
     * Role code (e.g., "ADMIN", "MANAGER", "EMPLOYEE")
     * Unique per tenant per application
     */
    @Column(nullable = false, length = 50)
    private String code;

    /**
     * Display name
     */
    @Column(nullable = false, length = 100)
    private String name;

    /**
     * Role description
     */
    @Column(length = 500)
    private String description;

    /**
     * Role hierarchy level (higher = more privileges)
     */
    @Column(nullable = false)
    @Builder.Default
    private Integer level = 0;

    /**
     * Whether this is a system role that cannot be modified
     */
    @Column(nullable = false)
    @Builder.Default
    private Boolean isSystemRole = false;

    /**
     * Whether this role is the default for new users in this app
     */
    @Column(nullable = false)
    @Builder.Default
    private Boolean isDefaultRole = false;

    /**
     * Permissions assigned to this role
     */
    @ManyToMany(fetch = FetchType.LAZY)
    @JoinTable(
            name = "app_role_permissions",
            joinColumns = @JoinColumn(name = "role_id"),
            inverseJoinColumns = @JoinColumn(name = "permission_id"),
            indexes = {
                    @Index(name = "idx_app_role_perm_role", columnList = "role_id"),
                    @Index(name = "idx_app_role_perm_perm", columnList = "permission_id")
            }
    )
    @Builder.Default
    private Set<AppPermission> permissions = new HashSet<>();

    /**
     * Add a permission to this role
     */
    public void addPermission(AppPermission permission) {
        if (permission.getApplication().getId().equals(this.application.getId())) {
            this.permissions.add(permission);
        } else {
            throw new IllegalArgumentException(
                    "Cannot add permission from different application. Role app: " +
                            this.application.getCode() + ", Permission app: " +
                            permission.getApplication().getCode()
            );
        }
    }

    /**
     * Remove a permission from this role
     */
    public void removePermission(AppPermission permission) {
        this.permissions.remove(permission);
    }

    /**
     * Check if role has a specific permission
     */
    public boolean hasPermission(String permissionCode) {
        return permissions.stream()
                .anyMatch(p -> p.getCode().equals(permissionCode));
    }

    /**
     * Get all permission codes for this role
     */
    public Set<String> getPermissionCodes() {
        Set<String> codes = new HashSet<>();
        for (AppPermission p : permissions) {
            codes.add(p.getCode());
        }
        return codes;
    }
}
