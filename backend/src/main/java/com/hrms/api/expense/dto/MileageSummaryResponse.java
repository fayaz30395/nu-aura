package com.hrms.api.expense.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class MileageSummaryResponse {
    private int year;
    private int month;
    private BigDecimal totalDistanceKm;
    private BigDecimal totalReimbursement;
    private long totalTrips;
    private BigDecimal policyMaxMonthlyKm;
    private BigDecimal remainingMonthlyKm;
}
