package com.hrms.application.wellness.service;

import com.hrms.api.wellness.dto.*;
import com.hrms.domain.wellness.*;
import com.hrms.domain.user.User;
import com.hrms.infrastructure.wellness.repository.*;
import com.hrms.infrastructure.user.repository.UserRepository;
import com.hrms.common.security.TenantContext;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.*;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
@Transactional
public class WellnessService {

    private final WellnessProgramRepository programRepository;
    private final WellnessChallengeRepository challengeRepository;
    private final ChallengeParticipantRepository participantRepository;
    private final HealthLogRepository healthLogRepository;
    private final WellnessPointsRepository pointsRepository;
    private final PointsTransactionRepository transactionRepository;
    private final UserRepository userRepository;

    // ==================== Program Management ====================

    public WellnessProgramDto createProgram(WellnessProgramDto request) {
        UUID tenantId = TenantContext.getCurrentTenant();
        log.info("Creating wellness program {} for tenant {}", request.getName(), tenantId);

        WellnessProgram program = new WellnessProgram();
        program.setTenantId(tenantId);
        program.setName(request.getName());
        program.setDescription(request.getDescription());
        program.setProgramType(request.getProgramType());
        program.setCategory(request.getCategory());
        program.setStartDate(request.getStartDate());
        program.setEndDate(request.getEndDate());
        program.setMaxParticipants(request.getMaxParticipants());
        program.setPointsReward(request.getPointsReward());
        program.setBudgetAmount(request.getBudgetAmount());
        program.setImageUrl(request.getImageUrl());
        program.setExternalLink(request.getExternalLink());
        program.setInstructions(request.getInstructions());
        program.setIsActive(true);
        program.setIsFeatured(request.getIsFeatured() != null ? request.getIsFeatured() : false);

        return mapToDto(programRepository.save(program));
    }

    public List<WellnessProgramDto> getActivePrograms() {
        UUID tenantId = TenantContext.getCurrentTenant();
        return programRepository.findActivePrograms(tenantId, LocalDate.now()).stream()
                .map(this::mapToDto)
                .collect(Collectors.toList());
    }

    public List<WellnessProgramDto> getFeaturedPrograms() {
        UUID tenantId = TenantContext.getCurrentTenant();
        return programRepository.findFeaturedPrograms(tenantId).stream()
                .map(this::mapToDto)
                .collect(Collectors.toList());
    }

    // ==================== Challenge Management ====================

    public WellnessChallengeDto createChallenge(UUID programId, WellnessChallengeDto request) {
        UUID tenantId = TenantContext.getCurrentTenant();
        log.info("Creating challenge {} for program {}", request.getName(), programId);

        WellnessProgram program = null;
        if (programId != null) {
            program = programRepository.findByIdAndTenantId(programId, tenantId)
                    .orElseThrow(() -> new IllegalArgumentException("Program not found"));
        }

        WellnessChallenge challenge = new WellnessChallenge();
        challenge.setTenantId(tenantId);
        challenge.setProgram(program);
        challenge.setName(request.getName());
        challenge.setDescription(request.getDescription());
        challenge.setChallengeType(request.getChallengeType());
        challenge.setTrackingType(request.getTrackingType());
        challenge.setStartDate(request.getStartDate());
        challenge.setEndDate(request.getEndDate());
        challenge.setTargetValue(request.getTargetValue());
        challenge.setTargetUnit(request.getTargetUnit());
        challenge.setDailyTarget(request.getDailyTarget());
        challenge.setPointsPerCompletion(request.getPointsPerCompletion());
        challenge.setBonusPointsForGoal(request.getBonusPointsForGoal());
        challenge.setMinParticipants(request.getMinParticipants());
        challenge.setMaxParticipants(request.getMaxParticipants());
        challenge.setIsTeamBased(request.getIsTeamBased() != null ? request.getIsTeamBased() : false);
        challenge.setTeamSize(request.getTeamSize());
        challenge.setLeaderboardEnabled(request.getLeaderboardEnabled() != null ? request.getLeaderboardEnabled() : true);
        challenge.setBadgeId(request.getBadgeId());
        challenge.setIsActive(true);

        return mapToDto(challengeRepository.save(challenge));
    }

