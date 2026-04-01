package com.hrms.api.expense.dto;

import jakarta.validation.constraints.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ExpenseItemRequest {

    private UUID categoryId;

    @NotBlank(message = "Description is required")
    @Size(max = 500, message = "Description cannot exceed 500 characters")
    private String description;

    @NotNull(message = "Amount is required")
    @DecimalMin(value = "0.01", message = "Amount must be greater than 0")
    @Digits(integer = 10, fraction = 2, message = "Amount format is invalid")
    private BigDecimal amount;

    @Size(max = 3, message = "Currency code must be 3 characters")
    @Builder.Default
    private String currency = "INR";

    @NotNull(message = "Expense date is required")
    @PastOrPresent(message = "Expense date cannot be in the future")
    private LocalDate expenseDate;

    @Size(max = 200, message = "Merchant name cannot exceed 200 characters")
    private String merchantName;

    private boolean isBillable;

    @Size(max = 50, message = "Project code cannot exceed 50 characters")
    private String projectCode;

    @Size(max = 1000, message = "Notes cannot exceed 1000 characters")
    private String notes;
}
