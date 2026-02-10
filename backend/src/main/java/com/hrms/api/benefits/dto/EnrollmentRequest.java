package com.hrms.api.benefits.dto;

import com.hrms.domain.benefits.BenefitEnrollment;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PositiveOrZero;
import jakarta.validation.constraints.Size;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@Data
public class EnrollmentRequest {

    @NotNull(message = "Benefit plan ID is required")
    private UUID benefitPlanId;

    @NotNull(message = "Employee ID is required")
    private UUID employeeId;

    private BenefitEnrollment.CoverageLevel coverageLevel;

    private LocalDate effectiveDate;

    // Cost (can be calculated or overridden)
    @PositiveOrZero(message = "Employee contribution cannot be negative")
    private BigDecimal employeeContribution;

    @PositiveOrZero(message = "Employer contribution cannot be negative")
    private BigDecimal employerContribution;

    // Flex credits
    @PositiveOrZero(message = "Flex credits used cannot be negative")
    private BigDecimal flexCreditsUsed;

    // Coverage selection for flexible benefits
    @Size(max = 1000, message = "Selected options cannot exceed 1000 characters")
    private String selectedOptions;

    // Dependents
    @Valid
    @Size(max = 20, message = "Cannot have more than 20 dependents")
    private List<DependentRequest> dependents;

    // Nominee details (for insurance)
    private String nomineeDetails;

    // Waiver info
    private boolean waived;
    private String waiverReason;

    @Data
    public static class DependentRequest {
        @NotNull(message = "First name is required")
        @Size(max = 100, message = "First name cannot exceed 100 characters")
        private String firstName;

        @NotNull(message = "Last name is required")
        @Size(max = 100, message = "Last name cannot exceed 100 characters")
        private String lastName;

        @NotNull(message = "Relationship is required")
        @Size(max = 50, message = "Relationship cannot exceed 50 characters")
        private String relationship;

        @NotNull(message = "Date of birth is required")
        private LocalDate dateOfBirth;

        @Size(max = 20, message = "Gender cannot exceed 20 characters")
        private String gender;

        @Size(max = 50, message = "National ID cannot exceed 50 characters")
        private String nationalId;

        @Size(max = 20, message = "Phone cannot exceed 20 characters")
        private String phone;

        @Size(max = 100, message = "Email cannot exceed 100 characters")
        private String email;

        @Size(max = 500, message = "Address cannot exceed 500 characters")
        private String address;

        @Size(max = 100, message = "City cannot exceed 100 characters")
        private String city;

        @Size(max = 100, message = "State cannot exceed 100 characters")
        private String state;

        @Size(max = 20, message = "Postal code cannot exceed 20 characters")
        private String postalCode;

        @Size(max = 100, message = "Country cannot exceed 100 characters")
        private String country;

        private boolean hasPreExistingConditions;

        @Size(max = 2000, message = "Pre-existing conditions cannot exceed 2000 characters")
        private String preExistingConditions;
    }
}
