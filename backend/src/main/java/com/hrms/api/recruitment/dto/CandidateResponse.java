package com.hrms.api.recruitment.dto;

import com.hrms.domain.recruitment.Candidate;
import lombok.Builder;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

@Data
@Builder
public class CandidateResponse {
    private UUID id;
    private UUID tenantId;
    private String candidateCode;
    private UUID jobOpeningId;
    private String jobTitle;
    private String firstName;
    private String lastName;
    private String fullName;
    private String email;
    private String phone;
    private String currentLocation;
    private String currentCompany;
    private String currentDesignation;
    private BigDecimal totalExperience;
    private BigDecimal currentCtc;
    private BigDecimal expectedCtc;
    private Integer noticePeriodDays;
    private String resumeUrl;
    private Candidate.CandidateSource source;
    private Candidate.CandidateStatus status;
    private Candidate.RecruitmentStage currentStage;
    private LocalDate appliedDate;
    private String notes;
    private UUID assignedRecruiterId;
    private String assignedRecruiterName;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private UUID createdBy;
    private UUID lastModifiedBy;
    private Long version;
}
