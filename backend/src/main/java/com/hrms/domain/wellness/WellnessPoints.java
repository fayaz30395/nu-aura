package com.hrms.domain.wellness;

import com.hrms.common.entity.TenantAware;
import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.SuperBuilder;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "wellness_points")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@SuperBuilder
public class WellnessPoints extends TenantAware {


    @Column(name = "employee_id", nullable = false)
    private UUID employeeId;

    @Column(name = "total_points")
    @Builder.Default
    private Integer totalPoints = 0;

    @Column(name = "redeemable_points")
    @Builder.Default
    private Integer redeemablePoints = 0;

    @Column(name = "lifetime_points")
    @Builder.Default
    private Integer lifetimePoints = 0;

    @Column(name = "current_level")
    @Builder.Default
    private Integer currentLevel = 1;

    @Column(name = "points_to_next_level")
    private Integer pointsToNextLevel;

    @Column(name = "challenges_completed")
    @Builder.Default
    private Integer challengesCompleted = 0;

    @Column(name = "current_streak")
    @Builder.Default
    private Integer currentStreak = 0;

    @Column(name = "longest_streak")
    @Builder.Default
    private Integer longestStreak = 0;

    @Column(name = "badges_earned")
    @Builder.Default
    private Integer badgesEarned = 0;

    @Column(name = "last_activity_at")
    private LocalDateTime lastActivityAt;
}