    public List<WellnessChallengeDto> getActiveChallenges() {
        UUID tenantId = TenantContext.getCurrentTenant();
        return challengeRepository.findActiveChallenges(tenantId, LocalDate.now()).stream()
                .map(this::mapToDto)
                .collect(Collectors.toList());
    }

    public List<WellnessChallengeDto> getUpcomingChallenges() {
        UUID tenantId = TenantContext.getCurrentTenant();
        return challengeRepository.findUpcomingChallenges(tenantId, LocalDate.now()).stream()
                .map(this::mapToDto)
                .collect(Collectors.toList());
    }

    // ==================== Participation ====================

    public void joinChallenge(UUID challengeId, UUID employeeId, UUID teamId, String teamName) {
        UUID tenantId = TenantContext.getCurrentTenant();
        log.info("Employee {} joining challenge {}", employeeId, challengeId);

        WellnessChallenge challenge = challengeRepository.findByIdAndTenantId(challengeId, tenantId)
                .orElseThrow(() -> new IllegalArgumentException("Challenge not found"));

        // Check if already participating
        Optional<ChallengeParticipant> existing = participantRepository.findByChallengeIdAndEmployeeId(challengeId, employeeId);
        if (existing.isPresent()) {
            throw new IllegalStateException("Already participating in this challenge");
        }

        // Check max participants
        if (challenge.getMaxParticipants() != null) {
            long currentCount = participantRepository.countActiveParticipants(challengeId);
            if (currentCount >= challenge.getMaxParticipants()) {
                throw new IllegalStateException("Challenge is at maximum capacity");
            }
        }

        ChallengeParticipant participant = new ChallengeParticipant();
        participant.setTenantId(tenantId);
        participant.setChallenge(challenge);
        participant.setEmployeeId(employeeId);
        participant.setTeamId(teamId);
        participant.setTeamName(teamName);
        participant.setStatus(ChallengeParticipant.ParticipationStatus.ACTIVE);

        participantRepository.save(participant);

        // Initialize wellness points if needed
        getOrCreateWellnessPoints(employeeId, tenantId);
    }

    public void leaveChallenge(UUID challengeId, UUID employeeId) {
        ChallengeParticipant participant = participantRepository.findByChallengeIdAndEmployeeId(challengeId, employeeId)
                .orElseThrow(() -> new IllegalArgumentException("Not participating in this challenge"));

        participant.setStatus(ChallengeParticipant.ParticipationStatus.WITHDRAWN);
        participantRepository.save(participant);
    }

    // ==================== Health Logging ====================

    public HealthLogDto logHealth(UUID employeeId, HealthLogDto request) {
        UUID tenantId = TenantContext.getCurrentTenant();
        log.info("Employee {} logging {} for date {}", employeeId, request.getMetricType(), request.getLogDate());

        HealthLog log = new HealthLog();
        log.setTenantId(tenantId);
        log.setEmployeeId(employeeId);
        log.setLogDate(request.getLogDate() != null ? request.getLogDate() : LocalDate.now());
        log.setMetricType(request.getMetricType());
        log.setValue(request.getValue());
        log.setUnit(request.getUnit());
        log.setSource(request.getSource() != null ? request.getSource() : "manual");
        log.setNotes(request.getNotes());

        // Link to challenge participation if applicable
        if (request.getChallengeId() != null) {
            Optional<ChallengeParticipant> participant = participantRepository
                    .findByChallengeIdAndEmployeeId(request.getChallengeId(), employeeId);
            if (participant.isPresent()) {
                log.setParticipant(participant.get());
                updateParticipantProgress(participant.get(), request.getValue());
            }
        }

        HealthLog saved = healthLogRepository.save(log);

        // Award points
        int points = calculatePointsForLog(saved);
        if (points > 0) {
            awardPoints(employeeId, points, "Health log: " + request.getMetricType(), "HEALTH_LOG", saved.getId());
            saved.setPointsAwarded(points);
            healthLogRepository.save(saved);
        }

        return mapToDto(saved);
    }

