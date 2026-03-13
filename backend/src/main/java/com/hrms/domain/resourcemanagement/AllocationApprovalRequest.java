package com.hrms.domain.resourcemanagement;

import com.hrms.common.entity.TenantAware;
import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.SuperBuilder;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "allocation_requests")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@SuperBuilder
public class AllocationApprovalRequest extends TenantAware {

    @Column(nullable = false)
    private UUID employeeId;

    @Column(nullable = false)
    private UUID projectId;

    @Column(nullable = false)
    private Integer requestedAllocation;

    @Column(length = 100)
    private String role;

    @Column(nullable = false)
    private LocalDate startDate;

    @Column
    private LocalDate endDate;

    @Column(nullable = false)
    private UUID requestedById;

    @Column
    private UUID approverId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private ApprovalStatus status;

    @Column(columnDefinition = "TEXT")
    private String requestReason;

    @Column(columnDefinition = "TEXT")
    private String approvalComment;

    @Column(columnDefinition = "TEXT")
    private String rejectionReason;

    @Column
    private LocalDateTime resolvedAt;

    public enum ApprovalStatus {
        PENDING,
        APPROVED,
        REJECTED
    }
}
