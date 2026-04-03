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
@Table(name = "document_approval_tasks", indexes = {
        @Index(name = "idx_doc_approval_task_tenant", columnList = "tenantId"),
        @Index(name = "idx_doc_approval_task_workflow", columnList = "workflowId"),
        @Index(name = "idx_doc_approval_task_approver", columnList = "approverId"),
        @Index(name = "idx_doc_approval_task_status", columnList = "tenantId,status")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@SuperBuilder
public class DocumentApprovalTask extends TenantAware {

    @Column(nullable = false)
    private UUID workflowId;

    @Column(nullable = false)
    private UUID approverId;

    @Builder.Default
    @Column(nullable = false, length = 50)
    @Enumerated(EnumType.STRING)
    private TaskStatus status = TaskStatus.PENDING;

    @Column(nullable = false)
    private Integer approvalLevel;

    @Column(columnDefinition = "TEXT")
    private String comments;

    @Column
    private LocalDateTime approvedAt;

    @Column
    private UUID delegatedTo;

    @Column(columnDefinition = "JSONB")
    private String metadata;

    public enum TaskStatus {
        PENDING,
        APPROVED,
        REJECTED,
        DELEGATED,
        CANCELLED
    }
}
