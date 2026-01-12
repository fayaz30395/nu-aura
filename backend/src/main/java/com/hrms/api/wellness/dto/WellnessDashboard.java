package com.hrms.api.wellness.dto;

import lombok.*;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class WellnessDashboard {

    // User's personal stats
    private WellnessPointsDto myPoints;
    private List<ParticipationSummary> activeParticipations;
    private Integer activeChallengesCount;
    private Integer completedChallengesCount;

    // Available programs and challenges
    private List<WellnessProgramDto> featuredPrograms;
    private List<WellnessChallengeDto> activeChallenges;
    private List<WellnessChallengeDto> upcomingChallenges;

    // Leaderboards
    private List<LeaderboardEntry> topEmployees;
    private List<LeaderboardEntry> topTeams;

    // Organization stats
    private Long totalActiveParticipants;
    private Long totalPointsAwarded;
    private Double averageParticipationRate;
    private Map<String, Long> categoryParticipation;

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class ParticipationSummary {
        private UUID challengeId;
        private String challengeName;
        private Double progress;
        private Double target;
        private Double completionPercentage;
        private Integer daysRemaining;
        private Integer currentStreak;
        private Integer pointsEarned;
        private Integer rank;
    }

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class LeaderboardEntry {
        private Integer rank;
        private UUID id;
        private String name;
        private String department;
        private Integer points;
        private Integer challengesCompleted;
        private String avatarUrl;
    }
}