    public List<HealthLogDto> getHealthLogs(UUID employeeId, LocalDate startDate, LocalDate endDate) {
        return healthLogRepository.findByEmployeeAndDateRange(employeeId, startDate, endDate).stream()
                .map(this::mapToDto)
                .collect(Collectors.toList());
    }

    // ==================== Points & Leaderboard ====================

    public WellnessPointsDto getMyPoints(UUID employeeId) {
        UUID tenantId = TenantContext.getCurrentTenant();
        WellnessPoints points = getOrCreateWellnessPoints(employeeId, tenantId);
        return mapToDto(points, employeeId);
    }

    public List<WellnessDashboard.LeaderboardEntry> getLeaderboard(int limit) {
        UUID tenantId = TenantContext.getCurrentTenant();
        List<WellnessPoints> topPoints = pointsRepository.findTopByPoints(tenantId, PageRequest.of(0, limit));

        List<WellnessDashboard.LeaderboardEntry> leaderboard = new ArrayList<>();
        int rank = 1;
        for (WellnessPoints wp : topPoints) {
            User user = userRepository.findById(wp.getEmployeeId()).orElse(null);
            leaderboard.add(WellnessDashboard.LeaderboardEntry.builder()
                    .rank(rank++)
                    .id(wp.getEmployeeId())
                    .name(user != null ? user.getFullName() : "Unknown")
                    .points(wp.getTotalPoints())
                    .challengesCompleted(wp.getChallengesCompleted())
                    .build());
        }
        return leaderboard;
    }

    public List<WellnessDashboard.LeaderboardEntry> getChallengeLeaderboard(UUID challengeId, int limit) {
        List<ChallengeParticipant> participants = participantRepository.findLeaderboard(challengeId, PageRequest.of(0, limit));

        List<WellnessDashboard.LeaderboardEntry> leaderboard = new ArrayList<>();
        int rank = 1;
        for (ChallengeParticipant p : participants) {
            User user = userRepository.findById(p.getEmployeeId()).orElse(null);
            leaderboard.add(WellnessDashboard.LeaderboardEntry.builder()
                    .rank(rank++)
                    .id(p.getEmployeeId())
                    .name(user != null ? user.getFullName() : "Unknown")
                    .points(p.getPointsEarned())
                    .build());
        }
        return leaderboard;
    }

    // ==================== Dashboard ====================

    public WellnessDashboard getDashboard(UUID employeeId) {
        UUID tenantId = TenantContext.getCurrentTenant();

        WellnessDashboard dashboard = new WellnessDashboard();

        // My points
        dashboard.setMyPoints(getMyPoints(employeeId));

        // Active participations
        List<ChallengeParticipant> participations = participantRepository.findActiveParticipations(employeeId);
        dashboard.setActiveParticipations(participations.stream()
                .map(p -> WellnessDashboard.ParticipationSummary.builder()
                        .challengeId(p.getChallenge().getId())
                        .challengeName(p.getChallenge().getName())
                        .progress(p.getTotalProgress())
                        .target(p.getChallenge().getTargetValue())
                        .completionPercentage(p.getCompletionPercentage())
                        .daysRemaining((int) ChronoUnit.DAYS.between(LocalDate.now(), p.getChallenge().getEndDate()))
                        .currentStreak(p.getCurrentStreak())
                        .pointsEarned(p.getPointsEarned())
                        .rank(p.getRankPosition())
                        .build())
                .collect(Collectors.toList()));
        dashboard.setActiveChallengesCount(participations.size());

        // Featured programs and active challenges
        dashboard.setFeaturedPrograms(getFeaturedPrograms());
        dashboard.setActiveChallenges(getActiveChallenges());
        dashboard.setUpcomingChallenges(getUpcomingChallenges());

        // Leaderboard
        dashboard.setTopEmployees(getLeaderboard(10));

        // Organization stats
        dashboard.setTotalPointsAwarded(pointsRepository.getTotalPointsAwarded(tenantId));

        return dashboard;
    }

