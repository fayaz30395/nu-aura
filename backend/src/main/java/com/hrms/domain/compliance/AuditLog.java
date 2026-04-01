package com.hrms.domain.compliance;

import com.hrms.common.entity.TenantAware;
import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.SuperBuilder;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity(name = "ComplianceAuditLog")
@Table(name = "compliance_audit_logs", indexes = {
    @Index(name = "idx_compliance_audit_entity", columnList = "entity_type, entity_id"),
    @Index(name = "idx_compliance_audit_user", columnList = "performed_by"),
    @Index(name = "idx_compliance_audit_timestamp", columnList = "timestamp")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@SuperBuilder
public class AuditLog extends TenantAware {

    // id is inherited from BaseEntity

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private AuditAction action;

    @Column(name = "entity_type", nullable = false)
    private String entityType;

    @Column(name = "entity_id")
    private UUID entityId;

    @Column(name = "entity_name")
    private String entityName;

    @Column(name = "performed_by", nullable = false)
    private UUID performedBy;

    private String performedByName;

    @Column(nullable = false)
    private LocalDateTime timestamp;

    @Column(columnDefinition = "TEXT")
    private String oldValue;

    @Column(columnDefinition = "TEXT")
    private String newValue;

    @Column(columnDefinition = "TEXT")
    private String changedFields; // JSON array of field names

    private String ipAddress;

    private String userAgent;

    @Column(columnDefinition = "TEXT")
    private String additionalInfo;

    @Enumerated(EnumType.STRING)
    private AuditSeverity severity;

    public enum AuditAction {
        CREATE,
        READ,
        UPDATE,
        DELETE,
        LOGIN,
        LOGOUT,
        LOGIN_FAILED,
        PASSWORD_CHANGE,
        PASSWORD_RESET,
        PERMISSION_CHANGE,
        EXPORT,
        IMPORT,
        APPROVE,
        REJECT,
        SUBMIT,
        CANCEL,
        ARCHIVE,
        RESTORE
    }

    public enum AuditSeverity {
        LOW,
        MEDIUM,
        HIGH,
        CRITICAL
    }

    @PrePersist
    public void prePersist() {
        if (timestamp == null) {
            timestamp = LocalDateTime.now();
        }
    }
}
