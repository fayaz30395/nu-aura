package com.hrms.domain.expense;

import com.hrms.common.entity.TenantAware;
import jakarta.persistence.*;
import org.hibernate.annotations.Where;
import lombok.*;
import lombok.experimental.SuperBuilder;

import java.math.BigDecimal;
import java.util.UUID;

/**
 * Configurable expense category per tenant.
 * Replaces the old ExpenseCategory enum for tenant-specific customisation.
 * Supports hierarchical categories via parentCategoryId.
 */
@Where(clause = "is_deleted = false")
@Entity
@Table(name = "expense_categories", indexes = {
        @Index(name = "idx_expense_cat_tenant", columnList = "tenantId"),
        @Index(name = "idx_expense_cat_tenant_active", columnList = "tenantId,isActive"),
        @Index(name = "idx_expense_cat_parent", columnList = "parent_category_id")
}, uniqueConstraints = {
        @UniqueConstraint(name = "uk_expense_cat_tenant_name", columnNames = {"tenantId", "name"})
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@SuperBuilder
public class ExpenseCategoryEntity extends TenantAware {

    @Column(nullable = false, length = 100)
    private String name;

    @Column(length = 500)
    private String description;

    @Column(name = "max_amount", precision = 12, scale = 2)
    private BigDecimal maxAmount;

    @Column(name = "requires_receipt", nullable = false)
    @Builder.Default
    private boolean requiresReceipt = false;

    @Column(name = "is_active", nullable = false)
    @Builder.Default
    private boolean isActive = true;

    @Column(name = "parent_category_id")
    private UUID parentCategoryId;

    @Column(name = "gl_code", length = 50)
    private String glCode;

    @Column(name = "icon_name", length = 50)
    private String iconName;

    @Column(name = "sort_order")
    @Builder.Default
    private int sortOrder = 0;
}
