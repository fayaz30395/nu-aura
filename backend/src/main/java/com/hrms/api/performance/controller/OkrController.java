package com.hrms.api.performance.controller;

import com.hrms.api.performance.dto.*;
import com.hrms.application.performance.service.OkrService;
import com.hrms.common.security.Permission;
import com.hrms.common.security.RequiresPermission;
import com.hrms.common.security.SecurityContext;
import com.hrms.common.security.TenantContext;
import com.hrms.domain.performance.KeyResult;
import com.hrms.domain.performance.Objective;
import com.hrms.domain.performance.Objective.ObjectiveLevel;
import com.hrms.domain.performance.Objective.ObjectiveStatus;
import com.hrms.domain.performance.OkrCheckIn;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
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
@Slf4j
public class OkrController {

    private final OkrService okrService;

    // ========== Objectives ==========

    @PostMapping("/objectives")
    @RequiresPermission(Permission.OKR_CREATE)
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
    public ResponseEntity<Page<ObjectiveResponse>> getObjectives(
            @RequestParam(required = false) ObjectiveLevel level,
            @RequestParam(required = false) ObjectiveStatus status,
            @RequestParam(required = false) UUID ownerId,
            @RequestParam(required = false) UUID departmentId,
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
    public ResponseEntity<ObjectiveResponse> getObjective(@PathVariable UUID id) {
        UUID tenantId = TenantContext.getCurrentTenant();
        return okrService.getObjectiveById(tenantId, id)
                .map(obj -> ResponseEntity.ok(ObjectiveResponse.fromEntity(obj)))
                .orElse(ResponseEntity.notFound().build());
    }

    @PutMapping("/objectives/{id}")
    @RequiresPermission(Permission.OKR_UPDATE)
    public ResponseEntity<ObjectiveResponse> updateObjective(
            @PathVariable UUID id,
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
    public ResponseEntity<ObjectiveResponse> updateObjectiveStatus(
            @PathVariable UUID id,
            @RequestParam ObjectiveStatus status) {
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
    public ResponseEntity<ObjectiveResponse> approveObjective(@PathVariable UUID id) {
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
    @RequiresPermission(Permission.OKR_UPDATE)
    public ResponseEntity<Void> deleteObjective(@PathVariable UUID id) {
        UUID tenantId = TenantContext.getCurrentTenant();
        okrService.deleteObjective(tenantId, id);
        return ResponseEntity.noContent().build();
    }

    // ========== Key Results ==========

    @PostMapping("/objectives/{objectiveId}/key-results")
    @RequiresPermission(Permission.OKR_UPDATE)
    public ResponseEntity<KeyResultResponse> addKeyResult(
            @PathVariable UUID objectiveId,
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
    public ResponseEntity<List<KeyResultResponse>> getKeyResults(@PathVariable UUID objectiveId) {
        UUID tenantId = TenantContext.getCurrentTenant();
        List<KeyResult> keyResults = okrService.getKeyResultsByObjective(tenantId, objectiveId);
        return ResponseEntity.ok(keyResults.stream()
                .map(KeyResultResponse::fromEntity)
                .collect(Collectors.toList()));
    }

    @PutMapping("/key-results/{id}")
    @RequiresPermission(Permission.OKR_UPDATE)
    public ResponseEntity<KeyResultResponse> updateKeyResult(
            @PathVariable UUID id,
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
    public ResponseEntity<KeyResultResponse> updateKeyResultProgress(
            @PathVariable UUID id,
            @RequestParam BigDecimal value) {
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
    @RequiresPermission(Permission.OKR_UPDATE)
    public ResponseEntity<Void> deleteKeyResult(@PathVariable UUID id) {
        UUID tenantId = TenantContext.getCurrentTenant();
        okrService.deleteKeyResult(tenantId, id);
        return ResponseEntity.noContent().build();
    }

    // ========== Check-ins ==========

    @PostMapping("/check-ins")
    @RequiresPermission(Permission.OKR_UPDATE)
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
    public ResponseEntity<List<CheckInResponse>> getCheckIns(@PathVariable UUID objectiveId) {
        UUID tenantId = TenantContext.getCurrentTenant();
        List<OkrCheckIn> checkIns = okrService.getCheckInsByObjective(tenantId, objectiveId);
        return ResponseEntity.ok(checkIns.stream()
                .map(CheckInResponse::fromEntity)
                .collect(Collectors.toList()));
    }

    @GetMapping("/key-results/{keyResultId}/check-ins")
    @RequiresPermission(Permission.OKR_VIEW)
    public ResponseEntity<List<CheckInResponse>> getKeyResultCheckIns(@PathVariable UUID keyResultId) {
        UUID tenantId = TenantContext.getCurrentTenant();
        List<OkrCheckIn> checkIns = okrService.getCheckInsByKeyResult(tenantId, keyResultId);
        return ResponseEntity.ok(checkIns.stream()
                .map(CheckInResponse::fromEntity)
                .collect(Collectors.toList()));
    }

    // ========== Dashboard / Analytics ==========

    @GetMapping("/dashboard/summary")
    @RequiresPermission(Permission.OKR_VIEW)
    public ResponseEntity<?> getDashboardSummary() {
        UUID tenantId = TenantContext.getCurrentTenant();
        UUID employeeId = SecurityContext.getCurrentEmployeeId();

        var summary = okrService.getOkrSummary(tenantId, employeeId);
        return ResponseEntity.ok(summary);
    }

    @GetMapping("/company/objectives")
    @RequiresPermission(Permission.OKR_VIEW_ALL)
    public ResponseEntity<List<ObjectiveResponse>> getCompanyObjectives() {
        UUID tenantId = TenantContext.getCurrentTenant();
        List<Objective> objectives = okrService.getCompanyObjectives(tenantId);
        return ResponseEntity.ok(objectives.stream()
                .map(ObjectiveResponse::fromEntity)
                .collect(Collectors.toList()));
    }
}
