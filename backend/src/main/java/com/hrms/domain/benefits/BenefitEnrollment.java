package com.hrms.domain.benefits;

import com.hrms.common.entity.TenantAware;
import jakarta.persistence.*;
import org.hibernate.annotations.SQLRestriction;
import lombok.*;
import lombok.experimental.SuperBuilder;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

/**
 * Employee enrollment in benefit plans with dependent management.
 */
@SQLRestriction("is_deleted = false")
@Entity
@Table(name = "benefit_enrollments")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@SuperBuilder
public class BenefitEnrollment extends TenantAware {

    // id is inherited from BaseEntity

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "benefit_plan_id", nullable = false)
    private BenefitPlanEnhanced benefitPlan;

    @Column(nullable = false)
    private UUID employeeId;

    @Column(nullable = false)
    @Enumerated(EnumType.STRING)
    private EnrollmentStatus status;

    @Enumerated(EnumType.STRING)
    private CoverageLevel coverageLevel;

    // Enrollment dates
    private LocalDate enrollmentDate;
    private LocalDate effectiveDate;
    private LocalDate terminationDate;

    // Cost
    private BigDecimal employeeContribution;
    private BigDecimal employerContribution;
    private BigDecimal totalPremium;

    // Flex credits usage
    private BigDecimal flexCreditsUsed;
    private BigDecimal outOfPocketCost;

    // Coverage selection
    private String selectedOptions; // JSON for flexible benefits

    // Policy details
    private String membershipId;
    private String policyCardNumber;

    // For health insurance
    private String nomineeDetails; // JSON
    private BigDecimal currentCoverage;
    private BigDecimal claimsUtilized;
    private BigDecimal remainingCoverage;

    @OneToMany(mappedBy = "enrollment", cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
    private List<BenefitDependent> dependents = new ArrayList<>();

    // COBRA continuation
    private boolean cobraActive;
    private LocalDate cobraStartDate;
    private LocalDate cobraEndDate;
    private BigDecimal cobraPremium;

    // Waiver info
    private boolean waived;
    private String waiverReason;
    private LocalDate waiverDate;

    // Approval
    private UUID approvedBy;
    private LocalDateTime approvedAt;
    private String approvalComments;

    // Audit fields (createdBy, createdAt, updatedAt, lastModifiedBy) inherited from BaseEntity

    @PrePersist
    protected void onCreate() {
        if (status == null) status = EnrollmentStatus.PENDING;
    }

    public void addDependent(BenefitDependent dependent) {
        dependents.add(dependent);
        dependent.setEnrollment(this);
    }

    public void activate() {
        this.status = EnrollmentStatus.ACTIVE;
        this.effectiveDate = LocalDate.now();
    }

    public void terminate(String reason) {
        this.status = EnrollmentStatus.TERMINATED;
        this.terminationDate = LocalDate.now();
    }

    public void startCobra() {
        this.status = EnrollmentStatus.COBRA_CONTINUATION;
        this.cobraActive = true;
        this.cobraStartDate = LocalDate.now();
    }

    public enum EnrollmentStatus {
        PENDING,
        APPROVED,
        ACTIVE,
        SUSPENDED,
        TERMINATED,
        COBRA_CONTINUATION,
        WAIVED,
        REJECTED
    }

    public enum CoverageLevel {
        EMPLOYEE_ONLY,
        EMPLOYEE_SPOUSE,
        EMPLOYEE_CHILDREN,
        FAMILY,
        EMPLOYEE_PARENT,
        EMPLOYEE_PARENT_IN_LAW
    }
}
