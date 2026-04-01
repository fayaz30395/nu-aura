package com.hrms.api.analytics.dto;

import com.hrms.domain.analytics.ScheduledReport.Frequency;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalTime;
import java.util.List;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ScheduledReportRequest {

    @NotBlank(message = "Schedule name is required")
    private String scheduleName;

    @NotNull(message = "Report type is required")
    private String reportType; // EMPLOYEE_DIRECTORY, ATTENDANCE, LEAVE, PAYROLL, PERFORMANCE, etc.

    // Optional: explicit report definition ID. If not provided, will be looked up from reportType.
    private UUID reportDefinitionId;

    @NotNull(message = "Frequency is required")
    private Frequency frequency;

    // For WEEKLY frequency (1=Monday, 7=Sunday)
    private Integer dayOfWeek;

    // For MONTHLY frequency (1-31)
    private Integer dayOfMonth;

    @NotNull(message = "Time of day is required")
    private LocalTime timeOfDay;

    @NotNull(message = "At least one recipient email is required")
    private List<String> recipients;

    // Report parameters (filters)
    private UUID departmentId;
    private String status;
    private String exportFormat; // EXCEL, PDF, CSV

    @Builder.Default
    private Boolean isActive = true;
}
