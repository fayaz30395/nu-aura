package com.hrms.api.recruitment.dto;

import com.hrms.domain.recruitment.ApplicationSource;
import com.hrms.domain.recruitment.ApplicationStatus;
import lombok.Builder;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

@Data
@Builder
public class ApplicantResponse {
    private UUID id;
    private UUID tenantId;
    private UUID candidateId;
    private UUID jobOpeningId;
    private ApplicationStatus status;
    private ApplicationSource source;
    private LocalDate appliedDate;
    private LocalDateTime currentStageEnteredAt;
    private String notes;
    private Integer rating;
    private UUID resumeFileId;
    private String rejectionReason;
    private BigDecimal offeredSalary;
    private BigDecimal expectedSalary;
    private String candidateName;
    private String jobTitle;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private UUID createdBy;
    private UUID lastModifiedBy;
    private Long version;
}
