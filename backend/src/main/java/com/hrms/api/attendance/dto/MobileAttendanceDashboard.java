package com.hrms.api.attendance.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class MobileAttendanceDashboard {

    // Current status
    private Boolean isClockedIn;
    private LocalDateTime lastCheckInTime;
    private String currentStatus; // CHECKED_IN, CHECKED_OUT, ON_BREAK, NOT_CHECKED_IN

    // Today's summary
    private TodaySummary todaySummary;

    // Weekly summary
    private WeeklySummary weeklySummary;

    // Nearby offices
    private List<NearbyOffice> nearbyOffices;

    // Recent activity
    private List<RecentActivity> recentActivity;

    // Quick stats
    private QuickStats quickStats;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class TodaySummary {
        private LocalDate date;
        private String dayName;
        private LocalDateTime checkInTime;
        private LocalDateTime checkOutTime;
        private Integer workDurationMinutes;
        private Integer breakDurationMinutes;
        private Boolean isLate;
        private Integer lateByMinutes;
        private String status;
        private String shiftName;
        private String shiftStartTime;
        private String shiftEndTime;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class WeeklySummary {
        private Integer totalWorkMinutes;
        private Integer expectedWorkMinutes;
        private Integer presentDays;
        private Integer absentDays;
        private Integer lateDays;
        private Integer earlyDepartureDays;
        private BigDecimal attendancePercentage;
        private List<DaySummary> days;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class DaySummary {
        private LocalDate date;
        private String dayName;
        private String status;
        private Integer workMinutes;
        private Boolean wasLate;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class NearbyOffice {
        private UUID officeId;
        private String officeName;
        private String address;
        private BigDecimal latitude;
        private BigDecimal longitude;
        private Integer distanceMeters;
        private Integer geofenceRadius;
        private Boolean withinGeofence;
        private Boolean isDefaultOffice;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class RecentActivity {
        private LocalDateTime timestamp;
        private String type; // CHECK_IN, CHECK_OUT, BREAK_START, BREAK_END
        private String location;
        private Boolean withinGeofence;
        private String notes;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class QuickStats {
        private Integer monthlyPresentDays;
        private Integer monthlyAbsentDays;
        private Integer monthlyLateDays;
        private Integer monthlyOvertimeMinutes;
        private BigDecimal monthlyAttendanceRate;
        private Integer pendingRegularizations;
        private Integer availableLeaveBalance;
    }
}
