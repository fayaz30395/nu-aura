package com.nulogic.application.recognition.service;

import com.nulogic.api.recognition.dto.EngagementDashboardResponse;
import com.nulogic.api.recognition.dto.RecognitionRequest;
import com.nulogic.api.recognition.dto.RecognitionResponse;
import com.nulogic.api.wall.dto.CreatePostRequest;
import com.nulogic.api.wall.dto.WallPostResponse;
import com.nulogic.application.wall.service.WallService;
import com.nulogic.common.exception.BusinessException;
import com.nulogic.common.exception.ResourceNotFoundException;
import com.nulogic.common.security.SecurityContext;
import com.nulogic.common.security.TenantContext;
import com.nulogic.common.util.TenantTimeService;
import com.nulogic.domain.recognition.*;
import com.nulogic.domain.wall.model.WallPost;
import com.nulogic.infrastructure.employee.repository.EmployeeRepository;
import com.nulogic.infrastructure.recognition.repository.*;
import com.nulogic.infrastructure.wall.repository.PostReactionRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional
public class RecognitionService {

    private final RecognitionRepository recognitionRepository;
    private final RecognitionBadgeRepository badgeRepository;
    private final EmployeePointsRepository pointsRepository;
    private final MilestoneRepository milestoneRepository;
    // Survey repositories removed - functionality moved to engagement package
    // private final PulseSurveyRepository surveyRepository;
    // private final RecognitionSurveyResponseRepository responseRepository;
    private final RecognitionReactionRepository reactionRepository;
    private final EmployeeRepository employeeRepository;
    private final WallService wallService;
    private final PostReactionRepository postReactionRepository;
    private final TenantTimeService tenantTimeService;

    // ==================== Recognition Operations ====================

    public RecognitionResponse giveRecognition(UUID giverId, RecognitionRequest request) {
        UUID tenantId = TenantContext.requireCurrentTenant();

        if (giverId.equals(request.getReceiverId())) {
            throw new BusinessException("You cannot recognize yourself");
        }

        Recognition entity = Recognition.builder()
                .giverId(giverId)
                .receiverId(request.getReceiverId())
                .type(request.getType())
                .category(request.getCategory())
                .title(request.getTitle())
                .message(request.getMessage())
                .pointsAwarded(request.getPoints() != null ? request.getPoints() : 0)
                .isPublic(request.getIsPublic() != null ? request.getIsPublic() : true)
                .isAnonymous(request.getIsAnonymous() != null ? request.getIsAnonymous() : false)
                .badgeId(request.getBadgeId())
                .recognizedAt(tenantTimeService.now(tenantId))
                .isApproved(true)
                .build();
        entity.setTenantId(tenantId);

        Recognition saved = recognitionRepository.save(entity);

        // Create wall post for social features (reactions/comments)
        // Only create if public recognition
        if (saved.getIsPublic()) {
            try {
                CreatePostRequest wallPostRequest = new CreatePostRequest();
                wallPostRequest.setType(WallPost.PostType.PRAISE);
                wallPostRequest.setContent(saved.getMessage() != null ? saved.getMessage() : saved.getTitle());
                wallPostRequest.setPraiseRecipientId(request.getReceiverId());
                wallPostRequest.setVisibility(WallPost.PostVisibility.ORGANIZATION);

                WallPostResponse wallPost = wallService.createPost(wallPostRequest, giverId);
                saved.setWallPostId(wallPost.getId());
                saved = recognitionRepository.save(saved);
                log.info("Created wall post {} for recognition {}", wallPost.getId(), saved.getId());
            } catch (Exception e) { // Intentional broad catch — per-award notification error boundary
                log.error("Failed to create wall post for recognition {}: {}", saved.getId(), e.getMessage());
                // Don't fail the recognition if wall post creation fails
            }
        }

        // Update points for receiver
        if (saved.getPointsAwarded() > 0) {
            EmployeePoints receiverPoints = getOrCreateEmployeePoints(request.getReceiverId(), tenantId);
            receiverPoints.addPoints(saved.getPointsAwarded());
            receiverPoints.incrementRecognitionsReceived();
            pointsRepository.save(receiverPoints);
        }

        // Update giver stats
        EmployeePoints giverPoints = getOrCreateEmployeePoints(giverId, tenantId);
        giverPoints.incrementRecognitionsGiven();
        pointsRepository.save(giverPoints);

        log.info("Recognition given from {} to {}", giverId, request.getReceiverId());

        return enrichRecognitionResponse(RecognitionResponse.fromEntity(saved), tenantId, giverId);
    }

