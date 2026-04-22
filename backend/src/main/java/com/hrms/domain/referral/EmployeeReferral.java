package com.hrms.domain.referral;

import com.hrms.common.entity.TenantAware;
import jakarta.persistence.*;
import org.hibernate.annotations.SQLRestriction;
import lombok.*;
import lombok.experimental.SuperBuilder;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;

@SQLRestriction("is_deleted = false")
@Entity
@Table(name = "employee_referrals")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@SuperBuilder
public class EmployeeReferral extends TenantAware {


    @Column(name = "referrer_id", nullable = false)
    private UUID referrerId;

    @Column(name = "referral_code")
    private String referralCode;

    // Candidate Information
    @Column(name = "candidate_name", nullable = false)
    private String candidateName;

    @Column(name = "candidate_email", nullable = false)
    private String candidateEmail;

    @Column(name = "candidate_phone")
    private String candidatePhone;

    @Column(name = "candidate_linkedin")
    private String candidateLinkedin;

    @Column(name = "resume_path")
    private String resumePath;

    // Job Details
    @Column(name = "job_id")
    private UUID jobId;

    @Column(name = "job_title")
    private String jobTitle;

    @Column(name = "department_id")
    private UUID departmentId;

    // Relationship
    @Enumerated(EnumType.STRING)
    @Column(name = "relationship")
    private Relationship relationship;

    @Column(name = "known_since")
    private LocalDate knownSince;

    @Column(name = "referrer_notes", columnDefinition = "TEXT")
    private String referrerNotes;

    // Status Tracking
    @Enumerated(EnumType.STRING)
    @Column(name = "status")
    @Builder.Default
    private ReferralStatus status = ReferralStatus.SUBMITTED;

    @Column(name = "submitted_date")
    private LocalDate submittedDate;

    @Column(name = "screening_date")
    private LocalDate screeningDate;

    @Column(name = "interview_date")
    private LocalDate interviewDate;

    @Column(name = "offer_date")
    private LocalDate offerDate;

    @Column(name = "joining_date")
    private LocalDate joiningDate;

    @Column(name = "hired_employee_id")
    private UUID hiredEmployeeId;

    @Column(name = "rejection_reason")
    private String rejectionReason;

    @Column(name = "rejection_stage")
    private String rejectionStage;

    // Bonus Details
    @Column(name = "bonus_amount", precision = 12, scale = 2)
    private BigDecimal bonusAmount;

    @Enumerated(EnumType.STRING)
    @Column(name = "bonus_status")
    private BonusStatus bonusStatus;

    @Column(name = "bonus_eligible_date")
    private LocalDate bonusEligibleDate;

    @Column(name = "bonus_paid_date")
    private LocalDate bonusPaidDate;

    @Column(name = "bonus_payment_reference")
    private String bonusPaymentReference;

    @Column(name = "processing_notes", columnDefinition = "TEXT")
    private String processingNotes;

    public enum Relationship {
        FORMER_COLLEAGUE,
        FRIEND,
        FAMILY,
        CLASSMATE,
        PROFESSIONAL_NETWORK,
        OTHER
    }

    public enum ReferralStatus {
        SUBMITTED,
        SCREENING,
        INTERVIEW_SCHEDULED,
        INTERVIEW_COMPLETED,
        OFFER_MADE,
        OFFER_ACCEPTED,
        JOINED,
        REJECTED,
        WITHDRAWN,
        ON_HOLD
    }

    public enum BonusStatus {
        NOT_ELIGIBLE,
        PENDING_ELIGIBILITY,
        ELIGIBLE,
        PROCESSING,
        PAID
    }
}
