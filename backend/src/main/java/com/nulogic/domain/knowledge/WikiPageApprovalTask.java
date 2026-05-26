package com.nulogic.domain.knowledge;

import com.nulogic.common.entity.TenantAware;
import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.SuperBuilder;
import org.hibernate.annotations.Where;

import java.time.LocalDateTime;
import java.util.UUID;

@Where(clause = "is_deleted = false")
@Entity
@Table(name = "wiki_page_approval_tasks", indexes = {
        @Index(name = "idx_wiki_page_approval_tasks_tenant", columnList = "tenant_id"),
        @Index(name = "idx_wiki_page_approval_tasks_page", columnList = "page_id"),
        @Index(name = "idx_wiki_page_approval_tasks_status", columnList = "status")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@SuperBuilder
public class WikiPageApprovalTask extends TenantAware {

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "page_id", nullable = false)
    private WikiPage page;

    @Column(name = "approval_task_id")
    private UUID approvalTaskId;

    @Builder.Default
    @Column(nullable = false, length = 50)
    @Enumerated(EnumType.STRING)
    private ApprovalStatus status = ApprovalStatus.PENDING;

    @Column(name = "change_summary", columnDefinition = "TEXT")
    private String changeSummary;

    @Column(name = "rejection_reason", columnDefinition = "TEXT")
    private String rejectionReason;

    @Column(name = "submitted_by", nullable = false)
    private UUID submittedBy;

    @Column(name = "reviewed_by")
    private UUID reviewedBy;

    @Column(name = "reviewed_at")
    private LocalDateTime reviewedAt;

    public enum ApprovalStatus {
        PENDING, APPROVED, REJECTED, REVOKED
    }
}
