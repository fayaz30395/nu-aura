package com.hrms.domain.attendance;

import com.hrms.common.entity.TenantAware;
import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.SuperBuilder;

/**
 * Tenant-level policy governing restricted holiday selections.
 * One policy per tenant per year.
 */
@Entity
@Table(name = "restricted_holiday_policies", indexes = {
    @Index(name = "idx_rhp_tenant_id", columnList = "tenantId"),
    @Index(name = "idx_rhp_year", columnList = "year")
}, uniqueConstraints = {
    @UniqueConstraint(name = "uk_rhp_tenant_year",
        columnNames = {"tenantId", "year"})
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@SuperBuilder
public class RestrictedHolidayPolicy extends TenantAware {

    /** Maximum number of restricted holidays an employee can select per year */
    @Column(name = "max_selections_per_year", nullable = false)
    @Builder.Default
    private Integer maxSelectionsPerYear = 3;

    /** Whether manager approval is required for selections */
    @Column(name = "requires_approval", nullable = false)
    @Builder.Default
    private Boolean requiresApproval = true;

    /** JSON array of department UUIDs this policy applies to. Null means all. */
    @Column(name = "applicable_departments", columnDefinition = "TEXT")
    private String applicableDepartments;

    @Column(nullable = false)
    private Integer year;

    @Column(name = "is_active", nullable = false)
    @Builder.Default
    private Boolean isActive = true;

    /** Minimum days before the holiday that selection must be made */
    @Column(name = "min_days_before_selection")
    @Builder.Default
    private Integer minDaysBeforeSelection = 7;
}
