package com.hrms.api.payroll.dto;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.hrms.domain.payroll.PayrollComponent.ComponentType;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.*;
import lombok.Data;

import java.math.BigDecimal;

/**
 * Whitelist DTO for {@code PUT /api/v1/payroll/components/{id}}.
 *
 * <p>Replaces direct {@code @RequestBody PayrollComponent} binding to close
 * mass-assignment vector R-1.10. {@code code} is immutable post-create (the
 * service does not copy it on update) and is intentionally omitted.
 * System fields (id, tenantId, evaluationOrder) are NEVER accepted.</p>
 */
@Data
@JsonInclude(JsonInclude.Include.NON_NULL)
@Schema(description = "Request body for updating a payroll component. " +
        "Code is immutable; evaluationOrder is recomputed server-side.")
public class UpdatePayrollComponentRequest {

    @NotBlank(message = "Name is required")
    @Size(max = 100, message = "Name must not exceed 100 characters")
    private String name;

    @NotNull(message = "Component type is required")
    private ComponentType componentType;

    @Size(max = 500, message = "Formula must not exceed 500 characters")
    private String formula;

    @PositiveOrZero(message = "Default value must be non-negative")
    @Digits(integer = 12, fraction = 2)
    private BigDecimal defaultValue;

    @NotNull(message = "isActive is required")
    private Boolean isActive;

    @NotNull(message = "isTaxable is required")
    private Boolean isTaxable;

    @Size(max = 500, message = "Description must not exceed 500 characters")
    private String description;
}
