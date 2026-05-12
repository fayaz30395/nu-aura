package com.nulogic.api.performance.controller;

import com.nulogic.api.performance.dto.*;
import com.nulogic.application.performance.service.OkrService;
import com.nulogic.common.security.Permission;
import com.nulogic.common.security.RequiresPermission;
import com.nulogic.common.security.SecurityContext;
import com.nulogic.common.security.TenantContext;
import com.nulogic.domain.performance.KeyResult;
import com.nulogic.domain.performance.Objective;
import com.nulogic.domain.performance.Objective.ObjectiveLevel;
import com.nulogic.domain.performance.Objective.ObjectiveStatus;
import com.nulogic.domain.performance.OkrCheckIn;
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

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/v1/okr")
@RequiredArgsConstructor
@Tag(name = "OKRs", description = "Objectives and Key Results management APIs")
public class OkrController {

    private final OkrService okrService;

    // ========== Objectives ==========

    @PostMapping("/objectives")
    @RequiresPermission(Permission.OKR_CREATE)
    @Operation(summary = "Create objective", description = "Creates a new objective with optional nested key results")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "Objective created successfully"),
            @ApiResponse(responseCode = "400", description = "Invalid request data"),
            @ApiResponse(responseCode = "401", description = "Unauthenticated"),
            @ApiResponse(responseCode = "403", description = "Forbidden — requires OKR:CREATE permission")
    })
    public ResponseEntity<ObjectiveResponse> createObjective(@Valid @RequestBody ObjectiveRequest request) {
        UUID tenantId = TenantContext.getCurrentTenant();
        UUID employeeId = SecurityContext.getCurrentEmployeeId();

        Objective objective = Objective.builder()
                .ownerId(employeeId)
                .title(request.getTitle())
                .description(request.getDescription())
                .startDate(request.getStartDate())
                .endDate(request.getEndDate())
                .level(request.getObjectiveLevel() != null ? request.getObjectiveLevel() : ObjectiveLevel.INDIVIDUAL)
                .status(ObjectiveStatus.DRAFT)
                .parentObjectiveId(request.getParentObjectiveId())
                .cycleId(request.getCycleId())
                .departmentId(request.getDepartmentId())
                .teamId(request.getTeamId())
                .weight(request.getWeight() != null ? request.getWeight() : 100)
                .isStretchGoal(request.getIsStretchGoal() != null ? request.getIsStretchGoal() : false)
                .alignedToCompanyObjective(request.getAlignedToCompanyObjective())
                .visibility(request.getVisibility() != null ? request.getVisibility() : "TEAM")
                .checkInFrequency(request.getCheckInFrequency() != null ? request.getCheckInFrequency() : "WEEKLY")
                .progressPercentage(BigDecimal.ZERO)
                .build();
        objective.setTenantId(tenantId);

        Objective saved = okrService.createObjective(objective);

        // Create key results if provided
        if (request.getKeyResults() != null && !request.getKeyResults().isEmpty()) {
            for (KeyResultRequest krRequest : request.getKeyResults()) {
                KeyResult keyResult = KeyResult.builder()
                        .objectiveId(saved.getId())
                        .ownerId(krRequest.getOwnerId() != null ? krRequest.getOwnerId() : employeeId)
                        .title(krRequest.getTitle())
                        .description(krRequest.getDescription())
                        .measurementType(krRequest.getMeasurementType())
                        .startValue(krRequest.getStartValue() != null ? krRequest.getStartValue() : BigDecimal.ZERO)
                        .currentValue(BigDecimal.ZERO)
                        .targetValue(krRequest.getTargetValue())
                        .measurementUnit(krRequest.getMeasurementUnit())
                        .weight(krRequest.getWeight() != null ? krRequest.getWeight() : 100)
                        .dueDate(krRequest.getDueDate())
                        .isMilestone(krRequest.getIsMilestone() != null ? krRequest.getIsMilestone() : false)
                        .milestoneOrder(krRequest.getMilestoneOrder())
                        .build();
                keyResult.setTenantId(tenantId);
                okrService.createKeyResult(keyResult);
            }
        }

        return ResponseEntity.ok(ObjectiveResponse.fromEntity(saved));
    }

    @GetMapping("/objectives")
    @RequiresPermission(Permission.OKR_VIEW)
    @Operation(summary = "List objectives", description = "Returns a paginated list of objectives with optional filters by level, status, owner, or department")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "Objectives retrieved successfully"),
            @ApiResponse(responseCode = "401", description = "Unauthenticated"),
            @ApiResponse(responseCode = "403", description = "Forbidden — requires OKR:VIEW permission")
    })
    public ResponseEntity<Page<ObjectiveResponse>> getObjectives(
            @Parameter(description = "Filter by objective level (COMPANY, DEPARTMENT, TEAM, INDIVIDUAL)") @RequestParam(required = false) ObjectiveLevel level,
            @Parameter(description = "Filter by objective status") @RequestParam(required = false) ObjectiveStatus status,
            @Parameter(description = "Filter by owner UUID") @RequestParam(required = false) UUID ownerId,
            @Parameter(description = "Filter by department UUID") @RequestParam(required = false) UUID departmentId,
            Pageable pageable) {
        UUID tenantId = TenantContext.getCurrentTenant();

        Page<Objective> objectives;
        if (ownerId != null) {
            objectives = okrService.getObjectivesByOwner(tenantId, ownerId, pageable);
        } else if (level != null) {
            objectives = okrService.getObjectivesByLevel(tenantId, level, pageable);
        } else if (status != null) {
            objectives = okrService.getObjectivesByStatus(tenantId, status, pageable);
        } else if (departmentId != null) {
            objectives = okrService.getObjectivesByDepartment(tenantId, departmentId, pageable);
        } else {
            objectives = okrService.getAllObjectives(tenantId, pageable);
        }

        return ResponseEntity.ok(objectives.map(ObjectiveResponse::fromEntity));
    }

    @GetMapping("/objectives/my")
    @RequiresPermission(Permission.OKR_VIEW)
    @Operation(summary = "Get my objectives", description = "Returns all objectives owned by the authenticated user")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "Objectives retrieved successfully"),
            @ApiResponse(responseCode = "401", description = "Unauthenticated"),
            @ApiResponse(responseCode = "403", description = "Forbidden — requires OKR:VIEW permission")
    })
    public ResponseEntity<List<ObjectiveResponse>> getMyObjectives() {
        UUID tenantId = TenantContext.getCurrentTenant();
        UUID employeeId = SecurityContext.getCurrentEmployeeId();

        List<Objective> objectives = okrService.getObjectivesByOwnerList(tenantId, employeeId);
        return ResponseEntity.ok(objectives.stream()
                .map(ObjectiveResponse::fromEntity)
                .collect(Collectors.toList()));
    }

    @GetMapping("/objectives/{id}")
    @RequiresPermission(Permission.OKR_VIEW)
    @Operation(summary = "Get objective by ID", description = "Returns a single objective by its UUID")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "Objective found"),
            @ApiResponse(responseCode = "401", description = "Unauthenticated"),
            @ApiResponse(responseCode = "403", description = "Forbidden — requires OKR:VIEW permission"),
            @ApiResponse(responseCode = "404", description = "Objective not found")
    })
    public ResponseEntity<ObjectiveResponse> getObjective(
            @Parameter(description = "Objective UUID") @PathVariable UUID id) {
        UUID tenantId = TenantContext.getCurrentTenant();
        return okrService.getObjectiveById(tenantId, id)
                .map(obj -> ResponseEntity.ok(ObjectiveResponse.fromEntity(obj)))
                .orElse(ResponseEntity.notFound().build());
    }

    @PutMapping("/objectives/{id}")
    @RequiresPermission(Permission.OKR_UPDATE)
    @Operation(summary = "Update objective", description = "Updates an existing objective's details")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "Objective updated successfully"),
            @ApiResponse(responseCode = "400", description = "Invalid request data"),
            @ApiResponse(responseCode = "401", description = "Unauthenticated"),
            @ApiResponse(responseCode = "403", description = "Forbidden — requires OKR:UPDATE permission"),
            @ApiResponse(responseCode = "404", description = "Objective not found")
    })
    public ResponseEntity<ObjectiveResponse> updateObjective(
            @Parameter(description = "Objective UUID") @PathVariable UUID id,
            @Valid @RequestBody ObjectiveRequest request) {
        UUID tenantId = TenantContext.getCurrentTenant();

        return okrService.getObjectiveById(tenantId, id)
                .map(existing -> {
                    existing.setTitle(request.getTitle());
                    existing.setDescription(request.getDescription());
                    existing.setStartDate(request.getStartDate());
                    existing.setEndDate(request.getEndDate());
                    if (request.getObjectiveLevel() != null) {
                        existing.setLevel(request.getObjectiveLevel());
                    }
                    if (request.getWeight() != null) {
                        existing.setWeight(request.getWeight());
                    }
                    if (request.getIsStretchGoal() != null) {
                        existing.setIsStretchGoal(request.getIsStretchGoal());
                    }
                    existing.setAlignedToCompanyObjective(request.getAlignedToCompanyObjective());
                    existing.setUpdatedAt(LocalDateTime.now());

                    Objective updated = okrService.updateObjective(existing);
                    return ResponseEntity.ok(ObjectiveResponse.fromEntity(updated));
                })
                .orElse(ResponseEntity.notFound().build());
    }

    @PutMapping("/objectives/{id}/status")
    @RequiresPermission(Permission.OKR_UPDATE)
    @Operation(summary = "Update objective status", description = "Transitions an objective to a new status")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "Status updated successfully"),
            @ApiResponse(responseCode = "401", description = "Unauthenticated"),
            @ApiResponse(responseCode = "403", description = "Forbidden — requires OKR:UPDATE permission"),
            @ApiResponse(responseCode = "404", description = "Objective not found")
    })
    public ResponseEntity<ObjectiveResponse> updateObjectiveStatus(
            @Parameter(description = "Objective UUID") @PathVariable UUID id,
            @Parameter(description = "New status value") @RequestParam ObjectiveStatus status) {
        UUID tenantId = TenantContext.getCurrentTenant();

        return okrService.getObjectiveById(tenantId, id)
                .map(existing -> {
                    existing.setStatus(status);
                    existing.setUpdatedAt(LocalDateTime.now());
                    Objective updated = okrService.updateObjective(existing);
                    return ResponseEntity.ok(ObjectiveResponse.fromEntity(updated));
                })
                .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping("/objectives/{id}/approve")
    @RequiresPermission(Permission.OKR_APPROVE)
    @Operation(summary = "Approve objective", description = "Approves a draft objective, transitioning it to ACTIVE")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "Objective approved successfully"),
            @ApiResponse(responseCode = "401", description = "Unauthenticated"),
            @ApiResponse(responseCode = "403", description = "Forbidden — requires OKR:APPROVE permission"),
            @ApiResponse(responseCode = "404", description = "Objective not found")
    })
    public ResponseEntity<ObjectiveResponse> approveObjective(
            @Parameter(description = "Objective UUID") @PathVariable UUID id) {
        UUID tenantId = TenantContext.getCurrentTenant();
        UUID approverId = SecurityContext.getCurrentEmployeeId();

        return okrService.getObjectiveById(tenantId, id)
                .map(existing -> {
                    existing.setStatus(ObjectiveStatus.ACTIVE);
                    existing.setApprovedBy(approverId);
                    existing.setUpdatedAt(LocalDateTime.now());
                    Objective updated = okrService.updateObjective(existing);
                    return ResponseEntity.ok(ObjectiveResponse.fromEntity(updated));
                })
                .orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/objectives/{id}")
    @RequiresPermission(Permission.OKR_DELETE)
    @Operation(summary = "Delete objective", description = "Soft-deletes an objective and its associated key results")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "204", description = "Objective deleted successfully"),
            @ApiResponse(responseCode = "401", description = "Unauthenticated"),
            @ApiResponse(responseCode = "403", description = "Forbidden — requires OKR:DELETE permission"),
            @ApiResponse(responseCode = "404", description = "Objective not found")
    })
    public ResponseEntity<Void> deleteObjective(
            @Parameter(description = "Objective UUID") @PathVariable UUID id) {
        UUID tenantId = TenantContext.getCurrentTenant();
        okrService.deleteObjective(tenantId, id);
        return ResponseEntity.noContent().build();
    }

    // ========== Key Results ==========

    @PostMapping("/objectives/{objectiveId}/key-results")
    @RequiresPermission(Permission.OKR_UPDATE)
    @Operation(summary = "Add key result", description = "Adds a new key result to an existing objective")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "Key result created successfully"),
            @ApiResponse(responseCode = "400", description = "Invalid request data"),
            @ApiResponse(responseCode = "401", description = "Unauthenticated"),
            @ApiResponse(responseCode = "403", description = "Forbidden — requires OKR:UPDATE permission"),
            @ApiResponse(responseCode = "404", description = "Objective not found")
    })
    public ResponseEntity<KeyResultResponse> addKeyResult(
            @Parameter(description = "Objective UUID") @PathVariable UUID objectiveId,
            @Valid @RequestBody KeyResultRequest request) {
        UUID tenantId = TenantContext.getCurrentTenant();
        UUID employeeId = SecurityContext.getCurrentEmployeeId();

        KeyResult keyResult = KeyResult.builder()
                .objectiveId(objectiveId)
                .ownerId(request.getOwnerId() != null ? request.getOwnerId() : employeeId)
                .title(request.getTitle())
                .description(request.getDescription())
                .measurementType(request.getMeasurementType())
                .startValue(request.getStartValue() != null ? request.getStartValue() : BigDecimal.ZERO)
                .currentValue(BigDecimal.ZERO)
                .targetValue(request.getTargetValue())
                .measurementUnit(request.getMeasurementUnit())
                .weight(request.getWeight() != null ? request.getWeight() : 100)
                .dueDate(request.getDueDate())
                .isMilestone(request.getIsMilestone() != null ? request.getIsMilestone() : false)
                .milestoneOrder(request.getMilestoneOrder())
                .build();
        keyResult.setTenantId(tenantId);

        KeyResult saved = okrService.createKeyResult(keyResult);
        return ResponseEntity.ok(KeyResultResponse.fromEntity(saved));
    }

    @GetMapping("/objectives/{objectiveId}/key-results")
    @RequiresPermission(Permission.OKR_VIEW)
    @Operation(summary = "List key results", description = "Returns all key results for the specified objective")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "Key results retrieved successfully"),
            @ApiResponse(responseCode = "401", description = "Unauthenticated"),
            @ApiResponse(responseCode = "403", description = "Forbidden — requires OKR:VIEW permission")
    })
    public ResponseEntity<List<KeyResultResponse>> getKeyResults(
            @Parameter(description = "Objective UUID") @PathVariable UUID objectiveId) {
        UUID tenantId = TenantContext.getCurrentTenant();
        List<KeyResult> keyResults = okrService.getKeyResultsByObjective(tenantId, objectiveId);
        return ResponseEntity.ok(keyResults.stream()
                .map(KeyResultResponse::fromEntity)
                .collect(Collectors.toList()));
    }

    @PutMapping("/key-results/{id}")
    @RequiresPermission(Permission.OKR_UPDATE)
    @Operation(summary = "Update key result", description = "Updates an existing key result's title, target, weight, or due date")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "Key result updated successfully"),
            @ApiResponse(responseCode = "400", description = "Invalid request data"),
            @ApiResponse(responseCode = "401", description = "Unauthenticated"),
            @ApiResponse(responseCode = "403", description = "Forbidden — requires OKR:UPDATE permission"),
            @ApiResponse(responseCode = "404", description = "Key result not found")
    })
    public ResponseEntity<KeyResultResponse> updateKeyResult(
            @Parameter(description = "Key result UUID") @PathVariable UUID id,
            @Valid @RequestBody KeyResultRequest request) {
        UUID tenantId = TenantContext.getCurrentTenant();

        return okrService.getKeyResultById(tenantId, id)
                .map(existing -> {
                    existing.setTitle(request.getTitle());
                    existing.setDescription(request.getDescription());
                    if (request.getMeasurementType() != null) {
                        existing.setMeasurementType(request.getMeasurementType());
                    }
                    existing.setTargetValue(request.getTargetValue());
                    existing.setMeasurementUnit(request.getMeasurementUnit());
                    if (request.getWeight() != null) {
                        existing.setWeight(request.getWeight());
                    }
                    existing.setDueDate(request.getDueDate());
                    existing.setUpdatedAt(LocalDateTime.now());

                    KeyResult updated = okrService.updateKeyResult(existing);
                    return ResponseEntity.ok(KeyResultResponse.fromEntity(updated));
                })
                .orElse(ResponseEntity.notFound().build());
    }

    @PutMapping("/key-results/{id}/progress")
    @RequiresPermission(Permission.OKR_UPDATE)
    @Operation(summary = "Update key result progress", description = "Records a progress update on a key result and creates a check-in entry")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "Progress updated successfully"),
            @ApiResponse(responseCode = "401", description = "Unauthenticated"),
            @ApiResponse(responseCode = "403", description = "Forbidden — requires OKR:UPDATE permission"),
            @ApiResponse(responseCode = "404", description = "Key result not found")
    })
    public ResponseEntity<KeyResultResponse> updateKeyResultProgress(
            @Parameter(description = "Key result UUID") @PathVariable UUID id,
            @Parameter(description = "New current value") @RequestParam BigDecimal value) {
        UUID tenantId = TenantContext.getCurrentTenant();
        UUID employeeId = SecurityContext.getCurrentEmployeeId();

        return okrService.getKeyResultById(tenantId, id)
                .map(existing -> {
                    BigDecimal previousValue = existing.getCurrentValue();
                    BigDecimal previousProgress = existing.getProgressPercentage();

                    existing.setCurrentValue(value);
                    existing.updateProgress();
                    existing.setUpdatedAt(LocalDateTime.now());

                    KeyResult updated = okrService.updateKeyResult(existing);

                    // Create check-in record
                    OkrCheckIn checkIn = OkrCheckIn.builder()
                            .keyResultId(id)
                            .objectiveId(existing.getObjectiveId())
                            .employeeId(employeeId)
                            .checkInDate(LocalDateTime.now())
                            .previousValue(previousValue)
                            .newValue(value)
                            .previousProgress(previousProgress)
                            .newProgress(updated.getProgressPercentage())
                            .checkInType(OkrCheckIn.CheckInType.PROGRESS_UPDATE)
                            .build();
                    checkIn.setTenantId(tenantId);
                    okrService.createCheckIn(checkIn);

                    // Update objective progress
                    okrService.recalculateObjectiveProgress(tenantId, existing.getObjectiveId());

                    return ResponseEntity.ok(KeyResultResponse.fromEntity(updated));
                })
                .orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/key-results/{id}")
    @RequiresPermission(Permission.OKR_DELETE)
    @Operation(summary = "Delete key result", description = "Soft-deletes a key result")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "204", description = "Key result deleted successfully"),
            @ApiResponse(responseCode = "401", description = "Unauthenticated"),
            @ApiResponse(responseCode = "403", description = "Forbidden — requires OKR:DELETE permission"),
            @ApiResponse(responseCode = "404", description = "Key result not found")
    })
    public ResponseEntity<Void> deleteKeyResult(
            @Parameter(description = "Key result UUID") @PathVariable UUID id) {
        UUID tenantId = TenantContext.getCurrentTenant();
        okrService.deleteKeyResult(tenantId, id);
        return ResponseEntity.noContent().build();
    }

    // ========== Check-ins ==========

    @PostMapping("/check-ins")
    @RequiresPermission(Permission.OKR_UPDATE)
    @Operation(summary = "Create check-in", description = "Records a manual check-in with notes, blockers, and confidence level")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "Check-in created successfully"),
            @ApiResponse(responseCode = "400", description = "Invalid request data"),
            @ApiResponse(responseCode = "401", description = "Unauthenticated"),
            @ApiResponse(responseCode = "403", description = "Forbidden — requires OKR:UPDATE permission")
    })
    public ResponseEntity<CheckInResponse> createCheckIn(@Valid @RequestBody CheckInRequest request) {
        UUID tenantId = TenantContext.getCurrentTenant();
        UUID employeeId = SecurityContext.getCurrentEmployeeId();

        OkrCheckIn checkIn = OkrCheckIn.builder()
                .objectiveId(request.getObjectiveId())
                .keyResultId(request.getKeyResultId())
                .employeeId(employeeId)
                .checkInDate(LocalDateTime.now())
                .newValue(request.getNewValue())
                .newProgress(request.getNewProgress())
                .confidenceLevel(request.getConfidenceLevel())
                .notes(request.getNotes())
                .blockers(request.getBlockers())
                .nextSteps(request.getNextSteps())
                .checkInType(request.getCheckInType() != null ? request.getCheckInType() : OkrCheckIn.CheckInType.PROGRESS_UPDATE)
                .build();
        checkIn.setTenantId(tenantId);

        OkrCheckIn saved = okrService.createCheckIn(checkIn);
        return ResponseEntity.ok(CheckInResponse.fromEntity(saved));
    }

    @GetMapping("/objectives/{objectiveId}/check-ins")
    @RequiresPermission(Permission.OKR_VIEW)
    @Operation(summary = "List objective check-ins", description = "Returns all check-ins for the specified objective")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "Check-ins retrieved successfully"),
            @ApiResponse(responseCode = "401", description = "Unauthenticated"),
            @ApiResponse(responseCode = "403", description = "Forbidden — requires OKR:VIEW permission")
    })
    public ResponseEntity<List<CheckInResponse>> getCheckIns(
            @Parameter(description = "Objective UUID") @PathVariable UUID objectiveId) {
        UUID tenantId = TenantContext.getCurrentTenant();
        List<OkrCheckIn> checkIns = okrService.getCheckInsByObjective(tenantId, objectiveId);
        return ResponseEntity.ok(checkIns.stream()
                .map(CheckInResponse::fromEntity)
                .collect(Collectors.toList()));
    }

    @GetMapping("/key-results/{keyResultId}/check-ins")
    @RequiresPermission(Permission.OKR_VIEW)
    @Operation(summary = "List key result check-ins", description = "Returns all check-ins for the specified key result")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "Check-ins retrieved successfully"),
            @ApiResponse(responseCode = "401", description = "Unauthenticated"),
            @ApiResponse(responseCode = "403", description = "Forbidden — requires OKR:VIEW permission")
    })
    public ResponseEntity<List<CheckInResponse>> getKeyResultCheckIns(
            @Parameter(description = "Key result UUID") @PathVariable UUID keyResultId) {
        UUID tenantId = TenantContext.getCurrentTenant();
        List<OkrCheckIn> checkIns = okrService.getCheckInsByKeyResult(tenantId, keyResultId);
        return ResponseEntity.ok(checkIns.stream()
                .map(CheckInResponse::fromEntity)
                .collect(Collectors.toList()));
    }

    // ========== Dashboard / Analytics ==========

    @GetMapping("/dashboard/summary")
    @RequiresPermission(Permission.OKR_VIEW)
    @Operation(summary = "Get OKR dashboard summary", description = "Returns aggregated OKR metrics for the authenticated user")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "Summary retrieved successfully"),
            @ApiResponse(responseCode = "401", description = "Unauthenticated"),
            @ApiResponse(responseCode = "403", description = "Forbidden — requires OKR:VIEW permission")
    })
    public ResponseEntity<?> getDashboardSummary() {
        UUID tenantId = TenantContext.getCurrentTenant();
        UUID employeeId = SecurityContext.getCurrentEmployeeId();

        var summary = okrService.getOkrSummary(tenantId, employeeId);
        return ResponseEntity.ok(summary);
    }

    @GetMapping("/company/objectives")
    @RequiresPermission(Permission.OKR_VIEW_ALL)
    @Operation(summary = "Get company objectives", description = "Returns all company-level objectives across the tenant")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "Company objectives retrieved successfully"),
            @ApiResponse(responseCode = "401", description = "Unauthenticated"),
            @ApiResponse(responseCode = "403", description = "Forbidden — requires OKR:VIEW_ALL permission")
    })
    public ResponseEntity<List<ObjectiveResponse>> getCompanyObjectives() {
        UUID tenantId = TenantContext.getCurrentTenant();
        List<Objective> objectives = okrService.getCompanyObjectives(tenantId);
        return ResponseEntity.ok(objectives.stream()
                .map(ObjectiveResponse::fromEntity)
                .collect(Collectors.toList()));
    }
}
