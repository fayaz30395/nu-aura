package com.hrms.api.wellness.dto;

import com.hrms.domain.wellness.WellnessChallenge.*;
import lombok.*;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class WellnessChallengeDto {

    private UUID id;
    private UUID programId;
    private String programName;
    private String name;
    private String description;
    private ChallengeType challengeType;
    private TrackingType trackingType;
    private LocalDate startDate;
    private LocalDate endDate;
    private Double targetValue;
    private String targetUnit;
    private Double dailyTarget;
    private Integer pointsPerCompletion;
    private Integer bonusPointsForGoal;
    private Integer minParticipants;
    private Integer maxParticipants;
    private Integer currentParticipants;
    private Boolean isTeamBased;
    private Integer teamSize;
    private Boolean isActive;
    private Boolean leaderboardEnabled;
    private UUID badgeId;
    private Integer daysRemaining;
    private Double averageCompletion;
    private LocalDateTime createdAt;
}
