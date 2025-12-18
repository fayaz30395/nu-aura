package com.hrms.api.recruitment.dto;

import com.hrms.domain.recruitment.JobOpening;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDate;

@Data
public class JobOpeningRequest {
    private String jobCode;
    private String jobTitle;
    private java.util.UUID departmentId;
    private String location;
    private JobOpening.EmploymentType employmentType;
    private String experienceRequired;
    private BigDecimal minSalary;
    private BigDecimal maxSalary;
    private Integer numberOfOpenings;
    private String jobDescription;
    private String requirements;
    private String skillsRequired;
    private java.util.UUID hiringManagerId;
    private JobOpening.JobStatus status;
    private LocalDate postedDate;
    private LocalDate closingDate;
    private JobOpening.Priority priority;
    private Boolean isActive;
}
