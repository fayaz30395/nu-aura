package com.nulogic.api.compensation.dto;

import com.nulogic.domain.compensation.CompensationReviewCycle.CycleType;
import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PositiveOrZero;
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

    // NU-AUDIT P2: these were previously unconstrained, so negative/absurd values
    // (e.g. budgetAmount=-999999, minIncrementPercentage=-100) flowed into cycle planning.
    @PositiveOrZero(message = "Budget amount cannot be negative")
    private BigDecimal budgetAmount;

    @DecimalMin(value = "0.0", message = "Min increment percentage cannot be negative")
    @DecimalMax(value = "100.0", message = "Min increment percentage cannot exceed 100")
    private BigDecimal minIncrementPercentage;

    @DecimalMin(value = "0.0", message = "Max increment percentage cannot be negative")
    @DecimalMax(value = "100.0", message = "Max increment percentage cannot exceed 100")
    private BigDecimal maxIncrementPercentage;

    @DecimalMin(value = "0.0", message = "Average increment target cannot be negative")
    @DecimalMax(value = "100.0", message = "Average increment target cannot exceed 100")
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
