package com.hrms.api.expense.dto;

import jakarta.validation.constraints.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ExpensePolicyRequest {

    @NotBlank(message = "Policy name is required")
    @Size(max = 150, message = "Name cannot exceed 150 characters")
    private String name;

    @Size(max = 500, message = "Description cannot exceed 500 characters")
    private String description;

    private List<UUID> applicableDepartments;

    private List<String> applicableDesignations;

    @DecimalMin(value = "0.01", message = "Daily limit must be positive")
    @Digits(integer = 10, fraction = 2)
    private BigDecimal dailyLimit;

    @DecimalMin(value = "0.01", message = "Monthly limit must be positive")
    @Digits(integer = 10, fraction = 2)
    private BigDecimal monthlyLimit;

    @DecimalMin(value = "0.01", message = "Yearly limit must be positive")
    @Digits(integer = 10, fraction = 2)
    private BigDecimal yearlyLimit;

    @DecimalMin(value = "0.01", message = "Single claim limit must be positive")
    @Digits(integer = 10, fraction = 2)
    private BigDecimal singleClaimLimit;

    private boolean requiresPreApproval;

    @DecimalMin(value = "0.01", message = "Pre-approval threshold must be positive")
    @Digits(integer = 10, fraction = 2)
    private BigDecimal preApprovalThreshold;

    @DecimalMin(value = "0.01", message = "Receipt threshold must be positive")
    @Digits(integer = 10, fraction = 2)
    private BigDecimal receiptRequiredAbove;

    @Size(max = 3, message = "Currency code must be 3 characters")
    private String currency;
}
