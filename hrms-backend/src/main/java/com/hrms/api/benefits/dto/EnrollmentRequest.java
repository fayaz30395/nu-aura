package com.hrms.api.benefits.dto;

import com.hrms.domain.benefits.BenefitEnrollment;
import jakarta.validation.constraints.NotNull;
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
    private BigDecimal employeeContribution;
    private BigDecimal employerContribution;

    // Flex credits
    private BigDecimal flexCreditsUsed;

    // Coverage selection for flexible benefits
    private String selectedOptions;

    // Dependents
    private List<DependentRequest> dependents;

    // Nominee details (for insurance)
    private String nomineeDetails;

    // Waiver info
    private boolean waived;
    private String waiverReason;

    @Data
    public static class DependentRequest {
        @NotNull(message = "First name is required")
        private String firstName;

        @NotNull(message = "Last name is required")
        private String lastName;

        @NotNull(message = "Relationship is required")
        private String relationship;

        @NotNull(message = "Date of birth is required")
        private LocalDate dateOfBirth;

        private String gender;
        private String nationalId;
        private String phone;
        private String email;
        private String address;
        private String city;
        private String state;
        private String postalCode;
        private String country;
        private boolean hasPreExistingConditions;
        private String preExistingConditions;
    }
}
