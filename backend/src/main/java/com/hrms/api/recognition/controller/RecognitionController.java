package com.hrms.api.recognition.controller;

import com.hrms.api.recognition.dto.*;
import com.hrms.application.recognition.service.RecognitionService;
import com.hrms.common.security.Permission;
import com.hrms.common.security.RequiresPermission;
import com.hrms.common.security.SecurityContext;
import com.hrms.domain.recognition.*;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
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
@Tag(name = "Recognition", description = "Peer recognition, badges, points, leaderboard, and milestone tracking")
public class RecognitionController {

    private final RecognitionService recognitionService;

    @PostMapping
    @RequiresPermission(Permission.RECOGNITION_CREATE)
    @Operation(summary = "Give recognition",
            description = "Award recognition (with optional badge/points) to a peer; creates an associated wall post")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Recognition created successfully"),
            @ApiResponse(responseCode = "400", description = "Invalid request data"),
            @ApiResponse(responseCode = "401", description = "Unauthenticated"),
            @ApiResponse(responseCode = "403", description = "Forbidden — requires RECOGNITION:CREATE permission")
    })
    public ResponseEntity<RecognitionResponse> giveRecognition(
            @Valid @RequestBody RecognitionRequest request) {
        UUID employeeId = SecurityContext.getCurrentEmployeeId();
        UUID giverId = employeeId != null ? employeeId : SecurityContext.getCurrentUserId();
        RecognitionResponse response = recognitionService.giveRecognition(giverId, request);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/{id}")
    @RequiresPermission(Permission.RECOGNITION_VIEW)
    @Operation(summary = "Get recognition by ID", description = "Returns a single recognition record by its UUID")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Recognition found"),
            @ApiResponse(responseCode = "404", description = "Recognition not found")
    })
    public ResponseEntity<RecognitionResponse> getRecognition(
            @Parameter(description = "Recognition UUID") @PathVariable UUID id) {
        return ResponseEntity.ok(recognitionService.getRecognitionById(id));
    }

    @GetMapping("/feed")
    @RequiresPermission(Permission.RECOGNITION_VIEW)
    @Operation(summary = "Get public recognition feed",
            description = "Paginated feed of recognitions visible to the entire tenant")
    @ApiResponse(responseCode = "200", description = "Feed retrieved successfully")
    public ResponseEntity<Page<RecognitionResponse>> getPublicFeed(Pageable pageable) {
        return ResponseEntity.ok(recognitionService.getPublicFeed(pageable));
    }

    @GetMapping("/received")
    @RequiresPermission(Permission.RECOGNITION_VIEW)
    @Operation(summary = "Get my received recognitions",
            description = "Paginated list of recognitions received by the authenticated user")
    @ApiResponse(responseCode = "200", description = "Recognitions retrieved successfully")
    public ResponseEntity<Page<RecognitionResponse>> getMyReceivedRecognitions(Pageable pageable) {
        UUID userId = SecurityContext.getCurrentUserId();
        return ResponseEntity.ok(recognitionService.getMyReceivedRecognitions(userId, pageable));
    }

    @GetMapping("/given")
    @RequiresPermission(Permission.RECOGNITION_VIEW)
    @Operation(summary = "Get my given recognitions",
            description = "Paginated list of recognitions given by the authenticated user")
    @ApiResponse(responseCode = "200", description = "Recognitions retrieved successfully")
    public ResponseEntity<Page<RecognitionResponse>> getMyGivenRecognitions(Pageable pageable) {
        UUID userId = SecurityContext.getCurrentUserId();
        return ResponseEntity.ok(recognitionService.getMyGivenRecognitions(userId, pageable));
    }

    @PostMapping("/{id}/react")
    @RequiresPermission(Permission.RECOGNITION_CREATE)
    @Operation(summary = "Add reaction to recognition",
            description = "Add an emoji reaction (LIKE, CELEBRATE, etc.) to a recognition")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Reaction added successfully"),
            @ApiResponse(responseCode = "404", description = "Recognition not found")
    })
    public ResponseEntity<Void> addReaction(
            @Parameter(description = "Recognition UUID") @PathVariable UUID id,
            @Parameter(description = "Reaction type", example = "LIKE") @RequestParam RecognitionReaction.ReactionType reactionType) {
        UUID userId = SecurityContext.getCurrentUserId();
        recognitionService.addReaction(id, userId, reactionType);
        return ResponseEntity.ok().build();
    }

    @DeleteMapping("/{id}/react")
    @RequiresPermission(Permission.RECOGNITION_CREATE)
    @Operation(summary = "Remove reaction from recognition",
            description = "Remove an emoji reaction previously added by the authenticated user")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Reaction removed successfully"),
            @ApiResponse(responseCode = "404", description = "Recognition or reaction not found")
    })
    public ResponseEntity<Void> removeReaction(
            @Parameter(description = "Recognition UUID") @PathVariable UUID id,
            @Parameter(description = "Reaction type to remove") @RequestParam RecognitionReaction.ReactionType reactionType) {
        UUID userId = SecurityContext.getCurrentUserId();
        recognitionService.removeReaction(id, userId, reactionType);
        return ResponseEntity.ok().build();
    }

    @GetMapping("/badges")
    @RequiresPermission(Permission.RECOGNITION_VIEW)
    @Operation(summary = "List active badges",
            description = "Returns all badges currently available for use in recognitions")
    @ApiResponse(responseCode = "200", description = "Badges retrieved successfully")
    public ResponseEntity<List<RecognitionBadge>> getActiveBadges() {
        return ResponseEntity.ok(recognitionService.getActiveBadges());
    }

    @GetMapping("/points")
    @RequiresPermission(Permission.RECOGNITION_VIEW)
    @Operation(summary = "Get my points balance",
            description = "Returns the authenticated user's accumulated recognition points")
    @ApiResponse(responseCode = "200", description = "Points retrieved successfully")
    public ResponseEntity<EmployeePoints> getMyPoints() {
        UUID userId = SecurityContext.getCurrentUserId();
        return ResponseEntity.ok(recognitionService.getEmployeePoints(userId));
    }

    @GetMapping("/leaderboard")
    @RequiresPermission(Permission.RECOGNITION_VIEW)
    @Operation(summary = "Get recognition leaderboard",
            description = "Returns top employees ranked by recognition points")
    @ApiResponse(responseCode = "200", description = "Leaderboard retrieved successfully")
    public ResponseEntity<List<EmployeePoints>> getLeaderboard(
            @Parameter(description = "Maximum number of leaderboard entries", example = "10") @RequestParam(defaultValue = "10") int limit) {
        return ResponseEntity.ok(recognitionService.getLeaderboard(limit));
    }

    @GetMapping("/dashboard")
    @RequiresPermission(Permission.RECOGNITION_VIEW)
    @Operation(summary = "Get engagement dashboard",
            description = "Returns aggregate recognition metrics for the tenant (counts, top givers/recipients, trends)")
    @ApiResponse(responseCode = "200", description = "Dashboard retrieved successfully")
    public ResponseEntity<EngagementDashboardResponse> getDashboard() {
        return ResponseEntity.ok(recognitionService.getDashboard());
    }

    @GetMapping("/milestones/upcoming")
    @RequiresPermission(Permission.MILESTONE_VIEW)
    @Operation(summary = "Get upcoming milestones",
            description = "Returns employee milestones (birthdays, anniversaries, etc.) in the next N days")
    @ApiResponse(responseCode = "200", description = "Milestones retrieved successfully")
    public ResponseEntity<List<Milestone>> getUpcomingMilestones(
            @Parameter(description = "Look-ahead window in days", example = "7") @RequestParam(defaultValue = "7") int days) {
        return ResponseEntity.ok(recognitionService.getUpcomingMilestones(days));
    }

    @GetMapping("/types")
    @RequiresPermission(Permission.RECOGNITION_VIEW)
    @Operation(summary = "List recognition types",
            description = "Returns enum values for recognition type filtering (UI helper)")
    @ApiResponse(responseCode = "200", description = "Types retrieved successfully")
    public ResponseEntity<Recognition.RecognitionType[]> getRecognitionTypes() {
        return ResponseEntity.ok(Recognition.RecognitionType.values());
    }

    @GetMapping("/categories")
    @RequiresPermission(Permission.RECOGNITION_VIEW)
    @Operation(summary = "List recognition categories",
            description = "Returns enum values for recognition category filtering (UI helper)")
    @ApiResponse(responseCode = "200", description = "Categories retrieved successfully")
    public ResponseEntity<Recognition.RecognitionCategory[]> getRecognitionCategories() {
        return ResponseEntity.ok(Recognition.RecognitionCategory.values());
    }
}
