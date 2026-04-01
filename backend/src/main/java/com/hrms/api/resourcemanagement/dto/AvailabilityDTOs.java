package com.hrms.api.resourcemanagement.dto;

import lombok.*;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

public class AvailabilityDTOs {

    public enum AvailabilityStatus {
        AVAILABLE, ALLOCATED, ON_LEAVE, PARTIAL, HOLIDAY
    }

    public enum CalendarEventType {
        PROJECT_ASSIGNMENT, LEAVE_APPROVED, LEAVE_PENDING, HOLIDAY
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ResourceCalendarEvent {
        private String id;
        private CalendarEventType type;
        private String title;
        private LocalDate startDate;
        private LocalDate endDate;
        private Integer allocationPercentage;
        private UUID projectId;
        private String projectName;
        private String leaveType;
        private String leaveStatus;
        private String color;
        private Boolean isAllDay;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ResourceAvailabilityDay {
        private LocalDate date;
        private Integer dayOfWeek;
        private Boolean isWeekend;
        private Boolean isHoliday;
        private String holidayName;
        private AvailabilityStatus status;
        private Integer allocatedCapacity;
        private Integer availableCapacity;
        private List<ResourceCalendarEvent> events;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class EmployeeAvailability {
        private UUID employeeId;
        private String employeeName;
        private String employeeCode;
        private UUID departmentId;
        private String departmentName;
        private String designation;
        private String avatarUrl;
        private List<ResourceAvailabilityDay> availability;
        private AvailabilitySummary summary;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class AvailabilitySummary {
        private LocalDate periodStart;
        private LocalDate periodEnd;
        private Integer totalDays;
        private Integer workingDays;
        private Integer availableDays;
        private Integer partialDays;
        private Integer fullyAllocatedDays;
        private Integer leaveDays;
        private Integer holidays;
        private Double averageAvailability;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class TeamAvailabilityView {
        private UUID departmentId;
        private String departmentName;
        private List<EmployeeAvailability> employees;
        private LocalDate periodStart;
        private LocalDate periodEnd;
        private List<AggregatedAvailability> aggregatedAvailability;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class AggregatedAvailability {
        private LocalDate date;
        private Integer totalEmployees;
        private Integer availableCount;
        private Integer partialCount;
        private Integer fullyAllocatedCount;
        private Integer onLeaveCount;
        private Double averageCapacity;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ResourceCalendarFilter {
        private List<UUID> employeeIds;
        private List<UUID> departmentIds;
        private LocalDate startDate;
        private LocalDate endDate;
        private Boolean includeLeaves;
        private Boolean includeHolidays;
        private Boolean includeProjectAssignments;
        private List<AvailabilityStatus> availabilityStatus;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class Holiday {
        private String id;
        private String name;
        private LocalDate date;
        private Boolean isOptional;
    }
}
