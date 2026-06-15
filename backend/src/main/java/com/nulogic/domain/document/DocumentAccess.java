package com.nulogic.domain.document;

import com.nulogic.common.entity.TenantAware;
import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.SuperBuilder;
import org.hibernate.annotations.SQLRestriction;

import java.time.LocalDateTime;
import java.util.UUID;

@SQLRestriction("is_deleted = false")
@Entity
@Table(name = "document_access", indexes = {
        @Index(name = "idx_doc_access_tenant", columnList = "tenantId"),
        @Index(name = "idx_doc_access_document", columnList = "documentId"),
        @Index(name = "idx_doc_access_user", columnList = "userId"),
        @Index(name = "idx_doc_access_role", columnList = "roleId"),
        @Index(name = "idx_doc_access_department", columnList = "departmentId"),
        @Index(name = "idx_doc_access_level", columnList = "tenantId,accessLevel")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@SuperBuilder
public class DocumentAccess extends TenantAware {

    @Column(nullable = false)
    private UUID documentId;

    @Column
    private UUID userId;

    @Column
    private UUID roleId;

    @Column
    private UUID departmentId;

    @Column(nullable = false, length = 50)
    @Enumerated(EnumType.STRING)
    private AccessLevel accessLevel;

    @Column(nullable = false)
    private UUID grantedBy;

    @Column(nullable = false)
    private LocalDateTime grantedAt;

    @Column
    private LocalDateTime expiresAt;

    @Builder.Default
    @Column(nullable = false)
    private Boolean isActive = true;

    @Column(columnDefinition = "JSONB")
    private String metadata;

    public boolean isExpired() {
        return expiresAt != null && LocalDateTime.now().isAfter(expiresAt); // JVM-local: entity-layer; push to service per docs/architecture/tenant-time-wave-13-summary.md if cross-region zone correctness is needed
    }

    public enum AccessLevel {
        VIEW,
        EDIT,
        MANAGE,
        APPROVE
    }
}
