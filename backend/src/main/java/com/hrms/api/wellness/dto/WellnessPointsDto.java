package com.hrms.api.wellness.dto;

import lombok.*;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class WellnessPointsDto {

    private UUID id;
    private UUID employeeId;
    private String employeeName;
    private Integer totalPoints;
    private Integer redeemablePoints;
    private Integer lifetimePoints;
    private Integer currentLevel;
    private String levelName;
    private Integer pointsToNextLevel;
    private Integer challengesCompleted;
    private Integer currentStreak;
    private Integer longestStreak;
    private Integer badgesEarned;
    private Integer rank;
    private LocalDateTime lastActivityAt;
    private List<PointsTransactionDto> recentTransactions;

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class PointsTransactionDto {
        private UUID id;
        private String transactionType;
        private Integer points;
        private Integer balanceAfter;
        private String description;
        private LocalDateTime transactionAt;
    }
}
