package com.hrms.api.organization.controller;

import com.hrms.api.organization.dto.NineBoxDataResponse;
import com.hrms.api.organization.dto.SuccessionAnalyticsResponse;
import com.hrms.application.organization.service.OrganizationService;
import com.hrms.common.security.Permission;
import com.hrms.common.security.RequiresPermission;
import com.hrms.common.security.SecurityContext;
import com.hrms.domain.organization.*;
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

/**
 * REST controller for organization structure, positions, succession planning, and talent pools.
 */
@RestController
@RequestMapping("/api/v1/organization")
@RequiredArgsConstructor
@Tag(name = "Organization", description = "Organization structure, succession planning, and talent management")
public class OrganizationController {

    private final OrganizationService organizationService;

    // ==================== Organization Unit Endpoints ====================

    @PostMapping("/units")
    @RequiresPermission(Permission.SYSTEM_ADMIN)
    public ResponseEntity<OrganizationUnit> createUnit(@Valid @RequestBody OrganizationUnit unit) {
        return ResponseEntity.ok(organizationService.createUnit(unit));
    }

    @GetMapping("/units/{id}")
    @RequiresPermission(Permission.ORG_STRUCTURE_VIEW)
    public ResponseEntity<OrganizationUnit> getUnit(@PathVariable UUID id) {
        return ResponseEntity.ok(organizationService.getUnitById(id));
    }

    @GetMapping("/chart")
    @RequiresPermission(Permission.ORG_STRUCTURE_VIEW)
    public ResponseEntity<List<OrganizationUnit>> getOrgChart() {
        return ResponseEntity.ok(organizationService.getOrgChart());
    }

    @GetMapping("/units/{id}/children")
    @RequiresPermission(Permission.ORG_STRUCTURE_VIEW)
    public ResponseEntity<List<OrganizationUnit>> getChildUnits(@PathVariable UUID id) {
        return ResponseEntity.ok(organizationService.getChildUnits(id));
    }

    @GetMapping("/units")
    @RequiresPermission(Permission.ORG_STRUCTURE_VIEW)
    public ResponseEntity<List<OrganizationUnit>> getAllActiveUnits() {
        return ResponseEntity.ok(organizationService.getAllActiveUnits());
    }

    // ==================== Position Endpoints ====================

    @PostMapping("/positions")
    @RequiresPermission(Permission.SYSTEM_ADMIN)
    public ResponseEntity<Position> createPosition(@Valid @RequestBody Position position) {
        return ResponseEntity.ok(organizationService.createPosition(position));
    }

    @GetMapping("/positions/{id}")
    @RequiresPermission(Permission.POSITION_VIEW)
    public ResponseEntity<Position> getPosition(@PathVariable UUID id) {
        return ResponseEntity.ok(organizationService.getPositionById(id));
    }

    @GetMapping("/positions")
    @RequiresPermission(Permission.POSITION_VIEW)
    public ResponseEntity<Page<Position>> getAllPositions(Pageable pageable) {
        return ResponseEntity.ok(organizationService.getAllPositions(pageable));
    }

    @GetMapping("/positions/critical")
    @RequiresPermission(Permission.POSITION_VIEW)
    public ResponseEntity<List<Position>> getCriticalPositions() {
        return ResponseEntity.ok(organizationService.getCriticalPositions());
    }

    @GetMapping("/positions/vacancies")
    @RequiresPermission(Permission.POSITION_VIEW)
    public ResponseEntity<List<Position>> getPositionsWithVacancies() {
        return ResponseEntity.ok(organizationService.getPositionsWithVacancies());
    }

    // ==================== Succession Plan Endpoints ====================

    @PostMapping("/succession-plans")
    @RequiresPermission(Permission.SYSTEM_ADMIN)
    public ResponseEntity<SuccessionPlan> createSuccessionPlan(@Valid @RequestBody SuccessionPlan plan) {
        return ResponseEntity.ok(organizationService.createSuccessionPlan(plan));
    }

    @GetMapping("/succession-plans/{id}")
    @RequiresPermission(Permission.SUCCESSION_VIEW)
    public ResponseEntity<SuccessionPlan> getSuccessionPlan(@PathVariable UUID id) {
        return ResponseEntity.ok(organizationService.getSuccessionPlanById(id));
    }

    @GetMapping("/succession-plans")
    @RequiresPermission(Permission.SUCCESSION_VIEW)
    public ResponseEntity<Page<SuccessionPlan>> getAllSuccessionPlans(Pageable pageable) {
        return ResponseEntity.ok(organizationService.getAllSuccessionPlans(pageable));
    }

    @GetMapping("/succession-plans/active")
    @RequiresPermission(Permission.SUCCESSION_VIEW)
    public ResponseEntity<List<SuccessionPlan>> getActivePlans() {
        return ResponseEntity.ok(organizationService.getActivePlans());
    }

    @GetMapping("/succession-plans/high-risk")
    @RequiresPermission(Permission.SUCCESSION_VIEW)
    public ResponseEntity<List<SuccessionPlan>> getHighRiskPlans() {
        return ResponseEntity.ok(organizationService.getHighRiskPlans());
    }

