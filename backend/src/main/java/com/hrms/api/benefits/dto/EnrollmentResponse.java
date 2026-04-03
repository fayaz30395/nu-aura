package com.hrms.api.benefits.dto;

import com.hrms.domain.benefits.BenefitDependent;
import com.hrms.domain.benefits.BenefitEnrollment;
import lombok.Builder;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Data
@Builder
public class EnrollmentResponse {

    private UUID id;
    private UUID benefitPlanId;
    private String benefitPlanName;
    private String planType;
    private UUID employeeId;
    private BenefitEnrollment.EnrollmentStatus status;
    private BenefitEnrollment.CoverageLevel coverageLevel;

    // Dates
    private LocalDate enrollmentDate;
    private LocalDate effectiveDate;
    private LocalDate terminationDate;

    // Cost
    private BigDecimal employeeContribution;
    private BigDecimal employerContribution;
    private BigDecimal totalPremium;
    private BigDecimal flexCreditsUsed;
    private BigDecimal outOfPocketCost;

    // Coverage selection
    private String selectedOptions;

    // Policy details
    private String membershipId;
    private String policyCardNumber;

    // Health coverage
    private String nomineeDetails;
    private BigDecimal currentCoverage;
    private BigDecimal claimsUtilized;
    private BigDecimal remainingCoverage;

    // Dependents
    private List<DependentResponse> dependents;
    private int dependentCount;

    // COBRA
    private boolean cobraActive;
    private LocalDate cobraStartDate;
    private LocalDate cobraEndDate;
    private BigDecimal cobraPremium;

    // Waiver
    private boolean waived;
    private String waiverReason;
    private LocalDate waiverDate;

    // Approval
    private UUID approvedBy;
    private LocalDateTime approvedAt;
    private String approvalComments;

    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    public static EnrollmentResponse from(BenefitEnrollment enrollment) {
        return EnrollmentResponse.builder()
                .id(enrollment.getId())
                .benefitPlanId(enrollment.getBenefitPlan().getId())
                .benefitPlanName(enrollment.getBenefitPlan().getName())
                .planType(enrollment.getBenefitPlan().getPlanType().name())
                .employeeId(enrollment.getEmployeeId())
                .status(enrollment.getStatus())
                .coverageLevel(enrollment.getCoverageLevel())
                .enrollmentDate(enrollment.getEnrollmentDate())
                .effectiveDate(enrollment.getEffectiveDate())
                .terminationDate(enrollment.getTerminationDate())
                .employeeContribution(enrollment.getEmployeeContribution())
                .employerContribution(enrollment.getEmployerContribution())
                .totalPremium(enrollment.getTotalPremium())
                .flexCreditsUsed(enrollment.getFlexCreditsUsed())
                .outOfPocketCost(enrollment.getOutOfPocketCost())
                .selectedOptions(enrollment.getSelectedOptions())
                .membershipId(enrollment.getMembershipId())
                .policyCardNumber(enrollment.getPolicyCardNumber())
                .nomineeDetails(enrollment.getNomineeDetails())
                .currentCoverage(enrollment.getCurrentCoverage())
                .claimsUtilized(enrollment.getClaimsUtilized())
                .remainingCoverage(enrollment.getRemainingCoverage())
                .dependents(enrollment.getDependents() != null ?
                        enrollment.getDependents().stream()
                        .map(DependentResponse::from)
                        .collect(Collectors.toList()) : null)
                .dependentCount(enrollment.getDependents() != null ? enrollment.getDependents().size() : 0)
                .cobraActive(enrollment.isCobraActive())
                .cobraStartDate(enrollment.getCobraStartDate())
                .cobraEndDate(enrollment.getCobraEndDate())
                .cobraPremium(enrollment.getCobraPremium())
                .waived(enrollment.isWaived())
                .waiverReason(enrollment.getWaiverReason())
                .waiverDate(enrollment.getWaiverDate())
                .approvedBy(enrollment.getApprovedBy())
                .approvedAt(enrollment.getApprovedAt())
                .approvalComments(enrollment.getApprovalComments())
                .createdAt(enrollment.getCreatedAt())
                .updatedAt(enrollment.getUpdatedAt())
                .build();
    }

    @Data
    @Builder
    public static class DependentResponse {
        private UUID id;
        private String firstName;
        private String lastName;
        private String fullName;
        private BenefitDependent.Relationship relationship;
        private LocalDate dateOfBirth;
        private int age;
        private String gender;
        private boolean isCovered;
        private LocalDate coverageStartDate;
        private LocalDate coverageEndDate;
        private String membershipId;
        private BenefitDependent.DependentStatus status;

        public static DependentResponse from(BenefitDependent dependent) {
            return DependentResponse.builder()
                    .id(dependent.getId())
                    .firstName(dependent.getFirstName())
                    .lastName(dependent.getLastName())
                    .fullName(dependent.getFirstName() + " " + dependent.getLastName())
                    .relationship(dependent.getRelationship())
                    .dateOfBirth(dependent.getDateOfBirth())
                    .age(dependent.getAge())
                    .gender(dependent.getGender())
                    .isCovered(dependent.isCovered())
                    .coverageStartDate(dependent.getCoverageStartDate())
                    .coverageEndDate(dependent.getCoverageEndDate())
                    .membershipId(dependent.getMembershipId())
                    .status(dependent.getStatus())
                    .build();
        }
    }
}
