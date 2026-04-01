package com.hrms.api.payroll.dto;

import com.hrms.domain.payroll.PayrollLocation;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PayrollLocationDto {

    private UUID id;
    private String locationCode;
    private String locationName;
    private String countryCode;
    private String countryName;
    private String region;
    private String localCurrency;
    private String timezone;

    // Tax settings
    private Boolean incomeTaxApplicable;
    private Boolean socialSecurityApplicable;
    private Boolean statutoryBonusApplicable;
    private BigDecimal baseIncomeTaxRate;
    private BigDecimal socialSecurityEmployeeRate;
    private BigDecimal socialSecurityEmployerRate;

    // Payroll schedule
    private String payFrequency;
    private Integer payDay;

    // Compliance
    private BigDecimal minWage;
    private String minWageUnit;
    private Integer maxWorkingHoursWeek;
    private BigDecimal overtimeMultiplier;

    private Boolean isActive;
    private String complianceNotes;

    public static PayrollLocationDto fromEntity(PayrollLocation location) {
        return PayrollLocationDto.builder()
                .id(location.getId())
                .locationCode(location.getLocationCode())
                .locationName(location.getLocationName())
                .countryCode(location.getCountryCode())
                .countryName(location.getCountryName())
                .region(location.getRegion())
                .localCurrency(location.getLocalCurrency())
                .timezone(location.getTimezone())
                .incomeTaxApplicable(location.getIncomeTaxApplicable())
                .socialSecurityApplicable(location.getSocialSecurityApplicable())
                .statutoryBonusApplicable(location.getStatutoryBonusApplicable())
                .baseIncomeTaxRate(location.getBaseIncomeTaxRate())
                .socialSecurityEmployeeRate(location.getSocialSecurityEmployeeRate())
                .socialSecurityEmployerRate(location.getSocialSecurityEmployerRate())
                .payFrequency(location.getPayFrequency() != null ? location.getPayFrequency().name() : null)
                .payDay(location.getPayDay())
                .minWage(location.getMinWage())
                .minWageUnit(location.getMinWageUnit())
                .maxWorkingHoursWeek(location.getMaxWorkingHoursWeek())
                .overtimeMultiplier(location.getOvertimeMultiplier())
                .isActive(location.getIsActive())
                .complianceNotes(location.getComplianceNotes())
                .build();
    }
}
