package com.hrms.api.analytics.dto;

import com.hrms.domain.analytics.ScheduledReport;
import com.hrms.domain.analytics.ScheduledReport.Frequency;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.List;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ScheduledReportResponse {

    private UUID id;
    private String scheduleName;
    private String reportType;
    private Frequency frequency;
    private Integer dayOfWeek;
    private Integer dayOfMonth;
    private LocalTime timeOfDay;
    private List<String> recipients;
    private Boolean isActive;
    private LocalDateTime lastRunAt;
    private LocalDateTime nextRunAt;
    private LocalDateTime createdAt;
    private String createdByName;

    // Report parameters
    private UUID departmentId;
    private String departmentName;
    private String status;
    private String exportFormat;

    public static ScheduledReportResponse fromEntity(ScheduledReport entity, String createdByName, String departmentName) {
        return ScheduledReportResponse.builder()
                .id(entity.getId())
                .scheduleName(entity.getScheduleName())
                .frequency(entity.getFrequency())
                .dayOfWeek(entity.getDayOfWeek())
                .dayOfMonth(entity.getDayOfMonth())
                .timeOfDay(entity.getTimeOfDay())
                .isActive(entity.getIsActive())
                .lastRunAt(entity.getLastRunAt())
                .nextRunAt(entity.getNextRunAt())
                .createdAt(entity.getCreatedAt())
                .createdByName(createdByName)
                .departmentName(departmentName)
                .build();
    }
}