    @Transactional(readOnly = true)
    public RecognitionResponse getRecognitionById(UUID recognitionId) {
        UUID tenantId = TenantContext.getCurrentTenant();
        UUID currentUserId = SecurityContext.getCurrentEmployeeId();
        Recognition entity = recognitionRepository.findByIdAndTenantId(recognitionId, tenantId)
                .orElseThrow(() -> new ResourceNotFoundException("Recognition not found: " + recognitionId));
        return enrichRecognitionResponse(RecognitionResponse.fromEntity(entity), tenantId, currentUserId);
    }

    @Transactional(readOnly = true)
    public Page<RecognitionResponse> getPublicFeed(Pageable pageable) {
        UUID tenantId = TenantContext.getCurrentTenant();
        UUID currentUserId = SecurityContext.getCurrentEmployeeId();
        Page<Recognition> recognitions = recognitionRepository.findByTenantIdAndIsPublicTrueAndIsApprovedTrue(
                tenantId, pageable);
        return enrichRecognitionPage(recognitions, tenantId, currentUserId);
    }

    @Transactional(readOnly = true)
    public Page<RecognitionResponse> getMyReceivedRecognitions(UUID employeeId, Pageable pageable) {
        UUID tenantId = TenantContext.getCurrentTenant();
        UUID currentUserId = SecurityContext.getCurrentEmployeeId();
        Page<Recognition> recognitions = recognitionRepository.findByReceiver(tenantId, employeeId, pageable);
        return enrichRecognitionPage(recognitions, tenantId, currentUserId);
    }

    @Transactional(readOnly = true)
    public Page<RecognitionResponse> getMyGivenRecognitions(UUID employeeId, Pageable pageable) {
        UUID tenantId = TenantContext.getCurrentTenant();
        UUID currentUserId = SecurityContext.getCurrentEmployeeId();
        Page<Recognition> recognitions = recognitionRepository.findByGiver(tenantId, employeeId, pageable);
        return enrichRecognitionPage(recognitions, tenantId, currentUserId);
    }

    @Transactional
    public void addReaction(UUID recognitionId, UUID employeeId, RecognitionReaction.ReactionType reactionType) {
        UUID tenantId = TenantContext.getCurrentTenant();

        Recognition recognition = recognitionRepository.findByIdAndTenantId(recognitionId, tenantId)
                .orElseThrow(() -> new ResourceNotFoundException("Recognition not found: " + recognitionId));

        if (reactionRepository.existsByRecognitionIdAndEmployeeIdAndReactionType(recognitionId, employeeId,
                reactionType)) {
            throw new BusinessException("Reaction already exists");
        }

        RecognitionReaction reaction = RecognitionReaction.builder()
                .recognitionId(recognitionId)
                .employeeId(employeeId)
                .reactionType(reactionType)
                .build();
        reaction.setTenantId(tenantId);

        reactionRepository.save(reaction);
        recognition.incrementLikes();
        recognitionRepository.save(recognition);
    }

    @Transactional
    public void removeReaction(UUID recognitionId, UUID employeeId, RecognitionReaction.ReactionType reactionType) {
        UUID tenantId = TenantContext.getCurrentTenant();

        Recognition recognition = recognitionRepository.findByIdAndTenantId(recognitionId, tenantId)
                .orElseThrow(() -> new ResourceNotFoundException("Recognition not found: " + recognitionId));

        reactionRepository.deleteByRecognitionIdAndEmployeeIdAndReactionType(recognitionId, employeeId, reactionType);
        recognition.decrementLikes();
        recognitionRepository.save(recognition);
    }

    // ==================== Badge Operations ====================

    @Transactional(readOnly = true)
    public List<RecognitionBadge> getActiveBadges() {
        UUID tenantId = TenantContext.getCurrentTenant();
        return badgeRepository.findActiveBadges(tenantId);
    }

    // ==================== Points Operations ====================

    @Transactional(readOnly = true)
    public EmployeePoints getEmployeePoints(UUID employeeId) {
        UUID tenantId = TenantContext.getCurrentTenant();
        return pointsRepository.findByEmployeeIdAndTenantId(employeeId, tenantId)
                .orElse(EmployeePoints.builder()
                        .employeeId(employeeId)
                        .totalPointsEarned(0)
                        .totalPointsRedeemed(0)
                        .currentBalance(0)
                        .recognitionsGiven(0)
                        .recognitionsReceived(0)
                        .build());
    }

