package com.hrms.api.loan.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * DTO for loan rejection requests.
 * Replaces unsafe Map<String, String> with type-safe validated fields.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class RejectLoanRequest {

    /**
     * Reason for rejecting the loan application. Required.
     */
    @NotBlank(message = "Rejection reason is required")
    @Size(min = 10, max = 500, message = "Rejection reason must be between 10 and 500 characters")
    private String reason;
}
