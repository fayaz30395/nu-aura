package com.hrms.domain.document;

import com.hrms.common.entity.TenantAware;
import jakarta.persistence.*;
import org.hibernate.annotations.Where;
import lombok.*;
import lombok.experimental.SuperBuilder;

import java.time.LocalDateTime;
import java.util.UUID;

@Where(clause = "is_deleted = false")
@Entity
@Table(name = "document_approval_workflows", indexes = {
        @Index(name = "idx_doc_approval_workflow_tenant", columnList = "tenantId"),
        @Index(name = "idx_doc_approval_workflow_document", columnList = "documentId"),
        @Index(name = "idx_doc_approval_workflow_status", columnList = "tenantId,status"),
        @Index(name = "idx_doc_approval_workflow_approver", columnList = "currentApproverId")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@SuperBuilder
public class DocumentApprovalWorkflow extends TenantAware {

    @Column(nullable = false)
    private UUID documentId;

    @Column
    private UUID workflowDefId;

    @Builder.Default
    @Column(nullable = false, length = 50)
    @Enumerated(EnumType.STRING)
    private WorkflowStatus status = WorkflowStatus.PENDING;

    @Column(nullable = false)
    private UUID requestedBy;

    @Column
    private UUID currentApproverId;

    @Builder.Default
    @Column
    private Integer approvalLevel = 1;

    @Builder.Default
    @Column
    private Integer totalApprovalLevels = 1;

    @Column(columnDefinition = "TEXT")
    private String rejectionReason;

    @Column(nullable = false)
    private LocalDateTime initiatedAt;

    @Column
    private LocalDateTime completedAt;

    public enum WorkflowStatus {
        PENDING,
        IN_PROGRESS,
        APPROVED,
        REJECTED,
        CANCELLED
    }
}
