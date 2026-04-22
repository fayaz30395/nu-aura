package com.hrms.domain.payroll;

import com.hrms.common.entity.TenantAware;
import jakarta.persistence.*;
import org.hibernate.annotations.Where;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.*;
import lombok.experimental.SuperBuilder;

import java.math.BigDecimal;

/**
 * Represents a configurable salary component with optional SpEL formula.
 * <p>
 * Components can reference other components in their formula (e.g. "basic * 0.4")
 * and are evaluated in dependency order (topological sort / DAG). If circular
 * dependencies are detected, the system refuses to evaluate and throws a
 * {@link com.hrms.common.exception.BusinessException}.
 * <p>
 * Component types:
 * <ul>
 *   <li>EARNING — adds to gross salary (basic, HRA, allowances)</li>
 *   <li>DEDUCTION — subtracts from gross (PF, tax, ESI)</li>
 *   <li>EMPLOYER_CONTRIBUTION — employer-side cost, not deducted from employee pay</li>
 * </ul>
 */
@Where(clause = "is_deleted = false")
@Entity
@Table(name = "payroll_components", indexes = {
        @Index(name = "idx_payroll_comp_tenant", columnList = "tenantId"),
        @Index(name = "idx_payroll_comp_code", columnList = "tenantId, code", unique = true),
        @Index(name = "idx_payroll_comp_type", columnList = "tenantId, componentType"),
        @Index(name = "idx_payroll_comp_order", columnList = "tenantId, evaluationOrder")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@SuperBuilder
public class PayrollComponent extends TenantAware {

    /**
     * Unique code within the tenant, e.g. "basic", "hra", "pf_employee".
     * Used to reference this component in other components' formulas.
     */
    @NotBlank
    @Column(nullable = false, length = 50)
    private String code;

    /**
     * Human-readable display name, e.g. "Basic Salary", "House Rent Allowance".
     */
    @NotBlank
    @Column(nullable = false, length = 100)
    private String name;

    @NotNull
    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private ComponentType componentType;

    /**
     * SpEL formula referencing other component codes as variables.
     * Examples:
     * <ul>
     *   <li>{@code null} — value is provided directly (no formula, e.g. basic salary)</li>
     *   <li>{@code "basic * 0.4"} — 40% of basic</li>
     *   <li>{@code "basic * 0.12"} — 12% of basic for PF</li>
     *   <li>{@code "(basic + hra) * 0.0075"} — professional tax</li>
     * </ul>
     */
    @Column(length = 500)
    private String formula;

    /**
     * Default fixed value when no formula is specified or as a fallback.
     */
    @Column(precision = 12, scale = 2)
    private BigDecimal defaultValue;

    /**
     * Evaluation order computed by topological sort.
     * Components with no dependencies get lower numbers.
     * This is recalculated whenever components are modified.
     */
    @Column(nullable = false)
    @Builder.Default
    private Integer evaluationOrder = 0;

    /**
     * Whether this component is currently active in payroll calculations.
     */
    @Column(nullable = false)
    @Builder.Default
    private Boolean isActive = true;

    /**
     * Whether this component is taxable.
     */
    @Column(nullable = false)
    @Builder.Default
    private Boolean isTaxable = true;

    /**
     * Description of the component for HR configuration UI.
     */
    @Column(length = 500)
    private String description;

    public enum ComponentType {
        EARNING,
        DEDUCTION,
        EMPLOYER_CONTRIBUTION
    }
}
