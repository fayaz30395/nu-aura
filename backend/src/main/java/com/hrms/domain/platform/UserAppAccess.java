package com.hrms.domain.platform;

import com.hrms.common.entity.TenantAware;
import com.hrms.domain.user.User;
import jakarta.persistence.*;
import org.hibernate.annotations.Where;
import lombok.*;
import lombok.experimental.SuperBuilder;

import java.time.LocalDateTime;
import java.util.HashSet;
import java.util.Set;
import java.util.stream.Collectors;
import java.util.UUID;

/**
 * Represents a user's access to a specific NU application.
 * This is the link between User, Application, and App-specific Roles.
 * <p>
 * A single user can have access to multiple applications with different roles.
 */
@Where(clause = "is_deleted = false")
@Entity
@Table(name = "user_app_access", indexes = {
        @Index(name = "idx_user_app_user", columnList = "user_id"),
        @Index(name = "idx_user_app_app", columnList = "application_id"),
        @Index(name = "idx_user_app_tenant", columnList = "tenantId"),
        @Index(name = "idx_user_app_status", columnList = "status")
}, uniqueConstraints = {
        @UniqueConstraint(name = "uk_user_app_access", columnNames = {"user_id", "application_id"})
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@SuperBuilder
public class UserAppAccess extends TenantAware {

    /**
     * The user this access record belongs to
     */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    /**
     * The application this access is for
     */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "application_id", nullable = false)
    private NuApplication application;

    /**
     * Access status
     */
    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    @Builder.Default
    private AccessStatus status = AccessStatus.ACTIVE;

    /**
     * When access was granted
     */
    @Column(nullable = false)
    @Builder.Default
    private LocalDateTime grantedAt = LocalDateTime.now();

    /**
     * Who granted the access (admin user ID)
     */
    @Column
    private UUID grantedBy;

    /**
     * When the user last accessed this application
     */
    @Column
    private LocalDateTime lastAccessedAt;

    /**
     * Roles the user has in this application
     */
    @ManyToMany(fetch = FetchType.LAZY)
    @JoinTable(
            name = "user_app_roles",
            joinColumns = @JoinColumn(name = "user_app_access_id"),
            inverseJoinColumns = @JoinColumn(name = "role_id"),
            indexes = {
                    @Index(name = "idx_user_app_roles_access", columnList = "user_app_access_id"),
                    @Index(name = "idx_user_app_roles_role", columnList = "role_id")
            }
    )
    @Builder.Default
    private Set<AppRole> roles = new HashSet<>();

    /**
     * Custom permissions directly assigned (beyond role permissions)
     */
    @ManyToMany(fetch = FetchType.LAZY)
    @JoinTable(
            name = "user_app_direct_permissions",
            joinColumns = @JoinColumn(name = "user_app_access_id"),
            inverseJoinColumns = @JoinColumn(name = "permission_id"),
            indexes = {
                    @Index(name = "idx_user_app_direct_perm_access", columnList = "user_app_access_id"),
                    @Index(name = "idx_user_app_direct_perm_perm", columnList = "permission_id")
            }
    )
    @Builder.Default
    private Set<AppPermission> directPermissions = new HashSet<>();

    /**
     * Add a role to this user's access
     */
    public void addRole(AppRole role) {
        if (!role.getApplication().getId().equals(this.application.getId())) {
            throw new IllegalArgumentException(
                    "Cannot add role from different application. Access app: " +
                            this.application.getCode() + ", Role app: " +
                            role.getApplication().getCode()
            );
        }
        this.roles.add(role);
    }

    /**
     * Remove a role from this user's access
     */
    public void removeRole(AppRole role) {
        this.roles.remove(role);
    }

    /**
     * Add a direct permission (not through role)
     */
    public void addDirectPermission(AppPermission permission) {
        if (!permission.getApplication().getId().equals(this.application.getId())) {
            throw new IllegalArgumentException(
                    "Cannot add permission from different application. Access app: " +
                            this.application.getCode() + ", Permission app: " +
                            permission.getApplication().getCode()
            );
        }
        this.directPermissions.add(permission);
    }

    /**
     * Remove a direct permission
     */
    public void removeDirectPermission(AppPermission permission) {
        this.directPermissions.remove(permission);
    }

    /**
     * Get all effective permissions (from roles + direct)
     */
    public Set<String> getAllPermissions() {
        Set<String> allPerms = new HashSet<>();

        // Add permissions from roles
        for (AppRole role : roles) {
            allPerms.addAll(role.getPermissionCodes());
        }

        // Add direct permissions
        for (AppPermission perm : directPermissions) {
            allPerms.add(perm.getCode());
        }

        return allPerms;
    }

    /**
     * Check if user has a specific permission in this application
     */
    public boolean hasPermission(String permissionCode) {
        // Check direct permissions
        if (directPermissions.stream().anyMatch(p -> p.getCode().equals(permissionCode))) {
            return true;
        }

        // Check role permissions
        for (AppRole role : roles) {
            if (role.hasPermission(permissionCode)) {
                return true;
            }
        }

        return false;
    }

    /**
     * Check if access is currently valid
     */
    public boolean isValid() {
        return status == AccessStatus.ACTIVE;
    }

    /**
     * Record an access to this application
     */
    public void recordAccess() {
        this.lastAccessedAt = LocalDateTime.now();
    }

    /**
     * Get role codes for this access
     */
    public Set<String> getRoleCodes() {
        return roles.stream()
                .map(AppRole::getCode)
                .collect(Collectors.toSet());
    }

    /**
     * Get highest role level (for hierarchy checks)
     */
    public int getHighestRoleLevel() {
        return roles.stream()
                .mapToInt(AppRole::getLevel)
                .max()
                .orElse(0);
    }

    public enum AccessStatus {
        ACTIVE,           // Currently has access
        SUSPENDED,        // Temporarily suspended
        REVOKED,          // Access revoked
        PENDING_APPROVAL  // Waiting for approval
    }
}
