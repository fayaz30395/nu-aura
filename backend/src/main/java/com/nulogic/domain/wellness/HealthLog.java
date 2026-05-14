package com.nulogic.domain.wellness;

import com.nulogic.common.entity.TenantAware;
import com.nulogic.common.util.TenantTimestamp;
import com.nulogic.common.util.TimeAuditingEntityListener;
import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.SuperBuilder;
import org.hibernate.annotations.Where;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

@Where(clause = "is_deleted = false")
@Entity
@Table(name = "health_logs")
@EntityListeners(TimeAuditingEntityListener.class)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@SuperBuilder
public class HealthLog extends TenantAware {


    @Column(name = "employee_id", nullable = false)
    private UUID employeeId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "participant_id")
    private ChallengeParticipant participant;

    @TenantTimestamp
    @Column(name = "log_date", nullable = false)
    private LocalDate logDate;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private MetricType metricType;

    @Column(nullable = false)
    private Double value;

    @Column(name = "unit")
    private String unit;

    @Column(name = "source")
    private String source; // manual, fitbit, apple_health, etc.

    @Column(name = "notes")
    private String notes;

    @Column(name = "verified")
    @Builder.Default
    private Boolean verified = false;

    @Column(name = "verified_by")
    private UUID verifiedBy;

    @Column(name = "verified_at")
    private LocalDateTime verifiedAt;

    @Column(name = "points_awarded")
    @Builder.Default
    private Integer pointsAwarded = 0;

    @TenantTimestamp
    @Column(name = "logged_at")
    private LocalDateTime loggedAt;

    public enum MetricType {
        STEPS,
        DISTANCE_KM,
        CALORIES_BURNED,
        WORKOUT_MINUTES,
        WATER_ML,
        SLEEP_HOURS,
        HEART_RATE_AVG,
        BLOOD_PRESSURE_SYSTOLIC,
        BLOOD_PRESSURE_DIASTOLIC,
        WEIGHT_KG,
        BMI,
        MEDITATION_MINUTES,
        HEALTHY_MEALS,
        SCREEN_FREE_HOURS,
        MOOD_SCORE,
        STRESS_LEVEL,
        ENERGY_LEVEL,
        CUSTOM
    }
}
