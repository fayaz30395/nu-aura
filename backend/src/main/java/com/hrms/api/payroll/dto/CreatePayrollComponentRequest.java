package com.hrms.api.payroll.dto;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.hrms.domain.payroll.PayrollComponent.ComponentType;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PositiveOrZero;
import jakarta.validation.constraints.Size;
import lombok.Data;

import java.math.BigDecimal;

/**
 * Whitelist DTO for {@code POST /api/v1/payroll/components}.
 *
 * <p>Replaces direct {@code @RequestBody PayrollComponent} binding to close
 * mass-assignment vector R-1.10. System fields (id, tenantId, evaluationOrder
 * — computed via topological sort — and audit fields) are NEVER accepted.</p>
 */
@Data
@JsonInclude(JsonInclude.Include.NON_NULL)
@Schema(description = "Request body for creating a payroll component. " +
        "evaluationOrder is computed server-side via topological sort.")
public class CreatePayrollComponentRequest {

    @NotBlank(message = "Code is required")
    @Size(max = 50, message = "Code must not exceed 50 characters")
    @Schema(description = "Unique code within the tenant (e.g. \"basic\", \"hra\")", required = true)
    private String code;

    @NotBlank(message = "Name is required")
    @Size(max = 100, message = "Name must not exceed 100 characters")
    @Schema(description = "Human-readable display name", required = true)
    private String name;

    @NotNull(message = "Component type is required")
    @Schema(description = "EARNING, DEDUCTION, or EMPLOYER_CONTRIBUTION", required = true)
    private ComponentType componentType;

    @Size(max = 500, message = "Formula must not exceed 500 characters")
    @Schema(description = "Optional SpEL formula referencing other component codes")
    private String formula;

    @PositiveOrZero(message = "Default value must be non-negative")
    @Digits(integer = 12, fraction = 2)
    @Schema(description = "Fallback fixed value when formula is null")
    private BigDecimal defaultValue;

    @Schema(description = "Whether the component is active (defaults to true)")
    private Boolean isActive;

    @Schema(description = "Whether the component is taxable (defaults to true)")
    private Boolean isTaxable;

    @Size(max = 500, message = "Description must not exceed 500 characters")
    @Schema(description = "Optional description for HR configuration UI")
    private String description;
}
