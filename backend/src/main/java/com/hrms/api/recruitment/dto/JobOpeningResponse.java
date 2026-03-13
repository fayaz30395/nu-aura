package com.hrms.api.recruitment.dto;

import com.hrms.domain.recruitment.JobOpening;
import lombok.Builder;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

@Data
@Builder
public class JobOpeningResponse {
    private UUID id;
    private UUID tenantId;
    private String jobCode;
    private String jobTitle;
    private UUID departmentId;
    private String departmentName;
    private String location;
    private JobOpening.EmploymentType employmentType;
    private String experienceRequired;
    private BigDecimal minSalary;
    private BigDecimal maxSalary;
    private Integer numberOfOpenings;
    private String jobDescription;
    private String requirements;
    private String skillsRequired;
    private UUID hiringManagerId;
    private String hiringManagerName;
    private JobOpening.JobStatus status;
    private LocalDate postedDate;
    private LocalDate closingDate;
    private JobOpening.Priority priority;
    private Boolean isActive;
    private Integer candidateCount;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private UUID createdBy;
    private UUID lastModifiedBy;
    private Long version;
}
