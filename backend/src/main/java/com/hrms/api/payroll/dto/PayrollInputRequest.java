package com.hrms.api.payroll.dto;

import jakarta.validation.constraints.*;
import lombok.Data;

import java.math.BigDecimal;
import java.util.Map;

/**
 * Typed wrapper for the {@code POST /api/v1/payroll/components/evaluate} body.
 *
 * <p>Replaces a raw {@code @RequestBody Map<String, BigDecimal>} mass-assignment
 * sink (audit L-10.1). Bounds the map size, key length and value precision so
 * Jackson cannot be coerced into deserializing arbitrary numeric values or
 * unbounded payloads.</p>
 */
@Data
public class PayrollInputRequest {

    @NotNull
    @Size(min = 1, max = 50, message = "Input map must contain 1-50 entries")
    private Map<
            @NotBlank @Size(max = 100) String,
            @NotNull @PositiveOrZero @Digits(integer = 12, fraction = 4) BigDecimal
            > inputs;
}
