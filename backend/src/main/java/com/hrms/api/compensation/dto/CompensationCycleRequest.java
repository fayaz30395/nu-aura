package com.hrms.api.compensation.dto;

import com.hrms.domain.compensation.CompensationReviewCycle.CycleType;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CompensationCycleRequest {

    @NotBlank(message = "Cycle name is required")
    private String name;

    private String description;

    @NotNull(message = "Cycle type is required")
    private CycleType cycleType;

    @NotNull(message = "Fiscal year is required")
    private Integer fiscalYear;

    @NotNull(message = "Start date is required")
    private LocalDate startDate;

    @NotNull(message = "End date is required")
    private LocalDate endDate;

    @NotNull(message = "Effective date is required")
    private LocalDate effectiveDate;

    private BigDecimal budgetAmount;

    private BigDecimal minIncrementPercentage;

    private BigDecimal maxIncrementPercentage;

    private BigDecimal averageIncrementTarget;

    private Boolean includeAllEmployees;

    private Integer minTenureMonths;

    private Boolean excludeProbationers;

    private Boolean excludeNoticePeriod;

    private Boolean allowPromotions;

    private Boolean requirePerformanceRating;

    private Double minPerformanceRating;

    private String currency;
}
