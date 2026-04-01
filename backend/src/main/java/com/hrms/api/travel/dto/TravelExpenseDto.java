package com.hrms.api.travel.dto;

import com.hrms.domain.travel.TravelExpense;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TravelExpenseDto {

    private UUID id;
    private UUID tenantId;
    private UUID travelRequestId;
    private UUID employeeId;
    private TravelExpense.ExpenseType expenseType;
    private String description;
    private LocalDate expenseDate;
    private BigDecimal amount;
    private String currency;
    private BigDecimal exchangeRate;
    private BigDecimal amountInBaseCurrency;
    private String receiptPath;
    private String receiptNumber;
    private TravelExpense.ExpenseStatus status;
    private BigDecimal approvedAmount;
    private UUID approvedBy;
    private LocalDate approvedDate;
    private String rejectionReason;
    private String remarks;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
