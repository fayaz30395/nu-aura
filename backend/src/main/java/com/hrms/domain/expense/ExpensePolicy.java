package com.hrms.domain.expense;

import com.hrms.common.entity.TenantAware;
import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.SuperBuilder;

import java.math.BigDecimal;

/**
 * Expense policy defines spending limits and rules per tenant.
 * Policies can be scoped to specific departments or designations via JSON columns.
 */
@Entity
@Table(name = "expense_policies", indexes = {
    @Index(name = "idx_expense_policy_tenant", columnList = "tenantId"),
    @Index(name = "idx_expense_policy_tenant_active", columnList = "tenantId,isActive")
}, uniqueConstraints = {
    @UniqueConstraint(name = "uk_expense_policy_tenant_name", columnNames = {"tenantId", "name"})
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@SuperBuilder
public class ExpensePolicy extends TenantAware {

    @Column(nullable = false, length = 150)
    private String name;

    @Column(length = 500)
    private String description;

    /**
     * JSON array of department UUIDs this policy applies to.
     * Null means all departments.
     */
    @Column(name = "applicable_departments", columnDefinition = "TEXT")
    private String applicableDepartments;

    /**
     * JSON array of designation strings this policy applies to.
     * Null means all designations.
     */
    @Column(name = "applicable_designations", columnDefinition = "TEXT")
    private String applicableDesignations;

    @Column(name = "daily_limit", precision = 12, scale = 2)
    private BigDecimal dailyLimit;

    @Column(name = "monthly_limit", precision = 12, scale = 2)
    private BigDecimal monthlyLimit;

    @Column(name = "yearly_limit", precision = 12, scale = 2)
    private BigDecimal yearlyLimit;

    @Column(name = "single_claim_limit", precision = 12, scale = 2)
    private BigDecimal singleClaimLimit;

    @Column(name = "requires_pre_approval", nullable = false)
    @Builder.Default
    private boolean requiresPreApproval = false;

    @Column(name = "pre_approval_threshold", precision = 12, scale = 2)
    private BigDecimal preApprovalThreshold;

    @Column(name = "receipt_required_above", precision = 12, scale = 2)
    private BigDecimal receiptRequiredAbove;

    @Column(name = "is_active", nullable = false)
    @Builder.Default
    private boolean isActive = true;

    @Column(length = 3)
    @Builder.Default
    private String currency = "INR";
}
