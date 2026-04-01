package com.hrms.api.loan.dto;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;

/**
 * DTO for recording loan repayment.
 * Replaces unsafe Map<String, Object> with type-safe validated fields.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class RecordRepaymentRequest {

    /**
     * Repayment amount. Required and must be positive.
     */
    @NotNull(message = "Repayment amount is required")
    @Positive(message = "Repayment amount must be positive")
    private BigDecimal amount;

    /**
     * Optional payment date. Defaults to today if not provided.
     */
    private LocalDate paymentDate;

    /**
     * Optional reference number for the payment.
     */
    private String referenceNumber;

    /**
     * Optional notes about the repayment.
     */
    private String notes;
}
