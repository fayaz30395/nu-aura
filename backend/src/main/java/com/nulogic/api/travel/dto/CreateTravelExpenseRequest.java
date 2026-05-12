package com.nulogic.api.travel.dto;

import com.nulogic.domain.travel.TravelExpense;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;
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
public class CreateTravelExpenseRequest {

    @NotNull
    private UUID travelRequestId;

    @NotNull
    private UUID employeeId;

    @NotNull
    private TravelExpense.ExpenseType expenseType;

    private String description;

    @NotNull
    private LocalDate expenseDate;

    @NotNull
    @DecimalMin("0.01")
    private BigDecimal amount;

    private String currency;

    private BigDecimal exchangeRate;

    private String receiptPath;

    private String receiptNumber;

    private String remarks;
}
