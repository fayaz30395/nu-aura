package com.hrms.api.recognition.controller;

import com.hrms.api.recognition.dto.*;
import com.hrms.application.recognition.service.RecognitionService;
import com.hrms.common.security.Permission;
import com.hrms.common.security.RequiresPermission;
import com.hrms.common.security.SecurityContext;
import com.hrms.domain.recognition.*;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/recognition")
@RequiredArgsConstructor
public class RecognitionController {

    private final RecognitionService recognitionService;

    // ==================== Recognition Endpoints ====================

    @PostMapping
    @RequiresPermission(Permission.RECOGNITION_CREATE)
    public ResponseEntity<RecognitionResponse> giveRecognition(
            @Valid @RequestBody RecognitionRequest request) {
        // BUG-FIX: Use employeeId (not userId) since Recognition.giverId references the employee table
        // and WallService.createPost also looks up the employee table by this ID
        UUID employeeId = SecurityContext.getCurrentEmployeeId();
        UUID giverId = employeeId != null ? employeeId : SecurityContext.getCurrentUserId();
        RecognitionResponse response = recognitionService.giveRecognition(giverId, request);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/{id}")
    @RequiresPermission(Permission.RECOGNITION_VIEW)
    public ResponseEntity<RecognitionResponse> getRecognition(@PathVariable UUID id) {
        return ResponseEntity.ok(recognitionService.getRecognitionById(id));
    }

    @GetMapping("/feed")
    @RequiresPermission(Permission.RECOGNITION_VIEW)
    public ResponseEntity<Page<RecognitionResponse>> getPublicFeed(Pageable pageable) {
        return ResponseEntity.ok(recognitionService.getPublicFeed(pageable));
    }

    @GetMapping("/received")
    @RequiresPermission(Permission.RECOGNITION_VIEW)
    public ResponseEntity<Page<RecognitionResponse>> getMyReceivedRecognitions(Pageable pageable) {
        UUID userId = SecurityContext.getCurrentUserId();
        return ResponseEntity.ok(recognitionService.getMyReceivedRecognitions(userId, pageable));
    }

    @GetMapping("/given")
    @RequiresPermission(Permission.RECOGNITION_VIEW)
    public ResponseEntity<Page<RecognitionResponse>> getMyGivenRecognitions(Pageable pageable) {
        UUID userId = SecurityContext.getCurrentUserId();
        return ResponseEntity.ok(recognitionService.getMyGivenRecognitions(userId, pageable));
    }

    @PostMapping("/{id}/react")
    @RequiresPermission(Permission.RECOGNITION_CREATE)
    public ResponseEntity<Void> addReaction(
            @PathVariable UUID id,
            @RequestParam RecognitionReaction.ReactionType reactionType) {
        UUID userId = SecurityContext.getCurrentUserId();
        recognitionService.addReaction(id, userId, reactionType);
        return ResponseEntity.ok().build();
    }

    @DeleteMapping("/{id}/react")
    @RequiresPermission(Permission.RECOGNITION_CREATE)
    public ResponseEntity<Void> removeReaction(
            @PathVariable UUID id,
            @RequestParam RecognitionReaction.ReactionType reactionType) {
        UUID userId = SecurityContext.getCurrentUserId();
        recognitionService.removeReaction(id, userId, reactionType);
        return ResponseEntity.ok().build();
    }

    // ==================== Badge Endpoints ====================

    @GetMapping("/badges")
    @RequiresPermission(Permission.RECOGNITION_VIEW)
    public ResponseEntity<List<RecognitionBadge>> getActiveBadges() {
        return ResponseEntity.ok(recognitionService.getActiveBadges());
    }

    // ==================== Points Endpoints ====================

    @GetMapping("/points")
    @RequiresPermission(Permission.RECOGNITION_VIEW)
    public ResponseEntity<EmployeePoints> getMyPoints() {
        UUID userId = SecurityContext.getCurrentUserId();
        return ResponseEntity.ok(recognitionService.getEmployeePoints(userId));
    }

    @GetMapping("/leaderboard")
    @RequiresPermission(Permission.RECOGNITION_VIEW)
    public ResponseEntity<List<EmployeePoints>> getLeaderboard(
            @RequestParam(defaultValue = "10") int limit) {
        return ResponseEntity.ok(recognitionService.getLeaderboard(limit));
    }

    // ==================== Survey Endpoints ====================
    // NOTE: Survey endpoints have been moved to the engagement package
    // Use /api/v1/engagement/surveys instead

    // ==================== Dashboard Endpoints ====================

    @GetMapping("/dashboard")
    @RequiresPermission(Permission.RECOGNITION_VIEW)
    public ResponseEntity<EngagementDashboardResponse> getDashboard() {
        return ResponseEntity.ok(recognitionService.getDashboard());
    }

    // ==================== Milestones Endpoints ====================

    @GetMapping("/milestones/upcoming")
    @RequiresPermission(Permission.MILESTONE_VIEW)
    public ResponseEntity<List<Milestone>> getUpcomingMilestones(
            @RequestParam(defaultValue = "7") int days) {
        return ResponseEntity.ok(recognitionService.getUpcomingMilestones(days));
    }

    // ==================== Enum Values ====================

    @GetMapping("/types")
    @RequiresPermission(Permission.RECOGNITION_VIEW)
    public ResponseEntity<Recognition.RecognitionType[]> getRecognitionTypes() {
        return ResponseEntity.ok(Recognition.RecognitionType.values());
    }

    @GetMapping("/categories")
    @RequiresPermission(Permission.RECOGNITION_VIEW)
    public ResponseEntity<Recognition.RecognitionCategory[]> getRecognitionCategories() {
        return ResponseEntity.ok(Recognition.RecognitionCategory.values());
    }
}