    // ==================== Helper Methods ====================

    private WellnessPoints getOrCreateWellnessPoints(UUID employeeId, UUID tenantId) {
        return pointsRepository.findByEmployeeIdAndTenantId(employeeId, tenantId)
                .orElseGet(() -> {
                    WellnessPoints newPoints = new WellnessPoints();
                    newPoints.setTenantId(tenantId);
                    newPoints.setEmployeeId(employeeId);
                    newPoints.setPointsToNextLevel(100);
                    return pointsRepository.save(newPoints);
                });
    }

    private void awardPoints(UUID employeeId, int points, String description, String refType, UUID refId) {
        UUID tenantId = TenantContext.getCurrentTenant();
        WellnessPoints wp = getOrCreateWellnessPoints(employeeId, tenantId);

        wp.setTotalPoints(wp.getTotalPoints() + points);
        wp.setRedeemablePoints(wp.getRedeemablePoints() + points);
        wp.setLifetimePoints(wp.getLifetimePoints() + points);
        wp.setLastActivityAt(LocalDateTime.now());

        // Level up logic
        while (wp.getTotalPoints() >= wp.getCurrentLevel() * 100) {
            wp.setCurrentLevel(wp.getCurrentLevel() + 1);
            wp.setPointsToNextLevel(wp.getCurrentLevel() * 100);
        }

        pointsRepository.save(wp);

        // Record transaction
        PointsTransaction transaction = new PointsTransaction();
        transaction.setTenantId(tenantId);
        transaction.setEmployeeId(employeeId);
        transaction.setTransactionType(PointsTransaction.TransactionType.EARNED);
        transaction.setPoints(points);
        transaction.setBalanceAfter(wp.getTotalPoints());
        transaction.setDescription(description);
        transaction.setReferenceType(refType);
        transaction.setReferenceId(refId);
        transactionRepository.save(transaction);
    }

    private void updateParticipantProgress(ChallengeParticipant participant, Double addedValue) {
        participant.setTotalProgress(participant.getTotalProgress() + addedValue);
        participant.setLastActivityDate(LocalDate.now());

        WellnessChallenge challenge = participant.getChallenge();
        if (challenge.getTargetValue() != null && challenge.getTargetValue() > 0) {
            double completion = (participant.getTotalProgress() / challenge.getTargetValue()) * 100;
            participant.setCompletionPercentage(Math.min(100, completion));

            if (!participant.getGoalAchieved() && participant.getTotalProgress() >= challenge.getTargetValue()) {
                participant.setGoalAchieved(true);
                participant.setGoalAchievedDate(LocalDate.now());

                // Award bonus points
                if (challenge.getBonusPointsForGoal() != null) {
                    awardPoints(participant.getEmployeeId(), challenge.getBonusPointsForGoal(),
                            "Challenge completed: " + challenge.getName(), "CHALLENGE", challenge.getId());
                }
            }
        }

        participantRepository.save(participant);
    }

    private int calculatePointsForLog(HealthLog log) {
        // Simple points calculation
        return 10;
    }

    // ==================== Mapping Methods ====================

    private WellnessProgramDto mapToDto(WellnessProgram program) {
        return WellnessProgramDto.builder()
                .id(program.getId())
                .name(program.getName())
                .description(program.getDescription())
                .programType(program.getProgramType())
                .category(program.getCategory())
                .startDate(program.getStartDate())
                .endDate(program.getEndDate())
                .maxParticipants(program.getMaxParticipants())
                .pointsReward(program.getPointsReward())
                .budgetAmount(program.getBudgetAmount())
                .isActive(program.getIsActive())
                .isFeatured(program.getIsFeatured())
                .imageUrl(program.getImageUrl())
                .externalLink(program.getExternalLink())
                .instructions(program.getInstructions())
                .createdAt(program.getCreatedAt())
                .build();
    }

