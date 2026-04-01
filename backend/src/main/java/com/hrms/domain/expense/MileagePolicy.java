package com.hrms.domain.expense;

import com.hrms.common.entity.TenantAware;
import jakarta.persistence.*;
import org.hibernate.annotations.Where;
import lombok.*;
import lombok.experimental.SuperBuilder;

import java.math.BigDecimal;
import java.time.LocalDate;

@Where(clause = "is_deleted = false")
@Entity
@Table(name = "mileage_policies", indexes = {
    @Index(name = "idx_mileage_policy_tenant", columnList = "tenantId"),
    @Index(name = "idx_mileage_policy_tenant_active", columnList = "tenantId,is_active")
}, uniqueConstraints = {
    @UniqueConstraint(name = "uk_mileage_policy_tenant_name", columnNames = {"tenantId", "name"})
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@SuperBuilder
public class MileagePolicy extends TenantAware {

    @Column(nullable = false, length = 200)
    private String name;

    @Column(name = "rate_per_km", nullable = false, precision = 6, scale = 2)
    private BigDecimal ratePerKm;

    @Column(name = "max_daily_km", precision = 8, scale = 2)
    private BigDecimal maxDailyKm;

    @Column(name = "max_monthly_km", precision = 8, scale = 2)
    private BigDecimal maxMonthlyKm;

    /**
     * JSON string storing per-vehicle-type rate overrides.
     * Format: {"CAR": 0.58, "MOTORCYCLE": 0.30, "BICYCLE": 0.10, "PUBLIC_TRANSPORT": 0.20}
     */
    @Column(name = "vehicle_rates", columnDefinition = "TEXT")
    private String vehicleRates;

    @Column(name = "is_active", nullable = false)
    @Builder.Default
    private boolean isActive = true;

    @Column(name = "effective_from", nullable = false)
    private LocalDate effectiveFrom;

    @Column(name = "effective_to")
    private LocalDate effectiveTo;
}
