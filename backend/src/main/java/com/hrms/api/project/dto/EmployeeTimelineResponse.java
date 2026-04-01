package com.hrms.api.project.dto;

import lombok.Builder;
import lombok.Data;

import java.util.List;
import java.util.UUID;

@Data
@Builder
public class EmployeeTimelineResponse {

    private UUID employeeId;
    private String employeeName;
    private List<TimelineSlot> timeline;

    @Data
    @Builder
    public static class TimelineSlot {
        private UUID projectId;
        private String projectName;
        private String startDate;
        private String endDate;
        private int allocationPercent;
        private boolean isActive;
    }
}
