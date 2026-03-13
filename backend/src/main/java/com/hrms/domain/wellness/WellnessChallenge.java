package com.hrms.domain.wellness;

import com.hrms.common.entity.TenantAware;
import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.SuperBuilder;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Entity
@Table(name = "wellness_challenges")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@SuperBuilder
public class WellnessChallenge extends TenantAware {


    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "program_id")
    private WellnessProgram program;

    @Column(nullable = false)
    private String name;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private ChallengeType challengeType;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private TrackingType trackingType;

    private LocalDate startDate;
    private LocalDate endDate;

    @Column(name = "target_value")
    private Double targetValue;

    @Column(name = "target_unit")
    private String targetUnit;

    @Column(name = "daily_target")
    private Double dailyTarget;

    @Column(name = "points_per_completion")
    private Integer pointsPerCompletion;

    @Column(name = "bonus_points_for_goal")
    private Integer bonusPointsForGoal;

    @Column(name = "min_participants")
    private Integer minParticipants;

    @Column(name = "max_participants")
    private Integer maxParticipants;

    @Column(name = "is_team_based")
    @Builder.Default
    private Boolean isTeamBased = false;

    @Column(name = "team_size")
    private Integer teamSize;

    @Column(name = "is_active")
    @Builder.Default
    private Boolean isActive = true;

    @Column(name = "leaderboard_enabled")
    @Builder.Default
    private Boolean leaderboardEnabled = true;

    @Column(name = "badge_id")
    private UUID badgeId;

    @OneToMany(mappedBy = "challenge", cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
    private List<ChallengeParticipant> participants = new ArrayList<>();

    public enum ChallengeType {
        STEPS,
        DISTANCE,
        CALORIES,
        WORKOUT_MINUTES,
        WATER_INTAKE,
        SLEEP_HOURS,
        MEDITATION_MINUTES,
        HEALTHY_MEALS,
        SCREEN_FREE_HOURS,
        READING_MINUTES,
        CUSTOM
    }

    public enum TrackingType {
        MANUAL,
        AUTOMATIC,
        SELF_REPORTED,
        VERIFICATION_REQUIRED
    }
}