    @Transactional(readOnly = true)
    public List<EmployeePoints> getLeaderboard(int limit) {
        UUID tenantId = TenantContext.getCurrentTenant();
        return pointsRepository.findTopByPoints(tenantId, PageRequest.of(0, limit));
    }

    // ==================== Survey Operations ====================
    // NOTE: Survey functionality has been moved to the engagement package
    // Use PulseSurveyService in the engagement package instead

    // ==================== Dashboard ====================

    @Transactional(readOnly = true)
    public EngagementDashboardResponse getDashboard() {
        UUID tenantId = TenantContext.requireCurrentTenant();
        LocalDate tenantToday = tenantTimeService.today(tenantId);
        LocalDateTime startOfMonth = tenantToday.withDayOfMonth(1).atStartOfDay();
        LocalDateTime startOfYear = tenantToday.withDayOfYear(1).atStartOfDay();

        // Recognition counts
        List<Recognition> monthlyRecognitions = recognitionRepository.findRecentPublicRecognitions(tenantId,
                startOfMonth);
        List<Recognition> yearlyRecognitions = recognitionRepository.findRecentPublicRecognitions(tenantId,
                startOfYear);

        // Top performers
        // Calculate top receivers and givers if needed for dashboard
        // List<EmployeeRecognitionStats> topReceivers =
        // recognitionRepository.findTopReceivers(tenantId, start, end,
        // Pageable.ofSize(5));
        // List<EmployeeRecognitionStats> topGivers =
        // recognitionRepository.findTopGivers(tenantId, start, end,
        // Pageable.ofSize(5));

        // Points summary
        Long totalPointsEarned = pointsRepository.getTotalPointsEarned(tenantId);
        Long totalPointsRedeemed = pointsRepository.getTotalPointsRedeemed(tenantId);

        // Category distribution
        Map<String, Integer> categoryDistribution = recognitionRepository.countByCategory(tenantId).stream()
                .collect(Collectors.toMap(
                        r -> r[0] != null ? r[0].toString() : "OTHER",
                        r -> ((Long) r[1]).intValue()));

        // Survey stats - moved to engagement package
        // List<PulseSurvey> activeSurveys =
        // surveyRepository.findActiveSurveys(tenantId, LocalDate.now());

        // Upcoming milestones
        LocalDate today = tenantToday;
        LocalDate nextWeek = today.plusDays(7);
        List<Milestone> upcomingMilestones = milestoneRepository.findUpcoming(tenantId, today, nextWeek);

        return EngagementDashboardResponse.builder()
                .totalRecognitionsThisMonth(monthlyRecognitions.size())
                .totalRecognitionsThisYear(yearlyRecognitions.size())
                .totalPointsAwarded(totalPointsEarned != null ? totalPointsEarned.intValue() : 0)
                .totalPointsRedeemed(totalPointsRedeemed != null ? totalPointsRedeemed.intValue() : 0)
                .recognitionsByCategory(categoryDistribution)
                .activeSurveys(0) // Survey stats moved to engagement package
                .build();
    }

    // ==================== Milestones ====================

    @Transactional(readOnly = true)
    public List<Milestone> getUpcomingMilestones(int days) {
        UUID tenantId = TenantContext.requireCurrentTenant();
        LocalDate today = tenantTimeService.today(tenantId);
        return milestoneRepository.findUpcoming(tenantId, today, today.plusDays(days));
    }

    // ==================== Helper Methods ====================

    private EmployeePoints getOrCreateEmployeePoints(UUID employeeId, UUID tenantId) {
        return pointsRepository.findByEmployeeIdAndTenantId(employeeId, tenantId)
                .orElseGet(() -> {
                    EmployeePoints newPoints = EmployeePoints.builder()
                            .employeeId(employeeId)
                            .build();
                    newPoints.setTenantId(tenantId);
                    return pointsRepository.save(newPoints);
                });
    }

    private RecognitionResponse enrichRecognitionResponse(RecognitionResponse response, UUID tenantId, UUID currentUserId) {
        if (!response.getIsAnonymous()) {
            employeeRepository.findByIdAndTenantId(response.getGiverId(), tenantId)
                    .ifPresent(emp -> {
                        response.setGiverName(emp.getFirstName() + " " + emp.getLastName());
                    });
        } else {
            response.setGiverName("Anonymous");
        }

        employeeRepository.findByIdAndTenantId(response.getReceiverId(), tenantId)
                .ifPresent(emp -> {
                    response.setReceiverName(emp.getFirstName() + " " + emp.getLastName());
                });

        if (response.getBadgeId() != null) {
            badgeRepository.findByIdAndTenantId(response.getBadgeId(), tenantId)
                    .ifPresent(badge -> {
                        response.setBadgeName(badge.getBadgeName());
                        response.setBadgeIconUrl(badge.getIconUrl());
                    });
        }

        // Check if current user has reacted to this recognition's wall post
        if (response.getWallPostId() != null && currentUserId != null) {
            boolean hasReacted = postReactionRepository.findByPostIdAndEmployeeId(
                    response.getWallPostId(), currentUserId
            ).isPresent();
            response.setHasReacted(hasReacted);
        }

        return response;
    }

