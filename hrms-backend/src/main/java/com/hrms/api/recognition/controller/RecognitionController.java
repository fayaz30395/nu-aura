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
    public ResponseEntity<RecognitionResponse> giveRecognition(
            @Valid @RequestBody RecognitionRequest request) {
        UUID userId = SecurityContext.getCurrentUserId();
        RecognitionResponse response = recognitionService.giveRecognition(userId, request);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/{id}")
    public ResponseEntity<RecognitionResponse> getRecognition(@PathVariable UUID id) {
        return ResponseEntity.ok(recognitionService.getRecognitionById(id));
    }

    @GetMapping("/feed")
    public ResponseEntity<Page<RecognitionResponse>> getPublicFeed(Pageable pageable) {
        return ResponseEntity.ok(recognitionService.getPublicFeed(pageable));
    }

    @GetMapping("/received")
    public ResponseEntity<Page<RecognitionResponse>> getMyReceivedRecognitions(Pageable pageable) {
        UUID userId = SecurityContext.getCurrentUserId();
        return ResponseEntity.ok(recognitionService.getMyReceivedRecognitions(userId, pageable));
    }

    @GetMapping("/given")
    public ResponseEntity<Page<RecognitionResponse>> getMyGivenRecognitions(Pageable pageable) {
        UUID userId = SecurityContext.getCurrentUserId();
        return ResponseEntity.ok(recognitionService.getMyGivenRecognitions(userId, pageable));
    }

    @PostMapping("/{id}/react")
    public ResponseEntity<Void> addReaction(
            @PathVariable UUID id,
            @RequestParam RecognitionReaction.ReactionType reactionType) {
        UUID userId = SecurityContext.getCurrentUserId();
        recognitionService.addReaction(id, userId, reactionType);
        return ResponseEntity.ok().build();
    }

    @DeleteMapping("/{id}/react")
    public ResponseEntity<Void> removeReaction(
            @PathVariable UUID id,
            @RequestParam RecognitionReaction.ReactionType reactionType) {
        UUID userId = SecurityContext.getCurrentUserId();
        recognitionService.removeReaction(id, userId, reactionType);
        return ResponseEntity.ok().build();
    }

    // ==================== Badge Endpoints ====================

    @GetMapping("/badges")
    public ResponseEntity<List<RecognitionBadge>> getActiveBadges() {
        return ResponseEntity.ok(recognitionService.getActiveBadges());
    }

    // ==================== Points Endpoints ====================

    @GetMapping("/points")
    public ResponseEntity<EmployeePoints> getMyPoints() {
        UUID userId = SecurityContext.getCurrentUserId();
        return ResponseEntity.ok(recognitionService.getEmployeePoints(userId));
    }

    @GetMapping("/leaderboard")
    public ResponseEntity<List<EmployeePoints>> getLeaderboard(
            @RequestParam(defaultValue = "10") int limit) {
        return ResponseEntity.ok(recognitionService.getLeaderboard(limit));
    }

    // ==================== Survey Endpoints ====================
    // NOTE: Survey endpoints have been moved to the engagement package
    // Use /api/v1/engagement/surveys instead

    // ==================== Dashboard Endpoints ====================

    @GetMapping("/dashboard")
    public ResponseEntity<EngagementDashboardResponse> getDashboard() {
        return ResponseEntity.ok(recognitionService.getDashboard());
    }

    // ==================== Milestones Endpoints ====================

    @GetMapping("/milestones/upcoming")
    public ResponseEntity<List<Milestone>> getUpcomingMilestones(
            @RequestParam(defaultValue = "7") int days) {
        return ResponseEntity.ok(recognitionService.getUpcomingMilestones(days));
    }

    // ==================== Enum Values ====================

    @GetMapping("/types")
    public ResponseEntity<Recognition.RecognitionType[]> getRecognitionTypes() {
        return ResponseEntity.ok(Recognition.RecognitionType.values());
    }

    @GetMapping("/categories")
    public ResponseEntity<Recognition.RecognitionCategory[]> getRecognitionCategories() {
        return ResponseEntity.ok(Recognition.RecognitionCategory.values());
    }
}
