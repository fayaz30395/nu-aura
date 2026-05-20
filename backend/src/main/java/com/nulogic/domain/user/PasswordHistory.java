package com.nulogic.domain.user;

import jakarta.persistence.*;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "password_history")
public class PasswordHistory {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "user_id", nullable = false)
    private UUID userId;

    @Column(name = "tenant_id", nullable = false)
    private UUID tenantId;

    @Column(name = "password_hash", nullable = false)
    private String passwordHash;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt = LocalDateTime.now(); // JVM-local: entity-layer; push to service per docs/architecture/tenant-time-wave-13-summary.md if cross-region zone correctness is needed

    protected PasswordHistory() {
    }

    public PasswordHistory(UUID userId, UUID tenantId, String passwordHash) {
        this.userId = userId;
        this.tenantId = tenantId;
        this.passwordHash = passwordHash;
        this.createdAt = LocalDateTime.now(); // JVM-local: entity-layer; push to service per docs/architecture/tenant-time-wave-13-summary.md if cross-region zone correctness is needed
    }

    public Long getId() {
        return id;
    }

    public UUID getUserId() {
        return userId;
    }

    public UUID getTenantId() {
        return tenantId;
    }

    public String getPasswordHash() {
        return passwordHash;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }
}
