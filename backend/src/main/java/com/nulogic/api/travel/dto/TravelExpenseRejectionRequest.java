package com.nulogic.api.travel.dto;

import jakarta.validation.constraints.Size;
import lombok.Data;

import java.util.UUID;

/**
 * Typed body for {@code POST /api/v1/travel/expenses/{id}/reject}.
 *
 * <p>Replaces a raw {@code @RequestBody Map<String, String>} mass-assignment sink
 * (audit L-10.1). All fields are explicit and bounded.</p>
 */
@Data
public class TravelExpenseRejectionRequest {

    private UUID approverId;

    @Size(max = 2000, message = "Rejection reason must not exceed 2000 characters")
    private String reason;
}