    // ==================== Succession Candidate Endpoints ====================

    @PostMapping("/succession-plans/{planId}/candidates")
    @RequiresPermission(Permission.SYSTEM_ADMIN)
    public ResponseEntity<SuccessionCandidate> addCandidate(
            @PathVariable UUID planId,
            @Valid @RequestBody SuccessionCandidate candidate) {
        return ResponseEntity.ok(organizationService.addCandidate(planId, candidate));
    }

    @GetMapping("/succession-plans/{planId}/candidates")
    @RequiresPermission(Permission.SUCCESSION_VIEW)
    public ResponseEntity<List<SuccessionCandidate>> getCandidates(@PathVariable UUID planId) {
        return ResponseEntity.ok(organizationService.getCandidatesForPlan(planId));
    }

    @GetMapping("/succession-plans/{planId}/candidates/ready-now")
    @RequiresPermission(Permission.SUCCESSION_VIEW)
    public ResponseEntity<List<SuccessionCandidate>> getReadyNowCandidates(@PathVariable UUID planId) {
        return ResponseEntity.ok(organizationService.getReadyNowCandidates(planId));
    }

    @DeleteMapping("/succession-plans/{planId}/candidates/{candidateId}")
    @RequiresPermission(Permission.SYSTEM_ADMIN)
    public ResponseEntity<Void> removeCandidate(
            @PathVariable UUID planId,
            @PathVariable UUID candidateId) {
        organizationService.removeCandidate(planId, candidateId);
        return ResponseEntity.ok().build();
    }

    // ==================== Talent Pool Endpoints ====================

    @PostMapping("/talent-pools")
    @RequiresPermission(Permission.SYSTEM_ADMIN)
    public ResponseEntity<TalentPool> createTalentPool(@Valid @RequestBody TalentPool pool) {
        return ResponseEntity.ok(organizationService.createTalentPool(pool));
    }

    @GetMapping("/talent-pools/{id}")
    @RequiresPermission(Permission.TALENT_POOL_VIEW)
    public ResponseEntity<TalentPool> getTalentPool(@PathVariable UUID id) {
        return ResponseEntity.ok(organizationService.getTalentPoolById(id));
    }

    @GetMapping("/talent-pools")
    @RequiresPermission(Permission.TALENT_POOL_VIEW)
    public ResponseEntity<List<TalentPool>> getActiveTalentPools() {
        return ResponseEntity.ok(organizationService.getActiveTalentPools());
    }

    @PostMapping("/talent-pools/{poolId}/members/{employeeId}")
    @RequiresPermission(Permission.SYSTEM_ADMIN)
    public ResponseEntity<TalentPoolMember> addToPool(
            @PathVariable UUID poolId,
            @PathVariable UUID employeeId) {
        UUID userId = SecurityContext.getCurrentUserId();
        return ResponseEntity.ok(organizationService.addToPool(poolId, employeeId, userId));
    }

    @DeleteMapping("/talent-pools/{poolId}/members/{employeeId}")
    @RequiresPermission(Permission.SYSTEM_ADMIN)
    public ResponseEntity<Void> removeFromPool(
            @PathVariable UUID poolId,
            @PathVariable UUID employeeId) {
        organizationService.removeFromPool(poolId, employeeId);
        return ResponseEntity.ok().build();
    }

    @GetMapping("/talent-pools/{poolId}/members")
    @RequiresPermission(Permission.TALENT_POOL_VIEW)
    public ResponseEntity<List<TalentPoolMember>> getPoolMembers(@PathVariable UUID poolId) {
        return ResponseEntity.ok(organizationService.getPoolMembers(poolId));
    }

    // ==================== Analytics Endpoints ====================

    @Operation(summary = "Get succession planning analytics",
            description = "Retrieves comprehensive analytics for succession planning including " +
                    "active plans, high-risk positions, readiness distribution, and talent pool statistics.")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Analytics retrieved successfully"),
            @ApiResponse(responseCode = "403", description = "Forbidden - insufficient permissions")
    })
    @GetMapping("/analytics")
    @RequiresPermission(Permission.ANALYTICS_VIEW)
    public ResponseEntity<SuccessionAnalyticsResponse> getSuccessionAnalytics() {
        return ResponseEntity.ok(organizationService.getSuccessionAnalytics());
    }

    @Operation(summary = "Get Nine-Box talent grid data",
            description = "Retrieves the distribution of succession candidates across the Nine-Box grid, " +
                    "which plots employees by performance (X-axis) and potential (Y-axis).")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Nine-Box data retrieved successfully"),
            @ApiResponse(responseCode = "403", description = "Forbidden - insufficient permissions")
    })
    @GetMapping("/analytics/nine-box")
    @RequiresPermission(Permission.ANALYTICS_VIEW)
    public ResponseEntity<NineBoxDataResponse> getNineBoxData() {
        return ResponseEntity.ok(organizationService.getNineBoxData());
    }
}
