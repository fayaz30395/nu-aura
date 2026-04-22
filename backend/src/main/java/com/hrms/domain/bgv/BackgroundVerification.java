package com.hrms.domain.bgv;

import com.hrms.common.entity.TenantAware;
import jakarta.persistence.*;
import org.hibernate.annotations.SQLRestriction;
import lombok.*;
import lombok.experimental.SuperBuilder;

import java.time.LocalDate;
import java.util.UUID;

@SQLRestriction("is_deleted = false")
@Entity
@Table(name = "background_verifications")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@SuperBuilder
public class BackgroundVerification extends TenantAware {


    @Column(name = "employee_id", nullable = false)
    private UUID employeeId;

    @Column(name = "candidate_name", nullable = false)
    private String candidateName;

    @Column(name = "candidate_email")
    private String candidateEmail;

    @Column(name = "initiated_date")
    private LocalDate initiatedDate;

    @Enumerated(EnumType.STRING)
    @Column(name = "status")
    @Builder.Default
    private VerificationStatus status = VerificationStatus.INITIATED;

    @Column(name = "vendor_id")
    private UUID vendorId;

    @Column(name = "vendor_name")
    private String vendorName;

    @Column(name = "vendor_reference")
    private String vendorReference;

    @Column(name = "expected_completion_date")
    private LocalDate expectedCompletionDate;

    @Column(name = "actual_completion_date")
    private LocalDate actualCompletionDate;

    @Enumerated(EnumType.STRING)
    @Column(name = "overall_result")
    private VerificationResult overallResult;

    @Column(name = "initiated_by")
    private UUID initiatedBy;

    @Column(name = "reviewed_by")
    private UUID reviewedBy;

    @Column(name = "review_date")
    private LocalDate reviewDate;

    @Column(name = "review_notes", columnDefinition = "TEXT")
    private String reviewNotes;

    @Column(name = "is_green_channel")
    @Builder.Default
    private Boolean isGreenChannel = false;

    @Column(name = "priority")
    @Builder.Default
    private Integer priority = 2;

    public enum VerificationStatus {
        INITIATED,
        IN_PROGRESS,
        PENDING_DOCUMENTS,
        UNDER_REVIEW,
        COMPLETED,
        ON_HOLD,
        CANCELLED
    }

    public enum VerificationResult {
        CLEAR,
        DISCREPANCY,
        INSUFFICIENT,
        UNABLE_TO_VERIFY,
        PENDING
    }
}
