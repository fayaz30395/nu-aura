package com.hrms.api.recruitment.dto;

import com.hrms.domain.recruitment.Candidate;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;

@Data
public class CandidateRequest {
    private String candidateCode;
    private UUID jobOpeningId;
    private String firstName;
    private String lastName;
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
}
