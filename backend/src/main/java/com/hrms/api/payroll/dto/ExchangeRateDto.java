package com.hrms.api.payroll.dto;

import com.hrms.domain.payroll.ExchangeRate;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ExchangeRateDto {

    private UUID id;
    private String fromCurrency;
    private String toCurrency;
    private BigDecimal rate;
    private LocalDate effectiveDate;
    private LocalDate expiryDate;
    private String rateType;
    private String source;
    private Boolean isManualOverride;
    private String notes;

    // Convenience fields
    private BigDecimal inverseRate;

    public static ExchangeRateDto fromEntity(ExchangeRate rate) {
        BigDecimal inverseRate = null;
        if (rate.getRate() != null && rate.getRate().compareTo(BigDecimal.ZERO) > 0) {
            inverseRate = BigDecimal.ONE.divide(rate.getRate(), 8, java.math.RoundingMode.HALF_UP);
        }

        return ExchangeRateDto.builder()
                .id(rate.getId())
                .fromCurrency(rate.getFromCurrency())
                .toCurrency(rate.getToCurrency())
                .rate(rate.getRate())
                .effectiveDate(rate.getEffectiveDate())
                .expiryDate(rate.getExpiryDate())
                .rateType(rate.getRateType() != null ? rate.getRateType().name() : null)
                .source(rate.getSource())
                .isManualOverride(rate.getIsManualOverride())
                .notes(rate.getNotes())
                .inverseRate(inverseRate)
                .build();
    }
}
