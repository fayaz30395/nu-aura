package com.hrms.api.expense.dto;

import com.hrms.domain.expense.ExpenseAdvance;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ExpenseAdvanceResponse {
    private UUID id;
    private UUID employeeId;
    private String employeeName;
    private BigDecimal amount;
    private String currency;
    private String purpose;
    private ExpenseAdvance.AdvanceStatus status;
    private LocalDateTime requestedAt;
    private UUID approvedBy;
    private String approvedByName;
    private LocalDateTime approvedAt;
    private LocalDateTime disbursedAt;
    private LocalDateTime settledAt;
    private UUID settlementClaimId;
    private String notes;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    public static ExpenseAdvanceResponse fromEntity(ExpenseAdvance entity) {
        return ExpenseAdvanceResponse.builder()
                .id(entity.getId())
                .employeeId(entity.getEmployeeId())
                .amount(entity.getAmount())
                .currency(entity.getCurrency())
                .purpose(entity.getPurpose())
                .status(entity.getStatus())
                .requestedAt(entity.getRequestedAt())
                .approvedBy(entity.getApprovedBy())
                .approvedAt(entity.getApprovedAt())
                .disbursedAt(entity.getDisbursedAt())
                .settledAt(entity.getSettledAt())
                .settlementClaimId(entity.getSettlementClaimId())
                .notes(entity.getNotes())
                .createdAt(entity.getCreatedAt())
                .updatedAt(entity.getUpdatedAt())
                .build();
    }
}
