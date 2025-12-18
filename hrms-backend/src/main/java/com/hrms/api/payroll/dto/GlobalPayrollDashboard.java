package com.hrms.api.payroll.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class GlobalPayrollDashboard {

    // Overview
    private Integer totalLocations;
    private Integer totalCurrencies;
    private Integer totalEmployeesInPayroll;
    private String baseCurrency;

    // Current Period
    private GlobalPayrollRunDto currentPayrollRun;
    private List<GlobalPayrollRunDto> pendingRuns;

    // YTD Summary
    private BigDecimal ytdGrossPayBase;
    private BigDecimal ytdNetPayBase;
    private BigDecimal ytdEmployerCostBase;
    private Integer ytdPayrollRuns;

    // By Currency
    private List<CurrencySummary> currencySummaries;

    // By Location
    private List<LocationSummary> locationSummaries;

    // Exchange Rates
    private List<ExchangeRateDto> currentRates;

    // Compliance Alerts
    private List<ComplianceAlert> complianceAlerts;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class CurrencySummary {
        private String currencyCode;
        private String currencyName;
        private String symbol;
        private Integer employeeCount;
        private BigDecimal totalGrossLocal;
        private BigDecimal totalGrossBase;
        private BigDecimal exchangeRate;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class LocationSummary {
        private String locationCode;
        private String locationName;
        private String countryCode;
        private String currency;
        private Integer employeeCount;
        private BigDecimal totalGrossLocal;
        private BigDecimal totalGrossBase;
        private String payFrequency;
        private Integer nextPayDay;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ComplianceAlert {
        private String alertType; // MIN_WAGE, TAX_RATE_CHANGE, EXCHANGE_RATE, etc.
        private String severity; // INFO, WARNING, CRITICAL
        private String locationCode;
        private String message;
        private String actionRequired;
    }
}
