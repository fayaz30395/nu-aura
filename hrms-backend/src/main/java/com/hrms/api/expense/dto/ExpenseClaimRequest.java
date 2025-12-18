package com.hrms.api.expense.dto;

import com.hrms.domain.expense.ExpenseClaim;
import jakarta.validation.constraints.*;
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
public class ExpenseClaimRequest {

    @NotNull(message = "Claim date is required")
    @PastOrPresent(message = "Claim date cannot be in the future")
    private LocalDate claimDate;

    @NotNull(message = "Category is required")
    private ExpenseClaim.ExpenseCategory category;

    @NotBlank(message = "Description is required")
    @Size(max = 500, message = "Description cannot exceed 500 characters")
    private String description;

    @NotNull(message = "Amount is required")
    @DecimalMin(value = "0.01", message = "Amount must be greater than 0")
    @Digits(integer = 8, fraction = 2, message = "Amount format is invalid")
    private BigDecimal amount;

    @Size(max = 3, message = "Currency code must be 3 characters")
    private String currency = "USD";

    @Size(max = 500, message = "Receipt URL cannot exceed 500 characters")
    private String receiptUrl;

    @Size(max = 1000, message = "Notes cannot exceed 1000 characters")
    private String notes;
}
