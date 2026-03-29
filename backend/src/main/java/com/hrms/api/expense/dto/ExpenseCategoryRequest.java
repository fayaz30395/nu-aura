package com.hrms.api.expense.dto;

import jakarta.validation.constraints.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.util.UUID;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ExpenseCategoryRequest {

    @NotBlank(message = "Category name is required")
    @Size(max = 100, message = "Name cannot exceed 100 characters")
    private String name;

    @Size(max = 500, message = "Description cannot exceed 500 characters")
    private String description;

    @DecimalMin(value = "0.01", message = "Max amount must be positive")
    @Digits(integer = 10, fraction = 2)
    private BigDecimal maxAmount;

    private boolean requiresReceipt;

    private UUID parentCategoryId;

    @Size(max = 50, message = "GL code cannot exceed 50 characters")
    private String glCode;

    @Size(max = 50, message = "Icon name cannot exceed 50 characters")
    private String iconName;

    private int sortOrder;
}
