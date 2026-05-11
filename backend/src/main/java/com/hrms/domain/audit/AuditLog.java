package com.hrms.domain.audit;

import com.hrms.common.entity.TenantAware;
import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.SuperBuilder;

import java.util.UUID;

@Entity
@Table(name = "audit_logs", indexes = {
        @Index(name = "idx_audit_tenant", columnList = "tenantId"),
        @Index(name = "idx_audit_entity", columnList = "entityType,entityId"),
        @Index(name = "idx_audit_actor", columnList = "actorId"),
        @Index(name = "idx_audit_timestamp", columnList = "createdAt")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@SuperBuilder
public class AuditLog extends TenantAware {

    @Column(nullable = false, length = 100)
    private String entityType;

    @Column(nullable = false)
    private UUID entityId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private AuditAction action;

    @Column(nullable = false)
    private UUID actorId;

    @Column(length = 200)
    private String actorEmail;

    /**
     * Audit M-C3 / M-M5: when a SuperAdmin acts on behalf of a tenant user,
     * {@link #actorId} captures the impersonated principal (so RBAC scope still
     * makes sense) and this field captures the underlying admin. Null when no
     * impersonation is in play. Populated by {@code AuditLogService} from
     * {@link com.hrms.common.security.SecurityContext#getCurrentImpersonatorId()}.
     */
    @Column(name = "impersonator_id")
    private UUID impersonatorId;

    @Column(columnDefinition = "TEXT")
    private String oldValue;

    @Column(columnDefinition = "TEXT")
    private String newValue;

    @Column(columnDefinition = "TEXT")
    private String changes;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Column(length = 50)
    private String ipAddress;

    @Column(length = 500)
    private String userAgent;

    public enum AuditAction {
        CREATE,
        UPDATE,
        DELETE,
        LOGIN,
        LOGOUT,
        PASSWORD_CHANGE,
        STATUS_CHANGE,
        PERMISSION_CHANGE,
        APPROVE,
        REJECT,
        CREDIT_LEAVE,
        IMPORT,
        EXPORT
    }
}
