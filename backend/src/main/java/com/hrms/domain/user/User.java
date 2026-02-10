package com.hrms.domain.user;

import com.hrms.common.entity.TenantAware;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;
import java.util.HashSet;
import java.util.Set;

@Entity
@Table(name = "users", indexes = {
    @Index(name = "idx_user_email_tenant", columnList = "email,tenantId", unique = true),
    @Index(name = "idx_user_tenant", columnList = "tenantId"),
    @Index(name = "idx_user_status", columnList = "status")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class User extends TenantAware {

    @Column(nullable = false, length = 200)
    private String email;

    @Column(nullable = false, length = 100)
    private String firstName;

    @Column(length = 100)
    private String lastName;

    @Column(nullable = false)
    private String passwordHash;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private UserStatus status;

    @Column
    private LocalDateTime lastLoginAt;

    @Column
    private LocalDateTime passwordChangedAt;

    @Column
    private Integer failedLoginAttempts;

    @Column
    private LocalDateTime lockedUntil;

    @Column
    private String passwordResetToken;

    @Column
    private LocalDateTime passwordResetTokenExpiry;

    /**
     * User roles - loaded LAZILY to avoid N+1 and unnecessary data loading.
     *
     * <p><strong>IMPORTANT:</strong> Do NOT access this collection directly in service code.
     * Use {@link com.hrms.infrastructure.user.repository.UserRepository#findByIdWithRolesAndPermissions}
     * to load roles with permissions in a single optimized query.</p>
     *
     * <p>Direct access will trigger lazy loading which may cause:
     * <ul>
     *   <li>LazyInitializationException if session is closed</li>
     *   <li>N+1 queries if accessed in a loop</li>
     * </ul></p>
     */
    @ManyToMany(fetch = FetchType.LAZY)
    @JoinTable(
        name = "user_roles",
        joinColumns = @JoinColumn(name = "user_id"),
        inverseJoinColumns = @JoinColumn(name = "role_id"),
        indexes = {
            @Index(name = "idx_user_roles_user", columnList = "user_id"),
            @Index(name = "idx_user_roles_role", columnList = "role_id")
        }
    )
    @Builder.Default
    private Set<Role> roles = new HashSet<>();

    public enum UserStatus {
        ACTIVE,
        INACTIVE,
        LOCKED,
        PENDING_ACTIVATION
    }

    public String getFullName() {
        return firstName + (lastName != null ? " " + lastName : "");
    }

    public void activate() {
        if (this.status == UserStatus.PENDING_ACTIVATION || this.status == UserStatus.INACTIVE) {
            this.status = UserStatus.ACTIVE;
        } else {
            throw new IllegalStateException("Cannot activate user in status: " + this.status);
        }
    }

    public void lock() {
        this.status = UserStatus.LOCKED;
        this.lockedUntil = LocalDateTime.now().plusHours(24);
    }

    public void unlock() {
        if (this.status == UserStatus.LOCKED) {
            this.status = UserStatus.ACTIVE;
            this.lockedUntil = null;
            this.failedLoginAttempts = 0;
        }
    }

    public void recordFailedLogin() {
        this.failedLoginAttempts = (this.failedLoginAttempts == null ? 0 : this.failedLoginAttempts) + 1;
        if (this.failedLoginAttempts >= 5) {
            lock();
        }
    }

    public void recordSuccessfulLogin() {
        this.lastLoginAt = LocalDateTime.now();
        this.failedLoginAttempts = 0;
        this.lockedUntil = null;
    }
}
