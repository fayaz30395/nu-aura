package com.hrms.api.recruitment.dto;

import com.hrms.domain.recruitment.JobOpening;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDate;

@Data
public class JobOpeningRequest {
    @Size(max = 50, message = "Job code must not exceed 50 characters")
    private String jobCode;

    @NotBlank(message = "Job title is required")
    @Size(max = 200, message = "Job title must not exceed 200 characters")
    private String jobTitle;

    @NotNull(message = "Department ID is required")
    private java.util.UUID departmentId;

    @Size(max = 200, message = "Location must not exceed 200 characters")
    private String location;

    private JobOpening.EmploymentType employmentType;

    @Size(max = 100, message = "Experience required must not exceed 100 characters")
    private String experienceRequired;

    @Min(value = 0, message = "Minimum salary must be non-negative")
    private BigDecimal minSalary;

    @Min(value = 0, message = "Maximum salary must be non-negative")
    private BigDecimal maxSalary;

    @Min(value = 1, message = "Number of openings must be at least 1")
    private Integer numberOfOpenings;

    @Size(max = 10000, message = "Job description must not exceed 10000 characters")
    private String jobDescription;

    @Size(max = 5000, message = "Requirements must not exceed 5000 characters")
    private String requirements;

    @Size(max = 2000, message = "Skills required must not exceed 2000 characters")
    private String skillsRequired;

    private java.util.UUID hiringManagerId;
    private JobOpening.JobStatus status;
    private LocalDate postedDate;
    private LocalDate closingDate;
    private JobOpening.Priority priority;
    private Boolean isActive;
}
