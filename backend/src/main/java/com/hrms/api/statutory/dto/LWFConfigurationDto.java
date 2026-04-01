package com.hrms.api.statutory.dto;

import com.hrms.domain.statutory.LWFConfiguration.LWFFrequency;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

/**
 * DTO for LWF state configuration create/update requests and responses.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class LWFConfigurationDto {

    private UUID id;

    @NotBlank(message = "State code is required")
    @Size(max = 5, message = "State code must not exceed 5 characters")
    private String stateCode;

    @NotBlank(message = "State name is required")
    @Size(max = 50, message = "State name must not exceed 50 characters")
    private String stateName;

    @NotNull(message = "Employee contribution is required")
    private BigDecimal employeeContribution;

    @NotNull(message = "Employer contribution is required")
    private BigDecimal employerContribution;

    @NotNull(message = "Frequency is required")
    private LWFFrequency frequency;

    @NotBlank(message = "Applicable months are required")
    private String applicableMonths;

    private Boolean isActive;

    @NotNull(message = "Effective from date is required")
    private LocalDate effectiveFrom;

    private LocalDate effectiveTo;

    private BigDecimal salaryThreshold;

    // Response fields
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
