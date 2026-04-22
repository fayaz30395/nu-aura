package com.hrms.domain.selfservice;

import com.hrms.common.entity.TenantAware;
import jakarta.persistence.*;
import org.hibernate.annotations.SQLRestriction;
import lombok.*;
import lombok.experimental.SuperBuilder;

import java.time.LocalDateTime;
import java.util.UUID;

@SQLRestriction("is_deleted = false")
@Entity
@Table(name = "profile_update_requests")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@SuperBuilder
public class ProfileUpdateRequest extends TenantAware {


    @Column(nullable = false)
    private UUID employeeId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private UpdateCategory category;

    @Column(nullable = false)
    private String fieldName;

    @Column(columnDefinition = "TEXT")
    private String currentValue;

    @Column(columnDefinition = "TEXT")
    private String requestedValue;

    @Column(columnDefinition = "TEXT")
    private String reason;

    @Column(columnDefinition = "TEXT")
    private String supportingDocumentUrl;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    @Builder.Default
    private RequestStatus status = RequestStatus.PENDING;

    private UUID reviewedBy;
    private LocalDateTime reviewedAt;

    @Column(columnDefinition = "TEXT")
    private String reviewComments;

    @Column(columnDefinition = "TEXT")
    private String rejectionReason;

    @Builder.Default
    private Boolean autoApproved = false;

    public void approve(UUID reviewerId, String comments) {
        this.status = RequestStatus.APPROVED;
        this.reviewedBy = reviewerId;
        this.reviewedAt = LocalDateTime.now();
        this.reviewComments = comments;
    }

    public void reject(UUID reviewerId, String reason) {
        this.status = RequestStatus.REJECTED;
        this.reviewedBy = reviewerId;
        this.reviewedAt = LocalDateTime.now();
        this.rejectionReason = reason;
    }

    public void cancel() {
        this.status = RequestStatus.CANCELLED;
    }

    public boolean isPending() {
        return this.status == RequestStatus.PENDING || this.status == RequestStatus.UNDER_REVIEW;
    }

    public enum UpdateCategory {
        PERSONAL_INFO,
        CONTACT_INFO,
        EMERGENCY_CONTACT,
        BANK_DETAILS,
        ADDRESS,
        EDUCATION,
        CERTIFICATION,
        SKILL,
        DOCUMENT
    }

    public enum RequestStatus {
        PENDING,
        UNDER_REVIEW,
        APPROVED,
        REJECTED,
        AUTO_APPROVED,
        CANCELLED
    }
}
