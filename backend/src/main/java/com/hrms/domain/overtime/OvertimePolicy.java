package com.hrms.domain.overtime;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "overtime_policies")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class OvertimePolicy {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "tenant_id", nullable = false)
    private UUID tenantId;

    @Column(name = "policy_name", nullable = false, length = 100)
    private String policyName;

    @Column(name = "policy_code", nullable = false, length = 50)
    private String policyCode;

    @Column(name = "description", columnDefinition = "TEXT")
    private String description;

    @Column(name = "department_id")
    private UUID departmentId;

    @Builder.Default
    @Column(name = "is_default")
    private Boolean isDefault = false;

    @Builder.Default
    @Column(name = "is_active")
    private Boolean isActive = true;

    // Daily overtime settings
    @Builder.Default
    @Column(name = "daily_threshold_hours", precision = 5, scale = 2)
    private BigDecimal dailyThresholdHours = new BigDecimal("8.00");

    @Builder.Default
    @Column(name = "daily_ot_multiplier", precision = 3, scale = 2)
    private BigDecimal dailyOtMultiplier = new BigDecimal("1.50");

    @Column(name = "daily_max_ot_hours", precision = 5, scale = 2)
    private BigDecimal dailyMaxOtHours;

    // Weekly overtime settings
    @Builder.Default
    @Column(name = "weekly_threshold_hours", precision = 5, scale = 2)
    private BigDecimal weeklyThresholdHours = new BigDecimal("40.00");

    @Builder.Default
    @Column(name = "weekly_ot_multiplier", precision = 3, scale = 2)
    private BigDecimal weeklyOtMultiplier = new BigDecimal("1.50");

    @Column(name = "weekly_max_ot_hours", precision = 5, scale = 2)
    private BigDecimal weeklyMaxOtHours;

    // Weekend overtime
    @Builder.Default
    @Column(name = "weekend_ot_multiplier", precision = 3, scale = 2)
    private BigDecimal weekendOtMultiplier = new BigDecimal("2.00");

    // Holiday overtime
    @Builder.Default
    @Column(name = "holiday_ot_multiplier", precision = 3, scale = 2)
    private BigDecimal holidayOtMultiplier = new BigDecimal("2.50");

    // Night shift overtime
    @Builder.Default
    @Column(name = "night_shift_ot_multiplier", precision = 3, scale = 2)
    private BigDecimal nightShiftOtMultiplier = new BigDecimal("1.75");

    // Approval settings
    @Builder.Default
    @Column(name = "requires_pre_approval")
    private Boolean requiresPreApproval = true;

    @Column(name = "auto_approve_limit_hours", precision = 5, scale = 2)
    private BigDecimal autoApproveLimitHours;

    // Calculation settings
    @Builder.Default
    @Column(name = "round_to_nearest_minutes")
    private Integer roundToNearestMinutes = 15;

    @Builder.Default
    @Column(name = "minimum_ot_minutes")
    private Integer minimumOtMinutes = 30;

    @Builder.Default
    @Column(name = "count_break_time")
    private Boolean countBreakTime = false;

    // Comp time settings
    @Builder.Default
    @Column(name = "comp_time_allowed")
    private Boolean compTimeAllowed = false;

    @Builder.Default
    @Column(name = "comp_time_multiplier", precision = 3, scale = 2)
    private BigDecimal compTimeMultiplier = new BigDecimal("1.50");

    @Column(name = "max_comp_time_balance", precision = 5, scale = 2)
    private BigDecimal maxCompTimeBalance;

    @Column(name = "comp_time_expiry_days")
    private Integer compTimeExpiryDays;

    // Progressive OT settings
    @Column(name = "double_time_threshold_hours", precision = 5, scale = 2)
    private BigDecimal doubleTimeThresholdHours; // e.g., after 12 hours

    @Builder.Default
    @Column(name = "double_time_multiplier", precision = 3, scale = 2)
    private BigDecimal doubleTimeMultiplier = new BigDecimal("2.00");

    @Column(name = "consecutive_day_threshold")
    private Integer consecutiveDayThreshold; // 7th consecutive day

    @Column(name = "consecutive_day_multiplier", precision = 3, scale = 2)
    private BigDecimal consecutiveDayMultiplier;

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

    /**
     * Get overtime multiplier based on type
     */
    public BigDecimal getMultiplierForType(OvertimeRecord.OvertimeType type) {
        return switch (type) {
            case REGULAR, EMERGENCY -> dailyOtMultiplier;
            case WEEKEND -> weekendOtMultiplier;
            case HOLIDAY -> holidayOtMultiplier;
            case NIGHT_SHIFT -> nightShiftOtMultiplier;
        };
    }

    /**
     * Check if overtime amount needs approval
     */
    public boolean needsApproval(BigDecimal overtimeHours) {
        if (!requiresPreApproval) {
            return false;
        }
        if (autoApproveLimitHours == null) {
            return true;
        }
        return overtimeHours.compareTo(autoApproveLimitHours) > 0;
    }
}
