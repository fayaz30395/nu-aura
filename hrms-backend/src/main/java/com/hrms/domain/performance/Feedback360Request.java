package com.hrms.domain.performance;

import com.hrms.common.entity.TenantAware;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "feedback_360_requests", indexes = {
    @Index(name = "idx_f360_req_tenant", columnList = "tenantId"),
    @Index(name = "idx_f360_req_subject", columnList = "subjectEmployeeId"),
    @Index(name = "idx_f360_req_reviewer", columnList = "reviewerId"),
    @Index(name = "idx_f360_req_cycle", columnList = "cycleId")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Feedback360Request extends TenantAware {

    @Column(name = "cycle_id", nullable = false)
    private UUID cycleId;

    @Column(name = "subject_employee_id", nullable = false)
    private UUID subjectEmployeeId;

    @Column(name = "reviewer_id", nullable = false)
    private UUID reviewerId;

    @Enumerated(EnumType.STRING)
    @Column(name = "reviewer_type", nullable = false, length = 30)
    private ReviewerType reviewerType;

    @Enumerated(EnumType.STRING)
    @Column(length = 30)
    @Builder.Default
    private RequestStatus status = RequestStatus.PENDING;

    @Column(name = "nominated_by")
    private UUID nominatedBy;

    @Column(name = "nomination_approved")
    @Builder.Default
    private Boolean nominationApproved = false;

    @Column(name = "approved_by")
    private UUID approvedBy;

    @Column(name = "approved_at")
    private LocalDateTime approvedAt;

    @Column(name = "reminder_sent_at")
    private LocalDateTime reminderSentAt;

    @Column(name = "reminder_count")
    @Builder.Default
    private Integer reminderCount = 0;

    public enum ReviewerType {
        SELF,
        MANAGER,
        PEER,
        DIRECT_REPORT,
        EXTERNAL
    }

    public enum RequestStatus {
        PENDING,
        NOMINATED,
        APPROVED,
        IN_PROGRESS,
        SUBMITTED,
        DECLINED
    }
}
