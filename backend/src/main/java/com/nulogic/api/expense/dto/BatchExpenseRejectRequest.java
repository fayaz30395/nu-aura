package com.nulogic.api.expense.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;
import lombok.EqualsAndHashCode;

/**
 * Request to bulk-reject multiple expense claims in one call. Extends
 * {@link BatchExpenseActionRequest} with the shared rejection reason applied
 * to every claim in the batch.
 */
@Data
@EqualsAndHashCode(callSuper = true)
public class BatchExpenseRejectRequest extends BatchExpenseActionRequest {

    @NotBlank(message = "reason is required")
    @Size(max = 1000, message = "reason must be at most 1000 characters")
    private String reason;
}
