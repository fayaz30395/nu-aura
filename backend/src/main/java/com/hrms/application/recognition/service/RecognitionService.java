package com.hrms.application.recognition.service;

import com.hrms.api.recognition.dto.*;
import com.hrms.api.wall.dto.CreatePostRequest;
import com.hrms.api.wall.dto.WallPostResponse;
import com.hrms.application.wall.service.WallService;
import com.hrms.common.security.TenantContext;
import com.hrms.common.security.SecurityContext;
import com.hrms.common.exception.BusinessException;
import com.hrms.common.exception.ResourceNotFoundException;
import com.hrms.domain.recognition.*;
import com.hrms.domain.wall.model.WallPost;
import com.hrms.infrastructure.employee.repository.EmployeeRepository;
import com.hrms.infrastructure.recognition.repository.*;
import com.hrms.infrastructure.wall.repository.PostReactionRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
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

    // ==================== Recognition Operations ====================

    public RecognitionResponse giveRecognition(UUID giverId, RecognitionRequest request) {
        UUID tenantId = TenantContext.getCurrentTenant();

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
                .recognizedAt(LocalDateTime.now())
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
        return recognitionRepository.findByTenantIdAndIsPublicTrueAndIsApprovedTrue(tenantId, pageable)
                .map(e -> enrichRecognitionResponse(RecognitionResponse.fromEntity(e), tenantId, currentUserId));
    }

    @Transactional(readOnly = true)
    public Page<RecognitionResponse> getMyReceivedRecognitions(UUID employeeId, Pageable pageable) {
        UUID tenantId = TenantContext.getCurrentTenant();
        UUID currentUserId = SecurityContext.getCurrentEmployeeId();
        return recognitionRepository.findByReceiver(tenantId, employeeId, pageable)
                .map(e -> enrichRecognitionResponse(RecognitionResponse.fromEntity(e), tenantId, currentUserId));
    }

    @Transactional(readOnly = true)
    public Page<RecognitionResponse> getMyGivenRecognitions(UUID employeeId, Pageable pageable) {
        UUID tenantId = TenantContext.getCurrentTenant();
        UUID currentUserId = SecurityContext.getCurrentEmployeeId();
        return recognitionRepository.findByGiver(tenantId, employeeId, pageable)
                .map(e -> enrichRecognitionResponse(RecognitionResponse.fromEntity(e), tenantId, currentUserId));
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
        UUID tenantId = TenantContext.getCurrentTenant();
        LocalDateTime startOfMonth = LocalDate.now().withDayOfMonth(1).atStartOfDay();
        LocalDateTime startOfYear = LocalDate.now().withDayOfYear(1).atStartOfDay();

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
        LocalDate today = LocalDate.now();
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
        UUID tenantId = TenantContext.getCurrentTenant();
        LocalDate today = LocalDate.now();
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

    // Removed enrichSurveyResponse - survey functionality moved to engagement
    // package
}
