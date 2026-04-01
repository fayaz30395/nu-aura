package com.hrms.api.shift.dto;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ShiftPatternRequest {

    @NotBlank(message = "Pattern name is required")
    private String name;

    private String description;

    @NotBlank(message = "Rotation type is required")
    private String rotationType; // FIXED, WEEKLY_ROTATING, BIWEEKLY_ROTATING, CUSTOM

    /**
     * JSON array of shift IDs forming the rotation cycle.
     * Use "OFF" for days off.
     * Example: ["uuid1","uuid1","uuid2","uuid2","OFF","OFF"]
     */
    @NotBlank(message = "Pattern is required")
    private String pattern;

    @NotNull(message = "Cycle days is required")
    @Min(value = 1, message = "Cycle days must be at least 1")
    private Integer cycleDays;

    private Boolean isActive;

    private String colorCode;
}
