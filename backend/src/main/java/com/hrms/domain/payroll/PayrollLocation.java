package com.hrms.domain.payroll;

import com.hrms.common.entity.TenantAware;
import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.SuperBuilder;

import java.math.BigDecimal;
import java.util.UUID;

@Entity
@Table(name = "payroll_locations")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@SuperBuilder
public class PayrollLocation extends TenantAware {


    @Column(name = "location_code", nullable = false)
    private String locationCode;

    @Column(name = "location_name", nullable = false)
    private String locationName;

    @Column(name = "country_code", length = 2, nullable = false)
    private String countryCode;

    @Column(name = "country_name")
    private String countryName;

    @Column(name = "region")
    private String region; // State/Province

    @Column(name = "local_currency", length = 3, nullable = false)
    private String localCurrency;

    @Column(name = "timezone")
    private String timezone;

    // Tax Settings
    @Column(name = "income_tax_applicable")
    @Builder.Default
    private Boolean incomeTaxApplicable = true;

    @Column(name = "social_security_applicable")
    @Builder.Default
    private Boolean socialSecurityApplicable = true;

    @Column(name = "statutory_bonus_applicable")
    @Builder.Default
    private Boolean statutoryBonusApplicable = false;

    // Tax rates (simplified - in real world would be more complex)
    @Column(name = "base_income_tax_rate", precision = 5, scale = 2)
    private BigDecimal baseIncomeTaxRate;

    @Column(name = "social_security_employee_rate", precision = 5, scale = 2)
    private BigDecimal socialSecurityEmployeeRate;

    @Column(name = "social_security_employer_rate", precision = 5, scale = 2)
    private BigDecimal socialSecurityEmployerRate;

    // Payroll Schedule
    @Enumerated(EnumType.STRING)
    @Column(name = "pay_frequency")
    @Builder.Default
    private PayFrequency payFrequency = PayFrequency.MONTHLY;

    @Column(name = "pay_day")
    private Integer payDay; // Day of month for monthly, day of week for weekly

    // Compliance
    @Column(name = "min_wage", precision = 12, scale = 2)
    private BigDecimal minWage;

    @Column(name = "min_wage_unit")
    private String minWageUnit; // HOURLY, DAILY, MONTHLY

    @Column(name = "max_working_hours_week")
    private Integer maxWorkingHoursWeek;

    @Column(name = "overtime_multiplier", precision = 3, scale = 2)
    @Builder.Default
    private BigDecimal overtimeMultiplier = BigDecimal.valueOf(1.5);

    @Column(name = "is_active")
    @Builder.Default
    private Boolean isActive = true;

    @Column(name = "compliance_notes", columnDefinition = "TEXT")
    private String complianceNotes;

    public enum PayFrequency {
        WEEKLY,
        BIWEEKLY,
        SEMIMONTHLY,
        MONTHLY
    }
}
