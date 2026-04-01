package com.hrms.domain.statutory;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

/**
 * Labour Welfare Fund (LWF) configuration per Indian state.
 *
 * <p>LWF is a statutory contribution in India where both employer and employee
 * contribute fixed amounts based on state-specific rules. Different states have
 * different rates, frequencies (monthly/half-yearly/yearly), and applicable months.</p>
 *
 * <p>Key characteristics:
 * <ul>
 *   <li>Fixed amounts (not percentage-based like PF/ESI)</li>
 *   <li>State-specific — each state has its own LWF Act</li>
 *   <li>Frequency varies: monthly (TN), half-yearly (MH, KA), yearly (others)</li>
 *   <li>Only deducted in specific months depending on state rules</li>
 * </ul>
 */
@Entity
@Table(name = "lwf_configurations", indexes = {
        @Index(name = "idx_lwf_config_tenant", columnList = "tenant_id"),
        @Index(name = "idx_lwf_config_tenant_state", columnList = "tenant_id, state_code"),
        @Index(name = "idx_lwf_config_active", columnList = "tenant_id, is_active")
})
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class LWFConfiguration {

    @Id
    private UUID id;

    @Column(name = "tenant_id", nullable = false)
    private UUID tenantId;

    @Column(name = "state_code", nullable = false, length = 5)
    private String stateCode;

    @Column(name = "state_name", nullable = false, length = 50)
    private String stateName;

    /**
     * Fixed employee contribution amount per deduction period (in INR).
     */
    @Column(name = "employee_contribution", nullable = false, precision = 10, scale = 2)
    private BigDecimal employeeContribution;

    /**
     * Fixed employer contribution amount per deduction period (in INR).
     */
    @Column(name = "employer_contribution", nullable = false, precision = 10, scale = 2)
    private BigDecimal employerContribution;

    /**
     * Deduction frequency: MONTHLY, HALF_YEARLY, or YEARLY.
     */
    @Enumerated(EnumType.STRING)
    @Column(name = "frequency", nullable = false, length = 20)
    private LWFFrequency frequency;

    /**
     * JSON array of month numbers (1-12) in which deduction applies.
     * For half-yearly (MH): [6, 12] — June and December.
     * For monthly (TN): [1,2,3,4,5,6,7,8,9,10,11,12].
     * For yearly (DL): [12] — December only.
     */
    @Column(name = "applicable_months", nullable = false, length = 100)
    private String applicableMonths;

    @Column(name = "is_active", nullable = false)
    @Builder.Default
    private Boolean isActive = true;

    @Column(name = "effective_from", nullable = false)
    private LocalDate effectiveFrom;

    @Column(name = "effective_to")
    private LocalDate effectiveTo;

    /**
     * Minimum gross salary threshold for LWF applicability.
     * Some states exempt employees earning below a certain amount.
     * Null means no threshold (applicable to all).
     */
    @Column(name = "salary_threshold", precision = 10, scale = 2)
    private BigDecimal salaryThreshold;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @Column(name = "created_by")
    private UUID createdBy;

    @Column(name = "updated_by")
    private UUID updatedBy;

    public enum LWFFrequency {
        MONTHLY,
        HALF_YEARLY,
        YEARLY
    }
}
