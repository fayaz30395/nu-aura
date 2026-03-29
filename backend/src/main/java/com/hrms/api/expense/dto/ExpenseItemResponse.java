package com.hrms.api.expense.dto;

import com.hrms.domain.expense.ExpenseItem;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ExpenseItemResponse {
    private UUID id;
    private UUID expenseClaimId;
    private UUID categoryId;
    private String categoryName;
    private String description;
    private BigDecimal amount;
    private String currency;
    private LocalDate expenseDate;
    private String receiptStoragePath;
    private String receiptFileName;
    private String merchantName;
    private boolean isBillable;
    private String projectCode;
    private String notes;
    private LocalDateTime createdAt;

    public static ExpenseItemResponse fromEntity(ExpenseItem entity) {
        return ExpenseItemResponse.builder()
                .id(entity.getId())
                .expenseClaimId(entity.getExpenseClaimId())
                .categoryId(entity.getCategoryId())
                .description(entity.getDescription())
                .amount(entity.getAmount())
                .currency(entity.getCurrency())
                .expenseDate(entity.getExpenseDate())
                .receiptStoragePath(entity.getReceiptStoragePath())
                .receiptFileName(entity.getReceiptFileName())
                .merchantName(entity.getMerchantName())
                .isBillable(entity.isBillable())
                .projectCode(entity.getProjectCode())
                .notes(entity.getNotes())
                .createdAt(entity.getCreatedAt())
                .build();
    }
}