    private Page<RecognitionResponse> enrichRecognitionPage(
            Page<Recognition> recognitions,
            UUID tenantId,
            UUID currentUserId) {
        if (recognitions.isEmpty()) {
            return recognitions.map(RecognitionResponse::fromEntity);
        }

        List<RecognitionResponse> responses = recognitions.getContent().stream()
                .map(RecognitionResponse::fromEntity)
                .collect(Collectors.toList());
        enrichRecognitionResponses(responses, tenantId, currentUserId);
        return new PageImpl<>(responses, recognitions.getPageable(), recognitions.getTotalElements());
    }

    private void enrichRecognitionResponses(
            List<RecognitionResponse> responses,
            UUID tenantId,
            UUID currentUserId) {
        Set<UUID> employeeIds = new HashSet<>();
        Set<UUID> badgeIds = new HashSet<>();
        Set<UUID> wallPostIds = new HashSet<>();

        for (RecognitionResponse response : responses) {
            if (!Boolean.TRUE.equals(response.getIsAnonymous()) && response.getGiverId() != null) {
                employeeIds.add(response.getGiverId());
            }
            if (response.getReceiverId() != null) {
                employeeIds.add(response.getReceiverId());
            }
            if (response.getBadgeId() != null) {
                badgeIds.add(response.getBadgeId());
            }
            if (response.getWallPostId() != null) {
                wallPostIds.add(response.getWallPostId());
            }
        }

        Map<UUID, String> employeeNames = loadEmployeeNames(employeeIds, tenantId);
        Map<UUID, RecognitionBadge> badges = loadBadges(badgeIds, tenantId);
        Set<UUID> reactedPostIds = loadReactedPostIds(wallPostIds, currentUserId, tenantId);

        for (RecognitionResponse response : responses) {
            if (Boolean.TRUE.equals(response.getIsAnonymous())) {
                response.setGiverName("Anonymous");
            } else {
                UUID giverId = response.getGiverId();
                response.setGiverName(giverId != null ? employeeNames.get(giverId) : null);
            }

            UUID receiverId = response.getReceiverId();
            response.setReceiverName(receiverId != null ? employeeNames.get(receiverId) : null);

            UUID badgeId = response.getBadgeId();
            if (badgeId != null) {
                RecognitionBadge badge = badges.get(badgeId);
                if (badge != null) {
                    response.setBadgeName(badge.getBadgeName());
                    response.setBadgeIconUrl(badge.getIconUrl());
                }
            }

            if (response.getWallPostId() != null && currentUserId != null) {
                response.setHasReacted(reactedPostIds.contains(response.getWallPostId()));
            }
        }
    }

    private Map<UUID, String> loadEmployeeNames(Set<UUID> employeeIds, UUID tenantId) {
        if (employeeIds.isEmpty()) {
            return Map.of();
        }

        Map<UUID, String> employeeNames = new HashMap<>();
        for (Object[] row : employeeRepository.findFullNamesByIdsAndTenantId(employeeIds, tenantId)) {
            employeeNames.put((UUID) row[0], (String) row[1]);
        }
        return employeeNames;
    }

    private Map<UUID, RecognitionBadge> loadBadges(Set<UUID> badgeIds, UUID tenantId) {
        if (badgeIds.isEmpty()) {
            return Map.of();
        }

        return badgeRepository.findByTenantIdAndIdIn(tenantId, badgeIds).stream()
                .collect(Collectors.toMap(RecognitionBadge::getId, badge -> badge));
    }

    private Set<UUID> loadReactedPostIds(Set<UUID> wallPostIds, UUID currentUserId, UUID tenantId) {
        if (wallPostIds.isEmpty() || currentUserId == null) {
            return Set.of();
        }

        return new HashSet<>(postReactionRepository.findPostIdsWithUserReactionForTenant(
                List.copyOf(wallPostIds), currentUserId, tenantId));
    }

    // Removed enrichSurveyResponse - survey functionality moved to engagement
    // package
}
