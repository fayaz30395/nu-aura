package com.nulogic.api.travel.dto;

import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.PositiveOrZero;
import jakarta.validation.constraints.Size;
import lombok.Data;

import java.math.BigDecimal;
import java.util.UUID;

/**
 * Typed body for {@code POST /api/v1/travel/expenses/{id}/approve}.
 *
 * <p>Replaces a raw {@code @RequestBody Map<String, Object>} mass-assignment sink
 * (audit L-10.1). All fields are explicit and bounded so Jackson cannot deserialize
 * arbitrary nested objects.</p>
 *
 * <p>{@code approverId} is optional — when omitted the controller falls back to the
 * authenticated principal. The previous Map-based contract did not enforce its
 * presence, so leaving the field nullable preserves backward compatibility.</p>
 */
@Data
public class TravelExpenseApprovalRequest {

    private UUID approverId;

    @PositiveOrZero(message = "Approved amount must be zero or positive")
    @Digits(integer = 12, fraction = 2, message = "Approved amount precision exceeded")
    private BigDecimal approvedAmount;

    @Size(max = 2000, message = "Comments must not exceed 2000 characters")
    private String comments;
}
