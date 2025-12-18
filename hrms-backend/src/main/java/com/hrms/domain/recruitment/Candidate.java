package com.hrms.domain.recruitment;

import jakarta.persistence.*;
import lombok.Data;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "candidates")
@Data
public class Candidate {

    @Id
    private UUID id;

    @Column(name = "tenant_id", nullable = false)
    private UUID tenantId;

    @Column(name = "candidate_code", nullable = false, unique = true, length = 50)
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

    @Column(name = "current_stage", length = 50)
    @Enumerated(EnumType.STRING)
    private RecruitmentStage currentStage;

    @Column(name = "applied_date")
    private LocalDate appliedDate;

    @Column(name = "notes", columnDefinition = "TEXT")
    private String notes;

    @Column(name = "assigned_recruiter_id")
    private UUID assignedRecruiterId;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    public enum CandidateSource {
        JOB_PORTAL, REFERRAL, LINKEDIN, COMPANY_WEBSITE, WALK_IN, CAMPUS, CONSULTANT, OTHER
    }

    public enum CandidateStatus {
        NEW, SCREENING, INTERVIEW, SELECTED, OFFER_EXTENDED, OFFER_ACCEPTED, OFFER_DECLINED, REJECTED, WITHDRAWN
    }

    public enum RecruitmentStage {
        APPLICATION_RECEIVED, SCREENING, TECHNICAL_ROUND, HR_ROUND, MANAGER_ROUND, FINAL_ROUND, OFFER, JOINED
    }

    public String getFullName() {
        return firstName + " " + lastName;
    }
}
