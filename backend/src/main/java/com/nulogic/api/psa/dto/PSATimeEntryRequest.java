package com.nulogic.api.psa.dto;

import com.fasterxml.jackson.annotation.JsonAlias;
import com.nulogic.domain.psa.PSATimeEntry;
import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.time.LocalDate;
import java.util.UUID;

/**
 * User-editable fields of a PSA time entry. Ownership, tenant and timesheet linkage are
 * derived server-side and are deliberately absent from this contract.
 */
public record PSATimeEntryRequest(
        @NotNull UUID projectId,
        UUID taskId,
        @NotNull @JsonAlias("date") LocalDate entryDate,
        @NotNull
        @DecimalMin(value = "0.0", inclusive = false)
        @DecimalMax("24.0")
        Double hours,
        Boolean isBillable,
        @Size(max = 5000) @JsonAlias("description") String workDescription,
        PSATimeEntry.ActivityType activityType,
        Boolean isOvertime
) {
}
