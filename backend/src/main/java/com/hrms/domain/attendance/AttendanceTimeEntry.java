package com.hrms.domain.attendance;

import com.hrms.common.entity.TenantAware;
import jakarta.persistence.*;
import org.hibernate.annotations.Where;
import lombok.*;
import lombok.experimental.SuperBuilder;

import java.time.LocalDateTime;
import java.util.UUID;

/**
 * Tracks individual check-in/check-out pairs for an attendance record.
 * Allows multiple entries per day for breaks, lunch, etc.
 */
@Where(clause = "is_deleted = false")
@Entity
@Table(name = "attendance_time_entries", indexes = {
    @Index(name = "idx_time_entry_attendance_id", columnList = "attendanceRecordId"),
    @Index(name = "idx_time_entry_type", columnList = "entryType")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@SuperBuilder
public class AttendanceTimeEntry extends TenantAware {

    @Column(name = "attendance_record_id", nullable = false)
    private UUID attendanceRecordId;

    @Enumerated(EnumType.STRING)
    @Column(name = "entry_type", nullable = false, length = 50)
    private EntryType entryType;

    @Column(name = "check_in_time", nullable = false)
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

    @Column(name = "duration_minutes")
    @Builder.Default
    private Integer durationMinutes = 0;

    @Column(columnDefinition = "TEXT")
    private String notes;

    @Column(name = "sequence_number")
    @Builder.Default
    private Integer sequenceNumber = 1;

    public enum EntryType {
        REGULAR,      // Normal work session
        BREAK,        // Break (tea/coffee)
        LUNCH,        // Lunch break
        MEETING,      // Out for meeting
        CLIENT_VISIT, // Client site visit
        OTHER         // Other reason
    }

    public void checkOut(LocalDateTime time, String source, String location, String ip) {
        this.checkOutTime = time;
        this.checkOutSource = source;
        this.checkOutLocation = location;
        this.checkOutIp = ip;
        calculateDuration();
    }

    public void calculateDuration() {
        if (checkInTime != null && checkOutTime != null) {
            long minutes = java.time.Duration.between(checkInTime, checkOutTime).toMinutes();
            this.durationMinutes = (int) minutes;
        }
    }

    public boolean isOpen() {
        return checkOutTime == null;
    }
}
