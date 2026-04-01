package com.hrms.domain.wellness;

import com.hrms.common.entity.TenantAware;
import jakarta.persistence.*;
import org.hibernate.annotations.Where;
import lombok.*;
import lombok.experimental.SuperBuilder;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Where(clause = "is_deleted = false")
@Entity
@Table(name = "challenge_participants")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@SuperBuilder
public class ChallengeParticipant extends TenantAware {


    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "challenge_id", nullable = false)
    private WellnessChallenge challenge;

    @Column(name = "employee_id", nullable = false)
    private UUID employeeId;

    @Column(name = "team_id")
    private UUID teamId;

    @Column(name = "team_name")
    private String teamName;

    @Column(name = "joined_at")
    private LocalDateTime joinedAt;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    @Builder.Default
    private ParticipationStatus status = ParticipationStatus.ACTIVE;

    @Column(name = "total_progress")
    @Builder.Default
    private Double totalProgress = 0.0;

    @Column(name = "completion_percentage")
    @Builder.Default
    private Double completionPercentage = 0.0;

    @Column(name = "points_earned")
    @Builder.Default
    private Integer pointsEarned = 0;

    @Column(name = "current_streak")
    @Builder.Default
    private Integer currentStreak = 0;

    @Column(name = "longest_streak")
    @Builder.Default
    private Integer longestStreak = 0;

    @Column(name = "last_activity_date")
    private LocalDate lastActivityDate;

    @Column(name = "goal_achieved")
    @Builder.Default
    private Boolean goalAchieved = false;

    @Column(name = "goal_achieved_date")
    private LocalDate goalAchievedDate;

    @Column(name = "rank_position")
    private Integer rankPosition;

    @OneToMany(mappedBy = "participant", cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
    private List<HealthLog> healthLogs = new ArrayList<>();

    public enum ParticipationStatus {
        ACTIVE,
        COMPLETED,
        WITHDRAWN,
        DISQUALIFIED
    }

    @PrePersist
    protected void onCreate() {
        joinedAt = LocalDateTime.now();
    }
}
