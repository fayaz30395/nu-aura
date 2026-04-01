package com.hrms.domain.shift;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.UUID;

@Entity
@Table(name = "shifts")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Shift {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "tenant_id", nullable = false)
    private UUID tenantId;

    @Column(name = "shift_code", nullable = false, length = 50)
    private String shiftCode;

    @Column(name = "shift_name", nullable = false, length = 100)
    private String shiftName;

    @Column(name = "description", columnDefinition = "TEXT")
    private String description;

    @Column(name = "start_time", nullable = false)
    private LocalTime startTime;

    @Column(name = "end_time", nullable = false)
    private LocalTime endTime;

    @Builder.Default
    @Column(name = "grace_period_in_minutes")
    private Integer gracePeriodInMinutes = 0;

    @Builder.Default
    @Column(name = "late_mark_after_minutes")
    private Integer lateMarkAfterMinutes = 15;

    @Builder.Default
    @Column(name = "half_day_after_minutes")
    private Integer halfDayAfterMinutes = 240;

    @Builder.Default
    @Column(name = "full_day_hours", precision = 4, scale = 2)
    private BigDecimal fullDayHours = new BigDecimal("8.00");

    @Builder.Default
    @Column(name = "break_duration_minutes")
    private Integer breakDurationMinutes = 60;

    @Builder.Default
    @Column(name = "is_night_shift")
    private Boolean isNightShift = false;

    @Column(name = "working_days", nullable = false, length = 50)
    private String workingDays; // e.g., "MON,TUE,WED,THU,FRI"

    @Builder.Default
    @Column(name = "is_active")
    private Boolean isActive = true;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    @Column(name = "created_by")
    private UUID createdBy;

    @Column(name = "updated_by")
    private UUID updatedBy;

    @Version
    @Column(name = "version")
    private Long version;

    @Enumerated(EnumType.STRING)
    @Column(name = "shift_type", length = 20)
    private ShiftType shiftType;

    @Column(name = "color_code", length = 7)
    private String colorCode; // For UI calendar display

    @Builder.Default
    @Column(name = "is_flexible")
    private Boolean isFlexible = false;

    @Builder.Default
    @Column(name = "flexible_window_minutes")
    private Integer flexibleWindowMinutes = 0;

    @Builder.Default
    @Column(name = "min_gap_between_shifts_hours")
    private Integer minGapBetweenShiftsHours = 11;

    @Builder.Default
    @Column(name = "allows_overtime")
    private Boolean allowsOvertime = true;

    @Builder.Default
    @Column(name = "overtime_multiplier", precision = 3, scale = 2)
    private BigDecimal overtimeMultiplier = new BigDecimal("1.50"); // 1.5x for regular overtime

    public enum ShiftType {
        FIXED,      // Fixed shift (e.g., 9-5)
        ROTATING,   // Rotating shift pattern
        FLEXIBLE,   // Flexible hours
        SPLIT       // Split shift
    }

    /**
     * Calculate total working hours including break
     */
    public BigDecimal getTotalShiftDuration() {
        long hours = java.time.Duration.between(startTime, endTime).toHours();
        return new BigDecimal(hours);
    }

    /**
     * Calculate net working hours excluding break
     */
    public BigDecimal getNetWorkingHours() {
        long totalMinutes = java.time.Duration.between(startTime, endTime).toMinutes();
        long netMinutes = totalMinutes - (breakDurationMinutes != null ? breakDurationMinutes : 0);
        return new BigDecimal(netMinutes).divide(new BigDecimal("60"), 2, java.math.RoundingMode.HALF_UP);
    }
}
