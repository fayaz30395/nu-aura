package com.hrms.domain.benefits;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "benefit_plans")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class BenefitPlan {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;
    @Column(name = "tenant_id", nullable = false)
    private UUID tenantId;
    @Column(name = "plan_code", nullable = false, length = 50)
    private String planCode;
    @Column(name = "plan_name", nullable = false, length = 200)
    private String planName;
    @Column(name = "description", columnDefinition = "TEXT")
    private String description;
    @Enumerated(EnumType.STRING)
    @Column(name = "benefit_type", length = 50)
    private BenefitType benefitType;
    @Column(name = "provider_id")
    private UUID providerId;
    @Column(name = "coverage_amount", precision = 12, scale = 2)
    private BigDecimal coverageAmount;
    @Column(name = "employee_contribution", precision = 10, scale = 2)
    private BigDecimal employeeContribution;
    @Column(name = "employer_contribution", precision = 10, scale = 2)
    private BigDecimal employerContribution;
    @Column(name = "effective_date")
    private LocalDate effectiveDate;
    @Column(name = "expiry_date")
    private LocalDate expiryDate;
    @Builder.Default
    @Column(name = "is_active")
    private Boolean isActive = true;
    @Column(name = "eligibility_criteria", columnDefinition = "TEXT")
    private String eligibilityCriteria;
    @CreationTimestamp
    @Column(name = "created_at")
    private LocalDateTime createdAt;
    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
    @Version
    private Long version;

    public enum BenefitType {
        HEALTH_INSURANCE, DENTAL, VISION, LIFE_INSURANCE, RETIREMENT_401K, PTO, WELLNESS, GYM, EDUCATION, OTHER
    }
}