    private WellnessChallengeDto mapToDto(WellnessChallenge challenge) {
        int daysRemaining = 0;
        if (challenge.getEndDate() != null && challenge.getEndDate().isAfter(LocalDate.now())) {
            daysRemaining = (int) ChronoUnit.DAYS.between(LocalDate.now(), challenge.getEndDate());
        }

        return WellnessChallengeDto.builder()
                .id(challenge.getId())
                .programId(challenge.getProgram() != null ? challenge.getProgram().getId() : null)
                .programName(challenge.getProgram() != null ? challenge.getProgram().getName() : null)
                .name(challenge.getName())
                .description(challenge.getDescription())
                .challengeType(challenge.getChallengeType())
                .trackingType(challenge.getTrackingType())
                .startDate(challenge.getStartDate())
                .endDate(challenge.getEndDate())
                .targetValue(challenge.getTargetValue())
                .targetUnit(challenge.getTargetUnit())
                .dailyTarget(challenge.getDailyTarget())
                .pointsPerCompletion(challenge.getPointsPerCompletion())
                .bonusPointsForGoal(challenge.getBonusPointsForGoal())
                .minParticipants(challenge.getMinParticipants())
                .maxParticipants(challenge.getMaxParticipants())
                .currentParticipants((int) participantRepository.countActiveParticipants(challenge.getId()))
                .isTeamBased(challenge.getIsTeamBased())
                .teamSize(challenge.getTeamSize())
                .isActive(challenge.getIsActive())
                .leaderboardEnabled(challenge.getLeaderboardEnabled())
                .badgeId(challenge.getBadgeId())
                .daysRemaining(daysRemaining)
                .averageCompletion(participantRepository.getAverageCompletion(challenge.getId()))
                .createdAt(challenge.getCreatedAt())
                .build();
    }

    private HealthLogDto mapToDto(HealthLog log) {
        return HealthLogDto.builder()
                .id(log.getId())
                .employeeId(log.getEmployeeId())
                .participantId(log.getParticipant() != null ? log.getParticipant().getId() : null)
                .challengeId(log.getParticipant() != null ? log.getParticipant().getChallenge().getId() : null)
                .logDate(log.getLogDate())
                .metricType(log.getMetricType())
                .value(log.getValue())
                .unit(log.getUnit())
                .source(log.getSource())
                .notes(log.getNotes())
                .verified(log.getVerified())
                .pointsAwarded(log.getPointsAwarded())
                .loggedAt(log.getLoggedAt())
                .build();
    }

    private WellnessPointsDto mapToDto(WellnessPoints points, UUID employeeId) {
        User user = userRepository.findById(employeeId).orElse(null);

        List<PointsTransaction> recentTx = transactionRepository.findByEmployeeId(employeeId, PageRequest.of(0, 10)).getContent();
        List<WellnessPointsDto.PointsTransactionDto> transactions = recentTx.stream()
                .map(tx -> WellnessPointsDto.PointsTransactionDto.builder()
                        .id(tx.getId())
                        .transactionType(tx.getTransactionType().name())
                        .points(tx.getPoints())
                        .balanceAfter(tx.getBalanceAfter())
                        .description(tx.getDescription())
                        .transactionAt(tx.getTransactionAt())
                        .build())
                .collect(Collectors.toList());

        return WellnessPointsDto.builder()
                .id(points.getId())
                .employeeId(employeeId)
                .employeeName(user != null ? user.getFullName() : null)
                .totalPoints(points.getTotalPoints())
                .redeemablePoints(points.getRedeemablePoints())
                .lifetimePoints(points.getLifetimePoints())
                .currentLevel(points.getCurrentLevel())
                .levelName("Level " + points.getCurrentLevel())
                .pointsToNextLevel(points.getPointsToNextLevel())
                .challengesCompleted(points.getChallengesCompleted())
                .currentStreak(points.getCurrentStreak())
                .longestStreak(points.getLongestStreak())
                .badgesEarned(points.getBadgesEarned())
                .lastActivityAt(points.getLastActivityAt())
                .recentTransactions(transactions)
                .build();
    }
}
