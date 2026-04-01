package com.hrms.api.payroll.dto;

import com.hrms.domain.payroll.Currency;
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
public class CurrencyDto {

    private UUID id;
    private String currencyCode;
    private String currencyName;
    private String symbol;
    private Integer decimalPlaces;
    private Boolean isBaseCurrency;
    private Boolean isActive;
    private String countryCode;
    private BigDecimal exchangeRateToBase;
    private String notes;

    public static CurrencyDto fromEntity(Currency currency) {
        return CurrencyDto.builder()
                .id(currency.getId())
                .currencyCode(currency.getCurrencyCode())
                .currencyName(currency.getCurrencyName())
                .symbol(currency.getSymbol())
                .decimalPlaces(currency.getDecimalPlaces())
                .isBaseCurrency(currency.getIsBaseCurrency())
                .isActive(currency.getIsActive())
                .countryCode(currency.getCountryCode())
                .exchangeRateToBase(currency.getExchangeRateToBase())
                .notes(currency.getNotes())
                .build();
    }
}
