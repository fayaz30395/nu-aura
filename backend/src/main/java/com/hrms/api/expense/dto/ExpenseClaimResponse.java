package com.hrms.api.expense.dto;

import com.hrms.domain.expense.ExpenseClaim;
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
@Builder(toBuilder = true)
public class ExpenseClaimResponse {
    private UUID id;
    private UUID employeeId;
    private String employeeName;
    private String claimNumber;
    private LocalDate claimDate;
    private ExpenseClaim.ExpenseCategory category;
    private String categoryDisplayName;
    private String description;
    private BigDecimal amount;
    private String currency;
    private ExpenseClaim.ExpenseStatus status;
    private String statusDisplayName;
    private String receiptUrl;
    private LocalDateTime submittedAt;
    private UUID approvedBy;
    private String approvedByName;
    private LocalDateTime approvedAt;
    private UUID rejectedBy;
    private String rejectedByName;
    private LocalDateTime rejectedAt;
    private String rejectionReason;
    private LocalDate paymentDate;
    private String paymentReference;
    private String notes;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    public static ExpenseClaimResponse fromEntity(ExpenseClaim entity) {
        return ExpenseClaimResponse.builder()
                .id(entity.getId())
                .employeeId(entity.getEmployeeId())
                .claimNumber(entity.getClaimNumber())
                .claimDate(entity.getClaimDate())
                .category(entity.getCategory())
                .categoryDisplayName(formatCategory(entity.getCategory()))
                .description(entity.getDescription())
                .amount(entity.getAmount())
                .currency(entity.getCurrency())
                .status(entity.getStatus())
                .statusDisplayName(formatStatus(entity.getStatus()))
                .receiptUrl(entity.getReceiptUrl())
                .submittedAt(entity.getSubmittedAt())
                .approvedBy(entity.getApprovedBy())
                .approvedAt(entity.getApprovedAt())
                .rejectedBy(entity.getRejectedBy())
                .rejectedAt(entity.getRejectedAt())
                .rejectionReason(entity.getRejectionReason())
                .paymentDate(entity.getPaymentDate())
                .paymentReference(entity.getPaymentReference())
                .notes(entity.getNotes())
                .createdAt(entity.getCreatedAt())
                .updatedAt(entity.getUpdatedAt())
                .build();
    }

    private static String formatCategory(ExpenseClaim.ExpenseCategory category) {
        if (category == null) return null;
        return category.name().replace("_", " ");
    }

    private static String formatStatus(ExpenseClaim.ExpenseStatus status) {
        if (status == null) return null;
        return status.name().replace("_", " ");
    }
}
