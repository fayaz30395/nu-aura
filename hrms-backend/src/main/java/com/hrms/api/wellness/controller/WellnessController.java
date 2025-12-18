package com.hrms.api.wellness.controller;

import com.hrms.api.wellness.dto.*;
import com.hrms.application.wellness.service.WellnessService;
import com.hrms.common.security.Permission;
import com.hrms.common.security.RequiresPermission;
import com.hrms.common.security.SecurityContext;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@Slf4j
@RestController
@RequestMapping("/api/v1/wellness")
@RequiredArgsConstructor
@Tag(name = "Employee Wellness", description = "Wellness programs, challenges, health tracking, and gamification")
public class WellnessController {

    private final WellnessService wellnessService;

    // ==================== Dashboard ====================

    @GetMapping("/dashboard")
    @RequiresPermission(Permission.WELLNESS_VIEW)
    @Operation(summary = "Get wellness dashboard for current user")
    public ResponseEntity<WellnessDashboard> getDashboard() {
        UUID employeeId = SecurityContext.getCurrentUserId();
        return ResponseEntity.ok(wellnessService.getDashboard(employeeId));
    }

    // ==================== Programs ====================

    @PostMapping("/programs")
    @RequiresPermission(Permission.WELLNESS_MANAGE)
    @Operation(summary = "Create a wellness program")
    public ResponseEntity<WellnessProgramDto> createProgram(@Valid @RequestBody WellnessProgramDto request) {
        log.info("Creating wellness program: {}", request.getName());
        return ResponseEntity.ok(wellnessService.createProgram(request));
    }

    @GetMapping("/programs/active")
    @RequiresPermission(Permission.WELLNESS_VIEW)
    @Operation(summary = "Get active wellness programs")
    public ResponseEntity<List<WellnessProgramDto>> getActivePrograms() {
        return ResponseEntity.ok(wellnessService.getActivePrograms());
    }

    @GetMapping("/programs/featured")
    @RequiresPermission(Permission.WELLNESS_VIEW)
    @Operation(summary = "Get featured wellness programs")
    public ResponseEntity<List<WellnessProgramDto>> getFeaturedPrograms() {
        return ResponseEntity.ok(wellnessService.getFeaturedPrograms());
    }

    // ==================== Challenges ====================

    @PostMapping("/programs/{programId}/challenges")
    @RequiresPermission(Permission.WELLNESS_MANAGE)
    @Operation(summary = "Create a challenge within a program")
    public ResponseEntity<WellnessChallengeDto> createChallenge(
            @PathVariable UUID programId,
            @Valid @RequestBody WellnessChallengeDto request) {
        log.info("Creating challenge {} for program {}", request.getName(), programId);
        return ResponseEntity.ok(wellnessService.createChallenge(programId, request));
    }

    @PostMapping("/challenges")
    @RequiresPermission(Permission.WELLNESS_MANAGE)
    @Operation(summary = "Create a standalone challenge")
    public ResponseEntity<WellnessChallengeDto> createStandaloneChallenge(
            @Valid @RequestBody WellnessChallengeDto request) {
        log.info("Creating standalone challenge: {}", request.getName());
        return ResponseEntity.ok(wellnessService.createChallenge(null, request));
    }

    @GetMapping("/challenges/active")
    @RequiresPermission(Permission.WELLNESS_VIEW)
    @Operation(summary = "Get active challenges")
    public ResponseEntity<List<WellnessChallengeDto>> getActiveChallenges() {
        return ResponseEntity.ok(wellnessService.getActiveChallenges());
    }

    @GetMapping("/challenges/upcoming")
    @RequiresPermission(Permission.WELLNESS_VIEW)
    @Operation(summary = "Get upcoming challenges")
    public ResponseEntity<List<WellnessChallengeDto>> getUpcomingChallenges() {
        return ResponseEntity.ok(wellnessService.getUpcomingChallenges());
    }

    // ==================== Participation ====================

    @PostMapping("/challenges/{challengeId}/join")
    @RequiresPermission(Permission.WELLNESS_CREATE)
    @Operation(summary = "Join a challenge")
    public ResponseEntity<Void> joinChallenge(
            @PathVariable UUID challengeId,
            @RequestParam(required = false) UUID teamId,
            @RequestParam(required = false) String teamName) {
        UUID employeeId = SecurityContext.getCurrentUserId();
        log.info("Employee {} joining challenge {}", employeeId, challengeId);
        wellnessService.joinChallenge(challengeId, employeeId, teamId, teamName);
        return ResponseEntity.ok().build();
    }

    @PostMapping("/challenges/{challengeId}/leave")
    @RequiresPermission(Permission.WELLNESS_CREATE)
    @Operation(summary = "Leave a challenge")
    public ResponseEntity<Void> leaveChallenge(@PathVariable UUID challengeId) {
        UUID employeeId = SecurityContext.getCurrentUserId();
        log.info("Employee {} leaving challenge {}", employeeId, challengeId);
        wellnessService.leaveChallenge(challengeId, employeeId);
        return ResponseEntity.ok().build();
    }

    // ==================== Health Logging ====================

    @PostMapping("/health-logs")
    @RequiresPermission(Permission.WELLNESS_CREATE)
    @Operation(summary = "Log a health metric")
    public ResponseEntity<HealthLogDto> logHealth(@Valid @RequestBody HealthLogDto request) {
        UUID employeeId = SecurityContext.getCurrentUserId();
        log.info("Employee {} logging health metric: {}", employeeId, request.getMetricType());
        return ResponseEntity.ok(wellnessService.logHealth(employeeId, request));
    }

    @GetMapping("/health-logs")
    @RequiresPermission(Permission.WELLNESS_VIEW)
    @Operation(summary = "Get health logs for current user")
    public ResponseEntity<List<HealthLogDto>> getHealthLogs(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate) {
        UUID employeeId = SecurityContext.getCurrentUserId();
        return ResponseEntity.ok(wellnessService.getHealthLogs(employeeId, startDate, endDate));
    }

    // ==================== Points & Leaderboard ====================

    @GetMapping("/points")
    @RequiresPermission(Permission.WELLNESS_VIEW)
    @Operation(summary = "Get current user's wellness points")
    public ResponseEntity<WellnessPointsDto> getMyPoints() {
        UUID employeeId = SecurityContext.getCurrentUserId();
        return ResponseEntity.ok(wellnessService.getMyPoints(employeeId));
    }

    @GetMapping("/leaderboard")
    @RequiresPermission(Permission.WELLNESS_VIEW)
    @Operation(summary = "Get overall wellness leaderboard")
    public ResponseEntity<List<WellnessDashboard.LeaderboardEntry>> getLeaderboard(
            @RequestParam(defaultValue = "10") int limit) {
        return ResponseEntity.ok(wellnessService.getLeaderboard(limit));
    }

    @GetMapping("/challenges/{challengeId}/leaderboard")
    @RequiresPermission(Permission.WELLNESS_VIEW)
    @Operation(summary = "Get challenge-specific leaderboard")
    public ResponseEntity<List<WellnessDashboard.LeaderboardEntry>> getChallengeLeaderboard(
            @PathVariable UUID challengeId,
            @RequestParam(defaultValue = "10") int limit) {
        return ResponseEntity.ok(wellnessService.getChallengeLeaderboard(challengeId, limit));
    }
}
