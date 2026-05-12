package com.nulogic.domain.user;

import com.nulogic.common.converter.EncryptedStringConverter;
import com.nulogic.common.entity.TenantAware;
import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.SuperBuilder;
import org.hibernate.annotations.BatchSize;
import org.hibernate.annotations.Where;

import java.time.LocalDateTime;
import java.util.HashSet;
import java.util.Set;

@Where(clause = "is_deleted = false")
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
@SuperBuilder
public class User extends TenantAware {

    @Column(nullable = false, length = 200)
    private String email;

    @Column(nullable = false, length = 100)
    private String firstName;

    @Column(length = 100)
    private String lastName;

    @com.fasterxml.jackson.annotation.JsonIgnore
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

    @com.fasterxml.jackson.annotation.JsonIgnore
    @Column
    private String passwordResetToken;

    @com.fasterxml.jackson.annotation.JsonIgnore
    @Column(name = "password_reset_token_hash", length = 255)
    private String passwordResetTokenHash;

    @Column
    private LocalDateTime passwordResetTokenExpiry;

    @Column(length = 500)
    private String profilePictureUrl;

    @Enumerated(EnumType.STRING)
    @Column(name = "auth_provider", nullable = false, length = 20)
    @Builder.Default
    private AuthProvider authProvider = AuthProvider.LOCAL;

    // MFA Fields
    @Column(nullable = false)
    @Builder.Default
    private Boolean mfaEnabled = false;

    // TOTP MFA seed — must be confidentiality-protected at rest (wall multi-tenant audit M-MFA).
    // AES-GCM encrypted at rest — V147 widened to 256.
    @com.fasterxml.jackson.annotation.JsonIgnore
    @Convert(converter = EncryptedStringConverter.class)
    @Column(name = "mfa_secret", length = 256)
    private String mfaSecret;

    @Column(name = "mfa_backup_codes", columnDefinition = "TEXT")
    private String mfaBackupCodes;

    @Column
    private LocalDateTime mfaSetupAt;

    /**
     * GDPR Article 17 fulfilment marker. Non-null indicates the row's PII
     * fields have been replaced with anonymised placeholders by the erasure
     * pipeline (owned by S9-B); the row is retained beyond that point only
     * for FK integrity and statutory retention windows (e.g. Indian Income
     * Tax Act §139A 7-year payroll retention). When set, {@link #status} is
     * forced to {@link UserStatus#INACTIVE} so login / SSO paths reject the
     * principal. Added here (rather than in S9-B's branch) because Lombok's
     * {@code @Getter}/{@code @Setter} on this class is the source of truth
     * for the accessor pair that {@code UserAnonymizer} reads/writes.
     */
    @Column(name = "anonymized_at")
    private LocalDateTime anonymizedAt;

    /**
     * User roles - loaded LAZILY to avoid N+1 and unnecessary data loading.
     *
     * <p><strong>IMPORTANT:</strong> Do NOT access this collection directly in service code.
     * Use {@link com.nulogic.infrastructure.user.repository.UserRepository#findByIdWithRolesAndPermissions}
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
    @BatchSize(size = 50)
    @Builder.Default
    private Set<Role> roles = new HashSet<>();

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

    public enum UserStatus {
        ACTIVE,
        INACTIVE,
        LOCKED,
        PENDING_ACTIVATION
    }
}
