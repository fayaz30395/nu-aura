package com.hrms.api.shift.dto;

import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class GenerateScheduleRequest {

    /** Department for which to generate the schedule */
    private UUID departmentId;

    /** Specific employee IDs; if null, all active employees in department are used */
    private List<UUID> employeeIds;

    /** Shift pattern to apply */
    @NotNull(message = "Shift pattern ID is required")
    private UUID shiftPatternId;

    @NotNull(message = "Start date is required")
    private LocalDate startDate;

    @NotNull(message = "End date is required")
    private LocalDate endDate;

    /** If true, overwrite existing assignments in the date range */
    @Builder.Default
    private Boolean overwrite = false;
}
