package com.hrms.api.recruitment.dto;

import com.hrms.domain.recruitment.Candidate;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;

@Data
public class CandidateRequest {
    @Size(max = 50, message = "Candidate code must not exceed 50 characters")
    private String candidateCode;

    private UUID jobOpeningId;

    @NotBlank(message = "First name is required")
    @Size(max = 100, message = "First name must not exceed 100 characters")
    private String firstName;

    @NotBlank(message = "Last name is required")
    @Size(max = 100, message = "Last name must not exceed 100 characters")
    private String lastName;

    @NotBlank(message = "Email is required")
    @Email(message = "Email must be a valid email address")
    @Size(max = 255, message = "Email must not exceed 255 characters")
    private String email;

    @Size(max = 20, message = "Phone must not exceed 20 characters")
    private String phone;

    @Size(max = 200, message = "Current location must not exceed 200 characters")
    private String currentLocation;

    @Size(max = 200, message = "Current company must not exceed 200 characters")
    private String currentCompany;

    @Size(max = 200, message = "Current designation must not exceed 200 characters")
    private String currentDesignation;

    @Min(value = 0, message = "Total experience must be non-negative")
    private BigDecimal totalExperience;

    @Min(value = 0, message = "Current CTC must be non-negative")
    private BigDecimal currentCtc;

    @Min(value = 0, message = "Expected CTC must be non-negative")
    private BigDecimal expectedCtc;

    @Min(value = 0, message = "Notice period days must be non-negative")
    private Integer noticePeriodDays;

    @Size(max = 1000, message = "Resume URL must not exceed 1000 characters")
    private String resumeUrl;

    private Candidate.CandidateSource source;
    private Candidate.CandidateStatus status;
    private Candidate.RecruitmentStage currentStage;
    private LocalDate appliedDate;

    @Size(max = 2000, message = "Notes must not exceed 2000 characters")
    private String notes;

    private UUID assignedRecruiterId;
}
