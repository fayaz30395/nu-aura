package com.hrms.domain.recruitment;

import jakarta.persistence.*;
import lombok.Data;
import org.springframework.data.annotation.CreatedBy;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.LastModifiedBy;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@org.hibernate.annotations.SQLRestriction("is_deleted = false")
@Table(name = "candidates", indexes = {
    @Index(name = "idx_candidate_tenant", columnList = "tenant_id"),
    @Index(name = "idx_candidate_tenant_job", columnList = "tenant_id,job_opening_id"),
    @Index(name = "idx_candidate_tenant_status", columnList = "tenant_id,status"),
    @Index(name = "idx_candidate_tenant_stage", columnList = "tenant_id,current_stage"),
    @Index(name = "idx_candidate_email", columnList = "email"),
    @Index(name = "idx_candidate_recruiter", columnList = "assigned_recruiter_id"),
    @Index(name = "idx_candidate_applied_date", columnList = "applied_date"),
    @Index(name = "idx_candidate_source", columnList = "source")
}, uniqueConstraints = {
    @UniqueConstraint(name = "uk_candidate_tenant_code", columnNames = {"tenant_id", "candidate_code"})
})
@Data
@EntityListeners(AuditingEntityListener.class)
public class Candidate {

    @Id
    private UUID id;

    @Column(name = "tenant_id", nullable = false)
    private UUID tenantId;

    // Note: unique constraint is now tenant-scoped via @UniqueConstraint in @Table
    @Column(name = "candidate_code", nullable = false, length = 50)
    private String candidateCode;

    @Column(name = "job_opening_id", nullable = false)
    private UUID jobOpeningId;

    @Column(name = "first_name", nullable = false, length = 100)
    private String firstName;

    @Column(name = "last_name", nullable = false, length = 100)
    private String lastName;

    @Column(name = "email", nullable = false, length = 200)
    private String email;

    @Column(name = "phone", length = 20)
    private String phone;

    @Column(name = "current_location", length = 200)
    private String currentLocation;

    @Column(name = "current_company", length = 200)
    private String currentCompany;

    @Column(name = "current_designation", length = 200)
    private String currentDesignation;

    @Column(name = "total_experience")
    private BigDecimal totalExperience;

    @Column(name = "current_ctc")
    private BigDecimal currentCtc;

    @Column(name = "expected_ctc")
    private BigDecimal expectedCtc;

    @Column(name = "notice_period_days")
    private Integer noticePeriodDays;

    @Column(name = "resume_url", length = 500)
    private String resumeUrl;

    @Column(name = "source", length = 100)
    @Enumerated(EnumType.STRING)
    private CandidateSource source;

    @Column(name = "status", nullable = false, length = 30)
    @Enumerated(EnumType.STRING)
    private CandidateStatus status;

    @Column(name = "current_stage", length = 60)
    @Enumerated(EnumType.STRING)
    private RecruitmentStage currentStage;

    @Column(name = "applied_date")
    private LocalDate appliedDate;

    @Column(name = "notes", columnDefinition = "TEXT")
    private String notes;

    @Column(name = "assigned_recruiter_id")
    private UUID assignedRecruiterId;

    // Offer-related fields
    @Column(name = "offered_ctc")
    private BigDecimal offeredCtc;

    @Column(name = "offered_designation", length = 200)
    private String offeredDesignation;

    @Column(name = "proposed_joining_date")
    private LocalDate proposedJoiningDate;

    @Column(name = "offer_letter_id")
    private UUID offerLetterId;

    @Column(name = "offer_extended_date")
    private LocalDate offerExtendedDate;

    @Column(name = "offer_accepted_date")
    private LocalDate offerAcceptedDate;

    @Column(name = "offer_declined_date")
    private LocalDate offerDeclinedDate;

    @Column(name = "offer_decline_reason", columnDefinition = "TEXT")
    private String offerDeclineReason;

    // ── Audit fields (mapped to existing DB columns from V0__init.sql) ──

    @CreatedDate
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @LastModifiedDate
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @CreatedBy
    @Column(name = "created_by", updatable = false)
    private UUID createdBy;

    @LastModifiedBy
    @Column(name = "updated_by")
    private UUID lastModifiedBy;

    @Version
    private Long version;

    @Column(name = "is_deleted", nullable = false)
    private boolean isDeleted = false;

    public enum CandidateSource {
        JOB_PORTAL, REFERRAL, LINKEDIN, COMPANY_WEBSITE, WALK_IN, CAMPUS, CONSULTANT, OTHER
    }

    public enum CandidateStatus {
        NEW, SCREENING, INTERVIEW, SELECTED, OFFER_EXTENDED, OFFER_ACCEPTED, OFFER_DECLINED, REJECTED, WITHDRAWN
    }

    public enum RecruitmentStage {
        APPLICATION_RECEIVED,
        SCREENING,
        INTERVIEW,
        OFFER,
        JOINED,
        RECRUITERS_PHONE_CALL,
        PANEL_REVIEW,
        PANEL_REJECT,
        PANEL_SHORTLISTED,
        TECHNICAL_INTERVIEW_SCHEDULED,
        TECHNICAL_INTERVIEW_COMPLETED,
        MANAGEMENT_INTERVIEW_SCHEDULED,
        MANAGEMENT_INTERVIEW_COMPLETED,
        CLIENT_INTERVIEW_SCHEDULED,
        CLIENT_INTERVIEW_COMPLETED,
        HR_FINAL_INTERVIEW_COMPLETED,
        CANDIDATE_REJECTED,
        OFFER_NDA_TO_BE_RELEASED
    }

    public String getFullName() {
        return firstName + " " + lastName;
    }
}
