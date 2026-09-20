package com.nulogic.api.expense.dto;

import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.Size;
import lombok.Data;

import java.util.List;
import java.util.UUID;

/**
 * Request to bulk-approve multiple expense claims in one call, from the
 * admin expense-claims table's multi-select toolbar.
 */
@Data
public class BatchExpenseActionRequest {

    @NotEmpty(message = "claimIds must not be empty")
    @Size(max = 200, message = "Cannot process more than 200 expense claims in a single batch")
    private List<UUID> claimIds;
}
