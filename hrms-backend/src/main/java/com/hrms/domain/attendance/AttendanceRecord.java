package com.hrms.domain.attendance;

import com.hrms.common.entity.TenantAware;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "attendance_records", indexes = {
    @Index(name = "idx_attendance_tenant_id", columnList = "tenantId"),
    @Index(name = "idx_attendance_employee_id", columnList = "employeeId"),
    @Index(name = "idx_attendance_date", columnList = "attendanceDate"),
    @Index(name = "idx_attendance_status", columnList = "status")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AttendanceRecord extends TenantAware {

    @Column(name = "employee_id", nullable = false)
    private UUID employeeId;

    @Column(name = "shift_id")
    private UUID shiftId;

    @Column(name = "attendance_date", nullable = false)
    private LocalDate attendanceDate;

    @Column(name = "check_in_time")
    private LocalDateTime checkInTime;

    @Column(name = "check_out_time")
    private LocalDateTime checkOutTime;

    @Column(name = "check_in_source", length = 50)
    private String checkInSource;

    @Column(name = "check_out_source", length = 50)
    private String checkOutSource;

    @Column(name = "check_in_location", columnDefinition = "TEXT")
    private String checkInLocation;

    @Column(name = "check_out_location", columnDefinition = "TEXT")
    private String checkOutLocation;

    @Column(name = "check_in_ip", length = 50)
    private String checkInIp;

    @Column(name = "check_out_ip", length = 50)
    private String checkOutIp;

    // GPS Geofencing fields
    @Column(name = "check_in_latitude", precision = 10, scale = 8)
    private java.math.BigDecimal checkInLatitude;

    @Column(name = "check_in_longitude", precision = 11, scale = 8)
    private java.math.BigDecimal checkInLongitude;

    @Column(name = "check_out_latitude", precision = 10, scale = 8)
    private java.math.BigDecimal checkOutLatitude;

    @Column(name = "check_out_longitude", precision = 11, scale = 8)
    private java.math.BigDecimal checkOutLongitude;

    @Column(name = "check_in_office_location_id")
    private UUID checkInOfficeLocationId;

    @Column(name = "check_out_office_location_id")
    private UUID checkOutOfficeLocationId;

    @Column(name = "check_in_within_geofence")
    @Builder.Default
    private Boolean checkInWithinGeofence = false;

    @Column(name = "check_out_within_geofence")
    @Builder.Default
    private Boolean checkOutWithinGeofence = false;

    @Column(name = "check_in_distance_meters")
    private Integer checkInDistanceMeters;

    @Column(name = "check_out_distance_meters")
    private Integer checkOutDistanceMeters;

    @Column(name = "is_remote_checkin")
    @Builder.Default
    private Boolean isRemoteCheckin = false;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 50)
    private AttendanceStatus status;

    @Column(name = "work_duration_minutes")
    @Builder.Default
    private Integer workDurationMinutes = 0;

    @Column(name = "break_duration_minutes")
    @Builder.Default
    private Integer breakDurationMinutes = 0;

    @Column(name = "overtime_minutes")
    @Builder.Default
    private Integer overtimeMinutes = 0;

    @Column(name = "is_late")
    @Builder.Default
    private Boolean isLate = false;

    @Column(name = "late_by_minutes")
    @Builder.Default
    private Integer lateByMinutes = 0;

    @Column(name = "is_early_departure")
    @Builder.Default
    private Boolean isEarlyDeparture = false;

    @Column(name = "early_departure_minutes")
    @Builder.Default
    private Integer earlyDepartureMinutes = 0;

    @Column(name = "is_half_day")
    @Builder.Default
    private Boolean isHalfDay = false;

    @Column(name = "is_overtime")
    @Builder.Default
    private Boolean isOvertime = false;

    @Column(columnDefinition = "TEXT")
    private String notes;

    @Column(name = "regularization_requested")
    @Builder.Default
    private Boolean regularizationRequested = false;

    @Column(name = "regularization_approved")
    @Builder.Default
    private Boolean regularizationApproved = false;

    @Column(name = "regularization_reason", columnDefinition = "TEXT")
    private String regularizationReason;

    @Column(name = "approved_by")
    private UUID approvedBy;

    @Column(name = "approved_at")
    private LocalDateTime approvedAt;

    public enum AttendanceStatus {
        PRESENT,
        ABSENT,
        HALF_DAY,
        ON_LEAVE,
        WEEKLY_OFF,
        HOLIDAY,
        PENDING_REGULARIZATION
    }

    public void checkIn(LocalDateTime time, String source, String location, String ip) {
        this.checkInTime = time;
        this.checkInSource = source;
        this.checkInLocation = location;
        this.checkInIp = ip;
        // Clear checkout fields when re-checking in (for multi check-in/out support)
        this.checkOutTime = null;
        this.checkOutSource = null;
        this.checkOutLocation = null;
        this.checkOutIp = null;
        this.status = AttendanceStatus.PRESENT;
    }

    public void checkOut(LocalDateTime time, String source, String location, String ip) {
        this.checkOutTime = time;
        this.checkOutSource = source;
        this.checkOutLocation = location;
        this.checkOutIp = ip;
        calculateWorkDuration();
    }

    public void calculateWorkDuration() {
        if (checkInTime != null && checkOutTime != null) {
            long minutes = java.time.Duration.between(checkInTime, checkOutTime).toMinutes();
            this.workDurationMinutes = (int) (minutes - (breakDurationMinutes != null ? breakDurationMinutes : 0));
        }
    }

    public void markAsLate(int minutes) {
        this.isLate = true;
        this.lateByMinutes = minutes;
    }

    public void markAsEarlyDeparture(int minutes) {
        this.isEarlyDeparture = true;
        this.earlyDepartureMinutes = minutes;
    }

    public void requestRegularization(String reason) {
        this.regularizationRequested = true;
        this.regularizationReason = reason;
        this.status = AttendanceStatus.PENDING_REGULARIZATION;
    }

    public void approveRegularization(UUID approverId) {
        this.regularizationApproved = true;
        this.approvedBy = approverId;
        this.approvedAt = LocalDateTime.now();
        this.status = AttendanceStatus.PRESENT;
    }

    public void rejectRegularization(UUID rejectorId, String rejectionReason) {
        this.regularizationApproved = false;
        this.approvedBy = rejectorId;
        this.approvedAt = LocalDateTime.now();
        if (rejectionReason != null && !rejectionReason.isEmpty()) {
            this.regularizationReason = this.regularizationReason + " [REJECTED: " + rejectionReason + "]";
        }
        // Revert to absent status since regularization was rejected
        this.status = AttendanceStatus.ABSENT;
    }

    /**
     * Check if this attendance record has an open check-in (checked in but not checked out).
     */
    public boolean hasOpenCheckIn() {
        return this.checkInTime != null && this.checkOutTime == null;
    }

    /**
     * Check if this attendance record is complete (both checked in and out).
     */
    public boolean isComplete() {
        return this.checkInTime != null && this.checkOutTime != null;
    }
}

