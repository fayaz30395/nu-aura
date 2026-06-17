package com.nulogic.domain.attendance;

import com.nulogic.common.entity.TenantAware;
import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.SuperBuilder;
import org.hibernate.annotations.SQLRestriction;

import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.UUID;

/**
 * Tracks individual check-in/check-out pairs for an attendance record.
 * Allows multiple entries per day for breaks, lunch, etc.
 */
@SQLRestriction("is_deleted = false")
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

    public void checkOut(LocalDateTime time, String source, String location, String ip) {
        checkOut(time, source, location, ip, null);
    }

    /**
     * Zone-aware checkout. When {@code zone} is non-null the entry duration is measured between
     * the physical instants of check-in/out (DST-correct); when null it falls back to the legacy
     * wall-clock difference for backward compatibility.
     *
     * @param zone tenant {@link ZoneId}, or {@code null} for legacy wall-clock behavior
     */
    public void checkOut(LocalDateTime time, String source, String location, String ip, ZoneId zone) {
        this.checkOutTime = time;
        this.checkOutSource = source;
        this.checkOutLocation = location;
        this.checkOutIp = ip;
        calculateDuration(zone);
    }

    public void calculateDuration() {
        calculateDuration(null);
    }

    /**
     * Compute entry duration in minutes. With a non-null tenant {@code zone} the elapsed time is
     * measured between physical instants (correct across DST transitions); a null zone uses the
     * legacy wall-clock difference.
     */
    public void calculateDuration(ZoneId zone) {
        if (checkInTime != null && checkOutTime != null) {
            long minutes = zone != null
                    ? java.time.Duration.between(
                            checkInTime.atZone(zone).toInstant(), checkOutTime.atZone(zone).toInstant()).toMinutes()
                    : java.time.Duration.between(checkInTime, checkOutTime).toMinutes();
            this.durationMinutes = (int) minutes;
        }
    }

    public boolean isOpen() {
        return checkOutTime == null;
    }

    public enum EntryType {
        REGULAR,      // Normal work session
        BREAK,        // Break (tea/coffee)
        LUNCH,        // Lunch break
        MEETING,      // Out for meeting
        CLIENT_VISIT, // Client site visit
        OTHER         // Other reason
    }
}
