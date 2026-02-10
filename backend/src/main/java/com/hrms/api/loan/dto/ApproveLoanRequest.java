package com.hrms.api.loan.dto;

import jakarta.validation.constraints.Positive;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

/**
 * DTO for loan approval requests.
 * Replaces unsafe Map<String, Object> with type-safe fields.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ApproveLoanRequest {

    /**
     * Optional approved amount. If not provided, the full requested amount is approved.
     */
    @Positive(message = "Approved amount must be positive")
    private BigDecimal approvedAmount;

    /**
     * Optional comment from the approver.
     */
    private String comment;
}
